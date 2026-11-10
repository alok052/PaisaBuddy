import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Path,
  Line,
  Circle,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import Slider from '@react-native-community/slider';
import AppHeader from '../components/AppHeader';
import StockDetailModal from '../components/StockDetailModal';
import { colors } from '../theme/colors';
import { formatInrPrice, fetchLiveWhales } from '../services/dataService';
import { readJsonStore, writeJsonStore, STORE_KEYS } from '../services/localStore';
import { loadWatchlist } from '../services/watchlistService';
import { shareMarketMoodInsight } from '../services/shareService';
import {
  fetchMarketMoodSnapshot,
  buildSmartDipAllocator,
  sliceBenchmarkSeries,
  buildDualDmaChartGeometry,
  clamp,
} from '../services/marketMoodEngine';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = Math.max(250, SCREEN_WIDTH - 68);
const CHART_HEIGHT = 166;

const GAUGE_CX = 135;
const GAUGE_CY = 122;
const GAUGE_R = 96;

const GAUGE_SEGMENTS = [
  { start: 0, end: 24, color: '#10B981' },
  { start: 26, end: 44, color: '#22D3EE' },
  { start: 46, end: 64, color: '#38BDF8' },
  { start: 66, end: 80, color: '#F59E0B' },
  { start: 82, end: 100, color: '#EF4444' },
];

function scoreToPoint(score, radius = GAUGE_R) {
  const s = clamp(score, 0, 100);
  const theta = Math.PI * (1 - s / 100);
  return {
    x: Number((GAUGE_CX + radius * Math.cos(theta)).toFixed(2)),
    y: Number((GAUGE_CY - radius * Math.sin(theta)).toFixed(2)),
  };
}

function describeArcSegment(startScore, endScore, radius = GAUGE_R) {
  const p1 = scoreToPoint(startScore, radius);
  const p2 = scoreToPoint(endScore, radius);
  return `M ${p1.x} ${p1.y} A ${radius} ${radius} 0 0 1 ${p2.x} ${p2.y}`;
}

function formatShortDate(isoStr) {
  if (!isoStr || typeof isoStr !== 'string') return '—';
  const parts = isoStr.split('-');
  if (parts.length !== 3) return isoStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mIdx = parseInt(parts[1], 10) - 1;
  return `${parts[2]} ${months[mIdx] || parts[1]} ${parts[0].slice(-2)}`;
}

function getBenchmarkSimpleVerdict(bench) {
  if (!bench) return '';
  const ddAbs = Math.abs(bench.drawdownFrom52WHighPct || 0);
  const dist200 = bench.distFrom200DmaPct || 0;

  if (bench.key === 'GOLD') {
    if (dist200 <= -2) {
      return 'Gold thoda sasta hua hai — portfolio suraksha (hedge) ke liye add karne ka accha rate hai.';
    }
    if (dist200 >= 8) {
      return 'Gold kaafi upar chal raha hai — sirf 5–10% portfolio protection ke liye rakhein.';
    }
    return 'Gold stable level par hai — 10% portfolio safety shield rakhna balanced rahega.';
  }

  if ((bench.drawdownFrom52WHighPct || 0) <= -10 || dist200 <= -4) {
    return `Apne 1-saal ke High se ${ddAbs.toFixed(1)}% sasta chal raha hai — step-by-step buy aur extra SIP ke liye accha zone.`;
  }
  if (dist200 >= 6) {
    return `Apne 1-saal ke average se +${dist200}% upar chal raha hai — regular SIP chalne dein, ek saath bulk buy na karein.`;
  }
  return 'Apne fair range me trade kar raha hai — bina stress ke monthly SIP continue rakhein.';
}

export default function MarketMoodScreen({
  onOpenMenu,
  onOpenSipDoctor,
  onOpenStocks,
}) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [report, setReport] = useState(null);
  const [whalesList, setWhalesList] = useState([]);
  const [watchlist, setWatchlist] = useState([]);

  // Dual View Experience: Simple (beginner crystal clear) vs Pro (institutional quant depth)
  const [isProMode, setIsProMode] = useState(false);
  const [showSimpleProDrawer, setShowSimpleProDrawer] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [dipShowAll, setDipShowAll] = useState(false);

  // Interactive Chart State
  const [selectedBenchKey, setSelectedBenchKey] = useState('NIFTY50');
  const [chartRange, setChartRange] = useState('1Y');
  const [activeChartIdx, setActiveChartIdx] = useState(null);
  const lastHapticIdx = useRef(null);

  // Interactive Smart Dip Allocator State
  const [monthlyBudget, setMonthlyBudget] = useState(25000);
  const [riskProfile, setRiskProfile] = useState('BALANCED'); // BALANCED | DIP_HUNTER | CONSERVATIVE

  // Dip Scanner Tab State
  const [dipTab, setDipTab] = useState('WHALES'); // WHALES | LEADERS | WATCHLIST
  const [selectedStock, setSelectedStock] = useState(null);

  // Dip Alert Configuration
  const [alertConfig, setAlertConfig] = useState({
    enabled: false,
    thresholdScore: 40,
    preferredProMode: false,
  });

  const loadSnapshot = useCallback(async (forceRefresh = false) => {
    try {
      const [wl, whales, savedAlerts] = await Promise.all([
        loadWatchlist().catch(() => []),
        fetchLiveWhales().catch(() => []),
        readJsonStore(STORE_KEYS.DIP_ALERT_CONFIG, null).catch(() => null),
      ]);
      setWatchlist(wl);
      setWhalesList(whales);
      if (savedAlerts && typeof savedAlerts === 'object') {
        const nextPro = Boolean(savedAlerts.preferredProMode);
        setIsProMode(nextPro);
        setAlertConfig({
          enabled: Boolean(savedAlerts.enabled),
          thresholdScore: Number(savedAlerts.thresholdScore) || 40,
          preferredProMode: nextPro,
        });
      }

      const snap = await fetchMarketMoodSnapshot({
        forceRefresh,
        watchlist: wl,
        whalesList: whales,
      });
      setReport(snap);
    } catch (err) {
      console.log('MarketMood load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot(false);
  }, [loadSnapshot]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await loadSnapshot(true);
    setRefreshing(false);
  }, [loadSnapshot]);

  const handleToggleViewMode = async (nextPro) => {
    Haptics.selectionAsync();
    setIsProMode(nextPro);
    const nextCfg = { ...alertConfig, preferredProMode: nextPro };
    setAlertConfig(nextCfg);
    await writeJsonStore(STORE_KEYS.DIP_ALERT_CONFIG, nextCfg);
  };

  const handleUpdateAlertConfig = async (nextCfg) => {
    setAlertConfig(nextCfg);
    await writeJsonStore(STORE_KEYS.DIP_ALERT_CONFIG, nextCfg);
  };

  const handleTestDipAlert = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const score = report?.overallMoodScore ?? 50;
    const reg = report?.overallRegime?.label || 'Neutral';
    const triggered = score <= alertConfig.thresholdScore;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: triggered
            ? `Smart Dip Alert Triggered! Mood ${score}/100`
            : `Market Mood Check: ${score}/100 (${reg})`,
          body: triggered
            ? `India Market Mood dropped to ${score}/100 (below your <=${alertConfig.thresholdScore} target). Great time to review SIP top-ups.`
            : `Target threshold is <=${alertConfig.thresholdScore}. Current Nifty & Midcap gauges are tracked on PaisaBuddy.`,
          sound: true,
        },
        trigger: null,
      });
      Alert.alert(
        triggered ? 'Dip Alert Notification Sent' : 'Alert Target Checked',
        triggered
          ? `Mood abhi ${score}/100 hai (aapke <=${alertConfig.thresholdScore} target ke andar). Phone par notification bhej diya gaya hai!`
          : `Aaj ka Market Mood ${score}/100 hai. Jab bhi yeh <=${alertConfig.thresholdScore} par aayega aapko dip alert milega.`
      );
    } catch (err) {
      Alert.alert(
        'Alert Target Saved',
        `Aaj ka live Mood ${score}/100 hai. Aapka target <=${alertConfig.thresholdScore} device par save ho gaya hai.`
      );
    }
  };

  const selectedBenchmark = useMemo(() => {
    const list = report?.benchmarks || [];
    return list.find((b) => b.key === selectedBenchKey) || list[0] || null;
  }, [report, selectedBenchKey]);

  const slicedChartPoints = useMemo(
    () => sliceBenchmarkSeries(selectedBenchmark?.chartSeries || [], chartRange),
    [selectedBenchmark, chartRange]
  );

  const chartGeom = useMemo(
    () =>
      buildDualDmaChartGeometry(
        slicedChartPoints,
        selectedBenchmark?.dma200 || null,
        CHART_WIDTH,
        CHART_HEIGHT
      ),
    [slicedChartPoints, selectedBenchmark]
  );

  const allocator = useMemo(
    () => buildSmartDipAllocator(monthlyBudget, riskProfile, report?.benchmarks || []),
    [monthlyBudget, riskProfile, report]
  );

  const activeDipList = useMemo(() => {
    if (!report) return [];
    if (dipTab === 'WHALES') return report.whaleDips || [];
    if (dipTab === 'LEADERS') return report.leaderDips || [];
    return report.watchlistDips || [];
  }, [report, dipTab]);

  const handleTouchChart = (locationX) => {
    if (!slicedChartPoints || slicedChartPoints.length < 2) return;
    const ratio = clamp(locationX / CHART_WIDTH, 0, 1);
    const idx = Math.round(ratio * (slicedChartPoints.length - 1));
    if (lastHapticIdx.current !== idx) {
      lastHapticIdx.current = idx;
      Haptics.selectionAsync();
    }
    setActiveChartIdx(idx);
  };

  const touchedPt =
    activeChartIdx !== null && slicedChartPoints[activeChartIdx]
      ? slicedChartPoints[activeChartIdx]
      : null;
  const activeCoord =
    activeChartIdx !== null && chartGeom?.coords?.[activeChartIdx]
      ? chartGeom.coords[activeChartIdx]
      : null;

  const overallScore = report?.overallMoodScore ?? 50;
  const overallRegime = report?.overallRegime || {
    label: 'Neutral • Fair Zone',
    shortLabel: 'FAIR ZONE',
    simpleBadge: 'Fair Rate',
    simpleShortLabel: 'SAHI RATE • NORMAL',
    simpleHeadline: 'Balanced Market — Bina Tension Normal SIP Chalne Dein',
    simpleGuidance: 'Regular monthly SIP chalayein aur har saal step-up karte rahein.',
    sipAction: 'Normal SIP Chalao',
    lumpsumAction: '3-6 Month Split',
    marketZoneText: 'Balanced Price',
    color: '#38BDF8',
    bgColor: 'rgba(56, 189, 248, 0.16)',
    borderColor: 'rgba(56, 189, 248, 0.38)',
    icon: 'pulse',
    sipMultiplier: 1.0,
    stpAdvice: 'Steady SIP',
    headline: 'Loading live index mood...',
    guidance: '',
  };

  const gaugeDot = scoreToPoint(overallScore, GAUGE_R);
  const needleTip = scoreToPoint(overallScore, GAUGE_R - 18);

  const breadth = report?.marketBreadth || {};
  const salePct = Math.min(
    99,
    Math.round((breadth.pctInSmartDip || 0) + (breadth.pctDeepCorrection || 0))
  );
  const advCount = breadth.advances || 0;
  const decCount = breadth.declines || 0;
  const visibleDips = activeDipList.slice(0, dipShowAll ? 18 : 6);
  const showProChartSection = isProMode || showSimpleProDrawer;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary, '#38BDF8']}
        />
      }
    >
      <AppHeader
        subtitle="Market Mood & Smart Dip Radar"
        onMenuPress={onOpenMenu}
      />

      {/* Top Live Status & Utility Bar */}
      <View style={styles.topActionRow}>
        <View style={styles.liveDatePill}>
          <View style={[styles.liveDot, { backgroundColor: overallRegime.color }]} />
          <Text style={styles.liveDateText}>
            {report?.hasLiveIntradayTick
              ? `LIVE • ${report?.latestDataDate} • ${report?.liveTickTimeIst || 'IST'}`
              : report?.hasRealtimeOverlay
              ? `LIVE CLOSE • ${report?.latestDataDate}`
              : `NSE EOD • ${report?.latestDataDate || 'Syncing...'}`}
          </Text>
        </View>

        <View style={styles.topRightBtns}>
          <TouchableOpacity
            style={styles.miniActionBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowGuideModal(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="help-circle-outline" size={14} color="#FBBF24" />
            <Text style={[styles.miniActionText, { color: '#FBBF24' }]}>Guide</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.miniActionBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (report) shareMarketMoodInsight(report);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="share-social-outline" size={14} color="#38BDF8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.miniActionBtn}
            onPress={onRefresh}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={14} color="#10B981" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dual Experience Toggle: Simple (Beginner Easy) vs Pro Quant (Advanced Chart/RSI/13Y Backtest) */}
      <View style={styles.modeSwitchWrap}>
        <TouchableOpacity
          style={[styles.modeTab, !isProMode && styles.modeTabSimpleActive]}
          onPress={() => handleToggleViewMode(false)}
          activeOpacity={0.85}
        >
          <Ionicons
            name="sparkles"
            size={13}
            color={!isProMode ? '#10B981' : '#64748B'}
          />
          <Text style={[styles.modeTabTxt, !isProMode && styles.modeTabSimpleTxt]}>
            Simple View (Easy)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeTab, isProMode && styles.modeTabProActive]}
          onPress={() => handleToggleViewMode(true)}
          activeOpacity={0.85}
        >
          <Ionicons
            name="analytics-outline"
            size={14}
            color={isProMode ? '#38BDF8' : '#64748B'}
          />
          <Text style={[styles.modeTabTxt, isProMode && styles.modeTabProTxt]}>
            Pro Quant Lab
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !report ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingTitle}>Live Market Mood Check Ho Raha Hai...</Text>
          <Text style={styles.loadingSub}>
            Nifty 50, Midcap, Smallcap, Gold aur 3,500+ NSE stocks scan ho rahe hain
          </Text>
        </View>
      ) : (
        <>
          {/* HERO: MARKET MOOD SPEEDOMETER */}
          <LinearGradient
            colors={['#0D1525', '#090E18']}
            style={[styles.heroCard, { borderColor: overallRegime.borderColor }]}
          >
            <View style={styles.heroHeaderRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.heroKicker}>
                  {isProMode ? 'INDIA MARKET TEMPERATURE' : "AAJ KA MARKET MOOD"}
                </Text>
                <Text style={styles.heroTitle}>
                  {isProMode ? 'Live Mood & Valuation Index' : 'Market Sasta Hai Ya Mehenga?'}
                </Text>
              </View>
              <View
                style={[
                  styles.regimePill,
                  {
                    backgroundColor: overallRegime.bgColor,
                    borderColor: overallRegime.borderColor,
                  },
                ]}
              >
                <Ionicons name={overallRegime.icon} size={13} color={overallRegime.color} />
                <Text style={[styles.regimePillText, { color: overallRegime.color }]}>
                  {isProMode
                    ? overallRegime.shortLabel
                    : overallRegime.simpleBadge?.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Half-Circle Precision SVG Speedometer */}
            <View style={styles.gaugeWrapper}>
              <Svg width={270} height={144} viewBox="0 0 270 144">
                {GAUGE_SEGMENTS.map((seg, i) => (
                  <Path
                    key={i}
                    d={describeArcSegment(seg.start, seg.end, GAUGE_R)}
                    stroke={seg.color}
                    strokeWidth={16}
                    strokeLinecap="round"
                    fill="none"
                    strokeOpacity={0.88}
                  />
                ))}

                <Line
                  x1={GAUGE_CX}
                  y1={GAUGE_CY}
                  x2={needleTip.x}
                  y2={needleTip.y}
                  stroke={overallRegime.color}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeOpacity={0.75}
                />
                <Circle
                  cx={GAUGE_CX}
                  cy={GAUGE_CY}
                  r={5}
                  fill={overallRegime.color}
                  fillOpacity={0.35}
                />

                <Circle
                  cx={gaugeDot.x}
                  cy={gaugeDot.y}
                  r={11}
                  fill={overallRegime.color}
                  fillOpacity={0.28}
                />
                <Circle
                  cx={gaugeDot.x}
                  cy={gaugeDot.y}
                  r={6.5}
                  fill="#FFFFFF"
                  stroke={overallRegime.color}
                  strokeWidth={3}
                />
              </Svg>

              <View style={styles.gaugeCenterReadout}>
                <Text style={[styles.gaugeBigScore, { color: overallRegime.color }]}>
                  {overallScore}
                </Text>
                <Text style={styles.gaugeScoreSub}>
                  {isProMode ? '/ 100 COMPOSITE' : '/ 100 METER'}
                </Text>
              </View>

              <View style={styles.gaugeAxisLabels}>
                <Text style={[styles.gaugeAxisTxt, { color: '#10B981' }]}>
                  {isProMode ? '0 DIP BUY' : '0 SASTA'}
                </Text>
                <Text style={[styles.gaugeAxisTxt, { color: '#38BDF8' }]}>
                  {isProMode ? '50 FAIR' : '50 SAHI'}
                </Text>
                <Text style={[styles.gaugeAxisTxt, { color: '#EF4444' }]}>
                  {isProMode ? '100 HOT' : '100 GARAM'}
                </Text>
              </View>
            </View>

            {/* Clear Verdict Box */}
            <View style={styles.verdictBox}>
              <Text style={styles.verdictHeadline}>
                {isProMode ? overallRegime.headline : overallRegime.simpleHeadline}
              </Text>
              <Text style={styles.verdictGuidance}>
                {isProMode ? overallRegime.guidance : overallRegime.simpleGuidance}
              </Text>
            </View>

            {/* Quick Action 3-Pill Cheat-Sheet (Everyday Investor Answer in 1 Second) */}
            {!isProMode && (
              <View style={styles.quickActionGrid}>
                <View style={styles.quickActionCard}>
                  <Text style={styles.quickActionLbl}>MONTHLY SIP</Text>
                  <Text style={[styles.quickActionVal, { color: '#10B981' }]}>
                    {overallRegime.sipAction}
                  </Text>
                </View>
                <View style={styles.quickActionCard}>
                  <Text style={styles.quickActionLbl}>BADA LUMPSUM</Text>
                  <Text style={[styles.quickActionVal, { color: overallRegime.color }]}>
                    {overallRegime.lumpsumAction}
                  </Text>
                </View>
                <View style={styles.quickActionCard}>
                  <Text style={styles.quickActionLbl}>RATE LEVEL</Text>
                  <Text style={[styles.quickActionVal, { color: '#38BDF8' }]}>
                    {overallRegime.marketZoneText}
                  </Text>
                </View>
              </View>
            )}

            {/* Key Metrics Strip (Human-friendly in Simple Mode, Full Quant in Pro Mode) */}
            {isProMode ? (
              <View style={styles.telemetryGrid}>
                <View style={styles.telemetryTile}>
                  <Text style={styles.telemetryLabel}>NIFTY vs 200-DMA</Text>
                  <Text
                    style={[
                      styles.telemetryVal,
                      {
                        color:
                          (report?.niftyAnchor?.distFrom200DmaPct ?? 0) < 0
                            ? '#10B981'
                            : (report?.niftyAnchor?.distFrom200DmaPct ?? 0) > 7
                            ? '#F59E0B'
                            : '#38BDF8',
                      },
                    ]}
                  >
                    {(report?.niftyAnchor?.distFrom200DmaPct ?? 0) >= 0 ? '+' : ''}
                    {report?.niftyAnchor?.distFrom200DmaPct ?? 0}%
                  </Text>
                </View>

                <View style={styles.telemetryTile}>
                  <Text style={styles.telemetryLabel}>AVG PULLBACK</Text>
                  <Text style={[styles.telemetryVal, { color: '#22D3EE' }]}>
                    {breadth.avgDrawdownPct ?? -8}%
                  </Text>
                </View>

                <View style={styles.telemetryTile}>
                  <Text style={styles.telemetryLabel}>ADV / DEC RATIO</Text>
                  <Text
                    style={[
                      styles.telemetryVal,
                      { color: (breadth.advDeclineRatio ?? 1) >= 1 ? '#10B981' : '#EF4444' },
                    ]}
                  >
                    {breadth.advDeclineRatio ?? 1.0}x
                  </Text>
                </View>

                <View style={styles.telemetryTile}>
                  <Text style={styles.telemetryLabel}>SIP PACE</Text>
                  <Text style={[styles.telemetryVal, { color: overallRegime.color }]}>
                    {overallRegime.sipMultiplier}x
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.telemetryGrid}>
                <View style={styles.telemetryTile}>
                  <Text style={styles.telemetryLabel}>NIFTY 1Y AVG SE</Text>
                  <Text style={[styles.telemetryVal, { color: '#F59E0B' }]}>
                    {(report?.niftyAnchor?.distFrom200DmaPct ?? 0) >= 0 ? '+' : ''}
                    {report?.niftyAnchor?.distFrom200DmaPct ?? 0}%
                  </Text>
                </View>
                <View style={styles.telemetryTile}>
                  <Text style={styles.telemetryLabel}>STOCKS ON SALE</Text>
                  <Text style={[styles.telemetryVal, { color: '#10B981' }]}>
                    {salePct}% Shares
                  </Text>
                </View>
                <View style={styles.telemetryTile}>
                  <Text style={styles.telemetryLabel}>AAJ MARKET ME</Text>
                  <Text
                    style={[
                      styles.telemetryVal,
                      { color: advCount >= decCount ? '#10B981' : '#EF4444' },
                    ]}
                  >
                    {advCount}↑ / {decCount}↓
                  </Text>
                </View>
              </View>
            )}
          </LinearGradient>

          {/* SECTION 2: KAUNSA INDEX SASTA YA MEHENGA HAI? */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>
                  {isProMode ? 'Index & Sector Radar' : 'Kaunsa Sector Sasta Hai?'}
                </Text>
                <Text style={styles.sectionSub}>
                  {isProMode
                    ? 'Tap any benchmark to inspect 200-DMA, RSI & AMFI multi-year odds'
                    : 'Nifty, Midcap, Smallcap ya Gold par tap karke price level dekhein'}
                </Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.benchScroll}
              contentContainerStyle={{ paddingRight: 12 }}
            >
              {(report?.benchmarks || []).map((bench) => {
                const active = bench.key === selectedBenchmark?.key;
                const bColor = bench.regime?.color || '#38BDF8';
                const fillWidth = clamp(bench.moodScore ?? 50, 8, 100);
                return (
                  <TouchableOpacity
                    key={bench.key}
                    style={[
                      styles.benchCard,
                      active && {
                        borderColor: bColor,
                        backgroundColor: '#111B2E',
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedBenchKey(bench.key);
                      setActiveChartIdx(null);
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.benchCardTop}>
                      <Text style={styles.benchShortName} numberOfLines={1}>
                        {bench.shortLabel}
                      </Text>
                      <View style={[styles.benchScoreChip, { backgroundColor: `${bColor}22` }]}>
                        <Text style={[styles.benchScoreChipTxt, { color: bColor }]}>
                          {bench.moodScore}
                        </Text>
                      </View>
                    </View>

                    {/* Visual Heat Progress Bar */}
                    <View style={styles.miniHeatTrack}>
                      <View
                        style={[
                          styles.miniHeatFill,
                          { width: `${fillWidth}%`, backgroundColor: bColor },
                        ]}
                      />
                    </View>

                    <Text style={[styles.benchBadgeLabel, { color: bColor }]}>
                      {isProMode ? bench.etfSymbol : bench.regime?.simpleBadge}
                    </Text>
                    <Text style={styles.benchDdText}>
                      {bench.drawdownFrom52WHighPct <= -2
                        ? `${Math.abs(bench.drawdownFrom52WHighPct)}% off Peak`
                        : 'Near 1Y Peak'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {selectedBenchmark && (
              <View style={styles.benchDetailCard}>
                <View style={styles.benchDetailTop}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={styles.benchTitleRow}>
                      <Text style={styles.benchDetailTitle}>{selectedBenchmark.name}</Text>
                      <View
                        style={[
                          styles.benchSourceBadge,
                          {
                            borderColor: `${selectedBenchmark.regime?.color || '#38BDF8'}55`,
                            backgroundColor: selectedBenchmark.regime?.bgColor,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.benchSourceTxt,
                            { color: selectedBenchmark.regime?.color || '#38BDF8' },
                          ]}
                        >
                          {isProMode
                            ? `${selectedBenchmark.regime?.shortLabel} • ${selectedBenchmark.moodScore}`
                            : `${selectedBenchmark.regime?.simpleBadge} • ${selectedBenchmark.moodScore}/100`}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.benchDetailRole}>
                      ETF: {selectedBenchmark.etfSymbol} • {selectedBenchmark.role}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.benchPriceBig}>
                      {touchedPt
                        ? formatInrPrice(touchedPt.close)
                        : formatInrPrice(selectedBenchmark.latestClose)}
                    </Text>
                    <Text
                      style={[
                        styles.benchDayPct,
                        {
                          color:
                            (selectedBenchmark.dayChangePct ?? 0) >= 0 ? '#10B981' : '#EF4444',
                        },
                      ]}
                    >
                      {touchedPt
                        ? formatShortDate(touchedPt.date)
                        : `${selectedBenchmark.dayChangePct >= 0 ? '+' : ''}${
                            selectedBenchmark.dayChangePct
                          }% ${selectedBenchmark.isLiveIntraday ? 'LIVE' : 'EOD'}`}
                    </Text>
                  </View>
                </View>

                {/* Intuitive 1-Year Low to High Price Ruler */}
                <View style={styles.range52Box}>
                  <View style={styles.range52Header}>
                    <Text style={styles.range52Lbl}>
                      1Y Low: {formatInrPrice(selectedBenchmark.low52W)}
                    </Text>
                    <Text style={styles.range52Mid}>
                      {selectedBenchmark.range52WPositionPct}% of 1Y Range
                    </Text>
                    <Text style={styles.range52Lbl}>
                      1Y High: {formatInrPrice(selectedBenchmark.high52W)}
                    </Text>
                  </View>
                  <View style={styles.rangeTrack}>
                    <View
                      style={[
                        styles.rangeFill,
                        {
                          width: `${selectedBenchmark.range52WPositionPct}%`,
                          backgroundColor: selectedBenchmark.regime?.color || '#38BDF8',
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.rangeThumb,
                        {
                          left: `${clamp(selectedBenchmark.range52WPositionPct, 2, 96)}%`,
                          borderColor: selectedBenchmark.regime?.color || '#38BDF8',
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Plain 1-Line Investor Summary */}
                <View style={styles.simpleBenchHintBox}>
                  <Ionicons
                    name="information-circle-outline"
                    size={15}
                    color={selectedBenchmark.regime?.color || '#38BDF8'}
                  />
                  <Text style={styles.simpleBenchHintTxt}>
                    {getBenchmarkSimpleVerdict(selectedBenchmark)}
                  </Text>
                </View>

                {/* Optional Toggle inside Simple Mode so normal users can peek at Pro Charts anytime */}
                {!isProMode && (
                  <TouchableOpacity
                    style={styles.proDrawerToggleBtn}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setShowSimpleProDrawer((prev) => !prev);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="stats-chart" size={14} color="#38BDF8" />
                    <Text style={styles.proDrawerToggleTxt}>
                      {showSimpleProDrawer
                        ? 'Hide 200-DMA Chart & 13Y History'
                        : 'Open Pro Chart, 200-DMA & 13Y History'}
                    </Text>
                    <Ionicons
                      name={showSimpleProDrawer ? 'chevron-up' : 'chevron-down'}
                      size={15}
                      color="#38BDF8"
                    />
                  </TouchableOpacity>
                )}

                {/* Pro Quant Interactive Chart, Technicals & AMFI Multi-Year Edge */}
                {showProChartSection && (
                  <View style={styles.proLabDrawer}>
                    <View style={styles.chartMetaRow}>
                      <View style={styles.chartLegend}>
                        <View style={styles.legendItem}>
                          <View
                            style={[
                              styles.legendDot,
                              { backgroundColor: selectedBenchmark.regime?.color || '#10B981' },
                            ]}
                          />
                          <Text style={styles.legendText}>Price</Text>
                        </View>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                          <Text style={styles.legendText}>
                            200-DMA ({formatInrPrice(selectedBenchmark.dma200)})
                          </Text>
                        </View>
                      </View>

                      <View style={styles.rangeSwitchRow}>
                        {['3M', '6M', '1Y'].map((rk) => {
                          const active = chartRange === rk;
                          return (
                            <TouchableOpacity
                              key={rk}
                              style={[styles.rangeBtn, active && styles.rangeBtnActive]}
                              onPress={() => {
                                Haptics.selectionAsync();
                                setChartRange(rk);
                                setActiveChartIdx(null);
                              }}
                            >
                              <Text style={[styles.rangeBtnTxt, active && styles.rangeBtnTxtActive]}>
                                {rk}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    {chartGeom ? (
                      <View
                        style={styles.chartTouchBox}
                        onStartShouldSetResponder={() => true}
                        onMoveShouldSetResponder={() => true}
                        onResponderGrant={(e) => handleTouchChart(e.nativeEvent.locationX)}
                        onResponderMove={(e) => handleTouchChart(e.nativeEvent.locationX)}
                        onResponderRelease={() => setActiveChartIdx(null)}
                      >
                        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                          <Defs>
                            <SvgLinearGradient id="moodAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <Stop
                                offset="0%"
                                stopColor={selectedBenchmark.regime?.color || '#38BDF8'}
                                stopOpacity="0.34"
                              />
                              <Stop
                                offset="100%"
                                stopColor={selectedBenchmark.regime?.color || '#38BDF8'}
                                stopOpacity="0.01"
                              />
                            </SvgLinearGradient>
                          </Defs>

                          {chartGeom.dma200RefY !== null && (
                            <Line
                              x1={0}
                              y1={chartGeom.dma200RefY}
                              x2={CHART_WIDTH}
                              y2={chartGeom.dma200RefY}
                              stroke="#F59E0B"
                              strokeWidth={1}
                              strokeDasharray="4,4"
                              strokeOpacity={0.5}
                            />
                          )}

                          <Path d={chartGeom.areaPath} fill="url(#moodAreaGrad)" />
                          <Path
                            d={chartGeom.linePath}
                            stroke={selectedBenchmark.regime?.color || '#38BDF8'}
                            strokeWidth={2.4}
                            fill="none"
                          />

                          {chartGeom.dma200Path ? (
                            <Path
                              d={chartGeom.dma200Path}
                              stroke="#F59E0B"
                              strokeWidth={1.8}
                              strokeDasharray="5,3"
                              fill="none"
                            />
                          ) : null}

                          {activeCoord && (
                            <>
                              <Line
                                x1={activeCoord.x}
                                y1={0}
                                x2={activeCoord.x}
                                y2={CHART_HEIGHT}
                                stroke="rgba(255,255,255,0.4)"
                                strokeWidth={1}
                                strokeDasharray="3,3"
                              />
                              <Circle
                                cx={activeCoord.x}
                                cy={activeCoord.y}
                                r={5}
                                fill="#FFFFFF"
                                stroke={selectedBenchmark.regime?.color || '#38BDF8'}
                                strokeWidth={2.5}
                              />
                            </>
                          )}
                        </Svg>

                        <Text style={styles.scrubHint}>
                          {touchedPt
                            ? `${formatShortDate(touchedPt.date)} • Close ${formatInrPrice(touchedPt.close)} • 200-DMA ${formatInrPrice(
                                touchedPt.hasTrue200Dma ? touchedPt.dma200 : selectedBenchmark.dma200
                              )}`
                            : 'Chart par ungli drag karke pichhle rates check karein'}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.techRow}>
                      <View style={styles.techPill}>
                        <Text style={styles.techLbl}>vs 200-DMA</Text>
                        <Text
                          style={[
                            styles.techVal,
                            {
                              color:
                                selectedBenchmark.distFrom200DmaPct < 0 ? '#10B981' : '#F59E0B',
                            },
                          ]}
                        >
                          {selectedBenchmark.distFrom200DmaPct >= 0 ? '+' : ''}
                          {selectedBenchmark.distFrom200DmaPct}%
                        </Text>
                      </View>

                      <View style={styles.techPill}>
                        <Text style={styles.techLbl}>Wilder RSI-14</Text>
                        <Text
                          style={[
                            styles.techVal,
                            {
                              color:
                                selectedBenchmark.rsi14 <= 38
                                  ? '#10B981'
                                  : selectedBenchmark.rsi14 >= 68
                                  ? '#EF4444'
                                  : '#E2E8F0',
                            },
                          ]}
                        >
                          {selectedBenchmark.rsi14}
                        </Text>
                      </View>

                      <View style={styles.techPill}>
                        <Text style={styles.techLbl}>200-DMA Trend</Text>
                        <Text style={styles.techVal}>{selectedBenchmark.dma200Trend}</Text>
                      </View>

                      <View style={styles.techPill}>
                        <Text style={styles.techLbl}>1Y Volatility</Text>
                        <Text style={styles.techVal}>{selectedBenchmark.volatility1Y}%</Text>
                      </View>
                    </View>

                    {selectedBenchmark.historicalStats && (
                      <View style={styles.histBox}>
                        <View style={styles.histHeaderRow}>
                          <Ionicons name="stats-chart" size={14} color="#38BDF8" />
                          <Text style={styles.histTitle}>
                            AMFI 13-YEAR HISTORY ({selectedBenchmark.historicalStats.windowLabel} •{' '}
                            {selectedBenchmark.historicalStats.sampleDays} SIMILAR DAYS)
                          </Text>
                        </View>
                        <Text style={styles.histDesc}>
                          Pichhle saalon me jab {selectedBenchmark.shortLabel} isi level ke paas tha:
                        </Text>
                        <View style={styles.histStatsRow}>
                          <View style={styles.histStatCell}>
                            <Text style={styles.histStatLbl}>Profit Odds (1Y)</Text>
                            <Text style={[styles.histStatVal, { color: '#10B981' }]}>
                              {selectedBenchmark.historicalStats.winRatePct}%
                            </Text>
                          </View>
                          <View style={styles.histStatCell}>
                            <Text style={styles.histStatLbl}>Avg 1Y Return</Text>
                            <Text style={[styles.histStatVal, { color: '#38BDF8' }]}>
                              {selectedBenchmark.historicalStats.median1YFwdPct >= 0 ? '+' : ''}
                              {selectedBenchmark.historicalStats.median1YFwdPct}%
                            </Text>
                          </View>
                          <View style={styles.histStatCell}>
                            <Text style={styles.histStatLbl}>Worst 1Y Case</Text>
                            <Text
                              style={[
                                styles.histStatVal,
                                {
                                  color:
                                    selectedBenchmark.historicalStats.worst1YFwdPct < 0
                                      ? '#EF4444'
                                      : '#10B981',
                                },
                              ]}
                            >
                              {selectedBenchmark.historicalStats.worst1YFwdPct >= 0 ? '+' : ''}
                              {selectedBenchmark.historicalStats.worst1YFwdPct}%
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* SECTION 3: SMART BUDGET SPLIT CALCULATOR */}
          <View style={styles.sectionBlock}>
            <View style={styles.allocatorCard}>
              <View style={styles.allocatorHeader}>
                <View style={styles.allocatorIconBox}>
                  <Ionicons name="sparkles" size={17} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.allocatorTitle}>
                    {isProMode ? 'Smart Dip SIP & STP Planner' : 'Aaj Paise Kaha Lagayein?'}
                  </Text>
                  <Text style={styles.allocatorSub}>
                    {isProMode
                      ? 'Mood-weighted equity, gold & liquid STP reserve split'
                      : 'Apna monthly budget chunein — market ke hisab se best split dekhein'}
                  </Text>
                </View>
              </View>

              <View style={styles.budgetRow}>
                <Text style={styles.budgetLabel}>Monthly Budget</Text>
                <Text style={styles.budgetValue}>
                  ₹{monthlyBudget.toLocaleString('en-IN')}
                </Text>
              </View>

              <Slider
                style={{ width: '100%', height: 34 }}
                minimumValue={5000}
                maximumValue={150000}
                step={2500}
                value={monthlyBudget}
                onValueChange={(v) => setMonthlyBudget(Math.round(v))}
                minimumTrackTintColor="#10B981"
                maximumTrackTintColor="#1E293B"
                thumbTintColor="#10B981"
              />

              <View style={styles.presetRow}>
                {[10000, 25000, 50000, 100000].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={[
                      styles.presetChip,
                      monthlyBudget === amt && styles.presetChipActive,
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setMonthlyBudget(amt);
                    }}
                  >
                    <Text
                      style={[
                        styles.presetChipTxt,
                        monthlyBudget === amt && styles.presetChipTxtActive,
                      ]}
                    >
                      ₹{amt >= 100000 ? '1L' : `${amt / 1000}K`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.riskRow}>
                {[
                  { id: 'CONSERVATIVE', simple: 'Safe First', pro: 'Conservative' },
                  { id: 'BALANCED', simple: 'Balanced', pro: 'Balanced' },
                  { id: 'DIP_HUNTER', simple: 'High Growth', pro: 'Dip Hunter' },
                ].map((rp) => {
                  const active = riskProfile === rp.id;
                  return (
                    <TouchableOpacity
                      key={rp.id}
                      style={[styles.riskBtn, active && styles.riskBtnActive]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setRiskProfile(rp.id);
                      }}
                    >
                      <Text style={[styles.riskBtnTxt, active && styles.riskBtnTxtActive]}>
                        {isProMode ? rp.pro : rp.simple}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.allocBar}>
                {allocator.buckets.map((b) => (
                  <View
                    key={b.key}
                    style={{
                      width: `${b.pct}%`,
                      height: '100%',
                      backgroundColor: b.color,
                    }}
                  />
                ))}
              </View>

              <View style={styles.allocList}>
                {allocator.buckets.map((b) => (
                  <View key={b.key} style={styles.allocItemRow}>
                    <View style={styles.allocItemLeft}>
                      <View style={[styles.allocDot, { backgroundColor: b.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.allocLabel}>
                          {isProMode ? b.label : b.simpleLabel || b.label}
                        </Text>
                        <Text style={[styles.allocTag, { color: b.color }]}>
                          {isProMode ? b.tag : b.simpleTag || b.tag}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.allocRupee}>
                        ₹{b.amount.toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.allocPct}>{b.pct}%</Text>
                    </View>
                  </View>
                ))}
              </View>

              <Text style={styles.strategyNote}>
                {isProMode ? allocator.strategyNote : allocator.simpleStrategyNote}
              </Text>

              {onOpenSipDoctor && (
                <TouchableOpacity
                  style={styles.sipCtaBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onOpenSipDoctor();
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.sipCtaTxt}>SIP Doctor Me Future Return Check Karein</Text>
                  <Ionicons name="chevron-forward" size={16} color="#10B981" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* SECTION 4: SASTE MIL RAHE QUALITY STOCKS */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.sectionTitle}>
                  {isProMode ? 'Smart Dip Stock Radar' : 'Saste Mile Acche Stocks'}
                </Text>
                <Text style={styles.sectionSub}>
                  {isProMode
                    ? 'Corporate-split filtered • Verified 52W pullback, 200-DMA & RSI-14'
                    : 'Top NSE shares jo apne 1-Saal ke High se kaafi discount par hain'}
                </Text>
              </View>
              {onOpenStocks && (
                <TouchableOpacity
                  style={styles.dirLinkBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onOpenStocks();
                  }}
                >
                  <Text style={styles.dirLinkTxt}>All NSE</Text>
                  <Ionicons name="chevron-forward" size={13} color="#38BDF8" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.dipTabsRow}>
              {[
                {
                  id: 'WHALES',
                  label: isProMode
                    ? `Whale Dips (${report?.whaleDips?.length || 0})`
                    : `Big Investors (${report?.whaleDips?.length || 0})`,
                },
                {
                  id: 'LEADERS',
                  label: isProMode
                    ? `NSE Leaders (${report?.leaderDips?.length || 0})`
                    : `Top Stocks (${report?.leaderDips?.length || 0})`,
                },
                {
                  id: 'WATCHLIST',
                  label: isProMode
                    ? `Watchlist (${report?.watchlistDips?.length || 0})`
                    : `My Saved (${report?.watchlistDips?.length || 0})`,
                },
              ].map((t) => {
                const active = dipTab === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.dipTabBtn, active && styles.dipTabBtnActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setDipTab(t.id);
                      setDipShowAll(false);
                    }}
                  >
                    <Text
                      style={[styles.dipTabTxt, active && styles.dipTabTxtActive]}
                      numberOfLines={1}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {activeDipList.length === 0 ? (
              <View style={styles.emptyDipBox}>
                <Ionicons name="bookmark-outline" size={26} color="#64748B" />
                <Text style={styles.emptyDipTitle}>
                  {dipTab === 'WATCHLIST'
                    ? 'Aapki Watchlist Me Abhi Koi Stock Saved Nahi Hai'
                    : 'Is Category Me Koi Discount Stock Nahi Mila'}
                </Text>
                <Text style={styles.emptyDipSub}>
                  {dipTab === 'WATCHLIST'
                    ? 'Whales ya All NSE Stocks me kisi bhi share ko Bookmark karein, fir uska Live Discount yahan dikhega.'
                    : 'Fresh data lane ke liye page neeche khinch kar Refresh karein.'}
                </Text>
              </View>
            ) : (
              <View style={styles.dipList}>
                {visibleDips.map((item) => {
                  const isDayUp = (item.dayChangePct ?? 0) >= 0;
                  const offPeakPct =
                    item.drawdownPct !== null && item.drawdownPct < 0
                      ? Math.abs(Math.round(item.drawdownPct))
                      : 0;
                  const simpleBadgeText =
                    offPeakPct >= 5 ? `${offPeakPct}% OFF PEAK` : 'NEAR PEAK';
                  return (
                    <TouchableOpacity
                      key={item.symbol}
                      style={styles.dipStockCard}
                      activeOpacity={0.82}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedStock(item);
                      }}
                    >
                      <View style={styles.dipCardLeft}>
                        <View style={styles.dipSymRow}>
                          <Text style={styles.dipSym}>{item.symbol}</Text>
                          <View
                            style={[
                              styles.dipStatusPill,
                              { backgroundColor: `${item.dipColor}20` },
                            ]}
                          >
                            <Text style={[styles.dipStatusTxt, { color: item.dipColor }]}>
                              {isProMode ? item.dipBadge : simpleBadgeText}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.dipName} numberOfLines={1}>
                          {item.name}
                        </Text>

                        {isProMode && (
                          <View style={styles.dipMetaLine}>
                            <Text style={styles.dipMetaTxt}>
                              {item.distFrom200DmaPct !== null
                                ? `200-DMA: ${item.distFrom200DmaPct >= 0 ? '+' : ''}${item.distFrom200DmaPct}%`
                                : `52W H: ${formatInrPrice(item.high52w)}`}
                              {item.rsi14 !== null ? ` • RSI ${item.rsi14}` : ''}
                              {item.deliveryPct ? ` • Deliv ${item.deliveryPct}%` : ''}
                            </Text>
                          </View>
                        )}

                        {item.whaleCount > 0 && (
                          <View style={styles.whaleHolderRow}>
                            <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                            <Text style={styles.whaleHolderTxt} numberOfLines={1}>
                              {isProMode
                                ? `Held by ${item.whaleCount} Whale${item.whaleCount > 1 ? 's' : ''}: ${item.whaleNames.join(', ')}`
                                : `${item.whaleCount} Big Investor${item.whaleCount > 1 ? 's' : ''} Hold This`}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.dipCardRight}>
                        <Text style={styles.dipPrice}>{formatInrPrice(item.closePrice)}</Text>
                        {item.drawdownPct !== null && (
                          <Text style={[styles.dipDdVal, { color: item.dipColor }]}>
                            {item.drawdownPct}% {isProMode ? 'vs 52W' : 'from High'}
                          </Text>
                        )}
                        <Text
                          style={[
                            styles.dipDayMove,
                            { color: isDayUp ? '#10B981' : '#EF4444' },
                          ]}
                        >
                          {isDayUp ? '+' : ''}
                          {(item.dayChangePct ?? 0).toFixed(2)}% Today
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {activeDipList.length > 6 && (
                  <TouchableOpacity
                    style={styles.showMoreBtn}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setDipShowAll((prev) => !prev);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.showMoreTxt}>
                      {dipShowAll
                        ? 'Show Top 6 Only'
                        : `Show More Stocks (${activeDipList.length})`}
                    </Text>
                    <Ionicons
                      name={dipShowAll ? 'chevron-up' : 'chevron-down'}
                      size={15}
                      color="#10B981"
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* SECTION 5: SMART DIP NOTIFICATION THRESHOLD GUARD */}
          <View style={styles.sectionBlock}>
            <View style={styles.alertGuardCard}>
              <View style={styles.alertGuardTop}>
                <View style={styles.alertGuardLeft}>
                  <View style={styles.alertBellBox}>
                    <Ionicons name="notifications-outline" size={18} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertGuardTitle}>
                      {isProMode ? 'Smart Dip Alert Guard' : 'Market Girne Par Alert Paao'}
                    </Text>
                    <Text style={styles.alertGuardSub}>
                      {isProMode
                        ? 'Notify on-device whenever India Market Mood drops into your target zone'
                        : 'Jab bhi market sasta ho (Score target se neeche jaye), turant alert paayein'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={alertConfig.enabled}
                  onValueChange={(val) => {
                    Haptics.selectionAsync();
                    handleUpdateAlertConfig({ ...alertConfig, enabled: val });
                  }}
                  trackColor={{ false: '#1E293B', true: 'rgba(16, 185, 129, 0.45)' }}
                  thumbColor={alertConfig.enabled ? '#10B981' : '#94A3B8'}
                />
              </View>

              <View style={styles.thresholdRow}>
                {[
                  { score: 30, simple: 'Heavy Sale (≤30)', pro: 'Deep Dip (≤30)' },
                  { score: 40, simple: 'Accha Dip (≤40)', pro: 'Smart Dip (≤40)' },
                  { score: 50, simple: 'Normal Cool (≤50)', pro: 'Cool Off (≤50)' },
                ].map((opt) => {
                  const active = alertConfig.thresholdScore === opt.score;
                  return (
                    <TouchableOpacity
                      key={opt.score}
                      style={[
                        styles.thresholdChip,
                        active && styles.thresholdChipActive,
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        handleUpdateAlertConfig({
                          ...alertConfig,
                          enabled: true,
                          thresholdScore: opt.score,
                        });
                      }}
                    >
                      <Text
                        style={[
                          styles.thresholdChipTxt,
                          active && styles.thresholdChipTxtActive,
                        ]}
                      >
                        {isProMode ? opt.pro : opt.simple}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.testAlertBtn}
                onPress={handleTestDipAlert}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={16} color="#F59E0B" />
                <Text style={styles.testAlertTxt}>
                  {isProMode
                    ? 'Run Live Threshold Check & Send Preview Alert'
                    : 'Alert Check Karein & Test Notification Bhejein'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Transparent SEBI-Safe Educational Disclaimer */}
          <View style={styles.disclaimerCard}>
            <Ionicons name="information-circle-outline" size={16} color="#64748B" />
            <Text style={styles.disclaimerTxt}>
              Educational Data Only: Yeh screen NSE, Yahoo live quotes aur AMFI data se market valuation trend dikhati hai. Investment decision lene se pehle apna risk check zaroor karein.
            </Text>
          </View>
        </>
      )}

      {/* 10-Second Plain-Language Cheat-Sheet Modal */}
      <Modal
        visible={showGuideModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGuideModal(false)}
      >
        <View style={styles.guideBackdrop}>
          <View style={styles.guideSheet}>
            <View style={styles.guideHeader}>
              <Text style={styles.guideTitle}>Market Mood Kaise Samjhein?</Text>
              <TouchableOpacity
                onPress={() => setShowGuideModal(false)}
                style={styles.guideCloseBtn}
              >
                <Ionicons name="close" size={20} color="#CBD5E1" />
              </TouchableOpacity>
            </View>

            <View style={styles.guideList}>
              <View style={styles.guideRow}>
                <View style={[styles.guideDot, { backgroundColor: '#10B981' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.guideRowTitle}>0 se 44 (Green / Blue) = Market Sasta Hai</Text>
                  <Text style={styles.guideRowSub}>
                    Stocks discount pe mil rahe hain. Regular SIP chalayein aur extra dip buying add kar sakte hain.
                  </Text>
                </View>
              </View>

              <View style={styles.guideRow}>
                <View style={[styles.guideDot, { backgroundColor: '#38BDF8' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.guideRowTitle}>45 se 64 (Sky Blue) = Fair / Sahi Market</Text>
                  <Text style={styles.guideRowSub}>
                    Na sasta na mehenga. Bina tension monthly SIP continue rakhein.
                  </Text>
                </View>
              </View>

              <View style={styles.guideRow}>
                <View style={[styles.guideDot, { backgroundColor: '#F59E0B' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.guideRowTitle}>65 se 100 (Orange / Red) = Market Garam Hai</Text>
                  <Text style={styles.guideRowSub}>
                    Market tezi me upar hai. Purani SIP mat rokein, lekin ek saath bada lumpsum lagane ke bajay Safe Reserve me wait karein.
                  </Text>
                </View>
              </View>

              <View style={styles.guideRow}>
                <View style={[styles.guideDot, { backgroundColor: '#A855F7' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.guideRowTitle}>Simple View vs Pro Quant Lab</Text>
                  <Text style={styles.guideRowSub}>
                    Simple View aam investors ke liye easy Hinglish verdict deta hai. Pro Quant Lab advance charts (200-DMA, RSI-14, 13Y AMFI history) dikhata hai.
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.guideGotItBtn}
              onPress={() => setShowGuideModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.guideGotItTxt}>Samajh Aa Gaya ✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {selectedStock && (
        <StockDetailModal
          visible={!!selectedStock}
          stock={selectedStock}
          whalesList={whalesList}
          onWatchlistChange={(nextWl) => {
            setWatchlist(nextWl);
            loadSnapshot(false);
          }}
          onClose={() => setSelectedStock(null)}
        />
      )}

      <View style={{ height: 118 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07090E',
    paddingHorizontal: 12,
  },
  topActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 2,
  },
  liveDatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E1525',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  liveDateText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  topRightBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  miniActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0E1525',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
  },
  miniActionText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  modeSwitchWrap: {
    flexDirection: 'row',
    backgroundColor: '#0C1220',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 14,
    gap: 5,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  modeTabSimpleActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  modeTabProActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  modeTabTxt: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },
  modeTabSimpleTxt: {
    color: '#10B981',
  },
  modeTabProTxt: {
    color: '#38BDF8',
  },
  loadingCard: {
    backgroundColor: '#0D131F',
    borderRadius: 22,
    padding: 34,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 10,
  },
  loadingTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 14,
    textAlign: 'center',
  },
  loadingSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 17,
  },
  heroCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    marginBottom: 18,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  heroKicker: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  regimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  regimePillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  gaugeWrapper: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
    position: 'relative',
  },
  gaugeCenterReadout: {
    position: 'absolute',
    top: 66,
    alignItems: 'center',
  },
  gaugeBigScore: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 42,
  },
  gaugeScoreSub: {
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  gaugeAxisLabels: {
    width: 248,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -6,
  },
  gaugeAxisTxt: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  verdictBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 10,
  },
  verdictHeadline: {
    color: '#F8FAFC',
    fontSize: 13.5,
    fontWeight: '800',
    marginBottom: 4,
  },
  verdictGuidance: {
    color: '#94A3B8',
    fontSize: 11.5,
    lineHeight: 17,
  },
  quickActionGrid: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 10,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#0A101C',
    borderRadius: 11,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  quickActionLbl: {
    color: '#64748B',
    fontSize: 8.5,
    fontWeight: '800',
    marginBottom: 3,
  },
  quickActionVal: {
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  telemetryGrid: {
    flexDirection: 'row',
    gap: 7,
  },
  telemetryTile: {
    flex: 1,
    backgroundColor: '#0A0F1A',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  telemetryLabel: {
    color: '#64748B',
    fontSize: 8.5,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 3,
  },
  telemetryVal: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  sectionSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  benchScroll: {
    marginHorizontal: -4,
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  benchCard: {
    width: 122,
    backgroundColor: '#0D131F',
    borderRadius: 15,
    padding: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  benchCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  benchShortName: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
    marginRight: 4,
  },
  benchScoreChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 7,
  },
  benchScoreChipTxt: {
    fontSize: 10.5,
    fontWeight: '900',
  },
  miniHeatTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1E293B',
    overflow: 'hidden',
    marginBottom: 6,
  },
  miniHeatFill: {
    height: 4,
    borderRadius: 2,
  },
  benchBadgeLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
  benchDdText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  benchDetailCard: {
    backgroundColor: '#0D131F',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  benchDetailTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  benchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  benchDetailTitle: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '900',
  },
  benchSourceBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  benchSourceTxt: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  benchDetailRole: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  benchPriceBig: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  benchDayPct: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  range52Box: {
    marginTop: 4,
    marginBottom: 10,
  },
  range52Header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  range52Lbl: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  range52Mid: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '800',
  },
  rangeTrack: {
    height: 6,
    borderRadius: 4,
    backgroundColor: '#1E293B',
    position: 'relative',
    justifyContent: 'center',
  },
  rangeFill: {
    height: 6,
    borderRadius: 4,
  },
  rangeThumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    marginLeft: -6,
  },
  simpleBenchHintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: '#090E18',
    borderRadius: 11,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  simpleBenchHintTxt: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '600',
  },
  proDrawerToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.09)',
    borderRadius: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.24)',
  },
  proDrawerToggleTxt: {
    color: '#38BDF8',
    fontSize: 11.5,
    fontWeight: '800',
  },
  proLabDrawer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.07)',
  },
  chartMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  legendText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  rangeSwitchRow: {
    flexDirection: 'row',
    backgroundColor: '#080C15',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  rangeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rangeBtnActive: {
    backgroundColor: '#1E293B',
  },
  rangeBtnTxt: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
  },
  rangeBtnTxtActive: {
    color: '#FFFFFF',
  },
  chartTouchBox: {
    alignItems: 'center',
    marginVertical: 4,
  },
  scrubHint: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  techRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  techPill: {
    flex: 1,
    backgroundColor: '#0A0F1A',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  techLbl: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 2,
  },
  techVal: {
    color: '#E2E8F0',
    fontSize: 11.5,
    fontWeight: '800',
  },
  histBox: {
    marginTop: 12,
    backgroundColor: '#09121F',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.22)',
  },
  histHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  histTitle: {
    color: '#38BDF8',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.4,
    flex: 1,
  },
  histDesc: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 8,
  },
  histStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  histStatCell: {
    flex: 1,
    backgroundColor: '#0D1729',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  histStatLbl: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
  },
  histStatVal: {
    fontSize: 13.5,
    fontWeight: '900',
    marginTop: 2,
  },
  allocatorCard: {
    backgroundColor: '#0D131F',
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  allocatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  allocatorIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  allocatorTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  allocatorSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
  },
  budgetValue: {
    color: '#10B981',
    fontSize: 17,
    fontWeight: '900',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 10,
  },
  presetChip: {
    flex: 1,
    backgroundColor: '#0A0F1A',
    borderRadius: 9,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  presetChipActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
  },
  presetChipTxt: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
  },
  presetChipTxtActive: {
    color: '#10B981',
  },
  riskRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  riskBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#090D16',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  riskBtnActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
  },
  riskBtnTxt: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },
  riskBtnTxtActive: {
    color: '#38BDF8',
  },
  allocBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    marginBottom: 12,
  },
  allocList: {
    gap: 8,
    marginBottom: 10,
  },
  allocItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#090E18',
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  allocItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1,
    marginRight: 8,
  },
  allocDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  allocLabel: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  allocTag: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 1,
  },
  allocRupee: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  allocPct: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  strategyNote: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
  },
  sipCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 11,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  sipCtaTxt: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
  },
  dirLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.28)',
  },
  dirLinkTxt: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
  dipTabsRow: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 10,
  },
  dipTabBtn: {
    flex: 1,
    backgroundColor: '#0D131F',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  dipTabBtnActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
  },
  dipTabTxt: {
    color: '#94A3B8',
    fontSize: 10.5,
    fontWeight: '700',
  },
  dipTabTxtActive: {
    color: '#10B981',
    fontWeight: '800',
  },
  emptyDipBox: {
    backgroundColor: '#0D131F',
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  emptyDipTitle: {
    color: '#F8FAFC',
    fontSize: 13.5,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyDipSub: {
    color: '#94A3B8',
    fontSize: 11.5,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
  },
  dipList: {
    gap: 8,
  },
  dipStockCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0D131F',
    borderRadius: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  dipCardLeft: {
    flex: 1,
    marginRight: 10,
  },
  dipSymRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  dipSym: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '900',
  },
  dipStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  dipStatusTxt: {
    fontSize: 8.5,
    fontWeight: '900',
  },
  dipName: {
    color: '#CBD5E1',
    fontSize: 11.5,
    fontWeight: '500',
  },
  dipMetaLine: {
    marginTop: 3,
  },
  dipMetaTxt: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  whaleHolderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  whaleHolderTxt: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
    flex: 1,
  },
  dipCardRight: {
    alignItems: 'flex-end',
  },
  dipPrice: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  dipDdVal: {
    fontSize: 11,
    fontWeight: '900',
    marginTop: 2,
  },
  dipDayMove: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0C1422',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginTop: 2,
  },
  showMoreTxt: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
  },
  alertGuardCard: {
    backgroundColor: '#0D131F',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  alertGuardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  alertGuardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  alertBellBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertGuardTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  alertGuardSub: {
    color: '#94A3B8',
    fontSize: 10.5,
    marginTop: 1,
  },
  thresholdRow: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 10,
  },
  thresholdChip: {
    flex: 1,
    backgroundColor: '#090D16',
    borderRadius: 9,
    paddingVertical: 7,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  thresholdChipActive: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
  },
  thresholdChipTxt: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
  },
  thresholdChipTxtActive: {
    color: '#FBBF24',
  },
  testAlertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  testAlertTxt: {
    color: '#FBBF24',
    fontSize: 11.5,
    fontWeight: '800',
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#0A0E17',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  disclaimerTxt: {
    flex: 1,
    color: '#64748B',
    fontSize: 10,
    lineHeight: 15,
  },
  guideBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 6, 12, 0.8)',
    justifyContent: 'flex-end',
  },
  guideSheet: {
    backgroundColor: '#0D131F',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  guideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  guideTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  guideCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#162033',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideList: {
    gap: 14,
    marginBottom: 18,
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  guideDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  guideRowTitle: {
    color: '#F8FAFC',
    fontSize: 13.5,
    fontWeight: '800',
    marginBottom: 2,
  },
  guideRowSub: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
  },
  guideGotItBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  guideGotItTxt: {
    color: '#06110D',
    fontSize: 14,
    fontWeight: '900',
  },
});
