import pandas as pd
import sqlite3
import re
from typing import Optional

MOBILE_REGEX = re.compile(r"\b\d{10}\b")

# -------------------------------------------------
# Helpers
# -------------------------------------------------

def normalize_date(val) -> Optional[str]:
    try:
        return pd.to_datetime(val, dayfirst=True).strftime("%Y-%m-%d")
    except:
        return None

def to_int(v):
    try:
        return int(float(v))
    except:
        return 0

def to_float(v):
    try:
        return float(v)
    except:
        return 0.0

def extract_packaging_liter(text):
    if not isinstance(text, str):
        return None
    t = text.lower()
    for size in [1, 2, 5, 10, 15]:
        if str(size) in t and "ltr" in t:
            return size
    return None

# -------------------------------------------------
# Product Resolver
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


def detect_excel_type(file_path: str) -> str:
    import pandas as pd
    xls = pd.ExcelFile(file_path)
    print("EXCEL LOADER PATH:", file_path)


    # 1️⃣ SALES → multiple sheets (absolute rule)
    if len(xls.sheet_names) > 1:
        return "SALES"

    # Read first sheet headers
    df = pd.read_excel(xls, sheet_name=0)
    actual_cols = {normalize(c) for c in df.columns}

    # -------------------------
    # REQUIRED COLUMN SETS
    # -------------------------

    CUSTOMER_REQUIRED = {
        "name",
        "mobile",
        "village",
        "taluka",
    }

    DISTRIBUTOR_REQUIRED = {
        "village",
        "taluka",
        "district",
        "mantriname",
        "mantrimobile",
        "sabhasad",
        "contactingroup",
    }

    SALES_REQUIRED = {
        "name",
        "packing",
        "qtn",
        "rate",
        "amt",
    }

    # -------------------------
    # STRICT MATCHING
    # -------------------------

    if CUSTOMER_REQUIRED.issubset(actual_cols):
        return "CUSTOMERS"

    if DISTRIBUTOR_REQUIRED.issubset(actual_cols):
        return "DISTRIBUTORS"

    if SALES_REQUIRED.issubset(actual_cols):
        return "SALES"

    return "UNKNOWN"  



def resolve_product(conn, packaging_name: str) -> Optional[int]:
    liter = extract_packaging_liter(packaging_name)
    if not liter:
        return None

    cur = conn.cursor()
    cur.execute(
        "SELECT product_id FROM products WHERE capacity_ltr=? LIMIT 1",
        (liter,)
    )
    row = cur.fetchone()
    if row:
        return row[0]

    cur.execute(
        """
        INSERT INTO products (product_name, capacity_ltr, is_active)
        VALUES (?, ?, 1)
        """,
        (f"Oil {liter} Ltr", liter)
    )
    return cur.lastrowid

# -------------------------------------------------
# Customers Import
# -------------------------------------------------

def import_customers_excel(path: str, conn: sqlite3.Connection) -> int:
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

        if not name or not village or not taluka:
            continue

        cur.execute(
            """
            INSERT INTO customers (name, mobile, village, taluka)
            VALUES (?, ?, ?, ?)
            """,
            (name, mobile, village, taluka)
        )
        inserted += 1

    conn.commit()
    return inserted

# -------------------------------------------------
# Sales + Sale Items Import (Sheet 0)
# -------------------------------------------------

def import_sales_excel(path: str, conn: sqlite3.Connection) -> int:
    xls = pd.ExcelFile(path)
    df = pd.read_excel(xls, sheet_name=0)
    df.columns = df.columns.astype(str).str.lower()

    cur = conn.cursor()
    current_sale_id = None
    item_count = 0

    for _, row in df.iterrows():

        # New invoice
        if pd.notna(row.get("name")):
            cur.execute(
                """
                INSERT INTO sales (invoice_no, customer_id, sale_date)
                VALUES (
                    ?, 
                    (SELECT customer_id FROM customers WHERE name=? LIMIT 1),
                    ?
                )
                """,
                (
                    row.get("inv no"),
                    str(row.get("name")).strip(),
                    normalize_date(row.get("dispatch date")),
                )
            )
            current_sale_id = cur.lastrowid

        # Line item
        if current_sale_id and pd.notna(row.get("packing")):
            product_id = resolve_product(conn, row.get("packing"))
            qty = to_int(row.get("qtn"))
            rate = to_float(row.get("rate"))
            amt = to_float(row.get("amt"))

            cur.execute(
                """
                INSERT INTO sale_items
                (sale_id, product_id, quantity, rate, amount)
                VALUES (?, ?, ?, ?, ?)
                """,
                (current_sale_id, product_id, qty, rate, amt)
            )
            item_count += 1

    conn.commit()
    return item_count

# -------------------------------------------------
# Demo Import (Sheet 1)
# -------------------------------------------------

def import_demo_excel(path: str, conn: sqlite3.Connection) -> int:
    xls = pd.ExcelFile(path)
    df = pd.read_excel(xls, sheet_name=1)
    df.columns = df.columns.astype(str).str.lower()

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
                (SELECT customer_id FROM customers WHERE name=? LIMIT 1),
                ?, ?, ?, ?
            )
            """,
            (
                str(row.get("name")).strip(),
                normalize_date(row.get("dispatch date")),
                resolve_product(conn, row.get("packing")),
                to_int(row.get("qtn")),
                "Imported from Excel",
            )
        )
        count += 1

    conn.commit()
    return count

def import_distributors_excel(path: str, conn: sqlite3.Connection) -> int:
    df = pd.read_excel(path)
    df.columns = df.columns.astype(str).str.lower()

    cur = conn.cursor()
    inserted = 0

    for _, row in df.iterrows():
        if pd.isna(row.get("village")) or pd.isna(row.get("taluka")):
            continue

        cur.execute(
            """
            INSERT INTO distributors
            (name, village, taluka, district, mantri_name, mantri_mobile)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                row.get("name") or "Unknown",
                str(row.get("village")).lower(),
                str(row.get("taluka")).lower(),
                str(row.get("district")).lower() if row.get("district") else None,
                row.get("mantri_name"),
                row.get("mantri_mobile"),
                row.get("")
            )
        )
        inserted += 1

    conn.commit()
    return inserted
