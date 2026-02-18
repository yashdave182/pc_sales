
from supabase_db import get_supabase
import json

def inspect_sales_columns():
    db = get_supabase()
    try:
        # Fetch one row to see keys/columns
        response = db.table("sales").select("*").limit(1).execute()
        if response.data:
            print("Columns found in 'sales' table:")
            print(json.dumps(list(response.data[0].keys()), indent=2))
        else:
            print("Table is empty, cannot infer columns from data.")
            # Try to insert a dummy record to provoke an error or check some other way?
            # Actually, we can check pg_catalog if we had SQL access, but via postgrest we usually just see data.
            # If empty, we can't easily check columns via select *
            pass
    except Exception as e:
        print(f"Error checking columns: {e}")

if __name__ == "__main__":
    inspect_sales_columns()
