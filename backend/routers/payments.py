from fastapi import APIRouter, Depends
import sqlite3
from database import get_db
from models import Payment

router = APIRouter()

@router.get("/")
def get_payments(conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM payments ORDER BY created_at DESC")
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
