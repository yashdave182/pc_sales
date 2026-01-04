"""
Quick test script to verify Supabase connection
"""

from supabase_db import get_supabase


def test_connection():
    print("=" * 60)
    print("TESTING SUPABASE CONNECTION")
    print("=" * 60)

    try:
        # Get Supabase client
        db = get_supabase()
        print("✅ Supabase client initialized")

        # Test customers table
        customers = db.table("customers").select("customer_id").limit(1).execute()
        print(f"✅ Customers table accessible: {len(customers.data)} record(s)")

        # Test products table
        products = db.table("products").select("product_id").limit(1).execute()
        print(f"✅ Products table accessible: {len(products.data)} record(s)")

        # Test sales table
        sales = db.table("sales").select("sale_id").limit(1).execute()
        print(f"✅ Sales table accessible: {len(sales.data)} record(s)")

        # Test payments table
        payments = db.table("payments").select("payment_id").limit(1).execute()
        print(f"✅ Payments table accessible: {len(payments.data)} record(s)")

        print("\n" + "=" * 60)
        print("✅ ALL TESTS PASSED - SUPABASE IS READY!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        print("\nPlease check:")
        print("1. .env file has correct SUPABASE_URL and SUPABASE_KEY")
        print("2. Supabase tables are created")
        print("3. RLS policies are configured")


if __name__ == "__main__":
    test_connection()
