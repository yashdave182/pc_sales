import os
import requests
from dotenv import load_dotenv

def cleanup():
    load_dotenv()
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        print("Error: Missing SUPABASE_URL or SUPABASE_KEY in .env")
        return

    print(f"Targeting Supabase: {supabase_url}")
    
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"  # To get back deleted rows count
    }
    
    # Delete all notifications where id is not 0 (effectively all)
    url = f"{supabase_url}/rest/v1/notifications?notification_id=neq.0"
    
    try:
        response = requests.delete(url, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        count = len(data)
        print(f"Successfully deleted {count} notifications.")
        
    except Exception as e:
        print(f"Error during delete request: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"Response: {e.response.text}")

if __name__ == "__main__":
    cleanup()
