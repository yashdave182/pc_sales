from typing import Optional

import requests
from fastapi import APIRouter, Depends, HTTPException
from models import Demo
from supabase_db import SupabaseClient, get_supabase

router = APIRouter()


# ======================
# Get all demos
# ======================
@router.get("/")
def get_demos(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: SupabaseClient = Depends(get_supabase),
):
    """Get all demos with related customer, product, and distributor information"""
    try:
        # Build query
        query = (
            db.table("demos")
            .select("*")
            .order("demo_date", desc=True)
            .order("demo_time", desc=True)
        )

        # Filter by status if provided
        if status:
            query = query.eq("conversion_status", status)

        # Apply pagination
        query = query.limit(limit).offset(skip)

        demos_response = query.execute()

        if not demos_response.data:
            return []

        # Get related data
        customers_response = (
            db.table("customers").select("customer_id, name, mobile, village").execute()
        )
        customers_dict = (
            {c["customer_id"]: c for c in customers_response.data}
            if customers_response.data
            else {}
        )

        products_response = (
            db.table("products").select("product_id, product_name").execute()
        )
        products_dict = (
            {p["product_id"]: p for p in products_response.data}
            if products_response.data
            else {}
        )

        distributors_response = (
            db.table("distributors").select("distributor_id, name").execute()
        )

        distributors_dict = (
            {d["distributor_id"]: d for d in distributors_response.data}
            if distributors_response.data
            else {}
        )

        # Enrich demos with related data
        result = []
        for demo in demos_response.data:
            customer_id = demo.get("customer_id")
            product_id = demo.get("product_id")
            distributor_id = demo.get("distributor_id")

            # Get customer, product, and distributor from dictionaries
            customer = customers_dict.get(customer_id, {})
            product = products_dict.get(product_id, {})
            distributor = distributors_dict.get(distributor_id, {})

            result.append(
                {
                    **demo,
                    "customer_name": customer.get("name"),
                    "customer_mobile": customer.get("mobile"),
                    "village": customer.get("village"),
                    "product_name": product.get("product_name"),
                    "distributor_name": distributor.get("name"),
                }
            )

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching demos: {str(e)}")


# ======================
# Get single demo
# ======================
@router.get("/{demo_id}")
def get_demo(demo_id: int, db: SupabaseClient = Depends(get_supabase)):
    """Get a single demo by ID"""
    try:
        response = db.table("demos").select("*").eq("demo_id", demo_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Demo not found")

        demo = response.data[0]

        # Get related data
        customer_id = demo.get("customer_id")
        product_id = demo.get("product_id")
        distributor_id = demo.get("distributor_id")

        if customer_id:
            customer_response = (
                db.table("customers")
                .select("*")
                .eq("customer_id", customer_id)
                .execute()
            )
            if customer_response.data:
                demo["customer"] = customer_response.data[0]

        if product_id:
            product_response = (
                db.table("products").select("*").eq("product_id", product_id).execute()
            )
            if product_response.data:
                demo["product"] = product_response.data[0]

        if distributor_id:
            distributor_response = (
                db.table("distributors")
                .select("*")
                .eq("distributor_id", distributor_id)
                .execute()
            )
            if distributor_response.data:
                demo["distributor"] = distributor_response.data[0]

        return demo
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching demo: {str(e)}")


# ======================
# Create demo
# ======================
@router.post("/")
def create_demo(demo: Demo, db: SupabaseClient = Depends(get_supabase)):
    """Create a new demo"""
    try:
        # Validate required fields
        if not demo.customer_id:
            raise HTTPException(status_code=400, detail="Customer ID is required")

        if not demo.product_id:
            raise HTTPException(status_code=400, detail="Product ID is required")

        if not demo.demo_date:
            raise HTTPException(status_code=400, detail="Demo date is required")

        if not demo.demo_time:
            raise HTTPException(status_code=400, detail="Demo time is required")

        demo_data = {
            "customer_id": demo.customer_id,
            "distributor_id": demo.distributor_id
            if hasattr(demo, "distributor_id") and demo.distributor_id
            else None,
            "demo_date": demo.demo_date,
            "demo_time": demo.demo_time,
            "product_id": demo.product_id,
            "quantity_provided": demo.quantity_provided
            if hasattr(demo, "quantity_provided") and demo.quantity_provided
            else 1,
            "follow_up_date": demo.follow_up_date
            if hasattr(demo, "follow_up_date") and demo.follow_up_date
            else None,
            "conversion_status": demo.conversion_status
            if hasattr(demo, "conversion_status") and demo.conversion_status
            else "Scheduled",
            "notes": demo.notes if hasattr(demo, "notes") and demo.notes else None,
            "demo_location": demo.demo_location
            if hasattr(demo, "demo_location") and demo.demo_location
            else None,
        }

        response = db.table("demos").insert(demo_data).execute()

        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create demo")

        return {"message": "Demo scheduled successfully", "demo": response.data[0]}

    except requests.HTTPError as e:
        detail = str(e)
        raise HTTPException(status_code=400, detail=f"Supabase error: {detail}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating demo: {str(e)}")


# ======================
# Update demo
# ======================
@router.put("/{demo_id}")
def update_demo(
    demo_id: int,
    demo_data: dict,
    db: SupabaseClient = Depends(get_supabase),
):
    """Update a demo"""
    try:
        response = db.table("demos").update(demo_data).eq("demo_id", demo_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Demo not found")

        return {"message": "Demo updated successfully", "demo": response.data[0]}

    except requests.HTTPError as e:
        detail = str(e)
        raise HTTPException(status_code=400, detail=f"Supabase error: {detail}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating demo: {str(e)}")


# ======================
# Update demo status
# ======================
@router.put("/{demo_id}/status")
def update_demo_status(
    demo_id: int,
    conversion_status: str,
    notes: Optional[str] = None,
    db: SupabaseClient = Depends(get_supabase),
):
    """Update demo conversion status"""
    try:
        update_data = {"conversion_status": conversion_status}
        if notes is not None:
            update_data["notes"] = notes

        response = (
            db.table("demos").update(update_data).eq("demo_id", demo_id).execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Demo not found")

        return {"message": "Demo updated successfully", "demo": response.data[0]}

    except requests.HTTPError as e:
        detail = str(e)
        raise HTTPException(status_code=400, detail=f"Supabase error: {detail}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating demo: {str(e)}")


# ======================
# Delete demo
# ======================
@router.delete("/{demo_id}")
def delete_demo(demo_id: int, db: SupabaseClient = Depends(get_supabase)):
    """Delete a demo"""

    try:
        response = db.table("demos").delete().eq("demo_id", demo_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Demo not found")

        return {"message": "Demo deleted successfully"}

    except requests.HTTPError as e:
        detail = str(e)
        raise HTTPException(status_code=400, detail=f"Supabase error: {detail}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting demo: {str(e)}")
