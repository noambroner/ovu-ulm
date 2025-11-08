#!/usr/bin/env python3
"""
Simple API Logs Analyzer - Can be copied and run on the server
Usage: python3 analyze_logs_simple.py
"""
import os
os.environ['DB_HOST'] = os.getenv('DB_HOST', 'localhost')
os.environ['DB_PORT'] = os.getenv('DB_PORT', '5432')
os.environ['DB_NAME'] = os.getenv('DB_NAME', 'ulm_db')
os.environ['DB_USER'] = os.getenv('DB_USER', 'ulm_user')
os.environ['DB_PASSWORD'] = os.getenv('DB_PASSWORD', '')

import asyncio
import sys

# Minimal imports
try:
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import sessionmaker
except ImportError:
    print("Error: sqlalchemy not installed")
    print("Run: pip install sqlalchemy psycopg2-binary")
    sys.exit(1)

# Database connection from environment
DATABASE_URL = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"

def analyze():
    """Run synchronous analysis"""
    print("\n" + "="*80)
    print("🔍 BACKEND API LOGS ANALYSIS")
    print("="*80)
    
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # 1. Count by app_source
        print("\n📊 COUNT BY APP_SOURCE:")
        print("-" * 80)
        result = session.execute(text("""
            SELECT 
                COALESCE(app_source, 'NULL') as app_source,
                COUNT(*) as total_requests
            FROM api_logs_backend
            GROUP BY app_source
            ORDER BY total_requests DESC
        """))
        for row in result:
            print(f"  {row.app_source:30} → {row.total_requests:>6} requests")
        
        # 2. Count by request_type
        print("\n📊 COUNT BY REQUEST_TYPE:")
        print("-" * 80)
        result = session.execute(text("""
            SELECT 
                COALESCE(request_type, 'NULL') as request_type,
                COUNT(*) as total_requests
            FROM api_logs_backend
            GROUP BY request_type
            ORDER BY total_requests DESC
        """))
        for row in result:
            print(f"  {row.request_type:30} → {row.total_requests:>6} requests")
        
        # 3. Cross-tabulation
        print("\n📊 APP_SOURCE vs REQUEST_TYPE:")
        print("-" * 80)
        result = session.execute(text("""
            SELECT 
                COALESCE(app_source, 'NULL') as app_source,
                COALESCE(request_type, 'NULL') as request_type,
                COUNT(*) as count
            FROM api_logs_backend
            GROUP BY app_source, request_type
            ORDER BY count DESC
        """))
        print(f"  {'App Source':30} {'Request Type':20} {'Count':>10}")
        print(f"  {'-'*30} {'-'*20} {'-'*10}")
        for row in result:
            print(f"  {row.app_source:30} {row.request_type:20} {row.count:>10}")
        
        # 4. Misclassified requests
        print("\n⚠️  POTENTIALLY MISCLASSIFIED (Integration calls):")
        print("-" * 80)
        result = session.execute(text("""
            SELECT 
                app_source,
                endpoint,
                COUNT(*) as occurrences
            FROM api_logs_backend
            WHERE request_type = 'integration'
            GROUP BY app_source, endpoint
            ORDER BY occurrences DESC
            LIMIT 30
        """))
        total = 0
        for row in result:
            print(f"  {row.app_source:25} → {row.endpoint:50} [{row.occurrences:>6}]")
            total += row.occurrences
        
        print(f"\n  Total integration requests: {total}")
        
        # 5. Summary
        print("\n📊 SUMMARY:")
        print("-" * 80)
        result = session.execute(text("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN request_type = 'ui' THEN 1 ELSE 0 END) as ui_count,
                SUM(CASE WHEN request_type = 'integration' THEN 1 ELSE 0 END) as integration_count,
                SUM(CASE WHEN app_source = 'unknown' THEN 1 ELSE 0 END) as unknown_source,
                SUM(CASE WHEN request_type = 'integration' AND endpoint LIKE '/api/v1/logs/frontend%' THEN 1 ELSE 0 END) as misclassified_frontend_logs
            FROM api_logs_backend
        """))
        row = result.fetchone()
        print(f"  Total logs:                          {row.total:>8}")
        print(f"  UI requests:                         {row.ui_count:>8}")
        print(f"  Integration requests:                {row.integration_count:>8}")
        print(f"  Unknown app_source:                  {row.unknown_source:>8}")
        print(f"  Frontend logs marked as integration: {row.misclassified_frontend_logs:>8}")
        
        print("\n" + "="*80)
        print("✅ ANALYSIS COMPLETE")
        print("="*80)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    analyze()

