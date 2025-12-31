from fastapi import APIRouter, Depends, HTTPException
import sqlite3
from database import get_db
from models import SaleCreate

router = APIRouter()

@router.get("/")
def get_sales(conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sales ORDER BY created_at DESC")
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
