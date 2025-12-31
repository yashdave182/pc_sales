import json
import sqlite3
from pathlib import Path

from database import DB_PATH, init_db

BASE_DIR = Path(__file__).parent
JSON_FILE = BASE_DIR / "data_export.json"
SQL_FILE = BASE_DIR / "data_export.sql"


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _get_table_columns(conn: sqlite3.Connection, table: str) -> set[str]:
    cur = conn.cursor()
    try:
        cur.execute(f"PRAGMA table_info({table})")
        return {row["name"] for row in cur.fetchall()}
    except Exception:
        return set()


def _safe_count(conn: sqlite3.Connection, table: str) -> int:
    cur = conn.cursor()
    try:
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        return int(cur.fetchone()[0])
    except Exception:
        return 0


def _import_json(conn: sqlite3.Connection, path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    cur = conn.cursor()
    cur.execute("PRAGMA foreign_keys = OFF")
    conn.commit()

    results: dict[str, dict] = {}
    total_rows = 0
    total_errors = 0

    for table, rows in data.items():
        cols_in_db = _get_table_columns(conn, table)
        if not cols_in_db:
            results[table] = {"inserted": 0, "errors": 0, "skipped": 0}
            continue

        inserted = 0
        errors = 0
        skipped = 0

        for row in rows if isinstance(rows, list) else []:
            if not isinstance(row, dict):
                skipped += 1
                continue

            filtered = {k: v for k, v in row.items() if k in cols_in_db}
            if not filtered:
                skipped += 1
                continue

            columns = list(filtered.keys())
            placeholders = ",".join(["?"] * len(columns))
            collist = ",".join(columns)
            values = [filtered[c] for c in columns]

            try:
                cur.execute(
                    f"INSERT OR IGNORE INTO {table} ({collist}) VALUES ({placeholders})",
                    values,
                )
                inserted += cur.rowcount if cur.rowcount is not None else 0
            except Exception:
                errors += 1

        results[table] = {"inserted": inserted, "errors": errors, "skipped": skipped}
        total_rows += inserted
        total_errors += errors

    conn.commit()
    cur.execute("PRAGMA foreign_keys = ON")
    conn.commit()

    results["_summary"] = {
        "total_rows_imported": total_rows,
        "total_errors": total_errors,
    }
    return results


def _import_sql(conn: sqlite3.Connection, path: Path) -> dict:
    sql = path.read_text(encoding="utf-8")
    statements = [s for s in sql.split(";") if s.strip()]
    cur = conn.cursor()
    cur.execute("PRAGMA foreign_keys = OFF")
    conn.commit()
    try:
        cur.executescript(sql)
        conn.commit()
        executed = len(statements)
        errors = 0
    except Exception:
        conn.rollback()
        executed = 0
        errors = 1
    finally:
        cur.execute("PRAGMA foreign_keys = ON")
        conn.commit()

    return {"statements_executed": executed, "total_errors": errors}


def init_and_import_db() -> dict:
    init_db()
    conn = _connect()

    result = {"initialized": True, "import": None, "verification": {}}

    if JSON_FILE.exists():
        result["import"] = {"type": "json", "file": str(JSON_FILE)}
        result["import"].update(_import_json(conn, JSON_FILE))
    elif SQL_FILE.exists():
        result["import"] = {"type": "sql", "file": str(SQL_FILE)}
        result["import"].update(_import_sql(conn, SQL_FILE))
    else:
        result["import"] = {
            "type": "none",
            "message": "No data_export.json or data_export.sql found",
        }

    for table in [
        "customers",
        "products",
        "distributors",
        "sales",
        "payments",
        "demos",
    ]:
        result["verification"][table] = _safe_count(conn, table)

    conn.close()
    return result


if __name__ == "__main__":
    info = init_and_import_db()
    print(json.dumps(info, indent=2, default=str))
