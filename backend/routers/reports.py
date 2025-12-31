from fastapi import APIRouter, Depends
import sqlite3
from database import get_db
from reports import ReportGenerator

router = APIRouter()
report_generator = ReportGenerator("Sales Management System")

@router.get("/sales-summary")
def sales_summary(conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*), SUM(total_amount) FROM sales")
    count, total = cursor.fetchone()
    return {"total_sales": count, "total_amount": total}
