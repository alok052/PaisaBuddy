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

const LOAN_PRESETS = {
  HOME: { label: 'Home', icon: 'home-outline', amount: 5000000, rate: 8.75, tenure: 20 },
  CAR: { label: 'Car', icon: 'car-sport-outline', amount: 1200000, rate: 9.25, tenure: 5 },
  PERSONAL: { label: 'Personal', icon: 'wallet-outline', amount: 500000, rate: 11.5, tenure: 3 },
};

export default function EMIPrepaymentScreen({ onOpenMenu }) {
  const [loanType, setLoanType] = useState('HOME');
  const [loanAmount, setLoanAmount] = useState(5000000);
  const [interestRate, setInterestRate] = useState(8.75);
  const [tenureYears, setTenureYears] = useState(20);
  const [strategy, setStrategy] = useState('EXTRA_EMI'); // 'STANDARD' | 'EXTRA_EMI' | 'STEP_10'
  const [isCalculating, setIsCalculating] = useState(false);
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

  // Month-by-Month Reducing Balance Amortization Simulation
  const simulateLoan = (principal, annualRatePct, years, prepayMode) => {
    const r = annualRatePct / 12 / 100;
    const totalMonths = years * 12;

    const emi =
      r === 0
        ? principal / totalMonths
        : (principal * r * Math.pow(1 + r, totalMonths)) /
          (Math.pow(1 + r, totalMonths) - 1);

    let balance = principal;
    let totalInterest = 0;
    let totalPaid = 0;
    let monthsTaken = 0;

    while (balance > 1 && monthsTaken < totalMonths + 12) {
      monthsTaken++;
      const yearIdx = Math.floor((monthsTaken - 1) / 12);
      const monthInterest = balance * r;
      totalInterest += monthInterest;

      let payment = emi;
      if (prepayMode === 'STEP_10') {
        payment = emi * Math.pow(1.1, yearIdx);
      } else if (prepayMode === 'EXTRA_EMI' && monthsTaken % 12 === 0) {
        payment = emi * 2;
      }

      const totalDue = balance + monthInterest;
      if (payment >= totalDue) {
        totalPaid += totalDue;
        balance = 0;
      } else {
        totalPaid += payment;
        balance = totalDue - payment;
      }
    }

    const finalMonths = prepayMode === 'STANDARD' ? totalMonths : monthsTaken;
    const finalInterest = prepayMode === 'STANDARD' ? Math.max(0, emi * totalMonths - principal) : totalInterest;
    const finalPayable = principal + finalInterest;

    return {
      monthlyEmi: emi,
      principal,
      totalInterest: finalInterest,
      totalPayable: finalPayable,
      monthsTaken: finalMonths,
      yearsTaken: finalMonths / 12,
      interestSharePct: finalPayable > 0 ? Math.round((finalInterest / finalPayable) * 100) : 0,
      firstMonthInterestPct: emi > 0 ? Math.min(99, Math.round(((principal * r) / emi) * 100)) : 0,
    };
  };

  const stdSim = simulateLoan(loanAmount, interestRate, tenureYears, 'STANDARD');
  const extraEmiSim = simulateLoan(loanAmount, interestRate, tenureYears, 'EXTRA_EMI');
  const stepUpSim = simulateLoan(loanAmount, interestRate, tenureYears, 'STEP_10');

  const activeSim =
    strategy === 'STEP_10'
      ? stepUpSim
      : strategy === 'EXTRA_EMI'
      ? extraEmiSim
      : stdSim;

  const recommendedSim = extraEmiSim;
  const interestSaved = Math.max(0, stdSim.totalInterest - activeSim.totalInterest);
  const monthsSaved = Math.max(0, stdSim.monthsTaken - activeSim.monthsTaken);
  const potentialSaveExtraEmi = Math.max(0, stdSim.totalInterest - recommendedSim.totalInterest);
  const potentialMonthsCutExtraEmi = Math.max(0, stdSim.monthsTaken - recommendedSim.monthsTaken);

  const formatCompact = (rupees) => {
    if (rupees >= 10000000) return `\u20B9${(rupees / 10000000).toFixed(2)} Cr`;
    if (rupees >= 100000) return `\u20B9${(rupees / 100000).toFixed(1)}L`;
    return `\u20B9${Math.round(rupees).toLocaleString('en-IN')}`;
  };

  const formatDurationCut = (months) => {
    if (months >= 12) return `${(months / 12).toFixed(1)}Y`;
    return `${months}m`;
  };

  const formatDurationFull = (months) => {
    const yrs = Math.floor(months / 12);
    const remMo = months % 12;
    if (yrs === 0) return `${remMo} mo`;
    if (remMo === 0) return `${yrs} ${yrs === 1 ? 'Yr' : 'Yrs'}`;
    return `${yrs}Y ${remMo}m`;
  };

  const handleSelectLoanPreset = (typeKey) => {
    Haptics.selectionAsync();
    const p = LOAN_PRESETS[typeKey];
    setLoanType(typeKey);
    setLoanAmount(p.amount);
    setInterestRate(p.rate);
    setTenureYears(p.tenure);
  };

  const handleAnalyze = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsCalculating(true);
    setTimeout(() => {
      setIsCalculating(false);
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
  const renderInputMode = () => (
    <View style={s.inputContainer}>
      {/* Loan Type Preset Selector (Clean 3-pill row matching SIP Doctor) */}
      <View style={s.configSection}>
        <Text style={s.configLabel}>Loan Category</Text>
        <View style={s.pillToggleRow}>
          {Object.entries(LOAN_PRESETS).map(([key, item]) => {
            const isSelected = loanType === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  s.pillToggleBtn,
                  isSelected && s.pillToggleBtnActiveBlue,
                ]}
                onPress={() => handleSelectLoanPreset(key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={item.icon}
                  size={13}
                  color={isSelected ? '#38BDF8' : '#64748B'}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    s.pillToggleText,
                    isSelected && { color: '#38BDF8', fontWeight: '800' },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Slider 1: Loan Amount */}
      <View style={s.configSection}>
        <View style={s.configLabelRow}>
          <Text style={s.configLabel}>Loan Amount</Text>
          <Text style={s.configValueDisplay}>
            {'\u20B9'}{loanAmount.toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={s.sliderWrap}>
          <Slider
            style={s.sliderBar}
            minimumValue={100000}
            maximumValue={20000000}
            step={100000}
            value={loanAmount}
            onValueChange={(val) => setLoanAmount(Math.round(val))}
            minimumTrackTintColor="#38BDF8"
            maximumTrackTintColor="#1E293B"
            thumbTintColor="#38BDF8"
          />
        </View>
      </View>

      {/* Slider 2: Interest Rate */}
      <View style={s.configSection}>
        <View style={s.configLabelRow}>
          <Text style={s.configLabel}>Interest Rate</Text>
          <Text style={[s.configValueDisplay, { color: '#F59E0B' }]}>
            {interestRate.toFixed(2)}%{' '}
            <Text style={s.configValueSub}>p.a.</Text>
          </Text>
        </View>
        <View style={s.sliderWrap}>
          <Slider
            style={s.sliderBar}
            minimumValue={6.5}
            maximumValue={18.0}
            step={0.25}
            value={interestRate}
            onValueChange={(val) => setInterestRate(Math.round(val * 4) / 4)}
            minimumTrackTintColor="#F59E0B"
            maximumTrackTintColor="#1E293B"
            thumbTintColor="#F59E0B"
          />
        </View>
      </View>

      {/* Slider 3: Loan Tenure */}
      <View style={s.configSection}>
        <View style={s.configLabelRow}>
          <Text style={s.configLabel}>Loan Tenure</Text>
          <Text style={[s.configValueDisplay, { color: '#10B981' }]}>
            {tenureYears} {tenureYears === 1 ? 'Year' : 'Years'}
          </Text>
        </View>
        <View style={s.sliderWrap}>
          <Slider
            style={s.sliderBar}
            minimumValue={1}
            maximumValue={30}
            step={1}
            value={tenureYears}
            onValueChange={(val) => setTenureYears(Math.round(val))}
            minimumTrackTintColor="#10B981"
            maximumTrackTintColor="#1E293B"
            thumbTintColor="#10B981"
          />
        </View>
      </View>

      {/* Prepayment Strategy Toggle (Matches SIP Doctor Step-Up selector) */}
      <View style={s.configSection}>
        <View style={s.configLabelRow}>
          <Text style={s.configLabel}>Prepayment Strategy</Text>
          <Text
            style={[
              s.strategyBadge,
              strategy === 'STEP_10'
                ? { color: '#10B981' }
                : strategy === 'EXTRA_EMI'
                ? { color: '#38BDF8' }
                : { color: '#F59E0B' },
            ]}
          >
            {strategy === 'STEP_10'
              ? '+10% EMI Increment / Yr'
              : strategy === 'EXTRA_EMI'
              ? '1 Extra EMI Every Year'
              : 'Standard Fixed EMI'}
          </Text>
        </View>

        <View style={s.pillToggleRow}>
          <TouchableOpacity
            style={[
              s.pillToggleBtn,
              strategy === 'STANDARD' && s.pillToggleBtnActiveAmber,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setStrategy('STANDARD');
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                s.pillToggleText,
                strategy === 'STANDARD' && { color: '#F59E0B', fontWeight: '800' },
              ]}
              numberOfLines={1}
            >
              Standard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              s.pillToggleBtn,
              strategy === 'EXTRA_EMI' && s.pillToggleBtnActiveBlue,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setStrategy('EXTRA_EMI');
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                s.pillToggleText,
                strategy === 'EXTRA_EMI' && { color: '#38BDF8', fontWeight: '800' },
              ]}
              numberOfLines={1}
            >
              +1 EMI / Yr
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              s.pillToggleBtn,
              strategy === 'STEP_10' && s.pillToggleBtnActiveEmerald,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setStrategy('STEP_10');
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                s.pillToggleText,
                strategy === 'STEP_10' && { color: '#10B981', fontWeight: '800' },
              ]}
              numberOfLines={1}
            >
              +10% EMI/Yr
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Primary Emerald CTA Button */}
      <TouchableOpacity
        style={s.ctaBtn}
        activeOpacity={0.85}
        onPress={handleAnalyze}
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
                name="card"
                size={17}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={s.ctaText}>Analyze EMI & Savings</Text>
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
    const isStandard = strategy === 'STANDARD';
    const isHighDrain = stdSim.interestSharePct >= 42;
    const heroColor = !isStandard
      ? '#10B981'
      : isHighDrain
      ? '#EF4444'
      : '#F59E0B';

    const principalPct = activeSim.totalPayable > 0
      ? Math.round((activeSim.principal / activeSim.totalPayable) * 100)
      : 50;
    const interestPct = 100 - principalPct;

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
                {isStandard
                  ? `${stdSim.interestSharePct}%`
                  : `-${formatDurationCut(monthsSaved)}`}
              </Text>
              <Text style={[s.scoreOutOf, { color: heroColor + 'AA' }]}>
                {isStandard ? 'Interest Load' : 'Tenure Cut'}
              </Text>
            </View>
          </View>

          <View style={[s.statusTag, { backgroundColor: heroColor + '15' }]}>
            <View style={[s.statusDot, { backgroundColor: heroColor }]} />
            <Text style={[s.statusTagText, { color: heroColor }]}>
              {isStandard
                ? isHighDrain
                  ? 'High Interest Drain'
                  : 'Standard EMI Schedule'
                : 'Prepayment Optimized'}
            </Text>
          </View>

          <Text style={s.resultHeadline}>
            {'\u20B9'}{Math.round(stdSim.monthlyEmi).toLocaleString('en-IN')}{' '}
            <Text style={s.resultHeadlineSub}>/ month</Text>
          </Text>
          <Text style={s.resultMeta}>
            {LOAN_PRESETS[loanType].label} Loan
            {' \u2022 '}{formatCompact(loanAmount)}
            {' \u2022 '}{interestRate.toFixed(2)}%
            {' \u2022 '}{tenureYears} {tenureYears === 1 ? 'Yr' : 'Yrs'}
          </Text>
        </Animated.View>

        {/* Diagnostic Savings OR Drain Alert Card (Matches SIP Doctor Pattern) */}
        {isStandard ? (
          <View style={s.alertCard}>
            <View style={s.alertHeader}>
              <View style={s.alertBadge}>
                <Ionicons name="alert-circle" size={13} color="#F59E0B" style={{ marginRight: 4 }} />
                <Text style={s.alertBadgeText}>BANK INTEREST TRAP</Text>
              </View>
              <Text style={s.alertGainHighlight}>
                Save {formatCompact(potentialSaveExtraEmi)}
              </Text>
            </View>
            <Text style={s.alertDesc}>
              Without prepayments, you pay{' '}
              <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>
                {formatCompact(stdSim.totalInterest)}
              </Text>{' '}
              in pure bank interest. Paying just 1 Extra EMI every year cuts your tenure by{' '}
              <Text style={{ color: '#10B981', fontWeight: '700' }}>
                {formatDurationFull(potentialMonthsCutExtraEmi)}
              </Text>
              !
            </Text>
            <View style={s.miniCompareStrip}>
              <View style={s.miniCompareItem}>
                <Text style={s.miniCompareLbl}>Standard ({tenureYears}Y)</Text>
                <Text style={s.miniCompareVal}>{formatCompact(stdSim.totalInterest)}</Text>
              </View>
              <Ionicons name="arrow-forward" size={14} color="#64748B" />
              <View style={[s.miniCompareItem, s.miniCompareHighlight]}>
                <Text style={[s.miniCompareLbl, { color: '#10B981' }]}>
                  +1 EMI/Yr ({recommendedSim.yearsTaken.toFixed(1)}Y)
                </Text>
                <Text style={[s.miniCompareVal, { color: '#10B981' }]}>
                  {formatCompact(recommendedSim.totalInterest)}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={s.savingsBannerCard}>
            <View style={s.savingsIconWrap}>
              <Ionicons name="shield-checkmark" size={21} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.savingsLabel}>TOTAL INTEREST SAVED</Text>
              <Text style={s.savingsAmount}>{formatCompact(interestSaved)}</Text>
              <Text style={s.savingsSub}>
                Debt-free in {formatDurationFull(activeSim.monthsTaken)} instead of {tenureYears} years
              </Text>
            </View>
          </View>
        )}

        {/* Verdict Card */}
        <View style={[s.verdictCard, { borderColor: heroColor + '25' }]}>
          <Text style={s.verdictTitle}>Amortization Insight</Text>
          <Text style={s.verdictNote}>
            In Month 1, <Text style={{ color: '#F59E0B', fontWeight: '800' }}>{stdSim.firstMonthInterestPct}% of your EMI</Text> goes purely towards bank interest ({'\u20B9'}{Math.round((loanAmount * (interestRate / 12 / 100))).toLocaleString('en-IN')}). Prepaying early directly attacks principal before compounding kicks in.
          </Text>
        </View>

        {/* Head-to-Head Comparison Card */}
        <View style={s.compareCard}>
          <Text style={s.compareHeader}>
            {isStandard ? 'STANDARD VS +1 EMI / YEAR' : 'STANDARD VS SELECTED PLAN'}
          </Text>
          <View style={s.compareGrid}>
            {/* Standard Col */}
            <View style={s.compareCol}>
              <Text style={s.compareColTag}>Standard EMI</Text>
              <Text style={s.compareColName}>{tenureYears}Y Original Plan</Text>

              <View style={s.compareMetric}>
                <Text style={s.compareMetricLabel}>Loan Closes In</Text>
                <Text style={s.compareMetricValue}>
                  {formatDurationFull(stdSim.monthsTaken)}
                </Text>
              </View>
              <View style={s.compareMetric}>
                <Text style={s.compareMetricLabel}>Total Interest</Text>
                <Text style={[s.compareMetricValue, { color: '#F59E0B' }]}>
                  {formatCompact(stdSim.totalInterest)}
                </Text>
              </View>
              <View style={s.compareTotal}>
                <Text style={s.compareTotalLabel}>Total Payout</Text>
                <Text style={s.compareTotalValue}>
                  {formatCompact(stdSim.totalPayable)}
                </Text>
              </View>
            </View>

            <View style={s.compareArrow}>
              <Ionicons name="arrow-forward" size={16} color="#10B981" />
            </View>

            {/* Prepayment Col */}
            {(() => {
              const targetSim = isStandard ? recommendedSim : activeSim;
              const targetTitle =
                strategy === 'STEP_10' ? '+10% Step-Up' : '+1 Extra EMI/Yr';
              return (
                <View style={[s.compareCol, s.compareColHighlight]}>
                  <Text style={[s.compareColTag, { color: '#10B981' }]}>
                    {targetTitle}
                  </Text>
                  <Text style={s.compareColName}>Accelerated Payoff</Text>

                  <View style={s.compareMetric}>
                    <Text style={s.compareMetricLabel}>Loan Closes In</Text>
                    <Text style={[s.compareMetricValue, { color: '#10B981' }]}>
                      {formatDurationFull(targetSim.monthsTaken)}
                    </Text>
                  </View>
                  <View style={s.compareMetric}>
                    <Text style={s.compareMetricLabel}>Total Interest</Text>
                    <Text style={[s.compareMetricValue, { color: '#10B981' }]}>
                      {formatCompact(targetSim.totalInterest)}
                    </Text>
                  </View>
                  <View style={s.compareTotal}>
                    <Text style={[s.compareTotalLabel, { color: '#10B981' }]}>
                      Total Payout
                    </Text>
                    <Text style={[s.compareTotalValue, { color: '#10B981' }]}>
                      {formatCompact(targetSim.totalPayable)}
                    </Text>
                  </View>
                </View>
              );
            })()}
          </View>
        </View>

        {/* Principal vs Interest Visual Breakdown */}
        <View style={s.splitCard}>
          <View style={s.splitHeaderRow}>
            <Text style={s.splitHeaderTitle}>Principal vs Interest Split</Text>
            <Text style={s.splitHeaderRatio}>
              {principalPct}% / {interestPct}%
            </Text>
          </View>

          {/* Horizontal Bar */}
          <View style={s.splitBarBg}>
            <View
              style={[
                s.splitBarPrincipal,
                { width: `${Math.max(10, Math.min(95, principalPct))}%` },
              ]}
            />
          </View>

          <View style={s.splitLegendRow}>
            <View style={s.splitLegendItem}>
              <View style={[s.legendDot, { backgroundColor: '#38BDF8' }]} />
              <Text style={s.legendLabel}>Principal: {formatCompact(activeSim.principal)}</Text>
            </View>
            <View style={s.splitLegendItem}>
              <View style={[s.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={s.legendLabel}>Interest: {formatCompact(activeSim.totalInterest)}</Text>
            </View>
          </View>
        </View>

        {/* Reset / Modify Inputs */}
        <TouchableOpacity
          style={s.resetBtn}
          activeOpacity={0.7}
          onPress={handleReset}
        >
          <Ionicons name="refresh" size={14} color="#64748B" style={{ marginRight: 6 }} />
          <Text style={s.resetBtnText}>Modify Loan Inputs</Text>
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
      <AppHeader subtitle="EMI & Prepayment Analyzer" onMenuPress={onOpenMenu} />
      {!hasAnalyzed ? renderInputMode() : renderOutputMode()}
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

  // Strategy & Category Toggles
  strategyBadge: {
    fontSize: 11,
    fontWeight: '700',
  },
  pillToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pillToggleBtn: {
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
  pillToggleBtnActiveBlue: {
    borderColor: 'rgba(56, 189, 248, 0.5)',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  pillToggleBtnActiveAmber: {
    borderColor: 'rgba(245, 158, 11, 0.45)',
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
  },
  pillToggleBtnActiveEmerald: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  pillToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
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

  // Alert Card (Standard)
  alertCard: {
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
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
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.4,
  },
  alertGainHighlight: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#10B981',
  },
  alertDesc: {
    fontSize: 11.5,
    color: '#94A3B8',
    lineHeight: 17,
    marginBottom: 10,
  },
  miniCompareStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131926',
    borderRadius: 10,
    padding: 8,
    justifyContent: 'space-between',
  },
  miniCompareItem: {
    flex: 1,
    alignItems: 'center',
  },
  miniCompareHighlight: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 8,
    paddingVertical: 4,
  },
  miniCompareLbl: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '700',
  },
  miniCompareVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 2,
  },

  // Savings Banner Card
  savingsBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  savingsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  savingsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  savingsAmount: {
    fontSize: 21,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 2,
  },
  savingsSub: {
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
    backgroundColor: '#F59E0B',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  splitBarPrincipal: {
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
