-- ============================================================================
-- API Keys Management System - Database Schema
-- ============================================================================
-- Migration: Create API Keys tables for integration authentication
-- Created: 2025-11-08
-- ============================================================================

-- Table: api_keys
-- Stores API keys for external applications and integrations
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    
    -- Basic Info
    key_name VARCHAR(100) NOT NULL,                    -- Application name (e.g., "Mobile App v2")
    api_key_hash VARCHAR(64) UNIQUE NOT NULL,          -- SHA256 hash of the API key
    api_key_prefix VARCHAR(20) NOT NULL,               -- First 8 chars for display (e.g., "ulm_live_abc12345...")
    app_type VARCHAR(50) DEFAULT 'integration',        -- Type: mobile/web/integration/bot/service
    
    -- Owner Information
    owner_name VARCHAR(100),                           -- Owner/Contact name
    owner_email VARCHAR(255),                          -- Contact email
    description TEXT,                                  -- Purpose/description of usage
    
    -- Permissions & Scopes
    scopes JSONB DEFAULT '[]'::jsonb,                  -- ['users:read', 'logs:write', 'admin:*']
    allowed_endpoints JSONB DEFAULT '[]'::jsonb,       -- ['/api/v1/users', '/api/v1/logs']
    
    -- Rate Limiting
    rate_limit_per_minute INTEGER DEFAULT 60,          -- Max requests per minute
    rate_limit_per_hour INTEGER DEFAULT 1000,          -- Max requests per hour
    rate_limit_per_day INTEGER DEFAULT 10000,          -- Max requests per day
    
    -- IP Whitelisting (optional)
    allowed_ips JSONB DEFAULT '[]'::jsonb,             -- ['1.2.3.4', '5.6.7.8'] - empty = all IPs allowed
    
    -- Status & Lifecycle
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked', 'expired')),
    created_at TIMESTAMP DEFAULT NOW(),
    created_by_user_id INTEGER,                        -- User who created this key
    last_used_at TIMESTAMP,                            -- Last time key was used
    expires_at TIMESTAMP,                              -- Expiration date (NULL = no expiration)
    revoked_at TIMESTAMP,                              -- When was it revoked
    revoked_by_user_id INTEGER,                        -- Who revoked it
    revoke_reason TEXT,                                -- Why was it revoked
    
    -- Usage Statistics
    total_requests_count BIGINT DEFAULT 0,             -- Total number of requests made
    successful_requests_count BIGINT DEFAULT 0,        -- Successful requests (2xx)
    failed_requests_count BIGINT DEFAULT 0,            -- Failed requests (4xx, 5xx)
    last_request_ip VARCHAR(45),                       -- Last IP address used
    last_request_endpoint VARCHAR(255),                -- Last endpoint called
    
    -- Metadata
    notes TEXT,                                        -- Internal notes
    tags JSONB DEFAULT '[]'::jsonb,                    -- ['production', 'testing', 'v2']
    
    -- Foreign Keys
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (revoked_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for api_keys
CREATE INDEX idx_api_keys_api_key_hash ON api_keys(api_key_hash);
CREATE INDEX idx_api_keys_status ON api_keys(status) WHERE status = 'active';
CREATE INDEX idx_api_keys_created_by ON api_keys(created_by_user_id);
CREATE INDEX idx_api_keys_last_used ON api_keys(last_used_at DESC);
CREATE INDEX idx_api_keys_app_type ON api_keys(app_type);

-- Comments
COMMENT ON TABLE api_keys IS 'API Keys for external application authentication and integration';
COMMENT ON COLUMN api_keys.api_key_hash IS 'SHA256 hash of the actual API key (never store plain key!)';
COMMENT ON COLUMN api_keys.api_key_prefix IS 'First 8 characters for display purposes (e.g., ulm_live_abc12345...)';
COMMENT ON COLUMN api_keys.scopes IS 'Array of permission scopes, e.g., ["users:read", "logs:write"]';
COMMENT ON COLUMN api_keys.allowed_ips IS 'IP whitelist - empty array means all IPs allowed';


-- ============================================================================
-- Table: api_key_usage_stats
-- Hourly usage statistics for each API key
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_key_usage_stats (
    id SERIAL PRIMARY KEY,
    api_key_id INTEGER NOT NULL,
    
    -- Time dimension
    date DATE NOT NULL,                                -- Date of usage
    hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23), -- Hour (0-23)
    
    -- Request Statistics
    requests_count INTEGER DEFAULT 0,                  -- Total requests in this hour
    successful_requests INTEGER DEFAULT 0,             -- 2xx responses
    client_errors INTEGER DEFAULT 0,                   -- 4xx responses
    server_errors INTEGER DEFAULT 0,                   -- 5xx responses
    
    -- Performance Metrics
    avg_response_time_ms INTEGER,                      -- Average response time
    min_response_time_ms INTEGER,                      -- Fastest response
    max_response_time_ms INTEGER,                      -- Slowest response
    
    -- Endpoints Hit
    unique_endpoints_count INTEGER DEFAULT 0,          -- Number of different endpoints called
    top_endpoints JSONB DEFAULT '[]'::jsonb,           -- Top 5 endpoints called
    
    -- Traffic Sources
    unique_ips_count INTEGER DEFAULT 0,                -- Number of different IPs
    top_ips JSONB DEFAULT '[]'::jsonb,                 -- Top IPs
    
    -- Data Transfer
    total_bytes_sent BIGINT DEFAULT 0,                 -- Response data sent (bytes)
    total_bytes_received BIGINT DEFAULT 0,             -- Request data received (bytes)
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign Key
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE,
    
    -- Unique constraint: one row per API key per hour
    UNIQUE(api_key_id, date, hour)
);

-- Indexes for api_key_usage_stats
CREATE INDEX idx_api_key_usage_api_key ON api_key_usage_stats(api_key_id);
CREATE INDEX idx_api_key_usage_date ON api_key_usage_stats(date DESC);
CREATE INDEX idx_api_key_usage_datetime ON api_key_usage_stats(api_key_id, date DESC, hour DESC);

-- Comments
COMMENT ON TABLE api_key_usage_stats IS 'Hourly usage statistics and metrics for API keys';
COMMENT ON COLUMN api_key_usage_stats.hour IS 'Hour of the day (0-23) in UTC';


-- ============================================================================
-- Table: api_key_audit_log
-- Audit trail for API key lifecycle events
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_key_audit_log (
    id SERIAL PRIMARY KEY,
    api_key_id INTEGER NOT NULL,
    
    -- Event Information
    event_type VARCHAR(50) NOT NULL,                   -- 'created', 'revoked', 'suspended', 'reactivated', 'updated'
    event_description TEXT,                            -- Detailed description
    
    -- Actor Information
    performed_by_user_id INTEGER,                      -- Who performed the action
    performed_by_username VARCHAR(100),                -- Username (denormalized for history)
    
    -- Changes (for update events)
    changes JSONB,                                     -- {"field": {"old": "value", "new": "value"}}
    
    -- Context
    ip_address VARCHAR(45),                            -- IP of the user who made the change
    user_agent TEXT,                                   -- Browser/client info
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign Keys
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for api_key_audit_log
CREATE INDEX idx_api_key_audit_api_key ON api_key_audit_log(api_key_id);
CREATE INDEX idx_api_key_audit_event_type ON api_key_audit_log(event_type);
CREATE INDEX idx_api_key_audit_created ON api_key_audit_log(created_at DESC);
CREATE INDEX idx_api_key_audit_user ON api_key_audit_log(performed_by_user_id);

-- Comments
COMMENT ON TABLE api_key_audit_log IS 'Audit trail for all API key lifecycle events and changes';


-- ============================================================================
-- Sample Data (for testing)
-- ============================================================================
-- Insert a test API key (key: ulm_test_1234567890abcdef1234567890abcdef)
-- Hash: SHA256 of above key
INSERT INTO api_keys (
    key_name,
    api_key_hash,
    api_key_prefix,
    app_type,
    owner_name,
    owner_email,
    description,
    scopes,
    rate_limit_per_minute,
    status,
    created_by_user_id
) VALUES (
    'Test Integration App',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',  -- Replace with actual hash
    'ulm_test',
    'integration',
    'Test Developer',
    'dev@ovu.co.il',
    'Test API key for development and integration testing',
    '["users:read", "logs:read"]'::jsonb,
    100,
    'active',
    1  -- Assuming admin user has ID 1
) ON CONFLICT DO NOTHING;


-- ============================================================================
-- Utility Functions
-- ============================================================================

-- Function: Check if API key has specific scope
CREATE OR REPLACE FUNCTION api_key_has_scope(
    p_api_key_id INTEGER,
    p_scope VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
    v_scopes JSONB;
    v_has_scope BOOLEAN;
BEGIN
    SELECT scopes INTO v_scopes
    FROM api_keys
    WHERE id = p_api_key_id AND status = 'active';
    
    IF v_scopes IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if scope exists in array
    v_has_scope := v_scopes ? p_scope;
    
    -- Also check for wildcard scopes (e.g., 'admin:*' grants 'admin:users')
    IF NOT v_has_scope THEN
        -- Check for wildcard patterns
        v_has_scope := EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(v_scopes) AS scope
            WHERE scope LIKE '%:*' AND p_scope LIKE CONCAT(SUBSTRING(scope FROM 1 FOR LENGTH(scope)-1), '%')
        );
    END IF;
    
    RETURN v_has_scope;
END;
$$ LANGUAGE plpgsql;


-- Function: Increment usage counter for API key
CREATE OR REPLACE FUNCTION increment_api_key_usage(
    p_api_key_id INTEGER,
    p_success BOOLEAN DEFAULT TRUE
) RETURNS VOID AS $$
BEGIN
    UPDATE api_keys
    SET 
        total_requests_count = total_requests_count + 1,
        successful_requests_count = CASE WHEN p_success THEN successful_requests_count + 1 ELSE successful_requests_count END,
        failed_requests_count = CASE WHEN NOT p_success THEN failed_requests_count + 1 ELSE failed_requests_count END,
        last_used_at = NOW()
    WHERE id = p_api_key_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- Views for Easy Querying
-- ============================================================================

-- View: Active API Keys with usage summary
CREATE OR REPLACE VIEW v_api_keys_active AS
SELECT 
    ak.id,
    ak.key_name,
    ak.api_key_prefix,
    ak.app_type,
    ak.owner_name,
    ak.owner_email,
    ak.status,
    ak.created_at,
    ak.last_used_at,
    ak.expires_at,
    ak.total_requests_count,
    ak.rate_limit_per_minute,
    u.username AS created_by_username,
    CASE 
        WHEN ak.expires_at IS NOT NULL AND ak.expires_at < NOW() THEN TRUE
        ELSE FALSE
    END AS is_expired,
    EXTRACT(EPOCH FROM (NOW() - ak.last_used_at))/86400 AS days_since_last_use
FROM api_keys ak
LEFT JOIN users u ON ak.created_by_user_id = u.id
WHERE ak.status = 'active';

COMMENT ON VIEW v_api_keys_active IS 'Active API keys with computed fields for easy monitoring';


-- ============================================================================
-- Success Message
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ API Keys Management System tables created successfully!';
    RAISE NOTICE '📊 Tables created: api_keys, api_key_usage_stats, api_key_audit_log';
    RAISE NOTICE '🔧 Utility functions created: api_key_has_scope, increment_api_key_usage';
    RAISE NOTICE '👁️  View created: v_api_keys_active';
END $$;

