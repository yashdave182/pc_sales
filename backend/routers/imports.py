import os
import shutil
import sqlite3
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException

from database import get_db
from excel_loader import (
    detect_excel_type,
    import_customers_excel,
    import_sales_excel,
    import_demo_excel,
    import_distributors_excel
)

router = APIRouter()

# ----------------------
# Upload directory
# ----------------------

UPLOAD_DIR = "backend/data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def save_uploaded_file(file: UploadFile) -> str:
    if not file.filename.endswith((".xls", ".xlsx")):
        raise HTTPException(status_code=400, detail="Only Excel files are allowed")

    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return file_path


# ==========================================================
# Unified Excel Import Endpoint
# ==========================================================

@router.post("/excel")
def import_excel(
    file: UploadFile = File(...),
    conn: sqlite3.Connection = Depends(get_db),
):
    """
    Smart Excel importer:
    - Detects Excel type automatically
    - Routes to correct importer
    - Stores data using existing normalized schema
    """

    file_path = save_uploaded_file(file)

    excel_type = detect_excel_type(file_path)
    print("Excel type detected as:", excel_type)

    try:
        if excel_type == "DISTRIBUTORS":
            inserted = import_distributors_excel(file_path, conn)
            return {
                "type": "Distributors",
                "distributors_inserted": inserted,
            }
        if excel_type == "CUSTOMERS":
            inserted = import_customers_excel(file_path, conn)
            return {
                "type": "customers hello",
                "customers_inserted": inserted,
            }

        if excel_type == "SALES":
            sale_items = import_sales_excel(file_path, conn)
            demos = import_demo_excel(file_path, conn)
            return {
                "type": "sales_workbook",
                "sale_items_inserted": sale_items,
                "demos_inserted": demos,
            }
        

        raise HTTPException(
            status_code=400,
            detail="Excel format not recognized. Please upload a valid template.",
        )

    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Import failed: {str(e)}",
        )