from pathlib import Path

import requests

# Production API URL
API_URL = "https://pc-sales-8phu.onrender.com"

# Path to exported data files
SCRIPT_DIR = Path(__file__).parent
SQL_FILE = SCRIPT_DIR / "data_export.sql"
JSON_FILE = SCRIPT_DIR / "data_export.json"


def upload_json_data():
    """Upload JSON data to production database"""

    if not JSON_FILE.exists():
        print(f"❌ JSON file not found: {JSON_FILE}")
        print("Please run export_data.py first!")
        return False

    print(f"📤 Uploading JSON data to {API_URL}...")
    print(f"File: {JSON_FILE}")
    print(f"Size: {JSON_FILE.stat().st_size / 1024:.2f} KB\n")

    try:
        with open(JSON_FILE, "rb") as f:
            files = {"file": ("data_export.json", f, "application/json")}
            response = requests.post(
                f"{API_URL}/api/admin/import-json",
                files=files,
                timeout=300,  # 5 minute timeout for large files
            )

        if response.status_code == 200:
            result = response.json()
            print("✅ JSON import successful!")
            print(f"\nResults:")
            print(f"  Total rows imported: {result['total_rows_imported']}")
            print(f"\nRows per table:")
            for table, count in result.get("tables", {}).items():
                print(f"  - {table}: {count} rows")
            return True
        else:
            print(f"❌ Import failed with status {response.status_code}")
            print(f"Error: {response.text}")
            return False

    except requests.exceptions.Timeout:
        print("❌ Request timed out. The file might be too large.")
        print("Try using the SQL import method instead.")
        return False
    except Exception as e:
        print(f"❌ Error during upload: {e}")
        return False


def upload_sql_data():
    """Upload SQL data to production database"""

    if not SQL_FILE.exists():
        print(f"❌ SQL file not found: {SQL_FILE}")
        print("Please run export_data.py first!")
        return False

    print(f"📤 Uploading SQL data to {API_URL}...")
    print(f"File: {SQL_FILE}")
    print(f"Size: {SQL_FILE.stat().st_size / 1024:.2f} KB\n")

    try:
        with open(SQL_FILE, "rb") as f:
            files = {"file": ("data_export.sql", f, "application/sql")}
            response = requests.post(
                f"{API_URL}/api/admin/import-sql",
                files=files,
                timeout=300,  # 5 minute timeout for large files
            )

        if response.status_code == 200:
            result = response.json()
            print("✅ SQL import successful!")
            print(f"\nResults:")
            print(f"  Statements executed: {result['statements_executed']}")
            print(f"  Total errors: {result['total_errors']}")

            if result.get("errors"):
                print(f"\nFirst few errors:")
                for error in result["errors"][:5]:
                    print(f"  - {error}")
            return True
        else:
            print(f"❌ Import failed with status {response.status_code}")
            print(f"Error: {response.text}")
            return False

    except requests.exceptions.Timeout:
        print("❌ Request timed out. The file might be too large.")
        return False
    except Exception as e:
        print(f"❌ Error during upload: {e}")
        return False


def verify_import():
    """Verify data was imported correctly"""

    print("\n🔍 Verifying import...")

    try:
        # Check health endpoint
        response = requests.get(f"{API_URL}/health", timeout=10)
        if response.status_code != 200:
            print("❌ Health check failed")
            return False

        print("✅ Backend is healthy")

        # Check if data exists
        endpoints = [
            ("customers", "/api/customers?limit=1"),
            ("products", "/api/products"),
            ("distributors", "/api/distributors?limit=1"),
            ("sales", "/api/sales?limit=1"),
        ]

        print("\n📊 Checking data in tables:")
        for name, endpoint in endpoints:
            try:
                response = requests.get(f"{API_URL}{endpoint}", timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    count = len(data) if isinstance(data, list) else 0
                    print(f"  ✅ {name}: Data available ({count} rows fetched)")
                else:
                    print(f"  ⚠️  {name}: Error (status {response.status_code})")
            except Exception as e:
                print(f"  ❌ {name}: {e}")

        return True

    except Exception as e:
        print(f"❌ Verification failed: {e}")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("  Sales Management - Production Data Import")
    print("=" * 60)
    print()

    # Check if backend is accessible
    print(f"🔗 Checking backend at {API_URL}...")
    try:
        response = requests.get(f"{API_URL}/health", timeout=10)
        if response.status_code == 200:
            print("✅ Backend is accessible\n")
        else:
            print(f"⚠️  Backend returned status {response.status_code}\n")
    except Exception as e:
        print(f"❌ Cannot reach backend: {e}")
        print("Please make sure the backend is deployed and running!")
        exit(1)

    # Ask user which method to use
    print("Choose import method:")
    print("  1. JSON import (recommended - faster, more reliable)")
    print("  2. SQL import (alternative method)")
    print()

    choice = input("Enter your choice (1 or 2): ").strip()
    print()

    if choice == "1":
        success = upload_json_data()
    elif choice == "2":
        success = upload_sql_data()
    else:
        print("❌ Invalid choice. Please run the script again.")
        exit(1)

    if success:
        verify_import()
        print("\n" + "=" * 60)
        print("🎉 Data import complete!")
        print("=" * 60)
        print(f"\nYour production app is ready at:")
        print(f"  Frontend: https://pc-sales.vercel.app")
        print(f"  Backend:  {API_URL}")
        print(f"  API Docs: {API_URL}/docs")
    else:
        print("\n" + "=" * 60)
        print("❌ Data import failed")
        print("=" * 60)
        print("\nPlease check the errors above and try again.")
        print("If the file is too large, you may need to:")
        print("  1. Split the data into smaller chunks")
        print("  2. Use a different import method")
        print("  3. Import directly via database access")
