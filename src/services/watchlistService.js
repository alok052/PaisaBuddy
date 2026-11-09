import { readJsonStore, writeJsonStore, STORE_KEYS } from './localStore';
import { getWhalesHoldingStock, parsePriceNumber } from './dataService';

function cleanSym(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/\.(NS|BO|PA|L)$/i, '')
    .trim();
}

function cleanNormName(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/\b(limited|ltd|industries|india|corp|corporation|company|pvt)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function normalizeWatchlistKey(stockLike) {
  if (!stockLike) return '';
  if (typeof stockLike === 'string') return stockLike.toUpperCase().trim();
  const sym = cleanSym(stockLike.symbol || stockLike.yahooSymbol);
  if (sym) return sym;
  const key = String(stockLike.key || '').toUpperCase().trim();
  if (key) return key;
  return String(stockLike.name || '').toUpperCase().trim();
}

export function isItemSavedInWatchlist(savedList = [], stockLike) {
  if (!Array.isArray(savedList) || !stockLike) return false;
  const targetKey = normalizeWatchlistKey(stockLike);
  const targetSym = cleanSym(stockLike.symbol || stockLike.yahooSymbol);
  const targetNorm = cleanNormName(stockLike.name);

  return savedList.some((item) => {
    if (!item) return false;
    if (targetKey && String(item.key || '').toUpperCase() === targetKey) return true;
    const itemSym = cleanSym(item.symbol);
    if (targetSym && itemSym && targetSym === itemSym) return true;
    const itemNorm = cleanNormName(item.name);
    if (targetNorm.length >= 4 && itemNorm && itemNorm === targetNorm) return true;
    return false;
  });
}

export function buildWatchlistEntry(stockLike) {
  const sym = cleanSym(stockLike?.symbol || stockLike?.yahooSymbol);
  const key = normalizeWatchlistKey(stockLike);
  const cmpStr =
    typeof stockLike?.cmp === 'string'
      ? stockLike.cmp
      : stockLike?.closePrice > 0
      ? `₹${Number(stockLike.closePrice).toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : stockLike?.price || null;

  return {
    key,
    symbol: sym,
    name: stockLike?.name || sym || key,
    cmp: cmpStr,
    change1Y: stockLike?.change1Y || stockLike?.change1y || null,
    sector: stockLike?.sector || stockLike?.series || null,
    stage: stockLike?.stage || (sym ? 'EQUITY' : 'TRACKED'),
    addedAt: new Date().toISOString(),
  };
}

export async function loadWatchlist() {
  const items = await readJsonStore(STORE_KEYS.WATCHLIST, []);
  return Array.isArray(items) ? items : [];
}

export async function toggleWatchlistEntry(currentList = [], stockLike) {
  const list = Array.isArray(currentList) ? currentList : [];
  const exists = isItemSavedInWatchlist(list, stockLike);
  const targetKey = normalizeWatchlistKey(stockLike);
  const targetSym = cleanSym(stockLike?.symbol || stockLike?.yahooSymbol);
  const targetNorm = cleanNormName(stockLike?.name);

  let nextList;
  if (exists) {
    nextList = list.filter((item) => {
      if (!item) return false;
      if (targetKey && String(item.key || '').toUpperCase() === targetKey) return false;
      const itemSym = cleanSym(item.symbol);
      if (targetSym && itemSym && targetSym === itemSym) return false;
      const itemNorm = cleanNormName(item.name);
      if (targetNorm.length >= 4 && itemNorm && itemNorm === targetNorm) return false;
      return true;
    });
  } else {
    const entry = buildWatchlistEntry(stockLike);
    if (!entry.key) return { nextList: list, added: false };
    nextList = [entry, ...list];
  }

  await writeJsonStore(STORE_KEYS.WATCHLIST, nextList);
  return { nextList, added: !exists };
}

export async function removeWatchlistEntry(currentList = [], stockOrKey) {
  const list = Array.isArray(currentList) ? currentList : [];
  const targetKey = normalizeWatchlistKey(stockOrKey);
  const nextList = list.filter(
    (item) => item && String(item.key || '').toUpperCase() !== targetKey
  );
  await writeJsonStore(STORE_KEYS.WATCHLIST, nextList);
  return nextList;
}

/**
 * Enrich saved watchlist entries with live NSE EOD prices, 1Y returns, and Co-Held Whales count.
 */
export function enrichWatchlistItems(savedList = [], nseStocks = [], whalesList = []) {
  if (!Array.isArray(savedList) || savedList.length === 0) return [];

  const symMap = new Map();
  const normMap = new Map();
  if (Array.isArray(nseStocks)) {
    nseStocks.forEach((st) => {
      if (!st || !st.symbol) return;
      const sym = String(st.symbol).toUpperCase().trim();
      if (!symMap.has(sym)) symMap.set(sym, st);
      const norm = cleanNormName(st.name);
      if (norm.length >= 4 && !normMap.has(norm)) normMap.set(norm, st);
    });
  }

  return savedList.map((entry) => {
    const sym = cleanSym(entry.symbol || entry.key);
    const norm = cleanNormName(entry.name);
    const nseMatch =
      (sym && symMap.get(sym)) || (norm.length >= 4 && normMap.get(norm)) || null;

    const whaleHolders = getWhalesHoldingStock(
      nseMatch?.symbol || sym,
      nseMatch?.name || entry.name,
      whalesList
    );

    const rawCmp = String(entry.cmp || '');
    const isUsdPrice = !nseMatch && rawCmp.includes('$');
    const parsedSavedCmp = parsePriceNumber(entry.cmp);
    const livePrice =
      nseMatch && nseMatch.closePrice > 0
        ? nseMatch.closePrice
        : !isUsdPrice && parsedSavedCmp > 0
        ? parsedSavedCmp
        : null;

    const displayPriceText =
      nseMatch && nseMatch.closePrice > 0
        ? `₹${Number(nseMatch.closePrice).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        : rawCmp || 'Track Only';

    return {
      ...entry,
      resolvedSymbol: nseMatch?.symbol || sym || entry.key,
      displayName: nseMatch?.name || entry.name || sym || entry.key,
      nseMatch,
      livePrice,
      isUsdPrice,
      displayPriceText,
      dayChangePct: nseMatch?.dayChangePct ?? null,
      change1yPct: nseMatch?.change1yPct ?? null,
      deliveryPct: nseMatch?.deliveryPct ?? null,
      whaleHolders,
    };
  });
}
