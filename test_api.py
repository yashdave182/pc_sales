import json

import requests

BASE_URL = "http://localhost:8000"


def test_health():
    """Test health check endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"✓ Health Check: {response.status_code}")
        print(f"  Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"✗ Health Check Failed: {e}")
        return False


def test_customers():
    """Test customers endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/api/customers")
        print(f"✓ Customers API: {response.status_code}")
        data = response.json()
        print(f"  Total customers: {data.get('total', 0)}")
        print(f"  Customers returned: {len(data.get('customers', []))}")
        if data.get("customers"):
            print(f"  First customer: {data['customers'][0].get('name', 'N/A')}")
        return response.status_code == 200
    except Exception as e:
        print(f"✗ Customers API Failed: {e}")
        return False


def test_products():
    """Test products endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/api/products")
        print(f"✓ Products API: {response.status_code}")
        data = response.json()
        print(f"  Total products: {len(data)}")
        if data:
            print(f"  First product: {data[0].get('product_name', 'N/A')}")
        return response.status_code == 200
    except Exception as e:
        print(f"✗ Products API Failed: {e}")
        return False


def test_sales():
    """Test sales endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/api/sales")
        print(f"✓ Sales API: {response.status_code}")
        data = response.json()
        print(f"  Total sales: {data.get('total', 0)}")
        print(f"  Sales returned: {len(data.get('sales', []))}")
        return response.status_code == 200
    except Exception as e:
        print(f"✗ Sales API Failed: {e}")
        return False


def test_distributors():
    """Test distributors endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/api/distributors")
        print(f"✓ Distributors API: {response.status_code}")
        data = response.json()
        print(f"  Total distributors: {data.get('total', 0)}")
        print(f"  Distributors returned: {len(data.get('distributors', []))}")
        return response.status_code == 200
    except Exception as e:
        print(f"✗ Distributors API Failed: {e}")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("Testing Sales Management API Endpoints")
    print("=" * 60)
    print()

    tests = [
        ("Health Check", test_health),
        ("Customers", test_customers),
        ("Products", test_products),
        ("Sales", test_sales),
        ("Distributors", test_distributors),
    ]

    results = []
    for test_name, test_func in tests:
        print(f"\n--- Testing {test_name} ---")
        result = test_func()
        results.append((test_name, result))
        print()

    print("=" * 60)
    print("Test Summary")
    print("=" * 60)
    passed = sum(1 for _, r in results if r)
    total = len(results)

    for test_name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {test_name}")

    print()
    print(f"Results: {passed}/{total} tests passed")
    print("=" * 60)
