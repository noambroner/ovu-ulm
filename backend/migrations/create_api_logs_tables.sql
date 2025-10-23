-- API Logs Tables for Backend and Frontend
-- Created: 2024-10-23

-- Backend API Logs Table
CREATE TABLE IF NOT EXISTS api_logs_backend (
    id SERIAL PRIMARY KEY,
    
    -- Request Information
    method VARCHAR(10) NOT NULL,
    endpoint TEXT NOT NULL,
    path VARCHAR(500) NOT NULL,
    query_params TEXT,
    request_body TEXT,
    request_headers TEXT,
    
    -- User Information
    user_id INTEGER,
    username VARCHAR(100),
    user_ip VARCHAR(50),
    user_agent TEXT,
    
    -- Response Information
    status_code INTEGER,
    response_body TEXT,
    response_headers TEXT,
    
    -- Timing
    request_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    response_time TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    
    -- Additional Info
    error_message TEXT,
    
    -- Indexes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Frontend API Logs Table
CREATE TABLE IF NOT EXISTS api_logs_frontend (
    id SERIAL PRIMARY KEY,
    
    -- Request Information
    method VARCHAR(10) NOT NULL,
    url TEXT NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    request_body TEXT,
    request_headers TEXT,
    
    -- User Information
    user_id INTEGER,
    username VARCHAR(100),
    session_id VARCHAR(100),
    
    -- Response Information
    status_code INTEGER,
    response_body TEXT,
    response_headers TEXT,
    success BOOLEAN DEFAULT FALSE,
    
    -- Timing
    request_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    response_time TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    
    -- Additional Info
    error_message TEXT,
    browser_info TEXT,
    
    -- Indexes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_api_logs_backend_user_id ON api_logs_backend(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_backend_endpoint ON api_logs_backend(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_backend_method ON api_logs_backend(method);
CREATE INDEX IF NOT EXISTS idx_api_logs_backend_status ON api_logs_backend(status_code);
CREATE INDEX IF NOT EXISTS idx_api_logs_backend_created ON api_logs_backend(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_logs_frontend_user_id ON api_logs_frontend(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_frontend_endpoint ON api_logs_frontend(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_frontend_method ON api_logs_frontend(method);
CREATE INDEX IF NOT EXISTS idx_api_logs_frontend_status ON api_logs_frontend(status_code);
CREATE INDEX IF NOT EXISTS idx_api_logs_frontend_created ON api_logs_frontend(created_at DESC);

-- Comments
COMMENT ON TABLE api_logs_backend IS 'Logs all Backend API requests and responses';
COMMENT ON TABLE api_logs_frontend IS 'Logs all Frontend API calls to Backend';

COMMENT ON COLUMN api_logs_backend.duration_ms IS 'Request duration in milliseconds';
COMMENT ON COLUMN api_logs_frontend.duration_ms IS 'Request duration in milliseconds';
COMMENT ON COLUMN api_logs_frontend.success IS 'Whether the request was successful (status 2xx)';

