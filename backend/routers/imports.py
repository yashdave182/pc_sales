import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from psycopg2.extensions import connection

from database import get_db
from excel_loader import (
    detect_excel_type,
    import_customers_excel,
    import_demo_excel,
    import_distributors_excel,
    import_sales_excel,
)

router = APIRouter()

# ----------------------
# Upload directory
# ----------------------

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ----------------------
# File save helper
# ----------------------

def save_uploaded_file(file: UploadFile) -> str:
    if not file.filename.endswith((".xls", ".xlsx")):
        raise HTTPException(status_code=400, detail="Only Excel files are allowed")

    file_path = UPLOAD_DIR / file.filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return str(file_path)


# ==========================================================
# Unified Excel Import Endpoint
# ==========================================================

@router.post("/excel")
def import_excel(
    file: UploadFile = File(...),
    conn: connection = Depends(get_db),
):
    """
    Smart Excel importer:
    - Detects Excel type automatically
    - Routes to correct importer
    - Stores data using PostgreSQL (Supabase)
    """

    file_path = save_uploaded_file(file)

    try:
        excel_type = detect_excel_type(file_path)
        print("Excel type detected:", excel_type)

        if excel_type == "DISTRIBUTORS":
            inserted = import_distributors_excel(file_path, conn)
            return {
                "type": "Distributors",
                "distributors_inserted": inserted,
                "message": f"Successfully imported {inserted} distributors",
            }

        elif excel_type == "CUSTOMERS":
            inserted = import_customers_excel(file_path, conn)
            return {
                "type": "Customers",
                "customers_inserted": inserted,
                "message": f"Successfully imported {inserted} customers",
            }

        elif excel_type == "SALES":
            sale_items = import_sales_excel(file_path, conn)
            demos = import_demo_excel(file_path, conn)
            return {
                "type": "Sales",
                "sale_items_inserted": sale_items,
                "demos_inserted": demos,
                "message": (
                    f"Successfully imported {sale_items} sale items "
                    f"and {demos} demos"
                ),
            }

        # Unknown format
        raise HTTPException(
            status_code=400,
            detail=(
                "Excel format not recognized.\n\n"
                "Required formats:\n"
                "CUSTOMERS → name, mobile, village, taluka\n"
                "DISTRIBUTORS → village, taluka, district, mantri name, mantri mobile, sabhasad, contact in group\n"
                "SALES → Multiple sheets with name, packing, qtn, rate, amt, dispatch date"
            ),
        )

    except HTTPException:
        raise

    except Exception as e:
        conn.rollback()
        import traceback

        print("Import error:\n", traceback.format_exc())

        raise HTTPException(
            status_code=500,
            detail=(
                f"Import failed: {str(e)}. "
                "Please verify that the Excel file matches the required format."
            ),
        )
