import sqlite3

from database import get_db
from fastapi import APIRouter, Depends, HTTPException
from models import SaleCreate

router = APIRouter()


@router.get("/")
def get_sales(conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM sales ORDER BY created_at DESC")

    return [dict(row) for row in cursor.fetchall()]


@router.get("/pending-payments")
def sales_with_pending(conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()

    cursor.execute(
        """

        SELECT s.sale_id, s.invoice_no, s.sale_date,
               c.name AS customer_name, c.village,
               COALESCE(s.total_amount,0) AS total_amount,
               COALESCE(SUM(p.amount),0) AS paid_amount,
               COALESCE(s.total_amount,0) - COALESCE(SUM(p.amount),0) AS pending_amount,
               s.payment_status
        FROM sales s
        JOIN customers c ON s.customer_id = c.customer_id
        LEFT JOIN payments p ON s.sale_id = p.sale_id
        GROUP BY s.sale_id
        HAVING pending_amount > 0
        ORDER BY s.sale_date DESC
        """
    )
    return [dict(row) for row in cursor.fetchall()]


@router.post("/")
def create_sale(sale: SaleCreate, conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO sales (customer_id, sale_date, total_amount, total_liters, payment_status)

        VALUES (?, ?, ?, ?, 'Pending')

        """,
        (
            sale.customer_id,
            sale.sale_date,
            0,
            0,
        ),
    )

    conn.commit()

    return {"message": "Sale created"}
