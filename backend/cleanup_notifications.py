import os
import sys

# Add current directory to path so we can import modules
sys.path.append(os.getcwd())

from supabase_db import get_supabase

def cleanup():
    try:
        db = get_supabase()
        print("Connecting to database...")
        
        # Delete all notifications
        # valid filter to delete all is usually required by standard Supabase/PostgREST safety
        # We can use neq("notification_id", 0) assuming IDs are positive
        response = db.table("notifications").delete().neq("notification_id", 0).execute()
        
        count = len(response.data) if response.data else 0
        print(f"Successfully deleted {count} notifications.")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    cleanup()
