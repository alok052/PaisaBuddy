import { resolveFundAudit, mockSIPFundsDatabase } from '../data/mockSIPFunds';

const MFAPI_BASE = 'https://api.mfapi.in/mf';
const SEARCH_CACHE = new Map();
const SCHEME_CACHE = new Map();

export function parseAmfiDate(ddmmyyyy) {
  if (!ddmmyyyy || typeof ddmmyyyy !== 'string') return null;
  const parts = ddmmyyyy.trim().split('-');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  const dt = new Date(year, month, day);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/**
 * Compute true annualized trailing CAGR (%) from AMFI daily NAV array (newest-first).
 */
export function computeCagrFromNavSeries(navSeries = [], yearsBack = 5) {
  if (!Array.isArray(navSeries) || navSeries.length < 2) return null;

  const latestRow = navSeries.find((r) => parseFloat(r?.nav) > 0 && parseAmfiDate(r?.date));
  if (!latestRow) return null;

  const latestNav = parseFloat(latestRow.nav);
  const latestDate = parseAmfiDate(latestRow.date);
  if (!latestDate || latestNav <= 0) return null;

  const targetMs = latestDate.getTime() - yearsBack * 365.25 * 24 * 3600 * 1000;

  let bestMatch = null;
  let bestDiff = Infinity;
  for (let i = 1; i < navSeries.length; i++) {
    const navVal = parseFloat(navSeries[i]?.nav);
    const dt = parseAmfiDate(navSeries[i]?.date);
    if (!dt || !Number.isFinite(navVal) || navVal <= 0) continue;
    const diff = Math.abs(dt.getTime() - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestMatch = { nav: navVal, date: dt };
    }
    if (dt.getTime() < targetMs && diff > bestDiff) {
      break;
    }
  }

  if (!bestMatch) return null;
  const actualYears = (latestDate.getTime() - bestMatch.date.getTime()) / (365.25 * 24 * 3600 * 1000);
  // Require at least 80% of target window so new funds don't inflate 5Y CAGR
  if (actualYears < yearsBack * 0.8 || bestMatch.nav <= 0) {
    return null;
  }

  const cagrPct = (Math.pow(latestNav / bestMatch.nav, 1 / actualYears) - 1) * 100;
  if (!Number.isFinite(cagrPct) || cagrPct < -60 || cagrPct > 85) return null;
  return Number(cagrPct.toFixed(1));
}

export function cleanBaseSchemeName(schemeName = '') {
  return String(schemeName)
    .replace(/\s*-\s*(direct|regular)\s*(plan)?/gi, '')
    .replace(/\s*-\s*(growth|idcw|dividend|payout|reinvestment|bonus|option).*$/gi, '')
    .replace(/\s*\((direct|regular|growth|g|d)\)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectPlanFromName(schemeName = '') {
  const low = String(schemeName).toLowerCase();
  if (low.includes('direct')) return 'DIRECT';
  if (low.includes('regular') || low.includes('retail')) return 'REGULAR';
  return 'UNKNOWN';
}

export async function searchAmfiSchemes(query, limit = 18) {
  const q = String(query || '').trim();
  if (q.length < 2) return [];
  const cacheKey = q.toLowerCase();
  if (SEARCH_CACHE.has(cacheKey)) {
    return SEARCH_CACHE.get(cacheKey);
  }

  const res = await fetch(`${MFAPI_BASE}/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(`MFAPI HTTP ${res.status}`);
  const rows = await res.json();
  if (!Array.isArray(rows)) return [];

  // Rank Growth schemes first over IDCW/Dividend options so results match SIP investing
  const scored = rows
    .filter((r) => r && r.schemeCode && r.schemeName)
    .map((r) => {
      const low = r.schemeName.toLowerCase();
      let score = 0;
      if (low.includes('growth')) score += 10;
      if (low.includes('direct')) score += 4;
      if (low.includes('regular')) score += 3;
      if (low.includes('idcw') || low.includes('dividend') || low.includes('payout')) score -= 6;
      if (low.includes('bonus')) score -= 5;
      return {
        schemeCode: String(r.schemeCode),
        schemeName: r.schemeName.trim(),
        planHint: detectPlanFromName(r.schemeName),
        isLiveCandidate: true,
        _score: score,
      };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);

  SEARCH_CACHE.set(cacheKey, scored);
  return scored;
}

export async function fetchSchemeRaw(schemeCode) {
  const code = String(schemeCode || '').trim();
  if (!code) return null;
  if (SCHEME_CACHE.has(code)) return SCHEME_CACHE.get(code);

  const res = await fetch(`${MFAPI_BASE}/${encodeURIComponent(code)}`);
  if (!res.ok) throw new Error(`MFAPI scheme ${code} HTTP ${res.status}`);
  const payload = await res.json();
  if (!payload || !Array.isArray(payload.data) || payload.data.length === 0) {
    return null;
  }
  SCHEME_CACHE.set(code, payload);
  return payload;
}

function mapCategoryLabel(amfiCat = '', schemeName = '') {
  const src = `${amfiCat} ${schemeName}`.toLowerCase();
  if (src.includes('small')) return 'Small Cap Equity';
  if (src.includes('mid')) return 'Mid Cap Equity';
  if (src.includes('flexi') || src.includes('multi')) return 'Flexi Cap Equity';
  if (src.includes('elss')) return 'ELSS Tax Saver Equity';
  if (src.includes('index') || src.includes('nifty') || src.includes('sensex')) return 'Index Equity Fund';
  if (src.includes('hybrid') || src.includes('balanced') || src.includes('advantage')) return 'Balanced Advantage / Hybrid';
  if (src.includes('large')) return 'Large Cap Equity';
  return amfiCat ? amfiCat.replace(/^Equity Scheme\s*-\s*/i, '') : 'Equity Mutual Fund';
}

function parsePctNum(str) {
  const n = parseFloat(String(str || '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * Resolve & enrich any curated or searched AMFI fund with live AMFI NAV, real trailing CAGR (1Y/3Y/5Y),
 * and Direct vs Regular plan comparison where AMFI publishes both schemes.
 */
export async function fetchLiveSchemeAudit(fundOrCandidate, preferredPlan = 'REGULAR') {
  const fallbackTemplate = fundOrCandidate?.id
    ? fundOrCandidate
    : resolveFundAudit(fundOrCandidate?.schemeName || fundOrCandidate?.name || '');

  let targetCode = fundOrCandidate?.schemeCode ? String(fundOrCandidate.schemeCode) : null;
  let searchMatches = [];

  try {
    const queryBase = cleanBaseSchemeName(
      fundOrCandidate?.schemeName || fundOrCandidate?.name || ''
    );
    if (queryBase.length >= 3) {
      searchMatches = await searchAmfiSchemes(queryBase, 20);
    }
    if (!targetCode && searchMatches.length > 0) {
      const wantDir = preferredPlan === 'DIRECT';
      const preferred =
        searchMatches.find(
          (m) =>
            /growth/i.test(m.schemeName) &&
            (wantDir ? /direct/i.test(m.schemeName) : /regular/i.test(m.schemeName))
        ) ||
        searchMatches.find((m) => /growth/i.test(m.schemeName)) ||
        searchMatches[0];
      targetCode = preferred.schemeCode;
    }
  } catch (e) {
    // Offline or timeout — return offline template safely
    return fallbackTemplate;
  }

  if (!targetCode) return fallbackTemplate;

  try {
    const mainRaw = await fetchSchemeRaw(targetCode);
    if (!mainRaw) return fallbackTemplate;

    const meta = mainRaw.meta || {};
    const schemeName = meta.scheme_name || fundOrCandidate?.schemeName || fallbackTemplate.name;
    const planDetected = detectPlanFromName(schemeName);
    const baseName = cleanBaseSchemeName(schemeName);

    // Find sister Regular <-> Direct Growth scheme for real side-by-side return comparison
    let sisterRaw = null;
    if (searchMatches.length === 0 && baseName.length >= 3) {
      searchMatches = await searchAmfiSchemes(baseName, 20).catch(() => []);
    }
    const wantSisterPlan = planDetected === 'DIRECT' ? 'REGULAR' : 'DIRECT';
    const sisterCandidate = searchMatches.find(
      (m) =>
        m.schemeCode !== targetCode &&
        /growth/i.test(m.schemeName) &&
        m.planHint === wantSisterPlan &&
        cleanBaseSchemeName(m.schemeName).toLowerCase() === baseName.toLowerCase()
    ) ||
      searchMatches.find(
        (m) => m.schemeCode !== targetCode && /growth/i.test(m.schemeName) && m.planHint === wantSisterPlan
      );

    if (sisterCandidate) {
      sisterRaw = await fetchSchemeRaw(sisterCandidate.schemeCode).catch(() => null);
    }

    const latestRow = mainRaw.data[0];
    const latestNav = parseFloat(latestRow.nav);
    const navDate = latestRow.date;

    const cagr5 = computeCagrFromNavSeries(mainRaw.data, 5);
    const cagr3 = computeCagrFromNavSeries(mainRaw.data, 3);
    const cagr1 = computeCagrFromNavSeries(mainRaw.data, 1);
    const chosenCagrNum = cagr5 ?? cagr3 ?? cagr1;

    const sisterCagr5 = sisterRaw ? computeCagrFromNavSeries(sisterRaw.data, 5) : null;
    const sisterCagr3 = sisterRaw ? computeCagrFromNavSeries(sisterRaw.data, 3) : null;
    const sisterCagrNum = sisterCagr5 ?? sisterCagr3;

    // Derive Regular and Direct rates from true AMFI history when both plans are available
    let directCagrNum = null;
    let regularCagrNum = null;
    if (planDetected === 'DIRECT') {
      directCagrNum = chosenCagrNum;
      regularCagrNum =
        sisterCagrNum !== null
          ? sisterCagrNum
          : chosenCagrNum !== null
          ? Number((chosenCagrNum - (fallbackTemplate.agentCommissionCut ? parsePctNum(fallbackTemplate.agentCommissionCut) : 0.9)).toFixed(1))
          : null;
    } else {
      regularCagrNum = chosenCagrNum;
      directCagrNum =
        sisterCagrNum !== null
          ? sisterCagrNum
          : chosenCagrNum !== null
          ? Number((chosenCagrNum + (fallbackTemplate.agentCommissionCut ? parsePctNum(fallbackTemplate.agentCommissionCut) : 0.9)).toFixed(1))
          : null;
    }

    let realCommissionCut = fallbackTemplate.agentCommissionCut || '0.90%';
    if (directCagrNum !== null && regularCagrNum !== null && directCagrNum > regularCagrNum) {
      const spread = Math.min(1.65, Math.max(0.25, directCagrNum - regularCagrNum));
      realCommissionCut = `${spread.toFixed(2)}%`;
    }

    // Match curated template if scheme name overlaps a known fund so AUM / expense stay accurate
    const matchedCurated =
      mockSIPFundsDatabase.find((f) =>
        baseName.toLowerCase().includes(cleanBaseSchemeName(f.name).toLowerCase()) ||
        cleanBaseSchemeName(f.name).toLowerCase().includes(baseName.toLowerCase())
      ) || fallbackTemplate;

    const baseDirectCagr =
      directCagrNum !== null
        ? `${directCagrNum.toFixed(1)}%`
        : matchedCurated?.replacement?.cagr5Y || matchedCurated.currentCagr;

    const effectiveRegCagr =
      regularCagrNum !== null ? `${regularCagrNum.toFixed(1)}%` : matchedCurated.currentCagr;

    const displayCagr =
      preferredPlan === 'DIRECT' && directCagrNum !== null
        ? `${directCagrNum.toFixed(1)}%`
        : effectiveRegCagr;

    const cagrLabel =
      cagr5 !== null ? '5Y CAGR (AMFI Live)' : cagr3 !== null ? '3Y CAGR (AMFI Live)' : cagr1 !== null ? '1Y Return (AMFI Live)' : 'Estimated CAGR';

    const directReplacement = sisterRaw && planDetected !== 'DIRECT'
      ? {
          name: `${baseName} (Direct Plan)`,
          category: `${mapCategoryLabel(meta.scheme_category, schemeName)} • Direct`,
          expenseRatio: matchedCurated?.replacement?.expenseRatio || '0.68%',
          cagr5Y: baseDirectCagr,
          reasons: [
            `AMFI verified spread: Direct Plan outperforms Regular by ${realCommissionCut}/yr in historical NAV compounding.`,
            `Latest Official AMFI NAV: ₹${Number(parseFloat(sisterRaw.data[0]?.nav || latestNav)).toFixed(2)} (${sisterRaw.data[0]?.date || navDate}).`,
            'Zero exit load/commission switching new SIPs via MFCentral, Zerodha Coin, or Groww Direct.',
          ],
          platformUrl: 'https://www.mfcentral.com',
        }
      : matchedCurated.replacement;

    return {
      ...matchedCurated,
      id: `amfi_${targetCode}`,
      schemeCode: targetCode,
      name: baseName || matchedCurated.name,
      amc: meta.fund_house || matchedCurated.amc,
      category: mapCategoryLabel(meta.scheme_category, schemeName),
      latestNav: Number.isFinite(latestNav) ? latestNav : null,
      navDate,
      cagr1Y: cagr1 !== null ? `${cagr1}%` : null,
      cagr3Y: cagr3 !== null ? `${cagr3}%` : null,
      cagr5Y: cagr5 !== null ? `${cagr5}%` : null,
      cagrLabel,
      currentCagr: displayCagr,
      regularCagrNum,
      directCagrNum,
      agentCommissionCut: realCommissionCut,
      isLiveAmfi: true,
      replacement: directReplacement,
    };
  } catch (err) {
    return fallbackTemplate;
  }
}
