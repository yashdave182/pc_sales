import sqlite3
from datetime import datetime
from typing import Any, Dict

from database import get_db
from fastapi import APIRouter, Depends, Query

router = APIRouter()


@router.get("/calling-list")
def get_daily_calling_list(
    inactive_days: int = Query(30),
    limit: int = Query(50),
    conn: sqlite3.Connection = Depends(get_db),
) -> Dict[str, Any]:
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT
            c.customer_id,
            c.name,
            c.mobile,
            c.village,
            c.taluka,
            MAX(s.sale_date) AS last_purchase_date,
            COALESCE(julianday('now') - julianday(MAX(s.sale_date)), 999) AS days_since_purchase,
            COALESCE(SUM(s.total_amount), 0) AS lifetime_value,
            COUNT(s.sale_id) AS total_purchases
        FROM customers c
        LEFT JOIN sales s ON c.customer_id = s.customer_id
        WHERE c.status = 'Active'
        GROUP BY c.customer_id
        HAVING MAX(s.sale_date) IS NULL OR (julianday('now') - julianday(MAX(s.sale_date)) > ?)
        ORDER BY lifetime_value DESC, days_since_purchase DESC
        LIMIT ?
        """,
        (inactive_days, limit),
    )
    inactive_customers = [
        {
            **dict(row),
            "priority": "High"
            if row["lifetime_value"] > 10000
            else "Medium"
            if row["lifetime_value"] > 5000
            else "Low",
            "reason": "High-value inactive customer"
            if row["lifetime_value"] > 10000
            else "Inactive customer",
            "days_since_purchase": int(row["days_since_purchase"]),
        }
        for row in cursor.fetchall()
    ]

    cursor.execute(
        """
        SELECT
            c.customer_id,
            c.name,
            c.mobile,
            c.village,
            d.demo_date,
            d.follow_up_date,
            p.product_name,
            d.conversion_status,
            d.notes
        FROM demos d
        JOIN customers c ON d.customer_id = c.customer_id
        LEFT JOIN products p ON d.product_id = p.product_id
        WHERE d.conversion_status IN ('Scheduled', 'Completed')
          AND (
            (d.follow_up_date IS NOT NULL AND date(d.follow_up_date) <= date('now', '+7 days'))
            OR (d.follow_up_date IS NULL AND date(d.demo_date) <= date('now'))
          )
        ORDER BY
          CASE
            WHEN d.follow_up_date IS NOT NULL THEN date(d.follow_up_date)
            ELSE date(d.demo_date)
          END ASC
        LIMIT ?
        """,
        (limit,),
    )
    demo_followups = [
        {
            **dict(row),
            "priority": "High",
            "reason": "Demo follow-up pending",
        }
        for row in cursor.fetchall()
    ]

    cursor.execute(
        """
        SELECT
            c.customer_id,
            c.name,
            c.mobile,
            c.village,
            COALESCE(SUM(s.total_amount), 0) AS total_sales,
            COALESCE(SUM(p.amount), 0) AS total_payments,
            COALESCE(SUM(s.total_amount), 0) - COALESCE(SUM(p.amount), 0) AS outstanding_balance,
            MAX(s.sale_date) AS last_sale_date
        FROM customers c
        JOIN sales s ON c.customer_id = s.customer_id
        LEFT JOIN payments p ON s.sale_id = p.sale_id
        WHERE c.status = 'Active'
        GROUP BY c.customer_id
        HAVING (COALESCE(SUM(s.total_amount), 0) - COALESCE(SUM(p.amount), 0)) > 0
        ORDER BY outstanding_balance DESC
        LIMIT ?
        """,
        (limit,),
    )
    outstanding_customers = [
        {
            **dict(row),
            "priority": "High" if row["outstanding_balance"] > 5000 else "Medium",
            "reason": "Outstanding payment",
            "outstanding_balance": round(row["outstanding_balance"], 2),
        }
        for row in cursor.fetchall()
    ]

    cursor.execute(
        """
        SELECT
            COUNT(DISTINCT CASE WHEN s.days_inactive > ? OR s.days_inactive IS NULL THEN c.customer_id END) AS total_inactive,
            COUNT(DISTINCT CASE WHEN d.conversion_status IN ('Scheduled', 'Completed') THEN c.customer_id END) AS total_pending_demos,
            COUNT(DISTINCT CASE WHEN o.outstanding > 0 THEN c.customer_id END) AS total_outstanding
        FROM customers c
        LEFT JOIN (
            SELECT customer_id, MAX(julianday('now') - julianday(sale_date)) AS days_inactive
            FROM sales
            GROUP BY customer_id
        ) s ON c.customer_id = s.customer_id
        LEFT JOIN demos d ON c.customer_id = d.customer_id
        LEFT JOIN (
            SELECT s.customer_id, COALESCE(SUM(s.total_amount), 0) - COALESCE(SUM(p.amount), 0) AS outstanding
            FROM sales s
            LEFT JOIN payments p ON s.sale_id = p.sale_id
            GROUP BY s.customer_id
        ) o ON c.customer_id = o.customer_id
        WHERE c.status = 'Active'
        """,
        (inactive_days,),
    )
    stats_row = cursor.fetchone()
    stats = (
        dict(stats_row)
        if stats_row
        else {"total_inactive": 0, "total_pending_demos": 0, "total_outstanding": 0}
    )

    combined = inactive_customers + demo_followups + outstanding_customers

    return {
        "generated_at": datetime.now().isoformat(),
        "inactive_days_threshold": inactive_days,
        "summary": {
            "total_inactive_customers": int(stats.get("total_inactive") or 0),
            "total_pending_demos": int(stats.get("total_pending_demos") or 0),
            "total_outstanding_payments": int(stats.get("total_outstanding") or 0),
            "total_calls_suggested": len(combined),
        },
        "calling_priorities": {
            "high_priority": [c for c in combined if c.get("priority") == "High"],
            "medium_priority": [c for c in combined if c.get("priority") == "Medium"],
            "low_priority": [c for c in combined if c.get("priority") == "Low"],
        },
        "segments": {
            "inactive_customers": inactive_customers[:20],
            "demo_followups": demo_followups[:20],
            "outstanding_payments": outstanding_customers[:20],
        },
    }


@router.get("/insights/inactive")
def get_inactive_insights(
    inactive_days: int = Query(30), conn: sqlite3.Connection = Depends(get_db)
) -> Dict[str, Any]:
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT
            c.taluka,
            COUNT(DISTINCT c.customer_id) AS inactive_count,
            COALESCE(SUM(ps.total_value), 0) AS lost_revenue_potential
        FROM customers c
        LEFT JOIN (
            SELECT customer_id, SUM(total_amount) AS total_value
            FROM sales
            GROUP BY customer_id
        ) ps ON c.customer_id = ps.customer_id
        LEFT JOIN (
            SELECT customer_id, MAX(sale_date) AS last_sale
            FROM sales
            GROUP BY customer_id
        ) rs ON c.customer_id = rs.customer_id
        WHERE c.status = 'Active'
          AND (rs.last_sale IS NULL OR (julianday('now') - julianday(rs.last_sale) > ?))
        GROUP BY c.taluka
        ORDER BY inactive_count DESC
        """,
        (inactive_days,),
    )
    by_region = [dict(row) for row in cursor.fetchall()]
    return {
        "inactive_threshold_days": inactive_days,
        "insights": {"by_region": by_region},
    }
