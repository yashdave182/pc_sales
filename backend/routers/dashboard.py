import sqlite3

from database import get_db
from fastapi import APIRouter, Depends

router = APIRouter()


# ======================
# Dashboard Metrics
# ======================
@router.get("/metrics")
def dashboard_metrics(conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()

    cursor.execute("SELECT COALESCE(SUM(total_amount),0) FROM sales")
    total_sales = cursor.fetchone()[0]

    cursor.execute("SELECT COALESCE(SUM(amount),0) FROM payments")
    total_payments = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM customers")
    total_customers = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM sales")
    total_transactions = cursor.fetchone()[0]

    pending_amount = total_sales - total_payments

    cursor.execute("""
        SELECT
          SUM(CASE WHEN LOWER(conversion_status) IN ('converted','won','purchase') THEN 1 ELSE 0 END),
          COUNT(*)
        FROM demos
        WHERE conversion_status IS NOT NULL
    """)
    row = cursor.fetchone()
    converted = int(row[0] or 0)
    total_demos = int(row[1] or 0)
    demo_conversion_rate = (
        round((converted / total_demos) * 100, 2) if total_demos > 0 else 0.0
    )

    return {
        "total_sales": total_sales,
        "total_payments": total_payments,
        "pending_amount": pending_amount,
        "total_customers": total_customers,
        "total_transactions": total_transactions,
        "demo_conversion_rate": demo_conversion_rate,
    }


# ======================
# Sales Trend
# ======================
@router.get("/sales-trend")
def sales_trend(days: int = 30, conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT sale_date, SUM(total_amount) AS total_amount
        FROM sales
        WHERE sale_date >= date('now', ?)
        GROUP BY sale_date
        ORDER BY sale_date
        """,
        (f"-{days} days",),
    )
    return [dict(row) for row in cursor.fetchall()]


# ======================
# Recent Sales
# ======================
@router.get("/recent-sales")
def recent_sales(limit: int = 10, conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT s.invoice_no,
               c.name AS customer_name,
               c.village,
               s.total_amount,
               s.sale_date,
               s.payment_status
        FROM sales s
        JOIN customers c ON s.customer_id = c.customer_id
        ORDER BY s.created_at DESC
        LIMIT ?
        """,
        (limit,),
    )
    return [dict(row) for row in cursor.fetchall()]


# ======================
# Upcoming Demos
# ======================
@router.get("/upcoming-demos")
def upcoming_demos(limit: int = 10, conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT d.demo_id,
               c.name AS customer_name,
               c.village,
               p.product_name,
               d.demo_date,
               d.demo_time,
               d.conversion_status
        FROM demos d
        LEFT JOIN customers c ON d.customer_id = c.customer_id
        LEFT JOIN products p ON d.product_id = p.product_id
        WHERE date(d.demo_date) >= date('now')
          AND LOWER(d.conversion_status) = 'scheduled'
        ORDER BY d.demo_date, d.demo_time
        LIMIT ?
        """,
        (limit,),
    )
    return [dict(row) for row in cursor.fetchall()]
