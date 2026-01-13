"""
Reports Router
Handles report generation for sales trends, payments, and PDFs
"""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Response
from fastapi.responses import StreamingResponse
from supabase_db import SupabaseClient, get_db
from reports import ReportGenerator
import io

router = APIRouter()
report_generator = ReportGenerator("Sales Management System")


def get_user_email(user_email: Optional[str] = Header(None, alias="x-user-email")):
    """Get user email from header"""
    if not user_email:
        raise HTTPException(status_code=401, detail="User email not provided")
    return user_email


@router.get("/sales-trend")
def get_sales_trend(
    interval: str = "daily",  # daily, weekly, monthly
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_email: str = Depends(get_user_email),
    db: SupabaseClient = Depends(get_db),
):
    """
    Get sales trend analysis by interval (daily, weekly, monthly)
    """
    try:
        # Default date range (last 30 days)
        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")

        # Fetch sales data
        response = (
            db.table("sales")
            .select("*, customers(name)")
            .gte("sale_date", start_date)
            .lte("sale_date", end_date)
            .order("sale_date", desc=False)
            .execute()
        )

        sales_data = response.data or []

        # Group sales by interval
        trends = {}
        
        for sale in sales_data:
            sale_date = datetime.strptime(sale["sale_date"], "%Y-%m-%d")
            
            # Determine the key based on interval
            if interval == "daily":
                key = sale_date.strftime("%Y-%m-%d")
            elif interval == "weekly":
                # Get week number and year
                key = f"{sale_date.strftime('%Y')}-W{sale_date.strftime('%W')}"
            elif interval == "monthly":
                key = sale_date.strftime("%Y-%m")
            else:
                raise HTTPException(status_code=400, detail="Invalid interval. Use daily, weekly, or monthly")

            if key not in trends:
                trends[key] = {
                    "period": key,
                    "sales_count": 0,
                    "total_amount": 0,
                    "total_liters": 0,
                    "sales": []
                }

            trends[key]["sales_count"] += 1
            trends[key]["total_amount"] += sale.get("total_amount", 0)
            trends[key]["total_liters"] += sale.get("total_liters", 0)
            trends[key]["sales"].append({
                "invoice_no": sale.get("invoice_no"),
                "customer_name": sale.get("customers", {}).get("name") if sale.get("customers") else None,
                "amount": sale.get("total_amount", 0),
                "date": sale.get("sale_date")
            })

        # Convert to list and sort
        trend_list = sorted(trends.values(), key=lambda x: x["period"])

        # Calculate summary statistics
        total_sales = sum(t["sales_count"] for t in trend_list)
        total_revenue = sum(t["total_amount"] for t in trend_list)
        total_liters = sum(t["total_liters"] for t in trend_list)
        
        avg_sales_per_period = total_sales / len(trend_list) if trend_list else 0
        avg_revenue_per_period = total_revenue / len(trend_list) if trend_list else 0

        return {
            "interval": interval,
            "start_date": start_date,
            "end_date": end_date,
            "summary": {
                "total_sales": total_sales,
                "total_revenue": total_revenue,
                "total_liters": total_liters,
                "periods_count": len(trend_list),
                "avg_sales_per_period": round(avg_sales_per_period, 2),
                "avg_revenue_per_period": round(avg_revenue_per_period, 2),
            },
            "trends": trend_list,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error generating sales trend: {str(e)}"
        )


@router.get("/payment-trend")
def get_payment_trend(
    interval: str = "daily",  # daily, weekly, monthly
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_email: str = Depends(get_user_email),
    db: SupabaseClient = Depends(get_db),
):
    """
    Get payment records analysis by interval (daily, weekly, monthly)
    """
    try:
        # Default date range (last 30 days)
        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")

        # Fetch payment data with sales info
        response = (
            db.table("payments")
            .select("*, sales(invoice_no, customers(name))")
            .gte("payment_date", start_date)
            .lte("payment_date", end_date)
            .order("payment_date", desc=False)
            .execute()
        )

        payments_data = response.data or []

        # Group payments by interval
        trends = {}
        payment_methods = {}
        
        for payment in payments_data:
            payment_date = datetime.strptime(payment["payment_date"], "%Y-%m-%d")
            
            # Determine the key based on interval
            if interval == "daily":
                key = payment_date.strftime("%Y-%m-%d")
            elif interval == "weekly":
                key = f"{payment_date.strftime('%Y')}-W{payment_date.strftime('%W')}"
            elif interval == "monthly":
                key = payment_date.strftime("%Y-%m")
            else:
                raise HTTPException(status_code=400, detail="Invalid interval. Use daily, weekly, or monthly")

            if key not in trends:
                trends[key] = {
                    "period": key,
                    "payment_count": 0,
                    "total_amount": 0,
                    "payment_methods": {},
                    "payments": []
                }

            trends[key]["payment_count"] += 1
            trends[key]["total_amount"] += payment.get("amount", 0)
            
            # Track payment methods
            method = payment.get("payment_method", "Unknown")
            trends[key]["payment_methods"][method] = trends[key]["payment_methods"].get(method, 0) + 1
            
            # Overall payment method tracking
            payment_methods[method] = payment_methods.get(method, {"count": 0, "amount": 0})
            payment_methods[method]["count"] += 1
            payment_methods[method]["amount"] += payment.get("amount", 0)

            trends[key]["payments"].append({
                "payment_id": payment.get("payment_id"),
                "invoice_no": payment.get("sales", {}).get("invoice_no") if payment.get("sales") else None,
                "customer_name": payment.get("sales", {}).get("customers", {}).get("name") if payment.get("sales") and payment.get("sales").get("customers") else None,
                "amount": payment.get("amount", 0),
                "method": method,
                "date": payment.get("payment_date")
            })

        # Convert to list and sort
        trend_list = sorted(trends.values(), key=lambda x: x["period"])

        # Calculate summary statistics
        total_payments = sum(t["payment_count"] for t in trend_list)
        total_amount = sum(t["total_amount"] for t in trend_list)
        
        avg_payments_per_period = total_payments / len(trend_list) if trend_list else 0
        avg_amount_per_period = total_amount / len(trend_list) if trend_list else 0

        return {
            "interval": interval,
            "start_date": start_date,
            "end_date": end_date,
            "summary": {
                "total_payments": total_payments,
                "total_amount": total_amount,
                "periods_count": len(trend_list),
                "avg_payments_per_period": round(avg_payments_per_period, 2),
                "avg_amount_per_period": round(avg_amount_per_period, 2),
                "payment_methods": payment_methods,
            },
            "trends": trend_list,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error generating payment trend: {str(e)}"
        )


@router.get("/sales-order-summary-pdf")
def generate_sales_order_summary_pdf(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_email: str = Depends(get_user_email),
    db: SupabaseClient = Depends(get_db),
):
    """
    Generate a PDF report of sales order summary
    """
    try:
        # Default date range (last 30 days)
        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")

        # Fetch sales data with customer and payment info
        response = (
            db.table("sales")
            .select("*, customers(name, mobile, village), payments(amount)")
            .gte("sale_date", start_date)
            .lte("sale_date", end_date)
            .order("sale_date", desc=True)
            .execute()
        )

        sales_data = response.data or []

        # Prepare data for PDF
        processed_sales = []
        for sale in sales_data:
            customer = sale.get("customers", {})
            payments = sale.get("payments", [])
            total_paid = sum(p.get("amount", 0) for p in payments)
            
            processed_sales.append({
                "invoice_no": sale.get("invoice_no", "N/A"),
                "customer_name": customer.get("name", "N/A") if customer else "N/A",
                "customer_mobile": customer.get("mobile", "N/A") if customer else "N/A",
                "customer_village": customer.get("village", "N/A") if customer else "N/A",
                "sale_date": sale.get("sale_date", "N/A"),
                "total_amount": sale.get("total_amount", 0),
                "total_liters": sale.get("total_liters", 0),
                "payment_status": sale.get("payment_status", "Unknown"),
                "total_paid": total_paid,
                "balance": sale.get("total_amount", 0) - total_paid,
                "notes": sale.get("notes", ""),
            })

        # Generate PDF
        pdf_bytes = report_generator.generate_sales_report_pdf(
            processed_sales, start_date, end_date
        )

        # Return as streaming response
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=sales_order_summary_{start_date}_to_{end_date}.pdf"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error generating PDF: {str(e)}"
        )


@router.get("/sales-summary")
def sales_summary(
    user_email: str = Depends(get_user_email),
    db: SupabaseClient = Depends(get_db)
):
    """Get overall sales summary"""
    try:
        response = db.table("sales").select("*").execute()
        sales_data = response.data or []
        
        total_sales = len(sales_data)
        total_amount = sum(sale.get("total_amount", 0) for sale in sales_data)
        total_liters = sum(sale.get("total_liters", 0) for sale in sales_data)
        
        return {
            "total_sales": total_sales,
            "total_amount": total_amount,
            "total_liters": total_liters,
            "average_sale": total_amount / total_sales if total_sales > 0 else 0,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching sales summary: {str(e)}"
        )
