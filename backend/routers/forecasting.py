"""
Phase 5 — Forecasting Engine
Rule-based forecasting using historical averages + seasonal multipliers.

Forecasting levels:
  1. Month-wise overall revenue/volume forecast (rolling window avg + seasonal)
  2. District-wise next-month forecast
  3. Village-wise next-month forecast
"""

from datetime import datetime, timedelta, date
from typing import Optional, List, Dict
from collections import defaultdict
import calendar
import math

from fastapi import APIRouter, Depends, Header, HTTPException
from supabase_db import SupabaseClient, get_db
from rbac_utils import verify_permission

router = APIRouter()


# ─── Auth helper ────────────────────────────────────────────────────────────
def get_user_email(user_email: Optional[str] = Header(None, alias="x-user-email")):
    if not user_email:
        raise HTTPException(status_code=401, detail="User email not provided")
    return user_email


# ─── Seasonal multipliers (relative to annual average = 1.0) ────────────────
# Dairy/agri product pattern — higher in winter (Nov–Feb), lower in monsoon
SEASONAL_MULTIPLIERS: Dict[int, float] = {
    1: 1.15,   # Jan  — high (cold, cattle need supplements)
    2: 1.10,   # Feb
    3: 1.00,   # Mar
    4: 0.95,   # Apr
    5: 0.90,   # May
    6: 0.80,   # Jun  — monsoon start, market slow
    7: 0.75,   # Jul  — peak monsoon
    8: 0.78,   # Aug
    9: 0.85,   # Sep
    10: 0.95,  # Oct  — festival pickup
    11: 1.15,  # Nov  — post-monsoon boom
    12: 1.20,  # Dec  — peak season
}

# Per-litre average selling price fallback (Rs.) — used for revenue forecast when no history
DEFAULT_PRICE_PER_LITER = 300.0


# ─── Utility ────────────────────────────────────────────────────────────────
def _parse_date(s: str) -> Optional[date]:
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


def _month_key(d: date) -> str:
    return d.strftime("%Y-%m")


def _next_n_months(from_date: date, n: int = 6) -> List[date]:
    """Return first day of next N calendar months."""
    months = []
    y, m = from_date.year, from_date.month
    for _ in range(n):
        m += 1
        if m > 12:
            m = 1
            y += 1
        months.append(date(y, m, 1))
    return months


def _rolling_monthly_avg(
    monthly_totals: Dict[str, float],
    window: int = 6,
    up_to_month_key: Optional[str] = None,
) -> float:
    """
    Compute rolling average of the last `window` months.
    Only includes months <= up_to_month_key if supplied.
    """
    sorted_keys = sorted(monthly_totals.keys())
    if up_to_month_key:
        sorted_keys = [k for k in sorted_keys if k <= up_to_month_key]
    recent = sorted_keys[-window:] if len(sorted_keys) >= window else sorted_keys
    if not recent:
        return 0.0
    return sum(monthly_totals[k] for k in recent) / len(recent)


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT 1 — Monthly Forecast (overall)
# Returns: last N months actual + next M months forecast
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/monthly", dependencies=[Depends(verify_permission("run_forecasting"))])
def get_monthly_forecast(
    history_months: int = 12,   # how many past months to show
    forecast_months: int = 6,    # how many future months to project
    district: Optional[str] = None,
    village: Optional[str] = None,
    user_email: str = Depends(get_user_email),
    db: SupabaseClient = Depends(get_db),
):
    """
    Month-wise actual + forecast.
    Algorithm:
      1. Aggregate real sales by calendar month.
      2. Compute rolling 6-month average.
      3. Multiply by target month's seasonal multiplier.
      4. Return blended series (actual + projected).
    """
    try:
        # Fetch sales + customers for geo-filter
        sales_resp = db.table("sales").select(
            "sale_id, sale_date, total_amount, total_liters, customer_id"
        ).execute()
        all_sales = sales_resp.data or []

        customers_resp = db.table("customers").select(
            "customer_id, village, district"
        ).execute()
        customers_dict = {c["customer_id"]: c for c in (customers_resp.data or [])}

        # Build monthly actuals
        monthly_revenue: Dict[str, float] = defaultdict(float)
        monthly_liters: Dict[str, float] = defaultdict(float)
        monthly_orders: Dict[str, int] = defaultdict(int)

        for sale in all_sales:
            d = _parse_date(sale.get("sale_date", ""))
            if not d:
                continue
            cust = customers_dict.get(sale.get("customer_id"), {})
            if district and cust.get("district", "").strip() != district.strip():
                continue
            if village and cust.get("village", "").strip() != village.strip():
                continue
            mk = _month_key(d)
            monthly_revenue[mk] += sale.get("total_amount") or 0
            monthly_liters[mk] += sale.get("total_liters") or 0
            monthly_orders[mk] += 1

        today = date.today()
        current_mk = _month_key(today)

        # Historical slice
        all_actual_keys = sorted(monthly_revenue.keys())
        history_keys = all_actual_keys[-history_months:]

        actual_series = [
            {
                "month": k,
                "type": "actual",
                "revenue": round(monthly_revenue[k], 2),
                "liters": round(monthly_liters[k], 2),
                "orders": monthly_orders[k],
                "seasonal_factor": SEASONAL_MULTIPLIERS[int(k.split("-")[1])],
            }
            for k in history_keys
        ]

        # Forecast slice
        future_months = _next_n_months(today, forecast_months)
        forecast_series = []
        for fm in future_months:
            mk = _month_key(fm)
            base_revenue = _rolling_monthly_avg(monthly_revenue, window=6, up_to_month_key=current_mk)
            base_liters = _rolling_monthly_avg(monthly_liters, window=6, up_to_month_key=current_mk)
            sf = SEASONAL_MULTIPLIERS[fm.month]
            forecast_series.append({
                "month": mk,
                "type": "forecast",
                "revenue": round(base_revenue * sf, 2),
                "liters": round(base_liters * sf, 2),
                "orders": None,
                "seasonal_factor": sf,
            })

        # Accuracy metadata
        avg_monthly_revenue = _rolling_monthly_avg(monthly_revenue, 6, current_mk)

        return {
            "series": actual_series + forecast_series,
            "meta": {
                "avg_monthly_revenue_6m": round(avg_monthly_revenue, 2),
                "district_filter": district,
                "village_filter": village,
                "seasonal_multipliers": SEASONAL_MULTIPLIERS,
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecasting error: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT 2 — District-wise Forecast
# Returns each district's historical 6-month avg + next-month forecast
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/district", dependencies=[Depends(verify_permission("run_forecasting"))])
def get_district_forecast(
    forecast_month: Optional[str] = None,   # YYYY-MM, defaults to next month
    user_email: str = Depends(get_user_email),
    db: SupabaseClient = Depends(get_db),
):
    """
    District-wise forecast for a given month.
    Uses each district's own 6-month rolling average × seasonal factor.
    """
    try:
        # Resolve target month
        today = date.today()
        if forecast_month:
            try:
                target = datetime.strptime(forecast_month + "-01", "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(status_code=400, detail="forecast_month must be YYYY-MM")
        else:
            # Default: next month
            y, m = today.year, today.month + 1
            if m > 12:
                m, y = 1, y + 1
            target = date(y, m, 1)

        target_mk = _month_key(target)
        sf = SEASONAL_MULTIPLIERS[target.month]

        # Fetch data
        sales_resp = db.table("sales").select(
            "sale_id, sale_date, total_amount, total_liters, customer_id"
        ).execute()
        all_sales = sales_resp.data or []

        customers_resp = db.table("customers").select(
            "customer_id, name, village, district"
        ).execute()
        customers_dict = {c["customer_id"]: c for c in (customers_resp.data or [])}

        # Build per-district monthly revenue history
        # district -> month_key -> revenue/liters
        dist_monthly_rev: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
        dist_monthly_lit: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))

        for sale in all_sales:
            d = _parse_date(sale.get("sale_date", ""))
            if not d:
                continue
            # Only use history up to (not including) the target month
            if _month_key(d) >= target_mk:
                continue
            cust = customers_dict.get(sale.get("customer_id"), {})
            dist = cust.get("district") or "Unknown"
            mk = _month_key(d)
            dist_monthly_rev[dist][mk] += sale.get("total_amount") or 0
            dist_monthly_lit[dist][mk] += sale.get("total_liters") or 0

        rows = []
        for dist in sorted(dist_monthly_rev.keys()):
            avg_rev = _rolling_monthly_avg(dist_monthly_rev[dist], window=6)
            avg_lit = _rolling_monthly_avg(dist_monthly_lit[dist], window=6)
            rows.append({
                "district": dist,
                "forecast_revenue": round(avg_rev * sf, 2),
                "forecast_liters": round(avg_lit * sf, 2),
                "avg_monthly_revenue_6m": round(avg_rev, 2),
                "seasonal_factor": sf,
                "forecast_month": target_mk,
            })

        # Sort by forecast_revenue descending
        rows.sort(key=lambda x: x["forecast_revenue"], reverse=True)
        for i, r in enumerate(rows):
            r["rank"] = i + 1

        return {
            "forecast_month": target_mk,
            "seasonal_factor": sf,
            "rows": rows,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"District forecast error: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT 3 — Village-wise Forecast
# Same as district but drilled to village level
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/village", dependencies=[Depends(verify_permission("run_forecasting"))])
def get_village_forecast(
    forecast_month: Optional[str] = None,
    district: Optional[str] = None,   # optional drill-down
    user_email: str = Depends(get_user_email),
    db: SupabaseClient = Depends(get_db),
):
    """
    Village-wise forecast for a given month (optionally filtered to one district).
    """
    try:
        today = date.today()
        if forecast_month:
            try:
                target = datetime.strptime(forecast_month + "-01", "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(status_code=400, detail="forecast_month must be YYYY-MM")
        else:
            y, m = today.year, today.month + 1
            if m > 12:
                m, y = 1, y + 1
            target = date(y, m, 1)

        target_mk = _month_key(target)
        sf = SEASONAL_MULTIPLIERS[target.month]

        sales_resp = db.table("sales").select(
            "sale_id, sale_date, total_amount, total_liters, customer_id"
        ).execute()
        all_sales = sales_resp.data or []

        customers_resp = db.table("customers").select(
            "customer_id, name, village, district"
        ).execute()
        customers_dict = {c["customer_id"]: c for c in (customers_resp.data or [])}

        # village -> (district, month_key -> rev/lit)
        vil_monthly_rev: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
        vil_monthly_lit: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
        vil_district: Dict[str, str] = {}

        for sale in all_sales:
            d = _parse_date(sale.get("sale_date", ""))
            if not d:
                continue
            if _month_key(d) >= target_mk:
                continue
            cust = customers_dict.get(sale.get("customer_id"), {})
            cust_dist = cust.get("district") or "Unknown"
            if district and cust_dist.strip() != district.strip():
                continue
            vil = cust.get("village") or "Unknown"
            mk = _month_key(d)
            vil_monthly_rev[vil][mk] += sale.get("total_amount") or 0
            vil_monthly_lit[vil][mk] += sale.get("total_liters") or 0
            vil_district[vil] = cust_dist

        rows = []
        for vil in sorted(vil_monthly_rev.keys()):
            avg_rev = _rolling_monthly_avg(vil_monthly_rev[vil], window=6)
            avg_lit = _rolling_monthly_avg(vil_monthly_lit[vil], window=6)
            rows.append({
                "village": vil,
                "district": vil_district.get(vil, ""),
                "forecast_revenue": round(avg_rev * sf, 2),
                "forecast_liters": round(avg_lit * sf, 2),
                "avg_monthly_revenue_6m": round(avg_rev, 2),
                "seasonal_factor": sf,
                "forecast_month": target_mk,
            })

        rows.sort(key=lambda x: x["forecast_revenue"], reverse=True)
        for i, r in enumerate(rows):
            r["rank"] = i + 1

        return {
            "forecast_month": target_mk,
            "seasonal_factor": sf,
            "district_filter": district,
            "rows": rows,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Village forecast error: {str(e)}")



