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
    """Get dashboard metrics using optimized RPC"""
    try:
        response = db.rpc("get_dashboard_metrics", {}).execute()
        
        if not response.data:
            return {
                "total_sales": 0,
                "total_transactions": 0,
                "pending_amount": 0,
                "total_customers": 0,
                "active_customers": 0,
                "demo_conversion_rate": 0,
                "payment_method_distribution": {}
            }
            
        return response.data
    except Exception as e:
        print(f"Error in dashboard_metrics: {e}")
        # Fallback to empty if RPC fails (e.g. not created yet)
        raise HTTPException(
            status_code=500, detail=f"Error fetching metrics: {str(e)}"
        )


@router.get("/collected-payments")
def get_collected_payments(
    start_date: str, 
    end_date: str, 
    db: SupabaseClient = Depends(get_supabase)
):
    """Get total collected payments for a date range (Python Aggregation)"""
    try:
        # Parse dates
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

        # Fetch ALL payments (safer for text date filtering)
        response = db.table("payments").select("payment_date, amount").execute()
        
        payments = response.data or []
        total_amount = 0
        
        for p in payments:
            p_date_str = p.get("payment_date")
            if not p_date_str:
                continue
                
            try:
                p_date = datetime.strptime(p_date_str, "%Y-%m-%d")
                if start_dt <= p_date <= end_dt:
                    total_amount += p.get("amount", 0)
            except ValueError:
                continue
        
        return {"total_amount": total_amount}
    except Exception as e:
        print(f"Error fetching collected payments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ======================
# Sales Trend
# ======================
@router.get("/sales-trend")
def sales_trend(days: int = 30, db: SupabaseClient = Depends(get_supabase)):
    """Get sales trend for the last N days"""
    try:
        # Calculate date threshold
        today = datetime.now()
        cutoff_date = today - timedelta(days=days)

        # Get ALL sales (safer for text date filtering)
        response = (
            db.table("sales")
            .select("sale_date, total_amount")
            .execute()
        )

        if not response.data:
            return []

        # Group by date and sum amounts
        trend_dict = {}
        for sale in response.data:
            s_date_str = sale.get("sale_date")
            if not s_date_str: continue

            try:
                sale_date = datetime.strptime(s_date_str, "%Y-%m-%d")
                # Filter by date range in Python
                if sale_date.date() >= cutoff_date.date() and sale_date.date() <= today.date():
                    date_key = s_date_str
                    if date_key not in trend_dict:
                        trend_dict[date_key] = 0
                    trend_dict[date_key] += sale.get("total_amount", 0) or 0
            except ValueError:
                continue

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
