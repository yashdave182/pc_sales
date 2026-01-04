import re
from typing import Optional
import pandas as pd
from psycopg2.extensions import connection

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

    for _, row in df.head(50).iterrows():
        text = " ".join(str(c).lower() for c in row if pd.notna(c))

        if re.search(r"\b\d{10}\b", text):
            customer_hits += 1

        if any(k in text for k in ["mantri", "sabhasad", "district", "taluka"]):
            distributor_hits += 1

    if distributor_hits >= 3:
        return "DISTRIBUTORS"

    if customer_hits >= 3:
        return "CUSTOMERS"

    return "UNKNOWN"

# =================================================
# PRODUCT RESOLUTION
# =================================================

def resolve_product(conn: connection, packaging_name: str) -> Optional[int]:
    liter = extract_packaging_liter(packaging_name)
    if not liter:
        return None

    cur = conn.cursor()
    cur.execute(
        "SELECT product_id FROM products WHERE capacity_ltr = %s LIMIT 1",
        (liter,),
    )
    row = cur.fetchone()
    if row:
        return row["product_id"]

    cur.execute(
        """
        INSERT INTO products (product_name, capacity_ltr, is_active)
        VALUES (%s, %s, TRUE)
        RETURNING product_id
        """,
        (f"Oil {liter} Ltr", liter),
    )
    return cur.fetchone()["product_id"]

# =================================================
# CUSTOMERS IMPORT (FREE-FORM)
# =================================================

def import_customers_excel(path: str, conn: connection) -> int:
    df = pd.read_excel(path, header=None)
    df.dropna(how="all", inplace=True)

    cur = conn.cursor()
    inserted = 0

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

        cur.execute(
            """
            INSERT INTO customers (name, mobile, village, taluka)
            VALUES (%s, %s, %s, %s)
            """,
            (name, mobile, village, taluka),
        )
        inserted += 1

    conn.commit()
    return inserted

# =================================================
# SALES IMPORT (SHEET 0)
# =================================================

def import_sales_excel(path: str, conn: connection) -> int:
    xls = pd.ExcelFile(path)
    df = pd.read_excel(xls, sheet_name=0)

    df.columns = [normalize(c) for c in df.columns]

    cur = conn.cursor()
    current_sale_id = None
    items = 0

    for _, row in df.iterrows():
        if pd.notna(row.get("name")):
            cur.execute(
                """
                INSERT INTO sales (invoice_no, customer_id, sale_date)
                VALUES (
                    %s,
                    (SELECT customer_id FROM customers WHERE name = %s LIMIT 1),
                    %s
                )
                RETURNING sale_id
                """,
                (
                    row.get("invno"),
                    str(row.get("name")).strip(),
                    normalize_date(row.get("dispatchdate")),
                ),
            )
            current_sale_id = cur.fetchone()["sale_id"]

        if current_sale_id and pd.notna(row.get("packing")):
            cur.execute(
                """
                INSERT INTO sale_items
                (sale_id, product_id, quantity, rate, amount)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    current_sale_id,
                    resolve_product(conn, row.get("packing")),
                    to_int(row.get("qtn") or row.get("qty")),
                    to_float(row.get("rate")),
                    to_float(row.get("amt")),
                ),
            )
            items += 1

    conn.commit()
    return items

# =================================================
# DEMO IMPORT (SHEET 1)
# =================================================

def import_demo_excel(path: str, conn: connection) -> int:
    xls = pd.ExcelFile(path)
    df = pd.read_excel(xls, sheet_name=1)

    df.columns = [normalize(c) for c in df.columns]

    cur = conn.cursor()
    count = 0

    for _, row in df.iterrows():
        if pd.isna(row.get("name")) or pd.isna(row.get("packing")):
            continue

        cur.execute(
            """
            INSERT INTO demos
            (customer_id, demo_date, product_id, quantity_provided, notes)
            VALUES (
                (SELECT customer_id FROM customers WHERE name = %s LIMIT 1),
                %s, %s, %s, %s
            )
            """,
            (
                str(row.get("name")).strip(),
                normalize_date(row.get("dispatchdate")),
                resolve_product(conn, row.get("packing")),
                to_int(row.get("qtn") or row.get("qty")),
                "Imported from Excel",
            ),
        )
        count += 1

    conn.commit()
    return count

# =================================================
# DISTRIBUTORS IMPORT (FREE-FORM)
# =================================================

def import_distributors_excel(path: str, conn: connection) -> int:
    df = pd.read_excel(path, header=None)
    df.dropna(how="all", inplace=True)

    cur = conn.cursor()
    inserted = 0

    for _, row in df.iterrows():
        text = " ".join(str(c).lower() for c in row if pd.notna(c))

        if "taluka" not in text:
            continue

        cur.execute(
            """
            INSERT INTO distributors
            (name, village, taluka, district,
             mantri_name, mantri_mobile,
             sabhasad_count, contact_in_group)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                "Unknown",
                None,
                None,
                None,
                None,
                None,
                0,
                0,
            ),
        )
        inserted += 1

    conn.commit()
    return inserted
