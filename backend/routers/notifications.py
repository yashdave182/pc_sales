"""
Notifications Router
Handles notification operations including creation, retrieval, and marking as read
"""

from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from models import Notification
from supabase_db import SupabaseClient, get_supabase

router = APIRouter()


@router.get("/")
def get_notifications(
    user_email: Optional[str] = Header(None, alias="x-user-email"),
    limit: int = 50,
    offset: int = 0,
    is_read: Optional[bool] = None,
    notification_type: Optional[str] = None,
    db: SupabaseClient = Depends(get_supabase),
):
    """Get all notifications for a user"""
    try:
        # Build query
        query = db.table("notifications").select("*")

        # Filter by user email if provided (None means broadcast to all)
        if user_email:
            # Get both user-specific and broadcast notifications
            query = db.table("notifications").select("*")
            # This will be filtered in post-processing since Supabase doesn't support OR with None

        # Filter by read status
        if is_read is not None:
            query = query.eq("is_read", is_read)

        # Filter by type
        if notification_type:
            query = query.eq("notification_type", notification_type)

        # Order by most recent first
        query = query.order("created_at", desc=True)

        # Apply pagination
        query = query.limit(limit).offset(offset)

        response = query.execute()

        if not response.data:
            return {"data": [], "total": 0, "unread_count": 0}

        # Filter for user-specific and broadcast notifications
        notifications = []
        if user_email:
            for notif in response.data:
                notif_user = notif.get("user_email")
                if notif_user is None or notif_user == user_email:
                    notifications.append(notif)
        else:
            notifications = response.data

        # Get unread count
        unread_query = (
            db.table("notifications").select("notification_id").eq("is_read", False)
        )
        if user_email:
            # Will be filtered in post-processing
            pass

        unread_response = unread_query.execute()
        unread_count = 0
        if unread_response.data and user_email:
            for notif in unread_response.data:
                notif_user = notif.get("user_email")
                if notif_user is None or notif_user == user_email:
                    unread_count += 1
        elif unread_response.data:
            unread_count = len(unread_response.data)

        return {
            "data": notifications,
            "total": len(notifications),
            "unread_count": unread_count,
        }

    except Exception as e:
        print(f"Error fetching notifications: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching notifications: {str(e)}"
        )


@router.get("/unread-count")
def get_unread_count(
    user_email: Optional[str] = Header(None, alias="x-user-email"),
    db: SupabaseClient = Depends(get_supabase),
):
    """Get count of unread notifications for a user"""
    try:
        query = db.table("notifications").select("notification_id").eq("is_read", False)

        response = query.execute()

        if not response.data:
            return {"count": 0}

        # Filter for user-specific and broadcast
        count = 0
        if user_email:
            for notif in response.data:
                notif_user = notif.get("user_email")
                if notif_user is None or notif_user == user_email:
                    count += 1
        else:
            count = len(response.data)

        return {"count": count}

    except Exception as e:
        print(f"Error fetching unread count: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching unread count: {str(e)}"
        )


@router.get("/{notification_id}")
def get_notification(
    notification_id: int,
    db: SupabaseClient = Depends(get_supabase),
):
    """Get a single notification by ID"""
    try:
        response = (
            db.table("notifications")
            .select("*")
            .eq("notification_id", notification_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Notification not found")

        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching notification: {str(e)}"
        )


@router.post("/")
def create_notification(
    notification: Notification,
    db: SupabaseClient = Depends(get_supabase),
):
    """Create a new notification"""
    try:
        notification_data = {
            "user_email": notification.user_email,
            "title": notification.title,
            "message": notification.message,
            "notification_type": notification.notification_type,
            "entity_type": notification.entity_type,
            "entity_id": notification.entity_id,
            "action_url": notification.action_url,
            "is_read": False,
            "created_at": datetime.utcnow().isoformat(),
        }

        response = db.table("notifications").insert(notification_data).execute()

        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create notification")

        return {
            "message": "Notification created successfully",
            "notification": response.data[0],
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating notification: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error creating notification: {str(e)}"
        )


@router.put("/{notification_id}/mark-read")
def mark_notification_read(
    notification_id: int,
    db: SupabaseClient = Depends(get_supabase),
):
    """Mark a notification as read"""
    try:
        response = (
            db.table("notifications")
            .update({"is_read": True})
            .eq("notification_id", notification_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Notification not found")

        return {
            "message": "Notification marked as read",
            "notification": response.data[0],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error marking notification as read: {str(e)}"
        )


@router.put("/mark-all-read")
def mark_all_read(
    user_email: Optional[str] = Header(None, alias="x-user-email"),
    db: SupabaseClient = Depends(get_supabase),
):
    """Mark all notifications as read for a user"""
    try:
        # Update all unread notifications for this user
        query = db.table("notifications").update({"is_read": True}).eq("is_read", False)

        if user_email:
            query = query.eq("user_email", user_email)

        response = query.execute()

        count = len(response.data) if response.data else 0

        return {
            "message": f"Marked {count} notifications as read",
            "count": count,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error marking all as read: {str(e)}"
        )


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: SupabaseClient = Depends(get_supabase),
):
    """Delete a notification"""
    try:
        response = (
            db.table("notifications")
            .delete()
            .eq("notification_id", notification_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Notification not found")

        return {"message": "Notification deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error deleting notification: {str(e)}"
        )


@router.delete("/delete-old")
def delete_old_notifications(
    days_old: int = 30,
    user_email: Optional[str] = Header(None, alias="x-user-email"),
    db: SupabaseClient = Depends(get_supabase),
):
    """Delete read notifications older than specified days"""
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)

        query = (
            db.table("notifications")
            .delete()
            .eq("is_read", True)
            .lt("created_at", cutoff_date.isoformat())
        )

        if user_email:
            query = query.eq("user_email", user_email)

        response = query.execute()

        count = len(response.data) if response.data else 0

        return {
            "message": f"Deleted {count} old notifications",
            "count": count,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error deleting old notifications: {str(e)}"
        )


# ======================
# Notification Helper Functions
# ======================


def create_notification_helper(
    db: SupabaseClient,
    title: str,
    message: str,
    notification_type: str,
    user_email: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    action_url: Optional[str] = None,
):
    """Helper function to create a notification (can be called from other routers)"""
    try:
        notification_data = {
            "user_email": user_email,
            "title": title,
            "message": message,
            "notification_type": notification_type,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "action_url": action_url,
            "is_read": False,
            "created_at": datetime.utcnow().isoformat(),
        }

        db.table("notifications").insert(notification_data).execute()
        return True
    except Exception as e:
        print(f"Error creating notification: {str(e)}")
        return False
