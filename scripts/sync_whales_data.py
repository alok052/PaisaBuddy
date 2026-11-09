"""
PaisaBuddy - 24/7 Live Whale Portfolio, NSE Disclosures & US SEC 13F Syncer (Free Stack)
- Fetches 1Y + live 1D stock prices & live FX rates (USD/INR, GBP/INR, EUR/INR) from Yahoo Finance
- Polls official NSE Bulk Deals, Block Deals & Insider Trading XML feeds
- Polls official US SEC EDGAR Form 13F-HR submissions for all 18 Global Super-Investors
- Updates `whales`, `whale_consensus`, and `live_alerts` in Supabase (gracefully supports
  both current core schema and upgraded schema after running supabase_setup.sql)

Usage:
  python scripts/sync_whales_data.py             # Live sync to Supabase
  python scripts/sync_whales_data.py --dry-run   # Verify everything without DB writes
"""

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import csv
from datetime import datetime, timedelta, timezone
import io
import json
import os
import statistics
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

# Ensure sibling imports work from repo root or scripts/
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from whales_registry import (
    CONSENSUS_CURATED,
    SEC_CUSIP_OVERRIDES,
    SEC_ISSUER_TICKER_MAP,
    WHALES_REGISTRY,
)

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://swnocdeyclhzevdgtdrz.supabase.co')
SUPABASE_KEY = (
    os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    or os.environ.get('SUPABASE_KEY')
    or 'sb_publishable_r_NCnZLMgP24OLqNgdrnPg_MYzoskik'
)

def _build_supabase_headers(include_write=False):
    h = {'apikey': SUPABASE_KEY}
    # Legacy JWT keys (`eyJ...`) need Authorization Bearer; modern opaque keys
    # (`sb_secret_...` / `sb_publishable_...`) authenticate directly via `apikey`.
    if SUPABASE_KEY.startswith('eyJ'):
        h['Authorization'] = f'Bearer {SUPABASE_KEY}'
    if include_write:
        h['Content-Type'] = 'application/json'
        h['Prefer'] = 'return=minimal'
    return h


READ_HEADERS = _build_supabase_headers(include_write=False)
HEADERS = _build_supabase_headers(include_write=True)

YAHOO_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}
NSE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': '*/*',
    'Referer': 'https://www.nseindia.com/',
}
SEC_HEADERS = {
    'User-Agent': 'PaisaBuddyApp contact@paisabuddy.in',
    'Accept': 'application/json, application/xml, text/xml',
}

MAX_SEC_XML_BYTES = 2_500_000  # Avoid stalling on giant multi-MB quant filings (e.g. Citadel ~7.9MB)

QUOTE_CACHE = {}
SEARCH_CACHE = {}


def format_indian_int(num):
    """Format an integer with Indian lakh/crore comma grouping (e.g. 28,11,155)."""
    n = int(round(abs(num)))
    s = str(n)
    if len(s) <= 3:
        res = s
    else:
        last3 = s[-3:]
        rest = s[:-3]
        parts = []
        while len(rest) > 2:
            parts.append(rest[-2:])
            rest = rest[:-2]
        if rest:
            parts.append(rest)
        res = ','.join(reversed(parts)) + ',' + last3
    return f"-{res}" if num < 0 else res


def clean_display_symbol(yahoo_sym):
    """Strip .NS / .BO / .PA suffixes for clean UI badges."""
    for suffix in ('.NS', '.BO', '.PA', '.L'):
        if yahoo_sym.endswith(suffix):
            return yahoo_sym[:-len(suffix)]
    return yahoo_sym


def format_cmp(price, currency='INR'):
    if price is None:
        return '—'
    if currency == 'INR':
        if price >= 1000:
            return f"₹{format_indian_int(price)}"
        return f"₹{price:,.2f}" if price < 100 else f"₹{price:,.1f}"
    if currency == 'GBP':
        return f"£{price:,.2f}"
    if currency == 'EUR':
        return f"€{price:,.2f}"
    return f"${price:,.2f}"


def format_foreign_value(val_in_billions, currency='USD', show_billion_word=False):
    """Format global (USD/GBP) fund/position value purely in native currency ($B/$M/£B)."""
    sym = '£' if currency == 'GBP' else '$'
    if val_in_billions >= 1000:
        return f"{sym}{val_in_billions / 1000.0:.2f}T"
    if val_in_billions >= 1.0:
        unit = ' Billion' if show_billion_word else 'B'
        return f"{sym}{val_in_billions:.2f}{unit}" if val_in_billions < 10 else f"{sym}{val_in_billions:.1f}{unit}"
    val_m = val_in_billions * 1000.0
    unit = ' Million' if show_billion_word else 'M'
    return f"{sym}{val_m:.0f}{unit}"


def http_read_with_retry(req, timeout=12, retries=2):
    """Fetch bytes over HTTP with brief backoff on transient DNS/timeout/5xx errors."""
    last_err = None
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            if e.code in (404, 400):
                raise
            last_err = e
        except Exception as e:
            last_err = e
        if attempt < retries:
            time.sleep(0.8 * (attempt + 1))
    raise last_err


def fetch_yahoo_1y_quote(symbol):
    """Fetch live CMP, accurate 1D % move, and 1Y % return from Yahoo Finance chart v8."""
    if not symbol:
        return None
    if symbol in QUOTE_CACHE:
        return QUOTE_CACHE[symbol]

    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(symbol)}?interval=1d&range=1y"
    req = urllib.request.Request(url, headers=YAHOO_HEADERS)
    try:
        raw_bytes = http_read_with_retry(req, timeout=10, retries=1)
        data = json.loads(raw_bytes.decode('utf-8'))
        result = (data.get('chart') or {}).get('result')
        if not result:
            QUOTE_CACHE[symbol] = None
            return None
        res = result[0]
        meta = res.get('meta', {})
        price = meta.get('regularMarketPrice')
        if price is None:
            QUOTE_CACHE[symbol] = None
            return None

        timestamps = res.get('timestamp') or []
        raw_closes = (res.get('indicators', {}).get('quote') or [{}])[0].get('close') or []
        pairs = [(t, c) for t, c in zip(timestamps, raw_closes) if t is not None and c is not None]

        # Accurate 1Y return using chartPreviousClose or earliest close in 1Y window
        p_1y = meta.get('chartPreviousClose') or (pairs[0][1] if pairs else price)
        change_1y = ((price - p_1y) / p_1y) * 100.0 if p_1y else 0.0

        # Accurate 1D previous close using local exchange date comparison
        prev_day = None
        if len(pairs) >= 2:
            gmtoff = int(meta.get('gmtoffset') or 0)
            mkt_time = meta.get('regularMarketTime') or pairs[-1][0]
            last_date = datetime.fromtimestamp(pairs[-1][0] + gmtoff, tz=timezone.utc).date()
            mkt_date = datetime.fromtimestamp(mkt_time + gmtoff, tz=timezone.utc).date()
            if last_date == mkt_date:
                prev_day = pairs[-2][1]
            else:
                prev_day = pairs[-1][1]
        elif len(pairs) == 1:
            prev_day = pairs[0][1]
        else:
            prev_day = price

        change_1d = ((price - prev_day) / prev_day) * 100.0 if prev_day else 0.0

        info = {
            'symbol': symbol,
            'price': float(price),
            'prev_close': float(prev_day),
            'change_1d': float(change_1d),
            'change_1y': float(change_1y),
            'currency': meta.get('currency', 'USD'),
        }
        QUOTE_CACHE[symbol] = info
        return info
    except Exception:
        QUOTE_CACHE[symbol] = None
        return None


def prefetch_quotes(symbols):
    """Fetch multiple Yahoo symbols concurrently with polite worker count."""
    unique_syms = sorted({s for s in symbols if s and s not in QUOTE_CACHE})
    if not unique_syms:
        return
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(fetch_yahoo_1y_quote, s) for s in unique_syms]
        for fut in as_completed(futures):
            try:
                fut.result()
            except Exception:
                pass


def search_us_yahoo_symbol(issuer_name):
    """Resolve an unknown US SEC issuer name to a US Equity/ETF ticker."""
    key = issuer_name.strip().upper()
    if key in SEARCH_CACHE:
        return SEARCH_CACHE[key]

    try:
        q = urllib.parse.quote(issuer_name.strip())
        url = f"https://query1.finance.yahoo.com/v1/finance/search?q={q}&quotesCount=5&newsCount=0"
        req = urllib.request.Request(url, headers=YAHOO_HEADERS)
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            for item in data.get('quotes', []):
                sym = item.get('symbol', '')
                qtype = item.get('quoteType', '')
                if qtype in ('EQUITY', 'ETF') and sym and '.' not in sym and '=' not in sym:
                    SEARCH_CACHE[key] = sym
                    return sym
    except Exception:
        pass
    SEARCH_CACHE[key] = None
    return None


def resolve_sec_issuer(issuer, cusip):
    """Map SEC 13F issuer + CUSIP -> (yahoo_symbol, clean_name, sector)."""
    if cusip in SEC_CUSIP_OVERRIDES:
        return SEC_CUSIP_OVERRIDES[cusip]
    upper_issuer = (issuer or '').upper()
    for prefix, sym, clean_name, sector in SEC_ISSUER_TICKER_MAP:
        if prefix in upper_issuer:
            return sym, clean_name, sector
    clean_title = issuer.title().replace(' Inc', '').replace(' Corp', '').strip()
    sym = search_us_yahoo_symbol(issuer)
    return sym, clean_title or issuer, 'US Institutional Equity'


def fetch_nse_disclosures():
    """Poll official NSE Bulk Deals, Block Deals CSVs and Insider Trading XML RSS."""
    deals = []

    for feed_name, url in (
        ('NSE Bulk Deal', 'https://nsearchives.nseindia.com/content/equities/bulk.csv'),
        ('NSE Block Deal', 'https://nsearchives.nseindia.com/content/equities/block.csv'),
    ):
        try:
            req = urllib.request.Request(url, headers=NSE_HEADERS)
            with urllib.request.urlopen(req, timeout=10) as resp:
                raw = resp.read().decode('utf-8', errors='replace')
            reader = csv.reader(io.StringIO(raw))
            rows = list(reader)
            if len(rows) < 2:
                continue
            for r in rows[1:]:
                if len(r) < 7:
                    continue
                date_str = r[0].strip()
                symbol = r[1].strip().upper()
                sec_name = r[2].strip()
                client_name = r[3].strip()
                side = r[4].strip().upper()
                if not symbol or not client_name or 'NO RECORDS' in date_str.upper() or side not in ('BUY', 'SELL'):
                    continue
                try:
                    qty = int(float(r[5].replace(',', '').strip()))
                    price = float(r[6].replace(',', '').strip())
                except Exception:
                    continue
                value_inr = qty * price
                deals.append({
                    'feed': feed_name,
                    'date': date_str,
                    'symbol': symbol,
                    'security': sec_name or symbol,
                    'client': client_name,
                    'side': side,
                    'qty': qty,
                    'price': price,
                    'value_inr': value_inr,
                })
        except Exception as e:
            print(f"   ⚠️ {feed_name} fetch warning: {e}")

    # Insider Trading RSS (latest disclosures for enrichment / fallback banner awareness)
    insider_items = []
    try:
        req = urllib.request.Request('https://nsearchives.nseindia.com/content/RSS/Insider_Trading.xml', headers=NSE_HEADERS)
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw_xml = resp.read()
        root = ET.fromstring(raw_xml)
        for item in root.findall('.//item')[:20]:
            insider_items.append({
                'company': (item.findtext('title') or '').strip(),
                'pub_date': (item.findtext('pubDate') or '').strip(),
                'desc': (item.findtext('description') or '').strip(),
            })
    except Exception as e:
        print(f"   ⚠️ NSE Insider XML fetch warning: {e}")

    return deals, insider_items


def _parse_sec_13f_index_entry(cik, acc, fdate, rdate, form):
    """Fetch index.json and parse Form 13F-HR XML if within size guard."""
    url_idx = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc}/index.json"
    req_idx = urllib.request.Request(url_idx, headers=SEC_HEADERS)
    idx_data = json.loads(http_read_with_retry(req_idx, timeout=12, retries=2).decode('utf-8'))

    xml_candidates = [
        (x['name'], int(x.get('size') or 0))
        for x in idx_data.get('directory', {}).get('item', [])
        if x.get('name', '').endswith('.xml') and 'primary' not in x.get('name', '').lower()
    ]
    if not xml_candidates:
        return None

    xml_name, xml_size = xml_candidates[0]
    if xml_size > MAX_SEC_XML_BYTES:
        return {
            'fdate': fdate,
            'rdate': rdate,
            'form': form,
            'skipped_size': xml_size,
            'items': None,
            'total_usd': None,
        }

    time.sleep(0.18)
    url_xml = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc}/{xml_name}"
    req_xml = urllib.request.Request(url_xml, headers=SEC_HEADERS)
    raw_xml = http_read_with_retry(req_xml, timeout=18, retries=2)

    root = ET.fromstring(raw_xml)
    ns = root.tag.split('}')[0].strip('{') if '}' in root.tag else ''
    p = f"{{{ns}}}" if ns else ''

    agg = {}
    price_ratios = []
    for row in root.findall(f".//{p}infoTable"):
        if row.findtext(f"{p}putCall"):
            continue
        issuer = (row.findtext(f"{p}nameOfIssuer") or '').strip().upper()
        cusip = (row.findtext(f"{p}cusip") or '').strip().upper()
        try:
            val = float(row.findtext(f"{p}value") or 0)
            sh_el = row.find(f"{p}shrsOrPrnAmt/{p}sshPrnamt")
            sh = float(sh_el.text or 0) if sh_el is not None else 0.0
        except Exception:
            continue
        if val <= 0:
            continue
        if sh > 100:
            price_ratios.append(val / sh)
        key = cusip or issuer
        if key not in agg:
            agg[key] = {'issuer': issuer, 'cusip': cusip, 'val': 0.0, 'shares': 0.0}
        agg[key]['val'] += val
        agg[key]['shares'] += sh

    if not agg:
        return None

    # Auto-detect SEC legacy $1000s vs post-2023 whole Dollars
    med_ratio = statistics.median(price_ratios) if price_ratios else 50.0
    scale = 1000.0 if med_ratio < 1.0 else 1.0

    for item in agg.values():
        item['val_usd'] = item['val'] * scale

    items_sorted = sorted(agg.values(), key=lambda x: x['val_usd'], reverse=True)
    total_usd = sum(x['val_usd'] for x in items_sorted)

    return {
        'fdate': fdate,
        'rdate': rdate,
        'form': form,
        'skipped_size': 0,
        'total_usd': total_usd,
        'items': items_sorted,
    }


def fetch_sec_data_for_fund(cik, parse_holdings=True):
    """Fetch latest & prior SEC 13F-HR submissions sequentially within SEC rate limits."""
    time.sleep(0.18)
    url_sub = f"https://data.sec.gov/submissions/CIK{cik}.json"
    req_sub = urllib.request.Request(url_sub, headers=SEC_HEADERS)
    sub = json.loads(http_read_with_retry(req_sub, timeout=12, retries=2).decode('utf-8'))

    rec = sub.get('filings', {}).get('recent', {})
    forms = rec.get('form', [])
    indices = [i for i, f in enumerate(forms) if f in ('13F-HR', '13F-HR/A')]
    if not indices:
        return None

    latest_idx = indices[0]
    acc0 = rec['accessionNumber'][latest_idx].replace('-', '')
    fdate0 = rec['filingDate'][latest_idx]
    rdate0 = rec['reportDate'][latest_idx]
    form0 = rec['form'][latest_idx]

    result = {
        'fdate': fdate0,
        'rdate': rdate0,
        'form': form0,
        'cur': None,
        'prev': None,
    }

    if not parse_holdings:
        return result

    time.sleep(0.18)
    result['cur'] = _parse_sec_13f_index_entry(cik, acc0, fdate0, rdate0, form0)

    # Also parse prior quarter's 13F-HR (distinct reportDate) if cur XML wasn't skipped
    if result['cur'] and result['cur'].get('items'):
        prior_idx = next((idx for idx in indices[1:] if rec['reportDate'][idx] != rdate0), None)
        if prior_idx is not None:
            time.sleep(0.18)
            acc1 = rec['accessionNumber'][prior_idx].replace('-', '')
            try:
                result['prev'] = _parse_sec_13f_index_entry(
                    cik, acc1, rec['filingDate'][prior_idx], rec['reportDate'][prior_idx], rec['form'][prior_idx]
                )
            except Exception:
                result['prev'] = None

    return result


def compute_sec_qoq_moves(cur, prev):
    """Compute real quarter-over-quarter NEW BUY / ADD / TRIM deltas between 2 SEC 13Fs."""
    if not cur or not prev or not cur.get('items') or not prev.get('items'):
        return []

    prev_by_key = {(x['cusip'] or x['issuer']): x for x in prev['items']}
    cur_total = cur.get('total_usd') or 1.0
    rtag = f"13F ({cur['rdate'][:7]})"
    moves = []

    for item in cur['items'][:12]:
        key = item['cusip'] or item['issuer']
        _, clean_name, _ = resolve_sec_issuer(item['issuer'], item['cusip'])
        wt_pct = (item['val_usd'] / cur_total) * 100.0
        prev_item = prev_by_key.get(key)

        if not prev_item:
            if wt_pct >= 1.0:
                moves.append({
                    'type': 'BUY',
                    'stock': clean_name,
                    'detail': f"New {wt_pct:.1f}% position (${item['val_usd']/1e6:,.0f}M)",
                    'date': rtag,
                    '_score': wt_pct * 2.0,
                })
        elif prev_item['shares'] > 0 and item['shares'] > 0:
            pct_sh_diff = ((item['shares'] - prev_item['shares']) / prev_item['shares']) * 100.0
            if pct_sh_diff >= 8.0 and wt_pct >= 1.0:
                moves.append({
                    'type': 'BUY',
                    'stock': clean_name,
                    'detail': f"+{pct_sh_diff:.0f}% shares added (now {wt_pct:.1f}% wt)",
                    'date': rtag,
                    '_score': abs(pct_sh_diff) * 0.2 + wt_pct,
                })
            elif pct_sh_diff <= -8.0 and wt_pct >= 0.5:
                moves.append({
                    'type': 'SELL',
                    'stock': clean_name,
                    'detail': f"{pct_sh_diff:.0f}% shares trimmed ({wt_pct:.1f}% left)",
                    'date': rtag,
                    '_score': abs(pct_sh_diff) * 0.2 + wt_pct,
                })

    # If zero major buys/sells in top 12, note core top HOLD cleanly
    if not moves:
        top0 = cur['items'][0]
        _, clean0, _ = resolve_sec_issuer(top0['issuer'], top0['cusip'])
        wt0 = (top0['val_usd'] / cur_total) * 100.0
        moves.append({
            'type': 'HOLD',
            'stock': clean0,
            'detail': f"Unchanged {wt0:.1f}% core SEC 13F holding",
            'date': rtag,
            '_score': 1.0,
        })

    moves.sort(key=lambda m: m['_score'], reverse=True)
    return [{'type': m['type'], 'stock': m['stock'], 'detail': m['detail'], 'date': m['date']} for m in moves[:3]]


def check_supabase_extended_schema():
    """Check whether upgraded columns (all_holdings, filing_status) and whale_consensus table exist."""
    extended_whales = False
    has_consensus = False
    try:
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/whales?select=id,all_holdings,filing_status,last_sec_filing&limit=1",
            headers=READ_HEADERS,
        )
        with urllib.request.urlopen(req, timeout=8):
            extended_whales = True
    except urllib.error.HTTPError:
        extended_whales = False
    except Exception:
        extended_whales = False

    try:
        req2 = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/whale_consensus?select=id&limit=1",
            headers=READ_HEADERS,
        )
        with urllib.request.urlopen(req2, timeout=8):
            has_consensus = True
    except Exception:
        has_consensus = False

    return extended_whales, has_consensus


def patch_supabase_whale(whale_id, full_payload, core_payload, extended_schema_ready):
    """Patch whale row into Supabase; falls back to core columns cleanly if schema hasn't migrated yet."""
    payload = full_payload if extended_schema_ready else core_payload
    url = f"{SUPABASE_URL}/rest/v1/whales?id=eq.{whale_id}"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers=HEADERS,
        method='PATCH',
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status in (200, 204), None
    except urllib.error.HTTPError as e:
        if e.code == 400 and extended_schema_ready:
            req2 = urllib.request.Request(
                url,
                data=json.dumps(core_payload).encode('utf-8'),
                headers=HEADERS,
                method='PATCH',
            )
            with urllib.request.urlopen(req2, timeout=10) as resp2:
                return resp2.status in (200, 204), 'fallback_core'
        return False, f"HTTP {e.code}: {e.read().decode('utf-8', errors='ignore')}"
    except Exception as e:
        return False, str(e)


def sync_live_alert(nse_deals, matched_whale_deals, sec_latest_info, dry_run=False):
    """Publish newest real Exchange Disclosure (NSE whale match, top NSE bulk deal, or SEC 13F filing) without duplicating."""
    alert_candidate = None

    if matched_whale_deals:
        wname, d = matched_whale_deals[0]
        action_verb = 'bought' if d['side'] == 'BUY' else 'sold'
        val_cr = d['value_inr'] / 1e7
        alert_candidate = {
            'title': f"{wname} {action_verb} {d['qty']:,} shares of {d['security']}!",
            'subtitle': f"{d['feed']}: ₹{val_cr:.2f} Cr @ ₹{d['price']:,.2f} ({d['date']})",
            'source': d['feed'],
            'time_ago': d['date'],
        }
    elif nse_deals:
        top_deal = max(nse_deals, key=lambda x: x['value_inr'])
        action_verb = 'bought' if top_deal['side'] == 'BUY' else 'sold'
        val_cr = top_deal['value_inr'] / 1e7
        client_title = top_deal['client'].title()
        alert_candidate = {
            'title': f"NSE Bulk Deal: {client_title} {action_verb} {top_deal['security']}",
            'subtitle': f"{top_deal['qty']:,} shares @ ₹{top_deal['price']:,.2f} (₹{val_cr:.2f} Cr) • {top_deal['date']}",
            'source': top_deal['feed'],
            'time_ago': top_deal['date'],
        }
    elif sec_latest_info:
        wname, fdate, rdate = sec_latest_info
        alert_candidate = {
            'title': f"SEC 13F Radar: {wname} Form 13F-HR Verified",
            'subtitle': f"Filed {fdate} (Quarter ending {rdate}) • Live USD/INR FX Priced",
            'source': 'US SEC EDGAR',
            'time_ago': fdate,
        }

    if not alert_candidate:
        return

    print(f"\n🔔 Live Exchange Alert Candidate: {alert_candidate['title']} [{alert_candidate['source']}]")
    if dry_run:
        return

    # Deduplicate against recent non-Startup alerts
    try:
        check_url = f"{SUPABASE_URL}/rest/v1/live_alerts?source=neq.Startup%20Radar&order=id.desc&limit=5"
        req_get = urllib.request.Request(
            check_url,
            headers=READ_HEADERS,
        )
        with urllib.request.urlopen(req_get, timeout=8) as resp:
            recent = json.loads(resp.read().decode('utf-8'))
        for row in recent:
            if row.get('title') == alert_candidate['title'] and row.get('subtitle') == alert_candidate['subtitle']:
                print("   ℹ️ Identical latest exchange alert already live in Supabase (skipping duplicate insert).")
                return
    except Exception:
        pass

    try:
        post_req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/live_alerts",
            data=json.dumps(alert_candidate).encode('utf-8'),
            headers=HEADERS,
            method='POST',
        )
        with urllib.request.urlopen(post_req, timeout=8) as resp:
            if resp.status in (200, 201, 204):
                print("   ✅ Live Exchange Alert published to Supabase Realtime.")
    except Exception as e:
        print(f"   ⚠️ Alert insert warning: {e}")


def sync_consensus_table(synced_whales, fx_rates, has_consensus_table, dry_run=False):
    """Compute live multi-whale consensus rows and upsert to public.whale_consensus."""
    by_symbol = {}
    for w in synced_whales:
        for h in w['all_holdings']:
            sym = h.get('yahooSymbol')
            if not sym:
                continue
            by_symbol.setdefault(sym, []).append((w, h))

    # Build consensus entries prioritizing >= 2 synced whales, enriched by CONSENSUS_CURATED
    curated_by_sym = {c['symbol']: c for c in CONSENSUS_CURATED}
    consensus_rows = []
    seen_syms = set()

    ordered_syms = list(curated_by_sym.keys()) + sorted(
        [s for s, owners in by_symbol.items() if len(owners) >= 2 and s not in curated_by_sym],
        key=lambda s: len(by_symbol[s]),
        reverse=True,
    )

    for idx, sym in enumerate(ordered_syms):
        owners = by_symbol.get(sym, [])
        if len(owners) < 2 and sym not in curated_by_sym:
            continue
        if sym in seen_syms:
            continue
        seen_syms.add(sym)

        quote = fetch_yahoo_1y_quote(sym)
        cmeta = curated_by_sym.get(sym, {})
        currency = quote['currency'] if quote else ('INR' if sym.endswith(('.NS', '.BO')) else 'USD')
        price = quote['price'] if quote else None
        ret_1y = quote['change_1y'] if quote else 0.0

        # Deduplicate whales in case of multiple share classes
        unique_backers = {}
        total_inr_cr = 0.0
        total_usd_b = 0.0
        for w, h in owners:
            total_inr_cr += float(h.get('_val_inr_cr') or 0.0)
            total_usd_b += float(h.get('_val_usd_b') or 0.0)
            if w['name'] not in unique_backers:
                unique_backers[w['name']] = {
                    'name': w['name'],
                    'stake': h.get('stake') or 'Held',
                    'badge': w['tag'].replace('🇮🇳 ', '').replace('🇺🇸 ', '').replace('🇬🇧 ', ''),
                }

        backers = list(unique_backers.values())
        score = min(99, 86 + len(backers) * 3)
        name = cmeta.get('name') or (owners[0][1]['name'] if owners else sym)
        sector = cmeta.get('sector') or (owners[0][1].get('sector') if owners else 'Equities')
        is_indian_sym = sym.endswith(('.NS', '.BO')) or currency == 'INR'
        if is_indian_sym:
            combined_stake_str = f"₹{format_indian_int(total_inr_cr)} Cr" if total_inr_cr > 0 else 'Institutional Consensus'
        else:
            combined_stake_str = format_foreign_value(total_usd_b, 'USD') if total_usd_b > 0 else 'Global Consensus'

        consensus_rows.append({
            'id': cmeta.get('id') or f"live_{idx + 1}",
            'symbol': cmeta.get('short_symbol') or clean_display_symbol(sym),
            'name': name,
            'sector': sector,
            'cmp': format_cmp(price, currency),
            'change_1y': f"{ret_1y:+.1f}%",
            'is_positive': bool(ret_1y >= 0),
            'conviction_score': score,
            'combined_stake_value': combined_stake_str,
            'billionaires': backers[:6],
            'catalyst': cmeta.get('catalyst') or f"Held concurrently across {len(backers)} institutional & super-investor portfolios.",
            'quarter_move': cmeta.get('default_move') or f"Confirmed active position across {', '.join(b['name'] for b in backers[:3])}.",
            'updated_at': datetime.now(timezone.utc).isoformat(),
        })

    print(f"\n💎 Built {len(consensus_rows)} live Whale Consensus overlaps.")
    if dry_run or not has_consensus_table or not consensus_rows:
        if not has_consensus_table and not dry_run:
            print("   ℹ️ `whale_consensus` table not yet created in Supabase (run supabase_setup.sql to enable server persistence).")
        return

    try:
        upsert_headers = dict(HEADERS)
        upsert_headers['Prefer'] = 'resolution=merge-duplicates,return=minimal'
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/whale_consensus",
            data=json.dumps(consensus_rows).encode('utf-8'),
            headers=upsert_headers,
            method='POST',
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status in (200, 201, 204):
                print("   ✅ `whale_consensus` synced cleanly to Supabase.")
    except Exception as e:
        print(f"   ⚠️ `whale_consensus` upsert warning: {e}")


def sync_all_whales(dry_run=False):
    started_at = time.time()
    print("=" * 72)
    mode_label = "DRY RUN (NO DB WRITES)" if dry_run else "LIVE SYNC -> SUPABASE"
    print(f"🐋 PaisaBuddy 24/7 Whale Syncer [{mode_label}] | {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 72)

    # 1. Live FX rates + curated consensus symbols
    fx_q_usd = fetch_yahoo_1y_quote('USDINR=X')
    fx_q_gbp = fetch_yahoo_1y_quote('GBPINR=X')
    fx_q_eur = fetch_yahoo_1y_quote('EURINR=X')
    fx_rates = {
        'INR': 1.0,
        'USD': fx_q_usd['price'] if fx_q_usd else 93.94,
        'GBP': fx_q_gbp['price'] if fx_q_gbp else 125.96,
        'EUR': fx_q_eur['price'] if fx_q_eur else 105.09,
    }
    print(f"💱 Live FX: USD/INR=₹{fx_rates['USD']:.2f} | GBP/INR=₹{fx_rates['GBP']:.2f} | EUR/INR=₹{fx_rates['EUR']:.2f}")

    # 2. Live NSE Disclosures (Bulk, Block, Insider RSS)
    nse_deals, insider_items = fetch_nse_disclosures()
    print(f"🇮🇳 NSE Feed: {len(nse_deals)} active bulk/block deals | {len(insider_items)} insider XML items")

    # 3. Fetch official US SEC EDGAR 13F-HR data sequentially for global funds
    sec_results = {}
    sec_symbols_needed = set()
    print("🇺🇸 Polling US SEC EDGAR Form 13F-HR filings...")
    for w in WHALES_REGISTRY:
        cik = w.get('sec_cik')
        if not cik:
            continue
        try:
            res = fetch_sec_data_for_fund(cik, parse_holdings=w.get('use_sec_holdings', True))
            sec_results[w['id']] = res
            if res and res.get('cur') and res['cur'].get('items'):
                for item in res['cur']['items'][:10]:
                    sym, _, _ = resolve_sec_issuer(item['issuer'], item['cusip'])
                    if sym:
                        sec_symbols_needed.add(sym)
                print(
                    f"   ✓ #{w['id']:>2} {w['name']:<22} | {res['form']} filed {res['fdate']} (rep {res['rdate']}) | ${res['cur']['total_usd']/1e9:.2f}B"
                )
            elif res and res.get('cur') and res['cur'].get('skipped_size'):
                print(
                    f"   ✓ #{w['id']:>2} {w['name']:<22} | {res['form']} filed {res['fdate']} (XML {res['cur']['skipped_size']/1e6:.1f}MB guarded)"
                )
            elif res:
                print(f"   ✓ #{w['id']:>2} {w['name']:<22} | {res['form']} filed {res['fdate']} (meta)")
        except Exception as e:
            print(f"   ⚠️ SEC 13F warning for #{w['id']} {w['name']}: {e}")

    # 4. Prefetch ALL Yahoo Finance 1Y/1D charts concurrently in one fast pass
    all_symbols = set(sec_symbols_needed)
    for w in WHALES_REGISTRY:
        for h in w['holdings_meta']:
            all_symbols.add(h['symbol'])
    for c in CONSENSUS_CURATED:
        all_symbols.add(c['symbol'])
    print(f"\n📈 Fetching live 1Y & 1D Yahoo Finance prices for {len(all_symbols)} unique equities...")
    prefetch_quotes(all_symbols)

    extended_schema_ready, has_consensus_table = check_supabase_extended_schema()
    print(f"🗄️  Supabase schema check: extended_whales={extended_schema_ready}, whale_consensus={has_consensus_table}")

    # 5. Assemble each of the 50 whales
    matched_whale_deals = []
    synced_whales = []
    updated_count = 0
    sec_latest_banner = None
    now_iso = datetime.now(timezone.utc).isoformat()

    for w in WHALES_REGISTRY:
        wid = w['id']
        currency = w['currency']
        sec_info = sec_results.get(wid)

        # Build holdings list: SEC 13F dynamic (if enabled & parsed) OR curated registry
        resolved_holdings = []
        base_portfolio_val = w['base_portfolio']
        filing_status = 'NSE/BSE Live • Quarterly SHP'
        last_sec_filing = None
        recent_moves = list(w.get('fallback_recent_moves') or [])

        if sec_info:
            fdate = sec_info['fdate']
            rdate = sec_info['rdate']
            last_sec_filing = f"Filed {fdate} (Period {rdate})"
            filing_status = f"SEC {sec_info['form']} • {fdate}"
            if currency == 'USD' and (not sec_latest_banner or fdate > sec_latest_banner[1]):
                sec_latest_banner = (w['name'], fdate, rdate)

        use_dynamic_sec = bool(
            w.get('use_sec_holdings')
            and sec_info
            and sec_info.get('cur')
            and sec_info['cur'].get('items')
        )

        if use_dynamic_sec:
            cur = sec_info['cur']
            total_usd = cur['total_usd'] or 1.0
            base_portfolio_val = total_usd / 1e9  # Convert exact $ to $B

            qoq = compute_sec_qoq_moves(cur, sec_info.get('prev'))
            if qoq:
                recent_moves = qoq

            seen_sec_keys = set()
            for item in cur['items'][:10]:
                sym, clean_name, sector = resolve_sec_issuer(item['issuer'], item['cusip'])
                dedup_k = sym or item['issuer']
                if dedup_k in seen_sec_keys:
                    continue
                seen_sec_keys.add(dedup_k)

                quote = fetch_yahoo_1y_quote(sym) if sym else None
                sec_val_usd = item['val_usd']
                live_val_usd = sec_val_usd
                if quote and item['shares'] > 0 and quote.get('currency') == 'USD':
                    implied_usd = item['shares'] * quote['price']
                    if 0.35 * sec_val_usd <= implied_usd <= 3.0 * sec_val_usd:
                        live_val_usd = implied_usd

                val_billions = live_val_usd / 1e9
                wt_pct = round((sec_val_usd / total_usd) * 100.0, 1)
                resolved_holdings.append({
                    'name': clean_name,
                    'symbol': clean_display_symbol(sym) if sym else item['issuer'][:8],
                    'yahooSymbol': sym,
                    'sector': sector,
                    'stake': f"{wt_pct:.1f}% wt",
                    '_val_native': val_billions,
                    '_weight_pct': wt_pct,
                    '_quote': quote,
                })
        else:
            for h in w['holdings_meta']:
                quote = fetch_yahoo_1y_quote(h['symbol'])
                resolved_holdings.append({
                    'name': h['name'],
                    'symbol': clean_display_symbol(h['symbol']),
                    'yahooSymbol': h['symbol'],
                    'sector': h['sector'],
                    'stake': h['stake'],
                    '_val_native': h['base_val'],
                    '_weight_pct': None,
                    '_quote': quote,
                })

        # Match live NSE Bulk/Block deals against Indian whale aliases
        if w['aliases'] and nse_deals:
            for deal in nse_deals:
                cl_up = deal['client'].upper()
                if any(alias in cl_up for alias in w['aliases']):
                    matched_whale_deals.append((w['name'], deal))
                    move_entry = {
                        'type': deal['side'],
                        'stock': deal['security'],
                        'detail': f"{deal['qty']:,} sh @ ₹{deal['price']:,.1f} ({deal['feed']})",
                        'date': deal['date'],
                    }
                    if not any(m['stock'] == move_entry['stock'] and m['date'] == move_entry['date'] for m in recent_moves):
                        recent_moves.insert(0, move_entry)
            recent_moves = recent_moves[:4]

        # Price every holding live + compute portfolio-weighted 1Y and 1D performance
        weighted_1y_sum = 0.0
        weighted_1y_wt = 0.0
        weighted_1d_sum = 0.0
        weighted_1d_wt = 0.0
        all_holdings_out = []

        total_tracked_val = sum(h['_val_native'] for h in resolved_holdings) or 1.0
        for h in resolved_holdings:
            quote = h['_quote']
            base_v = h['_val_native']
            weight_base = base_v

            if quote and quote['price']:
                c_1d = quote['change_1d']
                c_1y = quote['change_1y']
                q_curr = quote['currency']
                price = quote['price']
                price_inr = price * fx_rates.get(q_curr, fx_rates.get(currency, 1.0))

                weighted_1y_sum += c_1y * weight_base
                weighted_1y_wt += weight_base
                weighted_1d_sum += c_1d * weight_base
                weighted_1d_wt += weight_base

                live_v = base_v if use_dynamic_sec else base_v * (1.0 + c_1d / 100.0)
                cmp_str = format_cmp(price, q_curr)
                chg1y_str = f"{c_1y:+.1f}%"
                chg1d_str = f"{c_1d:+.2f}%"
            else:
                live_v = base_v
                price_inr = 0.0
                cmp_str = '—'
                chg1y_str = '+0.0%'
                chg1d_str = '0.00%'

            usd_rate = fx_rates.get('USD', 93.94) or 93.94
            curr_rate = fx_rates.get(currency, usd_rate)
            if currency == 'INR':
                val_str = f"₹{format_indian_int(live_v)} Cr"
                val_inr_cr = live_v
                val_usd_b = 0.0
            else:
                val_str = format_foreign_value(live_v, currency, show_billion_word=False)
                val_inr_cr = (live_v * 1e9 * curr_rate) / 1e7
                val_usd_b = (live_v * curr_rate) / usd_rate

            # Normalized weight % across displayed portfolio
            wt_pct = h['_weight_pct'] if h['_weight_pct'] is not None else round((base_v / total_tracked_val) * 100.0, 1)

            all_holdings_out.append({
                'name': h['name'],
                'symbol': h['symbol'],
                'yahooSymbol': h['yahooSymbol'],
                'sector': h['sector'],
                'stake': h['stake'],
                'value': val_str,
                'cmp': cmp_str,
                'cmpInr': round(price_inr, 2),
                'change1Y': chg1y_str,
                'change1D': chg1d_str,
                'weightPercent': wt_pct,
                '_val_inr_cr': val_inr_cr,
                '_val_usd_b': val_usd_b,
            })

        avg_1d = (weighted_1d_sum / weighted_1d_wt) if weighted_1d_wt > 0 else 0.0
        avg_1y = (weighted_1y_sum / weighted_1y_wt) if weighted_1y_wt > 0 else 0.0

        if currency == 'INR':
            live_pv = base_portfolio_val * (1.0 + avg_1d / 100.0)
            formatted_portfolio = f"₹{format_indian_int(live_pv)} Cr"
        else:
            live_pv = base_portfolio_val * (1.0 + avg_1d / 100.0)
            formatted_portfolio = format_foreign_value(live_pv, currency, show_billion_word=False)

        formatted_1y = f"{avg_1y:+.1f}%"
        is_positive = bool(avg_1y >= 0.0)

        # Clean transient internal keys from JSON stored in DB
        clean_all = [{k: v for k, v in item.items() if not k.startswith('_')} for item in all_holdings_out]
        clean_top = clean_all[:4]

        synced_whales.append({
            'id': wid,
            'name': w['name'],
            'tag': w['tag'],
            'all_holdings': all_holdings_out,
        })

        core_payload = {
            'portfolio_value': formatted_portfolio,
            'return_1y': formatted_1y,
            'is_positive': is_positive,
            'top_holdings': clean_top,
            'recent_moves': recent_moves,
            'updated_at': now_iso,
        }
        full_payload = {
            **core_payload,
            'all_holdings': clean_all,
            'filing_status': filing_status,
            'last_sec_filing': last_sec_filing,
        }

        if dry_run:
            updated_count += 1
            sample_h = f"{clean_top[0]['name']} {clean_top[0]['cmp']} ({clean_top[0]['change1Y']})" if clean_top else ''
            print(f"   [DRY] #{wid:>2} {w['name']:<26} | {formatted_portfolio:<26} | 1Y={formatted_1y:<7} | {sample_h}")
        else:
            ok, err = patch_supabase_whale(wid, full_payload, core_payload, extended_schema_ready)
            if ok:
                updated_count += 1
                if err == 'fallback_core':
                    extended_schema_ready = False
            else:
                print(f"   ❌ #{wid} {w['name']} update failed: {err}")

    sync_live_alert(nse_deals, matched_whale_deals, sec_latest_banner, dry_run=dry_run)
    sync_consensus_table(synced_whales, fx_rates, has_consensus_table, dry_run=dry_run)

    elapsed = time.time() - started_at
    print("\n" + "=" * 72)
    print(f"🎉 Finished in {elapsed:.1f}s! Synced {updated_count}/{len(WHALES_REGISTRY)} Whales.")
    if not dry_run and updated_count == 0:
        sys.exit(1)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='PaisaBuddy Live Whale Syncer')
    parser.add_argument('--dry-run', action='store_true', help='Verify feeds & math without modifying Supabase')
    args = parser.parse_args()
    sync_all_whales(dry_run=args.dry_run)
