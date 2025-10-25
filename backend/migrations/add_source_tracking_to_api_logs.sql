-- Migration: Add source tracking columns to API logs tables
-- Date: 2025-10-25
-- Description: Add origin, referer, and app_source columns to track request source

-- Add columns to api_logs_backend
ALTER TABLE api_logs_backend 
ADD COLUMN IF NOT EXISTS origin VARCHAR(255),
ADD COLUMN IF NOT EXISTS referer TEXT,
ADD COLUMN IF NOT EXISTS app_source VARCHAR(100);

-- Add index on app_source for better query performance
CREATE INDEX IF NOT EXISTS idx_api_logs_backend_app_source ON api_logs_backend(app_source);

-- Add columns to api_logs_frontend
ALTER TABLE api_logs_frontend 
ADD COLUMN IF NOT EXISTS origin VARCHAR(255),
ADD COLUMN IF NOT EXISTS referer TEXT,
ADD COLUMN IF NOT EXISTS app_source VARCHAR(100);

-- Add index on app_source for better query performance
CREATE INDEX IF NOT EXISTS idx_api_logs_frontend_app_source ON api_logs_frontend(app_source);

-- Add comments for documentation
COMMENT ON COLUMN api_logs_backend.origin IS 'Domain that made the request (e.g., https://ulm-rct.ovu.co.il)';
COMMENT ON COLUMN api_logs_backend.referer IS 'Full URL that made the request';
COMMENT ON COLUMN api_logs_backend.app_source IS 'Application identifier (e.g., ulm-react-web, ulm-flutter-mobile, postman)';

COMMENT ON COLUMN api_logs_frontend.origin IS 'Domain that made the request';
COMMENT ON COLUMN api_logs_frontend.referer IS 'Full URL that made the request';
COMMENT ON COLUMN api_logs_frontend.app_source IS 'Application identifier';

