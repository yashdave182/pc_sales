import pandas as pd
import os
import sys

# Add backend to path to import clean_excel_customers
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from clean_excel_customers import extract_sabhasad

def verify_import():
    test_file = "test_leading_zeros.xlsx"
    
    # Create test data
    data = {
        "Sabhasad Name": ["John Doe", "Jane Smith", "Bob Brown", "Alice White"],
        "Mobile": ["9876543210", "1234567890", "5556667777", "9998887776"],
        "Village": ["Village A", "Village B", "Village C", "Village D"],
        "Customer Code": ["0001", "123", "0045.0", "9999"],
        "Aadhar": ["123456789012", "234567890123", "345678901234", "456789012345"]
    }
    
    df = pd.DataFrame(data)
    df.to_excel(test_file, index=False)
    
    print(f"--- Testing extraction from {test_file} ---")
    try:
        records = extract_sabhasad(test_file)
        
        expected_codes = ["0001", "123", "0045", "9999"]
        
        success = True
        for i, rec in enumerate(records):
            code = rec["customer_code"]
            expected = expected_codes[i]
            print(f"Row {i}: Name={rec['name']}, Code={code} (Expected={expected})")
            if code != expected:
                print(f"  ❌ Mismatch for {rec['name']}: got {code}, expected {expected}")
                success = False
        
        if success:
            print("\n✅ Verification SUCCESS: Leading zeros and formatting preserved correctly.")
        else:
            print("\n❌ Verification FAILED: Formatting issues detected.")
            
    finally:
        if os.path.exists(test_file):
            os.remove(test_file)

if __name__ == "__main__":
    verify_import()
