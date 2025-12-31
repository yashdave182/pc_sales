from fastapi import APIRouter, Depends, HTTPException
import sqlite3
from typing import Optional

from database import get_db
from models import Demo

router = APIRouter()


# ======================
# Get all demos
# ======================
@router.get("/")
def get_demos(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    conn: sqlite3.Connection = Depends(get_db),
):
    query = """
        SELECT d.*,
               c.name AS customer_name,
               c.mobile AS customer_mobile,
               p.product_name,
               dist.name AS distributor_name
        FROM demos d
        LEFT JOIN customers c ON d.customer_id = c.customer_id
        LEFT JOIN products p ON d.product_id = p.product_id
        LEFT JOIN distributors dist ON d.distributor_id = dist.distributor_id
        WHERE 1=1
    """
    params = []

    if status:
        query += " AND d.conversion_status = ?"
        params.append(status)

    query += " ORDER BY d.demo_date DESC, d.demo_time DESC LIMIT ? OFFSET ?"
    params.extend([limit, skip])

    cursor = conn.cursor()
    cursor.execute(query, params)
    return [dict(row) for row in cursor.fetchall()]


# ======================
# Get single demo
# ======================
@router.get("/{demo_id}")
def get_demo(demo_id: int, conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM demos WHERE demo_id = ?", (demo_id,))
    demo = cursor.fetchone()

    if not demo:
        raise HTTPException(status_code=404, detail="Demo not found")

    return dict(demo)


# ======================
# Create demo
# ======================
@router.post("/")
def create_demo(demo: Demo, conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO demos (
            customer_id,
            distributor_id,
            demo_date,
            demo_time,
            product_id,
            quantity_provided,
            follow_up_date,
            conversion_status,
            notes,
            demo_location
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            demo.customer_id,
            demo.distributor_id,
            demo.demo_date,
            demo.demo_time,
            demo.product_id,
            demo.quantity_provided,
            demo.follow_up_date,
            demo.conversion_status,
            demo.notes,
            demo.demo_location,
        ),
    )

    conn.commit()
    return {"message": "Demo scheduled successfully"}


# ======================
# Update demo status
# ======================
@router.put("/{demo_id}/status")
def update_demo_status(
    demo_id: int,
    conversion_status: str,
    notes: Optional[str] = None,
    conn: sqlite3.Connection = Depends(get_db),
):
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE demos
        SET conversion_status = ?, notes = ?
        WHERE demo_id = ?
        """,
        (conversion_status, notes, demo_id),
    )

    conn.commit()

    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Demo not found")

    return {"message": "Demo updated successfully"}


# ======================
# Delete demo
# ======================
@router.delete("/{demo_id}")
def delete_demo(demo_id: int, conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM demos WHERE demo_id = ?", (demo_id,))
    conn.commit()

    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Demo not found")

    return {"message": "Demo deleted successfully"}
