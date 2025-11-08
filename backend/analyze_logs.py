"""
Analyze API Logs - Check request_type classification
This script analyzes all API logs to find misclassified requests
"""
import asyncio
import sys
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.models.api_logs import APILogBackend, APILogFrontend
from datetime import datetime, timedelta


async def analyze_backend_logs():
    """Analyze Backend API logs"""
    print("\n" + "="*80)
    print("🔍 ANALYZING BACKEND API LOGS")
    print("="*80)
    
    async with AsyncSessionLocal() as session:
        # 1. Count by app_source
        print("\n📊 COUNT BY APP_SOURCE:")
        print("-" * 80)
        result = await session.execute(
            select(
                APILogBackend.app_source,
                func.count(APILogBackend.id).label('count')
            ).group_by(APILogBackend.app_source).order_by(desc('count'))
        )
        app_sources = result.all()
        for row in app_sources:
            print(f"  {row.app_source:30} → {row.count:>6} requests")
        
        # 2. Count by request_type
        print("\n📊 COUNT BY REQUEST_TYPE:")
        print("-" * 80)
        result = await session.execute(
            select(
                APILogBackend.request_type,
                func.count(APILogBackend.id).label('count')
            ).group_by(APILogBackend.request_type).order_by(desc('count'))
        )
        request_types = result.all()
        for row in request_types:
            print(f"  {row.request_type:30} → {row.count:>6} requests")
        
        # 3. Cross-tabulation: app_source vs request_type
        print("\n📊 APP_SOURCE vs REQUEST_TYPE:")
        print("-" * 80)
        result = await session.execute(
            select(
                APILogBackend.app_source,
                APILogBackend.request_type,
                func.count(APILogBackend.id).label('count')
            ).group_by(
                APILogBackend.app_source,
                APILogBackend.request_type
            ).order_by(desc('count'))
        )
        cross_tab = result.all()
        print(f"  {'App Source':30} {'Request Type':20} {'Count':>10}")
        print(f"  {'-'*30} {'-'*20} {'-'*10}")
        for row in cross_tab:
            print(f"  {row.app_source:30} {row.request_type:20} {row.count:>10}")
        
        # 4. Find misclassified requests (should be UI but marked as integration)
        print("\n⚠️  POTENTIALLY MISCLASSIFIED REQUESTS:")
        print("-" * 80)
        result = await session.execute(
            select(
                APILogBackend.app_source,
                APILogBackend.request_type,
                APILogBackend.endpoint,
                func.count(APILogBackend.id).label('count')
            ).where(
                APILogBackend.request_type == 'integration'
            ).group_by(
                APILogBackend.app_source,
                APILogBackend.request_type,
                APILogBackend.endpoint
            ).order_by(desc('count'))
        )
        misclassified = result.all()
        
        total_misclassified = 0
        for row in misclassified:
            # Check if this looks like it should be UI
            should_be_ui = (
                row.app_source in ['unknown', 'ulm-react-web', 'ulm-flutter-mobile'] or
                row.endpoint.startswith('/api/v1/logs/frontend/')
            )
            if should_be_ui:
                print(f"  🔴 {row.app_source:30} → {row.endpoint:50} [{row.count:>6} requests]")
                total_misclassified += row.count
        
        print(f"\n  Total potentially misclassified: {total_misclassified} requests")
        
        # 5. Recent examples of misclassified requests
        print("\n📋 RECENT EXAMPLES (Last 20 integration calls):")
        print("-" * 80)
        result = await session.execute(
            select(APILogBackend).where(
                APILogBackend.request_type == 'integration'
            ).order_by(desc(APILogBackend.request_time)).limit(20)
        )
        recent = result.scalars().all()
        
        print(f"  {'Time':20} {'App Source':20} {'Endpoint':40} {'Method':8}")
        print(f"  {'-'*20} {'-'*20} {'-'*40} {'-'*8}")
        for log in recent:
            time_str = log.request_time.strftime('%Y-%m-%d %H:%M:%S')
            print(f"  {time_str:20} {log.app_source:20} {log.endpoint:40} {log.method:8}")


async def analyze_frontend_logs():
    """Analyze Frontend API logs"""
    print("\n" + "="*80)
    print("🔍 ANALYZING FRONTEND API LOGS")
    print("="*80)
    
    async with AsyncSessionLocal() as session:
        # 1. Count by app_source
        print("\n📊 COUNT BY APP_SOURCE:")
        print("-" * 80)
        result = await session.execute(
            select(
                APILogFrontend.app_source,
                func.count(APILogFrontend.id).label('count')
            ).group_by(APILogFrontend.app_source).order_by(desc('count'))
        )
        app_sources = result.all()
        for row in app_sources:
            print(f"  {row.app_source:30} → {row.count:>6} requests")
        
        # 2. Count by request_type
        print("\n📊 COUNT BY REQUEST_TYPE:")
        print("-" * 80)
        result = await session.execute(
            select(
                APILogFrontend.request_type,
                func.count(APILogFrontend.id).label('count')
            ).group_by(APILogFrontend.request_type).order_by(desc('count'))
        )
        request_types = result.all()
        for row in request_types:
            print(f"  {row.request_type:30} → {row.count:>6} requests")
        
        # 3. Total logs
        result = await session.execute(
            select(func.count(APILogFrontend.id))
        )
        total = result.scalar()
        print(f"\n  Total Frontend Logs: {total}")


async def main():
    """Main analysis function"""
    try:
        print("\n" + "="*80)
        print("🔍 API LOGS CLASSIFICATION ANALYSIS")
        print("="*80)
        print("\nAnalyzing request_type classification...")
        print("Looking for requests that should be 'ui' but are marked as 'integration'\n")
        
        await analyze_backend_logs()
        await analyze_frontend_logs()
        
        print("\n" + "="*80)
        print("✅ ANALYSIS COMPLETE")
        print("="*80)
        print("\nSummary:")
        print("  - Check for 'unknown' app_source → should have X-App-Source header")
        print("  - All /api/v1/logs/frontend/* should be 'ui' not 'integration'")
        print("  - Frontend logger should use 'api' instance (not raw axios)")
        print("="*80 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error during analysis: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

