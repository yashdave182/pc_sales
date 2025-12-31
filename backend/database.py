import sqlite3
import os
from pathlib import Path

# ======================
# Paths
# ======================

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_DIR = DATA_DIR / "db"

DB_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DB_DIR / "sales.db"


# ======================
# Database Connection
# ======================

def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


# ======================
# Database Initialization
# ======================

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.executescript(
        """
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
        """
    )

    conn.commit()
    conn.close()
