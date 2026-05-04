import re
from typing import Optional, Any
import pandas as pd
from clean_excel_distributors import extract_distributors, to_upper_safe
from clean_excel_customers import extract_sabhasad

# =================================================
# CONSTANTS
# =================================================

MOBILE_REGEX = re.compile(r"\b\d{10}\b")

# =================================================
# HELPERS
# =================================================

def normalize(col: str) -> str:
    return (
        str(col)
        .strip()
        .lower()
        .replace(" ", "")
        .replace("_", "")
        .replace("-", "")
        .replace(".", "")
    )

def normalize_date(val) -> Optional[str]:
    try:
        return pd.to_datetime(val, dayfirst=True).strftime("%Y-%m-%d")
    except Exception:
        return None

def to_int(v):
    try:
        return int(float(v))
    except Exception:
        return 0

def to_float(v):
    try:
        return float(v)
    except Exception:
        return 0.0

def extract_packaging_liter(text):
    if not isinstance(text, str):
        return None
    t = text.lower()
    for size in [1, 2, 5, 10, 15]:
        if str(size) in t and ("ltr" in t or "liter" in t):
            return size
    return None

# =================================================
# ✅ EXCEL TYPE DETECTION (FIXED)
# =================================================

def detect_excel_type(file_path: str) -> str:
    xls = pd.ExcelFile(file_path)

    # SALES → always has 2 sheets
    if len(xls.sheet_names) >= 2:
        return "SALES"

    df = pd.read_excel(xls, sheet_name=0, header=None)
    df.dropna(how="all", inplace=True)

    customer_hits = 0
    distributor_hits = 0
    sabhasad_hits = 0

    for _, row in df.head(50).iterrows():
        text = " ".join(str(c).lower() for c in row if pd.notna(c))

        if re.search(r"\b\d{10}\b", text):
            customer_hits += 1

        if "mantri" in text:
            distributor_hits += 5 # High weight for Mantri
        elif any(k in text for k in ["district", "taluka", "village", "jilla", "gaon"]):
            distributor_hits += 1
            
        if "sabhasad" in text:
            sabhasad_hits += 5 # High weight for Sabhasad

    if distributor_hits >= 5:
        # If it has "mantri", it's definitely Distributors
        return "DISTRIBUTORS"
        
    if sabhasad_hits >= 3:
        return "SABHASAD"

    if customer_hits >= 3:
        return "CUSTOMERS"


    return "UNKNOWN"


# =================================================
# PRODUCT RESOLUTION
# =================================================

def resolve_product(conn: Any, packaging_name: str) -> Optional[int]:
    liter = extract_packaging_liter(packaging_name)
    if not liter:
        return None

    # Check if product exists
    res = conn.table("products").select("product_id").eq("capacity_ltr", liter).limit(1).execute()
    if res.data:
        return res.data[0]["product_id"]

    # Create new product if not found
    insert_res = conn.table("products").insert({
        "product_name": f"Oil {liter} Ltr",
        "capacity_ltr": liter,
        "is_active": True
    }).execute()
    
    if insert_res.data:
        return insert_res.data[0]["product_id"]
    return None

# =================================================
# CUSTOMERS IMPORT (FREE-FORM) - DEPRECATED in favor of import_sabhasad_excel
# =================================================

def import_customers_excel(path: str, conn: Any) -> int:
    """Legacy free-form customer import."""
    df = pd.read_excel(path, header=None)
    df.dropna(how="all", inplace=True)

    inserted = 0
    records = []

    for _, row in df.iterrows():
        cells = [str(c).strip() for c in row if pd.notna(c)]
        if len(cells) < 2:
            continue

        name = mobile = village = taluka = None

        for cell in cells:
            if not name and not cell.isdigit():
                name = cell

            if not mobile:
                m = MOBILE_REGEX.search(cell)
                if m:
                    mobile = m.group()

            parts = cell.split()
            if len(parts) >= 3 and parts[1].isdigit():
                village = parts[0].lower()
                taluka = parts[2].lower()

        if not (name and village and taluka):
            continue

        records.append({
            "name": to_upper_safe(name),
            "mobile": mobile,
            "village": to_upper_safe(village),
            "taluka": to_upper_safe(taluka)
        })

    if records:
        res = conn.table("customers").insert(records).execute()
        inserted = len(res.data) if hasattr(res, 'data') else len(records)

    return inserted

# =================================================
# SABHASAD IMPORT (CLEAN & ROBUST)
# =================================================

def import_sabhasad_excel(path: str, conn: Any) -> dict:
    """
    Import Sabhasad (Customers) data with robust cleaning and auto-code generation.
    """
    data = extract_sabhasad(path)
    print(f"DEBUG: Rows received from cleaner: {len(data)}")
    
    if not data:
        return {"success": True, "inserted": 0, "skipped": 0, "errors": []}

    # Get current max customer code to generate new ones
    try:
        res = conn.table("customers").select("customer_code").order("customer_code", desc=True).limit(1).execute()
        last_code = res.data[0]["customer_code"] if res.data else "CUST000"
        # Extract numeric part
        m = re.search(r"CUST(\d+)", str(last_code))
        last_num = int(m.group(1)) if m else 0
    except Exception:
        last_num = 0

    inserted = 0
    errors = []
    
    records_to_insert = []
    for row in data:
        if not row.get("customer_code"):
            last_num += 1
            row["customer_code"] = f"CUST{last_num:03d}"
        records_to_insert.append(row)

    if records_to_insert:
        try:
            # Use upsert to handle potential duplicate codes gracefully
            print(f"DEBUG: Attempting to insert/upsert {len(records_to_insert)} records into customers table")
            res = conn.table("customers").upsert(records_to_insert).execute()
            inserted = len(res.data) if res.data else 0
            print(f"DEBUG: Successfully inserted/updated {inserted} records")
        except Exception as e:
            errors.append(str(e))
            print(f"❌ DATABASE ERROR in Sabhasad import: {e}")

    return {
        "success": len(errors) == 0,
        "inserted": inserted,
        "skipped": len(data) - inserted,
        "errors": errors
    }



# =================================================
# SALES IMPORT (SHEET 0)
# =================================================

def import_sales_excel(path: str, conn: Any) -> int:
    xls = pd.ExcelFile(path)
    df = pd.read_excel(xls, sheet_name=0)

    df.columns = [normalize(c) for c in df.columns]

    current_sale_id = None
    items_count = 0

    for _, row in df.iterrows():
        # 1. Handle New Sale (Master Record)
        if pd.notna(row.get("name")):
            customer_name = str(row.get("name")).strip()
            # Fetch customer_id via Supabase
            c_res = conn.table("customers").select("customer_id").eq("name", customer_name).limit(1).execute()
            customer_id = c_res.data[0]["customer_id"] if c_res.data else None
            
            s_res = conn.table("sales").insert({
                "invoice_no": row.get("invno"),
                "customer_id": customer_id,
                "sale_date": normalize_date(row.get("dispatchdate"))
            }).execute()
            
            if s_res.data:
                current_sale_id = s_res.data[0]["sale_id"]

        # 2. Handle Sale Item (Detail Record)
        if current_sale_id and pd.notna(row.get("packing")):
            product_id = resolve_product(conn, row.get("packing"))
            
            conn.table("sale_items").insert({
                "sale_id": current_sale_id,
                "product_id": product_id,
                "quantity": to_int(row.get("qtn") or row.get("qty")),
                "rate": to_float(row.get("rate")),
                "amount": to_float(row.get("amt"))
            }).execute()
            items_count += 1

    return items_count

# =================================================
# DEMO IMPORT (SHEET 1)
# =================================================

def import_demo_excel(path: str, conn: Any) -> int:
    xls = pd.ExcelFile(path)
    df = pd.read_excel(xls, sheet_name=1)

    df.columns = [normalize(c) for c in df.columns]

    count = 0

    for _, row in df.iterrows():
        if pd.isna(row.get("name")) or pd.isna(row.get("packing")):
            continue

        customer_name = str(row.get("name")).strip()
        # Fetch customer_id via Supabase
        c_res = conn.table("customers").select("customer_id").eq("name", customer_name).limit(1).execute()
        customer_id = c_res.data[0]["customer_id"] if c_res.data else None

        conn.table("demos").insert({
            "customer_id": customer_id,
            "demo_date": normalize_date(row.get("dispatchdate")),
            "product_id": resolve_product(conn, row.get("packing")),
            "quantity_provided": to_int(row.get("qtn") or row.get("qty")),
            "notes": "Imported from Excel"
        }).execute()
        
        count += 1

    return count


# =================================================
# DISTRIBUTORS IMPORT (via extract_distributors)
# =================================================

def import_distributors_excel(path: str, conn: Any) -> int:
    """
    Clean and import an Excel file of distributors into the Supabase distributors table.
    """
    data = extract_distributors(path)
    print("🚀 NEW IMPORT FUNCTION RUNNING")
    print(f"🔥 TOTAL EXTRACTED: {len(data)}")

    if not data:
        print("⚠️ No data to insert.")
        return 0

    try:
        # Use Supabase REST client for bulk insertion
        # Note: .execute() is MANDATORY for the request to be sent
        print("📦 SAMPLE ROW:", data[0] if data else "NO DATA")
        print(f"💾 Inserting {len(data)} rows into Supabase...")
        
        response = conn.table("distributors").insert(data).execute()

        # 🔍 DEBUG RESPONSE
        print("🔍 FULL RESPONSE:", response)

        if response.data:
            print(f"✅ ACTUAL INSERT SUCCESS: {len(response.data)} rows inserted.")
        else:
            print("❌ INSERT FAILED:", response)

    except Exception as e:
        print(f"❌ DATABASE ERROR: {e}")
        # If bulk fails, you might want to try one-by-one or just report the error
        raise e

