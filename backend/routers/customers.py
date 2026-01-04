import requests
from fastapi import APIRouter, Depends, HTTPException
from models import Customer
from supabase_db import SupabaseClient, get_db

router = APIRouter()


@router.get("/")
def get_customers(db: SupabaseClient = Depends(get_db)):
    """Get all customers"""
    try:
        response = (
            db.table("customers").select("*").order("created_at", desc=True).execute()
        )
        return {"data": response.data, "total": len(response.data)}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching customers: {str(e)}"
        )


@router.get("/{customer_id}")
def get_customer(customer_id: int, db: SupabaseClient = Depends(get_db)):
    """Get a single customer by ID"""
    try:
        response = (
            db.table("customers").select("*").eq("customer_id", customer_id).execute()
        )

        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Customer not found")

        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching customer: {str(e)}"
        )


@router.post("/")
def create_customer(customer: Customer, db: SupabaseClient = Depends(get_db)):
    """Create a new customer"""
    try:
        customer_data = {
            "name": customer.name,
            "mobile": customer.mobile,
            "village": customer.village,
            "taluka": customer.taluka,
            "district": customer.district,
            "status": customer.status,
        }

        # Add customer_code if provided
        if customer.customer_code:
            customer_data["customer_code"] = customer.customer_code

        response = db.table("customers").insert(customer_data).execute()

        if response.data and len(response.data) > 0:
            return {"message": "Customer created", "data": response.data[0]}
        else:
            return {"message": "Customer created"}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error creating customer: {str(e)}"
        )


@router.put("/{customer_id}")
def update_customer(
    customer_id: int, customer: Customer, db: SupabaseClient = Depends(get_db)
):
    """Update an existing customer"""
    try:
        customer_data = {
            "name": customer.name,
            "mobile": customer.mobile,
            "village": customer.village,
            "taluka": customer.taluka,
            "district": customer.district,
            "status": customer.status,
        }

        # Add customer_code if provided
        if customer.customer_code:
            customer_data["customer_code"] = customer.customer_code

        response = (
            db.table("customers")
            .update(customer_data)
            .eq("customer_id", customer_id)
            .execute()
        )

        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Customer not found")

        return {"message": "Customer updated", "data": response.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error updating customer: {str(e)}"
        )


@router.delete("/{customer_id}")
def delete_customer(customer_id: int, db: SupabaseClient = Depends(get_db)):
    """Delete a customer"""
    try:
        # First check if customer exists
        check_response = (
            db.table("customers")
            .select("customer_id")
            .eq("customer_id", customer_id)
            .execute()
        )

        if not check_response.data or len(check_response.data) == 0:
            raise HTTPException(status_code=404, detail="Customer not found")

        # Check for related sales
        sales_check = (
            db.table("sales")
            .select("sale_id")
            .eq("customer_id", customer_id)
            .limit(1)
            .execute()
        )

        if sales_check.data and len(sales_check.data) > 0:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete customer with existing sales records. Please delete related sales first.",
            )

        # Check for related demos
        demos_check = (
            db.table("demos")
            .select("demo_id")
            .eq("customer_id", customer_id)
            .limit(1)
            .execute()
        )

        if demos_check.data and len(demos_check.data) > 0:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete customer with existing demo records. Please delete related demos first.",
            )

        # If no related records, proceed with deletion
        response = (
            db.table("customers").delete().eq("customer_id", customer_id).execute()
        )

        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Customer not found")

        return {"message": "Customer deleted successfully"}
    except requests.HTTPError as e:
        detail = str(e)
        raise HTTPException(status_code=400, detail=f"Supabase error: {detail}")
    except HTTPException:
        raise
    except Exception as e:
        # Log the actual error for debugging
        print(f"Error deleting customer {customer_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error deleting customer: {str(e)}"
        )
