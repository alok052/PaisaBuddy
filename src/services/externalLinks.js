import { Linking, Alert } from 'react-native';

const BROKER_BASE_URLS = {
  'Zerodha Kite': 'https://kite.zerodha.com',
  'Zerodha Coin': 'https://coin.zerodha.com',
  Groww: 'https://groww.in/stocks',
  'Angel One': 'https://trade.angelone.in',
  Upstox: 'https://pro.upstox.com',
  'NSE Quote': 'https://www.nseindia.com',
  Screener: 'https://www.screener.in',
};

export const OFFICIAL_SEBI_DRHP_URL =
  'https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=15&smid=10';

export function buildBrokerUrl(brokerName, symbolOrName = '') {
  const cleanQuery = String(symbolOrName || '')
    .replace(/\.(NS|BO|PA|L)$/i, '')
    .trim();
  const cleanSym = cleanQuery.toUpperCase().replace(/[^A-Z0-9&-]/g, '');

  if (brokerName === 'Groww') {
    return cleanQuery
      ? `https://groww.in/search?q=${encodeURIComponent(cleanQuery)}`
      : BROKER_BASE_URLS.Groww;
  }
  if (brokerName === 'NSE Quote') {
    return cleanSym
      ? `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(cleanSym)}`
      : BROKER_BASE_URLS['NSE Quote'];
  }
  if (brokerName === 'Screener') {
    return cleanSym
      ? `https://www.screener.in/company/${encodeURIComponent(cleanSym)}/`
      : BROKER_BASE_URLS.Screener;
  }
  return BROKER_BASE_URLS[brokerName] || 'https://kite.zerodha.com';
}

export async function openExternalUrl(url, title = 'Unable to Open Link', fallbackBody = '') {
  try {
    await Linking.openURL(url);
    return true;
  } catch (err) {
    Alert.alert(title, fallbackBody || `Please visit:\n${url}`);
    return false;
  }
}

export async function openBrokerTerminal(brokerName, symbolOrName = '') {
  const url = buildBrokerUrl(brokerName, symbolOrName);
  const label = symbolOrName ? `${brokerName} (${symbolOrName})` : brokerName;
  return openExternalUrl(
    url,
    `Open ${brokerName}`,
    `Could not launch ${label} automatically. Visit ${url} in your browser or broker app.`
  );
}
