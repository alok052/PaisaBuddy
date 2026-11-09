import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Path,
  Line,
  Circle,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import {
  fetchNseStockHistory,
  formatInrPrice,
  formatIndianVolume,
  formatTurnoverCrores,
  getWhalesHoldingStock,
} from '../services/dataService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = Math.max(260, SCREEN_WIDTH - 56);
const CHART_HEIGHT = 186;
const TIME_RANGES = [
  { key: '1W', label: '1W', count: 5 },
  { key: '1M', label: '1M', count: 22 },
  { key: '3M', label: '3M', count: 65 },
  { key: '6M', label: '6M', count: 130 },
  { key: '1Y', label: '1Y', count: 260 },
];

export function sliceHistoryByRange(points = [], rangeKey = '1Y') {
  if (!Array.isArray(points) || points.length === 0) return [];
  const cfg = TIME_RANGES.find((r) => r.key === rangeKey) || TIME_RANGES[TIME_RANGES.length - 1];
  if (points.length <= cfg.count) return points;
  return points.slice(-cfg.count);
}

export function buildChartGeometry(points = [], width = CHART_WIDTH, height = CHART_HEIGHT) {
  if (!Array.isArray(points) || points.length < 2) {
    return null;
  }
  const padTop = 14;
  const padBottom = 14;
  const usableH = Math.max(40, height - padTop - padBottom);
  const closes = points.map((p) => p.close);
  let minVal = Math.min(...closes);
  let maxVal = Math.max(...closes);
  if (maxVal === minVal) {
    minVal = minVal * 0.98;
    maxVal = maxVal * 1.02 + 0.01;
  }
  const span = maxVal - minVal;

  const coords = points.map((pt, idx) => {
    const x = points.length === 1 ? width / 2 : (idx / (points.length - 1)) * width;
    const y = padTop + usableH - ((pt.close - minVal) / span) * usableH;
    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      point: pt,
    };
  });

  const linePath = coords
    .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x} ${c.y}`)
    .join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;

  return {
    coords,
    linePath,
    areaPath,
    minVal,
    maxVal,
    firstY: coords[0].y,
  };
}

function formatShortDate(isoStr) {
  if (!isoStr || typeof isoStr !== 'string') return '—';
  const parts = isoStr.split('-');
  if (parts.length !== 3) return isoStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mIdx = parseInt(parts[1], 10) - 1;
  return `${parts[2]} ${months[mIdx] || parts[1]} ${parts[0].slice(-2)}`;
}

export default function StockDetailModal({ visible, stock, whalesList = [], onClose }) {
  const [selectedRange, setSelectedRange] = useState('1Y');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyPoints, setHistoryPoints] = useState([]);
  const [historySource, setHistorySource] = useState('loading');
  const [activeIndex, setActiveIndex] = useState(null);
  const lastHapticIdx = useRef(null);

  useEffect(() => {
    let active = true;
    if (!visible || !stock?.symbol) {
      return () => {
        active = false;
      };
    }

    setActiveIndex(null);
    lastHapticIdx.current = null;
    setLoadingHistory(true);
    setHistoryPoints([]);
    setHistorySource('loading');

    fetchNseStockHistory(stock.symbol)
      .then((res) => {
        if (!active) return;
        const pts = Array.isArray(res?.points) ? res.points : [];
        setHistoryPoints(pts);
        setHistorySource(res?.source || 'unavailable');
        if (pts.length > 0 && pts.length <= 25) {
          setSelectedRange('1M');
        } else {
          setSelectedRange('1Y');
        }
      })
      .finally(() => {
        if (active) setLoadingHistory(false);
      });

    return () => {
      active = false;
    };
  }, [visible, stock?.symbol]);

  const slicedPoints = useMemo(
    () => sliceHistoryByRange(historyPoints, selectedRange),
    [historyPoints, selectedRange]
  );

  const chartGeom = useMemo(
    () => buildChartGeometry(slicedPoints, CHART_WIDTH, CHART_HEIGHT),
    [slicedPoints]
  );

  const whaleHolders = useMemo(
    () => (stock ? getWhalesHoldingStock(stock.symbol, stock.name, whalesList) : []),
    [stock, whalesList]
  );

  if (!stock) return null;

  // Dynamic Price & Return stats (responds smoothly to touch scrubbing & timeframe selection)
  const latestClose =
    stock.closePrice ??
    (slicedPoints.length > 0 ? slicedPoints[slicedPoints.length - 1].close : null);
  const touchedPoint =
    activeIndex !== null && slicedPoints[activeIndex] ? slicedPoints[activeIndex] : null;
  const activeCoord =
    activeIndex !== null && chartGeom?.coords?.[activeIndex] ? chartGeom.coords[activeIndex] : null;

  let periodChangePct = stock.dayChangePct ?? 0;
  let periodLabel = '1D EOD';
  if (touchedPoint && slicedPoints.length >= 2) {
    const base = slicedPoints[0].close;
    periodChangePct = base > 0 ? ((touchedPoint.close - base) / base) * 100 : 0;
    periodLabel = `vs ${formatShortDate(slicedPoints[0].date)}`;
  } else if (slicedPoints.length >= 2) {
    const base = slicedPoints[0].close;
    const end = slicedPoints[slicedPoints.length - 1].close;
    periodChangePct = base > 0 ? ((end - base) / base) * 100 : 0;
    periodLabel = `${selectedRange} Return`;
  } else if (selectedRange === '1Y' && typeof stock.change1yPct === 'number') {
    periodChangePct = stock.change1yPct;
    periodLabel = '1Y Return';
  }

  const displayPrice = touchedPoint ? touchedPoint.close : latestClose;
  const isPositive = (periodChangePct ?? 0) >= 0;
  const accentColor = isPositive ? '#10B981' : '#EF4444';

  const period52High =
    stock.high52w ??
    (historyPoints.length > 0 ? Math.max(...historyPoints.map((p) => p.high || p.close)) : stock.highPrice);
  const period52Low =
    stock.low52w ??
    (historyPoints.length > 0 ? Math.min(...historyPoints.map((p) => p.low || p.close)) : stock.lowPrice);

  const updateTouchIndex = (locationX) => {
    if (!slicedPoints || slicedPoints.length < 2) return;
    const ratio = Math.max(0, Math.min(1, locationX / CHART_WIDTH));
    const idx = Math.min(slicedPoints.length - 1, Math.max(0, Math.round(ratio * (slicedPoints.length - 1))));
    if (lastHapticIdx.current !== idx) {
      lastHapticIdx.current = idx;
      Haptics.selectionAsync();
    }
    setActiveIndex(idx);
  };

  // Intraday Range dot position (0..100%)
  let intradayPct = 50;
  if (
    stock.highPrice &&
    stock.lowPrice &&
    stock.closePrice &&
    stock.highPrice > stock.lowPrice
  ) {
    intradayPct = Math.max(
      4,
      Math.min(96, ((stock.closePrice - stock.lowPrice) / (stock.highPrice - stock.lowPrice)) * 100)
    );
  }

  const recentSessions = slicedPoints.slice(-5).reverse();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Curved Handle */}
          <View style={styles.handleWrapper}>
            <View style={styles.handlePill} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <View style={styles.badgeRow}>
                <View style={styles.symbolBadge}>
                  <Text style={styles.symbolBadgeText}>{stock.symbol}</Text>
                </View>
                <View style={styles.seriesBadge}>
                  <Text style={styles.seriesBadgeText}>NSE • {stock.series || 'EQ'}</Text>
                </View>
                <View style={styles.officialBadge}>
                  <Ionicons name="shield-checkmark-outline" size={11} color="#10B981" />
                  <Text style={styles.officialBadgeText}>OFFICIAL EOD</Text>
                </View>
              </View>

              <Text style={styles.companyName} numberOfLines={2}>
                {stock.name}
              </Text>
              <Text style={styles.metaSub}>
                {stock.isin ? `ISIN: ${stock.isin}  •  ` : ''}
                {stock.lastTradeDate ? `Last Session: ${formatShortDate(stock.lastTradeDate)}` : 'NSE Listed Equity'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="close" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
          >
            {/* Price & Return Hero Card */}
            <View style={styles.priceHeroCard}>
              <View style={styles.priceRow}>
                <View>
                  <Text style={styles.priceValue}>{formatInrPrice(displayPrice)}</Text>
                  <Text style={styles.priceDateCaption}>
                    {touchedPoint
                      ? `EOD Close on ${formatShortDate(touchedPoint.date)}`
                      : 'Unadjusted NSE EOD Close Price'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.changePill,
                    {
                      backgroundColor: isPositive
                        ? 'rgba(16, 185, 129, 0.14)'
                        : 'rgba(239, 68, 68, 0.14)',
                      borderColor: isPositive
                        ? 'rgba(16, 185, 129, 0.35)'
                        : 'rgba(239, 68, 68, 0.35)',
                    },
                  ]}
                >
                  <Ionicons
                    name={isPositive ? 'trending-up' : 'trending-down'}
                    size={14}
                    color={accentColor}
                  />
                  <View style={{ marginLeft: 5 }}>
                    <Text style={[styles.changePctText, { color: accentColor }]}>
                      {isPositive ? '+' : ''}
                      {(periodChangePct ?? 0).toFixed(2)}%
                    </Text>
                    <Text style={styles.changePeriodLabel}>{periodLabel}</Text>
                  </View>
                </View>
              </View>

              {/* Timeframe Filter Chips */}
              <View style={styles.rangeRow}>
                {TIME_RANGES.map((r) => {
                  const isActive = selectedRange === r.key;
                  const hasEnough = historyPoints.length > 0;
                  return (
                    <TouchableOpacity
                      key={r.key}
                      style={[
                        styles.rangePill,
                        isActive && styles.rangePillActive,
                        !hasEnough && { opacity: 0.45 },
                      ]}
                      disabled={!hasEnough}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedRange(r.key);
                        setActiveIndex(null);
                      }}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.rangePillText,
                          isActive && styles.rangePillTextActive,
                        ]}
                      >
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Chart Viewport */}
              {loadingHistory ? (
                <View style={styles.chartPlaceholder}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.chartPlaceholderText}>
                    Loading Official NSE EOD Price History...
                  </Text>
                </View>
              ) : chartGeom ? (
                <View>
                  <View
                    style={styles.chartTouchArea}
                    onStartShouldSetResponder={() => true}
                    onMoveShouldSetResponder={() => true}
                    onResponderGrant={(e) => updateTouchIndex(e.nativeEvent.locationX)}
                    onResponderMove={(e) => updateTouchIndex(e.nativeEvent.locationX)}
                    onResponderRelease={() => {
                      lastHapticIdx.current = null;
                      setActiveIndex(null);
                    }}
                    onResponderTerminate={() => {
                      lastHapticIdx.current = null;
                      setActiveIndex(null);
                    }}
                  >
                    <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                      <Defs>
                        <SvgLinearGradient id="nseAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0%" stopColor={accentColor} stopOpacity="0.34" />
                          <Stop offset="100%" stopColor={accentColor} stopOpacity="0.01" />
                        </SvgLinearGradient>
                      </Defs>

                      {/* Starting Reference Dotted Baseline */}
                      <Line
                        x1="0"
                        y1={chartGeom.firstY}
                        x2={CHART_WIDTH}
                        y2={chartGeom.firstY}
                        stroke="rgba(148, 163, 184, 0.25)"
                        strokeDasharray="4,4"
                        strokeWidth="1"
                      />

                      {/* Gradient Area Under Curve */}
                      <Path d={chartGeom.areaPath} fill="url(#nseAreaGrad)" />

                      {/* Crisp Price Line */}
                      <Path
                        d={chartGeom.linePath}
                        stroke={accentColor}
                        strokeWidth="2.2"
                        fill="none"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />

                      {/* Interactive Crosshair Dot on Touch/Drag */}
                      {activeCoord && (
                        <>
                          <Line
                            x1={activeCoord.x}
                            y1={0}
                            x2={activeCoord.x}
                            y2={CHART_HEIGHT}
                            stroke="rgba(255, 255, 255, 0.35)"
                            strokeDasharray="3,3"
                            strokeWidth="1"
                          />
                          <Circle
                            cx={activeCoord.x}
                            cy={activeCoord.y}
                            r="7"
                            fill={accentColor}
                            fillOpacity="0.25"
                          />
                          <Circle
                            cx={activeCoord.x}
                            cy={activeCoord.y}
                            r="4"
                            fill="#FFFFFF"
                            stroke={accentColor}
                            strokeWidth="2"
                          />
                        </>
                      )}
                    </Svg>
                  </View>

                  <View style={styles.chartFooterMeta}>
                    <Text style={styles.chartAxisText}>
                      Low {formatInrPrice(chartGeom.minVal)} • High {formatInrPrice(chartGeom.maxVal)}
                    </Text>
                    {touchedPoint ? (
                      <Text style={styles.chartHintText}>
                        H: {formatInrPrice(touchedPoint.high)} • L: {formatInrPrice(touchedPoint.low)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : (
                <View style={styles.noHistoryBox}>
                  <View style={styles.noHistoryTop}>
                    <Ionicons name="analytics-outline" size={16} color="#F59E0B" />
                    <Text style={styles.noHistoryTitle}>
                      Latest Session Intraday Range (1Y Sync{' '}
                      {historySource === 'unavailable' ? 'Pending SQL Setup' : 'Initializing'})
                    </Text>
                  </View>
                  <View style={styles.rangeBarLabels}>
                    <Text style={styles.rangeEdgeText}>Low {formatInrPrice(stock.lowPrice)}</Text>
                    <Text style={styles.rangeEdgeText}>High {formatInrPrice(stock.highPrice)}</Text>
                  </View>
                  <View style={styles.rangeTrack}>
                    <View
                      style={[
                        styles.rangeThumb,
                        { left: `${intradayPct}%`, backgroundColor: accentColor },
                      ]}
                    />
                  </View>
                  <Text style={styles.noHistorySub}>
                    Run the NSE Stocks table setup in `supabase_setup.sql` + GitHub Actions workflow once to stream interactive 1-year daily charts across all 3,500+ NSE stocks.
                  </Text>
                </View>
              )}
            </View>

            {/* 2x4 Official NSE Exchange Metrics Grid */}
            <Text style={styles.sectionHeading}>OFFICIAL NSE SESSION FUNDAMENTALS</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>OPEN</Text>
                <Text style={styles.metricVal}>{formatInrPrice(stock.openPrice)}</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>PREV CLOSE</Text>
                <Text style={styles.metricVal}>{formatInrPrice(stock.prevClose)}</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>DAY HIGH</Text>
                <Text style={[styles.metricVal, { color: '#10B981' }]}>
                  {formatInrPrice(stock.highPrice)}
                </Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>DAY LOW</Text>
                <Text style={[styles.metricVal, { color: '#EF4444' }]}>
                  {formatInrPrice(stock.lowPrice)}
                </Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>52W HIGH</Text>
                <Text style={styles.metricVal}>{formatInrPrice(period52High)}</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>52W LOW</Text>
                <Text style={styles.metricVal}>{formatInrPrice(period52Low)}</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>VOLUME</Text>
                <Text style={styles.metricVal}>{formatIndianVolume(stock.volume)}</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>DELIVERY %</Text>
                <Text
                  style={[
                    styles.metricVal,
                    stock.deliveryPct >= 50 && { color: '#10B981' },
                  ]}
                >
                  {stock.deliveryPct !== null && stock.deliveryPct !== undefined
                    ? `${stock.deliveryPct}%`
                    : '—'}
                </Text>
              </View>
            </View>

            {/* Turnover Pill */}
            <View style={styles.turnoverStrip}>
              <View style={styles.turnoverLeft}>
                <Ionicons name="cash-outline" size={16} color="#3B82F6" />
                <Text style={styles.turnoverLabel}>Session Traded Turnover</Text>
              </View>
              <Text style={styles.turnoverValue}>
                {formatTurnoverCrores(stock.turnoverLacs)}
              </Text>
            </View>

            {/* Whale / Super-Investor Overlap Check */}
            <Text style={styles.sectionHeading}>SUPER-INVESTOR WHALE OWNERSHIP</Text>
            <View style={styles.whaleOverlapCard}>
              {whaleHolders.length > 0 ? (
                <View style={{ gap: 8 }}>
                  <View style={styles.whaleMatchBanner}>
                    <Ionicons name="sparkles" size={15} color="#10B981" />
                    <Text style={styles.whaleMatchTitle}>
                      Held by {whaleHolders.length} Tracked Indian{' '}
                      {whaleHolders.length === 1 ? 'Whale' : 'Whales'}
                    </Text>
                  </View>
                  {whaleHolders.map((h) => (
                    <View key={h.whaleId} style={styles.whaleChipRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.whaleChipName}>{h.whaleName}</Text>
                        <Text style={styles.whaleChipTag} numberOfLines={1}>
                          {h.tag}
                        </Text>
                      </View>
                      <View style={styles.whaleStakePill}>
                        <Text style={styles.whaleStakeText}>{h.stake}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.noWhaleRow}>
                  <Ionicons name="information-circle-outline" size={18} color="#94A3B8" />
                  <Text style={styles.noWhaleText}>
                    No {'>='}1% public shareholding disclosed across tracked Indian Super-Investor portfolios in recent SEBI quarterly filings.
                  </Text>
                </View>
              )}
            </View>

            {/* Recent 5 EOD Trading Sessions */}
            {recentSessions.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.sectionHeading}>RECENT EOD SESSIONS (NSE BHAVCOPY)</Text>
                <View style={styles.sessionsCard}>
                  {recentSessions.map((pt, idx) => (
                    <View
                      key={pt.date}
                      style={[
                        styles.sessionRow,
                        idx === recentSessions.length - 1 && { borderBottomWidth: 0 },
                      ]}
                    >
                      <Text style={styles.sessionDate}>{formatShortDate(pt.date)}</Text>
                      <Text style={styles.sessionRange}>
                        L {formatInrPrice(pt.low)} – H {formatInrPrice(pt.high)}
                      </Text>
                      <Text style={styles.sessionClose}>{formatInrPrice(pt.close)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Play Store & SEBI Safe Informational Footer */}
            <View style={styles.complianceBox}>
              <Ionicons name="document-text-outline" size={14} color="#64748B" style={{ marginTop: 2 }} />
              <Text style={styles.complianceText}>
                Source: Official NSE Equity Master &amp; Sec Bhavcopy (Unadjusted EOD Closing Prices). Informational &amp; educational reference only — PaisaBuddy does not provide SEBI investment advisory or execute live trades.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.86)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    height: '92%',
    backgroundColor: '#070A12',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  handleWrapper: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handlePill: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.07)',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  symbolBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  symbolBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  seriesBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  seriesBadgeText: {
    color: '#60A5FA',
    fontSize: 10,
    fontWeight: '700',
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  officialBadgeText: {
    color: '#10B981',
    fontSize: 9.5,
    fontWeight: '800',
  },
  companyName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
  },
  metaSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 3,
    fontWeight: '500',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 38,
  },
  priceHeroCard: {
    backgroundColor: '#0D1527',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 18,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  priceValue: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  priceDateCaption: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  changePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  changePctText: {
    fontSize: 13.5,
    fontWeight: '900',
  },
  changePeriodLabel: {
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: '700',
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#080C14',
    borderRadius: 12,
    padding: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  rangePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 9,
  },
  rangePillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  rangePillText: {
    color: '#94A3B8',
    fontSize: 11.5,
    fontWeight: '700',
  },
  rangePillTextActive: {
    color: '#10B981',
    fontWeight: '900',
  },
  chartTouchArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  chartPlaceholder: {
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  chartPlaceholderText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  chartFooterMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  chartAxisText: {
    color: '#CBD5E1',
    fontSize: 10.5,
    fontWeight: '700',
  },
  chartHintText: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '600',
  },
  noHistoryBox: {
    backgroundColor: '#080C14',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  noHistoryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  noHistoryTitle: {
    color: '#FBBF24',
    fontSize: 11.5,
    fontWeight: '800',
    flex: 1,
  },
  rangeBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  rangeEdgeText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
  },
  rangeTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E293B',
    position: 'relative',
    marginBottom: 10,
  },
  rangeThumb: {
    position: 'absolute',
    top: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  noHistorySub: {
    color: '#94A3B8',
    fontSize: 10.5,
    lineHeight: 15,
  },
  sectionHeading: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  metricBox: {
    width: '48.6%',
    backgroundColor: '#0D1527',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricVal: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  turnoverStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0D1527',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 18,
  },
  turnoverLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  turnoverLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
  },
  turnoverValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  whaleOverlapCard: {
    backgroundColor: '#0D1527',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  whaleMatchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  whaleMatchTitle: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
  },
  whaleChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131C31',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  whaleChipName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  whaleChipTag: {
    color: '#94A3B8',
    fontSize: 10.5,
    marginTop: 1,
  },
  whaleStakePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  whaleStakeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
  },
  noWhaleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  noWhaleText: {
    flex: 1,
    color: '#94A3B8',
    fontSize: 11.5,
    lineHeight: 17,
  },
  sessionsCard: {
    backgroundColor: '#0D1527',
    borderRadius: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  sessionDate: {
    color: '#CBD5E1',
    fontSize: 11.5,
    fontWeight: '700',
    width: 82,
  },
  sessionRange: {
    color: '#64748B',
    fontSize: 11,
    flex: 1,
  },
  sessionClose: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  complianceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  complianceText: {
    flex: 1,
    color: '#64748B',
    fontSize: 10.5,
    lineHeight: 15,
  },
});
