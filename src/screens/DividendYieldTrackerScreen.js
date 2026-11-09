import AppHeader from '../components/AppHeader';
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';

const SCORE_RING_SIZE = 120;
const ASSUMED_PRICE_CAGR = 0.085; // 8.5% conservative long-term capital appreciation
const TDS_SECTION_194_LIMIT = 10000; // ₹10,000 per company per FY (Budget 2025)

const DIVIDEND_STOCKS_DB = [
  {
    id: 'coalindia',
    name: 'Coal India Ltd',
    ticker: 'COALINDIA',
    sector: 'PSU • Mining',
    yieldPct: 6.7,
    quarters: ['Q3', 'Q4'],
    cadence: 'Semi-Annual Interims',
  },
  {
    id: 'embassy',
    name: 'Embassy Office REIT',
    ticker: 'EMBASSY',
    sector: 'Commercial REIT',
    yieldPct: 6.2,
    quarters: ['Q1', 'Q2', 'Q3', 'Q4'],
    cadence: 'Quarterly NDCF',
  },
  {
    id: 'mindspace',
    name: 'Mindspace Business REIT',
    ticker: 'MINDSPACE',
    sector: 'Commercial REIT',
    yieldPct: 5.9,
    quarters: ['Q1', 'Q2', 'Q3', 'Q4'],
    cadence: 'Quarterly NDCF',
  },
  {
    id: 'vedl',
    name: 'Vedanta Ltd',
    ticker: 'VEDL',
    sector: 'Metals • Mining',
    yieldPct: 9.8,
    quarters: ['Q2', 'Q4'],
    cadence: 'High Interim Payouts',
  },
  {
    id: 'ioc',
    name: 'Indian Oil Corp',
    ticker: 'IOC',
    sector: 'PSU • Energy',
    yieldPct: 5.6,
    quarters: ['Q2', 'Q4'],
    cadence: 'Interim & Final',
  },
  {
    id: 'itc',
    name: 'ITC Ltd',
    ticker: 'ITC',
    sector: 'FMCG Bluechip',
    yieldPct: 4.8,
    quarters: ['Q1', 'Q4'],
    cadence: 'Feb & Jun Payouts',
  },
  {
    id: 'ongc',
    name: 'ONGC Ltd',
    ticker: 'ONGC',
    sector: 'PSU • Oil & Gas',
    yieldPct: 4.9,
    quarters: ['Q3', 'Q4'],
    cadence: 'Nov & Feb Interims',
  },
  {
    id: 'castrol',
    name: 'Castrol India Ltd',
    ticker: 'CASTROLIND',
    sector: 'Cash-Rich MNC',
    yieldPct: 4.5,
    quarters: ['Q2', 'Q4'],
    cadence: 'Semi-Annual',
  },
  {
    id: 'pfc',
    name: 'Power Finance Corp',
    ticker: 'PFC',
    sector: 'PSU • NBFC',
    yieldPct: 3.9,
    quarters: ['Q2', 'Q3', 'Q4'],
    cadence: 'Steady Interims',
  },
  {
    id: 'powergrid',
    name: 'Power Grid Corp',
    ticker: 'POWERGRID',
    sector: 'PSU • Utilities',
    yieldPct: 3.8,
    quarters: ['Q3', 'Q4'],
    cadence: 'Regulated Payouts',
  },
  {
    id: 'hcltech',
    name: 'HCL Technologies',
    ticker: 'HCLTECH',
    sector: 'IT Bluechip',
    yieldPct: 3.7,
    quarters: ['Q1', 'Q2', 'Q3', 'Q4'],
    cadence: '4 Quarterly Payouts',
  },
  {
    id: 'tcs',
    name: 'Tata Consultancy Serv.',
    ticker: 'TCS',
    sector: 'IT Bluechip',
    yieldPct: 3.1,
    quarters: ['Q1', 'Q2', 'Q3', 'Q4'],
    cadence: 'Quarterly + Special',
  },
];

const BASKET_PRESETS = {
  PSU: {
    label: 'PSU Yield',
    fullName: 'High-Yield PSUs',
    icon: 'flash-outline',
    stockIds: ['coalindia', 'ioc', 'ongc', 'powergrid', 'pfc'],
  },
  BLUECHIP: {
    label: 'Bluechips',
    fullName: 'Dividend Aristocrats',
    icon: 'shield-checkmark-outline',
    stockIds: ['itc', 'hcltech', 'tcs', 'castrol'],
  },
  REIT: {
    label: 'REIT Mix',
    fullName: 'Quarterly Income REITs',
    icon: 'business-outline',
    stockIds: ['embassy', 'mindspace', 'hcltech', 'powergrid'],
  },
};

export default function DividendYieldTrackerScreen({ onOpenMenu }) {
  const [presetKey, setPresetKey] = useState('PSU');
  const [selectedIds, setSelectedIds] = useState(BASKET_PRESETS.PSU.stockIds);
  const [portfolioValue, setPortfolioValue] = useState(2500000); // ₹25L
  const [dividendYield, setDividendYield] = useState(5.0);
  const [horizonYears, setHorizonYears] = useState(10);
  const [strategy, setStrategy] = useState('DRIP'); // 'CASH' | 'DRIP'
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  // Animations matching SIP Doctor
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hasAnalyzed) {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 480,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [hasAnalyzed]);

  const selectedStocks = DIVIDEND_STOCKS_DB.filter((item) =>
    selectedIds.includes(item.id)
  );

  const calcBasketAvgYield = (ids) => {
    const matches = DIVIDEND_STOCKS_DB.filter((s) => ids.includes(s.id));
    if (matches.length === 0) return 4.5;
    const sum = matches.reduce((acc, s) => acc + s.yieldPct, 0);
    return Math.round((sum / matches.length) * 4) / 4;
  };

  // Dividend & DRIP Compounding Projection Engine
  const calculateTrackerMetrics = () => {
    const y = dividendYield / 100;
    const g = ASSUMED_PRICE_CAGR;
    const annualIncomeY1 = portfolioValue * y;
    const monthlyPassiveY1 = annualIncomeY1 / 12;

    // Without DRIP (Spend Dividends): Base shares grow at 8.5% price CAGR, dividends spent
    let cashEndCorpus = portfolioValue * Math.pow(1 + g, horizonYears);
    let cumulativeCashDividends = 0;
    for (let yr = 0; yr < horizonYears; yr++) {
      cumulativeCashDividends += portfolioValue * Math.pow(1 + g, yr) * y;
    }
    const cashCombinedWealth = cashEndCorpus + cumulativeCashDividends;

    // With DRIP (Reinvest Dividends): Compounds at price CAGR + yield
    const dripTotalRate = g + y;
    const dripEndCorpus = portfolioValue * Math.pow(1 + dripTotalRate, horizonYears);
    const dripExtraGain = Math.max(0, dripEndCorpus - cashCombinedWealth);
    const dripFinalYearAnnualIncome =
      portfolioValue * Math.pow(1 + dripTotalRate, Math.max(0, horizonYears - 1)) * y;

    // Quarterly Payout Schedule weighted across selected stocks' active payout quarters
    const quarterBuckets = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    const basketAvg =
      selectedStocks.length > 0
        ? selectedStocks.reduce((acc, item) => acc + item.yieldPct, 0) /
          selectedStocks.length
        : dividendYield;
    const scaleFactor = basketAvg > 0 ? dividendYield / basketAvg : 1;
    const perStockCapital =
      selectedStocks.length > 0 ? portfolioValue / selectedStocks.length : portfolioValue;

    const holdingsBreakdown = selectedStocks.map((stock) => {
      const effectiveYield = stock.yieldPct * scaleFactor;
      const estAnnualPayout = perStockCapital * (effectiveYield / 100);
      const perQuarterShare = estAnnualPayout / stock.quarters.length;
      stock.quarters.forEach((q) => {
        quarterBuckets[q] += perQuarterShare;
      });
      return {
        ...stock,
        effectiveYield,
        estAnnualPayout,
        exceedsTds: estAnnualPayout > TDS_SECTION_194_LIMIT,
      };
    });

    const tdsTriggerCount = holdingsBreakdown.filter((h) => h.exceedsTds).length;
    const totalHoldings = holdingsBreakdown.length;
    const totalQuartersActive = Object.values(quarterBuckets).filter((v) => v > 0).length;

    return {
      annualIncomeY1,
      monthlyPassiveY1,
      cashEndCorpus,
      cumulativeCashDividends,
      cashCombinedWealth,
      dripEndCorpus,
      dripExtraGain,
      dripFinalYearAnnualIncome,
      quarterBuckets,
      holdingsBreakdown,
      tdsTriggerCount,
      totalHoldings,
      totalQuartersActive,
      isHighYieldTrapRisk: dividendYield >= 8.5,
    };
  };

  const metrics = calculateTrackerMetrics();

  const formatCompact = (rupees) => {
    if (rupees >= 10000000) return `\u20B9${(rupees / 10000000).toFixed(2)} Cr`;
    if (rupees >= 100000) return `\u20B9${(rupees / 100000).toFixed(1)}L`;
    return `\u20B9${Math.round(rupees).toLocaleString('en-IN')}`;
  };

  const handleSelectPreset = (key) => {
    Haptics.selectionAsync();
    const preset = BASKET_PRESETS[key];
    setPresetKey(key);
    setSelectedIds(preset.stockIds);
    setDividendYield(calcBasketAvgYield(preset.stockIds));
  };

  const toggleStockId = (id) => {
    Haptics.selectionAsync();
    setPresetKey('CUSTOM');
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least 1 stock selected
        const next = prev.filter((item) => item !== id);
        setDividendYield(calcBasketAvgYield(next));
        return next;
      }
      const next = [...prev, id];
      setDividendYield(calcBasketAvgYield(next));
      return next;
    });
  };

  const handleAnalyze = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setHasAnalyzed(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 450);
  };

  const handleReset = () => {
    Haptics.selectionAsync();
    setHasAnalyzed(false);
  };

  // ============================================================
  // RENDER: INPUT MODE
  // ============================================================
  const renderInputMode = () => {
    const activePresetName =
      presetKey === 'CUSTOM'
        ? 'Custom Income Basket'
        : BASKET_PRESETS[presetKey].fullName;

    return (
      <View style={s.inputContainer}>
        {/* Preset Selector Row */}
        <View style={s.configSection}>
          <Text style={s.configLabel}>Income Basket Preset</Text>
          <View style={s.presetRow}>
            {Object.entries(BASKET_PRESETS).map(([key, item]) => {
              const isSelected = presetKey === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    s.presetBtn,
                    isSelected && s.presetBtnActive,
                  ]}
                  onPress={() => handleSelectPreset(key)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={item.icon}
                    size={13}
                    color={isSelected ? '#10B981' : '#64748B'}
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={[
                      s.presetBtnText,
                      isSelected && { color: '#10B981', fontWeight: '800' },
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Active Holdings Summary & Customize Trigger (Matches SIP Doctor Card) */}
        <View style={s.selectedBasketCard}>
          <View style={s.selectedBasketTop}>
            <View style={{ flex: 1 }}>
              <Text style={s.selectedBasketName} numberOfLines={1}>
                {activePresetName}
              </Text>
              <Text style={s.selectedBasketTickers} numberOfLines={1}>
                {selectedStocks.map((item) => item.ticker).join(' • ')}
              </Text>
            </View>
            <View style={s.stockCountBadge}>
              <Text style={s.stockCountText}>{selectedStocks.length} Stocks</Text>
            </View>
          </View>

          <View style={s.metricsStrip}>
            <View style={s.metricItem}>
              <Text style={s.metricLabel}>Yield</Text>
              <Text style={[s.metricValue, { color: '#10B981' }]}>
                {dividendYield.toFixed(2)}%
              </Text>
            </View>
            <View style={s.metricDivider} />
            <View style={s.metricItem}>
              <Text style={s.metricLabel}>Annual Est.</Text>
              <Text style={s.metricValue}>
                {formatCompact(metrics.annualIncomeY1)}
              </Text>
            </View>
            <View style={s.metricDivider} />
            <View style={s.metricItem}>
              <Text style={s.metricLabel}>Monthly Avg</Text>
              <Text style={[s.metricValue, { color: '#38BDF8' }]}>
                {formatCompact(metrics.monthlyPassiveY1)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={s.customizeBtn}
            onPress={() => {
              Haptics.selectionAsync();
              setPickerVisible(true);
            }}
            activeOpacity={0.75}
          >
            <Ionicons name="options-outline" size={14} color="#38BDF8" />
            <Text style={s.customizeBtnText}>Customize Stocks & REITs</Text>
          </TouchableOpacity>
        </View>

        {/* Slider 1: Equity Portfolio Value */}
        <View style={s.configSection}>
          <View style={s.configLabelRow}>
            <Text style={s.configLabel}>Portfolio Value</Text>
            <Text style={s.configValueDisplay}>
              {formatCompact(portfolioValue)}
            </Text>
          </View>
          <View style={s.sliderWrap}>
            <Slider
              style={s.sliderBar}
              minimumValue={100000}
              maximumValue={50000000}
              step={100000}
              value={portfolioValue}
              onValueChange={(val) => setPortfolioValue(Math.round(val))}
              minimumTrackTintColor="#38BDF8"
              maximumTrackTintColor="#1E293B"
              thumbTintColor="#38BDF8"
            />
          </View>
        </View>

        {/* Slider 2: Dividend Yield (%) */}
        <View style={s.configSection}>
          <View style={s.configLabelRow}>
            <Text style={s.configLabel}>Portfolio Dividend Yield</Text>
            <Text style={[s.configValueDisplay, { color: '#10B981' }]}>
              {dividendYield.toFixed(2)}%{' '}
              <Text style={s.configValueSub}>p.a.</Text>
            </Text>
          </View>
          <View style={s.sliderWrap}>
            <Slider
              style={s.sliderBar}
              minimumValue={1.0}
              maximumValue={12.0}
              step={0.25}
              value={dividendYield}
              onValueChange={(val) => setDividendYield(Math.round(val * 4) / 4)}
              minimumTrackTintColor="#10B981"
              maximumTrackTintColor="#1E293B"
              thumbTintColor="#10B981"
            />
          </View>
        </View>

        {/* Slider 3: Holding Horizon */}
        <View style={s.configSection}>
          <View style={s.configLabelRow}>
            <Text style={s.configLabel}>Holding Horizon</Text>
            <Text style={[s.configValueDisplay, { color: '#F59E0B' }]}>
              {horizonYears} {horizonYears === 1 ? 'Year' : 'Years'}
            </Text>
          </View>
          <View style={s.sliderWrap}>
            <Slider
              style={s.sliderBar}
              minimumValue={1}
              maximumValue={25}
              step={1}
              value={horizonYears}
              onValueChange={(val) => setHorizonYears(Math.round(val))}
              minimumTrackTintColor="#F59E0B"
              maximumTrackTintColor="#1E293B"
              thumbTintColor="#F59E0B"
            />
          </View>
        </View>

        {/* Payout Strategy Toggle */}
        <View style={s.configSection}>
          <Text style={s.configLabel}>Dividend Payout Strategy</Text>
          <View style={s.toggleRow}>
            <TouchableOpacity
              style={[
                s.toggleBtn,
                strategy === 'CASH' && s.toggleBtnActiveBlue,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setStrategy('CASH');
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="wallet-outline"
                size={13}
                color={strategy === 'CASH' ? '#38BDF8' : '#64748B'}
                style={{ marginRight: 5 }}
              />
              <Text
                style={[
                  s.toggleText,
                  strategy === 'CASH' && { color: '#38BDF8', fontWeight: '800' },
                ]}
              >
                Spend Cash
              </Text>
              {strategy === 'CASH' && (
                <Text style={s.badgeBlue}>Cashflow</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.toggleBtn,
                strategy === 'DRIP' && s.toggleBtnActiveEmerald,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setStrategy('DRIP');
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="refresh-circle-outline"
                size={14}
                color={strategy === 'DRIP' ? '#10B981' : '#64748B'}
                style={{ marginRight: 5 }}
              />
              <Text
                style={[
                  s.toggleText,
                  strategy === 'DRIP' && { color: '#10B981', fontWeight: '800' },
                ]}
              >
                Reinvest (DRIP)
              </Text>
              {strategy === 'DRIP' && (
                <Text style={s.badgeEmerald}>Snowball</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Primary Emerald CTA */}
        <TouchableOpacity
          style={s.ctaBtn}
          activeOpacity={0.85}
          onPress={handleAnalyze}
          disabled={isAnalyzing}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.ctaGrad}
          >
            {isAnalyzing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name="cash"
                  size={17}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={s.ctaText}>Analyze Dividend Cashflow</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  // ============================================================
  // RENDER: OUTPUT MODE
  // ============================================================
  const renderOutputMode = () => {
    const isDrip = strategy === 'DRIP';
    const heroColor = metrics.isHighYieldTrapRisk
      ? '#F59E0B'
      : isDrip
      ? '#10B981'
      : '#38BDF8';

    const quarterItems = [
      { id: 'Q1', months: 'Apr-Jun', amount: metrics.quarterBuckets.Q1 },
      { id: 'Q2', months: 'Jul-Sep', amount: metrics.quarterBuckets.Q2 },
      { id: 'Q3', months: 'Oct-Dec', amount: metrics.quarterBuckets.Q3 },
      { id: 'Q4', months: 'Jan-Mar', amount: metrics.quarterBuckets.Q4 },
    ];

    return (
      <Animated.View style={[s.outputContainer, { opacity: fadeAnim }]}>
        {/* Animated Hero Ring */}
        <Animated.View
          style={[
            s.scoreHero,
            {
              transform: [
                {
                  scale: scaleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.85, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={[s.scoreRing, { borderColor: heroColor + '40' }]}>
            <View style={[s.scoreRingInner, { borderColor: heroColor }]}>
              <Text style={[s.scoreNumber, { color: heroColor }]}>
                {dividendYield.toFixed(1)}%
              </Text>
              <Text style={[s.scoreOutOf, { color: heroColor + 'AA' }]}>
                Annual Yield
              </Text>
            </View>
          </View>

          <View style={[s.statusTag, { backgroundColor: heroColor + '15' }]}>
            <View style={[s.statusDot, { backgroundColor: heroColor }]} />
            <Text style={[s.statusTagText, { color: heroColor }]}>
              {metrics.isHighYieldTrapRisk
                ? 'Verify Cashflow Sustainability'
                : isDrip
                ? 'DRIP Snowball Active'
                : 'Steady Passive Cashflow'}
            </Text>
          </View>

          <Text style={s.resultHeadline}>
            {'\u20B9'}{Math.round(metrics.monthlyPassiveY1).toLocaleString('en-IN')}{' '}
            <Text style={s.resultHeadlineSub}>/ month avg</Text>
          </Text>
          <Text style={s.resultMeta}>
            {'\u20B9'}{Math.round(metrics.annualIncomeY1).toLocaleString('en-IN')}/yr Dividend
            {' \u2022 '}{formatCompact(portfolioValue)} Portfolio
            {' \u2022 '}{horizonYears}Y
          </Text>
        </Animated.View>

        {/* DRIP Snowball Banner OR Missed Opportunity Card */}
        {!isDrip ? (
          <View style={s.alertCard}>
            <View style={s.alertHeader}>
              <View style={s.alertBadge}>
                <Ionicons name="alert-circle" size={13} color="#F59E0B" style={{ marginRight: 4 }} />
                <Text style={s.alertBadgeText}>
                  {horizonYears === 1 ? 'YEAR-1 PASSIVE PAYOUT' : 'DRIP SNOWBALL OPPORTUNITY'}
                </Text>
              </View>
              <Text style={s.alertGainHighlight}>
                {horizonYears === 1
                  ? `${formatCompact(metrics.annualIncomeY1)}/yr`
                  : `+${formatCompact(metrics.dripExtraGain)}`}
              </Text>
            </View>
            <Text style={s.alertDesc}>
              {horizonYears === 1
                ? `In Year 1, you collect ${formatCompact(metrics.annualIncomeY1)} in cash payouts. Extend horizon to 5+ years to see DRIP compounding multiply wealth.`
                : (
                  <>
                    Spending dividends grows your portfolio to {formatCompact(metrics.cashCombinedWealth)} (incl. cash). Reinvesting them via DRIP compounds to{' '}
                    <Text style={{ color: '#10B981', fontWeight: '700' }}>
                      {formatCompact(metrics.dripEndCorpus)}
                    </Text>{' '}
                    in {horizonYears} years!
                  </>
                )}
            </Text>
          </View>
        ) : (
          <View style={s.dripSuccessCard}>
            <View style={s.dripIconWrap}>
              <Ionicons name="trending-up" size={20} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.dripLabel}>
                {horizonYears === 1 ? 'YEAR-1 REINVESTED DIVIDENDS' : 'DRIP COMPOUNDING ADVANTAGE'}
              </Text>
              <Text style={s.dripAmount}>
                {horizonYears === 1
                  ? `+${formatCompact(metrics.annualIncomeY1)}`
                  : `+${formatCompact(metrics.dripExtraGain)}`}
              </Text>
              <Text style={s.dripSub}>
                {horizonYears === 1
                  ? 'Reinvested into fresh shares to kick off Year-2 compounding'
                  : `Year-${horizonYears} passive income climbs to ${formatCompact(metrics.dripFinalYearAnnualIncome)}/yr`}
              </Text>
            </View>
          </View>
        )}

        {/* Indian Tax & Section 194 TDS Audit Card */}
        <View style={[s.verdictCard, { borderColor: heroColor + '25' }]}>
          <Text style={s.verdictTitle}>Section 194 Tax & Yield Audit</Text>
          <Text style={s.verdictNote}>
            {metrics.tdsTriggerCount > 0 ? (
              <>
                <Text style={{ color: '#F59E0B', fontWeight: '800' }}>
                  {metrics.tdsTriggerCount} of {metrics.totalHoldings} holdings
                </Text>{' '}
                cross the <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>{'\u20B9'}10,000/yr</Text> per-company TDS threshold (10% TDS with PAN). Dividends are taxed at your slab rate; Form 15G/15H avoids TDS if eligible.
              </>
            ) : (
              <>
                All {metrics.totalHoldings} holdings stay under the{' '}
                <Text style={{ color: '#10B981', fontWeight: '800' }}>{'\u20B9'}10,000/yr</Text> Section 194 TDS limit per company, so you receive{' '}
                <Text style={{ color: '#10B981', fontWeight: '800' }}>zero TDS deduction</Text> at payout.
              </>
            )}
          </Text>
        </View>

        {/* Cash Payout vs DRIP Snowball Side-by-Side Comparison */}
        <View style={s.compareCard}>
          <Text style={s.compareHeader}>
            CASH PAYOUT VS REINVEST DRIP ({horizonYears}Y @ 8.5% GROWTH)
          </Text>
          <View style={s.compareGrid}>
            {/* Left Col */}
            <View style={s.compareCol}>
              <Text style={s.compareColTag}>Spend Cash</Text>
              <Text style={s.compareColName}>Passive Wallet</Text>

              <View style={s.compareMetric}>
                <Text style={s.compareMetricLabel}>Cash Collected</Text>
                <Text style={s.compareMetricValue}>
                  {formatCompact(metrics.cumulativeCashDividends)}
                </Text>
              </View>
              <View style={s.compareMetric}>
                <Text style={s.compareMetricLabel}>Portfolio Value</Text>
                <Text style={s.compareMetricValue}>
                  {formatCompact(metrics.cashEndCorpus)}
                </Text>
              </View>
              <View style={s.compareTotal}>
                <Text style={s.compareTotalLabel}>Total Wealth</Text>
                <Text style={s.compareTotalValue}>
                  {formatCompact(metrics.cashCombinedWealth)}
                </Text>
              </View>
            </View>

            <View style={s.compareArrow}>
              <Ionicons name="arrow-forward" size={16} color="#10B981" />
            </View>

            {/* Right Col */}
            <View style={[s.compareCol, s.compareColHighlight]}>
              <Text style={[s.compareColTag, { color: '#10B981' }]}>
                With DRIP
              </Text>
              <Text style={s.compareColName}>Rebuy Shares</Text>

              <View style={s.compareMetric}>
                <Text style={s.compareMetricLabel}>Yr-{horizonYears} Income/Yr</Text>
                <Text style={[s.compareMetricValue, { color: '#10B981' }]}>
                  {formatCompact(metrics.dripFinalYearAnnualIncome)}
                </Text>
              </View>
              <View style={s.compareMetric}>
                <Text style={s.compareMetricLabel}>DRIP Bonus Gain</Text>
                <Text style={[s.compareMetricValue, { color: '#10B981' }]}>
                  +{formatCompact(metrics.dripExtraGain)}
                </Text>
              </View>
              <View style={s.compareTotal}>
                <Text style={[s.compareTotalLabel, { color: '#10B981' }]}>
                  Total Wealth
                </Text>
                <Text style={[s.compareTotalValue, { color: '#10B981' }]}>
                  {formatCompact(metrics.dripEndCorpus)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quarterly Cashflow Calendar Card */}
        <View style={s.quarterCard}>
          <View style={s.quarterHeader}>
            <Ionicons name="calendar-outline" size={17} color="#22D3EE" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.quarterTitle}>Quarterly Cashflow Schedule</Text>
              <Text style={s.quarterSub}>
                Payouts spread across {metrics.totalQuartersActive} of 4 FY quarters
              </Text>
            </View>
          </View>

          <View style={s.quarterRow}>
            {quarterItems.map((q) => (
              <View key={q.id} style={s.quarterItem}>
                <Text style={s.quarterId}>{q.id}</Text>
                <Text
                  style={[
                    s.quarterAmount,
                    q.amount > 0 && { color: '#22D3EE' },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatCompact(q.amount)}
                </Text>
                <Text style={s.quarterMonths}>{q.months}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Holdings Payout Breakdown */}
        <View style={s.holdingsCard}>
          <Text style={s.holdingsHeader}>
            ESTIMATED PAYOUT BY HOLDING (EQUAL WEIGHT)
          </Text>
          <View style={s.holdingsList}>
            {metrics.holdingsBreakdown.map((h) => (
              <View key={h.id} style={s.holdingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.holdingName} numberOfLines={1}>
                    {h.name}
                  </Text>
                  <Text style={s.holdingMeta} numberOfLines={1}>
                    {h.sector} • {h.cadence}
                  </Text>
                </View>
                <View style={s.holdingRight}>
                  <Text style={s.holdingPayout}>
                    {formatCompact(h.estAnnualPayout)}/yr
                  </Text>
                  <Text
                    style={[
                      s.holdingYieldChip,
                      h.exceedsTds && { color: '#F59E0B' },
                    ]}
                  >
                    {h.effectiveYield.toFixed(1)}% {h.exceedsTds ? '• TDS' : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Reset Button */}
        <TouchableOpacity
          style={s.resetBtn}
          activeOpacity={0.7}
          onPress={handleReset}
        >
          <Ionicons name="refresh" size={14} color="#64748B" style={{ marginRight: 6 }} />
          <Text style={s.resetBtnText}>Modify Portfolio Inputs</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // ============================================================
  // RENDER: STOCK PICKER MODAL
  // ============================================================
  const filteredStocks = DIVIDEND_STOCKS_DB.filter(
    (item) =>
      item.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
      item.ticker.toLowerCase().includes(pickerSearch.toLowerCase()) ||
      item.sector.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  const renderStockPickerModal = () => (
    <Modal
      visible={pickerVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setPickerVisible(false)}
    >
      <View style={s.modalOverlay}>
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />

          <View style={s.modalHeader}>
            <View>
              <Text style={s.modalTitle}>Dividend Basket</Text>
              <Text style={s.modalSubTitle}>
                {selectedIds.length} selected • Avg Yield {dividendYield.toFixed(2)}%
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setPickerVisible(false)}
              style={s.modalCloseBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <View style={s.modalSearchBox}>
            <Ionicons name="search" size={15} color="#64748B" style={{ marginRight: 8 }} />
            <TextInput
              style={s.modalSearchInput}
              placeholder="Search NSE stock, REIT, or sector..."
              placeholderTextColor="#64748B"
              value={pickerSearch}
              onChangeText={setPickerSearch}
            />
            {pickerSearch.length > 0 && (
              <TouchableOpacity onPress={() => setPickerSearch('')}>
                <Ionicons name="close-circle" size={15} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 410 }}>
            {filteredStocks.map((stock) => {
              const isSelected = selectedIds.includes(stock.id);
              return (
                <TouchableOpacity
                  key={stock.id}
                  style={[s.stockRow, isSelected && s.stockRowSelected]}
                  onPress={() => toggleStockId(stock.id)}
                  activeOpacity={0.75}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        s.stockRowName,
                        isSelected && { color: '#10B981' },
                      ]}
                      numberOfLines={1}
                    >
                      {stock.name} ({stock.ticker})
                    </Text>
                    <Text style={s.stockRowMeta}>
                      {stock.sector} • {stock.yieldPct.toFixed(1)}% Yield • {stock.quarters.join('/')}
                    </Text>
                  </View>
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                    size={20}
                    color={isSelected ? '#10B981' : '#475569'}
                  />
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 24 }} />
          </ScrollView>

          <TouchableOpacity
            style={s.modalDoneBtn}
            onPress={() => {
              Haptics.selectionAsync();
              setPickerVisible(false);
            }}
            activeOpacity={0.85}
          >
            <Text style={s.modalDoneText}>Apply Basket ({selectedIds.length})</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView
      style={s.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <AppHeader subtitle="Dividend Yield Tracker" onMenuPress={onOpenMenu} />
      {!hasAnalyzed ? renderInputMode() : renderOutputMode()}
      {renderStockPickerModal()}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07090E',
    paddingHorizontal: 16,
  },

  // ---- INPUT MODE ----
  inputContainer: {
    marginTop: 8,
    gap: 16,
  },
  configSection: {
    gap: 8,
  },
  configLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  configLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  configValueDisplay: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  configValueSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  sliderWrap: {
    marginVertical: 4,
  },
  sliderBar: {
    width: '100%',
    height: 40,
  },

  // Presets
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D111A',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  presetBtnActive: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  presetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },

  // Selected Basket Card (matches SIP Doctor Fund card)
  selectedBasketCard: {
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  selectedBasketTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  selectedBasketName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.2,
  },
  selectedBasketTickers: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 3,
  },
  stockCountBadge: {
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.25)',
  },
  stockCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#22D3EE',
  },
  metricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131926',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  customizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 6,
  },
  customizeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },

  // Payout Strategy Toggles
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D111A',
    borderRadius: 10,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  toggleBtnActiveBlue: {
    borderColor: 'rgba(56, 189, 248, 0.5)',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  toggleBtnActiveEmerald: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  toggleText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
  badgeBlue: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38BDF8',
    marginLeft: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  badgeEmerald: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
    marginLeft: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },

  // CTA Button
  ctaBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
  },
  ctaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ---- OUTPUT MODE ----
  outputContainer: {
    marginTop: 8,
    gap: 14,
  },
  scoreHero: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  scoreRing: {
    width: SCORE_RING_SIZE,
    height: SCORE_RING_SIZE,
    borderRadius: SCORE_RING_SIZE / 2,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  scoreRingInner: {
    width: SCORE_RING_SIZE - 16,
    height: SCORE_RING_SIZE - 16,
    borderRadius: (SCORE_RING_SIZE - 16) / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D111A',
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  scoreOutOf: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 0,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    marginBottom: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTagText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  resultHeadline: {
    fontSize: 23,
    fontWeight: '900',
    color: '#F8FAFC',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  resultHeadlineSub: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  resultMeta: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },

  // Alert Card
  alertCard: {
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  alertBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.4,
  },
  alertGainHighlight: {
    fontSize: 13,
    fontWeight: '900',
    color: '#10B981',
  },
  alertDesc: {
    fontSize: 11.5,
    color: '#94A3B8',
    lineHeight: 17,
  },

  // DRIP Success Banner
  dripSuccessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  dripIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dripLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.3,
  },
  dripAmount: {
    fontSize: 21,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 2,
  },
  dripSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },

  // Verdict Card
  verdictCard: {
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  verdictTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  verdictNote: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },

  // Compare Card
  compareCard: {
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  compareHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  compareGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compareCol: {
    flex: 1,
    backgroundColor: '#131926',
    borderRadius: 10,
    padding: 10,
  },
  compareColHighlight: {
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  compareColTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.3,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  compareColName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  compareMetric: {
    marginBottom: 5,
  },
  compareMetricLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },
  compareMetricValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  compareTotal: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 6,
    padding: 6,
    marginTop: 6,
  },
  compareTotalLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },
  compareTotalValue: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 1,
  },
  compareArrow: {
    paddingHorizontal: 8,
  },

  // Quarterly Schedule Card (matches SIP Doctor Milestones)
  quarterCard: {
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.2)',
  },
  quarterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  quarterTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  quarterSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  quarterRow: {
    flexDirection: 'row',
    backgroundColor: '#131926',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  quarterItem: {
    flex: 1,
    alignItems: 'center',
  },
  quarterId: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
  },
  quarterAmount: {
    fontSize: 13,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 3,
  },
  quarterMonths: {
    fontSize: 8.5,
    color: '#475569',
    marginTop: 2,
    fontWeight: '600',
  },

  // Holdings Payout Breakdown
  holdingsCard: {
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  holdingsHeader: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  holdingsList: {
    gap: 8,
  },
  holdingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131926',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 10,
    gap: 10,
  },
  holdingName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  holdingMeta: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  holdingRight: {
    alignItems: 'flex-end',
  },
  holdingPayout: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#10B981',
  },
  holdingYieldChip: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 2,
  },

  // Reset Button
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  // ---- STOCK PICKER MODAL ----
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0B0F17',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  modalSubTitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131926',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalSearchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13.5,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 2,
    gap: 10,
  },
  stockRowSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  stockRowName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  stockRowMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalDoneBtn: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
  },
  modalDoneText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
