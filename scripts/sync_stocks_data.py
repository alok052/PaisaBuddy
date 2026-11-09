"""
PaisaBuddy - 100% Free Official NSE All-Stocks + 1Y EOD History Syncer (Play Store Safe)
- Master list from official NSE archives:
  1. EQUITY_L.csv (~2,645 NSE Mainboard Equities: EQ, BE, BZ)
  2. eq_etfseclist.csv (~360 NSE ETFs: Equity, Debt, Gold, Silver ETFs)
  3. SME_EQUITY_L.csv (NSE Emerge SME additions)
- Daily Official Full Bhavcopy + Delivery %:
  sec_bhavdata_full_{DDMMYYYY}.csv (Official NSE OHLC, Close, Prev Close, Volume, Turnover, Delivery %)
- Auto-Backfill Mode:
  When public.nse_stock_history has < 100 rows (or --backfill is passed), pulls ~250 trading days (~370 cal days)
  in parallel (~60s) to build full 1Y EOD historical price arrays + 52W High/Low + 1Y % Change.
- Daily Incremental Mode:
  Polls only recent missing trading days since the latest date already stored in Supabase and merges into history.

Usage:
  python scripts/sync_stocks_data.py                   # Auto-detect (backfill or incremental) -> Supabase
  python scripts/sync_stocks_data.py --backfill        # Force full 1Y (370-day) backfill -> Supabase
  python scripts/sync_stocks_data.py --dry-run         # Fetch & validate recent Bhavcopies without DB writes
  python scripts/sync_stocks_data.py --dry-run --write-seed  # Also refresh compact offline seed JSON
"""

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import csv
from datetime import datetime, timedelta, timezone
import io
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

IST = timezone(timedelta(hours=5, minutes=30))

SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://swnocdeyclhzevdgtdrz.supabase.co')
SUPABASE_KEY = (
    os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    or os.environ.get('SUPABASE_KEY')
    or 'sb_publishable_r_NCnZLMgP24OLqNgdrnPg_MYzoskik'
)

NSE_ARCHIVE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/csv,text/plain,*/*',
    'Referer': 'https://www.nseindia.com/',
}

EQUITY_L_URL = 'https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv'
SME_L_URL = 'https://nsearchives.nseindia.com/content/equities/SME_EQUITY_L.csv'
ETF_L_URL = 'https://nsearchives.nseindia.com/content/equities/eq_etfseclist.csv'
BHAVCOPY_URL_TEMPLATE = 'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_{dstr}.csv'

SERIES_PRIORITY = {'EQ': 0, 'BE': 1, 'BZ': 2, 'SM': 3, 'ST': 4}
ALLOWED_SERIES = set(SERIES_PRIORITY.keys())
MAX_HISTORY_POINTS = 260


def _build_supabase_headers(include_write=False):
    h = {'apikey': SUPABASE_KEY}
    if SUPABASE_KEY.startswith('eyJ'):
        h['Authorization'] = f'Bearer {SUPABASE_KEY}'
    if include_write:
        h['Content-Type'] = 'application/json'
        h['Prefer'] = 'resolution=merge-duplicates,return=minimal'
    return h


READ_HEADERS = _build_supabase_headers(include_write=False)
UPSERT_HEADERS = _build_supabase_headers(include_write=True)


def safe_float(val):
    if val is None:
        return None
    s = str(val).strip()
    if not s or s in ('-', 'NA', 'N/A', 'null'):
        return None
    try:
        num = float(s)
        return round(num, 2)
    except ValueError:
        return None


def safe_int(val):
    if val is None:
        return 0
    s = str(val).strip()
    if not s or s in ('-', 'NA', 'N/A', 'null'):
        return 0
    try:
        return int(float(s))
    except ValueError:
        return 0


def http_get_bytes(url, headers=None, timeout=14, retries=2):
    req = urllib.request.Request(url, headers=headers or NSE_ARCHIVE_HEADERS)
    last_err = None
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            if e.code in (400, 404):
                raise
            last_err = e
        except Exception as e:
            last_err = e
        if attempt < retries:
            time.sleep(0.6 * (attempt + 1))
    raise last_err


def parse_stripped_csv(raw_bytes):
    text = raw_bytes.decode('utf-8-sig', 'ignore')
    reader = csv.DictReader(io.StringIO(text))
    rows = []
    for r in reader:
        cleaned = {}
        for k, v in r.items():
            if k is None:
                continue
            cleaned[k.strip()] = v.strip() if isinstance(v, str) else v
        rows.append(cleaned)
    return rows


def fetch_master_securities():
    """Fetch official NSE Equities + SME + ETF lists keyed by SYMBOL."""
    master = {}

    # 1. Mainboard Equity Master (~2,645 companies)
    eq_rows = parse_stripped_csv(http_get_bytes(EQUITY_L_URL, timeout=15))
    for r in eq_rows:
        sym = (r.get('SYMBOL') or '').upper().strip()
        if not sym:
            continue
        master[sym] = {
            'symbol': sym,
            'name': (r.get('NAME OF COMPANY') or sym).strip(),
            'series': (r.get('SERIES') or 'EQ').strip(),
            'listing_date': (r.get('DATE OF LISTING') or '').strip() or None,
            'isin': (r.get('ISIN NUMBER') or '').strip() or None,
            'face_value': safe_float(r.get('FACE VALUE')),
        }

    # 2. SME Equity additions (if any not in EQUITY_L)
    try:
        sme_rows = parse_stripped_csv(http_get_bytes(SME_L_URL, timeout=10, retries=1))
        for r in sme_rows:
            sym = (r.get('SYMBOL') or '').upper().strip()
            if not sym or sym in master:
                continue
            master[sym] = {
                'symbol': sym,
                'name': (r.get('NAME OF COMPANY') or sym).strip(),
                'series': (r.get('SERIES') or 'SM').strip(),
                'listing_date': (r.get('DATE OF LISTING') or '').strip() or None,
                'isin': (r.get('ISIN NUMBER') or '').strip() or None,
                'face_value': safe_float(r.get('FACE VALUE')),
            }
    except Exception:
        pass

    # 3. Official NSE ETFs (~360 ETFs like NIFTYBEES, GOLDBEES, etc.)
    try:
        etf_rows = parse_stripped_csv(http_get_bytes(ETF_L_URL, timeout=10, retries=1))
        for r in etf_rows:
            sym = (r.get('Symbol') or '').upper().strip()
            if not sym or sym in master:
                continue
            sec_name = (r.get('SecurityName') or '').strip()
            underlying = (r.get('Underlying Asset') or r.get('Underlying Key') or '').strip()
            if underlying and sec_name and underlying.lower() not in sec_name.lower():
                display_name = f"{sec_name} ({underlying} ETF)"
            elif underlying:
                display_name = f"{underlying} ETF" if 'etf' not in underlying.lower() else underlying
            else:
                display_name = sec_name or f"{sym} ETF"
            master[sym] = {
                'symbol': sym,
                'name': display_name,
                'series': 'EQ',
                'listing_date': (r.get('DateofListing') or '').strip() or None,
                'isin': (r.get('ISINNumber') or '').strip() or None,
                'face_value': safe_float(r.get('FaceValue')),
            }
    except Exception:
        pass

    return master


def fetch_bhavcopy_day(dt_date):
    """Fetch official NSE full Bhavcopy for a single date. Returns (iso_date, rows_by_symbol) or (iso_date, None) on holiday."""
    dstr = dt_date.strftime('%d%m%Y')
    url = BHAVCOPY_URL_TEMPLATE.format(dstr=dstr)
    try:
        raw = http_get_bytes(url, timeout=14, retries=1)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return dt_date.isoformat(), None
        raise

    rows = parse_stripped_csv(raw)
    by_sym = {}
    for r in rows:
        series = (r.get('SERIES') or '').upper().strip()
        if series not in ALLOWED_SERIES:
            continue
        sym = (r.get('SYMBOL') or '').upper().strip()
        if not sym:
            continue
        close_p = safe_float(r.get('CLOSE_PRICE'))
        if close_p is None or close_p <= 0:
            continue

        prio = SERIES_PRIORITY.get(series, 99)
        existing = by_sym.get(sym)
        if existing and existing['_prio'] <= prio:
            continue

        prev_p = safe_float(r.get('PREV_CLOSE'))
        open_p = safe_float(r.get('OPEN_PRICE')) or close_p
        high_p = safe_float(r.get('HIGH_PRICE')) or close_p
        low_p = safe_float(r.get('LOW_PRICE')) or close_p
        last_p = safe_float(r.get('LAST_PRICE')) or close_p
        vol = safe_int(r.get('TTL_TRD_QNTY'))
        turnover = safe_float(r.get('TURNOVER_LACS')) or 0.0
        deliv_pct = safe_float(r.get('DELIV_PER'))
        day_pct = round(((close_p - prev_p) / prev_p) * 100.0, 2) if (prev_p and prev_p > 0) else 0.0

        by_sym[sym] = {
            '_prio': prio,
            'series': series,
            'close_price': close_p,
            'prev_close': prev_p,
            'open_price': open_p,
            'high_price': high_p,
            'low_price': low_p,
            'last_price': last_p,
            'day_change_pct': day_pct,
            'volume': vol,
            'turnover_lacs': turnover,
            'delivery_pct': deliv_pct,
        }

    return dt_date.isoformat(), by_sym


def supabase_get_json(path_and_query):
    url = f"{SUPABASE_URL}/rest/v1/{path_and_query}"
    req = urllib.request.Request(url, headers=READ_HEADERS)
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode('utf-8'))


def check_supabase_history_state():
    """
    Inspect current Supabase state:
      returns (table_exists: bool, row_count: int, latest_date_iso: str | None)
    """
    try:
        rows = supabase_get_json('nse_stocks?select=symbol,last_trade_date,history_points_count&limit=5&turnover_lacs=not.is.null&order=turnover_lacs.desc')
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return False, 0, None
        return False, 0, None
    except Exception:
        return False, 0, None

    if not rows:
        return True, 0, None

    # Check total stock count in nse_stock_history cleanly using Prefer: count=exact
    count_headers = dict(READ_HEADERS)
    count_headers['Prefer'] = 'count=exact'
    url = f"{SUPABASE_URL}/rest/v1/nse_stock_history?select=symbol&limit=1"
    req = urllib.request.Request(url, headers=count_headers)
    total_hist = 0
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            cr = resp.headers.get('Content-Range', '')
            if '/' in cr:
                total_hist = int(cr.split('/')[-1])
    except Exception:
        total_hist = len(rows)

    dates = [r.get('last_trade_date') for r in rows if r.get('last_trade_date')]
    latest_date = max(dates) if dates else None
    return True, total_hist, latest_date


def fetch_existing_histories_from_supabase():
    """Paginate nse_stock_history in chunks of 1,000 so incremental runs never lose 1Y charts."""
    all_hist = {}
    offset = 0
    page_size = 1000
    while True:
        chunk = supabase_get_json(f"nse_stock_history?select=symbol,history&order=symbol.asc&limit={page_size}&offset={offset}")
        if not chunk:
            break
        for row in chunk:
            sym = row.get('symbol')
            hist = row.get('history')
            if sym and isinstance(hist, list):
                all_hist[sym] = hist
        if len(chunk) < page_size:
            break
        offset += page_size
    return all_hist


def supabase_batch_upsert(table, rows, batch_size=400):
    if not rows:
        return
    url = f"{SUPABASE_URL}/rest/v1/{table}?on_conflict=symbol"
    total_batches = (len(rows) + batch_size - 1) // batch_size
    for b_idx, i in enumerate(range(0, len(rows), batch_size), start=1):
        batch = rows[i:i + batch_size]
        data = json.dumps(batch, ensure_ascii=False).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers=UPSERT_HEADERS, method='POST')
        last_err = None
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=45) as resp:
                    if resp.status not in (200, 201, 204):
                        raise RuntimeError(f"Unexpected status {resp.status}")
                    last_err = None
                    break
            except urllib.error.HTTPError as e:
                err_body = ''
                try:
                    err_body = e.read().decode('utf-8', 'ignore')
                except Exception:
                    pass
                last_err = RuntimeError(f"HTTP {e.code} on {table} batch {b_idx}/{total_batches}: {err_body or e.reason}")
                if e.code in (400, 401, 403, 404):
                    raise last_err
            except Exception as e:
                last_err = e
            if attempt < 2:
                time.sleep(1.0 * (attempt + 1))
        if last_err:
            raise last_err
        if total_batches >= 10 and (b_idx % 5 == 0 or b_idx == total_batches):
            print(f"     -> {table}: uploaded batch {b_idx}/{total_batches}")


def generate_weekdays_back(end_date, calendar_days):
    out = []
    cur = end_date
    for _ in range(calendar_days):
        if cur.weekday() < 5:
            out.append(cur)
        cur -= timedelta(days=1)
    return out


def main():
    parser = argparse.ArgumentParser(description='Sync all NSE stocks & 1Y official EOD Bhavcopy history.')
    parser.add_argument('--dry-run', action='store_true', help='Fetch & validate without writing to Supabase')
    parser.add_argument('--backfill', action='store_true', help='Force full 1Y (370-day) Bhavcopy backfill')
    parser.add_argument('--days', type=int, default=0, help='Custom calendar days lookback override')
    parser.add_argument('--write-seed', action='store_true', help='Write compact offline fallback src/data/nseStocksSeed.json')
    args = parser.parse_args()

    t0 = time.time()
    print("============================================================")
    print("PaisaBuddy Official NSE Stocks + 1Y Bhavcopy Syncer")
    print(f"Target Supabase: {SUPABASE_URL}")
    print(f"Dry Run: {args.dry_run} | Force Backfill: {args.backfill}")
    print("============================================================")

    # 1. Fetch Master Lists
    print("\n[1/4] Fetching official NSE EQUITY_L + ETF + SME masters...")
    master = fetch_master_securities()
    print(f"  -> Loaded {len(master)} official master securities.")

    # 2. Check Supabase State & Determine Lookback Window
    table_exists, hist_count, latest_db_date = check_supabase_history_state()
    print(f"  -> Supabase state: table_exists={table_exists}, history_rows={hist_count}, latest_date={latest_db_date}")

    existing_histories = {}
    is_full_backfill = False

    if args.days > 0:
        lookback_cal_days = args.days
    elif args.backfill:
        lookback_cal_days = 370
        is_full_backfill = True
    elif args.dry_run:
        lookback_cal_days = 10  # Fast ~2s validation for dry-run & seed fallback
    elif table_exists and hist_count >= 1500 and latest_db_date:
        # Daily incremental: pull days from (latest_db_date - 3 days safety overlap) through today IST
        try:
            last_dt = datetime.strptime(latest_db_date, '%Y-%m-%d').date()
            gap_days = (datetime.now(IST).date() - last_dt).days + 4
            lookback_cal_days = max(7, min(370, gap_days))
        except Exception:
            lookback_cal_days = 14
        print(f"  -> Incremental mode: loading existing histories + scanning last {lookback_cal_days} days...")
        existing_histories = fetch_existing_histories_from_supabase()
        print(f"  -> Loaded {len(existing_histories)} existing 1Y histories from Supabase.")
    else:
        lookback_cal_days = 370
        is_full_backfill = True
        print("  -> Initial 1Y Backfill mode activated (fetching ~250 NSE Bhavcopies across 370 days)...")

    today_ist = datetime.now(IST).date()
    candidate_dates = generate_weekdays_back(today_ist, lookback_cal_days)

    # 3. Fetch Official NSE Bhavcopies Concurrently
    print(f"\n[2/4] Downloading NSE sec_bhavdata_full CSVs across {len(candidate_dates)} weekdays...")
    daily_bhavcopies = {}  # date_iso -> {sym: data}
    holidays = 0
    errors = []

    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(fetch_bhavcopy_day, d): d for d in candidate_dates}
        completed = 0
        for fut in as_completed(futures):
            completed += 1
            try:
                iso_d, day_map = fut.result()
                if day_map is None:
                    holidays += 1
                else:
                    daily_bhavcopies[iso_d] = day_map
            except Exception as e:
                errors.append((futures[fut].isoformat(), str(e)))
            if is_full_backfill and completed % 40 == 0:
                print(f"     Progress: {completed}/{len(candidate_dates)} weekdays scanned ({len(daily_bhavcopies)} trading days fetched)...")

    sorted_dates = sorted(daily_bhavcopies.keys())
    print(f"  -> Fetched {len(sorted_dates)} trading days ({holidays} market holidays/unreleased, {len(errors)} transient errors).")
    if not sorted_dates:
        print("ERROR: Zero NSE Bhavcopy trading days retrieved. Aborting.")
        sys.exit(1)

    latest_market_date = sorted_dates[-1]
    print(f"  -> Latest NSE Trading Date: {latest_market_date} ({len(daily_bhavcopies[latest_market_date])} traded instruments)")

    # 4. Merge Master + Daily History + Latest EOD Snapshot per Symbol
    print("\n[3/4] Merging universe & computing 52W High/Low + 1Y returns...")
    # Union of master + symbols appearing in recent Bhavcopy (covers active SME SM/ST stocks too)
    all_symbols = set(master.keys()) | set(existing_histories.keys())
    for day_map in daily_bhavcopies.values():
        all_symbols.update(day_map.keys())

    # Build map of date->entry per symbol from fetched bhavcopies
    sym_new_points = {}
    sym_latest_trade = {}
    for iso_d in sorted_dates:
        day_map = daily_bhavcopies[iso_d]
        for sym, rec in day_map.items():
            # Compact tuple: [YYYY-MM-DD, close, high, low, volume]
            sym_new_points.setdefault(sym, {})[iso_d] = [
                iso_d,
                rec['close_price'],
                rec['high_price'],
                rec['low_price'],
                rec['volume'],
            ]
            # sorted_dates is ascending so last assignment is always latest traded day
            sym_latest_trade[sym] = (iso_d, rec)

    now_iso = datetime.now(timezone.utc).isoformat()
    stocks_rows = []
    history_rows = []
    seed_rows = []

    for sym in sorted(all_symbols):
        m = master.get(sym, {})
        merged_hist_map = {}

        # Existing Supabase history first
        for pt in existing_histories.get(sym, []):
            if isinstance(pt, list) and len(pt) >= 2:
                merged_hist_map[str(pt[0])] = pt

        # Overlay newly fetched Bhavcopy points
        for iso_d, pt in sym_new_points.get(sym, {}).items():
            merged_hist_map[iso_d] = pt

        hist_list = [merged_hist_map[d] for d in sorted(merged_hist_map.keys())][-MAX_HISTORY_POINTS:]

        latest_entry = sym_latest_trade.get(sym)
        last_trade_date = latest_entry[0] if latest_entry else (hist_list[-1][0] if hist_list else None)
        latest_rec = latest_entry[1] if latest_entry else None

        close_price = latest_rec['close_price'] if latest_rec else (hist_list[-1][1] if hist_list else None)
        prev_close = latest_rec['prev_close'] if latest_rec else None
        open_price = latest_rec['open_price'] if latest_rec else close_price
        high_price = latest_rec['high_price'] if latest_rec else (hist_list[-1][2] if hist_list else close_price)
        low_price = latest_rec['low_price'] if latest_rec else (hist_list[-1][3] if hist_list else close_price)
        last_price = latest_rec['last_price'] if latest_rec else close_price
        day_change_pct = latest_rec['day_change_pct'] if latest_rec else 0.0
        volume = latest_rec['volume'] if latest_rec else (hist_list[-1][4] if hist_list and len(hist_list[-1]) > 4 else 0)
        turnover_lacs = latest_rec['turnover_lacs'] if latest_rec else 0.0
        delivery_pct = latest_rec['delivery_pct'] if latest_rec else None
        series = (latest_rec['series'] if latest_rec else None) or m.get('series') or 'EQ'

        # Skip delisted / unquoted placeholders with neither price nor history unless in EQUITY_L master
        if close_price is None and not m:
            continue

        # Name fallback for SME SM/ST stocks not listed in EQUITY_L
        name = m.get('name') or (f"{sym} (NSE SME)" if series in ('SM', 'ST') else sym)

        high_52w = None
        low_52w = None
        change_1y_pct = None
        if hist_list:
            highs = [p[2] for p in hist_list if len(p) > 2 and p[2] is not None]
            lows = [p[3] for p in hist_list if len(p) > 3 and p[3] is not None]
            if highs:
                high_52w = max(highs)
            if lows:
                low_52w = min(lows)
            if len(hist_list) >= 2 and close_price:
                first_close = hist_list[0][1]
                if first_close and first_close > 0:
                    change_1y_pct = round(((close_price - first_close) / first_close) * 100.0, 2)

        stock_row = {
            'symbol': sym,
            'name': name,
            'isin': m.get('isin'),
            'series': series,
            'listing_date': m.get('listing_date'),
            'face_value': m.get('face_value'),
            'close_price': close_price,
            'prev_close': prev_close,
            'open_price': open_price,
            'high_price': high_price,
            'low_price': low_price,
            'last_price': last_price,
            'day_change_pct': day_change_pct,
            'change_1y_pct': change_1y_pct,
            'high_52w': high_52w,
            'low_52w': low_52w,
            'volume': volume,
            'turnover_lacs': turnover_lacs,
            'delivery_pct': delivery_pct,
            'last_trade_date': last_trade_date,
            'history_points_count': len(hist_list),
            'updated_at': now_iso,
        }
        stocks_rows.append(stock_row)

        if hist_list:
            history_rows.append({
                'symbol': sym,
                'history': hist_list,
                'updated_at': now_iso,
            })

        # Compact tuple for bundled offline seed fallback (~300 KB total for ~3,100+ NSE securities)
        # [0:symbol, 1:name, 2:series, 3:isin, 4:close, 5:prev, 6:open, 7:high, 8:low,
        #  9:day_pct, 10:turnover_lacs, 11:volume, 12:delivery_pct, 13:last_trade_date]
        seed_rows.append([
            sym,
            name,
            series,
            m.get('isin') or '',
            close_price,
            prev_close,
            open_price,
            high_price,
            low_price,
            day_change_pct,
            turnover_lacs,
            volume,
            delivery_pct,
            last_trade_date or latest_market_date,
        ])

    # Sort seed_rows by turnover DESC so instant offline default list highlights liquid stocks first
    seed_rows.sort(key=lambda r: -(r[10] or 0.0))

    print(f"  -> Prepared {len(stocks_rows)} stocks and {len(history_rows)} price history rows.")

    if args.write_seed:
        repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        seed_path = os.path.join(repo_root, 'src', 'data', 'nseStocksSeed.json')
        seed_payload = {
            'date': latest_market_date,
            'count': len(seed_rows),
            'rows': seed_rows,
        }
        with open(seed_path, 'w', encoding='utf-8') as f:
            json.dump(seed_payload, f, ensure_ascii=False, separators=(',', ':'))
        seed_kb = os.path.getsize(seed_path) / 1024.0
        print(f"  -> Wrote compact offline fallback {seed_path} ({len(seed_rows)} rows, {seed_kb:.1f} KB)")

    if args.dry_run:
        sample = [r for r in stocks_rows if r['symbol'] in ('RELIANCE', 'TCS', 'TATAMOTORS', 'TMPV', 'ZOMATO', 'ETERNAL', 'SUZLON', 'NIFTYBEES', 'ELCIDIN')]
        print("\n[4/4] DRY RUN Sample Checks:")
        for s in sample[:6]:
            print(f"  - {s['symbol']} ({s['name']}): ₹{s['close_price']} ({s['day_change_pct']}%) | Deliv: {s['delivery_pct']}% | Hist pts: {s['history_points_count']} | Date: {s['last_trade_date']}")
        print(f"\nDRY RUN COMPLETE in {time.time() - t0:.2f}s (no Supabase writes).")
        return

    # 5. Live Upsert to Supabase
    if not table_exists:
        print("\nERROR: public.nse_stocks / public.nse_stock_history tables do not exist in Supabase yet.")
        print("ACTION REQUIRED: Open Supabase Dashboard -> SQL Editor and run lines 109-155 of supabase_setup.sql, then re-run this sync!")
        sys.exit(1)

    print(f"\n[4/4] Upserting {len(stocks_rows)} stocks & {len(history_rows)} histories to Supabase...")
    supabase_batch_upsert('nse_stocks', stocks_rows, batch_size=400)
    print("  -> Upserted public.nse_stocks successfully.")
    supabase_batch_upsert('nse_stock_history', history_rows, batch_size=120)
    print("  -> Upserted public.nse_stock_history successfully.")
    print(f"\nSYNC COMPLETE in {time.time() - t0:.2f}s! Latest EOD: {latest_market_date}")


if __name__ == '__main__':
    main()
