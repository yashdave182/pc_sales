from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from models import SaleCreate
from supabase_db import SupabaseClient, get_supabase

router = APIRouter()


def generate_invoice_no(db: SupabaseClient) -> str:
    """Generate a unique invoice number"""
    try:
        # Get the latest invoice number
        response = (
            db.table("sales")
            .select("invoice_no")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

        if response.data and response.data[0].get("invoice_no"):
            last_invoice = response.data[0]["invoice_no"]
            # Extract number from invoice (assuming format INV-XXXXX)
            if last_invoice.startswith("INV-"):
                try:
                    last_num = int(last_invoice.split("-")[1])
                    new_num = last_num + 1
                except:
                    new_num = 1
            else:
                new_num = 1
        else:
            new_num = 1

        return f"INV-{new_num:05d}"
    except:
        # Fallback to timestamp-based invoice
        return f"INV-{int(datetime.now().timestamp())}"


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
                    "total_amount": sale.get("total_amount", 0),
                    "total_liters": sale.get("total_liters", 0),
                    "payment_status": sale.get("payment_status", "Pending"),
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
            total_amount = sale.get("total_amount", 0) or 0
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
                        "payment_status": sale.get("payment_status", "Pending"),
                    }
                )

        return result
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching pending payments: {str(e)}"
        )


@router.post("/")
def create_sale(sale: SaleCreate, db: SupabaseClient = Depends(get_supabase)):
    """Create a new sale with items"""
    try:
        # Validate input
        if not sale.customer_id:
            raise HTTPException(status_code=400, detail="Customer ID is required")

        if not sale.items or len(sale.items) == 0:
            raise HTTPException(status_code=400, detail="At least one item is required")

        # Calculate totals
        total_amount = 0
        total_liters = 0

        # Get products for calculating liters
        products_response = (
            db.table("products").select("product_id, capacity_ltr").execute()
        )
        products_dict = (
            {p["product_id"]: p for p in products_response.data}
            if products_response.data
            else {}
        )

        for item in sale.items:
            if not item.product_id or item.quantity <= 0 or item.rate <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="All items must have valid product_id, quantity, and rate",
                )

            total_amount += item.amount

            # Calculate liters
            product = products_dict.get(item.product_id, {})
            capacity = product.get("capacity_ltr", 0) or 0
            total_liters += capacity * item.quantity

        # Generate invoice number
        invoice_no = generate_invoice_no(db)

        # Create sale record
        sale_data = {
            "invoice_no": invoice_no,
            "customer_id": sale.customer_id,
            "sale_date": sale.sale_date,
            "total_amount": total_amount,
            "total_liters": total_liters,
            "payment_status": "Pending",
            "notes": sale.notes if hasattr(sale, "notes") and sale.notes else None,
        }

        sale_response = db.table("sales").insert(sale_data).execute()

        if not sale_response.data:
            raise HTTPException(status_code=400, detail="Failed to create sale")

        created_sale = sale_response.data[0]
        sale_id = created_sale.get("sale_id")

        # Insert sale items
        sale_items_data = []
        for item in sale.items:
            sale_items_data.append(
                {
                    "sale_id": sale_id,
                    "product_id": item.product_id,
                    "quantity": item.quantity,
                    "rate": item.rate,
                    "amount": item.amount,
                }
            )

        if sale_items_data:
            items_response = db.table("sale_items").insert(sale_items_data).execute()

            if not items_response.data:
                # Rollback sale if items fail (manual cleanup)
                db.table("sales").delete().eq("sale_id", sale_id).execute()
                raise HTTPException(
                    status_code=400, detail="Failed to create sale items"
                )

        return {
            "message": "Sale created successfully",
            "sale": created_sale,
            "items_count": len(sale_items_data),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating sale: {str(e)}")


@router.get("/{sale_id}")
def get_sale(sale_id: int, db: SupabaseClient = Depends(get_supabase)):
    """Get a single sale with items"""
    try:
        # Get sale
        sale_response = db.table("sales").select("*").eq("sale_id", sale_id).execute()

        if not sale_response.data:
            raise HTTPException(status_code=404, detail="Sale not found")

        sale = sale_response.data[0]

        # Get sale items
        items_response = (
            db.table("sale_items").select("*").eq("sale_id", sale_id).execute()
        )

        # Get product details for items
        if items_response.data:
            products_response = (
                db.table("products").select("product_id, product_name").execute()
            )
            products_dict = (
                {p["product_id"]: p for p in products_response.data}
                if products_response.data
                else {}
            )

            for item in items_response.data:
                product = products_dict.get(item.get("product_id"), {})
                item["product_name"] = product.get("product_name")

        return {"sale": sale, "items": items_response.data or []}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sale: {str(e)}")


@router.put("/{sale_id}")
def update_sale(
    sale_id: int, sale_data: dict, db: SupabaseClient = Depends(get_supabase)
):
    """Update a sale"""
    try:
        response = db.table("sales").update(sale_data).eq("sale_id", sale_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Sale not found")

        return {"message": "Sale updated successfully", "sale": response.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating sale: {str(e)}")


@router.delete("/{sale_id}")
def delete_sale(sale_id: int, db: SupabaseClient = Depends(get_supabase)):
    """Delete a sale and its items"""
    try:
        # Delete sale items first
        db.table("sale_items").delete().eq("sale_id", sale_id).execute()

        # Delete sale
        response = db.table("sales").delete().eq("sale_id", sale_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Sale not found")

        return {"message": "Sale deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting sale: {str(e)}")
