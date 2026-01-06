"""
Admin Router
Handles admin-only operations including activity logs and user management
"""

from datetime import datetime, timedelta
from typing import List, Optional

from activity_logger import get_activity_logger
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from supabase_db import SupabaseClient, get_db

router = APIRouter()

# Admin email - only this user can access admin endpoints
ADMIN_EMAIL = "admin@gmail.com"


def verify_admin(user_email: Optional[str] = Header(None, alias="x-user-email")):
    """Verify that the user is an admin"""
    if not user_email or user_email != ADMIN_EMAIL:
        raise HTTPException(
            status_code=403, detail="Access denied. Admin privileges required."
        )
    return user_email


@router.get("/health")
def health():
    """Health check endpoint"""
    return {"status": "ok"}


@router.get("/activity-logs")
def get_activity_logs(
    limit: int = 100,
    offset: int = 0,
    user_email: Optional[str] = None,
    action_type: Optional[str] = None,
    entity_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    admin_email: str = Depends(verify_admin),
    db: SupabaseClient = Depends(get_db),
):
    """
    Get activity logs with filtering and pagination
    Only accessible by admin users
    """
    try:
        # Start with base query
        query = db.table("activity_logs").select("*")

        # Build count query separately
        count_query = db.table("activity_logs").select("*", count="exact")

        # Apply filters to both queries
        if user_email:
            query = query.eq("user_email", user_email)
            count_query = count_query.eq("user_email", user_email)

        if action_type:
            query = query.eq("action_type", action_type)
            count_query = count_query.eq("action_type", action_type)

        if entity_type:
            query = query.eq("entity_type", entity_type)
            count_query = count_query.eq("entity_type", entity_type)

        if start_date:
            query = query.gte("created_at", start_date)
            count_query = count_query.gte("created_at", start_date)

        if end_date:
            query = query.lte("created_at", end_date)
            count_query = count_query.lte("created_at", end_date)

        # Order by most recent first
        query = query.order("created_at", desc=True)

        # Apply pagination
        if limit and offset is not None:
            query = query.range(offset, offset + limit - 1)
        elif limit:
            query = query.limit(limit)

        # Execute queries
        response = query.execute()
        count_response = count_query.execute()

        # Get total count from response
        total = (
            count_response.count
            if hasattr(count_response, "count")
            else len(count_response.data)
            if count_response.data
            else 0
        )

        # Log the admin viewing activity logs (don't fail if this errors)
        try:
            logger = get_activity_logger(db)
            logger.log_view(
                user_email=admin_email,
                page_name="Activity Logs",
                metadata={
                    "filters": {
                        "user_email": user_email,
                        "action_type": action_type,
                        "entity_type": entity_type,
                        "start_date": start_date,
                        "end_date": end_date,
                    },
                    "limit": limit,
                    "offset": offset,
                },
            )
        except Exception as log_error:
            # Don't fail the whole request if logging fails
            print(f"Warning: Failed to log activity: {str(log_error)}")

        return {
            "data": response.data or [],
            "total": total,
            "limit": limit,
            "offset": offset,
        }

    except Exception as e:
        # Print detailed error for debugging
        print(f"Error in get_activity_logs: {type(e).__name__}: {str(e)}")
        import traceback

        traceback.print_exc()

        error_msg = str(e).lower()

        # Check if it's a table not found error
        if "relation" in error_msg and "does not exist" in error_msg:
            raise HTTPException(
                status_code=500,
                detail="Activity logs table does not exist. Please run the database migration: backend/migrations/001_create_activity_logs.sql in your Supabase SQL Editor.",
            )
        elif "table" in error_msg or "column" in error_msg:
            raise HTTPException(
                status_code=500,
                detail=f"Database schema error: {str(e)}. Please ensure the activity_logs table is created correctly.",
            )
        else:
            raise HTTPException(
                status_code=500, detail=f"Error fetching activity logs: {str(e)}"
            )


@router.get("/activity-logs/stats")
def get_activity_stats(
    days: int = 30,
    admin_email: str = Depends(verify_admin),
    db: SupabaseClient = Depends(get_db),
):
    """
    Get activity statistics
    Only accessible by admin users
    """
    try:
        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)

        # Get all activities in date range
        response = (
            db.table("activity_logs")
            .select("*")
            .gte("created_at", start_date.isoformat())
            .lte("created_at", end_date.isoformat())
            .execute()
        )

        activities = response.data or []

        # Calculate statistics
        stats = {
            "total_activities": len(activities),
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": days,
            },
            "by_user": {},
            "by_action_type": {},
            "by_entity_type": {},
            "recent_users": [],
        }

        # Group by user
        user_activity_count = {}
        for activity in activities:
            user_email = activity.get("user_email", "unknown")
            user_activity_count[user_email] = user_activity_count.get(user_email, 0) + 1

        stats["by_user"] = user_activity_count

        # Group by action type
        action_type_count = {}
        for activity in activities:
            action_type = activity.get("action_type", "unknown")
            action_type_count[action_type] = action_type_count.get(action_type, 0) + 1

        stats["by_action_type"] = action_type_count

        # Group by entity type
        entity_type_count = {}
        for activity in activities:
            entity_type = activity.get("entity_type")
            if entity_type:
                entity_type_count[entity_type] = (
                    entity_type_count.get(entity_type, 0) + 1
                )

        stats["by_entity_type"] = entity_type_count

        # Get list of recent active users
        recent_users = list(
            set([a.get("user_email") for a in activities if a.get("user_email")])
        )
        stats["recent_users"] = recent_users[:10]  # Top 10 recent users

        return stats

    except Exception as e:
        error_msg = str(e).lower()
        if "relation" in error_msg and "does not exist" in error_msg:
            raise HTTPException(
                status_code=500,
                detail="Activity logs table does not exist. Please run the database migration first.",
            )
        else:
            raise HTTPException(
                status_code=500, detail=f"Error fetching activity stats: {str(e)}"
            )


@router.get("/users")
def get_all_users(
    admin_email: str = Depends(verify_admin),
    db: SupabaseClient = Depends(get_db),
):
    """
    Get list of all users from activity logs
    Only accessible by admin users
    """
    try:
        # Get distinct user emails from activity logs
        response = db.table("activity_logs").select("user_email").execute()

        if not response.data:
            return {"users": []}

        # Get unique users
        users = list(
            set(
                [item["user_email"] for item in response.data if item.get("user_email")]
            )
        )

        # Get user activity counts
        user_details = []
        for user_email in users:
            user_activities = (
                db.table("activity_logs")
                .select("*")
                .eq("user_email", user_email)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )

            last_activity = user_activities.data[0] if user_activities.data else None

            # Count total activities
            count_response = (
                db.table("activity_logs")
                .select("id", count="exact")
                .eq("user_email", user_email)
                .execute()
            )

            user_details.append(
                {
                    "email": user_email,
                    "total_activities": len(count_response.data)
                    if count_response.data
                    else 0,
                    "last_activity": last_activity.get("created_at")
                    if last_activity
                    else None,
                    "last_action": last_activity.get("action_description")
                    if last_activity
                    else None,
                }
            )

        # Sort by most active
        user_details.sort(key=lambda x: x["total_activities"], reverse=True)

        return {"users": user_details}

    except Exception as e:
        error_msg = str(e).lower()
        if "relation" in error_msg and "does not exist" in error_msg:
            raise HTTPException(
                status_code=500,
                detail="Activity logs table does not exist. Please run the database migration first.",
            )
        else:
            raise HTTPException(
                status_code=500, detail=f"Error fetching users: {str(e)}"
            )


@router.delete("/activity-logs/{log_id}")
def delete_activity_log(
    log_id: int,
    admin_email: str = Depends(verify_admin),
    db: SupabaseClient = Depends(get_db),
):
    """
    Delete a specific activity log
    Only accessible by admin users
    """
    try:
        response = db.table("activity_logs").delete().eq("id", log_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Activity log not found")

        return {"message": "Activity log deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error deleting activity log: {str(e)}"
        )


@router.delete("/activity-logs/bulk")
def delete_old_activity_logs(
    days_old: int = 90,
    admin_email: str = Depends(verify_admin),
    db: SupabaseClient = Depends(get_db),
):
    """
    Delete activity logs older than specified days
    Only accessible by admin users
    """
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)

        response = (
            db.table("activity_logs")
            .delete()
            .lt("created_at", cutoff_date.isoformat())
            .execute()
        )

        deleted_count = len(response.data) if response.data else 0

        # Log this admin action
        logger = get_activity_logger(db)
        logger.log_activity(
            user_email=admin_email,
            action_type="DELETE",
            action_description=f"Deleted activity logs older than {days_old} days",
            entity_type="admin",
            metadata={"days_old": days_old, "deleted_count": deleted_count},
        )

        return {
            "message": f"Deleted {deleted_count} old activity logs",
            "deleted_count": deleted_count,
            "cutoff_date": cutoff_date.isoformat(),
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error deleting old activity logs: {str(e)}"
        )
