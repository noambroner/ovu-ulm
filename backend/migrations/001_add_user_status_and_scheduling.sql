-- Migration: Add User Status and Scheduling System
-- Version: 001
-- Date: 2025-10-05
-- Description: Adds status management, scheduling, and activity history tracking

-- =====================================================
-- PART 1: Modify users table
-- =====================================================

-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS current_joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS current_left_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS scheduled_deactivation_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS scheduled_deactivation_reason TEXT,
ADD COLUMN IF NOT EXISTS scheduled_deactivation_by_id INTEGER,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Add foreign key for scheduled_deactivation_by_id
ALTER TABLE users
ADD CONSTRAINT fk_users_scheduled_by
    FOREIGN KEY (scheduled_deactivation_by_id)
    REFERENCES users(id) ON DELETE SET NULL;

-- Add constraints
ALTER TABLE users
ADD CONSTRAINT check_scheduled_future 
    CHECK (
        scheduled_deactivation_at IS NULL OR 
        scheduled_deactivation_at > current_joined_at
    );

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_scheduled_deactivation 
    ON users(scheduled_deactivation_at) 
    WHERE scheduled_deactivation_at IS NOT NULL;

-- Update existing users to have current_joined_at set to created_at
UPDATE users 
SET current_joined_at = created_at
WHERE current_joined_at IS NULL;

-- =====================================================
-- PART 2: Create user_activity_history table
-- =====================================================

CREATE TABLE IF NOT EXISTS user_activity_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    
    -- Activity period
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL,
    left_at TIMESTAMP WITH TIME ZONE,
    
    -- Scheduling information
    scheduled_left_at TIMESTAMP WITH TIME ZONE,
    actual_left_at TIMESTAMP WITH TIME ZONE,
    
    -- Action details
    action_type VARCHAR(30) NOT NULL,
    -- Possible values: 'activated', 'deactivated_immediate', 'deactivated_scheduled',
    --                  'schedule_cancelled', 'auto_deactivated', 'reactivated'
    
    performed_by_id INTEGER,
    reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_user_activity_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_activity_performer 
        FOREIGN KEY (performed_by_id) 
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT check_date_range 
        CHECK (left_at IS NULL OR left_at >= joined_at)
);

-- Create indexes for activity history
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_dates ON user_activity_history(joined_at, left_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_action_type ON user_activity_history(action_type);

-- Insert initial activity records for existing users
INSERT INTO user_activity_history (user_id, joined_at, action_type, performed_by_id)
SELECT 
    id,
    created_at,
    'activated',
    created_by_id
FROM users
WHERE NOT EXISTS (
    SELECT 1 FROM user_activity_history WHERE user_id = users.id
);

-- =====================================================
-- PART 3: Create scheduled_user_actions table
-- =====================================================

CREATE TABLE IF NOT EXISTS scheduled_user_actions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    action_type VARCHAR(30) NOT NULL, -- 'deactivate', 'activate'
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT,
    created_by_id INTEGER,
    status VARCHAR(20) DEFAULT 'pending',
    -- Possible values: 'pending', 'executed', 'cancelled', 'failed'
    executed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_scheduled_actions_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_scheduled_actions_creator
        FOREIGN KEY (created_by_id)
        REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for scheduled actions
CREATE INDEX IF NOT EXISTS idx_scheduled_actions_pending 
    ON scheduled_user_actions(scheduled_for, status)
    WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_actions_user_id ON scheduled_user_actions(user_id);

-- =====================================================
-- PART 4: Create helper functions
-- =====================================================

-- Function to get user current status with details
CREATE OR REPLACE FUNCTION get_user_status_info(p_user_id INTEGER)
RETURNS TABLE (
    user_id INTEGER,
    username VARCHAR,
    status VARCHAR,
    status_display VARCHAR,
    is_active BOOLEAN,
    current_joined_at TIMESTAMP WITH TIME ZONE,
    current_left_at TIMESTAMP WITH TIME ZONE,
    scheduled_deactivation_at TIMESTAMP WITH TIME ZONE,
    days_until_deactivation NUMERIC,
    hours_until_deactivation NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        u.status,
        CASE 
            WHEN u.status = 'active' THEN 'פעיל'
            WHEN u.status = 'scheduled_deactivation' THEN 
                'מתוזמן להשבתה ב-' || TO_CHAR(u.scheduled_deactivation_at, 'DD/MM/YYYY HH24:MI')
            WHEN u.status = 'inactive' THEN 'לא פעיל'
            ELSE 'לא ידוע'
        END,
        (u.status = 'active' OR u.status = 'scheduled_deactivation'),
        u.current_joined_at,
        u.current_left_at,
        u.scheduled_deactivation_at,
        CASE 
            WHEN u.status = 'scheduled_deactivation' AND u.scheduled_deactivation_at IS NOT NULL THEN
                EXTRACT(EPOCH FROM (u.scheduled_deactivation_at - CURRENT_TIMESTAMP)) / 86400
            ELSE NULL
        END,
        CASE 
            WHEN u.status = 'scheduled_deactivation' AND u.scheduled_deactivation_at IS NOT NULL THEN
                EXTRACT(EPOCH FROM (u.scheduled_deactivation_at - CURRENT_TIMESTAMP)) / 3600
            ELSE NULL
        END
    FROM users u
    WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user activity history
CREATE OR REPLACE FUNCTION get_user_activity_history(p_user_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    joined_at TIMESTAMP WITH TIME ZONE,
    left_at TIMESTAMP WITH TIME ZONE,
    scheduled_left_at TIMESTAMP WITH TIME ZONE,
    actual_left_at TIMESTAMP WITH TIME ZONE,
    action_type VARCHAR,
    performed_by VARCHAR,
    reason TEXT,
    duration_days NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uah.id,
        uah.joined_at,
        uah.left_at,
        uah.scheduled_left_at,
        uah.actual_left_at,
        uah.action_type,
        performer.username,
        uah.reason,
        CASE 
            WHEN uah.left_at IS NULL THEN
                EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - uah.joined_at)) / 86400
            ELSE
                EXTRACT(EPOCH FROM (uah.left_at - uah.joined_at)) / 86400
        END
    FROM user_activity_history uah
    LEFT JOIN users performer ON uah.performed_by_id = performer.id
    WHERE uah.user_id = p_user_id
    ORDER BY uah.joined_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 5: Update trigger for updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PART 6: Grant permissions
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON user_activity_history TO ovu_user;
GRANT SELECT, INSERT, UPDATE ON scheduled_user_actions TO ovu_user;
GRANT USAGE, SELECT ON SEQUENCE user_activity_history_id_seq TO ovu_user;
GRANT USAGE, SELECT ON SEQUENCE scheduled_user_actions_id_seq TO ovu_user;

-- =====================================================
-- Migration Complete
-- =====================================================

-- Verification queries
SELECT 'Migration completed successfully!' as status;
SELECT 'Users table columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('status', 'scheduled_deactivation_at', 'current_joined_at')
ORDER BY column_name;

SELECT 'New tables created:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('user_activity_history', 'scheduled_user_actions');








