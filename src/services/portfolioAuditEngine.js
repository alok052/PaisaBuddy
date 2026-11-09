import * as XLSX from 'xlsx';
import { mockSIPFundsDatabase, resolveFundAudit } from '../data/mockSIPFunds.js';

export const GEMINI_OCR_MODEL = 'gemini-3.8-flash';
const GEMINI_INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

// Representative top equity holdings by Indian Mutual Fund category / popular scheme keywords
// Used for realistic look-through overlap & sector attribution when only scheme names are in CSV/CAS.
const MF_HOLDINGS_PROFILES = {
  LARGE_CAP: {
    topStocks: ['HDFC Bank', 'ICICI Bank', 'Reliance Industries', 'Infosys', 'Larsen & Toubro', 'TCS', 'ITC', 'Bharti Airtel', 'Axis Bank', 'SBI'],
    sectors: { 'Banking & Financials': 0.34, 'IT & Software': 0.14, 'Energy, Oil & Power': 0.12, 'FMCG & Consumer': 0.10, 'Automobile & EV': 0.08, 'Capital Goods & Infra': 0.08, 'Telecom & Tech': 0.06, 'Pharma & Healthcare': 0.05, 'Metals & Mining': 0.03 },
  },
  NIFTY_50: {
    topStocks: ['HDFC Bank', 'ICICI Bank', 'Reliance Industries', 'Infosys', 'Larsen & Toubro', 'TCS', 'ITC', 'Bharti Airtel', 'Axis Bank', 'Kotak Mahindra Bank'],
    sectors: { 'Banking & Financials': 0.35, 'IT & Software': 0.14, 'Energy, Oil & Power': 0.12, 'FMCG & Consumer': 0.09, 'Automobile & EV': 0.08, 'Capital Goods & Infra': 0.06, 'Telecom & Tech': 0.05, 'Pharma & Healthcare': 0.05, 'Metals & Mining': 0.06 },
  },
  NIFTY_NEXT_50: {
    topStocks: ['Trent', 'Bharat Electronics', 'HAL', 'Zomato (Eternal)', 'Power Finance Corp', 'REC Ltd', 'InterGlobe Aviation', 'Varun Beverages', 'Info Edge', 'DMart'],
    sectors: { 'Banking & Financials': 0.20, 'FMCG & Consumer': 0.18, 'Capital Goods & Infra': 0.18, 'Energy, Oil & Power': 0.16, 'Pharma & Healthcare': 0.10, 'IT & Software': 0.08, 'Metals & Mining': 0.10 },
  },
  PARAG_FLEXI: {
    topStocks: ['HDFC Bank', 'Bajaj Holdings', 'Coal India', 'Power Grid Corp', 'ITC', 'ICICI Bank', 'Alphabet Inc', 'Microsoft Corp', 'Meta Platforms', 'Maruti Suzuki'],
    sectors: { 'Banking & Financials': 0.26, 'IT & Global Tech': 0.24, 'Energy, Oil & Power': 0.16, 'FMCG & Consumer': 0.12, 'Automobile & EV': 0.10, 'Pharma & Healthcare': 0.06, 'Others / Cash': 0.06 },
  },
  FLEXI_CAP: {
    topStocks: ['HDFC Bank', 'ICICI Bank', 'Infosys', 'TCS', 'Reliance Industries', 'Bajaj Finance', 'Larsen & Toubro', 'Axis Bank', 'Bharti Airtel', 'Sun Pharma'],
    sectors: { 'Banking & Financials': 0.30, 'IT & Software': 0.15, 'Pharma & Healthcare': 0.10, 'Capital Goods & Infra': 0.12, 'Automobile & EV': 0.10, 'FMCG & Consumer': 0.09, 'Energy, Oil & Power': 0.08, 'Telecom & Tech': 0.06 },
  },
  MID_CAP: {
    topStocks: ['Max Healthcare', 'Persistent Systems', 'Coforge', 'Cummins India', 'Supreme Industries', 'Federal Bank', 'CG Power', 'Trent', 'Dixon Technologies', 'Suzlon Energy'],
    sectors: { 'Capital Goods & Infra': 0.22, 'Banking & Financials': 0.18, 'Pharma & Healthcare': 0.16, 'IT & Software': 0.14, 'Automobile & EV': 0.12, 'FMCG & Consumer': 0.10, 'Chemicals & Materials': 0.08 },
  },
  SMALL_CAP: {
    topStocks: ['MCX India', 'Karur Vysya Bank', 'KPIT Technologies', 'Apar Industries', 'Blue Star', 'Crompton Greaves', 'Central Depository (CDSL)', 'Navin Fluorine', 'Cyient', 'JB Chemicals'],
    sectors: { 'Capital Goods & Infra': 0.24, 'Banking & Financials': 0.16, 'Chemicals & Materials': 0.16, 'IT & Software': 0.14, 'Pharma & Healthcare': 0.12, 'FMCG & Consumer': 0.10, 'Automobile & EV': 0.08 },
  },
  ELSS: {
    topStocks: ['HDFC Bank', 'ICICI Bank', 'Infosys', 'Reliance Industries', 'Axis Bank', 'SBI', 'Bharti Airtel', 'Sun Pharma', 'Larsen & Toubro', 'TCS'],
    sectors: { 'Banking & Financials': 0.31, 'IT & Software': 0.15, 'Pharma & Healthcare': 0.10, 'Automobile & EV': 0.10, 'Capital Goods & Infra': 0.11, 'Energy, Oil & Power': 0.09, 'FMCG & Consumer': 0.08, 'Telecom & Tech': 0.06 },
  },
  HYBRID: {
    topStocks: ['HDFC Bank', 'ICICI Bank', 'GOI G-Sec Bonds', 'Infosys', 'Reliance Industries', 'NTPC', 'ITC', 'SBI'],
    sectors: { 'Debt / Gold & Hedges': 0.35, 'Banking & Financials': 0.22, 'IT & Software': 0.10, 'Energy, Oil & Power': 0.10, 'FMCG & Consumer': 0.08, 'Capital Goods & Infra': 0.08, 'Pharma & Healthcare': 0.07 },
  },
  SECTOR_BANKING: {
    topStocks: ['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Mahindra Bank', 'Bajaj Finance', 'SBI Life', 'HDFC Life'],
    sectors: { 'Banking & Financials': 0.96, 'Others / Cash': 0.04 },
  },
  SECTOR_IT: {
    topStocks: ['TCS', 'Infosys', 'HCL Tech', 'Tech Mahindra', 'Persistent Systems', 'LTIMindtree', 'Coforge', 'Wipro'],
    sectors: { 'IT & Software': 0.95, 'Others / Cash': 0.05 },
  },
  SECTOR_PHARMA: {
    topStocks: ['Sun Pharma', 'Cipla', 'Dr Reddys Labs', 'Divis Labs', 'Apollo Hospitals', 'Max Healthcare', 'Torrent Pharma', 'Aurobindo Pharma'],
    sectors: { 'Pharma & Healthcare': 0.96, 'Others / Cash': 0.04 },
  },
  SECTOR_INFRA: {
    topStocks: ['Larsen & Toubro', 'NTPC', 'Power Grid', 'HAL', 'BEL', 'Siemens', 'ABB India', 'Ultratech Cement'],
    sectors: { 'Capital Goods & Infra': 0.60, 'Energy, Oil & Power': 0.30, 'Metals & Mining': 0.10 },
  },
  GOLD_SILVER: {
    topStocks: ['Physical Gold / LBMA Bullion'],
    sectors: { 'Debt / Gold & Hedges': 1.0 },
  },
  DEBT_LIQUID: {
    topStocks: ['T-Bills & AAA PSU Bonds'],
    sectors: { 'Debt / Gold & Hedges': 1.0 },
  },
};

// Direct Indian Stock / ETF Ticker -> Sector Dictionary (140+ liquid NSE/BSE stocks)
const STOCK_SECTOR_MAP = {
  // Banking & Financials
  HDFCBANK: 'Banking & Financials',
  ICICIBANK: 'Banking & Financials',
  SBIN: 'Banking & Financials',
  AXISBANK: 'Banking & Financials',
  KOTAKBANK: 'Banking & Financials',
  INDUSINDBK: 'Banking & Financials',
  FEDERALBNK: 'Banking & Financials',
  IDFCFIRSTB: 'Banking & Financials',
  CANBK: 'Banking & Financials',
  BANKBARODA: 'Banking & Financials',
  PNB: 'Banking & Financials',
  AUBANK: 'Banking & Financials',
  BANDHANBNK: 'Banking & Financials',
  YESBANK: 'Banking & Financials',
  KARURVYSYA: 'Banking & Financials',
  BAJFINANCE: 'Banking & Financials',
  BAJAJFINSV: 'Banking & Financials',
  JIOFIN: 'Banking & Financials',
  CHOLAFIN: 'Banking & Financials',
  SHRIRAMFIN: 'Banking & Financials',
  MUTHOOTFIN: 'Banking & Financials',
  PFC: 'Banking & Financials',
  RECLTD: 'Banking & Financials',
  IRFC: 'Banking & Financials',
  SBILIFE: 'Banking & Financials',
  HDFCLIFE: 'Banking & Financials',
  ICICIGI: 'Banking & Financials',
  STARHEALTH: 'Banking & Financials',
  CDSL: 'Banking & Financials',
  BSE: 'Banking & Financials',
  ANGELONE: 'Banking & Financials',
  MCX: 'Banking & Financials',
  CAMS: 'Banking & Financials',
  KFINTECH: 'Banking & Financials',
  CRISIL: 'Banking & Financials',
  HDFCAMC: 'Banking & Financials',
  SBICARD: 'Banking & Financials',

  // IT & Software
  TCS: 'IT & Software',
  INFY: 'IT & Software',
  WIPRO: 'IT & Software',
  HCLTECH: 'IT & Software',
  TECHM: 'IT & Software',
  LTIM: 'IT & Software',
  PERSISTENT: 'IT & Software',
  COFORGE: 'IT & Software',
  MPHASIS: 'IT & Software',
  KPITTECH: 'IT & Software',
  TATATECH: 'IT & Software',
  TATAELXSI: 'IT & Software',
  CYIENT: 'IT & Software',
  LTTS: 'IT & Software',
  NAUKRI: 'IT & Software',
  ZOMATO: 'FMCG & Consumer',
  ETERNAL: 'FMCG & Consumer',
  PAYTM: 'Banking & Financials',
  POLICYBZR: 'Banking & Financials',
  NYKAA: 'FMCG & Consumer',

  // Energy, Oil & Power
  RELIANCE: 'Energy, Oil & Power',
  ONGC: 'Energy, Oil & Power',
  IOC: 'Energy, Oil & Power',
  BPCL: 'Energy, Oil & Power',
  GAIL: 'Energy, Oil & Power',
  NTPC: 'Energy, Oil & Power',
  POWERGRID: 'Energy, Oil & Power',
  TATAPOWER: 'Energy, Oil & Power',
  ADANIPOWER: 'Energy, Oil & Power',
  ADANIGREEN: 'Energy, Oil & Power',
  ADANIENSOL: 'Energy, Oil & Power',
  JSWENERGY: 'Energy, Oil & Power',
  NHPC: 'Energy, Oil & Power',
  SJVN: 'Energy, Oil & Power',
  IREDA: 'Energy, Oil & Power',
  COALINDIA: 'Energy, Oil & Power',
  SUZLON: 'Energy, Oil & Power',
  INOXWIND: 'Energy, Oil & Power',

  // Automobile & EV
  TATAMOTORS: 'Automobile & EV',
  TMPV: 'Automobile & EV',
  MARUTI: 'Automobile & EV',
  'M&M': 'Automobile & EV',
  MM: 'Automobile & EV',
  'BAJAJ-AUTO': 'Automobile & EV',
  BAJAJAUTO: 'Automobile & EV',
  EICHERMOT: 'Automobile & EV',
  TVSMOTOR: 'Automobile & EV',
  HEROMOTOCO: 'Automobile & EV',
  ASHOKLEY: 'Automobile & EV',
  BHARATFORG: 'Automobile & EV',
  MOTHERSON: 'Automobile & EV',
  SONACOMS: 'Automobile & EV',
  OLECTRA: 'Automobile & EV',
  EXIDEIND: 'Automobile & EV',
  ARE: 'Automobile & EV',
  APOLLOTYRE: 'Automobile & EV',
  MRF: 'Automobile & EV',

  // Pharma & Healthcare
  SUNPHARMA: 'Pharma & Healthcare',
  CIPLA: 'Pharma & Healthcare',
  DRREDDY: 'Pharma & Healthcare',
  DIVISLAB: 'Pharma & Healthcare',
  LUPIN: 'Pharma & Healthcare',
  AUROPHARMA: 'Pharma & Healthcare',
  BIOCON: 'Pharma & Healthcare',
  ZYDUSLIFE: 'Pharma & Healthcare',
  TORNTPHARM: 'Pharma & Healthcare',
  ALKEM: 'Pharma & Healthcare',
  APOLLOHOSP: 'Pharma & Healthcare',
  MAXHEALTH: 'Pharma & Healthcare',
  FORTIS: 'Pharma & Healthcare',
  NH: 'Pharma & Healthcare',
  LALPATHLAB: 'Pharma & Healthcare',
  MANKIND: 'Pharma & Healthcare',

  // FMCG & Consumer
  ITC: 'FMCG & Consumer',
  HINDUNILVR: 'FMCG & Consumer',
  NESTLEIND: 'FMCG & Consumer',
  BRITANNIA: 'FMCG & Consumer',
  TATACONSUM: 'FMCG & Consumer',
  VBL: 'FMCG & Consumer',
  DABUR: 'FMCG & Consumer',
  MARICO: 'FMCG & Consumer',
  GODREJCP: 'FMCG & Consumer',
  COLPAL: 'FMCG & Consumer',
  TITAN: 'FMCG & Consumer',
  TRENT: 'FMCG & Consumer',
  DMART: 'FMCG & Consumer',
  METROBRAND: 'FMCG & Consumer',
  INDIGO: 'FMCG & Consumer',
  INDHOTEL: 'FMCG & Consumer',
  JUBLFOOD: 'FMCG & Consumer',
  PAGEIND: 'FMCG & Consumer',
  ASIANPAINT: 'FMCG & Consumer',
  BERGEPAINT: 'FMCG & Consumer',
  HAVELLS: 'FMCG & Consumer',
  VOLTAS: 'FMCG & Consumer',
  BLUESTARCO: 'FMCG & Consumer',
  DIXON: 'FMCG & Consumer',

  // Capital Goods, Defence & Infra
  LT: 'Capital Goods & Infra',
  HAL: 'Capital Goods & Infra',
  BEL: 'Capital Goods & Infra',
  MAZDOCK: 'Capital Goods & Infra',
  COCHINSHIP: 'Capital Goods & Infra',
  GRSE: 'Capital Goods & Infra',
  SIEMENS: 'Capital Goods & Infra',
  ABB: 'Capital Goods & Infra',
  CGPOWER: 'Capital Goods & Infra',
  CUMMINSIND: 'Capital Goods & Infra',
  BHEL: 'Capital Goods & Infra',
  NCC: 'Capital Goods & Infra',
  RVNL: 'Capital Goods & Infra',
  IRCON: 'Capital Goods & Infra',
  KPIL: 'Capital Goods & Infra',
  POLYCAB: 'Capital Goods & Infra',
  KEI: 'Capital Goods & Infra',
  ADANIENT: 'Capital Goods & Infra',
  ADANIPORTS: 'Capital Goods & Infra',
  DLF: 'Capital Goods & Infra',
  LODHA: 'Capital Goods & Infra',
  OBEROIRLTY: 'Capital Goods & Infra',
  GODREJPROP: 'Capital Goods & Infra',

  // Metals, Mining & Cement
  TATASTEEL: 'Metals & Mining',
  JSWSTEEL: 'Metals & Mining',
  HINDALCO: 'Metals & Mining',
  VEDL: 'Metals & Mining',
  JINDALSTEL: 'Metals & Mining',
  SAIL: 'Metals & Mining',
  NMDC: 'Metals & Mining',
  HINDZINC: 'Metals & Mining',
  GRAVITA: 'Metals & Mining',
  ULTRACEMCO: 'Metals & Mining',
  AMBUJACEM: 'Metals & Mining',
  SHREECEM: 'Metals & Mining',
  GRASIM: 'Metals & Mining',

  // Telecom & Tech
  BHARTIARTL: 'Telecom & Tech',
  INDUSTOWER: 'Telecom & Tech',
  IDEA: 'Telecom & Tech',
  TEJASNET: 'Telecom & Tech',
  HFCL: 'Telecom & Tech',
  TATACOMM: 'Telecom & Tech',

  // Chemicals & Materials
  PIDILITIND: 'Chemicals & Materials',
  SRF: 'Chemicals & Materials',
  DEEPAKNTR: 'Chemicals & Materials',
  NAVINFLUOR: 'Chemicals & Materials',
  TATACHEM: 'Chemicals & Materials',
  UPL: 'Chemicals & Materials',
  PIIND: 'Chemicals & Materials',
  SUPREMEIND: 'Chemicals & Materials',
  ASTRAL: 'Chemicals & Materials',

  // ETFs & Hedges
  GOLDBEES: 'Debt / Gold & Hedges',
  GOLDCASE: 'Debt / Gold & Hedges',
  HDFCGOLD: 'Debt / Gold & Hedges',
  SILVERBEES: 'Debt / Gold & Hedges',
  LIQUIDBEES: 'Debt / Gold & Hedges',
  LIQUIDCASE: 'Debt / Gold & Hedges',
  GILT5YBEES: 'Debt / Gold & Hedges',
  NIFTYBEES: 'Broad Equity Index ETF',
  JUNIORBEES: 'Broad Equity Index ETF',
  MID150BEES: 'Broad Equity Index ETF',
  BANKBEES: 'Banking & Financials',
  ITBEES: 'IT & Software',
  PHARMABEES: 'Pharma & Healthcare',
};

// Format INR cleanly
export function formatINR(amount, compact = false) {
  const num = Number(amount) || 0;
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (compact) {
    if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
    if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)} L`;
    if (abs >= 1000) return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`;
    return `${sign}₹${Math.round(abs)}`;
  }
  return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`;
}

export function cleanNumber(val) {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (val == null) return 0;
  let str = String(val).trim();
  if (!str || str === '-' || str === '--' || str.toLowerCase() === 'na') return 0;

  let negative = false;
  if (/^\(.*\)$/.test(str)) {
    negative = true;
    str = str.slice(1, -1);
  }
  if (str.startsWith('-')) {
    negative = true;
    str = str.slice(1);
  }
  str = str.replace(/[₹$,%\s,+a-zA-Z]/g, '');
  const parsed = parseFloat(str);
  if (!Number.isFinite(parsed)) return 0;
  return negative ? -parsed : parsed;
}

function normalizeSymbol(str) {
  return String(str || '')
    .toUpperCase()
    .replace(/\b(EQ|NSE|BSE|LTD|LIMITED|INDIA|INDS|INDUSTRIES|CORP|CORPORATION|CO|PVT)\b/g, '')
    .replace(/-(EQ|BE|BZ|SM|ST)$/g, '')
    .replace(/[^A-Z0-9&]/g, '')
    .trim();
}

function detectAssetType(name, ticker, explicitType, isin = '') {
  const n = `${name} ${ticker}`.toLowerCase();
  if (explicitType) {
    const t = String(explicitType).toUpperCase();
    if (t === 'MF' || t === 'MUTUAL FUND' || t === 'MUTUAL_FUND') return 'MF';
    if (t === 'ETF') return 'ETF';
    if (t === 'STOCK' || t === 'EQUITY') {
      // Fall through check for bees/etf
    }
  }
  if (isin && /^INF/i.test(isin.trim())) {
    if (n.includes('etf') || n.includes('bees') || n.includes('gold') || n.includes('niftybees')) {
      return 'ETF';
    }
    return 'MF';
  }
  if (
    n.includes('bees') ||
    n.includes(' etf') ||
    n.endsWith('etf') ||
    n.includes('liquidcase') ||
    n.includes('goldcase')
  ) {
    return 'ETF';
  }
  if (
    n.includes('mutual fund') ||
    n.includes('flexi cap') ||
    n.includes('flexicap') ||
    n.includes('bluechip') ||
    n.includes('large cap') ||
    n.includes('mid cap') ||
    n.includes('midcap') ||
    n.includes('small cap') ||
    n.includes('smallcap') ||
    n.includes('elss') ||
    n.includes('tax saver') ||
    n.includes('index fund') ||
    n.includes('balanced advantage') ||
    n.includes('hybrid') ||
    n.includes('contra fund') ||
    n.includes('focused fund') ||
    n.includes('value fund') ||
    n.includes('liquid fund') ||
    n.includes('gilt fund') ||
    n.includes('fof') ||
    n.includes('scheme') ||
    /\b(growth|idcw|dividend)\b/i.test(n) ||
    /\b(direct|regular)\s*(plan)?\b/i.test(n) ||
    /\bfund\b/i.test(n)
  ) {
    return 'MF';
  }
  return 'STOCK';
}

function detectPlanType(name, planCol = '', advisorCol = '') {
  const combined = `${name} ${planCol}`.toLowerCase();
  const advisor = String(advisorCol || '').trim().toUpperCase();

  if (/\bdirect\b|\(d\)|-d-|\bdir\b|\bdirect plan\b/i.test(combined)) {
    return 'DIRECT';
  }
  if (
    /\bregular\b|\(r\)|-r-|\breg\b|\bregular plan\b/i.test(combined) ||
    /^ARN[-\s]?\d+/i.test(advisor)
  ) {
    return 'REGULAR';
  }
  if (advisor === 'DIRECT' || advisor.includes('DIRECT')) {
    return 'DIRECT';
  }
  return 'UNKNOWN';
}

function getMfProfileKey(name) {
  const n = String(name || '').toLowerCase();
  if (n.includes('gold') || n.includes('silver')) return 'GOLD_SILVER';
  if (n.includes('liquid') || n.includes('overnight') || n.includes('gilt') || n.includes('debt') || n.includes('money market') || n.includes('short duration')) return 'DEBT_LIQUID';
  if (n.includes('banking') || n.includes('financial services') || n.includes('bfsi')) return 'SECTOR_BANKING';
  if (n.includes('technology') || n.includes('digital') || /\bit\b/.test(n)) return 'SECTOR_IT';
  if (n.includes('pharma') || n.includes('healthcare')) return 'SECTOR_PHARMA';
  if (n.includes('infra') || n.includes('psu') || n.includes('energy') || n.includes('power') || n.includes('defence') || n.includes('manufacturing')) return 'SECTOR_INFRA';
  if (n.includes('parag parikh') && (n.includes('flexi') || n.includes('lt equity'))) return 'PARAG_FLEXI';
  if (n.includes('next 50') || n.includes('junior')) return 'NIFTY_NEXT_50';
  if (n.includes('nifty') || n.includes('sensex') || n.includes('index')) return 'NIFTY_50';
  if (n.includes('small')) return 'SMALL_CAP';
  if (n.includes('mid')) return 'MID_CAP';
  if (n.includes('hybrid') || n.includes('balanced') || n.includes('baf') || n.includes('equity & debt') || n.includes('multi asset')) return 'HYBRID';
  if (n.includes('elss') || n.includes('tax')) return 'ELSS';
  if (n.includes('flexi') || n.includes('multi') || n.includes('contra') || n.includes('focused') || n.includes('value')) return 'FLEXI_CAP';
  return 'LARGE_CAP';
}

function normalizeSectorLabel(raw) {
  const s = String(raw || '').toLowerCase();
  if (!s) return null;
  if (s.includes('bank') || s.includes('financ') || s.includes('nbfc') || s.includes('insur') || s.includes('fintech') || s.includes('brok') || s.includes('rating')) return 'Banking & Financials';
  if (s.includes('it') || s.includes('soft') || s.includes('tech') || s.includes('saas')) return 'IT & Software';
  if (s.includes('pharma') || s.includes('health') || s.includes('hospital') || s.includes('diagnostic')) return 'Pharma & Healthcare';
  if (s.includes('auto') || s.includes('ev') || s.includes('tyre') || s.includes('tractor') || s.includes('two wheeler')) return 'Automobile & EV';
  if (s.includes('oil') || s.includes('gas') || s.includes('power') || s.includes('energy') || s.includes('renew') || s.includes('coal')) return 'Energy, Oil & Power';
  if (s.includes('fmcg') || s.includes('consum') || s.includes('retail') || s.includes('food') || s.includes('jewel') || s.includes('paint') || s.includes('apparel') || s.includes('hotel') || s.includes('aviation')) return 'FMCG & Consumer';
  if (s.includes('infra') || s.includes('capital') || s.includes('defen') || s.includes('engineer') || s.includes('construct') || s.includes('realty') || s.includes('real estate') || s.includes('rail') || s.includes('port')) return 'Capital Goods & Infra';
  if (s.includes('metal') || s.includes('steel') || s.includes('alumin') || s.includes('mining') || s.includes('cement')) return 'Metals & Mining';
  if (s.includes('chem') || s.includes('fertil') || s.includes('plastic') || s.includes('pipe') || s.includes('material')) return 'Chemicals & Materials';
  if (s.includes('telecom') || s.includes('media')) return 'Telecom & Tech';
  if (s.includes('gold') || s.includes('silver') || s.includes('debt') || s.includes('liquid')) return 'Debt / Gold & Hedges';
  return 'Others / Diversified';
}

export function inferStockSector(name, ticker, explicitSector, whalesList = []) {
  const explicit = normalizeSectorLabel(explicitSector);
  if (explicit && explicit !== 'Others / Diversified') return explicit;

  const sym = normalizeSymbol(ticker || name);
  if (STOCK_SECTOR_MAP[sym]) return STOCK_SECTOR_MAP[sym];

  // Try matching start/key tokens against STOCK_SECTOR_MAP keys
  const nameSym = normalizeSymbol(name);
  for (const [k, sec] of Object.entries(STOCK_SECTOR_MAP)) {
    if (nameSym === k || (k.length >= 5 && nameSym.includes(k))) {
      return sec;
    }
  }

  // Try whales database sector match
  for (const whale of whalesList) {
    const holdings = whale.allHoldings || whale.topHoldings || [];
    for (const h of holdings) {
      const hSym = normalizeSymbol(h.symbol || h.name);
      const hName = normalizeSymbol(h.name);
      if (
        (sym && hSym && sym === hSym) ||
        (nameSym.length >= 5 && (hName.includes(nameSym) || nameSym.includes(hName)))
      ) {
        const mapped = normalizeSectorLabel(h.sector);
        if (mapped) return mapped;
      }
    }
  }

  return explicit || 'Others / Diversified';
}

function normalizeHoldingRow(raw, whalesList = [], idx = 0) {
  const name = String(raw.name || raw.ticker || '').trim();
  if (!name) return null;
  if (/^(total|grand total|sub ?total|summary|disclaimer|notes?|client|pan\b|folio|generated)/i.test(name)) {
    return null;
  }

  const isin = String(raw.isin || '').trim();
  const assetType = detectAssetType(name, raw.ticker || '', raw.assetType, isin);
  const ticker = String(raw.ticker || (assetType === 'STOCK' ? normalizeSymbol(name) : '')).trim().toUpperCase();
  const quantity = Math.max(0, cleanNumber(raw.quantity));
  let avgPrice = Math.max(0, cleanNumber(raw.avgPrice));
  let ltp = Math.max(0, cleanNumber(raw.ltp));
  let investedValue = cleanNumber(raw.investedValue);
  let currentValue = cleanNumber(raw.currentValue);
  let pnl = raw.pnl !== undefined && raw.pnl !== null && raw.pnl !== '' ? cleanNumber(raw.pnl) : null;

  if (investedValue <= 0 && quantity > 0 && avgPrice > 0) {
    investedValue = quantity * avgPrice;
  }
  if (currentValue <= 0 && quantity > 0 && ltp > 0) {
    currentValue = quantity * ltp;
  }
  if (currentValue <= 0 && investedValue > 0 && pnl !== null) {
    currentValue = Math.max(0, investedValue + pnl);
  }
  if (investedValue <= 0 && currentValue > 0 && pnl !== null) {
    investedValue = Math.max(0, currentValue - pnl);
  }
  if (currentValue <= 0 && investedValue > 0 && pnl === null) {
    // Fallback when broker statement only listed invested/cost
    currentValue = investedValue;
  }
  if (investedValue <= 0 && currentValue > 0 && pnl === null) {
    investedValue = currentValue;
  }
  if (pnl === null) {
    pnl = currentValue - investedValue;
  }

  if (currentValue <= 0 && investedValue <= 0) return null;

  const pnlPct = investedValue > 0 ? (pnl / investedValue) * 100 : 0;
  const planType = assetType === 'MF'
    ? (raw.planType && ['DIRECT', 'REGULAR', 'UNKNOWN'].includes(raw.planType)
        ? raw.planType
        : detectPlanType(name, raw.planCol, raw.advisorCol))
    : 'N/A';

  let sector = 'Others / Diversified';
  if (assetType === 'MF') {
    const profileKey = getMfProfileKey(name);
    if (profileKey === 'SECTOR_BANKING') sector = 'Banking & Financials';
    else if (profileKey === 'SECTOR_IT') sector = 'IT & Software';
    else if (profileKey === 'SECTOR_PHARMA') sector = 'Pharma & Healthcare';
    else if (profileKey === 'SECTOR_INFRA') sector = 'Capital Goods & Infra';
    else if (profileKey === 'GOLD_SILVER' || profileKey === 'DEBT_LIQUID') sector = 'Debt / Gold & Hedges';
    else sector = 'Diversified MF Basket';
  } else {
    sector = inferStockSector(name, ticker, raw.sector, whalesList);
  }

  return {
    id: raw.id || `h_${idx}_${normalizeSymbol(name).slice(0, 10) || idx}`,
    name,
    ticker: ticker || normalizeSymbol(name).slice(0, 14),
    isin,
    assetType,
    planType,
    quantity: Number(quantity.toFixed(3)),
    avgPrice: Number(avgPrice.toFixed(2)),
    ltp: Number(ltp.toFixed(2)),
    investedValue: Math.round(investedValue),
    currentValue: Math.round(currentValue),
    pnl: Math.round(pnl),
    pnlPct: Number(pnlPct.toFixed(2)),
    sector,
  };
}

// Column header matcher (flexible across Zerodha, Groww, Angel One, Upstox, CAMS, KFintech, MFCentral, INDmoney)
function mapHeaders(headerRow) {
  const mapping = {};
  headerRow.forEach((cell, colIdx) => {
    const h = String(cell || '')
      .toLowerCase()
      .replace(/[._*():]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!h) return;

    if (
      mapping.name === undefined &&
      (h === 'instrument' ||
        h === 'symbol' ||
        h === 'stock symbol' ||
        h === 'trading symbol' ||
        h === 'tradingsymbol' ||
        h === 'stock name' ||
        h === 'company name' ||
        h === 'scrip name' ||
        h === 'scrip' ||
        h === 'security name' ||
        h === 'scheme name' ||
        h === 'fund name' ||
        h === 'scheme' ||
        h === 'particulars' ||
        h === 'asset name' ||
        h === 'name')
    ) {
      mapping.name = colIdx;
    } else if (mapping.name === undefined && (h.includes('scheme name') || h.includes('stock name') || h.includes('instrument'))) {
      mapping.name = colIdx;
    }

    if (mapping.ticker === undefined && (h === 'symbol' || h === 'ticker' || h === 'nse symbol' || h === 'bse code')) {
      mapping.ticker = colIdx;
    }
    if (mapping.isin === undefined && h.includes('isin')) {
      mapping.isin = colIdx;
    }
    if (mapping.sector === undefined && (h === 'sector' || h === 'industry')) {
      mapping.sector = colIdx;
    }
    if (mapping.planCol === undefined && (h === 'plan' || h === 'option' || h === 'plan type')) {
      mapping.planCol = colIdx;
    }
    if (mapping.advisorCol === undefined && (h.includes('advisor') || h.includes('arn') || h.includes('distributor') || h.includes('euin') || h.includes('broker'))) {
      mapping.advisorCol = colIdx;
    }
    if (
      mapping.quantity === undefined &&
      (h === 'qty' ||
        h === 'quantity' ||
        h === 'units' ||
        h === 'balance units' ||
        h === 'net qty' ||
        h === 'quantity available' ||
        h === 'available qty' ||
        h === 'holding qty')
    ) {
      mapping.quantity = colIdx;
    }
    if (
      mapping.avgPrice === undefined &&
      (h.includes('avg cost') ||
        h.includes('average cost') ||
        h.includes('average price') ||
        h.includes('avg buy') ||
        h.includes('average buy') ||
        h === 'buy price' ||
        h === 'cost per unit')
    ) {
      mapping.avgPrice = colIdx;
    }
    if (
      mapping.ltp === undefined &&
      (h === 'ltp' ||
        h === 'cmp' ||
        h === 'nav' ||
        h === 'closing price' ||
        h === 'previous closing price' ||
        h === 'last traded price' ||
        h === 'current price' ||
        h === 'market price')
    ) {
      mapping.ltp = colIdx;
    }
    if (
      mapping.investedValue === undefined &&
      (h.includes('invested') ||
        h.includes('buy value') ||
        h.includes('cost value') ||
        h.includes('purchase value') ||
        h.includes('total cost') ||
        h === 'investment amount')
    ) {
      mapping.investedValue = colIdx;
    }
    if (
      mapping.currentValue === undefined &&
      (h.includes('cur val') ||
        h.includes('current value') ||
        h.includes('market value') ||
        h.includes('closing value') ||
        h.includes('present value') ||
        h === 'valuation' ||
        h === 'value')
    ) {
      mapping.currentValue = colIdx;
    }
    if (
      mapping.pnl === undefined &&
      (h === 'p&l' ||
        h === 'pnl' ||
        h.includes('unrealized p&l') ||
        h.includes('unrealised p&l') ||
        h.includes('unrealized p l') ||
        h.includes('unrealised p l') ||
        h.includes('unrealised profit') ||
        h.includes('unrealized profit') ||
        h.includes('gain/loss') ||
        h.includes('profit/loss') ||
        h === 'net p&l' ||
        h === 'realised p&l' ||
        h === 'realized p&l') &&
      !h.includes('pct') &&
      !h.includes('%')
    ) {
      mapping.pnl = colIdx;
    }
  });

  // Require at least name + one numeric holdings column to consider it a valid holdings header row
  const hasNumericCol =
    mapping.quantity !== undefined ||
    mapping.currentValue !== undefined ||
    mapping.investedValue !== undefined ||
    mapping.pnl !== undefined;

  if (mapping.name !== undefined && hasNumericCol) {
    return mapping;
  }
  return null;
}

function extractRowsFromAoA(rows, whalesList = [], explicitSourceAssetType = null) {
  let activeMapping = null;
  const extracted = [];

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || row.every((c) => c == null || String(c).trim() === '')) {
      continue;
    }

    const maybeHeader = mapHeaders(row);
    if (maybeHeader) {
      activeMapping = maybeHeader;
      continue;
    }

    if (!activeMapping) continue;

    const rawName = row[activeMapping.name];
    if (rawName == null || String(rawName).trim() === '') continue;

    const rowObj = {
      name: String(rawName).trim(),
      ticker: activeMapping.ticker !== undefined ? row[activeMapping.ticker] : undefined,
      isin: activeMapping.isin !== undefined ? row[activeMapping.isin] : undefined,
      sector: activeMapping.sector !== undefined ? row[activeMapping.sector] : undefined,
      planCol: activeMapping.planCol !== undefined ? row[activeMapping.planCol] : undefined,
      advisorCol: activeMapping.advisorCol !== undefined ? row[activeMapping.advisorCol] : undefined,
      quantity: activeMapping.quantity !== undefined ? row[activeMapping.quantity] : 0,
      avgPrice: activeMapping.avgPrice !== undefined ? row[activeMapping.avgPrice] : 0,
      ltp: activeMapping.ltp !== undefined ? row[activeMapping.ltp] : 0,
      investedValue: activeMapping.investedValue !== undefined ? row[activeMapping.investedValue] : 0,
      currentValue: activeMapping.currentValue !== undefined ? row[activeMapping.currentValue] : 0,
      pnl: activeMapping.pnl !== undefined ? row[activeMapping.pnl] : null,
      assetType: explicitSourceAssetType,
    };

    const normalized = normalizeHoldingRow(rowObj, whalesList, extracted.length);
    if (normalized) {
      extracted.push(normalized);
    }
  }

  return extracted;
}

function mergeDuplicateHoldings(holdings) {
  const byKey = new Map();
  holdings.forEach((h) => {
    const key = `${h.assetType}:${normalizeSymbol(h.isin || h.name)}:${h.planType}`;
    if (!byKey.has(key)) {
      byKey.set(key, { ...h });
    } else {
      const prev = byKey.get(key);
      prev.quantity = Number((prev.quantity + h.quantity).toFixed(3));
      prev.investedValue += h.investedValue;
      prev.currentValue += h.currentValue;
      prev.pnl += h.pnl;
      prev.pnlPct = prev.investedValue > 0 ? Number(((prev.pnl / prev.investedValue) * 100).toFixed(2)) : 0;
    }
  });
  return Array.from(byKey.values());
}

/**
 * Parses an Excel (.xlsx / .xls) or CSV base64 payload entirely on-device.
 */
export function parseSpreadsheetFromBase64(base64Str, fileName = 'portfolio.xlsx', whalesList = []) {
  if (!base64Str) {
    throw new Error('Selected file appears to be empty.');
  }

  const workbook = XLSX.read(base64Str, { type: 'base64' });
  const sheetNames = workbook.SheetNames || [];
  if (sheetNames.length === 0) {
    throw new Error('No readable worksheets found inside this file.');
  }

  let allHoldings = [];
  const matchedSheets = [];

  for (const sName of sheetNames) {
    const low = sName.toLowerCase();
    // Skip pure tradebook/charges sheets when dedicated holdings sheets exist,
    // unless workbook only has 1 sheet
    if (
      sheetNames.length > 1 &&
      (low.includes('tradebook') || low.includes('dividend') || low.includes('charges') || low.includes('other debits'))
    ) {
      continue;
    }

    const ws = workbook.Sheets[sName];
    if (!ws) continue;

    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const hintType = low.includes('mutual') || low.includes('mf') ? 'MF' : null;
    const rows = extractRowsFromAoA(aoa, whalesList, hintType);
    if (rows.length > 0) {
      matchedSheets.push(sName);
      allHoldings = allHoldings.concat(rows);
    }
  }

  const deduped = mergeDuplicateHoldings(allHoldings);
  if (deduped.length === 0) {
    throw new Error(
      `Could not detect a Holdings / Valuation table in "${fileName}". Make sure your export contains Symbol/Scheme Name along with Quantity, Cost/Invested Value, or Current Value columns (not an empty Tradebook).`
    );
  }

  return {
    holdings: deduped,
    brokerDetected: matchedSheets.length > 0 ? `${fileName} (${matchedSheets.join(', ')})` : fileName,
  };
}

/**
 * Parses raw CSV / TSV / free-form pasted portfolio text on-device.
 */
export function parseCsvOrTextHoldings(rawText, fileName = 'pasted-holdings.csv', whalesList = []) {
  const cleanedText = String(rawText || '').replace(/^\uFEFF/, '').trim();
  if (!cleanedText) {
    throw new Error('File or pasted text is empty.');
  }

  // First try structured CSV / TSV via SheetJS
  try {
    const wb = XLSX.read(cleanedText, { type: 'string' });
    const sName = wb.SheetNames[0];
    if (sName) {
      const aoa = XLSX.utils.sheet_to_json(wb.Sheets[sName], { header: 1, defval: '' });
      const rows = extractRowsFromAoA(aoa, whalesList);
      if (rows.length > 0) {
        return {
          holdings: mergeDuplicateHoldings(rows),
          brokerDetected: fileName,
        };
      }
    }
  } catch (e) {
    // Fall through to flexible line parser
  }

  // Flexible free-form line parser:
  // Examples:
  // "HDFCBANK 50 1500 1720"
  // "Parag Parikh Flexi Cap Regular, 250000"
  // "RELIANCE - Qty 20 - Val 58000 - PnL +4200"
  const lines = cleanedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const parsed = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^(symbol|instrument|stock|scheme|name|#)/i.test(line) && !/\d{3,}/.test(line)) {
      continue;
    }

    const parts = line.includes('\t')
      ? line.split('\t').map((p) => p.trim())
      : line.includes(',')
      ? line.split(',').map((p) => p.trim())
      : line.split(/\s{2,}|\s+\|\s+/).map((p) => p.trim());

    if (parts.length >= 2) {
      const name = parts[0];
      const nums = parts.slice(1).map((p) => cleanNumber(p)).filter((n, idx) => parts[idx + 1] !== '');
      let quantity = 0;
      let investedValue = 0;
      let currentValue = 0;
      let pnl = null;

      if (nums.length === 1) {
        currentValue = nums[0];
        investedValue = nums[0];
      } else if (nums.length === 2) {
        // Check if first number looks like small qty and second is price vs invested+current
        if (nums[0] > 0 && nums[0] <= 10000 && nums[1] > 10 && nums[1] <= 100000 && nums[0] < nums[1] && parts.length === 3) {
          quantity = nums[0];
          currentValue = Math.round(nums[0] * nums[1]);
          investedValue = currentValue;
        } else {
          investedValue = nums[0];
          currentValue = nums[1];
        }
      } else if (nums.length >= 3) {
        // Heuristic: qty, avgPrice, ltp OR invested, current, pnl
        if (nums[0] < 50000 && nums[1] < 50000 && nums[2] < 50000) {
          quantity = nums[0];
          investedValue = nums[0] * nums[1];
          currentValue = nums[0] * nums[2];
        } else {
          investedValue = nums[0];
          currentValue = nums[1];
          pnl = nums[2];
        }
      }

      const norm = normalizeHoldingRow(
        { name, quantity, investedValue, currentValue, pnl },
        whalesList,
        parsed.length
      );
      if (norm) parsed.push(norm);
      continue;
    }

    // Single-line space-separated fallback like "HDFCBANK 250000" or "TCS 20 3500"
    const m = line.match(/^([A-Za-z0-9&.\-\s()]+?)\s+([₹,\d.\-+()]+)(?:\s+([₹,\d.\-+()]+))?(?:\s+([₹,\d.\-+()]+))?$/);
    if (m) {
      const name = m[1].trim();
      const n1 = cleanNumber(m[2]);
      const n2 = m[3] ? cleanNumber(m[3]) : null;
      const n3 = m[4] ? cleanNumber(m[4]) : null;
      let quantity = 0;
      let investedValue = n1;
      let currentValue = n1;
      if (n2 !== null && n3 !== null) {
        quantity = n1;
        investedValue = n1 * n2;
        currentValue = n1 * n3;
      } else if (n2 !== null) {
        investedValue = n1;
        currentValue = n2;
      }
      const norm = normalizeHoldingRow({ name, quantity, investedValue, currentValue }, whalesList, parsed.length);
      if (norm) parsed.push(norm);
    }
  }

  const deduped = mergeDuplicateHoldings(parsed);
  if (deduped.length === 0) {
    throw new Error(
      'Could not read holdings from this text/CSV. Try format: "HDFCBANK, 150000, 175000" or upload official Zerodha/Groww/CAMS CSV or Excel.'
    );
  }

  return {
    holdings: deduped,
    brokerDetected: fileName,
  };
}

/**
 * Checks quickly in-memory if a base64-encoded PDF appears to be encrypted (/Encrypt token).
 */
export function isBase64PdfEncrypted(base64Str) {
  try {
    if (!base64Str || base64Str.length < 32) return false;
    // Decode just head + tail slices using atob/Buffer-safe base64 scanner
    const decodeSlice = (b64Slice) => {
      const alignedLen = b64Slice.length - (b64Slice.length % 4);
      const clean = b64Slice.slice(0, alignedLen);
      if (typeof atob === 'function') {
        return atob(clean);
      }
      if (typeof Buffer !== 'undefined') {
        return Buffer.from(clean, 'base64').toString('latin1');
      }
      return '';
    };

    const headLen = Math.min(base64Str.length, 24000);
    const tailStart = Math.max(0, base64Str.length - 36000);
    const tailAlignedStart = tailStart + ((4 - (tailStart % 4)) % 4);

    const headText = decodeSlice(base64Str.slice(0, headLen));
    const tailText = tailAlignedStart < base64Str.length ? decodeSlice(base64Str.slice(tailAlignedStart)) : '';
    return /\/Encrypt\b/.test(headText) || /\/Encrypt\b/.test(tailText);
  } catch (e) {
    return false;
  }
}

/**
 * Calls Google Gemini Interactions API (gemini-3.8-flash) with base64 screenshot or PDF
 * and extracts normalized JSON portfolio holdings. store=false ensures zero remote retention.
 */
export async function extractHoldingsWithGemini({ base64, mimeType, apiKey, sourceLabel = 'Screenshot' }, whalesList = []) {
  const cleanKey = String(apiKey || '').trim();
  if (!cleanKey) {
    throw new Error('Gemini API key is required for AI image/PDF extraction.');
  }
  if (!base64) {
    throw new Error('No image or PDF bytes found to analyze.');
  }

  const prompt = [
    'You are an institutional Indian financial statement OCR parser.',
    'Extract EVERY equity stock, ETF, and mutual fund holding visible in this Indian broker screenshot or CAS PDF statement (Zerodha Kite/Coin, Groww, Angel One, Upstox, INDmoney, MFCentral, CAMS, KFintech).',
    'Rules:',
    '1. Convert Indian shorthand values if present (e.g. 1.25L -> 125000, 1.5Cr -> 15000000). Output plain numbers in INR.',
    '2. If both Invested and Current Value exist, extract both accurately. Also extract P&L (negative if red/loss) and Qty/Units.',
    '3. For Mutual Funds, mark planType as DIRECT if "Direct" appears, REGULAR if "Regular" or an ARN code appears, otherwise UNKNOWN.',
    '4. Do NOT hallucinate or invent holdings. If no holdings table is visible or image is unreadable, return an empty holdings array and explain in errorNote.',
  ].join('\n');

  const inputPart =
    mimeType === 'application/pdf'
      ? { type: 'document', data: base64, mime_type: 'application/pdf' }
      : { type: 'image', data: base64, mime_type: mimeType || 'image/jpeg' };

  const body = {
    model: GEMINI_OCR_MODEL,
    store: false,
    input: [
      { type: 'text', text: prompt },
      inputPart,
    ],
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: {
        type: 'object',
        properties: {
          brokerDetected: { type: 'string' },
          errorNote: { type: 'string' },
          holdings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                ticker: { type: 'string' },
                assetType: { type: 'string', enum: ['STOCK', 'MF', 'ETF'] },
                planType: { type: 'string', enum: ['DIRECT', 'REGULAR', 'UNKNOWN'] },
                quantity: { type: 'number' },
                avgPrice: { type: 'number' },
                ltp: { type: 'number' },
                investedValue: { type: 'number' },
                currentValue: { type: 'number' },
                pnl: { type: 'number' },
                sector: { type: 'string' },
              },
              required: ['name', 'assetType', 'currentValue'],
            },
          },
        },
        required: ['holdings'],
      },
    },
  };

  const response = await fetch(GEMINI_INTERACTIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': cleanKey,
    },
    body: JSON.stringify(body),
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const errMsg =
      json?.error?.message ||
      json?.message ||
      `Gemini API returned HTTP ${response.status}`;
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      throw new Error(`Invalid or unauthorized Gemini API key (${errMsg}). Check your key in AI Vision Settings.`);
    }
    throw new Error(errMsg);
  }

  if (json?.status === 'failed' || (Array.isArray(json?.errors) && json.errors.length > 0)) {
    throw new Error(json?.errors?.[0]?.message || 'Gemini failed to parse this document.');
  }

  // Extract output text from new `steps` schema (or fallback `outputs`)
  let rawOutputText = '';
  if (Array.isArray(json?.steps)) {
    const modelSteps = json.steps.filter((s) => s.type === 'model_output');
    const lastStep = modelSteps[modelSteps.length - 1];
    if (lastStep && Array.isArray(lastStep.content)) {
      rawOutputText = lastStep.content
        .filter((c) => c.type === 'text' && typeof c.text === 'string')
        .map((c) => c.text)
        .join('\n');
    }
  } else if (Array.isArray(json?.outputs)) {
    rawOutputText = json.outputs
      .filter((o) => typeof o.text === 'string')
      .map((o) => o.text)
      .join('\n');
  }

  if (!rawOutputText) {
    throw new Error('Gemini returned an empty extraction response. Try a clearer screenshot or upload CSV/Excel.');
  }

  // Strip optional markdown code fences just in case
  const cleanJsonStr = rawOutputText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleanJsonStr);
  } catch (e) {
    throw new Error('Could not parse structured holdings from Gemini output. Please retry with a clearer image or CSV.');
  }

  const rawList = Array.isArray(parsed?.holdings) ? parsed.holdings : [];
  const normalized = mergeDuplicateHoldings(
    rawList.map((row, i) => normalizeHoldingRow(row, whalesList, i)).filter(Boolean)
  );

  if (normalized.length === 0) {
    throw new Error(
      parsed?.errorNote ||
        `No portfolio holdings detected in this ${sourceLabel}. Please upload a clearer holdings screenshot or use Broker CSV / Excel.`
    );
  }

  return {
    holdings: normalized,
    brokerDetected: parsed?.brokerDetected || sourceLabel,
  };
}

/**
 * Computes realistic Mutual Fund overlaps between user's held Mutual Funds.
 */
function computeMutualFundOverlaps(mfHoldings) {
  if (mfHoldings.length < 2) return [];

  const overlaps = [];
  const enriched = mfHoldings.map((mf) => {
    const key = getMfProfileKey(mf.name);
    const profile = MF_HOLDINGS_PROFILES[key] || MF_HOLDINGS_PROFILES.LARGE_CAP;
    const baseName = mf.name.replace(/\(direct\)|\(regular\)|\bdirect\b|\bregular\b|\bplan\b|\bgrowth\b|\bidcw\b/gi, '').replace(/\s+/g, ' ').trim();
    const audit = resolveFundAudit(mf.name) || mockSIPFundsDatabase[0];
    return { mf, key, profile, baseName, audit };
  });

  for (let i = 0; i < enriched.length; i++) {
    for (let j = i + 1; j < enriched.length; j++) {
      const a = enriched[i];
      const b = enriched[j];

      // Skip Debt/Gold vs Equity (0% equity overlap)
      if (
        (a.key === 'GOLD_SILVER' || a.key === 'DEBT_LIQUID') ||
        (b.key === 'GOLD_SILVER' || b.key === 'DEBT_LIQUID')
      ) {
        if (a.key === b.key) {
          overlaps.push({
            fundA: a.mf.name,
            fundB: b.mf.name,
            overlapPercent: 90,
            sharedStocks: a.profile.topStocks,
            verdict: 'Both funds hold near-identical defensive instruments.',
            fix: `Consolidate into ${a.mf.currentValue >= b.mf.currentValue ? a.mf.name : b.mf.name} to simplify tracking.`,
          });
        }
        continue;
      }

      const stocksA = new Set(a.profile.topStocks);
      const shared = b.profile.topStocks.filter((s) => stocksA.has(s));

      // Identical underlying fund split across Regular & Direct folios
      const sameScheme = a.baseName.toLowerCase() === b.baseName.toLowerCase();
      let overlapPct = 0;

      if (sameScheme) {
        overlapPct = 100;
      } else if (a.key === b.key) {
        overlapPct = a.key === 'LARGE_CAP' || a.key === 'NIFTY_50' ? 76 : a.key === 'FLEXI_CAP' ? 58 : a.key === 'ELSS' ? 62 : a.key === 'MID_CAP' ? 39 : 28;
      } else if (
        (a.key === 'LARGE_CAP' && b.key === 'NIFTY_50') ||
        (b.key === 'LARGE_CAP' && a.key === 'NIFTY_50')
      ) {
        overlapPct = 78;
      } else if (
        (a.key === 'LARGE_CAP' && b.key === 'FLEXI_CAP') ||
        (b.key === 'LARGE_CAP' && a.key === 'FLEXI_CAP') ||
        (a.key === 'ELSS' && b.key === 'FLEXI_CAP') ||
        (b.key === 'ELSS' && a.key === 'FLEXI_CAP') ||
        (a.key === 'ELSS' && b.key === 'LARGE_CAP') ||
        (b.key === 'ELSS' && a.key === 'LARGE_CAP')
      ) {
        overlapPct = 56;
      } else if (
        (a.key === 'PARAG_FLEXI' && (b.key === 'FLEXI_CAP' || b.key === 'LARGE_CAP' || b.key === 'NIFTY_50')) ||
        (b.key === 'PARAG_FLEXI' && (a.key === 'FLEXI_CAP' || a.key === 'LARGE_CAP' || a.key === 'NIFTY_50'))
      ) {
        overlapPct = 42;
      } else {
        overlapPct = Math.min(68, Math.max(12, Math.round((shared.length / 10) * 100)));
      }

      if (overlapPct >= 35) {
        const smaller = a.mf.currentValue <= b.mf.currentValue ? a : b;
        const bigger = a.mf.currentValue > b.mf.currentValue ? a : b;
        const estFee = smaller.mf.planType === 'REGULAR'
          ? Math.round(smaller.mf.currentValue * 0.009)
          : Math.round(smaller.mf.currentValue * 0.004);

        overlaps.push({
          fundA: a.mf.name,
          fundB: b.mf.name,
          overlapPercent: overlapPct,
          sharedStocks: shared.length > 0 ? shared.slice(0, 6) : ['HDFC Bank', 'ICICI Bank', 'Infosys'],
          verdict: sameScheme
            ? `100% identical scheme across 2 folios (${a.mf.planType} & ${b.mf.planType}). Consolidate into the Direct Plan.`
            : `Both schemes overlap ~${overlapPct}% in core large-cap stocks (${shared.slice(0, 3).join(', ') || 'Indian bluechips'}).`,
          fix: sameScheme
            ? `Switch Regular/smaller folio to Direct Growth — eliminates duplicate tracking & saves ${formatINR(Math.max(500, estFee))}/yr.`
            : overlapPct >= 60
            ? `Keep ${bigger.mf.name}; pause/redeploy ${smaller.mf.name} into an uncorrelated Nifty Midcap 150 or Gold ETF.`
            : `Moderate overlap — hold ${bigger.mf.name} as core and trim future SIPs in ${smaller.mf.name}.`,
        });
      }
    }
  }

  return overlaps.sort((x, y) => y.overlapPercent - x.overlapPercent).slice(0, 4);
}

/**
 * Main Real Portfolio Diagnostic Engine
 */
export function analyzePortfolioHoldings(rawHoldings, whalesList = [], meta = {}) {
  const holdings = mergeDuplicateHoldings(
    (rawHoldings || [])
      .map((h, i) => (h.investedValue !== undefined && h.currentValue !== undefined && h.assetType ? h : normalizeHoldingRow(h, whalesList, i)))
      .filter(Boolean)
  ).sort((a, b) => b.currentValue - a.currentValue);

  if (holdings.length === 0) {
    throw new Error('Cannot run portfolio audit on 0 holdings.');
  }

  let totalInvested = 0;
  let totalCurrentValue = 0;
  let equityValue = 0;
  let mfValue = 0;
  let etfValue = 0;
  let regularMfCount = 0;
  let directMfCount = 0;
  let unknownPlanMfCount = 0;
  let expenseRatioSavedAnnual = 0;
  let totalLossAvailable = 0;
  let totalGainAvailable = 0;

  const regularLeaks = [];
  const mfHoldings = [];
  const stockHoldings = [];
  const sectorTotals = {};

  const addSectorWeight = (secName, rupeeVal) => {
    sectorTotals[secName] = (sectorTotals[secName] || 0) + rupeeVal;
  };

  holdings.forEach((h) => {
    totalInvested += h.investedValue;
    totalCurrentValue += h.currentValue;
    if (h.pnl < 0) totalLossAvailable += Math.abs(h.pnl);
    if (h.pnl > 0) totalGainAvailable += h.pnl;

    if (h.assetType === 'MF') {
      mfValue += h.currentValue;
      mfHoldings.push(h);

      const audit = resolveFundAudit(h.name);
      const cutPct = parseFloat(String(audit?.agentCommissionCut || '0.92%').replace('%', '')) || 0.92;

      if (h.planType === 'REGULAR') {
        regularMfCount += 1;
        const annualLeak = Math.round(h.currentValue * (cutPct / 100));
        expenseRatioSavedAnnual += annualLeak;
        regularLeaks.push({
          name: h.name,
          value: h.currentValue,
          commissionPct: cutPct,
          annualLeak,
          replacementName: audit?.replacement?.name || `${h.name.replace(/regular/gi, '').trim()} (Direct Plan)`,
        });
      } else if (h.planType === 'DIRECT') {
        directMfCount += 1;
      } else {
        unknownPlanMfCount += 1;
      }

      // Attribute look-through sector breakdown for Mutual Funds
      const profileKey = getMfProfileKey(h.name);
      const profile = MF_HOLDINGS_PROFILES[profileKey] || MF_HOLDINGS_PROFILES.LARGE_CAP;
      Object.entries(profile.sectors).forEach(([sec, weight]) => {
        addSectorWeight(sec, h.currentValue * weight);
      });
    } else if (h.assetType === 'ETF') {
      etfValue += h.currentValue;
      stockHoldings.push(h);
      if (h.sector === 'Broad Equity Index ETF') {
        Object.entries(MF_HOLDINGS_PROFILES.NIFTY_50.sectors).forEach(([sec, weight]) => {
          addSectorWeight(sec, h.currentValue * weight);
        });
      } else {
        addSectorWeight(h.sector, h.currentValue);
      }
    } else {
      equityValue += h.currentValue;
      stockHoldings.push(h);
      addSectorWeight(h.sector, h.currentValue);
    }
  });

  const totalPnl = totalCurrentValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  // 1. Sector Allocations sorted desc
  const denom = Math.max(1, totalCurrentValue);
  const sectorEntries = Object.entries(sectorTotals)
    .map(([sector, val]) => ({
      sector,
      value: Math.round(val),
      percent: Math.round((val / denom) * 100),
    }))
    .filter((s) => s.percent >= 1)
    .sort((a, b) => b.percent - a.percent);

  const sectorAllocations = sectorEntries.slice(0, 6).map((s) => {
    const isHedge = s.sector === 'Debt / Gold & Hedges';
    const limit = isHedge ? 40 : 25;
    const isHighRisk = !isHedge && s.percent > 25;
    let status = `${s.percent}% (Balanced exposure)`;
    if (isHighRisk) {
      status = `${s.percent}% High Concentration Risk (SEBI prudent cap: 25%)`;
    } else if (isHedge) {
      status = `${s.percent}% (Downside hedge & liquidity cushion)`;
    } else if (s.percent >= 18) {
      status = `${s.percent}% (Core allocation — monitor weight)`;
    }
    return {
      sector: s.sector,
      percent: s.percent,
      valueFormatted: formatINR(s.value, true),
      safeLimit: isHedge ? '10% - 35%' : 'Max 25%',
      isHighRisk,
      status,
    };
  });

  const hasGoldOrDebtHedge = (sectorTotals['Debt / Gold & Hedges'] || 0) / denom >= 0.04;
  const maxSectorPct = sectorAllocations.reduce((mx, s) => (s.isHighRisk ? Math.max(mx, s.percent) : mx), 0);
  const topHoldingPct = Math.round((holdings[0].currentValue / denom) * 100);

  // 2. Mutual Fund Overlaps
  const overlaps = computeMutualFundOverlaps(mfHoldings);

  // 3. Super-Investor Alignment & Drawdown Risk Cross-Reference
  const whaleMatches = [];
  const matchedPairSet = new Set();

  stockHoldings.forEach((userStock) => {
    const uSym = normalizeSymbol(userStock.ticker || userStock.name);
    const uName = normalizeSymbol(userStock.name);

    for (const whale of whalesList) {
      const wHoldings = whale.allHoldings || whale.topHoldings || [];
      for (const wh of wHoldings) {
        const wSym = normalizeSymbol(wh.symbol || wh.name);
        const wName = normalizeSymbol(wh.name);
        const matched =
          (uSym && wSym && uSym === wSym) ||
          (uSym && wName && uSym === wName) ||
          (uName.length >= 5 && (wName.includes(uName) || uName.includes(wName)));

        if (matched) {
          const dedupKey = `${userStock.name}|${whale.name}`;
          if (!matchedPairSet.has(dedupKey) && whaleMatches.length < 5) {
            matchedPairSet.add(dedupKey);
            const chg = cleanNumber(wh.change1Y);
            whaleMatches.push({
              stock: userStock.name,
              whale: whale.name,
              stake: wh.stake || 'Institutional stake',
              type: 'PROMOTED',
              badge: chg >= 20 ? 'Billionaire Momentum' : 'Whale Conviction',
              color: chg >= 15 ? '#10B981' : '#3B82F6',
              localImage: whale.localImage || null,
              sentiment: `Held in ${whale.name}'s portfolio (${wh.sector || userStock.sector}). 1Y stock move: ${wh.change1Y || 'Tracked'} • Your return: ${userStock.pnlPct >= 0 ? '+' : ''}${userStock.pnlPct}%.`,
            });
          }
          break;
        }
      }
    }
  });

  // Add honest Risk Alerts for user stocks suffering severe drawdowns (>= 20% loss) or massive single-stock concentration (>= 35%)
  holdings.forEach((h) => {
    const hWeight = Math.round((h.currentValue / denom) * 100);
    if (h.pnlPct <= -20 && whaleMatches.length < 6) {
      whaleMatches.push({
        stock: h.name,
        whale: `Portfolio Drawdown (${h.pnlPct}%)`,
        stake: `${formatINR(h.pnl, true)} unrealized loss`,
        type: 'DANGER',
        badge: 'Review & Tax Harvest',
        color: '#EF4444',
        localImage: null,
        sentiment: `This position is down ${Math.abs(h.pnlPct)}% below cost (${formatINR(h.investedValue, true)} invested). Review thesis — booking loss offsets taxable capital gains.`,
      });
    } else if (hWeight >= 35 && holdings.length > 2 && h.assetType === 'STOCK' && whaleMatches.length < 6) {
      whaleMatches.push({
        stock: h.name,
        whale: `Single-Stock Concentration (${hWeight}%)`,
        stake: formatINR(h.currentValue, true),
        type: 'DANGER',
        badge: 'Overweight Alert',
        color: '#F59E0B',
        localImage: null,
        sentiment: `${hWeight}% of your total wealth rests in 1 company. Trimming above 20% protects against single-stock black swans.`,
      });
    }
  });

  // 4. Tax Harvesting Estimation
  // - Loss harvesting against STCG (20% under Finance Act 2024) or LTCG (12.5%)
  const lossTaxShield = totalLossAvailable > 0 ? Math.round(totalLossAvailable * 0.15) : 0;
  // - Section 112A annual LTCG tax-free harvesting (up to ₹1.25L gain exempt -> saves 12.5% future LTCG = max ₹15,625)
  const exemptGainHarvest = totalGainAvailable > 15000 ? Math.round(Math.min(totalGainAvailable, 125000) * 0.125) : 0;
  const taxHarvestSavedNum = lossTaxShield > 0 ? lossTaxShield : exemptGainHarvest;
  const totalAnnualSavingsNum = expenseRatioSavedAnnual + taxHarvestSavedNum;

  // 5. Real Sub-Scores & Overall Health Score
  // Stock & Fund Quality: rewards positive P&L%, Direct plans, whale conviction; penalizes deep losers & Regular leaks
  let qualityScore = 76;
  if (totalPnlPct >= 15) qualityScore += 10;
  else if (totalPnlPct >= 5) qualityScore += 5;
  else if (totalPnlPct < -5) qualityScore -= 12;
  if (directMfCount > 0 && regularMfCount === 0) qualityScore += 8;
  qualityScore -= Math.min(18, regularMfCount * 8);
  const deepLosersCount = holdings.filter((h) => h.pnlPct <= -20).length;
  qualityScore -= Math.min(18, deepLosersCount * 7);
  if (whaleMatches.some((w) => w.type === 'PROMOTED')) qualityScore += 5;
  qualityScore = Math.max(30, Math.min(97, Math.round(qualityScore)));

  // Diversification: rewards 5–18 holdings & multiple sectors; penalizes over-concentration, <3 stocks, or >25 schemes/stocks over-fragmentation
  let divScore = 78;
  if (holdings.length < 3 && mfHoldings.length === 0) divScore -= 28;
  else if (holdings.length >= 5 && holdings.length <= 20) divScore += 8;
  else if (holdings.length > 28) divScore -= 10; // Diworsification
  if (maxSectorPct > 40) divScore -= 28;
  else if (maxSectorPct > 25) divScore -= 16;
  if (topHoldingPct > 35 && holdings[0]?.assetType === 'STOCK') divScore -= 18;
  if (overlaps.length > 0) divScore -= Math.min(20, overlaps.length * 8);
  divScore = Math.max(25, Math.min(96, Math.round(divScore)));

  // Risk Control: rewards defensive Gold/Debt hedge & balanced single-stock size; penalizes heavy drawdown or concentration
  let riskScore = 74;
  if (hasGoldOrDebtHedge) riskScore += 12;
  else riskScore -= 8;
  if (maxSectorPct > 30) riskScore -= 15;
  if (topHoldingPct > 30 && holdings[0]?.assetType === 'STOCK') riskScore -= 14;
  if (deepLosersCount > 0) riskScore -= Math.min(16, deepLosersCount * 6);
  riskScore = Math.max(28, Math.min(96, Math.round(riskScore)));

  // Cost & Tax Efficiency: rewards Direct Plans & tax optimization
  let costTaxScore = regularMfCount === 0 ? 84 : Math.max(32, 80 - regularMfCount * 15);
  if (unknownPlanMfCount > 0 && regularMfCount === 0) costTaxScore = 70;
  if (totalLossAvailable > 10000) costTaxScore -= 6; // Unharvested loss
  costTaxScore = Math.max(30, Math.min(96, Math.round(costTaxScore)));

  const healthScore = Math.round((qualityScore + divScore + riskScore + costTaxScore) / 4);

  let gradeLabel = 'GRADE B • MODERATE RISK';
  let scoreLabel = 'Balanced — Scope to Optimize';
  let scoreColor = '#F59E0B';
  let percentileRank = 'Stronger discipline than 62% of retail portfolios';

  if (healthScore >= 82) {
    gradeLabel = 'GRADE A • INSTITUTIONAL QUALITY';
    scoreLabel = 'Strong & Well-Structured Portfolio';
    scoreColor = '#10B981';
    percentileRank = 'Top 15% diversification & cost discipline';
  } else if (healthScore >= 68) {
    gradeLabel = 'GRADE B • OPTIMIZATION RECOMMENDED';
    scoreLabel = 'Solid Core — Minor Leaks / Concentration Found';
    scoreColor = '#F59E0B';
    percentileRank = 'Better structured than ~64% of retail portfolios';
  } else {
    gradeLabel = 'GRADE C • HIGH CONCENTRATION / FEE LEAK';
    scoreLabel = 'Action Needed — High Risk or Fee Drag';
    scoreColor = '#EF4444';
    percentileRank = 'High concentration or Regular fee drag detected';
  }

  // 6. Personalized 4-Step AI Action Roadmap (Derived 100% from Real Holdings)
  const actionPlan = [];

  if (regularLeaks.length > 0) {
    const topLeak = regularLeaks[0];
    actionPlan.push({
      step: String(actionPlan.length + 1),
      action: 'SWITCH',
      title: `Convert Regular Plan(s) to Direct (${regularLeaks.length} fund${regularLeaks.length > 1 ? 's' : ''})`,
      detail: `${topLeak.name} (${formatINR(topLeak.value, true)}) leaks ~${topLeak.commissionPct}%/yr (${formatINR(expenseRatioSavedAnnual, true)}/yr total). Switch via MFCentral keeping exact same fund.`,
      color: '#EF4444',
      badge: 'Fee Rescue',
    });
  } else if (overlaps.length > 0) {
    const ov = overlaps[0];
    actionPlan.push({
      step: String(actionPlan.length + 1),
      action: 'CONSOLIDATE',
      title: `Trim ${ov.overlapPercent}% MF Overlap`,
      detail: ov.fix,
      color: '#EF4444',
      badge: 'Overlap Cut',
    });
  } else if (unknownPlanMfCount > 0) {
    actionPlan.push({
      step: String(actionPlan.length + 1),
      action: 'VERIFY',
      title: `Verify Direct vs Regular Plan on ${unknownPlanMfCount} MF(s)`,
      detail: `Your import didn't specify Direct vs Regular tags. Check ARN column on MFCentral; switching Regular to Direct saves ~0.9% yearly.`,
      color: '#F59E0B',
      badge: 'Audit Check',
    });
  }

  const highRiskSector = sectorAllocations.find((s) => s.isHighRisk);
  if (highRiskSector) {
    actionPlan.push({
      step: String(actionPlan.length + 1),
      action: 'REBALANCE',
      title: `Trim ${highRiskSector.sector} from ${highRiskSector.percent}% to ≤25%`,
      detail: `Heavy single-sector concentration increases drawdown risk during sector cycles. Route incremental SIPs into underrepresented sectors.`,
      color: '#F59E0B',
      badge: 'Risk Hedge',
    });
  } else if (topHoldingPct >= 30 && holdings.length > 1) {
    actionPlan.push({
      step: String(actionPlan.length + 1),
      action: 'REBALANCE',
      title: `Cap Top Holding (${holdings[0].name}) below 25%`,
      detail: `${holdings[0].name} currently accounts for ${topHoldingPct}% (${formatINR(holdings[0].currentValue, true)}) of your portfolio. Diversify fresh capital into other assets.`,
      color: '#F59E0B',
      badge: 'Position Size',
    });
  }

  if (!hasGoldOrDebtHedge) {
    actionPlan.push({
      step: String(actionPlan.length + 1),
      action: 'HEDGE',
      title: 'Add 5-10% Gold ETF or Liquid Cushion',
      detail: `Your audited holdings have <4% defensive hedge. Adding GoldBEES or short-term debt reduces equity crash volatility by 20-25%.`,
      color: '#10B981',
      badge: 'Stability',
    });
  }

  if (totalLossAvailable > 5000) {
    actionPlan.push({
      step: String(actionPlan.length + 1),
      action: 'TAX HARVEST',
      title: `Harvest ${formatINR(totalLossAvailable, true)} Unrealized Losses`,
      detail: `Booking weak red positions before March 31 offsets realized capital gains, saving ~${formatINR(lossTaxShield, true)} in STCG/LTCG tax.`,
      color: '#3B82F6',
      badge: 'Tax Alpha',
    });
  } else if (totalGainAvailable > 25000) {
    actionPlan.push({
      step: String(actionPlan.length + 1),
      action: 'LTCG RESET',
      title: `Use Section 112A ₹1.25L Tax-Free Harvesting`,
      detail: `Your ${formatINR(totalGainAvailable, true)} gains qualify for annual ₹1.25L LTCG step-up reset, saving ~${formatINR(exemptGainHarvest, true)} in future exit taxes.`,
      color: '#3B82F6',
      badge: 'Tax Alpha',
    });
  }

  // Fill to 4 crisp steps with top winner Hold action
  if (actionPlan.length < 4) {
    const winners = holdings.filter((h) => h.pnlPct >= 5).slice(0, 2);
    const coreNames = winners.length > 0 ? winners.map((w) => w.name).join(' & ') : holdings[0].name;
    actionPlan.push({
      step: String(actionPlan.length + 1),
      action: 'HOLD',
      title: `Stay Invested in Core Winners: ${coreNames}`,
      detail: `Zero-churn discipline avoids exit loads and unnecessary capital gains tax while compounding winners stay working for you.`,
      color: '#10B981',
      badge: 'Core Wealth',
    });
  }

  while (actionPlan.length < 4) {
    actionPlan.push({
      step: String(actionPlan.length + 1),
      action: 'AUTOMATE',
      title: 'Step-Up SIP by 10% Yearly',
      detail: 'Directing annual income raises into low-overlap Direct index/flexi funds accelerates 10-year corpus without extra risk.',
      color: '#3B82F6',
      badge: 'Compounding',
    });
  }

  return {
    isRealAudit: !meta.isDemo,
    sourceMeta: {
      fileName: meta.fileName || 'Portfolio Import',
      sourceType: meta.sourceType || 'CSV/Excel',
      auditedAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      holdingsCount: holdings.length,
      equityCount: stockHoldings.length,
      mfCount: mfHoldings.length,
      totalInvested,
      totalCurrentValue,
      totalPnl,
      totalPnlPct: Number(totalPnlPct.toFixed(2)),
      totalInvestedFormatted: formatINR(totalInvested, true),
      totalCurrentValueFormatted: formatINR(totalCurrentValue, true),
      totalPnlFormatted: `${totalPnl >= 0 ? '+' : ''}${formatINR(totalPnl, true)} (${totalPnlPct >= 0 ? '+' : ''}${totalPnlPct.toFixed(1)}%)`,
      equitySplitPct: Math.round(((equityValue + etfValue) / denom) * 100),
      mfSplitPct: Math.round((mfValue / denom) * 100),
      isDemo: Boolean(meta.isDemo),
    },
    healthScore,
    gradeLabel,
    scoreLabel,
    scoreColor,
    percentileRank,
    subScores: [
      { label: 'Asset Quality', score: qualityScore, color: qualityScore >= 75 ? '#10B981' : qualityScore >= 55 ? '#F59E0B' : '#EF4444', max: 100 },
      { label: 'Diversification', score: divScore, color: divScore >= 75 ? '#10B981' : divScore >= 55 ? '#F59E0B' : '#EF4444', max: 100 },
      { label: 'Risk Control', score: riskScore, color: riskScore >= 75 ? '#10B981' : riskScore >= 55 ? '#F59E0B' : '#EF4444', max: 100 },
      { label: 'Cost & Tax Eff.', score: costTaxScore, color: costTaxScore >= 75 ? '#10B981' : costTaxScore >= 55 ? '#3B82F6' : '#EF4444', max: 100 },
    ],
    overlaps,
    regularLeaks,
    sectorAllocations,
    whaleMatches,
    holdings,
    actionPlan: actionPlan.slice(0, 4),
    savingsSummary: {
      expenseRatioSaved: expenseRatioSavedAnnual > 0 ? `${formatINR(expenseRatioSavedAnnual)}/yr` : '₹0/yr (Direct/Stocks)',
      taxHarvestSaved: taxHarvestSavedNum > 0 ? `${formatINR(taxHarvestSavedNum)}/yr` : '₹0/yr',
      totalAnnualSavings: totalAnnualSavingsNum > 0 ? `${formatINR(totalAnnualSavingsNum)} / year` : '₹0 leak detected',
    },
  };
}

/**
 * Sample realistic retail Indian portfolio (stocks + Regular & Direct MFs)
 * Used only when user explicitly taps "Load Sample Preview".
 */
export function getDemoSampleHoldings() {
  return [
    { name: 'SBI Bluechip Fund Regular Growth', assetType: 'MF', planType: 'REGULAR', investedValue: 180000, currentValue: 224000 },
    { name: 'HDFC Top 100 Fund Direct Growth', assetType: 'MF', planType: 'DIRECT', investedValue: 150000, currentValue: 196000 },
    { name: 'Parag Parikh Flexi Cap Direct Growth', assetType: 'MF', planType: 'DIRECT', investedValue: 140000, currentValue: 189000 },
    { name: 'Tata Motors Ltd', ticker: 'TATAMOTORS', assetType: 'STOCK', quantity: 140, investedValue: 112000, currentValue: 125300 },
    { name: 'HDFC Bank Ltd', ticker: 'HDFCBANK', assetType: 'STOCK', quantity: 90, investedValue: 142000, currentValue: 154800 },
    { name: 'Infosys Ltd', ticker: 'INFY', assetType: 'STOCK', quantity: 55, investedValue: 82000, currentValue: 101200 },
    { name: 'Tejas Networks Ltd', ticker: 'TEJASNET', assetType: 'STOCK', quantity: 65, investedValue: 74000, currentValue: 56200 },
  ];
}
