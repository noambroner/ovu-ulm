-- ============================================================================
-- API LOGS CLASSIFICATION ANALYSIS
-- ============================================================================
-- Run this on the ULM database to analyze request_type classification
-- Looking for requests that should be 'ui' but are marked as 'integration'
-- ============================================================================

\echo ''
\echo '================================================================================'
\echo '🔍 BACKEND API LOGS ANALYSIS'
\echo '================================================================================'

-- 1. Count by app_source
\echo ''
\echo '📊 COUNT BY APP_SOURCE:'
\echo '--------------------------------------------------------------------------------'
SELECT 
    COALESCE(app_source, 'NULL') as app_source,
    COUNT(*) as total_requests,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM api_logs_backend
GROUP BY app_source
ORDER BY total_requests DESC;

-- 2. Count by request_type
\echo ''
\echo '📊 COUNT BY REQUEST_TYPE:'
\echo '--------------------------------------------------------------------------------'
SELECT 
    COALESCE(request_type, 'NULL') as request_type,
    COUNT(*) as total_requests,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM api_logs_backend
GROUP BY request_type
ORDER BY total_requests DESC;

-- 3. Cross-tabulation: app_source vs request_type
\echo ''
\echo '📊 APP_SOURCE vs REQUEST_TYPE (Cross-Tab):'
\echo '--------------------------------------------------------------------------------'
SELECT 
    COALESCE(app_source, 'NULL') as app_source,
    COALESCE(request_type, 'NULL') as request_type,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY app_source), 2) as pct_of_source
FROM api_logs_backend
GROUP BY app_source, request_type
ORDER BY count DESC;

-- 4. Find potentially misclassified requests
\echo ''
\echo '⚠️  POTENTIALLY MISCLASSIFIED: Integration calls that should be UI'
\echo '--------------------------------------------------------------------------------'
\echo 'Criteria: request_type=integration but endpoint starts with /api/v1/logs/frontend'
\echo ''
SELECT 
    app_source,
    endpoint,
    method,
    COUNT(*) as occurrences,
    MIN(request_time) as first_seen,
    MAX(request_time) as last_seen
FROM api_logs_backend
WHERE request_type = 'integration'
  AND (
    endpoint LIKE '/api/v1/logs/frontend%'
    OR app_source = 'unknown'
  )
GROUP BY app_source, endpoint, method
ORDER BY occurrences DESC
LIMIT 50;

-- 5. Summary statistics
\echo ''
\echo '📊 SUMMARY STATISTICS:'
\echo '--------------------------------------------------------------------------------'
SELECT 
    'Total Backend Logs' as metric,
    COUNT(*) as value
FROM api_logs_backend
UNION ALL
SELECT 
    'UI Requests' as metric,
    COUNT(*) as value
FROM api_logs_backend
WHERE request_type = 'ui'
UNION ALL
SELECT 
    'Integration Requests' as metric,
    COUNT(*) as value
FROM api_logs_backend
WHERE request_type = 'integration'
UNION ALL
SELECT 
    'Requests with unknown app_source' as metric,
    COUNT(*) as value
FROM api_logs_backend
WHERE app_source = 'unknown'
UNION ALL
SELECT 
    'Frontend batch logs marked as integration' as metric,
    COUNT(*) as value
FROM api_logs_backend
WHERE request_type = 'integration'
  AND endpoint LIKE '/api/v1/logs/frontend%';

-- 6. Recent integration calls (last 20)
\echo ''
\echo '📋 RECENT INTEGRATION CALLS (Last 20):'
\echo '--------------------------------------------------------------------------------'
SELECT 
    TO_CHAR(request_time, 'YYYY-MM-DD HH24:MI:SS') as request_time,
    app_source,
    method,
    endpoint,
    status_code
FROM api_logs_backend
WHERE request_type = 'integration'
ORDER BY request_time DESC
LIMIT 20;

-- 7. Unique endpoints by request_type
\echo ''
\echo '📊 UNIQUE ENDPOINTS BY REQUEST_TYPE:'
\echo '--------------------------------------------------------------------------------'
SELECT 
    request_type,
    COUNT(DISTINCT endpoint) as unique_endpoints,
    COUNT(*) as total_requests
FROM api_logs_backend
GROUP BY request_type;

\echo ''
\echo '================================================================================'
\echo '✅ ANALYSIS COMPLETE'
\echo '================================================================================'
\echo ''
\echo 'KEY FINDINGS TO LOOK FOR:'
\echo '  1. Any "unknown" app_source should have been "ulm-react-web"'
\echo '  2. All /api/v1/logs/frontend/* should be request_type=ui not integration'
\echo '  3. Integration calls should only be from external apps (not ulm-* sources)'
\echo ''
\echo '================================================================================'

