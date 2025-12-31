from fastapi import APIRouter, Depends
import sqlite3
from database import get_db

router = APIRouter()

@router.get("/payment-distribution")
def payment_distribution(conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute("""
        SELECT payment_method, SUM(amount)
        FROM payments
        GROUP BY payment_method
    """)
    return [dict(row) for row in cursor.fetchall()]
