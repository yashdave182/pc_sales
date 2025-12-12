import json
import sqlite3
import sys
from pathlib import Path

# Path to local database
DB_PATH = Path(__file__).parent.parent.parent / "sales_management.db"


def export_to_sql():
    """Export all data as SQL INSERT statements"""

    if not DB_PATH.exists():
        print(f"Error: Database not found at {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get all table names
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    )
    tables = [row[0] for row in cursor.fetchall()]

    # Column name mapping (old -> new)
    column_mapping = {
        "created_date": "created_at",
    }

    # Columns to exclude from export (don't exist in new schema)
    # Format: {"table_name": ["column1", "column2"]}
    excluded_columns_by_table = {
        "sale_items": ["item_id"],
        "payments": ["status"],
    }
    # Columns to exclude from all tables
    global_excluded_columns = {"updated_at", "updated_date"}

    output_file = Path(__file__).parent / "data_export.sql"

    with open(output_file, "w", encoding="utf-8") as f:
        f.write("-- Data export from sales_management.db\n")
        f.write("-- Generated automatically\n")
        f.write("-- Column names mapped: created_date -> created_at\n\n")

        for table in tables:
            print(f"Exporting table: {table}")

            # Get all rows
            cursor.execute(f"SELECT * FROM {table}")
            rows = cursor.fetchall()

            if not rows:
                print(f"  - No data in {table}")
                continue

            print(f"  - Found {len(rows)} rows")

            # Get column names and map them
            columns = [description[0] for description in cursor.description]
            # Get table-specific excluded columns
            table_excluded = excluded_columns_by_table.get(table, [])
            # Filter out excluded columns
            filtered_data = []
            for i, col in enumerate(columns):
                if col not in global_excluded_columns and col not in table_excluded:
                    filtered_data.append((i, column_mapping.get(col, col)))

            if not filtered_data:
                continue

            column_indices = [idx for idx, _ in filtered_data]
            mapped_columns = [col for _, col in filtered_data]

            f.write(f"\n-- Table: {table} ({len(rows)} rows)\n")

            for row in rows:
                values = []
                for idx in column_indices:
                    value = row[idx]
                    if value is None:
                        values.append("NULL")
                    elif isinstance(value, str):
                        # Escape single quotes
                        escaped = value.replace("'", "''")
                        values.append(f"'{escaped}'")
                    elif isinstance(value, (int, float)):
                        values.append(str(value))
                    else:
                        values.append(f"'{value}'")

                columns_str = ", ".join(mapped_columns)
                values_str = ", ".join(values)
                f.write(f"INSERT INTO {table} ({columns_str}) VALUES ({values_str});\n")

    conn.close()

    print(f"\n✅ Export complete! SQL file saved to: {output_file}")
    print(f"File size: {output_file.stat().st_size / 1024:.2f} KB")
    return output_file


def export_to_json():
    """Export all data as JSON for backup"""

    if not DB_PATH.exists():
        print(f"Error: Database not found at {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get all table names
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    )
    tables = [row[0] for row in cursor.fetchall()]

    data = {}

    for table in tables:
        print(f"Exporting table: {table}")
        cursor.execute(f"SELECT * FROM {table}")
        rows = cursor.fetchall()
        data[table] = [dict(row) for row in rows]
        print(f"  - {len(rows)} rows")

    output_file = Path(__file__).parent / "data_export.json"

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)

    conn.close()

    print(f"\n✅ JSON export complete! File saved to: {output_file}")
    print(f"File size: {output_file.stat().st_size / 1024:.2f} KB")
    return output_file


if __name__ == "__main__":
    print("=== Sales Management Data Export ===\n")
    print(f"Database: {DB_PATH}\n")

    # Export to both formats
    sql_file = export_to_sql()
    json_file = export_to_json()

    print("\n=== Export Summary ===")
    print(f"SQL:  {sql_file}")
    print(f"JSON: {json_file}")
    print("\nYou can now import the SQL file to your production database!")
