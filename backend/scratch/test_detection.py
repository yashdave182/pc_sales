import pandas as pd
import os
import sys

# Add backend to path to import excel_loader
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from excel_loader import detect_excel_type

def create_mock_excel(path, data, sheet_name="Sheet1"):
    df = pd.DataFrame(data)
    df.to_excel(path, index=False, sheet_name=sheet_name)

def test_detection():
    # 1. Test Distributor Excel
    dist_path = "test_dist.xlsx"
    dist_data = {
        "Dairy Name": ["Dairy A", "Dairy B"],
        "Mantri Name": ["Mantri 1", "Mantri 2"],
        "Sabhasad_count": [10, 20],
        "Milk_collection": [100, 200]
    }
    create_mock_excel(dist_path, dist_data)
    
    # 2. Test Sabhasad Excel
    sabh_path = "test_sabh.xlsx"
    sabh_data = {
        "Sabhasad Name": ["Sabh 1", "Sabh 2"],
        "Mobile": ["9876543210", "1234567890"],
        "Village": ["Village A", "Village B"]
    }
    create_mock_excel(sabh_path, sabh_data)

    # 3. Test Unknown Excel
    unknown_path = "test_unknown.xlsx"
    unknown_data = {
        "Random": ["Data 1", "Data 2"],
        "Stuff": ["X", "Y"]
    }
    create_mock_excel(unknown_path, unknown_data)

    print("--- Starting Detection Tests ---")
    
    res_dist = detect_excel_type(dist_path)
    print(f"Distributor File: Expected DISTRIBUTORS, Got {res_dist}")

    res_sabh = detect_excel_type(sabh_path)
    print(f"Sabhasad File: Expected SABHASAD, Got {res_sabh}")

    res_unknown = detect_excel_type(unknown_path)
    print(f"Unknown File: Expected UNKNOWN, Got {res_unknown}")

    # Cleanup
    for p in [dist_path, sabh_path, unknown_path]:
        if os.path.exists(p):
            os.remove(p)

if __name__ == "__main__":
    test_detection()
