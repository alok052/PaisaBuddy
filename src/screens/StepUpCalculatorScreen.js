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

export default function StepUpCalculatorScreen({ onOpenMenu }) {
  const [sipAmount, setSipAmount] = useState(10000);
  const [stepUpRate, setStepUpRate] = useState(10);
  const [sipYears, setSipYears] = useState(15);
  const [expectedReturn, setExpectedReturn] = useState(13.0);
  const [valueMode, setValueMode] = useState('NOMINAL'); // 'NOMINAL' | 'INFLATION_ADJ'
  const [isCalculating, setIsCalculating] = useState(false);
  const [hasCalculated, setHasCalculated] = useState(false);

  // Animations matching SIP Doctor
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hasCalculated) {
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
  }, [hasCalculated]);

  // Month-by-Month Compounding Engine (matches SIP Doctor precision)
  const calculateProjection = (monthly, years, annualPct, stepPct, adjustInflation = false) => {
    const mRate = annualPct / 100 / 12;
    const totalMonths = years * 12;
    let corpus = 0;
    let invested = 0;

    for (let m = 1; m <= totalMonths; m++) {
      const yIdx = Math.floor((m - 1) / 12);
      const curM = monthly * Math.pow(1 + stepPct / 100, yIdx);
      invested += curM;
      corpus += curM * Math.pow(1 + mRate, totalMonths - m + 1);
    }

    if (adjustInflation) {
      const inflationFactor = Math.pow(1.06, years);
      corpus = corpus / inflationFactor;
    }

    return {
      corpus,
      invested,
      gains: Math.max(0, corpus - invested),
      finalYearMonthly: monthly * Math.pow(1 + stepPct / 100, Math.max(0, years - 1)),
    };
  };

  const isInflationAdjusted = valueMode === 'INFLATION_ADJ';

  const flatResult = calculateProjection(sipAmount, sipYears, expectedReturn, 0, isInflationAdjusted);
  const stepUpResult = calculateProjection(sipAmount, sipYears, expectedReturn, stepUpRate, isInflationAdjusted);

  const extraWealth = Math.max(0, stepUpResult.corpus - flatResult.corpus);
  const vsFlatMultiple = flatResult.corpus > 0 ? stepUpResult.corpus / flatResult.corpus : 1;
  const investedMultiple = stepUpResult.invested > 0 ? stepUpResult.corpus / stepUpResult.invested : 1;
  const profitSharePct = stepUpResult.corpus > 0
    ? Math.max(0, Math.round((stepUpResult.gains / stepUpResult.corpus) * 100))
    : 0;

  // Dynamic 4-checkpoint milestones across chosen years
  const getMilestoneYears = (totalYrs) => {
    if (totalYrs <= 4) {
      return Array.from({ length: totalYrs }, (_, i) => i + 1);
    }
    const q1 = Math.max(1, Math.round(totalYrs * 0.25));
    const q2 = Math.max(q1 + 1, Math.round(totalYrs * 0.5));
    const q3 = Math.max(q2 + 1, Math.round(totalYrs * 0.75));
    return [q1, q2, q3, totalYrs];
  };

  const milestones = getMilestoneYears(sipYears).map((yr, idx, arr) => {
    const res = calculateProjection(sipAmount, yr, expectedReturn, stepUpRate, isInflationAdjusted);
    const labels = ['Base', 'Growth', 'Velocity', 'Target'];
    return {
      yr,
      corpus: res.corpus,
      label: idx === arr.length - 1 ? 'Target' : labels[idx] || 'Stage',
    };
  });

  const formatWealth = (rupees) => {
    if (rupees >= 10000000) return `\u20B9${(rupees / 10000000).toFixed(2)} Cr`;
    if (rupees >= 100000) return `\u20B9${(rupees / 100000).toFixed(1)}L`;
    return `\u20B9${Math.round(rupees).toLocaleString('en-IN')}`;
  };

  const formatCompactRing = (mult) => {
    return `${mult.toFixed(1)}x`;
  };

  const handleCalculate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsCalculating(true);
    setTimeout(() => {
      setIsCalculating(false);
      setHasCalculated(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 450);
  };

  const handleReset = () => {
    Haptics.selectionAsync();
    setHasCalculated(false);
  };

  // ============================================================
  // RENDER: INPUT MODE (Matches SIPDoctorScreen clean rhythm)
  // ============================================================
  const renderInputMode = () => (
    <View style={s.inputContainer}>
      {/* Slider 1: Starting Monthly SIP */}
      <View style={s.configSection}>
        <View style={s.configLabelRow}>
          <Text style={s.configLabel}>Starting Monthly SIP</Text>
          <Text style={s.configValueDisplay}>
            {'\u20B9'}{sipAmount.toLocaleString('en-IN')}{' '}
            <Text style={s.configValueSub}>/ month</Text>
          </Text>
        </View>
        <View style={s.sliderWrap}>
          <Slider
            style={s.sliderBar}
            minimumValue={1000}
            maximumValue={100000}
            step={500}
            value={sipAmount}
            onValueChange={(val) => setSipAmount(Math.round(val))}
            minimumTrackTintColor="#38BDF8"
            maximumTrackTintColor="#1E293B"
            thumbTintColor="#38BDF8"
          />
        </View>
      </View>

      {/* Slider 2: Annual Step-Up Rate */}
      <View style={s.configSection}>
        <View style={s.configLabelRow}>
          <Text style={s.configLabel}>Annual Step-Up</Text>
          <Text style={[s.configValueDisplay, { color: '#10B981' }]}>
            +{stepUpRate}%{' '}
            <Text style={s.configValueSub}>/ year</Text>
          </Text>
        </View>
        <View style={s.sliderWrap}>
          <Slider
            style={s.sliderBar}
            minimumValue={1}
            maximumValue={25}
            step={1}
            value={stepUpRate}
            onValueChange={(val) => setStepUpRate(Math.round(val))}
            minimumTrackTintColor="#10B981"
            maximumTrackTintColor="#1E293B"
            thumbTintColor="#10B981"
          />
        </View>
      </View>

      {/* Slider 3: Time Period */}
      <View style={s.configSection}>
        <View style={s.configLabelRow}>
          <Text style={s.configLabel}>Time Period</Text>
          <Text style={[s.configValueDisplay, { color: '#38BDF8' }]}>
            {sipYears} {sipYears === 1 ? 'Year' : 'Years'}
          </Text>
        </View>
        <View style={s.sliderWrap}>
          <Slider
            style={s.sliderBar}
            minimumValue={1}
            maximumValue={35}
            step={1}
            value={sipYears}
            onValueChange={(val) => setSipYears(Math.round(val))}
            minimumTrackTintColor="#38BDF8"
            maximumTrackTintColor="#1E293B"
            thumbTintColor="#38BDF8"
          />
        </View>
      </View>

      {/* Slider 4: Expected Return */}
      <View style={s.configSection}>
        <View style={s.configLabelRow}>
          <Text style={s.configLabel}>Expected Return (CAGR)</Text>
          <Text style={[s.configValueDisplay, { color: '#F59E0B' }]}>
            {expectedReturn.toFixed(1)}%{' '}
            <Text style={s.configValueSub}>p.a.</Text>
          </Text>
        </View>
        <View style={s.sliderWrap}>
          <Slider
            style={s.sliderBar}
            minimumValue={6}
            maximumValue={20}
            step={0.5}
            value={expectedReturn}
            onValueChange={(val) => setExpectedReturn(Math.round(val * 2) / 2)}
            minimumTrackTintColor="#F59E0B"
            maximumTrackTintColor="#1E293B"
            thumbTintColor="#F59E0B"
          />
        </View>
      </View>

      {/* Value Basis Toggle (Matches SIP Doctor Plan Toggle) */}
      <View style={s.configSection}>
        <Text style={s.configLabel}>Valuation Basis</Text>
        <View style={s.toggleRow}>
          <TouchableOpacity
            style={[
              s.toggleBtn,
              valueMode === 'NOMINAL' && s.toggleBtnActiveEmerald,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setValueMode('NOMINAL');
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="trending-up"
              size={13}
              color={valueMode === 'NOMINAL' ? '#10B981' : '#64748B'}
              style={{ marginRight: 5 }}
            />
            <Text
              style={[
                s.toggleText,
                valueMode === 'NOMINAL' && { color: '#10B981', fontWeight: '800' },
              ]}
            >
              Future Value
            </Text>
            {valueMode === 'NOMINAL' && (
              <Text style={s.badgeEmerald}>Nominal</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              s.toggleBtn,
              valueMode === 'INFLATION_ADJ' && s.toggleBtnActiveAmber,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setValueMode('INFLATION_ADJ');
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={13}
              color={valueMode === 'INFLATION_ADJ' ? '#F59E0B' : '#64748B'}
              style={{ marginRight: 5 }}
            />
            <Text
              style={[
                s.toggleText,
                valueMode === 'INFLATION_ADJ' && { color: '#F59E0B', fontWeight: '800' },
              ]}
            >
              Today's Worth
            </Text>
            {valueMode === 'INFLATION_ADJ' && (
              <Text style={s.badgeAmber}>-6% Inf</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Primary Emerald CTA Button */}
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
                name="stats-chart"
                size={17}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={s.ctaText}>Calculate Step-Up</Text>
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
    const accentColor = stepUpRate >= 10 ? '#10B981' : '#38BDF8';

    return (
      <Animated.View style={[s.outputContainer, { opacity: fadeAnim }]}>
        {/* Animated Score Ring Hero */}
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
          <View style={[s.scoreRing, { borderColor: accentColor + '40' }]}>
            <View style={[s.scoreRingInner, { borderColor: accentColor }]}>
              <Text style={[s.scoreNumber, { color: accentColor }]}>
                {formatCompactRing(vsFlatMultiple)}
              </Text>
              <Text style={[s.scoreOutOf, { color: accentColor + 'AA' }]}>
                vs Flat SIP
              </Text>
            </View>
          </View>

          <View style={[s.statusTag, { backgroundColor: accentColor + '15' }]}>
            <View style={[s.statusDot, { backgroundColor: accentColor }]} />
            <Text style={[s.statusTagText, { color: accentColor }]}>
              {isInflationAdjusted ? 'Real Purchasing Power' : 'Step-Up Wealth Engine'}
            </Text>
          </View>

          <Text style={s.resultHeadline}>{formatWealth(stepUpResult.corpus)}</Text>
          <Text style={s.resultMeta}>
            {'\u20B9'}{sipAmount.toLocaleString('en-IN')}/mo
            {' \u2022 '}+{stepUpRate}% Step-Up
            {' \u2022 '}{sipYears}Y @ {expectedReturn.toFixed(1)}%
          </Text>
        </Animated.View>

        {/* Extra Step-Up Gain Highlight Banner */}
        <View style={s.gainBannerCard}>
          <View style={s.gainIconWrap}>
            <Ionicons name="trending-up" size={20} color="#10B981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.gainLabel}>EXTRA STEP-UP GAIN</Text>
            <Text style={s.gainAmount}>+{formatWealth(extraWealth)}</Text>
            <Text style={s.gainSub}>
              more corpus than keeping a Flat SIP over {sipYears} {sipYears === 1 ? 'year' : 'years'}
            </Text>
          </View>
        </View>

        {/* Verdict & Cashflow Progression Card */}
        <View style={[s.verdictCard, { borderColor: accentColor + '25' }]}>
          <Text style={s.verdictTitle}>Compounding Verdict</Text>
          <Text style={s.verdictNote}>
            Your monthly SIP scales smoothly from {'\u20B9'}{sipAmount.toLocaleString('en-IN')} in Year 1 to{' '}
            <Text style={{ color: '#F8FAFC', fontWeight: '800' }}>
              {'\u20B9'}{Math.round(stepUpResult.finalYearMonthly).toLocaleString('en-IN')}
            </Text>{' '}
            by Year {sipYears}. Total invested capital is {formatWealth(stepUpResult.invested)}, generating{' '}
            <Text style={{ color: '#10B981', fontWeight: '800' }}>
              {investedMultiple.toFixed(1)}x wealth ({profitSharePct}% pure returns)
            </Text>
            .
          </Text>
        </View>

        {/* Side-by-Side Comparison Card (Flat SIP vs Step-Up SIP) */}
        <View style={s.compareCard}>
          <Text style={s.compareHeader}>FLAT SIP VS +{stepUpRate}% STEP-UP</Text>
          <View style={s.compareGrid}>
            {/* Flat Column */}
            <View style={s.compareCol}>
              <Text style={s.compareColTag}>Flat SIP</Text>
              <Text style={s.compareColName}>0% Yearly Increment</Text>

              <View style={s.compareMetric}>
                <Text style={s.compareMetricLabel}>Total Invested</Text>
                <Text style={s.compareMetricValue}>
                  {formatWealth(flatResult.invested)}
                </Text>
              </View>
              <View style={s.compareMetric}>
                <Text style={s.compareMetricLabel}>Est. Returns</Text>
                <Text style={s.compareMetricValue}>
                  {formatWealth(flatResult.gains)}
                </Text>
              </View>
              <View style={s.compareCorpus}>
                <Text style={s.compareCorpusLabel}>{sipYears}Y Corpus</Text>
                <Text style={s.compareCorpusValue}>
                  {formatWealth(flatResult.corpus)}
                </Text>
              </View>
            </View>

            {/* Arrow */}
            <View style={s.compareArrow}>
              <Ionicons name="arrow-forward" size={16} color="#10B981" />
            </View>

            {/* Step-Up Column */}
            <View style={[s.compareCol, s.compareColHighlight]}>
              <Text style={[s.compareColTag, { color: '#10B981' }]}>
                +{stepUpRate}% Step-Up
              </Text>
              <Text style={s.compareColName}>Annual Increment</Text>

              <View style={s.compareMetric}>
                <Text style={s.compareMetricLabel}>Total Invested</Text>
                <Text style={s.compareMetricValue}>
                  {formatWealth(stepUpResult.invested)}
                </Text>
              </View>
              <View style={s.compareMetric}>
                <Text style={s.compareMetricLabel}>Est. Returns</Text>
                <Text style={[s.compareMetricValue, { color: '#10B981' }]}>
                  {formatWealth(stepUpResult.gains)}
                </Text>
              </View>
              <View style={s.compareCorpus}>
                <Text style={[s.compareCorpusLabel, { color: '#10B981' }]}>
                  {sipYears}Y Corpus
                </Text>
                <Text style={[s.compareCorpusValue, { color: '#10B981' }]}>
                  {formatWealth(stepUpResult.corpus)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Wealth Milestones Card */}
        <View style={s.milestonesCard}>
          <View style={s.milestonesHeader}>
            <Ionicons name="flash" size={18} color="#10B981" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.milestonesTitle}>Compounding Milestones</Text>
              <Text style={s.milestonesSub}>
                Accelerated snowball trajectory with +{stepUpRate}% annual boost
              </Text>
            </View>
          </View>

          <View style={s.milestonesRow}>
            {milestones.map((m, i) => (
              <View key={m.yr} style={s.milestoneItem}>
                <Text style={s.milestoneYear}>{m.yr}Y</Text>
                <Text
                  style={[
                    s.milestoneAmount,
                    i >= milestones.length - 2 && { color: '#10B981' },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatWealth(m.corpus)}
                </Text>
                <Text style={s.milestoneLabel}>{m.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Reset / Modify Inputs */}
        <TouchableOpacity
          style={s.resetBtn}
          activeOpacity={0.7}
          onPress={handleReset}
        >
          <Ionicons name="refresh" size={14} color="#64748B" style={{ marginRight: 6 }} />
          <Text style={s.resetBtnText}>Modify Inputs & Recalculate</Text>
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
      <AppHeader subtitle="SIP Step-Up Calculator" onMenuPress={onOpenMenu} />
      {!hasCalculated ? renderInputMode() : renderOutputMode()}
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

  // Toggle Row
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
  toggleBtnActiveEmerald: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
  },
  toggleBtnActiveAmber: {
    borderColor: 'rgba(245, 158, 11, 0.5)',
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
  },
  toggleText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#94A3B8',
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
  badgeAmber: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
    marginLeft: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
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
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  scoreOutOf: {
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: -2,
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

  // Gain Banner
  gainBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  gainIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  gainLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  gainAmount: {
    fontSize: 21,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 2,
  },
  gainSub: {
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
  compareCorpus: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 6,
    padding: 6,
    marginTop: 6,
  },
  compareCorpusLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },
  compareCorpusValue: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 1,
  },
  compareArrow: {
    paddingHorizontal: 8,
  },

  // Milestones Card
  milestonesCard: {
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  milestonesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  milestonesTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  milestonesSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  milestonesRow: {
    flexDirection: 'row',
    backgroundColor: '#131926',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  milestoneItem: {
    flex: 1,
    alignItems: 'center',
  },
  milestoneYear: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  milestoneAmount: {
    fontSize: 13,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 3,
  },
  milestoneLabel: {
    fontSize: 8.5,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
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
