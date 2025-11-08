#!/usr/bin/env python3
"""
Run user preferences migration using app's database connection
"""
import sys
import asyncio
from pathlib import Path

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import engine
from sqlalchemy import text

async def run_migration():
    """Run the preferences migration"""
    print("🚀 Running user preferences migration...")
    
    migration_file = Path(__file__).parent / 'migrations' / 'add_user_preferences_and_search_history.sql'
    
    if not migration_file.exists():
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    with open(migration_file, 'r') as f:
        migration_sql = f.read()
    
    try:
        async with engine.begin() as conn:
            # Execute the entire migration as one transaction
            await conn.execute(text(migration_sql))
        
        print("✅ Migration completed successfully!")
        
        # Verify tables were created
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT tablename 
                FROM pg_tables 
                WHERE schemaname='public' 
                  AND (tablename='user_datagrid_preferences' OR tablename='user_search_history')
                ORDER BY tablename
            """))
            tables = [row[0] for row in result]
            print(f"\n✅ Tables created: {', '.join(tables)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(run_migration())
    sys.exit(0 if success else 1)

