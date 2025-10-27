-- Migration: Add request_type and direction columns to API logs
-- Date: 2025-10-27
-- Author: Session #3

-- ==========================================
-- Add columns to api_logs_backend
-- ==========================================

-- request_type: 'ui' (UI calls from frontend) or 'integration' (external/third-party)
ALTER TABLE api_logs_backend 
ADD COLUMN IF NOT EXISTS request_type VARCHAR(20) DEFAULT 'ui';

-- direction: 'inbound' (incoming to server) or 'outbound' (outgoing from server)
ALTER TABLE api_logs_backend 
ADD COLUMN IF NOT EXISTS direction VARCHAR(20) DEFAULT 'inbound';

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS ix_api_logs_backend_request_type ON api_logs_backend (request_type);
CREATE INDEX IF NOT EXISTS ix_api_logs_backend_direction ON api_logs_backend (direction);

-- Add comments for documentation
COMMENT ON COLUMN api_logs_backend.request_type IS 'Type of request: ui (from frontend UI) or integration (from external apps)';
COMMENT ON COLUMN api_logs_backend.direction IS 'Direction of request: inbound (incoming to server) or outbound (outgoing from server)';

-- ==========================================
-- Add columns to api_logs_frontend
-- ==========================================

-- request_type: 'ui' (UI calls from frontend) or 'integration' (external/third-party)
ALTER TABLE api_logs_frontend 
ADD COLUMN IF NOT EXISTS request_type VARCHAR(20) DEFAULT 'ui';

-- direction: 'outbound' (frontend calls to backend) or 'inbound' (responses from backend)
ALTER TABLE api_logs_frontend 
ADD COLUMN IF NOT EXISTS direction VARCHAR(20) DEFAULT 'outbound';

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS ix_api_logs_frontend_request_type ON api_logs_frontend (request_type);
CREATE INDEX IF NOT EXISTS ix_api_logs_frontend_direction ON api_logs_frontend (direction);

-- Add comments for documentation
COMMENT ON COLUMN api_logs_frontend.request_type IS 'Type of request: ui (from frontend UI) or integration (from external apps)';
COMMENT ON COLUMN api_logs_frontend.direction IS 'Direction of request: outbound (frontend to backend) or inbound (response received)';

-- ==========================================
-- Verification queries
-- ==========================================

-- Check backend table structure
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'api_logs_backend'
  AND column_name IN ('request_type', 'direction')
ORDER BY ordinal_position;

-- Check frontend table structure
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'api_logs_frontend'
  AND column_name IN ('request_type', 'direction')
ORDER BY ordinal_position;

-- Count records by request_type (backend)
SELECT request_type, COUNT(*) as count
FROM api_logs_backend
GROUP BY request_type;

-- Count records by direction (backend)
SELECT direction, COUNT(*) as count
FROM api_logs_backend
GROUP BY direction;


