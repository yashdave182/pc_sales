import json
import os
import sqlite3
import sys
from datetime import date, datetime
from pathlib import Path
from typing import List, Optional

import pandas as pd
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

# Add parent directory to path to access existing database
sys.path.append(str(Path(__file__).parent.parent.parent))

app = FastAPI(
    title="Sales Management API",
    description="RESTful API for Sales Management System",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://pc-sales.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database path - use /opt/render/project/data for Render, fallback to parent dir for local
if os.environ.get("RENDER"):
    DATA_DIR = "/opt/render/project/data"
    DB_PATH = os.path.join(DATA_DIR, "sales_management.db")
    UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
else:
    DB_PATH = os.path.join(Path(__file__).parent.parent.parent, "sales_management.db")
    UPLOAD_DIR = os.path.join(Path(__file__).parent.parent.parent, "data")
    DATA_DIR = str(Path(__file__).parent.parent.parent)

# Ensure directories exist
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ==================== Database Helper ====================
def init_db():
    """Initialize database with required tables if they don't exist"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create tables
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS customers (
            customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_code TEXT UNIQUE,
            name TEXT NOT NULL,
            mobile TEXT,
            village TEXT,
            taluka TEXT,
            district TEXT,
            status TEXT DEFAULT 'Active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS products (
            product_id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_name TEXT NOT NULL,
            packing_type TEXT,
            capacity_ltr REAL,
            category TEXT,
            standard_rate REAL,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS distributors (
            distributor_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            village TEXT,
            taluka TEXT,
            district TEXT,
            mantri_name TEXT,
            mantri_mobile TEXT,
            sabhasad_count INTEGER DEFAULT 0,
            contact_in_group INTEGER DEFAULT 0,
            status TEXT DEFAULT 'Active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sales (
            sale_id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_no TEXT,
            customer_id INTEGER,
            sale_date TEXT NOT NULL,
            total_amount REAL DEFAULT 0,
            total_liters REAL DEFAULT 0,
            payment_status TEXT DEFAULT 'Pending',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        );

        CREATE TABLE IF NOT EXISTS sale_items (
            sale_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER,
            product_id INTEGER,
            quantity INTEGER,
            rate REAL,
            amount REAL,
            FOREIGN KEY (sale_id) REFERENCES sales(sale_id),
            FOREIGN KEY (product_id) REFERENCES products(product_id)
        );

        CREATE TABLE IF NOT EXISTS payments (
            payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER,
            payment_date TEXT NOT NULL,
            payment_method TEXT,
            amount REAL NOT NULL,
            rrn TEXT,
            reference TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sale_id) REFERENCES sales(sale_id)
        );

        CREATE TABLE IF NOT EXISTS demos (
            demo_id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER,
            distributor_id INTEGER,
            demo_date TEXT NOT NULL,
            demo_time TEXT,
            product_id INTEGER,
            quantity_provided INTEGER,
            follow_up_date TEXT,
            conversion_status TEXT DEFAULT 'Scheduled',
            notes TEXT,
            demo_location TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
            FOREIGN KEY (distributor_id) REFERENCES distributors(distributor_id),
            FOREIGN KEY (product_id) REFERENCES products(product_id)
        );
    """)

    conn.commit()
    conn.close()


def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()
    print(f"Database initialized at: {DB_PATH}")


def dict_from_row(row):
    return dict(zip(row.keys(), row)) if row else None


# ==================== Pydantic Models ====================


class Customer(BaseModel):
    customer_id: Optional[int] = None
    customer_code: Optional[str] = None
    name: str
    mobile: Optional[str] = None
    village: Optional[str] = None
    taluka: Optional[str] = None
    district: Optional[str] = None
    status: str = "Active"


class Sale(BaseModel):
    sale_id: Optional[int] = None
    invoice_no: Optional[str] = None
    customer_id: int
    sale_date: str
    total_amount: float
    total_liters: float
    payment_status: str = "Pending"
    notes: Optional[str] = None


class SaleItem(BaseModel):
    product_id: int
    quantity: int
    rate: float
    amount: float


class SaleCreate(BaseModel):
    customer_id: int
    sale_date: str
    items: List[SaleItem]
    notes: Optional[str] = None


class Payment(BaseModel):
    payment_id: Optional[int] = None
    sale_id: int
    payment_date: str
    payment_method: str
    amount: float
    rrn: Optional[str] = None
    reference: Optional[str] = None
    notes: Optional[str] = None


class Demo(BaseModel):
    demo_id: Optional[int] = None
    customer_id: int
    distributor_id: Optional[int] = None
    demo_date: str
    demo_time: str
    product_id: int
    quantity_provided: int
    follow_up_date: Optional[str] = None
    conversion_status: str = "Scheduled"
    notes: Optional[str] = None
    demo_location: Optional[str] = None


class Distributor(BaseModel):
    distributor_id: Optional[int] = None
    name: str
    village: Optional[str] = None
    taluka: Optional[str] = None
    district: Optional[str] = None
    mantri_name: Optional[str] = None
    mantri_mobile: Optional[str] = None
    sabhasad_count: int = 0
    contact_in_group: int = 0
    status: str = "Active"


class Product(BaseModel):
    product_id: Optional[int] = None
    product_name: str
    packing_type: Optional[str] = None
    capacity_ltr: Optional[float] = None
    category: Optional[str] = None
    standard_rate: Optional[float] = None
    is_active: int = 1


# ==================== Health Check ====================


@app.get("/")
def read_root():
    return {
        "message": "Sales Management API",
        "version": "1.0.0",
        "status": "active",
        "database": "connected" if os.path.exists(DB_PATH) else "not found",
    }


@app.get("/health")
def health_check():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")
        table_count = cursor.fetchone()[0]

        # Get data counts
        counts = {}
        try:
            cursor.execute("SELECT COUNT(*) FROM customers")
            counts["customers"] = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM products")
            counts["products"] = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM sales")
            counts["sales"] = cursor.fetchone()[0]
        except:
            counts = {"error": "Tables may not exist"}

        conn.close()
        return {
            "status": "healthy",
            "database": "connected",
            "tables": table_count,
            "data_counts": counts,
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


@app.post("/api/admin/import-data")
def import_data():
    """Import data from SQL export file - for admin use"""
    try:
        import sys
        from pathlib import Path

        # Add the backend directory to path
        backend_dir = Path(__file__).parent
        sys.path.insert(0, str(backend_dir))

        # Import and run the initialization
        from init_and_import import init_and_import_db

        # Run the import
        init_and_import_db()

        # Verify data was imported
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM customers")
        customer_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM products")
        product_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM sales")
        sales_count = cursor.fetchone()[0]

        conn.close()

        return {
            "status": "success",
            "message": "Data imported successfully",
            "counts": {
                "customers": customer_count,
                "products": product_count,
                "sales": sales_count,
            },
        }
    except Exception as e:
        return {"status": "error", "message": f"Failed to import data: {str(e)}"}


# ==================== Dashboard ====================


@app.get("/api/dashboard/metrics")
def get_dashboard_metrics(conn: sqlite3.Connection = Depends(get_db)):
    try:
        cursor = conn.cursor()

        # Total sales
        cursor.execute("SELECT COALESCE(SUM(total_amount), 0) FROM sales")
        total_sales = cursor.fetchone()[0]

        # Total payments
        cursor.execute("SELECT COALESCE(SUM(amount), 0) FROM payments")
        total_payments = cursor.fetchone()[0]

        # Pending amount
        pending_amount = total_sales - total_payments

        # Total customers
        cursor.execute("SELECT COUNT(*) FROM customers WHERE status='Active'")
        total_customers = cursor.fetchone()[0]

        # Total transactions
        cursor.execute("SELECT COUNT(*) FROM sales")
        total_transactions = cursor.fetchone()[0]

        # Demo conversion rate
        cursor.execute("SELECT COUNT(*) FROM demos")
        total_demos = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM demos WHERE conversion_status='Converted'")
        converted_demos = cursor.fetchone()[0]
        conversion_rate = (
            (converted_demos / total_demos * 100) if total_demos > 0 else 0
        )

        return {
            "total_sales": total_sales,
            "total_payments": total_payments,
            "pending_amount": pending_amount,
            "total_customers": total_customers,
            "total_transactions": total_transactions,
            "conversion_rate": round(conversion_rate, 2),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard/sales-trend")
def get_sales_trend(days: int = 30, conn: sqlite3.Connection = Depends(get_db)):
    try:
        query = f"""
        SELECT sale_date, SUM(total_amount) as total_amount
        FROM sales
        WHERE sale_date >= date('now', '-{days} days')
        GROUP BY sale_date
        ORDER BY sale_date
        """
        df = pd.read_sql_query(query, conn)
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard/recent-sales")
def get_recent_sales(limit: int = 10, conn: sqlite3.Connection = Depends(get_db)):
    try:
        query = f"""
        SELECT s.invoice_no, c.name as customer_name, c.village,
               s.total_amount, s.sale_date, s.payment_status
        FROM sales s
        JOIN customers c ON s.customer_id = c.customer_id
        ORDER BY s.created_at DESC
        LIMIT {limit}
        """
        df = pd.read_sql_query(query, conn)
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard/upcoming-demos")
def get_upcoming_demos(limit: int = 10, conn: sqlite3.Connection = Depends(get_db)):
    try:
        query = f"""
        SELECT d.demo_id, c.name as customer_name, c.village,
               p.product_name, d.demo_date, d.demo_time, d.conversion_status
        FROM demos d
        LEFT JOIN customers c ON d.customer_id = c.customer_id
        LEFT JOIN products p ON d.product_id = p.product_id
        WHERE date(d.demo_date) >= date('now')
        AND LOWER(TRIM(d.conversion_status)) = 'scheduled'
        ORDER BY d.demo_date ASC, d.demo_time ASC
        LIMIT {limit}
        """
        df = pd.read_sql_query(query, conn)
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Customers ====================


@app.get("/api/customers")
def get_customers(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    status: Optional[str] = None,
    conn: sqlite3.Connection = Depends(get_db),
):
    try:
        query = "SELECT * FROM customers WHERE 1=1"
        params = []

        if search:
            query += " AND (name LIKE ? OR mobile LIKE ? OR village LIKE ?)"
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param])

        if status:
            query += " AND status = ?"
            params.append(status)

        query += f" ORDER BY created_at DESC LIMIT {limit} OFFSET {skip}"

        cursor = conn.cursor()
        cursor.execute(query, params)
        customers = [dict(row) for row in cursor.fetchall()]

        # Get total count
        count_query = "SELECT COUNT(*) FROM customers WHERE 1=1"
        if search:
            count_query += " AND (name LIKE ? OR mobile LIKE ? OR village LIKE ?)"
        if status:
            count_query += " AND status = ?"

        cursor.execute(count_query, params[:-1] if not status else params)
        total = cursor.fetchone()[0]

        return {"data": customers, "total": total}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/customers/{customer_id}")
def get_customer(customer_id: int, conn: sqlite3.Connection = Depends(get_db)):
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM customers WHERE customer_id = ?", (customer_id,))
        customer = cursor.fetchone()
        if customer:
            return dict(customer)
        raise HTTPException(status_code=404, detail="Customer not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/customers")
def create_customer(customer: Customer, conn: sqlite3.Connection = Depends(get_db)):
    try:
        cursor = conn.cursor()

        # Generate customer code
        cursor.execute("SELECT COUNT(*) FROM customers")
        count = cursor.fetchone()[0]
        customer_code = f"CUST{count + 1:05d}"

        cursor.execute(
            """
            INSERT INTO customers (customer_code, name, mobile, village, taluka, district, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
            (
                customer_code,
                customer.name,
                customer.mobile,
                customer.village,
                customer.taluka,
                customer.district,
                customer.status,
            ),
        )

        conn.commit()
        customer_id = cursor.lastrowid

        return {
            "customer_id": customer_id,
            "customer_code": customer_code,
            "message": "Customer created successfully",
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/customers/{customer_id}")
def update_customer(
    customer_id: int, customer: Customer, conn: sqlite3.Connection = Depends(get_db)
):
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE customers
            SET name=?, mobile=?, village=?, taluka=?, district=?, status=?, updated_date=CURRENT_TIMESTAMP
            WHERE customer_id=?
        """,
            (
                customer.name,
                customer.mobile,
                customer.village,
                customer.taluka,
                customer.district,
                customer.status,
                customer_id,
            ),
        )

        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Customer not found")

        return {"message": "Customer updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/customers/{customer_id}")
def delete_customer(customer_id: int, conn: sqlite3.Connection = Depends(get_db)):
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM customers WHERE customer_id=?", (customer_id,))
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Customer not found")

        return {"message": "Customer deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Products ====================


@app.get("/api/products")
def get_products(conn: sqlite3.Connection = Depends(get_db)):
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM products WHERE is_active=1 ORDER BY product_name")
        products = [dict(row) for row in cursor.fetchall()]
        return products
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/products")
def create_product(product: Product, conn: sqlite3.Connection = Depends(get_db)):
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO products (product_name, packing_type, capacity_ltr, category, standard_rate, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (
                product.product_name,
                product.packing_type,
                product.capacity_ltr,
                product.category,
                product.standard_rate,
                product.is_active,
            ),
        )

        conn.commit()
        product_id = cursor.lastrowid

        return {"product_id": product_id, "message": "Product created successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Sales ====================


@app.get("/api/sales")
def get_sales(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    conn: sqlite3.Connection = Depends(get_db),
):
    try:
        query = """
        SELECT s.*, c.name as customer_name, c.village
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.customer_id
        WHERE 1=1
        """
        params = []

        if status:
            query += " AND s.payment_status = ?"
            params.append(status)

        query += f" ORDER BY s.created_at DESC LIMIT {limit} OFFSET {skip}"

        df = pd.read_sql_query(query, conn, params=params)
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/sales/{sale_id}")
def get_sale_details(sale_id: int, conn: sqlite3.Connection = Depends(get_db)):
    try:
        # Get sale info
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT s.*, c.name as customer_name, c.mobile, c.village
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.customer_id
            WHERE s.sale_id = ?
        """,
            (sale_id,),
        )
        sale = cursor.fetchone()

        if not sale:
            raise HTTPException(status_code=404, detail="Sale not found")

        # Get sale items
        cursor.execute(
            """
            SELECT si.*, p.product_name
            FROM sale_items si
            LEFT JOIN products p ON si.product_id = p.product_id
            WHERE si.sale_id = ?
        """,
            (sale_id,),
        )
        items = [dict(row) for row in cursor.fetchall()]

        # Get payments
        cursor.execute(
            """
            SELECT * FROM payments WHERE sale_id = ?
        """,
            (sale_id,),
        )
        payments = [dict(row) for row in cursor.fetchall()]

        return {"sale": dict(sale), "items": items, "payments": payments}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/sales")
def create_sale(sale_data: SaleCreate, conn: sqlite3.Connection = Depends(get_db)):
    try:
        cursor = conn.cursor()

        # Generate invoice number
        cursor.execute(
            "SELECT MAX(CAST(SUBSTR(invoice_no, 5) AS INTEGER)) FROM sales WHERE invoice_no LIKE 'INV%'"
        )
        result = cursor.fetchone()[0]
        next_num = (result or 0) + 1
        invoice_no = f"INV{next_num:06d}"

        # Calculate totals
        total_amount = sum(item.amount for item in sale_data.items)
        total_liters = sum(item.quantity for item in sale_data.items)

        # Insert sale
        cursor.execute(
            """
            INSERT INTO sales (invoice_no, customer_id, sale_date, total_amount, total_liters, payment_status, notes)
            VALUES (?, ?, ?, ?, ?, 'Pending', ?)
        """,
            (
                invoice_no,
                sale_data.customer_id,
                sale_data.sale_date,
                total_amount,
                total_liters,
                sale_data.notes,
            ),
        )

        sale_id = cursor.lastrowid

        # Insert sale items
        for item in sale_data.items:
            cursor.execute(
                """
                INSERT INTO sale_items (sale_id, product_id, quantity, rate, amount)
                VALUES (?, ?, ?, ?, ?)
            """,
                (sale_id, item.product_id, item.quantity, item.rate, item.amount),
            )

        conn.commit()

        return {
            "sale_id": sale_id,
            "invoice_no": invoice_no,
            "message": "Sale created successfully",
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Payments ====================


@app.get("/api/payments")
def get_payments(
    skip: int = 0, limit: int = 100, conn: sqlite3.Connection = Depends(get_db)
):
    try:
        query = """
        SELECT p.*, s.invoice_no, c.name as customer_name
        FROM payments p
        LEFT JOIN sales s ON p.sale_id = s.sale_id
        LEFT JOIN customers c ON s.customer_id = c.customer_id
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
        """
        df = pd.read_sql_query(query, conn, params=(limit, skip))
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/payments/pending")
def get_pending_payments(conn: sqlite3.Connection = Depends(get_db)):
    try:
        query = """
        SELECT s.sale_id, s.invoice_no, c.name as customer_name, c.mobile, c.village,
               s.total_amount, s.sale_date,
               COALESCE(SUM(p.amount), 0) as paid_amount,
               (s.total_amount - COALESCE(SUM(p.amount), 0)) as pending_amount
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.customer_id
        LEFT JOIN payments p ON s.sale_id = p.sale_id
        WHERE s.payment_status != 'Paid'
        GROUP BY s.sale_id
        HAVING pending_amount > 0
        ORDER BY s.sale_date DESC
        """
        df = pd.read_sql_query(query, conn)
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/payments")
def create_payment(payment: Payment, conn: sqlite3.Connection = Depends(get_db)):
    try:
        cursor = conn.cursor()

        # Insert payment
        cursor.execute(
            """
            INSERT INTO payments (sale_id, payment_date, payment_method, amount, rrn, reference, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
            (
                payment.sale_id,
                payment.payment_date,
                payment.payment_method,
                payment.amount,
                payment.rrn,
                payment.reference,
                payment.notes,
            ),
        )

        # Update sale payment status
        cursor.execute(
            """
            SELECT total_amount, COALESCE(SUM(amount), 0) as total_paid
            FROM sales s
            LEFT JOIN payments p ON s.sale_id = p.sale_id
            WHERE s.sale_id = ?
            GROUP BY s.sale_id
        """,
            (payment.sale_id,),
        )

        result = cursor.fetchone()
        if result:
            total_amount = result[0]
            total_paid = result[1] + payment.amount

            if total_paid >= total_amount:
                payment_status = "Paid"
            elif total_paid > 0:
                payment_status = "Partial"
            else:
                payment_status = "Pending"

            cursor.execute(
                """
                UPDATE sales SET payment_status = ?, updated_date = CURRENT_TIMESTAMP
                WHERE sale_id = ?
            """,
                (payment_status, payment.sale_id),
            )

        conn.commit()
        payment_id = cursor.lastrowid

        return {"payment_id": payment_id, "message": "Payment recorded successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Demos ====================


@app.get("/api/demos")
def get_demos(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    conn: sqlite3.Connection = Depends(get_db),
):
    try:
        query = """
        SELECT d.*, c.name as customer_name, c.village, c.mobile,
               p.product_name, dist.name as distributor_name
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

        query += (
            f" ORDER BY d.demo_date DESC, d.demo_time DESC LIMIT {limit} OFFSET {skip}"
        )

        df = pd.read_sql_query(query, conn, params=params)
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/demos")
def create_demo(demo: Demo, conn: sqlite3.Connection = Depends(get_db)):
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO demos (customer_id, distributor_id, demo_date, demo_time, product_id,
                             quantity_provided, follow_up_date, conversion_status, notes, demo_location)
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
        demo_id = cursor.lastrowid

        return {"demo_id": demo_id, "message": "Demo scheduled successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/demos/{demo_id}")
def update_demo_status(
    demo_id: int,
    conversion_status: str,
    notes: Optional[str] = None,
    conn: sqlite3.Connection = Depends(get_db),
):
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE demos
            SET conversion_status=?, notes=?, updated_date=CURRENT_TIMESTAMP
            WHERE demo_id=?
        """,
            (conversion_status, notes, demo_id),
        )

        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Demo not found")

        return {"message": "Demo updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Distributors ====================


@app.get("/api/distributors")
def get_distributors(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    conn: sqlite3.Connection = Depends(get_db),
):
    try:
        query = "SELECT * FROM distributors WHERE 1=1"
        params = []

        if status:
            query += " AND status = ?"
            params.append(status)

        query += f" ORDER BY created_at DESC LIMIT {limit} OFFSET {skip}"

        cursor = conn.cursor()
        cursor.execute(query, params)
        distributors = [dict(row) for row in cursor.fetchall()]

        return distributors
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/distributors")
def create_distributor(
    distributor: Distributor, conn: sqlite3.Connection = Depends(get_db)
):
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO distributors (name, village, taluka, district, mantri_name, mantri_mobile,
                                    sabhasad_count, contact_in_group, status)
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
        distributor_id = cursor.lastrowid

        return {
            "distributor_id": distributor_id,
            "message": "Distributor created successfully",
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Reports ====================


@app.get("/api/reports/sales-summary")
def get_sales_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    conn: sqlite3.Connection = Depends(get_db),
):
    try:
        query = """
        SELECT
            COUNT(*) as total_sales,
            SUM(total_amount) as total_revenue,
            AVG(total_amount) as avg_sale_value,
            SUM(total_liters) as total_liters
        FROM sales
        WHERE 1=1
        """
        params = []

        if start_date:
            query += " AND sale_date >= ?"
            params.append(start_date)
        if end_date:
            query += " AND sale_date <= ?"
            params.append(end_date)

        cursor = conn.cursor()
        cursor.execute(query, params)
        result = cursor.fetchone()

        return dict(result) if result else {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/reports/customer-summary")
def get_customer_summary(conn: sqlite3.Connection = Depends(get_db)):
    try:
        query = """
        SELECT
            COUNT(*) as total_customers,
            COUNT(CASE WHEN status='Active' THEN 1 END) as active_customers,
            village, COUNT(*) as count
        FROM customers
        GROUP BY village
        ORDER BY count DESC
        LIMIT 10
        """
        df = pd.read_sql_query(query, conn)

        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM customers")
        total = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM customers WHERE status='Active'")
        active = cursor.fetchone()[0]

        return {
            "total_customers": total,
            "active_customers": active,
            "village_distribution": df.to_dict(orient="records"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/reports/product-performance")
def get_product_performance(conn: sqlite3.Connection = Depends(get_db)):
    try:
        query = """
        SELECT p.product_name,
               COUNT(si.item_id) as sales_count,
               SUM(si.quantity) as total_quantity,
               SUM(si.amount) as total_revenue
        FROM sale_items si
        JOIN products p ON si.product_id = p.product_id
        GROUP BY p.product_id, p.product_name
        ORDER BY total_revenue DESC
        """
        df = pd.read_sql_query(query, conn)
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== File Upload ====================


@app.post("/api/upload/excel")
async def upload_excel(file: UploadFile = File(...)):
    try:
        # Save file
        file_path = os.path.join(UPLOAD_DIR, file.filename)

        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        return {
            "filename": file.filename,
            "size": len(content),
            "path": file_path,
            "message": "File uploaded successfully",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/files")
def list_files():
    try:
        files = []
        if os.path.exists(UPLOAD_DIR):
            for filename in os.listdir(UPLOAD_DIR):
                if filename.endswith((".xlsx", ".xls")):
                    file_path = os.path.join(UPLOAD_DIR, filename)
                    files.append(
                        {
                            "filename": filename,
                            "size": os.path.getsize(file_path),
                            "modified": datetime.fromtimestamp(
                                os.path.getmtime(file_path)
                            ).isoformat(),
                        }
                    )
        return files
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Analytics ====================


@app.get("/api/analytics/payment-distribution")
def get_payment_distribution(conn: sqlite3.Connection = Depends(get_db)):
    try:
        query = """
        SELECT payment_method, SUM(amount) as total_amount, COUNT(*) as count
        FROM payments
        GROUP BY payment_method
        """
        df = pd.read_sql_query(query, conn)
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analytics/demo-conversion")
def get_demo_conversion_stats(conn: sqlite3.Connection = Depends(get_db)):
    try:
        query = """
        SELECT conversion_status, COUNT(*) as count
        FROM demos
        GROUP BY conversion_status
        """
        df = pd.read_sql_query(query, conn)
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Data Import Endpoint ====================


@app.post("/api/admin/import-sql")
async def import_sql_data(file: UploadFile = File(...)):
    """
    Import SQL data file to populate the database.
    WARNING: This will execute SQL statements directly!
    """
    try:
        if not file.filename.endswith(".sql"):
            raise HTTPException(status_code=400, detail="File must be a .sql file")

        # Read SQL content
        content = await file.read()
        sql_content = content.decode("utf-8")

        # Connect to database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Execute SQL statements
        statements = sql_content.split(";")
        executed = 0
        errors = []

        for i, statement in enumerate(statements):
            statement = statement.strip()
            if statement and not statement.startswith("--"):
                try:
                    cursor.execute(statement)
                    executed += 1
                except Exception as e:
                    errors.append(f"Statement {i}: {str(e)[:100]}")

        conn.commit()
        conn.close()

        return {
            "message": "SQL import completed",
            "filename": file.filename,
            "statements_executed": executed,
            "errors": errors[:10] if errors else [],
            "total_errors": len(errors),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/admin/import-json")
async def import_json_data(file: UploadFile = File(...)):
    """
    Import JSON data file to populate the database.
    Expects format: {"table_name": [row1, row2, ...], ...}
    """
    try:
        if not file.filename.endswith(".json"):
            raise HTTPException(status_code=400, detail="File must be a .json file")

        # Read JSON content
        content = await file.read()
        data = json.loads(content.decode("utf-8"))

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        total_rows = 0
        table_counts = {}

        for table_name, rows in data.items():
            if not rows:
                continue

            count = 0
            for row in rows:
                columns = list(row.keys())
                placeholders = ", ".join(["?" for _ in columns])
                columns_str = ", ".join(columns)
                values = [row[col] for col in columns]

                try:
                    cursor.execute(
                        f"INSERT INTO {table_name} ({columns_str}) VALUES ({placeholders})",
                        values,
                    )
                    count += 1
                except Exception as e:
                    # Skip rows that already exist or have errors
                    pass

            table_counts[table_name] = count
            total_rows += count

        conn.commit()
        conn.close()

        return {
            "message": "JSON import completed",
            "filename": file.filename,
            "total_rows_imported": total_rows,
            "tables": table_counts,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    print(f"Database path: {DB_PATH}")
    print(f"Database exists: {os.path.exists(DB_PATH)}")
    print("Starting Sales Management API Server...")
    print("API Documentation: http://localhost:8000/docs")
    print("Health Check: http://localhost:8000/health")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
