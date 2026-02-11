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
    using optimized Database RPC
    """
    try:
        # Default date range (last 30 days)
        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")

        print(f"=== SALES TREND API CALLED (RPC) ===")
        print(f"Interval: {interval}, Start: {start_date}, End: {end_date}")

        # Use Supabase RPC for server-side aggregation
        params = {
            "interval_type": interval,
            "start_date": start_date,
            "end_date": end_date
        }
        
        response = db.rpc("get_sales_trend", params).execute()
        
        if not response.data:
            return {"trends": []}
            
        trends_data = response.data
        
        # Transform for frontend if needed, but RPC returns correct shape
        # structure: period, sales_count, total_amount, total_liters
        
        return {"trends": trends_data}

    except Exception as e:
        print(f"Error in get_sales_trend: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching sales trend: {str(e)}"
        )



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

@router.get("/customers-pdf")
def generate_customers_pdf(
    status: Optional[str] = None,
    user_email: str = Depends(get_user_email),
    db: SupabaseClient = Depends(get_db),
):
    """Generate Customers Report PDF"""
    try:
        query = db.table("customers").select("*").order("name")
        if status:
            query = query.eq("status", status)
            
        response = query.execute()
        customers = response.data or []

        pdf_bytes = report_generator.generate_customer_report_pdf(customers)

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=customers_report_{datetime.now().strftime('%Y%m%d')}.pdf"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")


@router.get("/invoices-pdf")
def generate_invoices_pdf(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_email: str = Depends(get_user_email),
    db: SupabaseClient = Depends(get_db),
):
    """Generate Invoices List PDF (Reuse Sales Report logic for now)"""
    try:
        # Default date range (last 30 days)
        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")

        response = (
            db.table("sales")
            .select("*, customers(name)")
            .gte("sale_date", start_date)
            .lte("sale_date", end_date)
            .order("sale_date", desc=True)
            .execute()
        )
        sales = response.data or []
        
        # Format for report generator
        processed_sales = []
        for sale in sales:
             processed_sales.append({
                "invoice_no": sale.get("invoice_no"),
                "customer_name": sale.get("customers", {}).get("name") if sale.get("customers") else "N/A",
                "sale_date": sale.get("sale_date"),
                "total_amount": sale.get("total_amount"),
                "total_liters": sale.get("total_liters"),
                "payment_status": sale.get("payment_status"),
             })

        pdf_bytes = report_generator.generate_sales_report_pdf(processed_sales, start_date, end_date)

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=invoices_report_{start_date}_{end_date}.pdf"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")


@router.get("/payments-pdf")
def generate_payments_pdf(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_email: str = Depends(get_user_email),
    db: SupabaseClient = Depends(get_db),
):
    """Generate Payments Report PDF"""
    try:
        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")

        response = (
            db.table("payments")
            .select("*, sales(invoice_no)")
            .gte("payment_date", start_date)
            .lte("payment_date", end_date)
            .order("payment_date", desc=True)
            .execute()
        )
        payments = response.data or []
        
        # Enrich data
        for p in payments:
            if p.get("sales"):
                p["invoice_no"] = p["sales"].get("invoice_no")

        pdf_bytes = report_generator.generate_payment_report_pdf(payments, start_date, end_date)

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=payments_report_{start_date}_{end_date}.pdf"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")


@router.get("/calling-list-pdf")
def generate_calling_list_pdf(
    user_email: str = Depends(get_user_email),
    db: SupabaseClient = Depends(get_db),
):
    """Generate Calling List PDF (Master or Assigned)"""
    try:
        # Fetch master calling list from automation logic
        # We need to import the helper function or replicate logic. 
        # Importing from sibling module:
        from routers.automation import get_master_calling_list
        
        master_list = get_master_calling_list(db, inactive_days=30)
        
        # Sort by priority
        master_list.sort(key=lambda x: (0 if x.get("priority") == "High" else 1 if x.get("priority") == "Medium" else 2))

        pdf_bytes = report_generator.generate_calling_list_report_pdf(master_list)

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=calling_list_{datetime.now().strftime('%Y%m%d')}.pdf"
            }
        )
    except Exception as e:
         # Fallback if import fails or other error
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")
