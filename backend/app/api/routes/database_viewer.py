"""
Database Viewer API Routes
Provides endpoints to view and search database tables
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text, inspect
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user

router = APIRouter()


@router.get(
    "/tables",
    summary="Get list of all database tables",
    description="Returns a list of all tables in the ULM database with their column information.",
    response_description="List of tables with their schemas"
)
async def get_tables(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get all tables in the database with their column information.
    
    Requires authentication. Returns table names, column names, and types.
    """
    try:
        # Get all table names
        result = await db.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """))
        
        tables_data = []
        for row in result:
            table_name = row[0]
            
            # Get column information for each table
            columns_result = await db.execute(text(f"""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = :table_name
                ORDER BY ordinal_position
            """), {"table_name": table_name})
            
            columns = []
            for col in columns_result:
                columns.append({
                    "name": col[0],
                    "type": col[1],
                    "nullable": col[2] == "YES",
                    "default": col[3]
                })
            
            # Get row count
            count_result = await db.execute(text(f'SELECT COUNT(*) FROM "{table_name}"'))
            row_count = count_result.scalar()
            
            tables_data.append({
                "name": table_name,
                "columns": columns,
                "row_count": row_count
            })
        
        return {
            "success": True,
            "tables": tables_data,
            "total_tables": len(tables_data)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch tables: {str(e)}")


@router.get(
    "/table/{table_name}",
    summary="Get data from a specific table",
    description="Returns all data from the specified table with optional pagination and search.",
    response_description="Table data with pagination info"
)
async def get_table_data(
    table_name: str,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    search: Optional[str] = Query(None, description="Search term to filter records"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get data from a specific table.
    
    Supports:
    - Pagination (skip/limit)
    - Search across all columns
    - Automatic column detection
    
    Requires authentication.
    """
    try:
        # Verify table exists
        table_check = await db.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            AND table_name = :table_name
        """), {"table_name": table_name})
        
        if not table_check.scalar():
            raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found")
        
        # Get column names
        columns_result = await db.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = :table_name
            ORDER BY ordinal_position
        """), {"table_name": table_name})
        
        columns = [row[0] for row in columns_result]
        
        # Build search condition if provided
        search_condition = ""
        params = {"skip": skip, "limit": limit}
        
        if search:
            search_conditions = []
            for col in columns:
                search_conditions.append(f'CAST("{col}" AS TEXT) ILIKE :search')
            search_condition = f"WHERE {' OR '.join(search_conditions)}"
            params["search"] = f"%{search}%"
        
        # Get total count
        count_query = f'SELECT COUNT(*) FROM "{table_name}" {search_condition}'
        count_result = await db.execute(text(count_query), params)
        total_count = count_result.scalar()
        
        # Get data with pagination
        data_query = f'''
            SELECT * FROM "{table_name}"
            {search_condition}
            ORDER BY 1
            LIMIT :limit OFFSET :skip
        '''
        
        data_result = await db.execute(text(data_query), params)
        
        # Convert rows to dictionaries
        rows = []
        for row in data_result:
            row_dict = {}
            for i, col_name in enumerate(columns):
                value = row[i]
                # Convert datetime objects to string
                if hasattr(value, 'isoformat'):
                    value = value.isoformat()
                row_dict[col_name] = value
            rows.append(row_dict)
        
        return {
            "success": True,
            "table_name": table_name,
            "columns": columns,
            "data": rows,
            "pagination": {
                "total": total_count,
                "skip": skip,
                "limit": limit,
                "returned": len(rows)
            },
            "search": search
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch table data: {str(e)}")


@router.get(
    "/table/{table_name}/schema",
    summary="Get table schema details",
    description="Returns detailed schema information for a specific table including constraints and indexes.",
    response_description="Detailed table schema"
)
async def get_table_schema(
    table_name: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get detailed schema information for a table.
    
    Includes:
    - Columns with types and constraints
    - Primary keys
    - Foreign keys
    - Indexes
    
    Requires authentication.
    """
    try:
        # Verify table exists
        table_check = await db.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            AND table_name = :table_name
        """), {"table_name": table_name})
        
        if not table_check.scalar():
            raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found")
        
        # Get column information
        columns_result = await db.execute(text("""
            SELECT 
                column_name, 
                data_type, 
                is_nullable, 
                column_default,
                character_maximum_length,
                numeric_precision
            FROM information_schema.columns
            WHERE table_name = :table_name
            ORDER BY ordinal_position
        """), {"table_name": table_name})
        
        columns = []
        for col in columns_result:
            columns.append({
                "name": col[0],
                "type": col[1],
                "nullable": col[2] == "YES",
                "default": col[3],
                "max_length": col[4],
                "precision": col[5]
            })
        
        # Get primary key
        pk_result = await db.execute(text("""
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = :table_name
                AND tc.constraint_type = 'PRIMARY KEY'
        """), {"table_name": table_name})
        
        primary_keys = [row[0] for row in pk_result]
        
        # Get foreign keys
        fk_result = await db.execute(text("""
            SELECT
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.table_name = :table_name
                AND tc.constraint_type = 'FOREIGN KEY'
        """), {"table_name": table_name})
        
        foreign_keys = []
        for row in fk_result:
            foreign_keys.append({
                "column": row[0],
                "references_table": row[1],
                "references_column": row[2]
            })
        
        return {
            "success": True,
            "table_name": table_name,
            "columns": columns,
            "primary_keys": primary_keys,
            "foreign_keys": foreign_keys
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch table schema: {str(e)}")

