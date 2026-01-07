from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from supabase_db import SupabaseClient, get_supabase

router = APIRouter()


# ======================
# Dashboard Metrics
# ======================
@router.get("/metrics")
def dashboard_metrics(db: SupabaseClient = Depends(get_supabase)):
    """Get dashboard metrics"""
    try:
        print("Fetching dashboard metrics...")
        # Get all sales with their IDs for accurate calculation
        sales_response = db.table("sales").select("sale_id, total_amount").execute()
        total_sales = 0.0
        sales_by_id = {}

        if sales_response.data:
            for sale in sales_response.data:
                sale_id = sale.get("sale_id")
                amount = float(sale.get("total_amount", 0) or 0)
                total_sales += amount
                sales_by_id[sale_id] = amount

        # Get all payments grouped by sale_id
        payments_response = db.table("payments").select("sale_id, amount").execute()
        total_payments = 0.0
        paid_by_sale = {}

        if payments_response.data:
            for payment in payments_response.data:
                sale_id = payment.get("sale_id")
                amount = float(payment.get("amount", 0) or 0)
                total_payments += amount
                if sale_id:
                    paid_by_sale[sale_id] = paid_by_sale.get(sale_id, 0.0) + amount

        # Calculate actual pending amount (only from sales that have pending balance)
        pending_amount = 0.0
        for sale_id, sale_total in sales_by_id.items():
            paid = paid_by_sale.get(sale_id, 0.0)
            pending = sale_total - paid
            if pending > 0:  # Only count positive pending amounts
                pending_amount += pending

        # Get total customers count
        customers_response = db.table("customers").select("customer_id").execute()
        total_customers = len(customers_response.data) if customers_response.data else 0

        # Get total transactions count
        total_transactions = len(sales_response.data) if sales_response.data else 0

        # Get demo conversion rate
        demos_response = db.table("demos").select("conversion_status").execute()
        if demos_response.data:
            converted = sum(
                1
                for d in demos_response.data
                if d.get("conversion_status", "").lower()
                in ["converted", "won", "purchase"]
            )
            total_demos = len(demos_response.data)
            demo_conversion_rate = (
                round((converted / total_demos) * 100, 2) if total_demos > 0 else 0.0
            )
        else:
            demo_conversion_rate = 0.0

        metrics_result = {
            "total_sales": round(total_sales, 2),
            "total_payments": round(total_payments, 2),
            "pending_amount": round(max(0, pending_amount), 2),  # Ensure non-negative
            "total_customers": total_customers,
            "total_transactions": total_transactions,
            "demo_conversion_rate": demo_conversion_rate,
        }

        print(
            f"Dashboard metrics calculated: total_sales={metrics_result['total_sales']}, "
            f"total_payments={metrics_result['total_payments']}, "
            f"pending_amount={metrics_result['pending_amount']}"
        )

        return metrics_result
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching dashboard metrics: {str(e)}"
        )


# ======================
# Sales Trend
# ======================
@router.get("/sales-trend")
def sales_trend(days: int = 30, db: SupabaseClient = Depends(get_supabase)):
    """Get sales trend for the last N days"""
    try:
        # Calculate date threshold
        date_threshold = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

        # Get sales after threshold
        response = (
            db.table("sales")
            .select("sale_date, total_amount")
            .gte("sale_date", date_threshold)
            .execute()
        )

        if not response.data:
            return []

        # Group by date and sum amounts
        trend_dict = {}
        for sale in response.data:
            sale_date = sale.get("sale_date")
            total_amount = sale.get("total_amount", 0) or 0

            if sale_date:
                if sale_date not in trend_dict:
                    trend_dict[sale_date] = 0
                trend_dict[sale_date] += total_amount

        # Convert to list and sort
        result = [
            {"sale_date": date, "total_amount": amount}
            for date, amount in trend_dict.items()
        ]
        result.sort(key=lambda x: x["sale_date"])

        return result
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching sales trend: {str(e)}"
        )


# ======================
# Recent Sales
# ======================
@router.get("/recent-sales")
def recent_sales(limit: int = 10, db: SupabaseClient = Depends(get_supabase)):
    """Get recent sales with customer information"""
    try:
        # Get recent sales
        sales_response = (
            db.table("sales")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )

        if not sales_response.data:
            return []

        # Get customers for joining
        customers_response = (
            db.table("customers").select("customer_id, name, village").execute()
        )
        customers_dict = (
            {c["customer_id"]: c for c in customers_response.data}
            if customers_response.data
            else {}
        )

        # Build result with customer data
        result = []
        for sale in sales_response.data:
            customer_id = sale.get("customer_id")
            customer = customers_dict.get(customer_id, {})

            result.append(
                {
                    "invoice_no": sale.get("invoice_no"),
                    "customer_name": customer.get("name"),
                    "village": customer.get("village"),
                    "total_amount": sale.get("total_amount"),
                    "sale_date": sale.get("sale_date"),
                    "payment_status": sale.get("payment_status"),
                }
            )

        return result
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching recent sales: {str(e)}"
        )


# ======================
# Upcoming Demos
# ======================
@router.get("/upcoming-demos")
def upcoming_demos(limit: int = 10, db: SupabaseClient = Depends(get_supabase)):
    """Get upcoming scheduled demos"""
    try:
        # Get current date
        today = datetime.now().strftime("%Y-%m-%d")

        # Get upcoming demos
        demos_response = (
            db.table("demos")
            .select("*")
            .gte("demo_date", today)
            .eq("conversion_status", "Scheduled")
            .order("demo_date")
            .order("demo_time")
            .limit(limit)
            .execute()
        )

        if not demos_response.data:
            return []

        # Get related data
        customers_response = (
            db.table("customers").select("customer_id, name, village").execute()
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

        # Build result
        result = []
        for demo in demos_response.data:
            customer_id = demo.get("customer_id")
            product_id = demo.get("product_id")

            customer = customers_dict.get(customer_id, {})
            product = products_dict.get(product_id, {})

            result.append(
                {
                    "demo_id": demo.get("demo_id"),
                    "customer_name": customer.get("name"),
                    "village": customer.get("village"),
                    "product_name": product.get("product_name"),
                    "demo_date": demo.get("demo_date"),
                    "demo_time": demo.get("demo_time"),
                    "conversion_status": demo.get("conversion_status"),
                }
            )

        return result
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching upcoming demos: {str(e)}"
        )
