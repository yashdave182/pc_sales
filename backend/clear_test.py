import os
from dotenv import load_dotenv
load_dotenv()
from supabase_db import get_supabase
from datetime import date

db = get_supabase()
today_str = date.today().isoformat()

print(f"Clearing pending assignments for {today_str}...")
res = db.table("calling_assignments").eq("assigned_date", today_str).eq("status", "Pending").delete()

print(f"Deleted {len(res.data or [])} assignments. The next scheduler run will perform a fresh distribution.")
