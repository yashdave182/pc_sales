"""
Mantri Priority Scoring Algorithm v3 — FastAPI Router
Accepts Excel upload or uses bundled sample data.
Returns scored rows as JSON for the frontend table.
"""

import os
import io
from datetime import datetime

import pandas as pd
import numpy as np
from fastapi import APIRouter, File, UploadFile, HTTPException, Query

router = APIRouter()

# ─────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────
CURRENT_MONTH = datetime.now().month

WEIGHTS = {
    'season':   22,
    'payment':  22,
    'holder':   20,
    'business': 12,
    'sabhasad': 12,
    'support':  12,
}

DISPATCH_RANGES = [(10, 22), (20, 18), (30, 13), (45, 7)]
DISPATCH_AFTER_45 = 2
DEMO_RANGES = [(10, 22), (20, 18), (30, 13), (45, 7)]
DEMO_AFTER_45 = 2

MONTH_MAP = {
    'jan':1,'january':1,'feb':2,'february':2,'mar':3,'march':3,
    'apr':4,'april':4,'may':5,'jun':6,'june':6,'jul':7,'july':7,
    'aug':8,'august':8,'sep':9,'sept':9,'set':9,'september':9,
    'oct':10,'october':10,'nov':11,'november':11,'dec':12,'december':12,
}

SAMPLE_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "sample_data.xlsx")


# ─────────────────────────────────────────────────────────
# SCORING FUNCTIONS
# ─────────────────────────────────────────────────────────

def parse_season_months(period):
    if pd.isna(period): return []
    p = str(period).lower()
    found = sorted({v for k, v in MONTH_MAP.items() if k in p})
    if len(found) < 2: return found
    start, end = found[0], found[-1]
    if end >= start:
        return list(range(start, end + 1))
    else:
        return list(range(start, 13)) + list(range(1, end + 1))


def months_distance(current, season_months):
    if not season_months: return 99
    distances = []
    for sm in season_months:
        d = abs(current - sm)
        distances.append(min(d, 12 - d))
    return min(distances)


def score_season(period, current_month=None):
    if current_month is None:
        current_month = datetime.now().month
    season = parse_season_months(period)
    if not season:
        return 0
    w = WEIGHTS['season']
    if current_month in season:
        center = season[len(season) // 2]
        dist = abs(current_month - center)
        dist = min(dist, 12 - dist)
        if dist == 0: return w
        elif dist == 1: return round(w * 0.85, 2)
        else: return round(w * 0.73, 2)
    else:
        dist = months_distance(current_month, season)
        if dist == 1: return round(w * 0.40, 2)
        elif dist == 2: return round(w * 0.20, 2)
        elif dist == 3: return round(w * 0.07, 2)
        else: return 2


def parse_days(val):
    if pd.isna(val): return np.nan
    s = str(val).strip().lower()
    if s in ['-', '- ', '', 'nan', 'pending']: return np.nan
    try: return float(s)
    except: return np.nan


def days_to_score(days, ranges, after_max):
    if np.isnan(days): return np.nan
    for max_d, pts in ranges:
        if days <= max_d:
            return pts
    return after_max


def score_payment(demo_raw, dispatch_raw):
    dispatch = parse_days(dispatch_raw)
    demo = parse_days(demo_raw)
    d_score = days_to_score(dispatch, DISPATCH_RANGES, DISPATCH_AFTER_45)
    dm_score = days_to_score(demo, DEMO_RANGES, DEMO_AFTER_45)

    if not np.isnan(d_score) and not np.isnan(dm_score):
        return round((2 * d_score + 1 * dm_score) / 3, 2)
    elif not np.isnan(d_score):
        return round(d_score, 2)
    elif not np.isnan(dm_score):
        return round(dm_score * 0.7, 2)
    else:
        return 0


def score_holder(val):
    if pd.isna(val): return 0
    v = str(val).upper().strip()
    return {'H':20,'HIGH':20,'M':10,'MEDIUM':10,'L':5,'LOW':5}.get(v, 0)


def score_business(val):
    if pd.isna(val): return 0
    v = str(val).upper().strip()
    if 'YES' in v: return 12
    if 'MID' in v: return 7
    if 'NO' in v: return 0
    return 0


def score_sabhasad(val):
    if pd.isna(val): return 0
    v = str(val).upper().strip()
    if 'NOT' in v: return 0
    if 'AWARE' in v: return 12
    return 0


def score_support(val):
    if pd.isna(val): return 0
    v = str(val).upper().strip()
    if 'HIGH' in v: return 12
    if 'MEDIUM' in v or 'MED' in v: return 7
    if 'LOW' in v: return 2
    return 0


def priority_label(score):
    if score >= 75: return 'URGENT'
    if score >= 55: return 'HIGH'
    if score >= 35: return 'MEDIUM'
    return 'LOW'


# ─────────────────────────────────────────────────────────
# DATA PIPELINE
# ─────────────────────────────────────────────────────────

def load_and_process(file_bytes: bytes):
    """Load Excel bytes, clean, score, and return results dict."""
    df_raw = pd.read_excel(io.BytesIO(file_bytes), header=0)
    df = df_raw.iloc[1:].reset_index(drop=True)

    # Map columns by position
    if len(df.columns) < 21:
        raise ValueError(f"Excel must have at least 21 columns, found {len(df.columns)}")

    col_map = {
        df.columns[0]: 'SR_NO',
        df.columns[1]: 'DATE',
        df.columns[2]: 'VILLAGE',
        df.columns[3]: 'TALUKA',
        df.columns[4]: 'DISTRICT',
        df.columns[5]: 'STATE',
        df.columns[6]: 'DAIRY_TYPE',
        df.columns[7]: 'TIME_MORNING',
        df.columns[8]: 'TIME_EVENING',
        df.columns[9]: 'MILK_MORNING',
        df.columns[10]: 'MILK_EVENING',
        df.columns[11]: 'SABHASAD_COUNT',
        df.columns[12]: 'NATURE_SABHASAD',
        df.columns[13]: 'MANTRI_NAME',
        df.columns[14]: 'SUPPORT',
        df.columns[15]: 'DELIVERY_PERIOD',
        df.columns[16]: 'DEMO_DAYS',
        df.columns[17]: 'DISPATCH_DAYS',
        df.columns[18]: 'DECISION_MAKER',
        df.columns[19]: 'HIGH_LOW_HOLDER',
        df.columns[20]: 'CURRENT_BUSINESS',
    }
    df = df.rename(columns=col_map)
    total_raw = len(df)

    # Drop incomplete rows
    scoring_cols = [
        'DELIVERY_PERIOD', 'DISPATCH_DAYS', 'HIGH_LOW_HOLDER',
        'CURRENT_BUSINESS', 'NATURE_SABHASAD', 'SUPPORT',
    ]

    def is_invalid(val):
        if val is None: return True
        if isinstance(val, float) and np.isnan(val): return True
        s = str(val).strip().lower()
        return s in ['', 'nan', '-', 'none', '0', 'pending']

    mask = df[scoring_cols].map(is_invalid).any(axis=1)
    dropped_count = int(mask.sum())
    df = df[~mask].reset_index(drop=True)

    # Apply scores
    current_month = datetime.now().month
    df['SCORE_SEASON'] = df['DELIVERY_PERIOD'].apply(lambda x: score_season(x, current_month))
    df['SCORE_PAYMENT'] = df.apply(
        lambda r: score_payment(r['DEMO_DAYS'], r['DISPATCH_DAYS']), axis=1
    )
    df['SCORE_HOLDER'] = df['HIGH_LOW_HOLDER'].apply(score_holder)
    df['SCORE_BUSINESS'] = df['CURRENT_BUSINESS'].apply(score_business)
    df['SCORE_SABHASAD'] = df['NATURE_SABHASAD'].apply(score_sabhasad)
    df['SCORE_SUPPORT'] = df['SUPPORT'].apply(score_support)

    score_columns = [
        'SCORE_SEASON', 'SCORE_PAYMENT', 'SCORE_HOLDER',
        'SCORE_BUSINESS', 'SCORE_SABHASAD', 'SCORE_SUPPORT'
    ]
    df['TOTAL_SCORE'] = df[score_columns].sum(axis=1).round(2)
    df['PRIORITY_RANK'] = df['TOTAL_SCORE'].rank(ascending=False, method='min').astype(int)
    df['PRIORITY_LABEL'] = df['TOTAL_SCORE'].apply(priority_label)
    df = df.sort_values('PRIORITY_RANK').reset_index(drop=True)

    # Build output columns
    orig_cols = [
        'SR_NO', 'DATE', 'VILLAGE', 'TALUKA', 'DISTRICT', 'STATE', 'DAIRY_TYPE',
        'TIME_MORNING', 'TIME_EVENING', 'MILK_MORNING', 'MILK_EVENING',
        'SABHASAD_COUNT', 'NATURE_SABHASAD', 'MANTRI_NAME', 'SUPPORT',
        'DELIVERY_PERIOD', 'DEMO_DAYS', 'DISPATCH_DAYS', 'DECISION_MAKER',
        'HIGH_LOW_HOLDER', 'CURRENT_BUSINESS',
    ]
    all_cols = orig_cols + [
        'PRIORITY_RANK', 'PRIORITY_LABEL', 'TOTAL_SCORE',
    ] + score_columns

    # Convert to JSON-safe records
    rows = []
    for _, row in df.iterrows():
        record = {}
        for col in all_cols:
            val = row.get(col, '')
            if pd.isna(val) or (isinstance(val, float) and np.isnan(val)):
                val = ''
            elif isinstance(val, (np.integer,)):
                val = int(val)
            elif isinstance(val, (np.floating,)):
                val = round(float(val), 2)
            elif hasattr(val, 'isoformat'):
                val = str(val)
            else:
                val = str(val)
            record[col] = val
        rows.append(record)

    # Stats
    scores = df['TOTAL_SCORE']
    stats = {
        'urgent': int((scores >= 75).sum()),
        'high': int(((scores >= 55) & (scores < 75)).sum()),
        'medium': int(((scores >= 35) & (scores < 55)).sum()),
        'low': int((scores < 35).sum()),
        'total_scored': len(df),
        'total_raw': total_raw,
        'dropped': dropped_count,
        'current_month': datetime.now().strftime('%B %Y'),
    }

    return {'rows': rows, 'stats': stats}


# ─────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────

@router.post("/run")
async def run_algorithm(
    file: UploadFile = File(None),
    use_sample: bool = Query(False),
):
    """Run the Mantri Priority Scoring Algorithm on uploaded or sample data."""
    try:
        if use_sample:
            if not os.path.exists(SAMPLE_FILE):
                raise HTTPException(
                    status_code=404,
                    detail=f"Sample data file not found at {SAMPLE_FILE}"
                )
            with open(SAMPLE_FILE, 'rb') as f:
                file_bytes = f.read()
        elif file is not None:
            if not file.filename.endswith(('.xlsx', '.xls')):
                raise HTTPException(
                    status_code=400,
                    detail="Only .xlsx and .xls files are supported"
                )
            file_bytes = await file.read()
        else:
            raise HTTPException(
                status_code=400,
                detail="Please upload an Excel file or set use_sample=true"
            )

        result = load_and_process(file_bytes)
        return result

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error in algorithm: {e}")
        raise HTTPException(status_code=500, detail=f"Algorithm error: {str(e)}")
