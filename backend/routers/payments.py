from fastapi import APIRouter, Depends, HTTPException
from models import Payment
from supabase_db import SupabaseClient, get_supabase

router = APIRouter()


@router.get("/")
def get_payments(db: SupabaseClient = Depends(get_supabase)):
    """Get all payments with related sale and customer information"""
    try:
        # Get all payments
        payments_response = (
            db.table("payments").select("*").order("created_at", desc=True).execute()
        )

        if not payments_response.data:
            return []

        # Get all sales
        sales_response = (
            db.table("sales").select("sale_id, invoice_no, customer_id").execute()
        )
        sales_dict = (
            {s["sale_id"]: s for s in sales_response.data}
            if sales_response.data
            else {}
        )

        # Get all customers
        customers_response = db.table("customers").select("customer_id, name").execute()
        customers_dict = (
            {c["customer_id"]: c for c in customers_response.data}
            if customers_response.data
            else {}
        )

        # Build result with joined data
        result = []
        for payment in payments_response.data:
            sale_id = payment.get("sale_id")
            sale = sales_dict.get(sale_id, {})
            customer_id = sale.get("customer_id")
            customer = customers_dict.get(customer_id, {})

            result.append(
                {
                    "payment_id": payment.get("payment_id"),
                    "sale_id": sale_id,
                    "invoice_no": sale.get("invoice_no"),
                    "customer_id": customer_id,
                    "customer_name": customer.get("name"),
                    "payment_date": payment.get("payment_date"),
                    "payment_method": payment.get("payment_method"),
                    "amount": payment.get("amount"),
                    "rrn": payment.get("rrn"),
                    "reference": payment.get("reference"),
                    "notes": payment.get("notes"),
                    "created_at": payment.get("created_at"),
                }
            )

        return result
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching payments: {str(e)}"
        )


@router.get("/pending")
def get_pending(db: SupabaseClient = Depends(get_supabase)):
    """Get sales with pending payments"""
    try:
        # Get all sales
        sales_response = db.table("sales").select("*").execute()

        if not sales_response.data:
            return []

        # Get all customers
        customers_response = (
            db.table("customers").select("customer_id, name, mobile").execute()
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
            total_amount = sale.get("total_amount", 0) or 0
            paid_amount = paid_by_sale.get(sale_id, 0)
            pending_amount = total_amount - paid_amount

            # Only include sales with pending amounts
            if pending_amount > 0:
                customer = customers_dict.get(customer_id, {})
                result.append(
                    {
                        "invoice_no": sale.get("invoice_no"),
                        "customer_name": customer.get("name"),
                        "mobile": customer.get("mobile"),
                        "date": sale.get("sale_date"),
                        "amount": total_amount,
                        "paid": paid_amount,
                        "pending": pending_amount,
                    }
                )

        # Sort by pending amount descending
        result.sort(key=lambda x: x["pending"], reverse=True)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching pending payments: {str(e)}"
        )


@router.get("/sale/{sale_id}")
def get_payment_history(sale_id: int, db: SupabaseClient = Depends(get_supabase)):
    """Get payment history for a specific sale"""
    try:
        response = (
            db.table("payments")
            .select("*")
            .eq("sale_id", sale_id)
            .order("created_at", desc=True)
            .execute()
        )

        if not response.data:
            return []

        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching payment history: {str(e)}"
        )


@router.post("/")
def create_payment(payment: Payment, db: SupabaseClient = Depends(get_supabase)):
    """Create a new payment"""
    try:
        payment_data = {
            "sale_id": payment.sale_id,
            "payment_date": payment.payment_date,
            "payment_method": payment.payment_method,
            "amount": payment.amount,
            "rrn": payment.rrn if hasattr(payment, "rrn") else None,
            "reference": payment.reference if hasattr(payment, "reference") else None,
            "notes": payment.notes if hasattr(payment, "notes") else None,
        }

        response = db.table("payments").insert(payment_data).execute()

        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create payment")

        return {"message": "Payment added", "payment": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating payment: {str(e)}")
