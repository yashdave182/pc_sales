from fastapi import APIRouter, Depends
import sqlite3
from database import get_db
from models import Product

router = APIRouter()

@router.get("/")
def get_products(conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE is_active=1")
    return [dict(row) for row in cursor.fetchall()]

@router.post("/")
def create_product(product: Product, conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO products (product_name, packing_type, capacity_ltr, category, standard_rate)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            product.product_name,
            product.packing_type,
            product.capacity_ltr,
            product.category,
            product.standard_rate,
        ),
    )
    conn.commit()
    return {"message": "Product created"}
