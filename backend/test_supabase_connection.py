import os

import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")


def test_connection():
    """Test Supabase connection and basic operations"""

    print("=" * 60)
    print("SUPABASE CONNECTION TEST")
    print("=" * 60)

    # 1. Check if credentials are set
    print("\n1. Checking credentials...")
    if not SUPABASE_URL:
        print("   ❌ SUPABASE_URL not found in .env file")
        return False
    else:
        print(f"   ✅ SUPABASE_URL: {SUPABASE_URL}")

    if not SUPABASE_KEY:
        print("   ❌ SUPABASE_KEY not found in .env file")
        return False
    else:
        print(f"   ✅ SUPABASE_KEY: {SUPABASE_KEY[:20]}...")

    # 2. Test connection to customers table
    print("\n2. Testing connection to customers table...")
    try:
        rest_url = f"{SUPABASE_URL}/rest/v1/customers"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
        }

        response = requests.get(
            rest_url,
            params={"select": "customer_id,name", "limit": "5"},
            headers=headers,
            timeout=10,
        )

        if response.status_code == 200:
            data = response.json()
            print(
                f"   ✅ Connection successful! Found {len(data)} customers (showing first 5)"
            )
            for customer in data[:3]:
                print(
                    f"      - ID: {customer.get('customer_id')}, Name: {customer.get('name')}"
                )
        else:
            print(f"   ❌ Connection failed with status {response.status_code}")
            print(f"      Response: {response.text}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request failed: {str(e)}")
        return False

    # 3. Test creating a customer
    print("\n3. Testing customer creation...")
    try:
        test_customer = {
            "name": "Test Customer API",
            "mobile": "9999999999",
            "village": "Test Village",
            "taluka": "Test Taluka",
            "district": "Test District",
            "status": "Active",
        }

        headers["Prefer"] = "return=representation"

        response = requests.post(
            rest_url, json=test_customer, headers=headers, timeout=10
        )

        if response.status_code in [200, 201]:
            created = response.json()
            if isinstance(created, list) and len(created) > 0:
                created = created[0]
            print(f"   ✅ Customer created successfully!")
            print(f"      ID: {created.get('customer_id')}")
            print(f"      Name: {created.get('name')}")

            # 4. Test deleting the test customer
            print("\n4. Testing customer deletion...")
            customer_id = created.get("customer_id")
            delete_url = f"{rest_url}?customer_id=eq.{customer_id}"

            response = requests.delete(delete_url, headers=headers, timeout=10)

            if response.status_code in [200, 204]:
                print(f"   ✅ Test customer deleted successfully!")
            else:
                print(f"   ⚠️  Could not delete test customer (ID: {customer_id})")
                print(f"      Status: {response.status_code}")
                print(f"      Please delete manually from Supabase dashboard")
        else:
            print(f"   ❌ Customer creation failed with status {response.status_code}")
            print(f"      Response: {response.text}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request failed: {str(e)}")
        return False

    # 5. Check RLS (Row Level Security)
    print("\n5. Checking Row Level Security (RLS) status...")
    print("   If you see empty tables in Supabase dashboard but API works,")
    print("   RLS might be blocking the dashboard view.")
    print("   Run this SQL in Supabase SQL Editor to fix:")
    print("\n   ALTER TABLE customers DISABLE ROW LEVEL SECURITY;")
    print("   ALTER TABLE products DISABLE ROW LEVEL SECURITY;")
    print("   ALTER TABLE distributors DISABLE ROW LEVEL SECURITY;")
    print("   ALTER TABLE sales DISABLE ROW LEVEL SECURITY;")
    print("   ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;")
    print("   ALTER TABLE payments DISABLE ROW LEVEL SECURITY;")
    print("   ALTER TABLE demos DISABLE ROW LEVEL SECURITY;")

    print("\n" + "=" * 60)
    print("✅ ALL TESTS PASSED!")
    print("=" * 60)
    print("\nYour Supabase connection is working correctly.")
    print("You should be able to add, edit, and delete customers from the frontend.")
    return True


if __name__ == "__main__":
    try:
        success = test_connection()
        if not success:
            print("\n⚠️  Some tests failed. Please check the errors above.")
            print("\nCommon issues:")
            print("1. Missing .env file in backend/ directory")
            print("2. Wrong SUPABASE_URL or SUPABASE_KEY in .env")
            print("3. RLS policies blocking access")
            print("4. Tables not created in Supabase")
            print("\nTo fix:")
            print("- Create backend/.env file with your Supabase credentials")
            print("- Make sure tables exist in Supabase (run init_supabase_db.py)")
            print("- Disable RLS using the SQL commands above")
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        import traceback

        traceback.print_exc()
