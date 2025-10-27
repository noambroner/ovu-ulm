-- Migration: Add User Preferences and Search History Tables
-- Created: 2025-10-27
-- Description: Stores DataGrid preferences and search history per user

-- ================================================
-- Table: user_datagrid_preferences
-- Purpose: Store user preferences for any DataGrid component
-- ================================================
CREATE TABLE IF NOT EXISTS user_datagrid_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    datagrid_key VARCHAR(100) NOT NULL,
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_datagrid UNIQUE(user_id, datagrid_key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_datagrid_prefs ON user_datagrid_preferences(user_id, datagrid_key);
CREATE INDEX IF NOT EXISTS idx_datagrid_updated_at ON user_datagrid_preferences(updated_at DESC);

-- Comments
COMMENT ON TABLE user_datagrid_preferences IS 'Stores user preferences for DataGrid components (filters, sort, column widths)';
COMMENT ON COLUMN user_datagrid_preferences.datagrid_key IS 'Unique identifier for the DataGrid (e.g., api-logs-backend, users-table)';
COMMENT ON COLUMN user_datagrid_preferences.preferences IS 'JSON object containing filters, sort, columnWidths, and other preferences';

-- ================================================
-- Table: user_search_history
-- Purpose: Store search/filter history for users (last 100 per user per grid)
-- ================================================
CREATE TABLE IF NOT EXISTS user_search_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    datagrid_key VARCHAR(100) NOT NULL,
    search_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_search_history ON user_search_history(user_id, datagrid_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_created_at ON user_search_history(created_at DESC);

-- Comments
COMMENT ON TABLE user_search_history IS 'Stores user search and filter history for quick access to previous searches';
COMMENT ON COLUMN user_search_history.datagrid_key IS 'Identifier for the DataGrid where the search was performed';
COMMENT ON COLUMN user_search_history.search_data IS 'JSON object containing the search/filter criteria and optional description';

-- ================================================
-- Function: Cleanup old search history (keep last 100 per user per grid)
-- ================================================
CREATE OR REPLACE FUNCTION cleanup_old_search_history()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM user_search_history
    WHERE id IN (
        SELECT id
        FROM user_search_history
        WHERE user_id = NEW.user_id AND datagrid_key = NEW.datagrid_key
        ORDER BY created_at DESC
        OFFSET 100
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-cleanup on insert
DROP TRIGGER IF EXISTS trigger_cleanup_search_history ON user_search_history;
CREATE TRIGGER trigger_cleanup_search_history
    AFTER INSERT ON user_search_history
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_old_search_history();

-- ================================================
-- Function: Update updated_at timestamp
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating updated_at
DROP TRIGGER IF EXISTS trigger_update_datagrid_prefs_updated_at ON user_datagrid_preferences;
CREATE TRIGGER trigger_update_datagrid_prefs_updated_at
    BEFORE UPDATE ON user_datagrid_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

