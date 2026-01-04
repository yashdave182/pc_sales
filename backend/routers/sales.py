from fastapi import APIRouter, Depends, HTTPException
from models import SaleCreate
from supabase_db import SupabaseClient, get_supabase

router = APIRouter()


@router.get("/")
def get_sales(db: SupabaseClient = Depends(get_supabase)):
    """Get all sales with customer information"""
    try:
        # Get sales
        sales_response = (
            db.table("sales").select("*").order("created_at", desc=True).execute()
        )

        if not sales_response.data:
            return []

        # Get all customers for joining
        customers_response = (
            db.table("customers").select("customer_id, name, village").execute()
        )
        customers_dict = (
            {c["customer_id"]: c for c in customers_response.data}
            if customers_response.data
            else {}
        )

        # Enrich sales with customer data
        result = []
        for sale in sales_response.data:
            customer_id = sale.get("customer_id")
            customer = customers_dict.get(customer_id, {})

            result.append(
                {
                    "sale_id": sale.get("sale_id"),
                    "invoice_no": sale.get("invoice_no"),
                    "customer_id": customer_id,
                    "sale_date": sale.get("sale_date"),
                    "total_amount": sale.get("total_amount"),
                    "total_liters": sale.get("total_liters"),
                    "payment_status": sale.get("payment_status"),
                    "notes": sale.get("notes"),
                    "created_at": sale.get("created_at"),
                    "customer_name": customer.get("name"),
                    "village": customer.get("village"),
                }
            )

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sales: {str(e)}")


@router.get("/pending-payments")
def sales_with_pending(db: SupabaseClient = Depends(get_supabase)):
    """Get sales with pending payments"""
    try:
        # Get all sales
        sales_response = (
            db.table("sales").select("*").order("sale_date", desc=True).execute()
        )

        if not sales_response.data:
            return []

        # Get all customers
        customers_response = (
            db.table("customers").select("customer_id, name, village").execute()
        )
        customers_dict = (
            {c["customer_id"]: c for c in customers_response.data}
            if customers_response.data
            else {}
        )

        # Get all payments
        payments_response = db.table("payments").select("sale_id, amount").execute()

        # Calculate paid amounts per sale
        paid_by_sale = {}
        if payments_response.data:
            for payment in payments_response.data:
                sale_id = payment.get("sale_id")
                amount = payment.get("amount", 0)
                paid_by_sale[sale_id] = paid_by_sale.get(sale_id, 0) + amount

        # Build result with pending amounts
        result = []
        for sale in sales_response.data:
            sale_id = sale.get("sale_id")
            customer_id = sale.get("customer_id")
            total_amount = sale.get("total_amount", 0)
            paid_amount = paid_by_sale.get(sale_id, 0)
            pending_amount = total_amount - paid_amount

            # Only include sales with pending amounts
            if pending_amount > 0:
                customer = customers_dict.get(customer_id, {})
                result.append(
                    {
                        "sale_id": sale_id,
                        "invoice_no": sale.get("invoice_no"),
                        "sale_date": sale.get("sale_date"),
                        "customer_name": customer.get("name"),
                        "village": customer.get("village"),
                        "total_amount": total_amount,
                        "paid_amount": paid_amount,
                        "pending_amount": pending_amount,
                        "payment_status": sale.get("payment_status"),
                    }
                )

        return result
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching pending payments: {str(e)}"
        )


@router.post("/")
def create_sale(sale: SaleCreate, db: SupabaseClient = Depends(get_supabase)):
    """Create a new sale"""
    try:
        sale_data = {
            "customer_id": sale.customer_id,
            "sale_date": sale.sale_date,
            "total_amount": 0,
            "total_liters": 0,
            "payment_status": "Pending",
            "notes": sale.notes if hasattr(sale, "notes") else None,
        }

        response = db.table("sales").insert(sale_data).execute()

        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create sale")

        return {"message": "Sale created", "sale": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating sale: {str(e)}")
