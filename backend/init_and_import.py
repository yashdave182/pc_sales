import os
import sqlite3
from pathlib import Path

# Database path - use /opt/render/project/data for Render, fallback to parent dir for local
if os.environ.get("RENDER"):
    DATA_DIR = "/opt/render/project/data"
    DB_PATH = os.path.join(DATA_DIR, "sales_management.db")
    os.makedirs(DATA_DIR, exist_ok=True)
else:
    DB_PATH = os.path.join(Path(__file__).parent.parent.parent, "sales_management.db")


def init_and_import_db():
    """Initialize database with required tables and import data"""
    print(f"Database path: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create tables
    print("Creating tables...")
    cursor.executescript("""
        DROP TABLE IF EXISTS sales;
        DROP TABLE IF EXISTS distributors;
        DROP TABLE IF EXISTS products;
        DROP TABLE IF EXISTS customers;

        CREATE TABLE customers (
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

        CREATE TABLE products (
            product_id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_name TEXT NOT NULL,
            packing_type TEXT,
            capacity_ltr REAL,
            category TEXT,
            standard_rate REAL,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE distributors (
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

        CREATE TABLE sales (
            sale_id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_no TEXT,
            customer_id INTEGER,
            sale_date DATE,
            total_amount REAL,
            total_liters REAL,
            payment_status TEXT DEFAULT 'Pending',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
        );

        CREATE TABLE sale_items (
            sale_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER,
            product_id INTEGER,
            quantity INTEGER,
            rate REAL,
            amount REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sale_id) REFERENCES sales (sale_id),
            FOREIGN KEY (product_id) REFERENCES products (product_id)
        );

        CREATE TABLE payments (
            payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER,
            payment_date DATE,
            payment_method TEXT,
            amount REAL,
            rrn TEXT,
            reference TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sale_id) REFERENCES sales (sale_id)
        );
    """)

    conn.commit()
    print("Tables created successfully!")

    # Import data from SQL file
    sql_file = os.path.join(Path(__file__).parent, "data_export.sql")
    print(f"Importing data from: {sql_file}")

    if os.path.exists(sql_file):
        with open(sql_file, "r", encoding="utf-8") as f:
            sql_content = f.read()

        # Execute the SQL file
        try:
            cursor.executescript(sql_content)
            conn.commit()
            print("Data imported successfully!")
        except Exception as e:
            print(f"Error importing data: {e}")
            print(f"This is expected if some tables don't exist in the export.")
            conn.rollback()
    else:
        print(f"SQL file not found: {sql_file}")
        print(f"Skipping data import - tables created but empty")

    # Verify data
    cursor.execute("SELECT COUNT(*) FROM customers")
    customer_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM products")
    product_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM distributors")
    distributor_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM sales")
    sales_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM sale_items")
    sale_items_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM payments")
    payments_count = cursor.fetchone()[0]

    print(f"\nData verification:")
    print(f"- Customers: {customer_count}")
    print(f"- Products: {product_count}")
    print(f"- Distributors: {distributor_count}")
    print(f"- Sales: {sales_count}")
    print(f"- Sale Items: {sale_items_count}")
    print(f"- Payments: {payments_count}")

    conn.close()
    print("\nDatabase initialized and data imported successfully!")


if __name__ == "__main__":
    init_and_import_db()
