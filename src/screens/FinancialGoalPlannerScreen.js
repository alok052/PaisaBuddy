import AppHeader from '../components/AppHeader';
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';

const SCORE_RING_SIZE = 120;

const GOAL_PRESETS = {
  RETIRE: {
    label: 'Retire',
    fullName: 'Retirement Corpus',
    icon: 'hourglass-outline',
    target: 25000000,
    years: 20,
    existing: 500000,
    rate: 12.5,
    inflation: 6.0,
  },
  HOME: {
    label: 'Home',
    fullName: 'Dream Home',
    icon: 'home-outline',
    target: 10000000,
    years: 8,
    existing: 800000,
    rate: 11.5,
    inflation: 7.0,
  },
  EDU: {
    label: 'Study',
    fullName: 'Higher Education',
    icon: 'school-outline',
    target: 5000000,
    years: 12,
    existing: 300000,
    rate: 12.0,
    inflation: 8.0,
  },
  FIRE: {
    label: 'FIRE',
    fullName: 'Financial Freedom',
    icon: 'flag-outline',
    target: 30000000,
    years: 15,
    existing: 1000000,
    rate: 13.0,
    inflation: 6.0,
  },
};

export default function FinancialGoalPlannerScreen({ onOpenMenu }) {
  const [goalType, setGoalType] = useState('HOME');
  const [targetToday, setTargetToday] = useState(10000000); // ₹1 Cr
  const [years, setYears] = useState(8);
  const [existingSavings, setExistingSavings] = useState(800000); // ₹8L
  const [expectedReturn, setExpectedReturn] = useState(11.5);
  const [strategy, setStrategy] = useState('STEP_10'); // 'FLAT' | 'STEP_10'
  const [isCalculating, setIsCalculating] = useState(false);
  const [hasPlanned, setHasPlanned] = useState(false);

  // Animations matching SIP Doctor
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hasPlanned) {
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
  }, [hasPlanned]);

  const currentPreset = GOAL_PRESETS[goalType];
  const inflationPct = currentPreset.inflation;

  // Inflation-Adjusted Future Target & Monthly SIP Inverse Compounding Engine
  const calculateGoalPlan = () => {
    const futureGoalCost = targetToday * Math.pow(1 + inflationPct / 100, years);
    const existingFutureValue = existingSavings * Math.pow(1 + expectedReturn / 100, years);
    const netCorpusNeeded = Math.max(0, futureGoalCost - existingFutureValue);
    const surplusIfFunded = Math.max(0, existingFutureValue - futureGoalCost);

    const mRate = expectedReturn / 100 / 12;
    const totalMonths = years * 12;

    let flatUnitFactor = 0;
    let step10UnitFactor = 0;
    let step10CashFactor = 0;

    for (let m = 1; m <= totalMonths; m++) {
      const yIdx = Math.floor((m - 1) / 12);
      const compPower = Math.pow(1 + mRate, totalMonths - m + 1);
      flatUnitFactor += compPower;

      const stepMult = Math.pow(1.1, yIdx);
      step10UnitFactor += stepMult * compPower;
      step10CashFactor += stepMult;
    }

    const flatMonthlySip = netCorpusNeeded > 0 ? netCorpusNeeded / flatUnitFactor : 0;
    const step10StartSip = netCorpusNeeded > 0 ? netCorpusNeeded / step10UnitFactor : 0;

    const flatTotalFreshCash = flatMonthlySip * totalMonths;
    const step10TotalFreshCash = step10StartSip * step10CashFactor;

    const selectedStartSip = strategy === 'STEP_10' ? step10StartSip : flatMonthlySip;
    const selectedTotalCash =
      existingSavings + (strategy === 'STEP_10' ? step10TotalFreshCash : flatTotalFreshCash);
    const marketWealthGain = Math.max(0, futureGoalCost - selectedTotalCash);

    const startDiscountPct =
      flatMonthlySip > 0
        ? Math.max(0, Math.round((1 - step10StartSip / flatMonthlySip) * 100))
        : 0;

    return {
      futureGoalCost,
      existingFutureValue,
      netCorpusNeeded,
      surplusIfFunded,
      isAlreadyFunded: netCorpusNeeded === 0,
      flatMonthlySip,
      step10StartSip,
      flatTotalOutOfPocket: existingSavings + flatTotalFreshCash,
      step10TotalOutOfPocket: existingSavings + step10TotalFreshCash,
      selectedStartSip,
      selectedTotalCash,
      marketWealthGain,
      startDiscountPct,
      inflationMultiplier: futureGoalCost / targetToday,
    };
  };

  const plan = calculateGoalPlan();

  const getRecommendedMix = (yrs) => {
    if (yrs <= 3) {
      return [
        { label: 'Arbitrage / Liquid', pct: '70%', accent: '#38BDF8' },
        { label: 'Short Debt', pct: '30%', accent: '#10B981' },
      ];
    }
    if (yrs <= 7) {
      return [
        { label: 'Large / Flexi Cap', pct: '55%', accent: '#10B981' },
        { label: 'Short Term Debt', pct: '35%', accent: '#38BDF8' },
        { label: 'Gold SGB/ETF', pct: '10%', accent: '#F59E0B' },
      ];
    }
    return [
      { label: 'Flexi / Large Cap', pct: '50%', accent: '#10B981' },
      { label: 'Mid & Small Cap', pct: '35%', accent: '#38BDF8' },
      { label: 'Gold / Debt Hedge', pct: '15%', accent: '#F59E0B' },
    ];
  };

  const formatCompact = (rupees) => {
    if (rupees >= 10000000) return `\u20B9${(rupees / 10000000).toFixed(2)} Cr`;
    if (rupees >= 100000) return `\u20B9${(rupees / 100000).toFixed(1)}L`;
    return `\u20B9${Math.round(rupees).toLocaleString('en-IN')}`;
  };

  const handleSelectGoalPreset = (key) => {
    Haptics.selectionAsync();
    const p = GOAL_PRESETS[key];
    setGoalType(key);
    setTargetToday(p.target);
    setYears(p.years);
    setExistingSavings(p.existing);
    setExpectedReturn(p.rate);
  };

  const handleCalculate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsCalculating(true);
    setTimeout(() => {
      setIsCalculating(false);
      setHasPlanned(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 450);
  };

  const handleReset = () => {
    Haptics.selectionAsync();
    setHasPlanned(false);
  };

  // ============================================================
  // RENDER: INPUT MODE
  // ============================================================
  const renderInputMode = () => (
    <View style={s.inputContainer}>
      {/* Goal Category Selector (Clean 4-pill Grid) */}
      <View style={s.configSection}>
        <View style={s.configLabelRow}>
          <Text style={s.configLabel}>Life Goal Type</Text>
          <Text style={s.inflationNote}>
            Est. {inflationPct.toFixed(1)}% Inflation
          </Text>
        </View>
        <View style={s.goalGrid}>
          {Object.entries(GOAL_PRESETS).map(([key, item]) => {
            const isSelected = goalType === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  s.goalPill,
                  isSelected && s.goalPillActive,
                ]}
                onPress={() => handleSelectGoalPreset(key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={item.icon}
                  size={14}
                  color={isSelected ? '#10B981' : '#64748B'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    s.goalPillText,
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

      {/* Slider 1: Goal Cost (Today's Value) */}
      <View style={s.configSection}>
        <View style={s.configLabelRow}>
          <Text style={s.configLabel}>Goal Cost (Today's Value)</Text>
          <Text style={s.configValueDisplay}>
            {formatCompact(targetToday)}
          </Text>
        </View>
        <View style={s.sliderWrap}>
          <Slider
            style={s.sliderBar}
            minimumValue={500000}
            maximumValue={50000000}
            step={500000}
            value={targetToday}
            onValueChange={(val) => setTargetToday(Math.round(val))}
            minimumTrackTintColor="#38BDF8"
            maximumTrackTintColor="#1E293B"
            thumbTintColor="#38BDF8"
          />
        </View>
      </View>

      {/* Slider 2: Time Horizon */}
      <View style={s.configSection}>
        <View style={s.configLabelRow}>
          <Text style={s.configLabel}>Time Horizon</Text>
          <Text style={[s.configValueDisplay, { color: '#10B981' }]}>
            {years} {years === 1 ? 'Year' : 'Years'}
          </Text>
        </View>
        <View style={s.sliderWrap}>
          <Slider
            style={s.sliderBar}
            minimumValue={2}
            maximumValue={35}
            step={1}
            value={years}
            onValueChange={(val) => setYears(Math.round(val))}
            minimumTrackTintColor="#10B981"
            maximumTrackTintColor="#1E293B"
            thumbTintColor="#10B981"
          />
        </View>
      </View>

      {/* Slider 3: Current Savings Allocated */}
      <View style={s.configSection}>
        <View style={s.configLabelRow}>
          <Text style={s.configLabel}>Current Savings Allocated</Text>
          <Text style={[s.configValueDisplay, { color: '#F59E0B' }]}>
            {'\u20B9'}{existingSavings.toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={s.sliderWrap}>
          <Slider
            style={s.sliderBar}
            minimumValue={0}
            maximumValue={10000000}
            step={50000}
            value={existingSavings}
            onValueChange={(val) => setExistingSavings(Math.round(val))}
            minimumTrackTintColor="#F59E0B"
            maximumTrackTintColor="#1E293B"
            thumbTintColor="#F59E0B"
          />
        </View>
      </View>

      {/* Slider 4: Expected Return (CAGR) */}
      <View style={s.configSection}>
        <View style={s.configLabelRow}>
          <Text style={s.configLabel}>Expected Return (CAGR)</Text>
          <Text style={[s.configValueDisplay, { color: '#38BDF8' }]}>
            {expectedReturn.toFixed(1)}%{' '}
            <Text style={s.configValueSub}>p.a.</Text>
          </Text>
        </View>
        <View style={s.sliderWrap}>
          <Slider
            style={s.sliderBar}
            minimumValue={7}
            maximumValue={18}
            step={0.5}
            value={expectedReturn}
            onValueChange={(val) => setExpectedReturn(Math.round(val * 2) / 2)}
            minimumTrackTintColor="#38BDF8"
            maximumTrackTintColor="#1E293B"
            thumbTintColor="#38BDF8"
          />
        </View>
      </View>

      {/* Funding Style Toggle (Flat SIP vs +10% Step-Up) */}
      <View style={s.configSection}>
        <Text style={s.configLabel}>SIP Funding Strategy</Text>
        <View style={s.toggleRow}>
          <TouchableOpacity
            style={[
              s.toggleBtn,
              strategy === 'FLAT' && s.toggleBtnActiveBlue,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setStrategy('FLAT');
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="remove-circle-outline"
              size={13}
              color={strategy === 'FLAT' ? '#38BDF8' : '#64748B'}
              style={{ marginRight: 5 }}
            />
            <Text
              style={[
                s.toggleText,
                strategy === 'FLAT' && { color: '#38BDF8', fontWeight: '800' },
              ]}
              numberOfLines={1}
            >
              Flat SIP
            </Text>
            {strategy === 'FLAT' && (
              <Text style={s.badgeBlue}>Fixed</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              s.toggleBtn,
              strategy === 'STEP_10' && s.toggleBtnActiveEmerald,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setStrategy('STEP_10');
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="flash"
              size={13}
              color={strategy === 'STEP_10' ? '#10B981' : '#64748B'}
              style={{ marginRight: 5 }}
            />
            <Text
              style={[
                s.toggleText,
                strategy === 'STEP_10' && { color: '#10B981', fontWeight: '800' },
              ]}
              numberOfLines={1}
            >
              +10% Step-Up
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Primary Emerald CTA */}
      <TouchableOpacity
        style={s.ctaBtn}
        activeOpacity={0.85}
        onPress={handleCalculate}
        disabled={isCalculating}
      >
        <LinearGradient
          colors={['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.ctaGrad}
        >
          {isCalculating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name="flag"
                size={17}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={s.ctaText}>Build Goal Blueprint</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  // ============================================================
  // RENDER: OUTPUT MODE
  // ============================================================
  const renderOutputMode = () => {
    const heroColor = plan.isAlreadyFunded
      ? '#10B981'
      : strategy === 'STEP_10'
      ? '#10B981'
      : '#38BDF8';

    const assetMix = getRecommendedMix(years);
    const capitalPct =
      plan.futureGoalCost > 0
        ? Math.min(95, Math.max(5, Math.round((plan.selectedTotalCash / plan.futureGoalCost) * 100)))
        : 50;
    const returnsPct = 100 - capitalPct;

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
                {plan.isAlreadyFunded
                  ? '100%'
                  : strategy === 'STEP_10'
                  ? `-${plan.startDiscountPct}%`
                  : `${plan.inflationMultiplier.toFixed(1)}x`}
              </Text>
              <Text style={[s.scoreOutOf, { color: heroColor + 'AA' }]}>
                {plan.isAlreadyFunded
                  ? 'Funded'
                  : strategy === 'STEP_10'
                  ? 'Lower Start'
                  : 'Inflation'}
              </Text>
            </View>
          </View>

          <View style={[s.statusTag, { backgroundColor: heroColor + '15' }]}>
            <View style={[s.statusDot, { backgroundColor: heroColor }]} />
            <Text style={[s.statusTagText, { color: heroColor }]}>
              {plan.isAlreadyFunded
                ? 'Existing Savings Cover Goal'
                : `${currentPreset.fullName} Plan`}
            </Text>
          </View>

          <Text style={s.resultHeadline}>
            {plan.isAlreadyFunded
              ? '₹0 Monthly SIP Needed'
              : `\u20B9${Math.round(plan.selectedStartSip).toLocaleString('en-IN')} / month`}
          </Text>
          <Text style={s.resultMeta}>
            {strategy === 'STEP_10' && !plan.isAlreadyFunded ? 'Year-1 Starting SIP • ' : ''}
            Future Target: {formatCompact(plan.futureGoalCost)}
            {' \u2022 '}{years}Y @ {expectedReturn.toFixed(1)}%
          </Text>
        </Animated.View>

        {/* Inflation Reality Card */}
        <View style={s.inflationCard}>
          <View style={s.inflationIconWrap}>
            <Ionicons name="trending-up" size={20} color="#F59E0B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.inflationLabel}>INFLATION-ADJUSTED TARGET ({inflationPct.toFixed(0)}% P.A.)</Text>
            <Text style={s.inflationAmount}>{formatCompact(plan.futureGoalCost)}</Text>
            <Text style={s.inflationSub}>
              {formatCompact(targetToday)} today grows to {formatCompact(plan.futureGoalCost)} in {years} years
            </Text>
          </View>
        </View>

        {/* Verdict Card */}
        <View style={[s.verdictCard, { borderColor: heroColor + '25' }]}>
          <Text style={s.verdictTitle}>
            {plan.isAlreadyFunded ? 'Surplus Achieved' : 'Execution Blueprint'}
          </Text>
          <Text style={s.verdictNote}>
            {plan.isAlreadyFunded ? (
              `Your existing ${formatCompact(existingSavings)} compounds to ${formatCompact(plan.existingFutureValue)} in ${years} years, comfortably beating the ${formatCompact(plan.futureGoalCost)} target.`
            ) : (
              <>
                Your current {formatCompact(existingSavings)} grows to{' '}
                <Text style={{ color: '#F8FAFC', fontWeight: '800' }}>
                  {formatCompact(plan.existingFutureValue)}
                </Text>
                . To bridge the remaining{' '}
                <Text style={{ color: '#10B981', fontWeight: '800' }}>
                  {formatCompact(plan.netCorpusNeeded)}
                </Text>
                , starting at{' '}
                <Text style={{ color: '#10B981', fontWeight: '800' }}>
                  {'\u20B9'}{Math.round(plan.selectedStartSip).toLocaleString('en-IN')}/mo
                </Text>{' '}
                keeps you 100% on track.
              </>
            )}
          </Text>
        </View>

        {/* Flat SIP vs +10% Step-Up Comparison */}
        {!plan.isAlreadyFunded && (
          <View style={s.compareCard}>
            <Text style={s.compareHeader}>FLAT SIP VS +10% STEP-UP START</Text>
            <View style={s.compareGrid}>
              <View style={s.compareCol}>
                <Text style={s.compareColTag}>Flat SIP</Text>
                <Text style={s.compareColName}>Same EMI Every Yr</Text>

                <View style={s.compareMetric}>
                  <Text style={s.compareMetricLabel}>Year-1 SIP</Text>
                  <Text style={s.compareMetricValue}>
                    {'\u20B9'}{Math.round(plan.flatMonthlySip).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={s.compareMetric}>
                  <Text style={s.compareMetricLabel}>Total Cash Put In</Text>
                  <Text style={s.compareMetricValue}>
                    {formatCompact(plan.flatTotalOutOfPocket)}
                  </Text>
                </View>
                <View style={s.compareTotal}>
                  <Text style={s.compareTotalLabel}>Goal Reached</Text>
                  <Text style={s.compareTotalValue}>
                    {formatCompact(plan.futureGoalCost)}
                  </Text>
                </View>
              </View>

              <View style={s.compareArrow}>
                <Ionicons name="arrow-forward" size={16} color="#10B981" />
              </View>

              <View style={[s.compareCol, s.compareColHighlight]}>
                <Text style={[s.compareColTag, { color: '#10B981' }]}>
                  +10% Step-Up
                </Text>
                <Text style={s.compareColName}>Scales With Income</Text>

                <View style={s.compareMetric}>
                  <Text style={s.compareMetricLabel}>Year-1 Start SIP</Text>
                  <Text style={[s.compareMetricValue, { color: '#10B981' }]}>
                    {'\u20B9'}{Math.round(plan.step10StartSip).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={s.compareMetric}>
                  <Text style={s.compareMetricLabel}>Yr-1 Burden Cut</Text>
                  <Text style={[s.compareMetricValue, { color: '#10B981' }]}>
                    {plan.startDiscountPct}% Lower
                  </Text>
                </View>
                <View style={s.compareTotal}>
                  <Text style={[s.compareTotalLabel, { color: '#10B981' }]}>
                    Goal Reached
                  </Text>
                  <Text style={[s.compareTotalValue, { color: '#10B981' }]}>
                    {formatCompact(plan.futureGoalCost)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Funding Split Bar + Recommended Allocation */}
        <View style={s.splitCard}>
          <View style={s.splitHeaderRow}>
            <Text style={s.splitHeaderTitle}>Your Money vs Compounding</Text>
            <Text style={s.splitHeaderRatio}>
              {capitalPct}% / {returnsPct}%
            </Text>
          </View>
          <View style={s.splitBarBg}>
            <View style={[s.splitBarCapital, { width: `${capitalPct}%` }]} />
          </View>
          <View style={s.splitLegendRow}>
            <View style={s.splitLegendItem}>
              <View style={[s.legendDot, { backgroundColor: '#38BDF8' }]} />
              <Text style={s.legendLabel}>Your Cash: {formatCompact(plan.selectedTotalCash)}</Text>
            </View>
            <View style={s.splitLegendItem}>
              <View style={[s.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={s.legendLabel}>Returns: {formatCompact(plan.marketWealthGain)}</Text>
            </View>
          </View>
        </View>

        {/* Recommended Asset Allocation Strip */}
        <View style={s.mixCard}>
          <Text style={s.mixHeader}>SUGGESTED ASSET MIX ({years}Y HORIZON)</Text>
          <View style={s.mixRow}>
            {assetMix.map((m) => (
              <View key={m.label} style={s.mixItem}>
                <Text style={[s.mixPct, { color: m.accent }]}>{m.pct}</Text>
                <Text style={s.mixLbl} numberOfLines={2}>{m.label}</Text>
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
          <Text style={s.resetBtnText}>Modify Goal Inputs</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <ScrollView
      style={s.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <AppHeader subtitle="Financial Goal Planner" onMenuPress={onOpenMenu} />
      {!hasPlanned ? renderInputMode() : renderOutputMode()}
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
  inflationNote: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
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

  // Goal Presets
  goalGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  goalPill: {
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
  goalPillActive: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  goalPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },

  // Funding Strategy Toggles
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
    paddingHorizontal: 8,
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
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  resultMeta: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },

  // Inflation Banner
  inflationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  inflationIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  inflationLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
    letterSpacing: 0.3,
  },
  inflationAmount: {
    fontSize: 21,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 2,
  },
  inflationSub: {
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

  // Comparison Card
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

  // Split Card
  splitCard: {
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  splitHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  splitHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  splitHeaderRatio: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  splitBarBg: {
    height: 8,
    backgroundColor: '#10B981',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  splitBarCapital: {
    height: '100%',
    backgroundColor: '#38BDF8',
  },
  splitLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  splitLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#CBD5E1',
  },

  // Suggested Mix Card
  mixCard: {
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  mixHeader: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  mixRow: {
    flexDirection: 'row',
    backgroundColor: '#131926',
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  mixItem: {
    flex: 1,
    alignItems: 'center',
  },
  mixPct: {
    fontSize: 16,
    fontWeight: '900',
  },
  mixLbl: {
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 3,
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
});
