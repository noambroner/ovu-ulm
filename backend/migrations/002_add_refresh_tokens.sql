-- Migration: Add Refresh Tokens Support
-- Description: Creates table for refresh tokens and token settings

-- 1. Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP,
    device_info VARCHAR(500),
    ip_address VARCHAR(45)
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- 2. Create token_settings table (for user-customizable token durations)
CREATE TABLE IF NOT EXISTS token_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    access_token_expire_minutes INTEGER DEFAULT 15,
    refresh_token_expire_days INTEGER DEFAULT 7,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- Insert default settings for existing users
INSERT INTO token_settings (user_id, access_token_expire_minutes, refresh_token_expire_days)
SELECT id, 15, 7 FROM users
ON CONFLICT (user_id) DO NOTHING;

-- 3. Add function to clean expired tokens
CREATE OR REPLACE FUNCTION clean_expired_refresh_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM refresh_tokens 
    WHERE expires_at < CURRENT_TIMESTAMP OR revoked = TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE refresh_tokens IS 'Stores refresh tokens for user authentication';
COMMENT ON TABLE token_settings IS 'User-specific token expiration settings';

