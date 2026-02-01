
from datetime import datetime, timedelta, date
from typing import Any, Dict, List, Optional
import math
import random

from fastapi import APIRouter, Depends, Query, HTTPException, Header
from supabase_db import SupabaseClient, get_db, get_supabase

router = APIRouter()

# ==========================================
# CONSTANTS & HELPERS
# ==========================================

def get_master_calling_list(db: SupabaseClient, inactive_days: int) -> List[Dict]:
    """
    Generates the master calling list by combining:
    1. Inactive Customers (High Value)
    2. Pending Demo Follow-ups
    3. Outstanding Payments
    """
    master_list = []
    
    # ----------------------------------
    # 1. Outstanding Payments
    # ----------------------------------
    try:
        # Get sales with pending/partial status
        pending_sales = db.table("sales").select("*").in_("payment_status", ["Pending", "Partial"]).execute()
        
        for sale in pending_sales.data or []:
            # Get customer details
            customer_res = db.table("customers").select("mid, name, mobile, village").eq("customer_id", sale["customer_id"]).execute()
            if not customer_res.data: continue
            cust = customer_res.data[0]
            
            # Use 'sales.paid_amount' if implemented, else rely on status
            paid = sale.get("paid_amount") or 0
            # Also check payments table? For now, simplistic reliance on sales record
            # In a robust system, we'd sum payments table, but let's stick to simple logic first
            
            # Actually, let's just push High priority for any "Pending" status > 7 days old
            sale_date = datetime.strptime(sale["sale_date"], "%Y-%m-%d").date()
            days_old = (date.today() - sale_date).days
            
            if days_old > 7:
                master_list.append({
                    "customer_id": sale["customer_id"],
                    "name": cust["name"],
                    "mobile": cust["mobile"],
                    "village": cust["village"],
                    "priority": "High",
                    "reason": f"Payment pending for Invoice {sale.get('invoice_no')} ({days_old} days)",
                    "type": "payment",
                    "reference_id": sale.get("sale_id"),
                    "amount": sale.get("total_amount") - paid
                })
    except Exception as e:
        print(f"Error fetching outstanding payments: {e}")

    # ----------------------------------
    # 2. Demo Follow-ups
    # ----------------------------------
    try:
        # Get active demos
        today_str = date.today().isoformat()
        demos = db.table("demos").select("*").in_("conversion_status", ["Scheduled", "Pending"]).execute()
        
        for demo in demos.data or []:
            customer_res = db.table("customers").select("name, mobile, village").eq("customer_id", demo["customer_id"]).execute()
            if not customer_res.data: continue
            cust = customer_res.data[0]
            
            # Logic: If demo date passed and no conversion, Call them.
            # If follow_up_date is today/past, Call them.
            should_call = False
            reason = ""
            
            demo_date = datetime.strptime(demo["demo_date"], "%Y-%m-%d").date()
            follow_up = demo.get("follow_up_date")
            
            if follow_up:
                follow_up_date = datetime.strptime(follow_up, "%Y-%m-%d").date()
                if follow_up_date <= date.today():
                    should_call = True
                    reason = "Scheduled Follow-up"
            elif demo_date < date.today():
                 should_call = True
                 reason = "Post-Demo Feedback"
                 
            if should_call:
                master_list.append({
                    "customer_id": demo["customer_id"],
                    "name": cust["name"],
                    "mobile": cust["mobile"],
                    "village": cust["village"],
                    "priority": "High",
                    "reason": reason,
                    "type": "demo",
                    "reference_id": demo.get("demo_id")
                })
    except Exception as e:
         print(f"Error fetching demos: {e}")

    # ----------------------------------
    # 3. Inactive Customers
    # ----------------------------------
    try:
        # This is harder in NoSQL-ish/Supabase client without raw SQL join power for "Max Date"
        # Strategy: Fetch all recent sales, find set of active customers, subtract from all customers?
        # Better: Just limit to checking recently inactive ones if dataset is huge.
        
        # Simplified: Fetch top 50 customers who haven't bought in X days.
        # We rely on 'sales' date.
        
        # 1. Get all customers
        all_customers = db.table("customers").select("customer_id, name, mobile, village").eq("status", "Active").execute()
        
        # 2. Get recent sales (within inactive_days)
        cutoff_date = (date.today() - timedelta(days=inactive_days)).isoformat()
        recent_sales = db.table("sales").select("customer_id").gte("sale_date", cutoff_date).execute()
        active_customer_ids = {s["customer_id"] for s in recent_sales.data}
        
        count = 0
        for cust in all_customers.data or []:
            if count >= 30: break # Limit inactive list size for daily mix
            
            if cust["customer_id"] not in active_customer_ids:
                # This customer is inactive
                master_list.append({
                    "customer_id": cust["customer_id"],
                    "name": cust["name"],
                    "mobile": cust["mobile"],
                    "village": cust["village"],
                    "priority": "Medium",
                    "reason": f"Inactive for {inactive_days}+ days",
                    "type": "inactive",
                    "reference_id": None
                })
                count += 1
                
    except Exception as e:
        print(f"Error fetching inactive customers: {e}")

    return master_list


# ==========================================
# ENDPOINTS
# ==========================================

@router.post("/run-distribution")
def run_daily_distribution(
    db: SupabaseClient = Depends(get_db),
    admin_email: str = Header(None, alias="x-user-email") # Basic security
):
    """
    Triggers the daily distribution process manually.
    Splits the master calling list equally among 'staff' users.
    """
    try:
        # 1. Get Eligible Users from Supabase Auth (ignore local app_users table)
        # We need the official client for admin ops
        supabase = get_supabase()
        
        # Determine if we have service role key privileges (attempt list_users)
        # Note: This requires SUPABASE_SERVICE_ROLE_KEY to be set in env for full access
        # but locally it might work if the user key has permissions.
        
        staff_emails = []
        try:
             # Fetch users from Auth
             response = supabase.auth.admin.list_users()
             # response is usually UserList with .users
             users = response.users if hasattr(response, "users") else response
             
             # Filter out admin and ensure email exists
             staff_emails = [
                 u.email for u in users 
                 if u.email and u.email != "admin@gmail.com"
             ]
        except Exception as auth_error:
             # Fallback or error - if auth admin fails (e.g. no permissions), 
             # we might need to rely on the manual table or raise error.
             print(f"Auth Admin fetch failed: {auth_error}")
             # If this fails, we can't do much if the user complained the table is wrong.
             # Let's try to query app_users as a fallback but likely it is empty/wrong as reported.
             raise HTTPException(
                 status_code=500, 
                 detail=f"Failed to sync users from Supabase Auth. Ensure SUPABASE_SERVICE_ROLE_KEY is set. Error: {str(auth_error)}"
             )
        
        if not staff_emails:
            # Fallback: if no staff, maybe assign to admin or fail
            return {"message": "No active staff users found to distribute calls.", "count": 0}
            
        # 2. Get Master List
        master_list = get_master_calling_list(db, inactive_days=30)
        
        if not master_list:
            return {"message": "No calls to assign today.", "count": 0}
            
        # 3. Shuffle & Split
        random.shuffle(master_list)
        total_items = len(master_list)
        total_staff = len(staff_emails)
        chunk_size = math.ceil(total_items / total_staff)
        
        assignments = []
        notifications_to_send = {}
        today_str = date.today().isoformat()
        
        staff_idx = 0
        for item in master_list:
            assigned_email = staff_emails[staff_idx % total_staff]
            staff_idx += 1
            
            assignments.append({
                "user_email": assigned_email,
                "customer_id": item["customer_id"],
                "priority": item["priority"],
                "reason": item["reason"],
                "assigned_date": today_str,
                "status": "Pending",
                "notes": item.get("type", "") 
            })
            
            # Count notifications
            if assigned_email not in notifications_to_send:
                 notifications_to_send[assigned_email] = 0
            notifications_to_send[assigned_email] += 1
            
        # 4. Bulk Insert Assignments
        if assignments:
            db.table("calling_assignments").insert(assignments).execute()
            
        # 5. Insert Notifications
        notification_records = []
        for email, count in notifications_to_send.items():
            notification_records.append({
                "user_email": email,
                "title": "New Calls Assigned",
                "message": f"You have been assigned {count} new calls for today.",
                "notification_type": "info",
                "entity_type": "calling_list",
                "is_read": False
            })
            
        if notification_records:
            db.table("notifications").insert(notification_records).execute()
        
        return {
            "message": "Distribution successful",
            "total_calls": total_items,
            "staff_count": total_staff,
            "calls_per_person": chunk_size
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Distribution failed: {str(e)}")


@router.get("/my-assignments")
def get_my_assignments(
    user_email: str = Header(..., alias="x-user-email"),
    db: SupabaseClient = Depends(get_db)
):
    """
    Fetch the calling list assigned to the logged-in user for TODAY.
    """
    try:
        today_str = date.today().isoformat()
        
        # 1. Get assignments
        res = db.table("calling_assignments")\
            .select("*")\
            .eq("user_email", user_email)\
            .eq("assigned_date", today_str)\
            .execute()
            
        assignments = res.data or []
        
        # 2. Enrich with customer details
        # Supabase join syntax is tricky in python client without defined relations sometimes.
        # We'll fetch customer details manually for the list.
        cust_ids = [a["customer_id"] for a in assignments]
        
        if not cust_ids:
            return {"assignments": [], "summary": {"total": 0, "pending": 0}}
            
        customers_res = db.table("customers").select("*").in_("customer_id", cust_ids).execute()
        customers_map = {c["customer_id"]: c for c in customers_res.data}
        
        enhanced_list = []
        for a in assignments:
            c = customers_map.get(a["customer_id"], {})
            enhanced_list.append({
                **a,
                "name": c.get("name"),
                "mobile": c.get("mobile"),
                "village": c.get("village"),
                # adapt to frontend expected fields
                "customer_id": a["customer_id"],
                "priority": a["priority"], 
                "reason": a["reason"],
                "outstanding_balance": 0, # could fetch real balance if needed
            })
            
        return {
            "assignments": enhanced_list,
            "summary": {
                "total": len(enhanced_list),
                "pending": len([x for x in enhanced_list if x["status"] == "Pending"])
            }
        }
        
    except Exception as e:
        print(f"Error getting assignments: {e}")
        return {"assignments": [], "error": str(e)}

# Keep the old endpoint for admin backward compatibility or reference
@router.get("/calling-list")
def get_daily_calling_list(
    limit: int = Query(50),
    db: SupabaseClient = Depends(get_db),
):
    # This just returns the master list without assignment
    raw_list = get_master_calling_list(db, inactive_days=30)
    
    # Format to match old interface roughly
    return {
        "generated_at": datetime.now().isoformat(),
        "calling_priorities": {
            "high_priority": [x for x in raw_list if x["priority"] == "High"],
            "medium_priority": [x for x in raw_list if x["priority"] == "Medium"],
            "low_priority": []
        },
        "summary": {
            "total_calls_suggested": len(raw_list)
        }
    }