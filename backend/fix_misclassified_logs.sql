-- ============================================================================
-- FIX MISCLASSIFIED API LOGS
-- ============================================================================
-- This script fixes API logs that are marked as 'integration' 
-- but should be 'ui' based on their endpoint patterns
-- ============================================================================

\echo ''
\echo '================================================================================'
\echo '🔧 FIXING MISCLASSIFIED API LOGS'
\echo '================================================================================'

-- Show current state
\echo ''
\echo '📊 BEFORE FIX - Current State:'
\echo '--------------------------------------------------------------------------------'
SELECT 
    'integration' as request_type,
    COUNT(*) as count
FROM api_logs_backend
WHERE request_type = 'integration'
UNION ALL
SELECT 
    'ui' as request_type,
    COUNT(*) as count
FROM api_logs_backend
WHERE request_type = 'ui';

-- Fix 1: Frontend batch logs (from apiLogger.ts)
\echo ''
\echo '🔧 FIX 1: /api/v1/logs/frontend/batch (apiLogger.ts calls)'
\echo '--------------------------------------------------------------------------------'
UPDATE api_logs_backend
SET 
    request_type = 'ui',
    app_source = 'ulm-react-web'
WHERE request_type = 'integration'
  AND app_source = 'unknown'
  AND endpoint LIKE '/api/v1/logs/frontend%';

SELECT format('✅ Updated %s records', COUNT(*)) as result
FROM api_logs_backend
WHERE request_type = 'ui'
  AND app_source = 'ulm-react-web'
  AND endpoint LIKE '/api/v1/logs/frontend%'
  AND updated_at > NOW() - INTERVAL '1 minute';

-- Fix 2: User preferences calls (from UI)
\echo ''
\echo '🔧 FIX 2: /api/v1/preferences/* (UI preference calls)'
\echo '--------------------------------------------------------------------------------'
UPDATE api_logs_backend
SET 
    request_type = 'ui',
    app_source = 'ulm-react-web'
WHERE request_type = 'integration'
  AND app_source = 'unknown'
  AND endpoint LIKE '/api/v1/preferences%';

SELECT format('✅ Updated %s records', COUNT(*)) as result
FROM api_logs_backend
WHERE request_type = 'ui'
  AND app_source = 'ulm-react-web'
  AND endpoint LIKE '/api/v1/preferences%'
  AND updated_at > NOW() - INTERVAL '1 minute';

-- Fix 3: Search history calls (from UI)
\echo ''
\echo '🔧 FIX 3: /api/v1/search-history/* (UI search history)'
\echo '--------------------------------------------------------------------------------'
UPDATE api_logs_backend
SET 
    request_type = 'ui',
    app_source = 'ulm-react-web'
WHERE request_type = 'integration'
  AND app_source = 'unknown'
  AND endpoint LIKE '/api/v1/search-history%';

SELECT format('✅ Updated %s records', COUNT(*)) as result
FROM api_logs_backend
WHERE request_type = 'ui'
  AND app_source = 'ulm-react-web'
  AND endpoint LIKE '/api/v1/search-history%'
  AND updated_at > NOW() - INTERVAL '1 minute';

-- Fix 4: Dev Journal calls (from UI)
\echo ''
\echo '🔧 FIX 4: /api/v1/dev-journal/* (UI dev journal)'
\echo '--------------------------------------------------------------------------------'
UPDATE api_logs_backend
SET 
    request_type = 'ui',
    app_source = 'ulm-react-web'
WHERE request_type = 'integration'
  AND app_source = 'unknown'
  AND endpoint LIKE '/api/v1/dev-journal%';

SELECT format('✅ Updated %s records', COUNT(*) as result
FROM api_logs_backend
WHERE request_type = 'ui'
  AND app_source = 'ulm-react-web'
  AND endpoint LIKE '/api/v1/dev-journal%'
  AND updated_at > NOW() - INTERVAL '1 minute';

-- Fix 5: Components calls (from UI)
\echo ''
\echo '🔧 FIX 5: /api/v1/components (UI components)'
\echo '--------------------------------------------------------------------------------'
UPDATE api_logs_backend
SET 
    request_type = 'ui',
    app_source = 'ulm-react-web'
WHERE request_type = 'integration'
  AND app_source = 'unknown'
  AND endpoint LIKE '/api/v1/components%';

SELECT format('✅ Updated %s records', COUNT(*)) as result
FROM api_logs_backend
WHERE request_type = 'ui'
  AND app_source = 'ulm-react-web'
  AND endpoint LIKE '/api/v1/components%'
  AND updated_at > NOW() - INTERVAL '1 minute';

-- Show final state
\echo ''
\echo '📊 AFTER FIX - Final State:'
\echo '--------------------------------------------------------------------------------'
SELECT 
    'integration' as request_type,
    COUNT(*) as count
FROM api_logs_backend
WHERE request_type = 'integration'
UNION ALL
SELECT 
    'ui' as request_type,
    COUNT(*) as count
FROM api_logs_backend
WHERE request_type = 'ui';

-- Show remaining integration calls (should be only real external calls)
\echo ''
\echo '⚠️  REMAINING INTEGRATION CALLS (should be real external/bots):'
\echo '--------------------------------------------------------------------------------'
SELECT 
    COALESCE(app_source, 'NULL') as app_source,
    endpoint,
    COUNT(*) as count
FROM api_logs_backend
WHERE request_type = 'integration'
GROUP BY app_source, endpoint
ORDER BY count DESC
LIMIT 20;

\echo ''
\echo '================================================================================'
\echo '✅ FIX COMPLETE'
\echo '================================================================================'
\echo ''
\echo 'Summary:'
\echo '  - Fixed apiLogger.ts calls to be marked as UI'
\echo '  - Fixed other UI endpoint patterns'
\echo '  - Remaining integration calls should be from real external sources'
\echo ''
\echo '================================================================================'

