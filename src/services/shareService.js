import { Share, Linking, Platform, Alert } from 'react-native';
import { formatInrPrice } from './dataService';

export const PLAY_STORE_PACKAGE = 'com.paisabuddy.fintech';
export const PLAY_STORE_WEB_URL = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`;
export const PLAY_STORE_MARKET_URL = `market://details?id=${PLAY_STORE_PACKAGE}`;

function formatLakhsCr(lakhs) {
  const num = Number(lakhs) || 0;
  if (num >= 100) return `₹${(num / 100).toFixed(1)} Cr`;
  return `₹${num.toFixed(1)} Lakh`;
}

export async function shareSipDiagnosticInsight({
  fundName,
  planType = 'REGULAR',
  sipAmount = 10000,
  sipYears = 15,
  stepUpRate = 0,
  extraWealthLakhs = 0,
  projectedCorpusLakhs = 0,
  cagrText = '13.0%',
}) {
  const stepText = stepUpRate > 0 ? `+${stepUpRate}% Annual Step-Up` : 'Flat SIP';
  const recoveryLine =
    extraWealthLakhs > 0.2
      ? `💸 Commission / Switching Recovery: +${formatLakhsCr(extraWealthLakhs)} over ${sipYears}Y!\n`
      : '';

  const message = [
    `📊 SIP Doctor Audit — ${fundName || 'Mutual Fund'}`,
    `• Plan: ${planType} • SIP: ₹${Number(sipAmount).toLocaleString('en-IN')}/mo (${stepText})`,
    `• Live Trailing CAGR: ${cagrText} • Horizon: ${sipYears} Years`,
    `• Projected Wealth: ${formatLakhsCr(projectedCorpusLakhs)}`,
    recoveryLine ? recoveryLine.trimEnd() : null,
    '',
    `Audited commission-free on PaisaBuddy (India's Free Smart Money & MF Audit App):`,
    PLAY_STORE_WEB_URL,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    return await Share.share({
      title: `SIP Audit: ${fundName}`,
      message,
    });
  } catch (err) {
    return null;
  }
}

export async function shareOverlapInsight(report) {
  if (!report) return null;
  const topShared = (report.sharedStocks || [])
    .slice(0, 4)
    .map((s) => `${s.name} (${s.weightA}% / ${s.weightB}%)`)
    .join(', ');

  const message = [
    `🔍 Mutual Fund Overlap Scan — ${report.overlapPercent}% Overlap (${report.tierBadge})`,
    `• Fund A: ${report.fundA?.name}`,
    `• Fund B: ${report.fundB?.name}`,
    topShared ? `• Top Shared Stocks: ${topShared}` : '• Shared Stocks: Zero equity overlap!',
    `• Verdict: ${report.headline}`,
    '',
    `Checked in 2 seconds with zero broker login on PaisaBuddy:`,
    PLAY_STORE_WEB_URL,
  ].join('\n');

  try {
    return await Share.share({
      title: `${report.overlapPercent}% MF Overlap Scan`,
      message,
    });
  } catch (err) {
    return null;
  }
}

export async function shareWhaleInsight(whale) {
  if (!whale) return null;
  const holdings = (whale.topHoldings || [])
    .slice(0, 3)
    .map((h) => `${h.name}${h.stake ? ` (${h.stake})` : ''}`)
    .join(', ');

  const message = [
    `🐋 Super-Investor Radar — ${whale.name}`,
    `• Portfolio Size: ${whale.portfolioValue} • 1Y Return: ${whale.return1Y}`,
    holdings ? `• Top Disclosed Positions: ${holdings}` : null,
    '',
    `Track 50 Indian & Global Billionaires (SEBI & SEC 13F Live) on PaisaBuddy:`,
    PLAY_STORE_WEB_URL,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    return await Share.share({
      title: `${whale.name} Portfolio Snapshot`,
      message,
    });
  } catch (err) {
    return null;
  }
}

export async function shareNseStockInsight(stock, whaleHolders = []) {
  if (!stock) return null;
  const priceText =
    stock.closePrice > 0 ? formatInrPrice(stock.closePrice) : stock.cmp || 'Market Rate';
  const pct = stock.dayChangePct;
  const moveStr =
    pct !== null && pct !== undefined
      ? ` (${pct >= 0 ? '+' : ''}${Number(pct).toFixed(2)}% EOD)`
      : '';
  const whalesLine =
    Array.isArray(whaleHolders) && whaleHolders.length > 0
      ? `🐋 Held by ${whaleHolders.length} Tracked Super-Investor${
          whaleHolders.length === 1 ? '' : 's'
        }: ${whaleHolders
          .slice(0, 3)
          .map((w) => w.whaleName)
          .join(', ')}`
      : String(stock.cmp || '').includes('$')
      ? `🌍 Tracked Global Equity • Watchlist Insight`
      : `📊 Official NSE Bhavcopy EOD Data${
          stock.deliveryPct != null ? ` • Delivery: ${stock.deliveryPct}%` : ''
        }`;

  const message = [
    `📈 ${stock.name} (${stock.symbol}) — ${priceText}${moveStr}`,
    whalesLine,
    '',
    `Explore 3,700+ NSE charts & 50 Billionaire Portfolios free on PaisaBuddy:`,
    PLAY_STORE_WEB_URL,
  ].join('\n');

  try {
    return await Share.share({
      title: `${stock.symbol} NSE Research`,
      message,
    });
  } catch (err) {
    return null;
  }
}

export async function shareConsensusStockInsight(stock) {
  if (!stock) return null;
  const whalesList = (stock.billionaires || []).map((b) => b.name).join(', ');
  const message = [
    `💎 Multi-Whale Consensus Stock: ${stock.name} (${stock.symbol})`,
    `• Price: ${stock.cmp} (${stock.change1Y} 1Y) • Conviction Score: ${stock.convictionScore}%`,
    whalesList ? `• Co-Invested Whales: ${whalesList}` : null,
    `• Catalyst: ${stock.catalyst}`,
    '',
    `Discovered on PaisaBuddy — Free Billionaire & MF Audit App:`,
    PLAY_STORE_WEB_URL,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    return await Share.share({
      title: `${stock.symbol} Whale Consensus`,
      message,
    });
  } catch (err) {
    return null;
  }
}

export async function sharePaisaBuddyApp() {
  const message = [
    `🚀 Check out PaisaBuddy — Free Indian Smart Money & Portfolio Audit App!`,
    `• Track 50 Billionaires (SEBI >1% & US SEC 13F Live)`,
    `• Audit MF Overlap & Regular-to-Direct Commission Leakage (45,000+ AMFI Funds)`,
    `• Explore 3,700+ NSE Stocks with 1Y Charts, Tax Harvester & Dividend Tracker`,
    '',
    `Zero broker login required:`,
    PLAY_STORE_WEB_URL,
  ].join('\n');

  try {
    return await Share.share({
      title: 'PaisaBuddy — Smart Money & MF Audit',
      message,
    });
  } catch (err) {
    return null;
  }
}

export async function rateOnPlayStore() {
  try {
    if (Platform.OS === 'android') {
      const canMarket = await Linking.canOpenURL(PLAY_STORE_MARKET_URL).catch(() => false);
      if (canMarket) {
        await Linking.openURL(PLAY_STORE_MARKET_URL);
        return true;
      }
    }
    const canWeb = await Linking.canOpenURL(PLAY_STORE_WEB_URL).catch(() => false);
    if (canWeb) {
      await Linking.openURL(PLAY_STORE_WEB_URL);
      return true;
    }
  } catch (err) {
    // Graceful fallback dialog below
  }

  Alert.alert(
    'Enjoying PaisaBuddy? ⭐',
    'Once our Play Store listing is live, this opens the 5-star review page directly.\n\nMeanwhile, sharing PaisaBuddy with 1 investor friend helps our community grow!',
    [
      { text: 'Share with a Friend', onPress: () => sharePaisaBuddyApp() },
      { text: 'Close', style: 'cancel' },
    ]
  );
  return false;
}
