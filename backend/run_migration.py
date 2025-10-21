#!/usr/bin/env python3
"""
Script to run database migrations
"""
import os
import sys
import psycopg2
from pathlib import Path

# Database connection parameters
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'ovu_ulm')
DB_USER = os.getenv('DB_USER', 'ovu_user')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'H9j3Kz8p@Lm5Qw7R')

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
        # Connect to database
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        
        # Execute migration
        cursor = conn.cursor()
        cursor.execute(migration_sql)
        conn.commit()
        
        print(f"✅ Migration completed successfully!")
        
        # Print any results
        if cursor.description:
            for row in cursor.fetchall():
                print(row)
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python run_migration.py <migration_file>")
        print("Example: python run_migration.py 001_add_user_status_and_scheduling.sql")
        sys.exit(1)
    
    migration_file = sys.argv[1]
    success = run_migration(migration_file)
    
    sys.exit(0 if success else 1)








