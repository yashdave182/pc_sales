from fastapi import APIRouter, Depends, HTTPException
import sqlite3

from database import get_db
from models import Distributor

router = APIRouter()


@router.get("/")
def get_distributors(conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM distributors ORDER BY created_at DESC")
    return [dict(row) for row in cursor.fetchall()]


@router.post("/")
def create_distributor(
    distributor: Distributor,
    conn: sqlite3.Connection = Depends(get_db),
):
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO distributors (
            name, village, taluka, district,
            mantri_name, mantri_mobile,
            sabhasad_count, contact_in_group, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            distributor.name,
            distributor.village,
            distributor.taluka,
            distributor.district,
            distributor.mantri_name,
            distributor.mantri_mobile,
            distributor.sabhasad_count,
            distributor.contact_in_group,
            distributor.status,
        ),
    )
    conn.commit()
    return {"message": "Distributor created successfully"}
