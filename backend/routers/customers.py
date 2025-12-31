from fastapi import APIRouter, Depends, HTTPException
import sqlite3
from database import get_db
from models import Customer

router = APIRouter()

@router.get("/")
def get_customers(conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM customers ORDER BY created_at DESC")
    return [dict(row) for row in cursor.fetchall()]

@router.get("/{customer_id}")
def get_customer(customer_id: int, conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM customers WHERE customer_id=?", (customer_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Customer not found")
    return dict(row)

@router.post("/")
def create_customer(customer: Customer, conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO customers (name, mobile, village, taluka, district, status)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            customer.name,
            customer.mobile,
            customer.village,
            customer.taluka,
            customer.district,
            customer.status,
        ),
    )
    conn.commit()
    return {"message": "Customer created"}
