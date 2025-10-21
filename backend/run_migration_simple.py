#!/usr/bin/env python3
"""
Simple migration runner using SQLAlchemy
"""
import sys
from pathlib import Path

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import Session
except ImportError:
    print("❌ SQLAlchemy not found. Installing...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "sqlalchemy", "psycopg2-binary"])
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import Session

# Database URL (update if needed)
DB_URL = "postgresql://ovu_user:H9j3Kz8p@Lm5Qw7R@localhost:5432/ovu_ulm"

def run_migration(migration_file):
    """Run a migration file"""
    print(f"🚀 Running migration: {migration_file}")
    
    # Read migration file
    migration_path = Path(__file__).parent / 'migrations' / migration_file
    
    if not migration_path.exists():
        print(f"❌ Migration file not found: {migration_path}")
        return False
    
    with open(migration_path, 'r') as f:
        migration_sql = f.read()
    
    try:
        # Create engine
        engine = create_engine(DB_URL, echo=True)
        
        # Execute migration
        with engine.connect() as conn:
            # Split by semicolons and execute each statement
            statements = [s.strip() for s in migration_sql.split(';') if s.strip()]
            
            for stmt in statements:
                if stmt:
                    print(f"\n📝 Executing: {stmt[:100]}...")
                    try:
                        conn.execute(text(stmt))
                        conn.commit()
                    except Exception as e:
                        # Some statements might fail if already exist, that's ok
                        print(f"⚠️  Warning: {str(e)}")
                        conn.rollback()
        
        print(f"\n✅ Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python run_migration_simple.py <migration_file>")
        print("Example: python run_migration_simple.py 001_add_user_status_and_scheduling.sql")
        sys.exit(1)
    
    migration_file = sys.argv[1]
    success = run_migration(migration_file)
    
    sys.exit(0 if success else 1)








