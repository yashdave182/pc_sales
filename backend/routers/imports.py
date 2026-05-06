import shutil
from pathlib import Path

from typing import Optional

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile
from psycopg2.extensions import connection

from supabase_db import get_db
from excel_loader import (
    detect_excel_type,
    import_customers_excel,
    import_demo_excel,
    import_distributors_excel,
    import_sales_excel,
    import_sabhasad_excel,
)

print("[DEBUG] imports.py loaded")

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
    user_email: Optional[str] = Header(None, alias="x-user-email"),
):
    """
    Smart Excel importer:
    - Detects Excel type automatically
    - Routes to correct importer
    - Stores data using PostgreSQL (Supabase)
    """

    print("IMPORT API HIT")
    file_path = save_uploaded_file(file)
    print(f"[INFO] File saved to: {file_path}")

    try:
        try:
            excel_type = detect_excel_type(file_path)
            print(f"[DEBUG] Detected Excel Type: {excel_type}")
        except Exception as detection_err:
            print(f"[ERROR] Detection failed: {detection_err}")
            excel_type = "UNKNOWN"

        if excel_type == "DISTRIBUTORS":
            inserted = import_distributors_excel(file_path, conn)
            return {
                "type": "Distributors",
                "distributors_inserted": inserted,
                "message": f"Successfully imported {inserted} distributors",
            }

        elif excel_type == "SABHASAD" or excel_type == "CUSTOMERS":
            print(f"🔥 {excel_type} IMPORT TRIGGERED")
            result = import_sabhasad_excel(file_path, conn)
            return {
                "type": "Sabhasad",
                "inserted": result["inserted"],
                "skipped": result["skipped"],
                "message": f"Successfully imported {result['inserted']} Sabhasad records.",
                "errors": result["errors"]
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

        # Fallback for DISTRIBUTORS or UNKNOWN
        inserted = import_distributors_excel(file_path, conn)
        return {
            "type": "Distributors (Fallback)",
            "distributors_inserted": inserted,
            "message": f"Successfully imported distributors via fallback logic.",
        }


    except Exception as e:
        print("❌ IMPORT ERROR:", str(e))
        import traceback
        print("Import error:\n", traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Import failed: {str(e)}. Please verify the Excel file format.",
        )
    finally:
        if user_email:
            try:
                from activity_logger import get_activity_logger
                from supabase_db import get_supabase_client
                db = get_supabase_client()
                logger = get_activity_logger(db)
                logger.log_import(
                    user_email=user_email,
                    file_name=file.filename or "unknown",
                    records_count=0,
                )
            except Exception:
                pass
