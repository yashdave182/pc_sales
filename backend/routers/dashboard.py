from datetime import datetime, timedelta
import json
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
        sales_response = db.table("sales").select("sale_id, total_amount, sale_date, payment_terms").execute()
        total_sales = 0.0
        sales_data_map = {}

        if sales_response.data:
            for sale in sales_response.data:
                sale_id = sale.get("sale_id")
                amount = float(sale.get("total_amount", 0) or 0)
                total_sales += amount
                sales_data_map[sale_id] = {
                    "amount": amount,
                    "date": sale.get("sale_date"),
                    "terms": sale.get("payment_terms")
                }

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

        # Calculate actual pending amount (only from sales that have strict pending balance)
        pending_amount = 0.0
        today = datetime.now().date()
        
        for sale_id, sale_data in sales_data_map.items():
            paid = paid_by_sale.get(sale_id, 0.0)
            total = sale_data["amount"]
            pending = total - paid
            
            if pending > 0:
                # Check if strictly due based on payment terms
                is_due = True
                terms_json = sale_data["terms"]
                
                if terms_json:
                    try:
                        terms = json.loads(terms_json)
                        sale_date_str = sale_data["date"]
                        if sale_date_str:
                             sale_date = datetime.strptime(sale_date_str, "%Y-%m-%d").date()
                             terms_type = terms.get("type")
                             
                             if terms_type == "after_days":
                                 days = int(terms.get("days", 0))
                                 due_date = sale_date + timedelta(days=days)
                                 if today < due_date: 
                                     is_due = False
                                     
                             elif terms_type == "emi":
                                 strict_due = 0
                                 parts = terms.get("emiParts", [])
                                 for part in parts:
                                     days = int(part.get("days", 0))
                                     pct = float(part.get("percentage", 0))
                                     if today >= sale_date + timedelta(days=days):
                                         strict_due += (total * pct / 100)
                                 
                                 # If paid matches what's strictly due so far, don't count as pending
                                 if paid >= strict_due:
                                     is_due = False
                    except Exception as e:
                        print(f"Error parsing terms in metrics for sale {sale_id}: {e}")
                
                if is_due:
                    pending_amount += pending

        # Get total customers count
        customers_response = db.table("customers").select("customer_id").execute()
        total_customers = len(customers_response.data) if customers_response.data else 0

        # Get total transactions count
        total_transactions = len(sales_response.data) if sales_response.data else 0

        # Get demo conversion rate (dynamic calculation based on actual conversions)
        demos_response = db.table("demos").select("conversion_status").execute()

        demo_conversion_rate = 0.0
        converted_count = 0
        total_demos = 0

        if demos_response.data:
            total_demos = len(demos_response.data)

            # Count converted demos (case-insensitive)
            for demo in demos_response.data:
                status = demo.get("conversion_status", "").lower()
                if status in ["converted", "won", "purchase", "completed", "sold"]:
                    converted_count += 1

            # Calculate percentage
            if total_demos > 0:
                demo_conversion_rate = round((converted_count / total_demos) * 100, 2)

        print(
            f"Demo conversion: {converted_count}/{total_demos} = {demo_conversion_rate}%"
        )

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
