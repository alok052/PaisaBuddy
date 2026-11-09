import { supabase, isSupabaseConfigured } from './supabaseClient';
import { mockWhales } from '../data/mockWhales';
import { mockStartups } from '../data/mockStartups';
import { mockConsensusStocks } from '../data/mockConsensus';
import nseStocksSeed from '../data/nseStocksSeed.json';

// Map of local bundled images for 100% reliable zero-lag display
const localWhaleImages = {
  '1': require('../../assets/whales/whale_1.jpg'),
  '2': require('../../assets/whales/whale_2.jpg'),
  '3': require('../../assets/whales/whale_3.jpg'),
  '4': require('../../assets/whales/whale_4.jpg'),
  '5': require('../../assets/whales/whale_5.jpg'),
  '6': require('../../assets/whales/whale_6.jpg'),
  '7': require('../../assets/whales/whale_7.jpg'),
  '8': require('../../assets/whales/whale_8.jpg'),
  '9': require('../../assets/whales/whale_9.jpg'),
  '10': require('../../assets/whales/whale_10.jpg'),
  '11': require('../../assets/whales/whale_11.jpg'),
  '12': require('../../assets/whales/whale_12.jpg'),
  '13': require('../../assets/whales/whale_13.jpg'),
  '14': require('../../assets/whales/whale_14.jpg'),
  '15': require('../../assets/whales/whale_15.jpg'),
  '16': require('../../assets/whales/whale_16.jpg'),
  '17': require('../../assets/whales/whale_17.jpg'),
  '18': require('../../assets/whales/whale_18.jpg'),
  '19': require('../../assets/whales/whale_19.jpg'),
  '20': require('../../assets/whales/whale_20.jpg'),
  '21': require('../../assets/whales/whale_21.jpg'),
  '22': require('../../assets/whales/whale_22.jpg'),
  '23': require('../../assets/whales/whale_23.jpg'),
  '24': require('../../assets/whales/whale_24.jpg'),
  '25': require('../../assets/whales/whale_25.jpg'),
  '26': require('../../assets/whales/whale_26.jpg'),
  '27': require('../../assets/whales/whale_27.jpg'),
  '28': require('../../assets/whales/whale_28.jpg'),
  '29': require('../../assets/whales/whale_29.jpg'),
  '30': require('../../assets/whales/whale_30.jpg'),
  '31': require('../../assets/whales/whale_31.jpg'),
  '32': require('../../assets/whales/whale_32.jpg'),
  '33': require('../../assets/whales/whale_33.jpg'),
  '34': require('../../assets/whales/whale_34.jpg'),
  '35': require('../../assets/whales/whale_35.jpg'),
  '36': require('../../assets/whales/whale_36.jpg'),
  '37': require('../../assets/whales/whale_37.jpg'),
  '38': require('../../assets/whales/whale_38.jpg'),
  '39': require('../../assets/whales/whale_39.jpg'),
  '40': require('../../assets/whales/whale_40.jpg'),
  '41': require('../../assets/whales/whale_41.jpg'),
  '42': require('../../assets/whales/whale_42.jpg'),
  '43': require('../../assets/whales/whale_43.jpg'),
  '44': require('../../assets/whales/whale_44.jpg'),
  '45': require('../../assets/whales/whale_45.jpg'),
  '46': require('../../assets/whales/whale_46.jpg'),
  '47': require('../../assets/whales/whale_47.jpg'),
  '48': require('../../assets/whales/whale_48.jpg'),
  '49': require('../../assets/whales/whale_49.jpg'),
  '50': require('../../assets/whales/whale_50.jpg'),
};

const LUXURY_PALETTES = [
  ['#059669', '#047857'], // Emerald
  ['#2563EB', '#1D4ED8'], // Sapphire
  ['#D97706', '#B45309'], // Amber
  ['#DC2626', '#B91C1C'], // Ruby
  ['#0891B2', '#0E7490'], // Cyan
  ['#4F46E5', '#4338CA'], // Indigo
  ['#0D9488', '#0F766E'], // Teal
  ['#475569', '#334155'], // Slate
  ['#7C3AED', '#6D28D9'], // Violet
  ['#E11D48', '#BE123C'], // Rose
];

const localWhaleGradients = {
  '1': ['#F97316', '#EF4444'],
  '2': ['#3B82F6', '#6366F1'],
  '3': ['#10B981', '#059669'],
  '4': ['#F59E0B', '#D97706'],
  '5': ['#1E293B', '#0F172A'],
  '6': ['#EC4899', '#BE185D'],
  '7': ['#06B6D4', '#0E7490'],
  '8': ['#84CC16', '#4D7C0F'],
  '9': ['#6366F1', '#4338CA'],
  '10': ['#14B8A6', '#0F766E'],
  '11': ['#F43F5E', '#BE123C'],
  '12': ['#334155', '#1E293B'],
};

const getWhaleGradient = (id) => {
  if (localWhaleGradients[id]) return localWhaleGradients[id];
  const num = parseInt(id || '1', 10);
  return LUXURY_PALETTES[num % LUXURY_PALETTES.length];
};

/**
 * Parse currency / INR formatted numbers safely (e.g. "₹5,003" -> 5003, "₹1,95,285 Cr" -> 195285).
 */
export function parsePriceNumber(val) {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (!val || typeof val !== 'string') return 0;
  const firstPart = val.split('(')[0];
  const cleaned = firstPart.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Strip INR conversion prefixes from global (USD/GBP/EUR) portfolio/stake strings
 * e.g. "₹27,96,256 Cr ($297.7B)" -> "$297.7B".
 */
export function formatGlobalPureCurrency(val) {
  if (!val || typeof val !== 'string') return val;
  const parenMatch = val.match(/\(([$£€][^)]+)\)/);
  if (parenMatch && parenMatch[1]) return parenMatch[1].trim();
  return val;
}

function normalizeGlobalHoldings(holdings = [], isIndia = true) {
  if (isIndia || !Array.isArray(holdings)) return holdings;
  return holdings.map((h) => (h ? { ...h, value: formatGlobalPureCurrency(h.value) } : h));
}

function parseForeignBillions(valStr) {
  if (!valStr || typeof valStr !== 'string') return 0;
  const target = formatGlobalPureCurrency(valStr);
  const m = target.match(/([$£€])\s*([0-9,.]+)\s*([TBM])?/i);
  if (!m) return 0;
  const num = parseFloat(m[2].replace(/,/g, ''));
  if (!Number.isFinite(num) || num <= 0) return 0;
  const usdMult = m[1] === '£' ? 1.34 : m[1] === '€' ? 1.12 : 1.0;
  const unit = (m[3] || '').toUpperCase();
  if (unit === 'T') return num * 1000 * usdMult;
  if (unit === 'M') return (num / 1000) * usdMult;
  return num * usdMult;
}

function formatUsdCompact(valInBillions) {
  if (!(valInBillions > 0)) return 'Global Consensus';
  if (valInBillions >= 1000) return `$${(valInBillions / 1000).toFixed(2)}T`;
  if (valInBillions >= 10) return `$${valInBillions.toFixed(1)}B`;
  if (valInBillions >= 1) return `$${valInBillions.toFixed(2)}B`;
  return `$${Math.round(valInBillions * 1000)}M`;
}

/**
 * Human-friendly relative timestamp for Live Sync Status Bar & Alerts.
 */
export function formatSyncTimeAgo(isoString) {
  if (!isoString) return 'Synced via Cloud';
  const ts = new Date(isoString).getTime();
  if (!Number.isFinite(ts)) return 'Synced via Cloud';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

/**
 * Normalize a Supabase whale row merged with local images, startups, and fallbacks.
 */
export function mapWhaleRow(item) {
  if (!item) return null;
  const idStr = String(item.id);
  const localWhale = mockWhales.find((w) => String(w.id) === idStr) || {};
  const isIndia = (item.tag || localWhale.tag || '').includes('🇮🇳');
  const rawTopHoldings = Array.isArray(item.top_holdings) && item.top_holdings.length > 0
    ? item.top_holdings
    : (localWhale.topHoldings || []);

  // Avoid reverting to stale local synthetic allHoldings if live top_holdings already has rich schema
  const hasRichTopHoldings = Boolean(rawTopHoldings[0] && (rawTopHoldings[0].cmp || rawTopHoldings[0].symbol));
  const rawAllHoldings =
    Array.isArray(item.all_holdings) && item.all_holdings.length > 0
      ? item.all_holdings
      : hasRichTopHoldings
      ? rawTopHoldings
      : (localWhale.allHoldings || rawTopHoldings);

  const rawPortfolioVal = item.portfolio_value || localWhale.portfolioValue;
  return {
    id: idStr,
    name: item.name || localWhale.name,
    tag: item.tag || localWhale.tag,
    portfolioValue: isIndia ? rawPortfolioVal : formatGlobalPureCurrency(rawPortfolioVal),
    return1Y: item.return_1y || localWhale.return1Y,
    isPositive: typeof item.is_positive === 'boolean' ? item.is_positive : Boolean(localWhale.isPositive),
    avatar: item.avatar || localWhale.avatar,
    avatarGradient: getWhaleGradient(idStr),
    localImage: localWhaleImages[idStr] || localWhale.localImage,
    topHoldings: normalizeGlobalHoldings(rawTopHoldings, isIndia),
    allHoldings: normalizeGlobalHoldings(rawAllHoldings, isIndia),
    startups: item.startups || localWhale.startups || [],
    recentMoves: item.recent_moves || localWhale.recentMoves || [],
    updatedAt: item.updated_at || null,
    filingStatus: isIndia
      ? 'SEBI Quarterly SHP'
      : (item.filing_status || 'US SEC Form 13F-HR • Yahoo Live'),
    lastSecFiling: item.last_sec_filing || null,
  };
}

function normalizeLocalWhale(w) {
  if (!w) return w;
  const isIndia = (w.tag || '').includes('🇮🇳');
  return {
    ...w,
    portfolioValue: isIndia ? w.portfolioValue : formatGlobalPureCurrency(w.portfolioValue),
    topHoldings: normalizeGlobalHoldings(w.topHoldings || [], isIndia),
    allHoldings: normalizeGlobalHoldings(w.allHoldings || w.topHoldings || [], isIndia),
    avatarGradient: w.avatarGradient || getWhaleGradient(String(w.id)),
    filingStatus: w.filingStatus || (isIndia ? 'SEBI Filings' : 'SEC 13F Filings'),
  };
}

/**
 * Fetch live whales from Supabase with fallback to complete local dataset
 */
export async function fetchLiveWhales() {
  if (!isSupabaseConfigured() || !supabase) {
    return mockWhales.map(normalizeLocalWhale);
  }

  try {
    const { data, error } = await supabase
      .from('whales')
      .select('*')
      .order('id', { ascending: true });

    if (error || !data || data.length === 0) {
      return mockWhales.map(normalizeLocalWhale);
    }

    const supabaseIds = new Set(data.map((d) => String(d.id)));
    const mergedList = data.map(mapWhaleRow).filter(Boolean);

    // Add any remaining whales from mockWhales not yet in Supabase
    mockWhales.forEach((w) => {
      if (!supabaseIds.has(String(w.id))) {
        mergedList.push(normalizeLocalWhale(w));
      }
    });

    // Sort numerically by ID so 1..50 appear in clean order
    mergedList.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));
    return mergedList;
  } catch (err) {
    console.log('Error fetching whales from Supabase:', err);
    return mockWhales.map(normalizeLocalWhale);
  }
}

/**
 * Subscribe to real-time whale portfolio updates from Supabase
 */
export function subscribeToWhales(onUpdate) {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  try {
    const channel = supabase
      .channel('realtime:whales')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whales' },
        (payload) => {
          if (onUpdate && payload.new) {
            onUpdate(mapWhaleRow(payload.new));
          }
        }
      )
      .subscribe();

    return channel;
  } catch (err) {
    console.log('Error setting up Supabase Realtime subscription:', err);
    return null;
  }
}

/**
 * Derive live Whale Consensus overlaps directly from the 50 whales' holdings,
 * enriched with curated institutional theses from mockConsensusStocks.
 */
export function buildLiveConsensusStocks(whalesList = [], fallbackConsensus = mockConsensusStocks) {
  if (!Array.isArray(whalesList) || whalesList.length === 0) {
    return fallbackConsensus;
  }

  const normalizeName = (s = '') =>
    s
      .toLowerCase()
      .replace(/\(.*?\)/g, '')
      .replace(/\b(ltd|limited|inc|corp|plc|co|class [abc]|adr)\b/g, '')
      .replace(/[^a-z0-9]/g, '');

  const normalizeSym = (s = '') =>
    (s || '').toUpperCase().replace(/\.(NS|BO|PA|L)$/, '').trim();

  const curatedBySym = {};
  const curatedByName = {};
  (fallbackConsensus || []).forEach((c) => {
    curatedBySym[normalizeSym(c.symbol)] = c;
    curatedByName[normalizeName(c.name)] = c;
  });

  // Aggregate across live whales (skip polluted synthetic allHoldings if raw mock has $140M junk)
  const buckets = new Map();
  whalesList.forEach((w) => {
    const holdings =
      Array.isArray(w.allHoldings) && w.allHoldings.length > 0 ? w.allHoldings : (w.topHoldings || []);
    const seenForThisWhale = new Set();

    holdings.forEach((h) => {
      if (!h || !h.name) return;
      // Guard against legacy enrich_whales.py placeholder "$140M" injected rows
      if (h.value === '$140M' && (w.tag || '').includes('🇮🇳')) return;
      if (h.value === '$140M' && h.name === 'Tata Motors') return;

      const symKey = normalizeSym(h.symbol || h.yahooSymbol);
      const nameKey = normalizeName(h.name);
      const bucketKey = symKey && symKey.length >= 2 ? `S:${symKey}` : `N:${nameKey}`;

      if (!bucketKey || seenForThisWhale.has(bucketKey)) return;
      seenForThisWhale.add(bucketKey);

      if (!buckets.has(bucketKey)) {
        const rawYahooSym = String(h.yahooSymbol || h.symbol || '').toUpperCase();
        const isGlobalBucket =
          (!rawYahooSym.endsWith('.NS') && !rawYahooSym.endsWith('.BO')) &&
          (!(w.tag || '').includes('🇮🇳') || String(h.cmp || '').startsWith('$') || String(h.value || '').includes('$'));
        buckets.set(bucketKey, {
          sym: symKey || normalizeName(h.name).toUpperCase().slice(0, 8),
          nameKey,
          name: h.name,
          sector: h.sector || 'Institutional Equities',
          cmp: h.cmp || null,
          change1Y: h.change1Y || null,
          isGlobal: isGlobalBucket,
          totalCr: 0,
          totalUsdB: 0,
          owners: [],
        });
      }

      const b = buckets.get(bucketKey);
      if (h.cmp && h.cmp !== '—') b.cmp = h.cmp;
      if (h.change1Y) b.change1Y = h.change1Y;
      if (h.sector && b.sector === 'Institutional Equities') b.sector = h.sector;
      if (b.isGlobal || String(h.value || '').includes('$') || String(h.value || '').includes('£')) {
        b.isGlobal = true;
        b.totalUsdB += parseForeignBillions(h.value);
      } else {
        b.totalCr += parsePriceNumber(h.value);
      }
      b.owners.push({
        name: w.name,
        stake: h.stake || 'Held',
        badge: (w.tag || '').replace(/^[^\w]+/, '').trim() || 'Super Investor',
      });
    });
  });

  const liveConsensus = [];
  buckets.forEach((b, idx) => {
    if (b.owners.length < 2) return;
    const curated = curatedBySym[b.sym] || curatedByName[b.nameKey];
    const changeStr = b.change1Y || (curated ? curated.change1Y : '+0.0%');
    const isPos = !String(changeStr).startsWith('-');
    let stakeVal;
    if (b.isGlobal && b.totalUsdB > 0) {
      stakeVal = formatUsdCompact(b.totalUsdB);
    } else if (b.totalCr >= 1) {
      stakeVal = `₹${Math.round(b.totalCr).toLocaleString('en-IN')} Cr`;
    } else {
      stakeVal = curated?.combinedStakeValue || `${b.owners.length} Funds`;
    }

    liveConsensus.push({
      id: curated?.id || `live_${b.sym}_${idx}`,
      symbol: b.sym,
      name: curated?.name || b.name,
      sector: curated?.sector || b.sector,
      cmp: b.cmp && b.cmp !== '—' ? b.cmp : curated?.cmp || 'Market Rate',
      change1Y: changeStr,
      isPositive: isPos,
      convictionScore: Math.min(99, 86 + b.owners.length * 3),
      combinedStakeValue: stakeVal,
      billionaires: b.owners.slice(0, 6),
      catalyst:
        curated?.catalyst ||
        `Concurrently held by ${b.owners.length} tracked institutional & billionaire portfolios.`,
      quarterMove:
        curated?.quarterMove ||
        `Verified overlap across ${b.owners.slice(0, 3).map((o) => o.name).join(', ')}.`,
    });
  });

  if (liveConsensus.length === 0) {
    return fallbackConsensus;
  }

  liveConsensus.sort(
    (a, b) =>
      b.billionaires.length - a.billionaires.length ||
      b.convictionScore - a.convictionScore
  );
  return liveConsensus;
}

/**
 * Fetch live Whale Consensus stocks (Supabase table -> live derivation -> static fallback)
 */
export async function fetchLiveConsensusStocks(whalesList = []) {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('whale_consensus')
        .select('*')
        .order('conviction_score', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((row) => ({
          id: String(row.id),
          symbol: row.symbol,
          name: row.name,
          sector: row.sector || 'Equities',
          cmp: row.cmp || '—',
          change1Y: row.change_1y || '+0.0%',
          isPositive: typeof row.is_positive === 'boolean' ? row.is_positive : !String(row.change_1y || '').startsWith('-'),
          convictionScore: row.conviction_score || 90,
          combinedStakeValue: row.combined_stake_value || 'Multi-Whale',
          billionaires: Array.isArray(row.billionaires) ? row.billionaires : [],
          catalyst: row.catalyst || '',
          quarterMove: row.quarter_move || '',
        }));
      }
    } catch (e) {
      // Fall through cleanly if whale_consensus table hasn't been created yet
    }
  }

  return buildLiveConsensusStocks(whalesList, mockConsensusStocks);
}

/**
 * Subscribe to real-time updates on whale_consensus table
 */
export function subscribeToConsensus(onUpdate) {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }
  try {
    return supabase
      .channel('realtime:whale_consensus')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whale_consensus' },
        () => {
          if (onUpdate) onUpdate();
        }
      )
      .subscribe();
  } catch (err) {
    return null;
  }
}

export async function fetchLiveStartups() {
  if (!isSupabaseConfigured() || !supabase) {
    return mockStartups;
  }

  try {
    const { data, error } = await supabase
      .from('startups')
      .select('*')
      .order('id', { ascending: true });

    if (error || !data || data.length === 0) {
      return mockStartups;
    }

    const supabaseIds = new Set(data.map((d) => String(d.id)));
    const mergedList = data.map((item) => {
      const local = mockStartups.find((m) =>
        m.name.toLowerCase().trim() === (item.name || '').toLowerCase().trim() ||
        String(m.id) === String(item.id)
      ) || {};
      return {
        ...local,
        id: String(item.id),
        name: item.name || local.name,
        shortIntro: local.shortIntro || (item.category ? item.category.split('•')[0].trim() : 'Growth Venture'),
        category: item.category || local.category,
        city: item.city || local.city,
        stage: item.stage || local.stage,
        isUnicorn: local.isUnicorn !== undefined ? local.isUnicorn : (item.is_unicorn !== undefined ? item.is_unicorn : false),
        valuation: item.valuation || local.valuation,
        totalRaised: item.total_raised || local.totalRaised,
        minInvestment: item.min_investment || local.minInvestment,
        investStatus: item.invest_status || local.investStatus,
        raisedSoFar: item.raised_so_far || local.raisedSoFar,
        targetAmount: item.target_amount || local.targetAmount,
        progressPercent: item.progress_percent || local.progressPercent,
        daysLeft: item.days_left || local.daysLeft,
        investorCount: item.investor_count || local.investorCount,
        iconBg: local.iconBg || item.icon_bg || '#1E293B',
        iconEmoji: local.iconEmoji || item.icon_emoji || '🚀',
        investors: item.investors || local.investors || [],
        growthMetric: item.growth_metric || local.growthMetric,
        whaleBacker: local.whaleBacker || item.whale_backer || 'Top VC Syndicate',
        arrRevenue: local.arrRevenue || '₹250 Cr ARR',
        grossMargin: local.grossMargin,
        targetExit: local.targetExit || 'IPO / Strategic Exit',
        pitchThesis: local.pitchThesis || 'Category leader with dominant market share.',
        escrowBank: local.escrowBank || 'ICICI Bank Escrow / Axis Trustee',
        instrument: local.instrument || 'CCPS in CDSL/NSDL Demat',
      };
    });

    mockStartups.forEach((s) => {
      if (!supabaseIds.has(s.id)) {
        mergedList.push(s);
      }
    });

    return mergedList;
  } catch (err) {
    console.log('Error fetching startups from Supabase:', err);
    return mockStartups;
  }
}

function mapAlertRow(row) {
  if (!row) return null;
  const rawTimeAgo = row.time_ago || '';
  const isGenericRelative = /^(just now|today|yesterday|\d+[mhd]\s+ago)$/i.test(rawTimeAgo.trim());
  const computedTimeAgo =
    isGenericRelative && row.created_at
      ? formatSyncTimeAgo(row.created_at)
      : (rawTimeAgo || formatSyncTimeAgo(row.created_at));

  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    source: row.source || 'Exchange Disclosed',
    timeAgo: computedTimeAgo,
    createdAt: row.created_at || null,
  };
}

/**
 * Fetch live NSE / BSE / SEC exchange disclosure alert (excludes Startup Radar rows).
 */
export async function fetchLiveAlert() {
  const fallback = {
    title: 'NSE & SEC 13F Live Radar Active Across 50 Super-Investors',
    subtitle: 'Tracking NSE Bulk/Block Deals, Insider Trades & US Form 13F-HR filings',
    source: 'NSE • SEC EDGAR',
    timeAgo: 'Live',
  };

  if (!isSupabaseConfigured() || !supabase) {
    return fallback;
  }

  try {
    const { data, error } = await supabase
      .from('live_alerts')
      .select('*')
      .neq('source', 'Startup Radar')
      .order('id', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return fallback;
    }

    return mapAlertRow(data[0]) || fallback;
  } catch (err) {
    return fallback;
  }
}

/**
 * Subscribe to real-time exchange/whale alerts (ignoring Startup Radar rows).
 */
export function subscribeToWhaleAlerts(onAlert) {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }
  try {
    return supabase
      .channel('realtime:whale_alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_alerts' },
        (payload) => {
          const row = payload?.new;
          if (row && row.source !== 'Startup Radar' && onAlert) {
            onAlert(mapAlertRow(row));
          }
        }
      )
      .subscribe();
  } catch (err) {
    return null;
  }
}

// ========================================================
// OFFICIAL NSE ALL-STOCKS + 1Y EOD HISTORY (PLAY STORE SAFE)
// ========================================================

let cachedNseStocks = null;
let cachedNseStocksAt = 0;
let cachedSeedStocks = null;
const NSE_CACHE_TTL_MS = 5 * 60 * 1000;
const stockHistoryCache = new Map();

function toNum(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

/**
 * Pure JS Indian currency formatter (Hermes-safe across all Android builds):
 * e.g. 1324.4 -> "₹1,324.40", 125000.5 -> "₹1,25,000.50"
 */
export function formatInrPrice(price, decimals = 2) {
  const n = toNum(price);
  if (n === null) return '—';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const fixed = abs.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  let formattedInt = intPart;
  if (intPart.length > 3) {
    const last3 = intPart.slice(-3);
    let rest = intPart.slice(0, -3);
    const groups = [];
    while (rest.length > 2) {
      groups.unshift(rest.slice(-2));
      rest = rest.slice(0, -2);
    }
    if (rest.length > 0) groups.unshift(rest);
    formattedInt = `${groups.join(',')},${last3}`;
  }
  return decimals > 0 ? `${sign}₹${formattedInt}.${decPart}` : `${sign}₹${formattedInt}`;
}

export function formatIndianVolume(vol) {
  const n = toNum(vol);
  if (n === null || n <= 0) return '—';
  if (n >= 10000000) return `${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(Math.round(n));
}

export function formatTurnoverCrores(lacs) {
  const n = toNum(lacs);
  if (n === null || n <= 0) return '—';
  if (n >= 100) {
    const cr = n / 100;
    return cr >= 100 ? `${formatInrPrice(Math.round(cr), 0)} Cr` : `₹${cr.toFixed(1)} Cr`;
  }
  return `₹${n.toFixed(1)} L`;
}

export function mapNseStockRow(row) {
  if (!row || !row.symbol) return null;
  return {
    symbol: String(row.symbol).toUpperCase().trim(),
    name: row.name || row.symbol,
    isin: row.isin || null,
    series: row.series || 'EQ',
    listingDate: row.listing_date || null,
    faceValue: toNum(row.face_value),
    closePrice: toNum(row.close_price),
    prevClose: toNum(row.prev_close),
    openPrice: toNum(row.open_price),
    highPrice: toNum(row.high_price),
    lowPrice: toNum(row.low_price),
    lastPrice: toNum(row.last_price),
    dayChangePct: toNum(row.day_change_pct) ?? 0,
    change1yPct: toNum(row.change_1y_pct),
    high52w: toNum(row.high_52w),
    low52w: toNum(row.low_52w),
    volume: toNum(row.volume) || 0,
    turnoverLacs: toNum(row.turnover_lacs) || 0,
    deliveryPct: toNum(row.delivery_pct),
    lastTradeDate: row.last_trade_date || null,
    historyPointsCount: toNum(row.history_points_count) || 0,
    updatedAt: row.updated_at || null,
    isSeedFallback: false,
  };
}

export function unpackNseSeedStocks(seedObj = nseStocksSeed) {
  const rows = Array.isArray(seedObj?.rows) ? seedObj.rows : [];
  const defaultDate = seedObj?.date || null;
  return rows
    .map((r) => {
      if (!Array.isArray(r) || !r[0]) return null;
      return {
        symbol: String(r[0]).toUpperCase().trim(),
        name: r[1] || r[0],
        series: r[2] || 'EQ',
        isin: r[3] || null,
        listingDate: null,
        faceValue: null,
        closePrice: toNum(r[4]),
        prevClose: toNum(r[5]),
        openPrice: toNum(r[6]),
        highPrice: toNum(r[7]),
        lowPrice: toNum(r[8]),
        lastPrice: toNum(r[4]),
        dayChangePct: toNum(r[9]) ?? 0,
        turnoverLacs: toNum(r[10]) || 0,
        volume: toNum(r[11]) || 0,
        deliveryPct: toNum(r[12]),
        lastTradeDate: r[13] || defaultDate,
        high52w: null,
        low52w: null,
        change1yPct: null,
        historyPointsCount: 0,
        updatedAt: null,
        isSeedFallback: true,
      };
    })
    .filter(Boolean);
}

function getFallbackSeedStocks() {
  if (!cachedSeedStocks) {
    cachedSeedStocks = unpackNseSeedStocks(nseStocksSeed);
  }
  return cachedSeedStocks;
}

/**
 * Fetch complete NSE stocks directory using PostgREST pagination (.range() chunks of 1,000)
 * so all 3,500+ NSE listed stocks & ETFs are searchable locally with zero cap.
 * Falls back cleanly to official offline seed snapshot when Supabase table isn't initialized yet.
 */
export async function fetchNseStocksIndex({ forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && cachedNseStocks && now - cachedNseStocksAt < NSE_CACHE_TTL_MS) {
    return cachedNseStocks;
  }

  if (!isSupabaseConfigured() || !supabase) {
    return getFallbackSeedStocks();
  }

  try {
    const pageSize = 1000;
    const allRows = [];
    for (let page = 0; page < 6; page++) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from('nse_stocks')
        .select('*')
        .order('turnover_lacs', { ascending: false, nullsFirst: false })
        .range(from, to);

      if (error || !Array.isArray(data)) {
        if (allRows.length > 0) break;
        return getFallbackSeedStocks();
      }
      allRows.push(...data);
      if (data.length < pageSize) break;
    }

    if (allRows.length === 0) {
      return getFallbackSeedStocks();
    }

    const mapped = allRows.map(mapNseStockRow).filter(Boolean);
    cachedNseStocks = mapped;
    cachedNseStocksAt = Date.now();
    return mapped;
  } catch (err) {
    return getFallbackSeedStocks();
  }
}

/**
 * Fetch 1Y Official NSE Bhavcopy EOD history array for a single symbol.
 */
export async function fetchNseStockHistory(symbol) {
  const cleanSym = String(symbol || '').toUpperCase().replace(/\.(NS|BO)$/i, '').trim();
  if (!cleanSym) return { points: [], source: 'none' };

  if (stockHistoryCache.has(cleanSym)) {
    return stockHistoryCache.get(cleanSym);
  }

  if (!isSupabaseConfigured() || !supabase) {
    return { points: [], source: 'offline' };
  }

  try {
    const { data, error } = await supabase
      .from('nse_stock_history')
      .select('symbol,history,updated_at')
      .eq('symbol', cleanSym)
      .maybeSingle();

    if (error || !data || !Array.isArray(data.history)) {
      return { points: [], source: 'unavailable' };
    }

    const points = data.history
      .map((pt) => {
        if (!Array.isArray(pt) || pt.length < 2) return null;
        const close = toNum(pt[1]);
        if (close === null || close <= 0) return null;
        return {
          date: String(pt[0]),
          close,
          high: toNum(pt[2]) ?? close,
          low: toNum(pt[3]) ?? close,
          volume: toNum(pt[4]) ?? 0,
        };
      })
      .filter(Boolean);

    const result = {
      points,
      source: points.length > 0 ? 'nse_bhavcopy' : 'empty',
      updatedAt: data.updated_at || null,
    };
    if (points.length > 0) {
      stockHistoryCache.set(cleanSym, result);
    }
    return result;
  } catch (err) {
    return { points: [], source: 'error' };
  }
}

/**
 * Relevance-ranked NSE search + category filtering.
 * Ensures exact ticker / prefix matches (e.g. "TCS", "TATAMOTORS", "RELIANCE") rank above small substrings.
 */
export function searchAndFilterNseStocks(stocksList = [], query = '', category = 'TOP', limit = 100) {
  if (!Array.isArray(stocksList) || stocksList.length === 0) return [];
  const q = String(query || '').trim().toLowerCase();

  if (q) {
    const scored = [];
    for (let i = 0; i < stocksList.length; i++) {
      const st = stocksList[i];
      if (!st) continue;
      const symL = (st.symbol || '').toLowerCase();
      const nameL = (st.name || '').toLowerCase();
      const isinL = (st.isin || '').toLowerCase();

      let score = 0;
      if (symL === q) score = 120;
      else if (symL.startsWith(q)) score = 95;
      else if (nameL.startsWith(q)) score = 80;
      else if (nameL.includes(` ${q}`)) score = 65;
      else if (symL.includes(q)) score = 50;
      else if (nameL.includes(q)) score = 35;
      else if (isinL && isinL === q) score = 90;

      if (score > 0) {
        // Prefer stocks that have an active closePrice over unlisted/untraded placeholders
        const tradedBonus = st.closePrice !== null && st.closePrice > 0 ? 10 : 0;
        scored.push({ st, score: score + tradedBonus, turn: st.turnoverLacs || 0 });
      }
    }
    scored.sort((a, b) => b.score - a.score || b.turn - a.turn);
    return scored.slice(0, limit).map((item) => item.st);
  }

  let filtered = stocksList;
  if (category === 'GAINERS') {
    filtered = stocksList
      .filter((s) => s.closePrice > 0 && (s.turnoverLacs || 0) >= 50 && (s.dayChangePct || 0) > 0)
      .sort((a, b) => (b.dayChangePct || 0) - (a.dayChangePct || 0));
  } else if (category === 'LOSERS') {
    filtered = stocksList
      .filter((s) => s.closePrice > 0 && (s.turnoverLacs || 0) >= 50 && (s.dayChangePct || 0) < 0)
      .sort((a, b) => (a.dayChangePct || 0) - (b.dayChangePct || 0));
  } else if (category === 'ETF') {
    filtered = stocksList
      .filter((s) => (s.isin || '').startsWith('INF') || (s.name || '').toUpperCase().includes('ETF'))
      .sort((a, b) => (b.turnoverLacs || 0) - (a.turnoverLacs || 0));
  } else if (category === 'SME') {
    filtered = stocksList
      .filter((s) => s.series === 'SM' || s.series === 'ST')
      .sort((a, b) => (b.turnoverLacs || 0) - (a.turnoverLacs || 0));
  } else {
    // TOP or ALL: sorted by daily institutional turnover
    filtered = [...stocksList].sort((a, b) => (b.turnoverLacs || 0) - (a.turnoverLacs || 0));
  }

  return filtered.slice(0, limit);
}

/**
 * Find tracked Super-Investors / Whales who concurrently hold this NSE stock.
 */
export function getWhalesHoldingStock(symbol, stockName, whalesList = []) {
  if (!symbol || !Array.isArray(whalesList) || whalesList.length === 0) return [];
  const targetSym = String(symbol).toUpperCase().replace(/\.(NS|BO)$/i, '').trim();
  const normName = String(stockName || '')
    .toLowerCase()
    .replace(/\b(limited|ltd|industries|india|corp|company)\b/g, '')
    .replace(/[^a-z0-9]/g, '');

  const holders = [];
  whalesList.forEach((w) => {
    const isIndia = (w.tag || '').includes('🇮🇳');
    if (!isIndia) return;
    const holdings =
      Array.isArray(w.allHoldings) && w.allHoldings.length > 0 ? w.allHoldings : (w.topHoldings || []);
    const matched = holdings.find((h) => {
      if (!h) return false;
      const hSym = String(h.symbol || h.yahooSymbol || '').toUpperCase().replace(/\.(NS|BO)$/i, '').trim();
      if (hSym && hSym === targetSym) return true;
      if (normName.length >= 4 && h.name) {
        const hNorm = String(h.name)
          .toLowerCase()
          .replace(/\b(limited|ltd|industries|india|corp|company)\b/g, '')
          .replace(/[^a-z0-9]/g, '');
        return hNorm.length >= 4 && (hNorm === normName || hNorm.includes(normName) || normName.includes(hNorm));
      }
      return false;
    });
    if (matched) {
      holders.push({
        whaleId: w.id,
        whaleName: w.name,
        tag: w.tag,
        stake: matched.stake || 'Held',
        value: matched.value || null,
      });
    }
  });
  return holders;
}
