import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  fetchNseStocksIndex,
  getWhalesHoldingStock,
  fetchLiveWhales,
} from './dataService';
import { fetchSchemeRaw } from './mfApiService';

export const BENCHMARK_CONFIGS = [
  {
    key: 'NIFTY50',
    name: 'Nifty 50',
    shortLabel: 'Nifty 50',
    category: 'LARGE CAP',
    etfSymbol: 'NIFTYBEES',
    amfiCode: '120716',
    weight: 0.35,
    role: 'Core Large Cap Anchor',
    accent: '#10B981',
  },
  {
    key: 'MID150',
    name: 'Nifty Midcap 150',
    shortLabel: 'Midcap 150',
    category: 'MID CAP',
    etfSymbol: 'MID150BEES',
    amfiCode: '147622',
    weight: 0.25,
    role: 'Growth Midcap Engine',
    accent: '#38BDF8',
  },
  {
    key: 'SMALL250',
    name: 'Nifty Smallcap 250',
    shortLabel: 'Smallcap 250',
    category: 'SMALL CAP',
    etfSymbol: 'HDFCSML250',
    amfiCode: '148519',
    weight: 0.20,
    role: 'High-Beta Risk Meter',
    accent: '#A855F7',
  },
  {
    key: 'NEXT50',
    name: 'Nifty Next 50',
    shortLabel: 'Next 50',
    category: 'LARGE-MID',
    etfSymbol: 'JUNIORBEES',
    amfiCode: '143341',
    weight: 0.12,
    role: 'Emerging Bluechips',
    accent: '#22D3EE',
  },
  {
    key: 'BANK',
    name: 'Nifty Bank',
    shortLabel: 'Bank Nifty',
    category: 'FINANCIALS',
    etfSymbol: 'BANKBEES',
    amfiCode: '147620',
    weight: 0.08,
    role: 'Credit Cycle Pulse',
    accent: '#F59E0B',
  },
  {
    key: 'IT',
    name: 'Nifty IT TRI',
    shortLabel: 'Nifty IT',
    category: 'TECH SECTOR',
    etfSymbol: 'ITBEES',
    amfiCode: null,
    weight: 0,
    role: 'Export Tech Contrarian',
    accent: '#60A5FA',
  },
  {
    key: 'GOLD',
    name: 'Gold Benchmark',
    shortLabel: 'Gold BeES',
    category: 'HEDGE',
    etfSymbol: 'GOLDBEES',
    amfiCode: '119788',
    weight: 0,
    role: 'Volatility & Crisis Hedge',
    accent: '#FBBF24',
  },
];

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function getMoodRegime(score) {
  const s = clamp(Math.round(Number(score) || 50), 0, 100);
  if (s <= 25) {
    return {
      key: 'EXTREME_DIP',
      label: 'Extreme Dip • Value',
      shortLabel: 'EXTREME DIP',
      simpleBadge: 'Heavy Sale',
      simpleShortLabel: 'HEAVY SALE • BUY',
      simpleHeadline: 'Market Kaafi Sasta Hai — Extra SIP & Buying Ka Best Time',
      simpleGuidance:
        'Stocks apne 1-saal ke highs aur long-term average se kaafi saste mil rahe hain. Darne ke bajay extra SIP aur parts me invest karne ka historically strong mauka hai.',
      sipAction: '+50% Extra SIP',
      lumpsumAction: '2-4 Parts Me Buy',
      marketZoneText: 'Deep Discount',
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.16)',
      borderColor: 'rgba(16, 185, 129, 0.42)',
      icon: 'snow',
      sipMultiplier: 1.5,
      stpAdvice: 'Stagger 2-4 Tranches',
      headline: 'Deep Discount vs 200-DMA — Strong Valuation Cushion',
      guidance:
        'Index trades noticeably below its long-term 200-day trend and 52W highs. Historically favorable for stepping up SIPs and staggering idle cash.',
    };
  }
  if (s <= 44) {
    return {
      key: 'SMART_DIP',
      label: 'Smart Dip Zone',
      shortLabel: 'SMART DIP',
      simpleBadge: 'Accha Dip',
      simpleShortLabel: 'ACCHA DIP • VALUE',
      simpleHeadline: 'Healthy Girawat — Normal SIP Plus Thoda Extra Daalna Sahi Hai',
      simpleGuidance:
        'Prices peak se acchi-khasi cool off hui hain. Apni monthly SIP chalne dein aur chahein toh thoda top-up ya step-by-step buying add karein.',
      sipAction: '+25% Top-Up OK',
      lumpsumAction: 'Slow Parts Buy',
      marketZoneText: 'Attractive Rate',
      color: '#22D3EE',
      bgColor: 'rgba(34, 211, 238, 0.16)',
      borderColor: 'rgba(34, 211, 238, 0.4)',
      icon: 'flash',
      sipMultiplier: 1.25,
      stpAdvice: 'Top-Up Friendly',
      headline: 'Healthy Pullback — Attractive Risk-Reward for Staggered Adds',
      guidance:
        'Valuations have cooled meaningfully without broad panic. Favorable zone for +25% SIP top-ups or selective staggered tranches.',
    };
  }
  if (s <= 64) {
    return {
      key: 'FAIR_ZONE',
      label: 'Neutral • Fair Zone',
      shortLabel: 'FAIR ZONE',
      simpleBadge: 'Fair Rate',
      simpleShortLabel: 'SAHI RATE • NORMAL',
      simpleHeadline: 'Balanced Market — Bina Tension Normal SIP Chalne Dein',
      simpleGuidance:
        'Market na zyada sasta hai na zyada mehenga. Har mahine apni regular SIP chalayein aur har saal 10% step-up karte rahein.',
      sipAction: 'Normal SIP Chalao',
      lumpsumAction: '3-6 Month Split',
      marketZoneText: 'Balanced Price',
      color: '#38BDF8',
      bgColor: 'rgba(56, 189, 248, 0.16)',
      borderColor: 'rgba(56, 189, 248, 0.38)',
      icon: 'pulse',
      sipMultiplier: 1.0,
      stpAdvice: 'Steady Auto-SIP',
      headline: 'Equilibrium Zone — Stay on Autopilot SIP + Annual Step-Up',
      guidance:
        'Market is balanced near fair trend. Keep monthly SIPs running cleanly with 10% annual Step-Up; stagger any new bulk money over 3-6 months.',
    };
  }
  if (s <= 81) {
    return {
      key: 'WARM_MOMENTUM',
      label: 'Warm • Momentum',
      shortLabel: 'WARM ZONE',
      simpleBadge: 'Thoda Garam',
      simpleShortLabel: 'THODA GARAM • TEZI',
      simpleHeadline: 'Market Upar Hai — Normal SIP Rakho, Ek Saath Bada Paisa Mat Daalo',
      simpleGuidance:
        'Tezi ki wajah se market apne average se thoda upar chal raha hai. Apni purani SIP bilkul na rokein, bas naya bada cash 6 mahine ke parts me daalein.',
      sipAction: 'Regular SIP Rakho',
      lumpsumAction: 'Ek Saath Mat Daalo',
      marketZoneText: 'Thoda Mehenga',
      color: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.16)',
      borderColor: 'rgba(245, 158, 11, 0.42)',
      icon: 'flame',
      sipMultiplier: 0.85,
      stpAdvice: '6-Mo Liquid STP',
      headline: 'Stretched Above 200-DMA — Stick to Base SIP, Route Lump Sums via STP',
      guidance:
        'Momentum has pushed indices above their 200-day average. Keep ongoing SIPs intact, avoid FOMO lump sums, and park reserve cash in Liquid/Arbitrage STP.',
    };
  }
  return {
    key: 'EXTREME_GREED',
    label: 'Overheated • Caution',
    shortLabel: 'OVERHEATED',
    simpleBadge: 'Bahut Garam',
    simpleShortLabel: 'OVERHEATED • SAVDHAAN',
    simpleHeadline: 'Market Kaafi Garam Hai — Lalach Se Bachein, Reserve Safe Rakhein',
    simpleGuidance:
      'Prices kaafi tezi se upar bhagi hain. Long-term SIP chalne dein, lekin naya bada buying hold par rakhein aur Gold/Safe cash balance rakhein.',
    sipAction: 'Base SIP Only',
    lumpsumAction: 'Wait For Dip',
    marketZoneText: 'Bahut Mehenga',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.16)',
    borderColor: 'rgba(239, 68, 68, 0.45)',
    icon: 'alert-circle',
    sipMultiplier: 0.7,
    stpAdvice: 'Check Asset Rebalance',
    headline: 'Euphoria Extension — Protect Gains & Keep Reserve Dry Powder',
    guidance:
      'Elevated stretch well above 200-DMA & overbought RSI raises near-term pullback risk. Never panic-sell long SIPs, but review equity:debt/gold targets.',
  };
}

/**
 * Standard Wilder Smoothed RSI-14 on chronological closing prices.
 */
export function computeWilderRsi(closes = [], period = 14) {
  if (!Array.isArray(closes) || closes.length < period + 2) return 50;
  const recent = closes.slice(-Math.max(90, period * 4));
  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const diff = recent[i] - recent[i - 1];
    if (diff >= 0) gainSum += diff;
    else lossSum -= diff;
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  for (let i = period + 1; i < recent.length; i++) {
    const diff = recent[i] - recent[i - 1];
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
  }

  if (avgLoss <= 1e-9) return 99.0;
  const rs = avgGain / avgLoss;
  return Number((100 - 100 / (1 + rs)).toFixed(1));
}

/**
 * Detect unadjusted stock splits / bonus cliffs (e.g. >42% single-day drop or >120% reverse jump)
 * so raw Bhavcopy prices never generate false "fire sale" alerts on split stocks like Kotak/AngelOne.
 */
export function detectCorporateSplit(points = []) {
  if (!Array.isArray(points) || points.length < 3) {
    return { hasUnadjustedSplit: false, splitIndex: -1, splitDate: null };
  }
  let lastSplitIdx = -1;
  for (let i = 1; i < points.length; i++) {
    const prev = Number(points[i - 1]?.close);
    const cur = Number(points[i]?.close);
    if (prev > 0 && cur > 0) {
      const ratio = cur / prev;
      if (ratio < 0.58 || ratio > 2.15) {
        lastSplitIdx = i;
      }
    }
  }
  return {
    hasUnadjustedSplit: lastSplitIdx !== -1,
    splitIndex: lastSplitIdx,
    splitDate: lastSplitIdx !== -1 ? points[lastSplitIdx].date : null,
  };
}

/**
 * Convert AMFI "DD-MM-YYYY" date string into "YYYY-MM-DD" ISO format.
 */
export function amfiDateToIso(ddmmyyyy) {
  if (!ddmmyyyy || typeof ddmmyyyy !== 'string') return '';
  const parts = ddmmyyyy.trim().split('-');
  if (parts.length !== 3) return ddmmyyyy;
  if (parts[0].length === 4) return ddmmyyyy;
  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

/**
 * Parse AMFI newest-first array [{date, nav}] into chronological ascending [{date, close}].
 */
export function normalizeAmfiToChronological(amfiData = []) {
  if (!Array.isArray(amfiData) || amfiData.length === 0) return [];
  const out = [];
  for (let i = amfiData.length - 1; i >= 0; i--) {
    const row = amfiData[i];
    const nav = parseFloat(row?.nav);
    if (Number.isFinite(nav) && nav > 0) {
      out.push({
        date: amfiDateToIso(row.date),
        close: nav,
      });
    }
  }
  return out;
}

/**
 * Compute technical indicators, 50/200-DMA, drawdown, Wilder RSI, rolling chart curves,
 * and quantitative Mood Score (0..100) from chronological [{date, close}] data.
 */
export function analyzePriceSeries(points = [], options = {}) {
  const clean = (Array.isArray(points) ? points : []).filter(
    (p) => p && Number.isFinite(Number(p.close)) && Number(p.close) > 0
  );
  if (clean.length < 20) return null;

  const { checkSplits = false } = options;
  const splitInfo = checkSplits
    ? detectCorporateSplit(clean)
    : { hasUnadjustedSplit: false, splitIndex: -1, splitDate: null };

  const activePoints =
    splitInfo.hasUnadjustedSplit && splitInfo.splitIndex > 0
      ? clean.slice(splitInfo.splitIndex)
      : clean;

  if (activePoints.length < 15) {
    return {
      hasUnadjustedSplit: true,
      splitDate: splitInfo.splitDate,
      insufficientPostSplitHistory: true,
    };
  }

  const closes = activePoints.map((p) => Number(p.close));
  const n = closes.length;
  const latestClose = closes[n - 1];
  const prevClose = closes[n - 2] || latestClose;
  const dayChangePct = prevClose > 0 ? ((latestClose - prevClose) / prevClose) * 100 : 0;

  const win50 = Math.min(50, n);
  const dma50 = closes.slice(-win50).reduce((a, b) => a + b, 0) / win50;

  const win200 = Math.min(200, n);
  const dma200 = closes.slice(-win200).reduce((a, b) => a + b, 0) / win200;
  const hasFull200Dma = n >= 190;

  let dma200Prev = dma200;
  if (n >= win200 + 20) {
    const startPrev = n - win200 - 20;
    dma200Prev = closes.slice(startPrev, startPrev + win200).reduce((a, b) => a + b, 0) / win200;
  } else if (n >= 40) {
    const prevSlice = closes.slice(0, -15);
    dma200Prev = prevSlice.reduce((a, b) => a + b, 0) / prevSlice.length;
  }
  const dma200SlopePct = dma200Prev > 0 ? ((dma200 - dma200Prev) / dma200Prev) * 100 : 0;
  const dma200Trend =
    dma200SlopePct > 0.35 ? 'RISING' : dma200SlopePct < -0.35 ? 'FALLING' : 'FLAT';

  const distFrom200DmaPct = dma200 > 0 ? ((latestClose - dma200) / dma200) * 100 : 0;
  const distFrom50DmaPct = dma50 > 0 ? ((latestClose - dma50) / dma50) * 100 : 0;

  const slice52W = closes.slice(-Math.min(252, n));
  const high52W = Math.max(...slice52W);
  const low52W = Math.min(...slice52W);
  const drawdownFrom52WHighPct = high52W > 0 ? ((latestClose - high52W) / high52W) * 100 : 0;
  const reboundFrom52WLowPct = low52W > 0 ? ((latestClose - low52W) / low52W) * 100 : 0;
  const range52WPositionPct =
    high52W > low52W
      ? clamp(((latestClose - low52W) / (high52W - low52W)) * 100, 0, 100)
      : 50;

  const startIdx1Y = Math.max(0, n - 252);
  const change1yPct =
    closes[startIdx1Y] > 0 ? ((latestClose - closes[startIdx1Y]) / closes[startIdx1Y]) * 100 : 0;

  const rsi14 = computeWilderRsi(closes, 14);

  // 1Y Annualized Volatility (%)
  const volSlice = slice52W;
  const dailyRets = [];
  for (let i = 1; i < volSlice.length; i++) {
    if (volSlice[i - 1] > 0) {
      dailyRets.push((volSlice[i] - volSlice[i - 1]) / volSlice[i - 1]);
    }
  }
  let volatility1Y = 14.0;
  if (dailyRets.length > 10) {
    const mean = dailyRets.reduce((a, b) => a + b, 0) / dailyRets.length;
    const variance =
      dailyRets.reduce((a, r) => a + (r - mean) * (r - mean), 0) / dailyRets.length;
    volatility1Y = Math.sqrt(variance) * Math.sqrt(252) * 100;
  }

  // Quantitative Composite Score (0 = Deep Fear/Dip, 100 = Overheated Greed)
  const dmaFactor = clamp(45 + distFrom200DmaPct * 3.1, 0, 100);
  const ddAdj = clamp(100 + drawdownFrom52WHighPct * 4.2, 0, 100);
  const rangeFactor = 0.5 * range52WPositionPct + 0.5 * ddAdj;
  const rsiFactor = clamp((rsi14 - 22) * 1.68, 0, 100);
  const moodScore = Math.round(clamp(0.45 * dmaFactor + 0.30 * rangeFactor + 0.25 * rsiFactor, 0, 100));
  const regime = getMoodRegime(moodScore);

  // Build rolling 50-DMA & 200-DMA series for up to trailing 260 days (O(N) sliding sums)
  const plotCount = Math.min(260, n);
  const startPlot = n - plotCount;
  const prefixSums = new Array(n + 1).fill(0);
  for (let i = 0; i < n; i++) {
    prefixSums[i + 1] = prefixSums[i] + closes[i];
  }

  const chartSeries = [];
  for (let i = startPlot; i < n; i++) {
    const endIdx = i + 1;
    const s200 = Math.max(0, endIdx - 200);
    const s50 = Math.max(0, endIdx - 50);
    const ma200Val = (prefixSums[endIdx] - prefixSums[s200]) / (endIdx - s200);
    const ma50Val = (prefixSums[endIdx] - prefixSums[s50]) / (endIdx - s50);
    chartSeries.push({
      date: activePoints[i].date,
      close: closes[i],
      dma200: Number(ma200Val.toFixed(2)),
      dma50: Number(ma50Val.toFixed(2)),
      hasTrue200Dma: endIdx >= 190,
    });
  }

  return {
    latestClose: Number(latestClose.toFixed(2)),
    prevClose: Number(prevClose.toFixed(2)),
    latestDate: activePoints[n - 1].date,
    dayChangePct: Number(dayChangePct.toFixed(2)),
    change1yPct: Number(change1yPct.toFixed(2)),
    dma50: Number(dma50.toFixed(2)),
    dma200: Number(dma200.toFixed(2)),
    hasFull200Dma,
    dma200SlopePct: Number(dma200SlopePct.toFixed(2)),
    dma200Trend,
    goldenCross: dma50 >= dma200,
    distFrom200DmaPct: Number(distFrom200DmaPct.toFixed(2)),
    distFrom50DmaPct: Number(distFrom50DmaPct.toFixed(2)),
    high52W: Number(high52W.toFixed(2)),
    low52W: Number(low52W.toFixed(2)),
    drawdownFrom52WHighPct: Number(drawdownFrom52WHighPct.toFixed(2)),
    reboundFrom52WLowPct: Number(reboundFrom52WLowPct.toFixed(2)),
    range52WPositionPct: Math.round(range52WPositionPct),
    rsi14,
    volatility1Y: Number(volatility1Y.toFixed(1)),
    moodScore,
    regime,
    pointsCount: n,
    chartSeries,
    hasUnadjustedSplit: splitInfo.hasUnadjustedSplit,
    splitDate: splitInfo.splitDate,
  };
}

/**
 * Walk multi-year AMFI index history (1,400–3,400 days) in O(N) time
 * to measure true historical 1-Year forward return distributions at today's distance from 200-DMA.
 */
export function computeHistoricalZoneStats(amfiPointsChronological = [], currentDist200Pct = 0) {
  if (!Array.isArray(amfiPointsChronological) || amfiPointsChronological.length < 520) {
    return null;
  }
  const n = amfiPointsChronological.length;
  const closes = amfiPointsChronological.map((p) => p.close);
  const prefix = new Array(n + 1).fill(0);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + closes[i];

  const fwdReturns = [];
  const lookbackForward = 250; // ~1 trading year
  for (let i = 200; i < n - lookbackForward; i++) {
    const ma200 = (prefix[i + 1] - prefix[i + 1 - 200]) / 200;
    if (ma200 <= 0) continue;
    const distPct = ((closes[i] - ma200) / ma200) * 100;
    if (Math.abs(distPct - currentDist200Pct) <= 3.5) {
      const fwd1Y = ((closes[i + lookbackForward] - closes[i]) / closes[i]) * 100;
      if (Number.isFinite(fwd1Y)) fwdReturns.push(fwd1Y);
    }
  }

  if (fwdReturns.length < 15) return null;
  fwdReturns.sort((a, b) => a - b);
  const mid = Math.floor(fwdReturns.length / 2);
  const median1YFwdPct = Number(fwdReturns[mid].toFixed(1));
  const positiveCount = fwdReturns.filter((r) => r > 0).length;
  const winRatePct = Math.round((positiveCount / fwdReturns.length) * 100);
  const worst1YFwdPct = Number(fwdReturns[0].toFixed(1));
  const best1YFwdPct = Number(fwdReturns[fwdReturns.length - 1].toFixed(1));

  const startYear = (amfiPointsChronological[0].date || '').slice(0, 4);
  const endYear = (amfiPointsChronological[n - 1].date || '').slice(0, 4);

  return {
    sampleDays: fwdReturns.length,
    totalHistoryDays: n,
    winRatePct,
    median1YFwdPct,
    worst1YFwdPct,
    best1YFwdPct,
    windowLabel: startYear && endYear ? `${startYear}–${endYear}` : `${Math.round(n / 250)}Y AMFI`,
  };
}

/**
 * Compute live market breadth across liquid NSE EQ shares (Daily Turnover >= ₹10 Cr),
 * automatically excluding extreme corporate split distortion (>52% unadjusted drop).
 */
export function computeMarketBreadthFromNse(nseStocks = []) {
  if (!Array.isArray(nseStocks) || nseStocks.length === 0) {
    return {
      sampleCount: 0,
      advances: 0,
      declines: 0,
      advDeclineRatio: 1,
      avgDrawdownPct: -8.5,
      pctWithin5PctOfHigh: 0,
      pctInSmartDip: 0,
      pctDeepCorrection: 0,
    };
  }

  let advances = 0;
  let declines = 0;
  let totalAll = 0;
  let ddSum = 0;
  let ddCount = 0;
  let within5 = 0;
  let smartDip = 0;
  let deepCorr = 0;

  for (let i = 0; i < nseStocks.length; i++) {
    const st = nseStocks[i];
    if (!st || st.series !== 'EQ' || !st.closePrice || st.closePrice <= 20) continue;
    if ((st.turnoverLacs || 0) < 1000) continue; // >= ₹10 Cr daily institutional liquidity

    totalAll++;
    if ((st.dayChangePct || 0) > 0.05) advances++;
    else if ((st.dayChangePct || 0) < -0.05) declines++;

    if (st.high52w && st.high52w > 0 && st.closePrice <= st.high52w * 1.02) {
      const dd = ((st.closePrice - st.high52w) / st.high52w) * 100;
      if (dd >= -50 && dd <= 0.5) {
        ddCount++;
        ddSum += dd;
        if (dd >= -5) within5++;
        else if (dd >= -20) smartDip++;
        else deepCorr++;
      }
    }
  }

  return {
    sampleCount: ddCount || totalAll,
    advances,
    declines,
    advDeclineRatio: declines > 0 ? Number((advances / declines).toFixed(2)) : advances > 0 ? 2.0 : 1.0,
    avgDrawdownPct: ddCount > 0 ? Number((ddSum / ddCount).toFixed(1)) : -8.5,
    pctWithin5PctOfHigh: ddCount > 0 ? Math.round((within5 / ddCount) * 100) : 0,
    pctInSmartDip: ddCount > 0 ? Math.round((smartDip / ddCount) * 100) : 0,
    pctDeepCorrection: ddCount > 0 ? Math.round((deepCorr / ddCount) * 100) : 0,
  };
}

/**
 * Dynamic "Aaj Kitna Daalun?" Smart Dip Capital & SIP Allocator Simulator.
 * Tilts incremental deployment cleanly between Large/Mid/Small, Gold Hedge, and Liquid STP Wait-Powder
 * strictly from live Mood Scores + user risk posture.
 */
export function buildSmartDipAllocator(monthlyBudget = 25000, riskProfile = 'BALANCED', benchmarks = []) {
  const budget = Math.max(2000, Number(monthlyBudget) || 25000);
  const byKey = new Map((Array.isArray(benchmarks) ? benchmarks : []).map((b) => [b.key, b]));

  const niftyScore = byKey.get('NIFTY50')?.moodScore ?? 55;
  const midScore = byKey.get('MID150')?.moodScore ?? 55;
  const smallScore = byKey.get('SMALL250')?.moodScore ?? 55;
  const goldScore = byKey.get('GOLD')?.moodScore ?? 50;

  // Higher opportunity = lower mood score (dip)
  const scoreOpp = (s) => clamp((75 - s) / 45, 0.35, 1.85);
  const equityComposite = (niftyScore * 0.45 + midScore * 0.3 + smallScore * 0.25);

  let cashBufferPct = 0;
  if (equityComposite >= 75) cashBufferPct = riskProfile === 'CONSERVATIVE' ? 35 : riskProfile === 'DIP_HUNTER' ? 20 : 28;
  else if (equityComposite >= 60) cashBufferPct = riskProfile === 'CONSERVATIVE' ? 22 : riskProfile === 'DIP_HUNTER' ? 10 : 15;
  else if (equityComposite >= 42) cashBufferPct = riskProfile === 'CONSERVATIVE' ? 12 : 0;
  else cashBufferPct = 0; // Smart/Extreme dip: 100% deployed into staggered assets

  let goldBase = goldScore <= 40 ? 15 : goldScore <= 60 ? 10 : 5;
  if (riskProfile === 'CONSERVATIVE') goldBase += 5;
  if (riskProfile === 'DIP_HUNTER' && equityComposite < 45) goldBase = 5;

  const equityTotalPct = Math.max(45, 100 - cashBufferPct - goldBase);

  let rawNifty = (riskProfile === 'CONSERVATIVE' ? 0.58 : riskProfile === 'DIP_HUNTER' ? 0.34 : 0.46) * scoreOpp(niftyScore);
  let rawMid = (riskProfile === 'CONSERVATIVE' ? 0.27 : riskProfile === 'DIP_HUNTER' ? 0.36 : 0.32) * scoreOpp(midScore);
  let rawSmall = (riskProfile === 'CONSERVATIVE' ? 0.15 : riskProfile === 'DIP_HUNTER' ? 0.30 : 0.22) * scoreOpp(smallScore);
  const rawSum = rawNifty + rawMid + rawSmall || 1;

  const niftyPct = Math.round((rawNifty / rawSum) * equityTotalPct);
  const midPct = Math.round((rawMid / rawSum) * equityTotalPct);
  const smallPct = Math.max(0, equityTotalPct - niftyPct - midPct);

  const buckets = [
    {
      key: 'NIFTY50',
      label: 'Nifty 50 Core Index',
      simpleLabel: 'Top 50 Safe Stocks (Nifty)',
      pct: niftyPct,
      amount: Math.round((budget * niftyPct) / 100),
      color: '#10B981',
      tag: niftyScore <= 44 ? 'DIP BUY TILT' : niftyScore >= 68 ? 'CORE SIP ONLY' : 'STEADY CORE',
      simpleTag: niftyScore <= 44 ? 'Sasta Mauka • Zyada Daalo' : 'Stable Core SIP',
      moodScore: niftyScore,
    },
    {
      key: 'MID150',
      label: 'Nifty Midcap 150',
      simpleLabel: 'Midcap Growth Companies',
      pct: midPct,
      amount: Math.round((budget * midPct) / 100),
      color: '#38BDF8',
      tag: midScore <= 44 ? 'ATTRACTIVE DIP' : midScore >= 68 ? 'MODERATED' : 'BALANCED',
      simpleTag: midScore <= 44 ? 'Discount Zone' : 'Balanced Growth',
      moodScore: midScore,
    },
    {
      key: 'SMALL250',
      label: 'Nifty Smallcap 250',
      simpleLabel: 'Smallcap High-Growth',
      pct: smallPct,
      amount: Math.round((budget * smallPct) / 100),
      color: '#A855F7',
      tag: smallScore <= 44 ? 'CONTRARIAN DIP' : smallScore >= 68 ? 'TRIM RISK' : 'GROWTH SLEEVE',
      simpleTag: smallScore >= 68 ? 'Thoda Control Me Rakho' : 'High Growth Sleeve',
      moodScore: smallScore,
    },
    {
      key: 'GOLD',
      label: 'Gold ETF / Sovereign Hedge',
      simpleLabel: 'Gold Safety Shield',
      pct: goldBase,
      amount: Math.round((budget * goldBase) / 100),
      color: '#FBBF24',
      tag: goldScore <= 38 ? 'GOLD DIP HEDGE' : 'PORTFOLIO SHIELD',
      simpleTag: 'Market Girne Par Suraksha',
      moodScore: goldScore,
    },
  ];

  if (cashBufferPct > 0) {
    buckets.push({
      key: 'LIQUID_STP',
      label: 'Liquid / Arbitrage STP Reserve',
      simpleLabel: 'Safe Cash Reserve (Dip Fund)',
      pct: cashBufferPct,
      amount: Math.max(0, budget - buckets.reduce((a, b) => a + b.amount, 0)),
      color: '#94A3B8',
      tag: 'DIP AMMUNITION',
      simpleTag: 'Market Gire Tab Lagane Ke Liye',
      moodScore: null,
    });
  } else {
    // Fix rounding residual on top bucket
    const diff = budget - buckets.reduce((a, b) => a + b.amount, 0);
    buckets[0].amount += diff;
  }

  return {
    monthlyBudget: budget,
    riskProfile,
    equityTotalPct,
    cashBufferPct,
    goldBase,
    buckets: buckets.filter((b) => b.pct > 0),
    strategyNote:
      cashBufferPct > 0
        ? `Because Large/Momentum indices are warm (${Math.round(equityComposite)}/100), holding ${cashBufferPct}% in Liquid/Arbitrage STP lets you auto-deploy harder whenever Mood drops below 40.`
        : `Indices sit in an attractive accumulation band (${Math.round(equityComposite)}/100) — 100% staggered deployment maximized into Core Equity + Gold Hedge.`,
    simpleStrategyNote:
      cashBufferPct > 0
        ? `Market abhi thoda garam (${Math.round(equityComposite)}/100) hai — isliye ${cashBufferPct}% paisa Safe Reserve me rakhna smart hai taaki jab dip aaye tab saste me kharid sakein.`
        : `Market abhi sahi ya discount rate (${Math.round(equityComposite)}/100) par hai — apna 100% budget Equity + Gold me chalne dein.`,
  };
}

/**
 * Scan Watchlist, 50-Whale backed NSE companies, and Liquid Market Leaders for verified Smart Dips,
 * computing real post-split 200-DMA, RSI-14, and Drawdown from 52W High.
 */
export function buildDipRadarLists({
  nseStocks = [],
  stockHistoryMap = new Map(),
  watchlist = [],
  whalesList = [],
}) {
  const nseMap = new Map();
  nseStocks.forEach((s) => {
    if (s && s.symbol) nseMap.set(s.symbol.toUpperCase(), s);
  });

  const enrichDipCandidate = (st) => {
    if (!st || !st.symbol) return null;
    const pts = stockHistoryMap.get(st.symbol.toUpperCase()) || [];
    const tech = pts.length >= 20 ? analyzePriceSeries(pts, { checkSplits: true }) : null;
    if (tech?.insufficientPostSplitHistory) return null;

    const latestPrice = st.closePrice || tech?.latestClose || null;
    if (!latestPrice || latestPrice <= 0) return null;

    const high52w =
      tech?.high52W > 0
        ? tech.high52W
        : st.high52w > 0
        ? st.high52w
        : null;
    const ddPct =
      high52w && high52w > 0 ? Number((((latestPrice - high52w) / high52w) * 100).toFixed(1)) : null;

    // Exclude unverified (>52%) cliffs when history wasn't fetched
    if (!tech && ddPct !== null && ddPct < -52) return null;
    // If corporate split occurred within 1Y and post-split drawdown is negligible, don't mislabel as dip
    if (tech?.hasUnadjustedSplit && ddPct !== null && ddPct > -4) return null;

    const whales = getWhalesHoldingStock(st.symbol, st.name, whalesList);
    const rsi14 = tech?.rsi14 ?? null;
    const dist200 = tech?.distFrom200DmaPct ?? null;

    let dipBadge = 'WATCH';
    let dipColor = '#38BDF8';
    if (ddPct !== null && ddPct <= -20) {
      dipBadge = rsi14 !== null && rsi14 <= 38 ? 'OVERSOLD DIP' : 'DEEP PULLBACK';
      dipColor = '#10B981';
    } else if (ddPct !== null && ddPct <= -10) {
      dipBadge = dist200 !== null && dist200 < 0 ? 'BELOW 200-DMA' : 'SMART DIP';
      dipColor = '#22D3EE';
    } else if ((st.dayChangePct || 0) <= -2) {
      dipBadge = 'DAY DIP';
      dipColor = '#F59E0B';
    } else {
      dipBadge = 'NEAR HIGH';
      dipColor = '#94A3B8';
    }

    return {
      ...st,
      closePrice: latestPrice,
      high52w,
      drawdownPct: ddPct,
      distFrom200DmaPct: dist200,
      dma200: tech?.dma200 ?? null,
      rsi14,
      whaleCount: whales.length,
      whaleNames: whales.slice(0, 3).map((w) => w.whaleName),
      dipBadge,
      dipColor,
    };
  };

  // 1. User Saved Watchlist (NSE Equity Matches)
  const watchlistItems = [];
  const seenWl = new Set();
  (watchlist || []).forEach((w) => {
    const sym = String(w?.symbol || w?.key || '').toUpperCase().replace(/\.(NS|BO)$/i, '').trim();
    if (!sym || seenWl.has(sym)) return;
    const st = nseMap.get(sym);
    if (st) {
      seenWl.add(sym);
      const enriched = enrichDipCandidate(st);
      if (enriched) watchlistItems.push(enriched);
    }
  });
  watchlistItems.sort((a, b) => (a.drawdownPct ?? 0) - (b.drawdownPct ?? 0));

  // 2. Whale-Backed Indian Stocks in Meaningful Pullback (<= -5% off 52W High)
  const whaleItems = [];
  const leaderItems = [];
  for (let i = 0; i < nseStocks.length; i++) {
    const st = nseStocks[i];
    if (!st || st.series !== 'EQ' || !st.closePrice || st.closePrice < 25) continue;
    if ((st.isin || '').startsWith('INF') || /\bETF\b/i.test(st.name || '')) continue;
    if ((st.turnoverLacs || 0) < 1000) continue; // ₹10 Cr+ liquidity filter
    const rawDd =
      st.high52w > 0 ? ((st.closePrice - st.high52w) / st.high52w) * 100 : null;
    if (rawDd === null || rawDd > -5 || rawDd < -55) continue;

    const enriched = enrichDipCandidate(st);
    if (!enriched || enriched.drawdownPct === null || enriched.drawdownPct > -5) continue;

    if (enriched.whaleCount > 0) {
      whaleItems.push(enriched);
    }
    if ((st.turnoverLacs || 0) >= 10000 && enriched.drawdownPct <= -8) {
      leaderItems.push(enriched);
    }
  }

  whaleItems.sort(
    (a, b) =>
      b.whaleCount - a.whaleCount ||
      (a.drawdownPct ?? 0) - (b.drawdownPct ?? 0)
  );
  leaderItems.sort((a, b) => {
    const aScore = Math.abs(a.drawdownPct ?? 0) * Math.log10(Math.max(100, (a.turnoverLacs || 100) / 100));
    const bScore = Math.abs(b.drawdownPct ?? 0) * Math.log10(Math.max(100, (b.turnoverLacs || 100) / 100));
    return bScore - aScore;
  });

  return {
    watchlistDips: watchlistItems.slice(0, 15),
    whaleDips: whaleItems.slice(0, 18),
    leaderDips: leaderItems.slice(0, 20),
  };
}

let cachedMoodReport = null;
let cachedMoodAt = 0;
const MOOD_CACHE_TTL_MS = 5 * 60 * 1000;
const MOOD_INTRADAY_CACHE_TTL_MS = 60 * 1000;
const IST_OFFSET_SEC = 19800; // UTC+05:30 (fixed India Standard Time)

export function toIstIsoDate(unixSec) {
  const sec = Number(unixSec);
  if (!Number.isFinite(sec) || sec <= 0) return null;
  return new Date((sec + IST_OFFSET_SEC) * 1000).toISOString().slice(0, 10);
}

export function toIstTimeLabel(unixSec) {
  const sec = Number(unixSec);
  if (!Number.isFinite(sec) || sec <= 0) return null;
  return `${new Date((sec + IST_OFFSET_SEC) * 1000).toISOString().slice(11, 16)} IST`;
}

export function isIndiaEquityMarketHoursNow(nowMs = Date.now()) {
  const d = new Date(nowMs + IST_OFFSET_SEC * 1000);
  const day = d.getUTCDay(); // 1 = Mon .. 5 = Fri
  if (day < 1 || day > 5) return false;
  const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
  return mins >= 555 && mins <= 935; // 09:15 .. 15:35 IST
}

export function mergeYahooLiveIntoSeries(basePts = [], yahooTick = null) {
  if (!Array.isArray(basePts) || basePts.length === 0 || !yahooTick) {
    return { points: basePts || [], usedOverlay: false, isLiveIntraday: false, liveTimeLabel: null };
  }
  const livePrice = Number(yahooTick.livePrice);
  const istDate = yahooTick.istDate;
  if (!Number.isFinite(livePrice) || livePrice <= 0 || !istDate) {
    return { points: basePts, usedOverlay: false, isLiveIntraday: false, liveTimeLabel: null };
  }

  const pts = [...basePts];
  const lastPt = pts[pts.length - 1];
  const lastDate = String(lastPt?.date || '');
  const roundedLive = Number(livePrice.toFixed(2));
  const intradayFlag = Boolean(yahooTick.isMarketOpen || isIndiaEquityMarketHoursNow());

  if (istDate > lastDate) {
    // Backfill any intermediate trading candles between Supabase EOD & today
    const extraBars = Array.isArray(yahooTick.dailyBars) ? yahooTick.dailyBars : [];
    extraBars.forEach((b) => {
      if (b && b.date && b.date > lastDate && b.date < istDate && b.close > 0) {
        pts.push({ date: b.date, close: Number(Number(b.close).toFixed(2)) });
      }
    });
    pts.push({ date: istDate, close: roundedLive });
    return {
      points: pts,
      usedOverlay: true,
      isLiveIntraday: intradayFlag,
      liveTimeLabel: yahooTick.istTime || null,
    };
  }

  if (istDate === lastDate && yahooTick.isMarketOpen) {
    pts[pts.length - 1] = { date: istDate, close: roundedLive };
    return {
      points: pts,
      usedOverlay: true,
      isLiveIntraday: true,
      liveTimeLabel: yahooTick.istTime || null,
    };
  }

  return { points: pts, usedOverlay: false, isLiveIntraday: false, liveTimeLabel: null };
}

export async function fetchYahooLiveTick(nseSymbol, timeoutMs = 4500) {
  const cleanSym = String(nseSymbol || '').toUpperCase().replace(/\.(NS|BO)$/i, '').trim();
  if (!cleanSym || typeof fetch !== 'function') return null;

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanSym + '.NS')}?range=5d&interval=1d`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      ...(controller ? { signal: controller.signal } : {}),
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    const res = json?.chart?.result?.[0];
    const meta = res?.meta || {};
    const livePrice = Number(meta.regularMarketPrice);
    const istDate = toIstIsoDate(meta.regularMarketTime);
    if (!Number.isFinite(livePrice) || livePrice <= 0 || !istDate) return null;

    const tsList = Array.isArray(res?.timestamp) ? res.timestamp : [];
    const quoteCloses = res?.indicators?.quote?.[0]?.close || [];
    const barByDate = new Map();
    for (let i = 0; i < tsList.length; i++) {
      const d = toIstIsoDate(tsList[i]);
      const c = Number(quoteCloses[i]);
      if (d && Number.isFinite(c) && c > 0) {
        barByDate.set(d, Number(c.toFixed(2)));
      }
    }
    const dailyBars = Array.from(barByDate.entries())
      .map(([date, close]) => ({ date, close }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    let prevClose = null;
    for (let i = dailyBars.length - 1; i >= 0; i--) {
      if (dailyBars[i].date < istDate) {
        prevClose = dailyBars[i].close;
        break;
      }
    }

    const dayChangePct =
      prevClose && prevClose > 0 ? Number((((livePrice - prevClose) / prevClose) * 100).toFixed(2)) : null;

    return {
      symbol: cleanSym,
      livePrice: Number(livePrice.toFixed(2)),
      istDate,
      istTime: toIstTimeLabel(meta.regularMarketTime),
      marketState: meta.marketState || null,
      isMarketOpen: meta.marketState === 'REGULAR',
      prevClose,
      dayChangePct,
      dailyBars,
    };
  } catch (err) {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Fetch complete Live Market Mood & Smart Dip Radar Snapshot:
 * - Batch NSE ETF daily Bhavcopy history + spot snapshots (Supabase)
 * - Real-time Yahoo Finance NSE ETF intraday & same-day EOD overlay (updates live 9:15 AM–3:30 PM & post-close)
 * - Multi-year AMFI Direct Index NAV curves (api.mfapi.in) for 13Y forward edge
 * - Live NSE Market Breadth across 10Cr+ liquid EQ shares
 * - Pre-validated Watchlist, Whale & Top Quality Pullback candidates with 200-DMA & RSI-14
 */
export async function fetchMarketMoodSnapshot({
  forceRefresh = false,
  watchlist = [],
  whalesList = null,
} = {}) {
  const now = Date.now();
  const activeTtl = isIndiaEquityMarketHoursNow(now)
    ? MOOD_INTRADAY_CACHE_TTL_MS
    : MOOD_CACHE_TTL_MS;
  if (!forceRefresh && cachedMoodReport && now - cachedMoodAt < activeTtl) {
    // Re-run lightweight scanner with latest watchlist without refetching APIs
    const updatedDips = buildDipRadarLists({
      nseStocks: cachedMoodReport._nseStocks || [],
      stockHistoryMap: cachedMoodReport._stockHistoryMap || new Map(),
      watchlist,
      whalesList: cachedMoodReport._whalesList || [],
    });
    return {
      ...cachedMoodReport,
      ...updatedDips,
    };
  }

  const etfSymbols = BENCHMARK_CONFIGS.map((b) => b.etfSymbol);

  // 1. Fetch NSE directory + whales + ETF histories + AMFI + Live Yahoo benchmark ticks concurrently
  const [nseStocks, resolvedWhales, etfHistMap, amfiResults, yahooBenchTicks] = await Promise.all([
    fetchNseStocksIndex({ forceRefresh }).catch(() => []),
    Array.isArray(whalesList) && whalesList.length > 0
      ? Promise.resolve(whalesList)
      : fetchLiveWhales().catch(() => []),
    fetchBatchNseHistories(etfSymbols).catch(() => new Map()),
    Promise.all(
      BENCHMARK_CONFIGS.map(async (cfg) => {
        if (!cfg.amfiCode) return { key: cfg.key, points: [] };
        try {
          const payload = await fetchSchemeRaw(cfg.amfiCode);
          return {
            key: cfg.key,
            points: normalizeAmfiToChronological(payload?.data || []),
          };
        } catch (e) {
          return { key: cfg.key, points: [] };
        }
      })
    ),
    Promise.all(
      BENCHMARK_CONFIGS.map(async (cfg) => ({
        key: cfg.key,
        tick: await fetchYahooLiveTick(cfg.etfSymbol),
      }))
    ).catch(() => []),
  ]);

  const nseMap = new Map((nseStocks || []).map((s) => [s.symbol, s]));
  const amfiMap = new Map(amfiResults.map((r) => [r.key, r.points]));
  const yahooBenchMap = new Map(
    (yahooBenchTicks || []).filter((r) => r && r.tick).map((r) => [r.key, r.tick])
  );

  // 2. Analyze every benchmark index/sector/gold cleanly
  const benchmarks = BENCHMARK_CONFIGS.map((cfg) => {
    const etfRow = nseMap.get(cfg.etfSymbol) || null;
    const etfPts = etfHistMap.get(cfg.etfSymbol) || [];
    const amfiPts = amfiMap.get(cfg.key) || [];

    // Prefer NSE ETF 260d official price series when present (up to today EOD & in INR ETF units),
    // fallback seamlessly to live AMFI NAV curve if ETF history is unavailable offline.
    const primaryPts = etfPts.length >= 200 ? etfPts : amfiPts;
    const primarySource = etfPts.length >= 200 ? 'NSE_ETF' : amfiPts.length >= 50 ? 'AMFI_INDEX' : 'SNAPSHOT';

    // Apply live Yahoo intraday / same-day EOD tick when newer than Supabase Bhavcopy (same ETF ₹ scale)
    const yhTick = primarySource === 'NSE_ETF' ? yahooBenchMap.get(cfg.key) || null : null;
    const mergedSeries = mergeYahooLiveIntoSeries(primaryPts, yhTick);
    const effectivePts = mergedSeries.points;
    const usedRealtimeOverlay = mergedSeries.usedOverlay;
    const isLiveIntraday = mergedSeries.isLiveIntraday;

    let analysis = analyzePriceSeries(effectivePts, { checkSplits: false });
    if (!analysis && etfRow?.closePrice > 0) {
      const estHigh = etfRow.high52w || etfRow.closePrice;
      const estLow = etfRow.low52w || etfRow.closePrice;
      const dd = estHigh > 0 ? ((etfRow.closePrice - estHigh) / estHigh) * 100 : 0;
      const score = Math.round(clamp(78 + dd * 2.5, 10, 95));
      analysis = {
        latestClose: etfRow.closePrice,
        prevClose: etfRow.prevClose || etfRow.closePrice,
        latestDate: etfRow.lastTradeDate || 'Latest',
        dayChangePct: etfRow.dayChangePct ?? 0,
        change1yPct: etfRow.change1yPct ?? 0,
        dma50: etfRow.closePrice,
        dma200: etfRow.closePrice,
        hasFull200Dma: false,
        dma200SlopePct: 0,
        dma200Trend: 'FLAT',
        goldenCross: true,
        distFrom200DmaPct: 0,
        distFrom50DmaPct: 0,
        high52W: estHigh,
        low52W: estLow,
        drawdownFrom52WHighPct: Number(dd.toFixed(2)),
        reboundFrom52WLowPct: 0,
        range52WPositionPct: 50,
        rsi14: 50,
        volatility1Y: 15,
        moodScore: score,
        regime: getMoodRegime(score),
        pointsCount: 1,
        chartSeries: [],
      };
    }

    // Prefer fresh live Yahoo tick when newer than Bhavcopy row; otherwise exact NSE Bhavcopy EOD
    const liveClose = usedRealtimeOverlay
      ? analysis?.latestClose ?? yhTick?.livePrice ?? etfRow?.closePrice ?? null
      : etfRow?.closePrice > 0
      ? etfRow.closePrice
      : analysis?.latestClose ?? null;
    const liveDayPct = usedRealtimeOverlay
      ? analysis?.dayChangePct ?? yhTick?.dayChangePct ?? etfRow?.dayChangePct ?? 0
      : etfRow?.dayChangePct !== null && etfRow?.dayChangePct !== undefined
      ? etfRow.dayChangePct
      : analysis?.dayChangePct ?? 0;

    const latestDate = usedRealtimeOverlay
      ? yhTick?.istDate || analysis?.latestDate || 'Live'
      : etfRow?.lastTradeDate || analysis?.latestDate || 'Live';

    const high52W = Math.max(etfRow?.high52w || 0, analysis?.high52W || 0, liveClose || 0) || liveClose;
    const lowCandidates = [etfRow?.low52w, analysis?.low52W, liveClose].filter((v) => v > 0);
    const low52W = lowCandidates.length > 0 ? Math.min(...lowCandidates) : liveClose;

    // Multi-year forward edge from AMFI historical index curve
    const amfiAnalysis = amfiPts.length >= 200 ? analyzePriceSeries(amfiPts, { checkSplits: false }) : null;
    const refDist200 = analysis?.distFrom200DmaPct ?? amfiAnalysis?.distFrom200DmaPct ?? 0;
    const historicalStats = computeHistoricalZoneStats(amfiPts, refDist200);

    return {
      ...cfg,
      primarySource: usedRealtimeOverlay ? 'YAHOO_LIVE_OVERLAY' : primarySource,
      usedRealtimeOverlay,
      isLiveIntraday,
      liveTickTimeIst: mergedSeries.liveTimeLabel,
      etfName: etfRow?.name || cfg.etfSymbol,
      latestClose: liveClose,
      dayChangePct: Number(Number(liveDayPct).toFixed(2)),
      latestDate,
      high52W,
      low52W,
      change1yPct: etfRow?.change1yPct ?? analysis?.change1yPct ?? 0,
      dma50: analysis?.dma50 ?? null,
      dma200: analysis?.dma200 ?? null,
      hasFull200Dma: Boolean(analysis?.hasFull200Dma),
      dma200Trend: analysis?.dma200Trend || 'FLAT',
      goldenCross: Boolean(analysis?.goldenCross),
      distFrom200DmaPct: analysis?.distFrom200DmaPct ?? 0,
      distFrom50DmaPct: analysis?.distFrom50DmaPct ?? 0,
      drawdownFrom52WHighPct: analysis?.drawdownFrom52WHighPct ?? 0,
      range52WPositionPct: analysis?.range52WPositionPct ?? 50,
      rsi14: analysis?.rsi14 ?? 50,
      volatility1Y: analysis?.volatility1Y ?? 14,
      moodScore: analysis?.moodScore ?? 50,
      regime: analysis?.regime || getMoodRegime(50),
      chartSeries: analysis?.chartSeries || amfiAnalysis?.chartSeries || [],
      historicalStats,
    };
  });

  // 3. Weighted Composite India Equity Market Mood Score (excluding Gold & single sector IT tilt)
  let weightSum = 0;
  let weightedScore = 0;
  benchmarks.forEach((b) => {
    if (b.weight > 0 && typeof b.moodScore === 'number') {
      weightedScore += b.moodScore * b.weight;
      weightSum += b.weight;
    }
  });
  const overallMoodScore = weightSum > 0 ? Math.round(weightedScore / weightSum) : 52;
  const overallRegime = getMoodRegime(overallMoodScore);

  const hasRealtimeOverlay = benchmarks.some((b) => b.usedRealtimeOverlay);
  const hasLiveIntradayTick = benchmarks.some((b) => b.isLiveIntraday);
  const liveTickTimeIst = benchmarks.find((b) => b.liveTickTimeIst)?.liveTickTimeIst || null;

  // 4. Compute NSE Market Breadth & Batch-Fetch Stock Histories for Dip Scanner Candidates
  const marketBreadth = computeMarketBreadthFromNse(nseStocks);

  const dipCandidateSymbols = new Set();
  const watchlistSyms = [];
  (watchlist || []).forEach((w) => {
    const sym = String(w?.symbol || w?.key || '').toUpperCase().replace(/\.(NS|BO)$/i, '').trim();
    if (sym) {
      dipCandidateSymbols.add(sym);
      if (nseMap.has(sym) && watchlistSyms.length < 6) watchlistSyms.push(sym);
    }
  });

  // Include whale-held Indian equities that are currently down >=5% from 52W High
  (resolvedWhales || []).forEach((w) => {
    if (!(w?.tag || '').includes('🇮🇳')) return;
    const holdings = Array.isArray(w.allHoldings) && w.allHoldings.length > 0 ? w.allHoldings : (w.topHoldings || []);
    holdings.forEach((h) => {
      const sym = String(h?.symbol || h?.yahooSymbol || '').toUpperCase().replace(/\.(NS|BO)$/i, '').trim();
      const row = sym ? nseMap.get(sym) : null;
      if (row && row.closePrice > 25 && row.high52w > 0) {
        const dd = ((row.closePrice - row.high52w) / row.high52w) * 100;
        if (dd <= -5 && dd >= -55) dipCandidateSymbols.add(sym);
      }
    });
  });

  // Pick top liquid non-ETF equity drawdown leaders (turnover >= ₹100 Cr, -8% to -52%)
  const sortedPullbacks = (nseStocks || [])
    .filter((s) => {
      if (!s || s.series !== 'EQ' || !s.closePrice || s.closePrice < 25) return false;
      if ((s.isin || '').startsWith('INF') || /\bETF\b/i.test(s.name || '')) return false;
      if ((s.turnoverLacs || 0) < 10000 || !s.high52w) return false;
      const dd = ((s.closePrice - s.high52w) / s.high52w) * 100;
      return dd <= -8 && dd >= -52;
    })
    .sort((a, b) => {
      const ddA = ((a.closePrice - a.high52w) / a.high52w) * 100;
      const ddB = ((b.closePrice - b.high52w) / b.high52w) * 100;
      const sA = Math.abs(ddA) * Math.log10(Math.max(100, (a.turnoverLacs || 100) / 100));
      const sB = Math.abs(ddB) * Math.log10(Math.max(100, (b.turnoverLacs || 100) / 100));
      return sB - sA;
    })
    .slice(0, 28);
  sortedPullbacks.forEach((s) => dipCandidateSymbols.add(s.symbol));

  const candidateList = Array.from(dipCandidateSymbols).slice(0, 108);
  const [stockHistoryMap, watchlistTicks] = await Promise.all([
    fetchBatchNseHistories(candidateList).catch(() => new Map()),
    hasRealtimeOverlay && watchlistSyms.length > 0
      ? Promise.all(watchlistSyms.map((s) => fetchYahooLiveTick(s))).catch(() => [])
      : Promise.resolve([]),
  ]);

  // Overlay live Yahoo intraday / same-day close onto saved NSE Watchlist stocks when newer than Bhavcopy
  let effectiveNseStocks = nseStocks;
  if (hasRealtimeOverlay && Array.isArray(watchlistTicks) && watchlistTicks.some(Boolean)) {
    const wlTickMap = new Map(watchlistTicks.filter(Boolean).map((t) => [t.symbol, t]));
    effectiveNseStocks = nseStocks.map((st) => {
      const tick = st?.symbol ? wlTickMap.get(st.symbol) : null;
      if (!tick) return st;
      const curHist = stockHistoryMap.get(st.symbol) || [];
      const merged = mergeYahooLiveIntoSeries(curHist, tick);
      if (merged.usedOverlay) {
        stockHistoryMap.set(st.symbol, merged.points);
        return {
          ...st,
          closePrice: tick.livePrice,
          dayChangePct: tick.dayChangePct ?? st.dayChangePct,
          high52w: Math.max(st.high52w || 0, tick.livePrice),
          lastTradeDate: tick.istDate || st.lastTradeDate,
        };
      }
      return st;
    });
  }

  const { watchlistDips, whaleDips, leaderDips } = buildDipRadarLists({
    nseStocks: effectiveNseStocks,
    stockHistoryMap,
    watchlist,
    whalesList: resolvedWhales,
  });

  const niftyAnchor = benchmarks.find((b) => b.key === 'NIFTY50') || benchmarks[0];
  const latestDataDate =
    benchmarks.find((b) => b.usedRealtimeOverlay && b.latestDate)?.latestDate ||
    benchmarks.find((b) => b.latestDate && b.latestDate !== 'Live')?.latestDate ||
    'Live EOD';

  const report = {
    overallMoodScore,
    overallRegime,
    niftyAnchor,
    benchmarks,
    marketBreadth,
    watchlistDips,
    whaleDips,
    leaderDips,
    latestDataDate,
    hasRealtimeOverlay,
    hasLiveIntradayTick,
    liveTickTimeIst,
    generatedAt: new Date().toISOString(),
    _nseStocks: effectiveNseStocks,
    _stockHistoryMap: stockHistoryMap,
    _whalesList: resolvedWhales,
  };

  cachedMoodReport = report;
  cachedMoodAt = Date.now();
  return report;
}

/**
 * Batch fetch 260-day EOD histories from Supabase `nse_stock_history` in one query.
 */
export async function fetchBatchNseHistories(symbols = []) {
  const result = new Map();
  const cleanSyms = Array.from(
    new Set(
      (symbols || [])
        .map((s) => String(s || '').toUpperCase().replace(/\.(NS|BO)$/i, '').trim())
        .filter(Boolean)
    )
  );
  if (cleanSyms.length === 0 || !isSupabaseConfigured() || !supabase) {
    return result;
  }

  try {
    const chunkSize = 36;
    const chunks = [];
    for (let i = 0; i < cleanSyms.length; i += chunkSize) {
      chunks.push(cleanSyms.slice(i, i + chunkSize));
    }

    const responses = await Promise.all(
      chunks.map((chunk) =>
        supabase
          .from('nse_stock_history')
          .select('symbol,history')
          .in('symbol', chunk)
      )
    );

    responses.forEach(({ data, error }) => {
      if (error || !Array.isArray(data)) return;
      data.forEach((row) => {
        if (!row?.symbol || !Array.isArray(row.history)) return;
        const pts = row.history
          .map((pt) => {
            if (!Array.isArray(pt) || pt.length < 2) return null;
            const close = parseFloat(pt[1]);
            if (!Number.isFinite(close) || close <= 0) return null;
            return {
              date: String(pt[0]),
              close,
            };
          })
          .filter(Boolean);
        if (pts.length > 0) {
          result.set(String(row.symbol).toUpperCase().trim(), pts);
        }
      });
    });
  } catch (err) {
    // Graceful network fallback
  }
  return result;
}

export function getQuickCachedMoodSummary() {
  if (!cachedMoodReport) return null;
  return {
    overallMoodScore: cachedMoodReport.overallMoodScore,
    overallRegime: cachedMoodReport.overallRegime,
    latestDataDate: cachedMoodReport.latestDataDate,
  };
}

export function sliceBenchmarkSeries(series = [], rangeKey = '1Y') {
  if (!Array.isArray(series) || series.length === 0) return [];
  const countMap = { '3M': 65, '6M': 130, '1Y': 252 };
  const target = countMap[rangeKey] || 252;
  return series.length <= target ? series : series.slice(-target);
}

/**
 * Build interactive SVG geometry plotting Close Price, Area Fill, and 200-DMA Trend Reference.
 */
export function buildDualDmaChartGeometry(points = [], fixedDma200 = null, width = 310, height = 168) {
  if (!Array.isArray(points) || points.length < 2) return null;
  const padTop = 14;
  const padBottom = 14;
  const usableH = Math.max(40, height - padTop - padBottom);

  const hasAllTrue200Dma = points.every((p) => p.hasTrue200Dma);
  const validDma200Vals = points.filter((p) => p.dma200 > 0 && p.hasTrue200Dma).map((p) => p.dma200);
  const vals = [];
  points.forEach((p) => {
    if (p.close > 0) vals.push(p.close);
  });
  validDma200Vals.forEach((v) => vals.push(v));
  if (fixedDma200 && fixedDma200 > 0) vals.push(fixedDma200);

  let minVal = Math.min(...vals);
  let maxVal = Math.max(...vals);
  if (maxVal <= minVal) {
    minVal *= 0.98;
    maxVal = maxVal * 1.02 + 0.01;
  }
  const span = maxVal - minVal;
  const toY = (v) => Number((padTop + usableH - ((v - minVal) / span) * usableH).toFixed(2));

  const coords = points.map((pt, idx) => {
    const x = Number((points.length === 1 ? width / 2 : (idx / (points.length - 1)) * width).toFixed(2));
    return {
      x,
      y: toY(pt.close),
      yDma200: pt.hasTrue200Dma ? toY(pt.dma200) : null,
      yDma50: toY(pt.dma50),
      point: pt,
    };
  });

  const linePath = coords.map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;
  const trueDmaCoords = coords.filter((c) => c.yDma200 !== null);
  const dma200Path =
    hasAllTrue200Dma || trueDmaCoords.length >= 12
      ? trueDmaCoords.map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x} ${c.yDma200}`).join(' ')
      : '';
  const dma200RefY = fixedDma200 > 0 ? toY(fixedDma200) : null;

  return {
    coords,
    linePath,
    areaPath,
    dma200Path,
    dma200RefY,
    minVal,
    maxVal,
  };
}
