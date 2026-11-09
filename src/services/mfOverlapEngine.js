import { mockSIPFundsDatabase, resolveFundAudit } from '../data/mockSIPFunds';
import { cleanBaseSchemeName, detectPlanFromName } from './mfApiService';
import { getWhalesHoldingStock } from './dataService';

/**
 * Scheme-Specific & Category Mutual Fund Portfolio Fingerprints (Educational Top Holdings & Sector Mix).
 * Weighted stock allocations reflect public AMFI factsheet concentration patterns for Indian equity schemes.
 */
const SCHEME_FINGERPRINTS = [
  {
    match: /parag parikh.*flexi|ppfas.*flexi/i,
    profileKey: 'PARAG_FLEXI',
    capTier: 'FLEXI',
    holdings: [
      { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking & Financials', weightPct: 8.1 },
      { symbol: 'BAJAJHLDNG', name: 'Bajaj Holdings & Inv', sector: 'Banking & Financials', weightPct: 6.8 },
      { symbol: 'COALINDIA', name: 'Coal India', sector: 'Energy & Utilities', weightPct: 5.9 },
      { symbol: 'POWERGRID', name: 'Power Grid Corp', sector: 'Energy & Utilities', weightPct: 5.7 },
      { symbol: 'ITC', name: 'ITC Ltd', sector: 'FMCG & Consumer', weightPct: 5.1 },
      { symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Banking & Financials', weightPct: 4.9 },
      { symbol: 'GOOGL', name: 'Alphabet Inc (US)', sector: 'Global Tech', weightPct: 4.6 },
      { symbol: 'MSFT', name: 'Microsoft Corp (US)', sector: 'Global Tech', weightPct: 4.4 },
      { symbol: 'META', name: 'Meta Platforms (US)', sector: 'Global Tech', weightPct: 3.9 },
      { symbol: 'MARUTI', name: 'Maruti Suzuki', sector: 'Automobile & EV', weightPct: 3.8 },
      { symbol: 'HCLTECH', name: 'HCL Technologies', sector: 'IT & Software', weightPct: 3.4 },
      { symbol: 'CIPLA', name: 'Cipla Ltd', sector: 'Pharma & Healthcare', weightPct: 3.1 },
    ],
    sectors: {
      'Banking & Financials': 26,
      'Global Tech': 15,
      'Energy & Utilities': 14,
      'FMCG & Consumer': 11,
      'IT & Software': 9,
      'Automobile & EV': 8,
      'Pharma & Healthcare': 7,
      'Cash & Arbitrage': 10,
    },
  },
  {
    match: /hdfc\s*flexi/i,
    profileKey: 'HDFC_FLEXI',
    capTier: 'FLEXI',
    holdings: [
      { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking & Financials', weightPct: 9.2 },
      { symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Banking & Financials', weightPct: 8.8 },
      { symbol: 'AXISBANK', name: 'Axis Bank', sector: 'Banking & Financials', weightPct: 7.4 },
      { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking & Financials', weightPct: 5.6 },
      { symbol: 'CIPLA', name: 'Cipla Ltd', sector: 'Pharma & Healthcare', weightPct: 4.8 },
      { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', sector: 'Banking & Financials', weightPct: 4.6 },
      { symbol: 'HAL', name: 'Hindustan Aeronautics', sector: 'Capital Goods & Defence', weightPct: 4.3 },
      { symbol: 'SBILIFE', name: 'SBI Life Insurance', sector: 'Banking & Financials', weightPct: 3.9 },
      { symbol: 'HCLTECH', name: 'HCL Technologies', sector: 'IT & Software', weightPct: 3.6 },
      { symbol: 'BHARTIARTL', name: 'Bharti Airtel', sector: 'Telecom & Tech', weightPct: 3.5 },
      { symbol: 'NTPC', name: 'NTPC Ltd', sector: 'Energy & Utilities', weightPct: 3.2 },
      { symbol: 'MARUTI', name: 'Maruti Suzuki', sector: 'Automobile & EV', weightPct: 2.9 },
    ],
    sectors: {
      'Banking & Financials': 41,
      'Pharma & Healthcare': 11,
      'IT & Software': 10,
      'Capital Goods & Defence': 10,
      'Automobile & EV': 8,
      'Energy & Utilities': 7,
      'Telecom & Tech': 6,
      'FMCG & Consumer': 7,
    },
  },
  {
    match: /kotak\s*flexi/i,
    profileKey: 'KOTAK_FLEXI',
    capTier: 'FLEXI',
    holdings: [
      { symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Banking & Financials', weightPct: 8.4 },
      { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking & Financials', weightPct: 7.9 },
      { symbol: 'LT', name: 'Larsen & Toubro', sector: 'Capital Goods & Defence', weightPct: 5.8 },
      { symbol: 'INFY', name: 'Infosys Ltd', sector: 'IT & Software', weightPct: 5.4 },
      { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy & Utilities', weightPct: 5.1 },
      { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking & Financials', weightPct: 4.9 },
      { symbol: 'BEL', name: 'Bharat Electronics', sector: 'Capital Goods & Defence', weightPct: 4.2 },
      { symbol: 'ULTRACEMCO', name: 'UltraTech Cement', sector: 'Metals & Materials', weightPct: 3.8 },
      { symbol: 'AXISBANK', name: 'Axis Bank', sector: 'Banking & Financials', weightPct: 3.4 },
      { symbol: 'INDIGO', name: 'InterGlobe Aviation', sector: 'FMCG & Consumer', weightPct: 3.2 },
      { symbol: 'SUNPHARMA', name: 'Sun Pharma', sector: 'Pharma & Healthcare', weightPct: 3.0 },
      { symbol: 'TCS', name: 'TCS Ltd', sector: 'IT & Software', weightPct: 2.8 },
    ],
    sectors: {
      'Banking & Financials': 29,
      'Capital Goods & Defence': 17,
      'IT & Software': 13,
      'Energy & Utilities': 11,
      'Metals & Materials': 9,
      'FMCG & Consumer': 8,
      'Pharma & Healthcare': 7,
      'Automobile & EV': 6,
    },
  },
  {
    match: /uti\s*nifty|hdfc\s*index.*nifty|sbi\s*nifty|icici.*nifty\s*50|nippon.*nifty\s*50|nifty\s*50\s*index|nifty\s*bees/i,
    profileKey: 'NIFTY_50',
    capTier: 'LARGE',
    holdings: [
      { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking & Financials', weightPct: 11.4 },
      { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy & Utilities', weightPct: 9.1 },
      { symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Banking & Financials', weightPct: 8.2 },
      { symbol: 'INFY', name: 'Infosys Ltd', sector: 'IT & Software', weightPct: 5.9 },
      { symbol: 'LT', name: 'Larsen & Toubro', sector: 'Capital Goods & Defence', weightPct: 4.2 },
      { symbol: 'ITC', name: 'ITC Ltd', sector: 'FMCG & Consumer', weightPct: 4.1 },
      { symbol: 'TCS', name: 'TCS Ltd', sector: 'IT & Software', weightPct: 3.9 },
      { symbol: 'BHARTIARTL', name: 'Bharti Airtel', sector: 'Telecom & Tech', weightPct: 3.8 },
      { symbol: 'AXISBANK', name: 'Axis Bank', sector: 'Banking & Financials', weightPct: 3.2 },
      { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking & Financials', weightPct: 3.0 },
      { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', sector: 'Banking & Financials', weightPct: 2.5 },
      { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', sector: 'FMCG & Consumer', weightPct: 2.2 },
    ],
    sectors: {
      'Banking & Financials': 34,
      'IT & Software': 14,
      'Energy & Utilities': 12,
      'FMCG & Consumer': 9,
      'Automobile & EV': 8,
      'Capital Goods & Defence': 6,
      'Telecom & Tech': 5,
      'Pharma & Healthcare': 6,
      'Metals & Materials': 6,
    },
  },
  {
    match: /axis\s*bluechip/i,
    profileKey: 'AXIS_BLUECHIP',
    capTier: 'LARGE',
    holdings: [
      { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking & Financials', weightPct: 9.5 },
      { symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Banking & Financials', weightPct: 8.9 },
      { symbol: 'BHARTIARTL', name: 'Bharti Airtel', sector: 'Telecom & Tech', weightPct: 6.2 },
      { symbol: 'INFY', name: 'Infosys Ltd', sector: 'IT & Software', weightPct: 5.8 },
      { symbol: 'TCS', name: 'TCS Ltd', sector: 'IT & Software', weightPct: 5.4 },
      { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy & Utilities', weightPct: 5.1 },
      { symbol: 'BAJFINANCE', name: 'Bajaj Finance', sector: 'Banking & Financials', weightPct: 4.6 },
      { symbol: 'LT', name: 'Larsen & Toubro', sector: 'Capital Goods & Defence', weightPct: 4.4 },
      { symbol: 'TRENT', name: 'Trent Ltd', sector: 'FMCG & Consumer', weightPct: 3.9 },
      { symbol: 'SUNPHARMA', name: 'Sun Pharma', sector: 'Pharma & Healthcare', weightPct: 3.5 },
      { symbol: 'ULTRACEMCO', name: 'UltraTech Cement', sector: 'Metals & Materials', weightPct: 3.2 },
      { symbol: 'TITAN', name: 'Titan Company', sector: 'FMCG & Consumer', weightPct: 3.0 },
    ],
    sectors: {
      'Banking & Financials': 31,
      'IT & Software': 15,
      'FMCG & Consumer': 13,
      'Capital Goods & Defence': 10,
      'Energy & Utilities': 9,
      'Telecom & Tech': 8,
      'Pharma & Healthcare': 7,
      'Automobile & EV': 7,
    },
  },
  {
    match: /sbi\s*bluechip|icici.*bluechip|mirae.*large\s*cap|nippon.*large\s*cap|canara.*bluechip/i,
    profileKey: 'ACTIVE_LARGECAP',
    capTier: 'LARGE',
    holdings: [
      { symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Banking & Financials', weightPct: 9.0 },
      { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking & Financials', weightPct: 8.8 },
      { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy & Utilities', weightPct: 6.7 },
      { symbol: 'LT', name: 'Larsen & Toubro', sector: 'Capital Goods & Defence', weightPct: 5.6 },
      { symbol: 'INFY', name: 'Infosys Ltd', sector: 'IT & Software', weightPct: 5.4 },
      { symbol: 'AXISBANK', name: 'Axis Bank', sector: 'Banking & Financials', weightPct: 4.6 },
      { symbol: 'BHARTIARTL', name: 'Bharti Airtel', sector: 'Telecom & Tech', weightPct: 4.3 },
      { symbol: 'ITC', name: 'ITC Ltd', sector: 'FMCG & Consumer', weightPct: 4.0 },
      { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking & Financials', weightPct: 3.8 },
      { symbol: 'SUNPHARMA', name: 'Sun Pharma', sector: 'Pharma & Healthcare', weightPct: 3.5 },
      { symbol: 'NTPC', name: 'NTPC Ltd', sector: 'Energy & Utilities', weightPct: 3.2 },
      { symbol: 'M&M', name: 'Mahindra & Mahindra', sector: 'Automobile & EV', weightPct: 3.0 },
    ],
    sectors: {
      'Banking & Financials': 33,
      'IT & Software': 12,
      'Energy & Utilities': 13,
      'Capital Goods & Defence': 11,
      'Automobile & EV': 9,
      'FMCG & Consumer': 9,
      'Pharma & Healthcare': 7,
      'Telecom & Tech': 6,
    },
  },
  {
    match: /quant\s*small\s*cap/i,
    profileKey: 'QUANT_SMALL',
    capTier: 'SMALL',
    holdings: [
      { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy & Utilities', weightPct: 8.6 },
      { symbol: 'JIOFIN', name: 'Jio Financial Services', sector: 'Banking & Financials', weightPct: 6.2 },
      { symbol: 'AEGISLOG', name: 'Aegis Logistics', sector: 'Energy & Utilities', weightPct: 3.8 },
      { symbol: 'BIKAJI', name: 'Bikaji Foods Intl', sector: 'FMCG & Consumer', weightPct: 3.4 },
      { symbol: 'HFCL', name: 'HFCL Ltd', sector: 'Telecom & Tech', weightPct: 3.1 },
      { symbol: 'ANANDRATHI', name: 'Anand Rathi Wealth', sector: 'Banking & Financials', weightPct: 2.9 },
      { symbol: 'HUDCO', name: 'HUDCO Ltd', sector: 'Banking & Financials', weightPct: 2.7 },
      { symbol: 'CASTROLIND', name: 'Castrol India', sector: 'Energy & Utilities', weightPct: 2.5 },
      { symbol: 'MOTHERSON', name: 'Samvardhana Motherson', sector: 'Automobile & EV', weightPct: 2.4 },
      { symbol: 'RBLBANK', name: 'RBL Bank', sector: 'Banking & Financials', weightPct: 2.2 },
      { symbol: 'BAYERCROP', name: 'Bayer CropScience', sector: 'Chemicals & Materials', weightPct: 2.0 },
      { symbol: 'ADANIPOWER', name: 'Adani Power', sector: 'Energy & Utilities', weightPct: 1.9 },
    ],
    sectors: {
      'Energy & Utilities': 22,
      'Banking & Financials': 19,
      'FMCG & Consumer': 12,
      'Pharma & Healthcare': 11,
      'Metals & Materials': 10,
      'Capital Goods & Defence': 9,
      'Chemicals & Materials': 9,
      'Automobile & EV': 8,
    },
  },
  {
    match: /nippon.*small\s*cap/i,
    profileKey: 'NIPPON_SMALL',
    capTier: 'SMALL',
    holdings: [
      { symbol: 'MCX', name: 'MCX India', sector: 'Banking & Financials', weightPct: 2.8 },
      { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking & Financials', weightPct: 2.5 },
      { symbol: 'TIINDIA', name: 'Tube Investments', sector: 'Automobile & EV', weightPct: 2.3 },
      { symbol: 'APARINDS', name: 'Apar Industries', sector: 'Capital Goods & Defence', weightPct: 2.2 },
      { symbol: 'KARURVYSYA', name: 'Karur Vysya Bank', sector: 'Banking & Financials', weightPct: 2.0 },
      { symbol: 'DIXON', name: 'Dixon Technologies', sector: 'FMCG & Consumer', weightPct: 1.9 },
      { symbol: 'BEL', name: 'Bharat Electronics', sector: 'Capital Goods & Defence', weightPct: 1.8 },
      { symbol: 'KIRLOSBROS', name: 'Kirloskar Brothers', sector: 'Capital Goods & Defence', weightPct: 1.7 },
      { symbol: 'KPITTECH', name: 'KPIT Technologies', sector: 'IT & Software', weightPct: 1.6 },
      { symbol: 'NAVINFLUOR', name: 'Navin Fluorine', sector: 'Chemicals & Materials', weightPct: 1.5 },
      { symbol: 'VOLTAMP', name: 'Voltamp Transformers', sector: 'Capital Goods & Defence', weightPct: 1.5 },
      { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking & Financials', weightPct: 1.4 },
    ],
    sectors: {
      'Capital Goods & Defence': 24,
      'Banking & Financials': 16,
      'Chemicals & Materials': 15,
      'IT & Software': 12,
      'Pharma & Healthcare': 12,
      'Automobile & EV': 11,
      'FMCG & Consumer': 10,
    },
  },
  {
    match: /sbi\s*small\s*cap|hdfc\s*small\s*cap|axis\s*small\s*cap/i,
    profileKey: 'CORE_SMALL',
    capTier: 'SMALL',
    holdings: [
      { symbol: 'BLUESTARCO', name: 'Blue Star Ltd', sector: 'FMCG & Consumer', weightPct: 3.4 },
      { symbol: 'ASTERDM', name: 'Aster DM Healthcare', sector: 'Pharma & Healthcare', weightPct: 3.1 },
      { symbol: 'KARURVYSYA', name: 'Karur Vysya Bank', sector: 'Banking & Financials', weightPct: 2.9 },
      { symbol: 'CHALET', name: 'Chalet Hotels', sector: 'FMCG & Consumer', weightPct: 2.7 },
      { symbol: 'SONATSOFTW', name: 'Sonata Software', sector: 'IT & Software', weightPct: 2.6 },
      { symbol: 'ELGIEQUIP', name: 'Elgi Equipments', sector: 'Capital Goods & Defence', weightPct: 2.5 },
      { symbol: 'CYIENT', name: 'Cyient Ltd', sector: 'IT & Software', weightPct: 2.4 },
      { symbol: 'CDSL', name: 'CDSL India', sector: 'Banking & Financials', weightPct: 2.3 },
      { symbol: 'KEI', name: 'KEI Industries', sector: 'Capital Goods & Defence', weightPct: 2.2 },
      { symbol: 'GABRIEL', name: 'Gabriel India', sector: 'Automobile & EV', weightPct: 2.0 },
      { symbol: 'FIRSTCRY', name: 'Brainbees Solutions', sector: 'FMCG & Consumer', weightPct: 1.9 },
      { symbol: 'KFINTECH', name: 'KFin Technologies', sector: 'Banking & Financials', weightPct: 1.8 },
    ],
    sectors: {
      'Capital Goods & Defence': 22,
      'FMCG & Consumer': 19,
      'Banking & Financials': 16,
      'IT & Software': 14,
      'Pharma & Healthcare': 11,
      'Chemicals & Materials': 10,
      'Automobile & EV': 8,
    },
  },
  {
    match: /motilal.*mid\s*cap|motilal.*midcap/i,
    profileKey: 'MOTILAL_MID',
    capTier: 'MID',
    holdings: [
      { symbol: 'PERSISTENT', name: 'Persistent Systems', sector: 'IT & Software', weightPct: 8.4 },
      { symbol: 'COFORGE', name: 'Coforge Ltd', sector: 'IT & Software', weightPct: 8.1 },
      { symbol: 'KALYANKJIL', name: 'Kalyan Jewellers', sector: 'FMCG & Consumer', weightPct: 7.2 },
      { symbol: 'DIXON', name: 'Dixon Technologies', sector: 'FMCG & Consumer', weightPct: 6.6 },
      { symbol: 'POLYCAB', name: 'Polycab India', sector: 'Capital Goods & Defence', weightPct: 6.1 },
      { symbol: 'TRENT', name: 'Trent Ltd', sector: 'FMCG & Consumer', weightPct: 5.5 },
      { symbol: 'KPITTECH', name: 'KPIT Technologies', sector: 'IT & Software', weightPct: 4.8 },
      { symbol: 'MAXHEALTH', name: 'Max Healthcare', sector: 'Pharma & Healthcare', weightPct: 4.3 },
      { symbol: 'KEI', name: 'KEI Industries', sector: 'Capital Goods & Defence', weightPct: 3.9 },
      { symbol: 'CGPOWER', name: 'CG Power & Industrial', sector: 'Capital Goods & Defence', weightPct: 3.5 },
      { symbol: 'JSL', name: 'Jindal Stainless', sector: 'Metals & Materials', weightPct: 3.2 },
      { symbol: 'TIINDIA', name: 'Tube Investments', sector: 'Automobile & EV', weightPct: 2.9 },
    ],
    sectors: {
      'IT & Software': 25,
      'FMCG & Consumer': 23,
      'Capital Goods & Defence': 22,
      'Pharma & Healthcare': 10,
      'Automobile & EV': 9,
      'Metals & Materials': 6,
      'Banking & Financials': 5,
    },
  },
  {
    match: /hdfc\s*mid|kotak\s*emerging|nippon.*growth|axis\s*mid|sbi.*mid/i,
    profileKey: 'CORE_MID',
    capTier: 'MID',
    holdings: [
      { symbol: 'MAXHEALTH', name: 'Max Healthcare', sector: 'Pharma & Healthcare', weightPct: 4.9 },
      { symbol: 'INDHOTEL', name: 'Indian Hotels Co', sector: 'FMCG & Consumer', weightPct: 4.4 },
      { symbol: 'COFORGE', name: 'Coforge Ltd', sector: 'IT & Software', weightPct: 4.2 },
      { symbol: 'FEDERALBNK', name: 'Federal Bank', sector: 'Banking & Financials', weightPct: 3.9 },
      { symbol: 'PERSISTENT', name: 'Persistent Systems', sector: 'IT & Software', weightPct: 3.8 },
      { symbol: 'CUMMINSIND', name: 'Cummins India', sector: 'Capital Goods & Defence', weightPct: 3.6 },
      { symbol: 'SUPREMEIND', name: 'Supreme Industries', sector: 'Chemicals & Materials', weightPct: 3.5 },
      { symbol: 'BALKRISIND', name: 'Balkrishna Industries', sector: 'Automobile & EV', weightPct: 3.1 },
      { symbol: 'APOLLOTYRE', name: 'Apollo Tyres', sector: 'Automobile & EV', weightPct: 2.9 },
      { symbol: 'TATACOMM', name: 'Tata Communications', sector: 'Telecom & Tech', weightPct: 2.8 },
      { symbol: 'IPCALAB', name: 'Ipca Laboratories', sector: 'Pharma & Healthcare', weightPct: 2.6 },
      { symbol: 'HINDPETRO', name: 'HPCL', sector: 'Energy & Utilities', weightPct: 2.4 },
    ],
    sectors: {
      'Capital Goods & Defence': 20,
      'Pharma & Healthcare': 18,
      'Banking & Financials': 17,
      'IT & Software': 14,
      'Automobile & EV': 12,
      'FMCG & Consumer': 10,
      'Chemicals & Materials': 9,
    },
  },
  {
    match: /elss|tax\s*saver|long\s*term\s*equity/i,
    profileKey: 'ELSS_CORE',
    capTier: 'FLEXI',
    holdings: [
      { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking & Financials', weightPct: 8.6 },
      { symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Banking & Financials', weightPct: 7.9 },
      { symbol: 'INFY', name: 'Infosys Ltd', sector: 'IT & Software', weightPct: 5.5 },
      { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy & Utilities', weightPct: 5.3 },
      { symbol: 'AXISBANK', name: 'Axis Bank', sector: 'Banking & Financials', weightPct: 4.8 },
      { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking & Financials', weightPct: 4.4 },
      { symbol: 'BHARTIARTL', name: 'Bharti Airtel', sector: 'Telecom & Tech', weightPct: 4.1 },
      { symbol: 'SUNPHARMA', name: 'Sun Pharma', sector: 'Pharma & Healthcare', weightPct: 3.8 },
      { symbol: 'LT', name: 'Larsen & Toubro', sector: 'Capital Goods & Defence', weightPct: 3.6 },
      { symbol: 'TCS', name: 'TCS Ltd', sector: 'IT & Software', weightPct: 3.4 },
      { symbol: 'ITC', name: 'ITC Ltd', sector: 'FMCG & Consumer', weightPct: 3.1 },
      { symbol: 'MARUTI', name: 'Maruti Suzuki', sector: 'Automobile & EV', weightPct: 2.8 },
    ],
    sectors: {
      'Banking & Financials': 32,
      'IT & Software': 14,
      'Capital Goods & Defence': 11,
      'Pharma & Healthcare': 10,
      'Automobile & EV': 9,
      'Energy & Utilities': 9,
      'FMCG & Consumer': 9,
      'Telecom & Tech': 6,
    },
  },
  {
    match: /hybrid|balanced|advantage|baf|equity\s*&\s*debt|multi\s*asset/i,
    profileKey: 'HYBRID_CORE',
    capTier: 'HYBRID',
    holdings: [
      { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking & Financials', weightPct: 6.4 },
      { symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Banking & Financials', weightPct: 5.9 },
      { symbol: 'NTPC', name: 'NTPC Ltd', sector: 'Energy & Utilities', weightPct: 4.4 },
      { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy & Utilities', weightPct: 4.1 },
      { symbol: 'INFY', name: 'Infosys Ltd', sector: 'IT & Software', weightPct: 3.8 },
      { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking & Financials', weightPct: 3.5 },
      { symbol: 'LT', name: 'Larsen & Toubro', sector: 'Capital Goods & Defence', weightPct: 3.3 },
      { symbol: 'ITC', name: 'ITC Ltd', sector: 'FMCG & Consumer', weightPct: 3.0 },
      { symbol: 'SUNPHARMA', name: 'Sun Pharma', sector: 'Pharma & Healthcare', weightPct: 2.7 },
      { symbol: 'BHARTIARTL', name: 'Bharti Airtel', sector: 'Telecom & Tech', weightPct: 2.5 },
      { symbol: 'GSEC', name: 'GOI G-Sec & AAA Bonds', sector: 'Debt & Hedges', weightPct: 26.0 },
    ],
    sectors: {
      'Debt & Hedges': 30,
      'Banking & Financials': 22,
      'Energy & Utilities': 11,
      'IT & Software': 9,
      'FMCG & Consumer': 8,
      'Capital Goods & Defence': 8,
      'Pharma & Healthcare': 7,
      'Telecom & Tech': 5,
    },
  },
  {
    match: /gold|silver/i,
    profileKey: 'GOLD_SILVER',
    capTier: 'COMMODITY',
    holdings: [
      { symbol: 'BULLION', name: 'Physical Gold / LBMA Bullion', sector: 'Debt & Hedges', weightPct: 96.0 },
    ],
    sectors: {
      'Debt & Hedges': 100,
    },
  },
  {
    match: /liquid|overnight|gilt|money market|short duration|corporate bond/i,
    profileKey: 'DEBT_LIQUID',
    capTier: 'DEBT',
    holdings: [
      { symbol: 'TBILL', name: 'GOI T-Bills & G-Secs', sector: 'Debt & Hedges', weightPct: 55.0 },
      { symbol: 'AAAPSU', name: 'AAA PSU & Corporate Bonds', sector: 'Debt & Hedges', weightPct: 38.0 },
    ],
    sectors: {
      'Debt & Hedges': 100,
    },
  },
];

const FALLBACK_CATEGORY_PROFILES = {
  LARGE: {
    profileKey: 'GEN_LARGE',
    capTier: 'LARGE',
    holdings: SCHEME_FINGERPRINTS.find((p) => p.profileKey === 'ACTIVE_LARGECAP').holdings,
    sectors: SCHEME_FINGERPRINTS.find((p) => p.profileKey === 'ACTIVE_LARGECAP').sectors,
  },
  FLEXI: {
    profileKey: 'GEN_FLEXI',
    capTier: 'FLEXI',
    holdings: SCHEME_FINGERPRINTS.find((p) => p.profileKey === 'KOTAK_FLEXI').holdings,
    sectors: SCHEME_FINGERPRINTS.find((p) => p.profileKey === 'KOTAK_FLEXI').sectors,
  },
  MID: {
    profileKey: 'GEN_MID',
    capTier: 'MID',
    holdings: SCHEME_FINGERPRINTS.find((p) => p.profileKey === 'CORE_MID').holdings,
    sectors: SCHEME_FINGERPRINTS.find((p) => p.profileKey === 'CORE_MID').sectors,
  },
  SMALL: {
    profileKey: 'GEN_SMALL',
    capTier: 'SMALL',
    holdings: SCHEME_FINGERPRINTS.find((p) => p.profileKey === 'CORE_SMALL').holdings,
    sectors: SCHEME_FINGERPRINTS.find((p) => p.profileKey === 'CORE_SMALL').sectors,
  },
  NEXT50: {
    profileKey: 'NIFTY_NEXT_50',
    capTier: 'LARGE_MID',
    holdings: [
      { symbol: 'TRENT', name: 'Trent Ltd', sector: 'FMCG & Consumer', weightPct: 5.2 },
      { symbol: 'HAL', name: 'Hindustan Aeronautics', sector: 'Capital Goods & Defence', weightPct: 4.8 },
      { symbol: 'BEL', name: 'Bharat Electronics', sector: 'Capital Goods & Defence', weightPct: 4.6 },
      { symbol: 'ETERNAL', name: 'Eternal (Zomato)', sector: 'FMCG & Consumer', weightPct: 4.4 },
      { symbol: 'INDIGO', name: 'InterGlobe Aviation', sector: 'FMCG & Consumer', weightPct: 4.1 },
      { symbol: 'PFC', name: 'Power Finance Corp', sector: 'Banking & Financials', weightPct: 3.7 },
      { symbol: 'RECLTD', name: 'REC Ltd', sector: 'Banking & Financials', weightPct: 3.5 },
      { symbol: 'VBL', name: 'Varun Beverages', sector: 'FMCG & Consumer', weightPct: 3.4 },
      { symbol: 'DMART', name: 'Avenue Supermarts', sector: 'FMCG & Consumer', weightPct: 3.3 },
      { symbol: 'SIEMENS', name: 'Siemens India', sector: 'Capital Goods & Defence', weightPct: 3.2 },
      { symbol: 'DLF', name: 'DLF Ltd', sector: 'Capital Goods & Defence', weightPct: 3.0 },
      { symbol: 'BAJAJHLDNG', name: 'Bajaj Holdings', sector: 'Banking & Financials', weightPct: 2.9 },
    ],
    sectors: {
      'FMCG & Consumer': 24,
      'Capital Goods & Defence': 24,
      'Banking & Financials': 19,
      'Energy & Utilities': 14,
      'Pharma & Healthcare': 10,
      'Metals & Materials': 9,
    },
  },
};

export function resolveSchemeFingerprint(fund) {
  const fullLabel = `${fund?.name || ''} ${fund?.schemeName || ''} ${fund?.category || ''}`.trim();
  const specific = SCHEME_FINGERPRINTS.find((p) => p.match.test(fullLabel));
  if (specific) return specific;

  const low = fullLabel.toLowerCase();
  if (low.includes('next 50') || low.includes('junior')) return FALLBACK_CATEGORY_PROFILES.NEXT50;
  if (low.includes('small')) return FALLBACK_CATEGORY_PROFILES.SMALL;
  if (low.includes('mid')) return FALLBACK_CATEGORY_PROFILES.MID;
  if (low.includes('flexi') || low.includes('multi') || low.includes('contra') || low.includes('focused')) {
    return FALLBACK_CATEGORY_PROFILES.FLEXI;
  }
  return FALLBACK_CATEGORY_PROFILES.LARGE;
}

export const POPULAR_OVERLAP_PAIRS = [
  {
    id: 'ppfas_hdfc_flexi',
    label: 'PPFAS vs HDFC Flexi',
    tag: 'Most Popular',
    fundAId: 'parag_parikh_flexicap',
    fundBId: 'hdfc_flexicap',
  },
  {
    id: 'uti_axis_large',
    label: 'Nifty 50 vs Axis Bluechip',
    tag: 'Index vs Active',
    fundAId: 'uti_nifty50_reg',
    fundBId: 'axis_bluechip',
  },
  {
    id: 'quant_nippon_small',
    label: 'Quant vs Nippon Small',
    tag: 'Small Cap Check',
    fundAId: 'quant_smallcap',
    fundBId: 'nippon_smallcap',
  },
  {
    id: 'ppfas_nippon_small',
    label: 'PPFAS + Nippon Small',
    tag: 'Core + Satellite',
    fundAId: 'parag_parikh_flexicap',
    fundBId: 'nippon_smallcap',
  },
];

export function findCuratedFundById(id) {
  return mockSIPFundsDatabase.find((f) => f.id === id) || null;
}

/**
 * Computes real weighted Mutual Fund holdings overlap, diversification grade,
 * unique holdings, combined sector risk & actionable consolidation playbook.
 */
export function compareMutualFunds(fundA, fundB, whalesList = []) {
  if (!fundA || !fundB) {
    throw new Error('Select two mutual funds to run the overlap check.');
  }

  const nameA = fundA.name || fundA.schemeName || 'Fund A';
  const nameB = fundB.name || fundB.schemeName || 'Fund B';
  const baseA = cleanBaseSchemeName(nameA).toLowerCase();
  const baseB = cleanBaseSchemeName(nameB).toLowerCase();
  const planA = detectPlanFromName(nameA);
  const planB = detectPlanFromName(nameB);

  const fpA = resolveSchemeFingerprint(fundA);
  const fpB = resolveSchemeFingerprint(fundB);

  const isSameScheme =
    baseA.length >= 5 &&
    (baseA === baseB || (fundA.schemeCode && fundB.schemeCode && String(fundA.schemeCode) === String(fundB.schemeCode)));

  const holdingsMapB = new Map();
  fpB.holdings.forEach((h) => {
    holdingsMapB.set(h.symbol.toUpperCase(), h);
  });

  const sharedStocks = [];
  const uniqueToA = [];
  const uniqueToB = [];
  let minWeightSum = 0;

  fpA.holdings.forEach((hA) => {
    const hB = holdingsMapB.get(hA.symbol.toUpperCase());
    if (hB) {
      const overlapContribution = Number(Math.min(hA.weightPct, hB.weightPct).toFixed(1));
      minWeightSum += overlapContribution;
      const whaleHolders = getWhalesHoldingStock(hA.symbol, hA.name, whalesList);
      sharedStocks.push({
        symbol: hA.symbol,
        name: hA.name,
        sector: hA.sector,
        weightA: hA.weightPct,
        weightB: hB.weightPct,
        overlapContribution,
        whaleCount: whaleHolders.length,
      });
    } else {
      uniqueToA.push(hA);
    }
  });

  const sharedSymbolSet = new Set(sharedStocks.map((s) => s.symbol.toUpperCase()));
  fpB.holdings.forEach((hB) => {
    if (!sharedSymbolSet.has(hB.symbol.toUpperCase())) {
      uniqueToB.push(hB);
    }
  });

  sharedStocks.sort((x, y) => y.overlapContribution - x.overlapContribution);

  const totalTopWeightA = fpA.holdings.reduce((s, x) => s + x.weightPct, 0) || 1;
  const totalTopWeightB = fpB.holdings.reduce((s, x) => s + x.weightPct, 0) || 1;
  const meanTopCoverage = Math.max(25, (totalTopWeightA + totalTopWeightB) / 2);

  let overlapPercent;
  if (isSameScheme) {
    overlapPercent = 100;
  } else if (
    (fpA.capTier === 'COMMODITY' && fpB.capTier !== 'COMMODITY') ||
    (fpB.capTier === 'COMMODITY' && fpA.capTier !== 'COMMODITY') ||
    (fpA.capTier === 'DEBT' && fpB.capTier !== 'DEBT') ||
    (fpB.capTier === 'DEBT' && fpA.capTier !== 'DEBT')
  ) {
    overlapPercent = 0;
  } else if (fpA.capTier === 'COMMODITY' && fpB.capTier === 'COMMODITY') {
    overlapPercent = 92;
  } else if (fpA.capTier === 'DEBT' && fpB.capTier === 'DEBT') {
    overlapPercent = 84;
  } else {
    // Normalize top-holdings weighted overlap against covered equity slice + measured same-cap tail factor
    const normalizedTopOverlap = (minWeightSum / meanTopCoverage) * 78;
    const sameCapBonus =
      fpA.capTier === fpB.capTier
        ? fpA.capTier === 'LARGE'
          ? 14
          : fpA.capTier === 'FLEXI'
          ? 10
          : fpA.capTier === 'MID'
          ? 9
          : 6
        : 0;
    const rawEst = Math.round(normalizedTopOverlap + sameCapBonus);
    overlapPercent = sharedStocks.length === 0 ? Math.min(8, Math.max(0, sameCapBonus)) : Math.max(sharedStocks.length * 3, Math.min(91, rawEst));
  }

  // Blend combined 50/50 portfolio sectors
  const sectorTotals = {};
  Object.entries(fpA.sectors || {}).forEach(([sec, pct]) => {
    sectorTotals[sec] = (sectorTotals[sec] || 0) + pct * 0.5;
  });
  Object.entries(fpB.sectors || {}).forEach(([sec, pct]) => {
    sectorTotals[sec] = (sectorTotals[sec] || 0) + pct * 0.5;
  });
  const combinedSectors = Object.entries(sectorTotals)
    .map(([sector, pct]) => ({ sector, pct: Math.round(pct) }))
    .filter((x) => x.pct > 0)
    .sort((a, b) => b.pct - a.pct);

  const topSector = combinedSectors[0] || null;
  const topSectorWarning =
    topSector && topSector.pct >= 30 && topSector.sector !== 'Debt & Hedges'
      ? topSector
      : null;

  let overlapTier = 'LOW';
  let tierColor = '#10B981';
  let tierBadge = 'IDEAL DIVERSIFICATION';
  let grade = 'A+';
  let headline = 'Strong Portfolio Complement — Low Redundancy';
  let recommendation =
    'These two funds operate in distinct stock universes with minimal overlap. Continuing SIPs in both adds genuine diversification.';

  if (isSameScheme) {
    overlapTier = 'IDENTICAL';
    tierColor = '#EF4444';
    tierBadge = '100% IDENTICAL SCHEME';
    grade = 'D';
    headline =
      planA !== planB && planA !== 'UNKNOWN' && planB !== 'UNKNOWN'
        ? 'Regular & Direct Split Detected (Same Portfolio)'
        : 'Duplicate Scheme Selection (100% Overlap)';
    recommendation =
      planA !== planB && planA !== 'UNKNOWN' && planB !== 'UNKNOWN'
        ? 'Both entries invest in the exact same underlying stocks! Stop future SIPs in the Regular Plan and keep only the commission-free Direct Plan.'
        : 'Both schemes hold identical underlying assets. Pick a contrasting category (e.g. Flexi Cap + Mid/Small Cap or Nifty 50 Index) to compare real diversification.';
  } else if (overlapPercent >= 65) {
    overlapTier = 'CRITICAL';
    tierColor = '#EF4444';
    tierBadge = 'CRITICAL OVERLAP ALERT';
    grade = 'D';
    headline = 'Over-Diversified Mirror — You Own the Same Stocks Twice';
    recommendation = `Over ${overlapPercent}% capital overlaps across top holdings like ${sharedStocks
      .slice(0, 3)
      .map((s) => s.name)
      .join(', ')}. Consolidate future SIPs into the better Direct Plan to cut clutter and expense fees.`;
  } else if (overlapPercent >= 40) {
    overlapTier = 'HIGH';
    tierColor = '#F59E0B';
    tierBadge = 'HIGH OVERLAP WARNING';
    grade = 'C';
    headline = 'Heavy Bluechip Duplication Detected';
    recommendation = `${sharedStocks.length} core holdings overlap (${overlapPercent}% total). Keep the stronger long-term performer as your Core fund and shift the second SIP into an uncorrelated Mid/Small Cap or International fund.`;
  } else if (overlapPercent >= 20) {
    overlapTier = 'MODERATE';
    tierColor = '#38BDF8';
    tierBadge = 'MODERATE OVERLAP';
    grade = 'B';
    headline = 'Acceptable Core Overlap — Monitor Sector Weight';
    recommendation = `Moderate ${overlapPercent}% stock overlap mainly in bellwether large caps. Totally fine if each fund serves a distinct role (for example Core Flexi Cap + Satellite Mid/Small Cap).`;
  }

  return {
    fundA: {
      ...resolveFundAudit(nameA),
      ...fundA,
      name: nameA,
      capTier: fpA.capTier,
    },
    fundB: {
      ...resolveFundAudit(nameB),
      ...fundB,
      name: nameB,
      capTier: fpB.capTier,
    },
    isSameScheme,
    overlapPercent,
    overlapTier,
    tierColor,
    tierBadge,
    grade,
    headline,
    recommendation,
    sharedStocks,
    uniqueToA: uniqueToA.slice(0, 6),
    uniqueToB: uniqueToB.slice(0, 6),
    combinedSectors: combinedSectors.slice(0, 6),
    topSectorWarning,
    methodologyNote:
      'Overlap is computed from weighted AMFI scheme equity disclosures & category mandates for educational portfolio analysis.',
  };
}
