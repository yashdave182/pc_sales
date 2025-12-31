import sqlite3

from database import get_db
from fastapi import APIRouter, Depends
from models import Payment

router = APIRouter()


@router.get("/")
def get_payments(conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM payments ORDER BY created_at DESC")

    return [dict(row) for row in cursor.fetchall()]


@router.get("/pending")
def get_pending(conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute("""
        SELECT s.invoice_no,
               c.name AS customer_name,
               c.mobile,
               s.sale_date AS date,
               COALESCE(s.total_amount,0) AS amount,
               COALESCE(SUM(p.amount),0) AS paid,
               COALESCE(s.total_amount,0) - COALESCE(SUM(p.amount),0) AS pending
        FROM sales s
        JOIN customers c ON s.customer_id = c.customer_id
        LEFT JOIN payments p ON p.sale_id = s.sale_id
        GROUP BY s.sale_id
        HAVING pending > 0
        ORDER BY pending DESC
    """)
    return [dict(row) for row in cursor.fetchall()]


@router.get("/sale/{sale_id}")
def get_payment_history(sale_id: int, conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT payment_id, sale_id, payment_date, payment_method, amount, rrn, reference, notes, created_at
        FROM payments
        WHERE sale_id=?
        ORDER BY created_at DESC
    """,
        (sale_id,),
    )
    return [dict(row) for row in cursor.fetchall()]


@router.post("/")
def create_payment(payment: Payment, conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO payments (sale_id, payment_date, payment_method, amount)
        VALUES (?, ?, ?, ?)
        """,
        (
            payment.sale_id,
            payment.payment_date,
            payment.payment_method,
            payment.amount,
        ),
    )
    conn.commit()
    return {"message": "Payment added"}
