import AppHeader from '../components/AppHeader';
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import SIPMigrationModal from '../components/SIPMigrationModal';
import TaxHarvestingModal from '../components/TaxHarvestingModal';
import {
  mockSIPFundsDatabase,
  resolveFundAudit,
  diagnoseFundHealth,
} from '../data/mockSIPFunds';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCORE_RING_SIZE = 120;

export default function SIPDoctorScreen({ onOpenMenu }) {
  const [selectedFund, setSelectedFund] = useState(null);
  const [planType, setPlanType] = useState('REGULAR');
  const [sipAmount, setSipAmount] = useState(10000);
  const [sipYears, setSipYears] = useState(15);
  const [hasStepUp, setHasStepUp] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [modalSearchText, setModalSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [migratingFund, setMigratingFund] = useState(null);
  const [taxModalVisible, setTaxModalVisible] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hasAnalyzed) {
      fadeAnim.setValue(0);
      scoreAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scoreAnim, {
          toValue: 1,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [hasAnalyzed]);

  const sipAmounts = [
    { label: '\u20B92.5K', value: 2500 },
    { label: '\u20B95K', value: 5000 },
    { label: '\u20B910K', value: 10000 },
    { label: '\u20B925K', value: 25000 },
    { label: '\u20B950K', value: 50000 },
  ];

  const yearOptions = [5, 10, 15, 20];

  const categories = [
    { id: 'ALL', label: 'All' },
    { id: 'LARGE', label: 'Large Cap' },
    { id: 'FLEXI', label: 'Flexi Cap' },
    { id: 'MID', label: 'Mid Cap' },
    { id: 'SMALL', label: 'Small Cap' },
    { id: 'HYBRID', label: 'Hybrid' },
    { id: 'ELSS', label: 'ELSS' },
  ];

  // Precise Monthly Compounding Engine (13% CAGR)
  const calcCorpus = (monthly, years, rate = 0.13, stepupPct = 0) => {
    const mRate = rate / 12;
    const totalMonths = years * 12;
    let corpus = 0;
    for (let m = 1; m <= totalMonths; m++) {
      const yIdx = Math.floor((m - 1) / 12);
      const curM = monthly * Math.pow(1 + stepupPct / 100, yIdx);
      corpus += curM * Math.pow(1 + mRate, totalMonths - m + 1);
    }
    return corpus;
  };

  // Step-Up vs Flat calculations
  const flatCorpus = calcCorpus(sipAmount, sipYears, 0.13, 0);
  const stepUpCorpus = calcCorpus(sipAmount, sipYears, 0.13, 10);
  const stepUpGain = Math.max(0, stepUpCorpus - flatCorpus);

  // Dynamic wealth calculations for comparison
  const multiplier = sipAmount / 10000;
  const yearMultiplier = sipYears / 15;
  const baseWealthCur = (flatCorpus / 100000);
  const baseWealthRep = (flatCorpus * 1.48 / 100000);
  const calculatedExtraWealth = Math.max(0, baseWealthRep - baseWealthCur);

  const rawDiagnosis = selectedFund
    ? diagnoseFundHealth(selectedFund, planType, sipAmount, sipYears)
    : null;

  // Adjust score based on Step-Up discipline
  const diagnosis = rawDiagnosis
    ? {
        ...rawDiagnosis,
        healthScore: hasStepUp
          ? Math.min(100, rawDiagnosis.healthScore + 5)
          : Math.max(30, rawDiagnosis.healthScore - 4),
      }
    : null;

  // Compounding milestones (reflects Step-Up if active)
  const m5Y = (calcCorpus(sipAmount, 5, 0.13, hasStepUp ? 10 : 0) / 100000).toFixed(1);
  const m10Y = (calcCorpus(sipAmount, 10, 0.13, hasStepUp ? 10 : 0) / 100000).toFixed(1);
  const m15Y = (calcCorpus(sipAmount, 15, 0.13, hasStepUp ? 10 : 0) / 100000).toFixed(1);
  const m20Y = (calcCorpus(sipAmount, 20, 0.13, hasStepUp ? 10 : 0) / 100000).toFixed(1);

  // Filter funds for modal
  const filteredModalFunds = mockSIPFundsDatabase.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(modalSearchText.toLowerCase()) ||
      f.category.toLowerCase().includes(modalSearchText.toLowerCase()) ||
      (f.amc && f.amc.toLowerCase().includes(modalSearchText.toLowerCase()));

    if (!matchesSearch) return false;

    if (categoryFilter === 'LARGE') return f.category.includes('Large') || f.category.includes('Index');
    if (categoryFilter === 'FLEXI') return f.category.includes('Flexi') || f.category.includes('Multi');
    if (categoryFilter === 'MID') return f.category.includes('Mid');
    if (categoryFilter === 'SMALL') return f.category.includes('Small');
    if (categoryFilter === 'HYBRID') return f.category.includes('Dynamic') || f.category.includes('Balanced') || f.category.includes('Hybrid');
    if (categoryFilter === 'ELSS') return f.category.includes('ELSS') || f.category.includes('Tax');
    return true;
  });

  const handleSelectFund = (fund) => {
    Haptics.selectionAsync();
    setSelectedFund(fund);
    setSearchModalVisible(false);
    setModalSearchText('');
  };

  const handleCustomFundSelect = (customQuery) => {
    Haptics.selectionAsync();
    const resolved = resolveFundAudit(customQuery);
    setSelectedFund(resolved);
    setSearchModalVisible(false);
    setModalSearchText('');
  };

  const handleRunDiagnostic = () => {
    if (!selectedFund) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setSearchModalVisible(true);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsAnalyzing(true);

    setTimeout(() => {
      setIsAnalyzing(false);
      setHasAnalyzed(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 800);
  };

  const handleReset = () => {
    Haptics.selectionAsync();
    setHasAnalyzed(false);
  };

  // Helper: format lakh/crore
  const formatWealth = (lakhs) => {
    if (lakhs >= 100) return `\u20B9${(lakhs / 100).toFixed(1)} Cr`;
    return `\u20B9${lakhs.toFixed(1)}L`;
  };

  // Helper: get score color
  const getScoreColor = (score) => {
    if (score >= 85) return '#10B981';
    if (score >= 65) return '#F59E0B';
    return '#EF4444';
  };

  // ============================================================
  // RENDER: INPUT MODE
  // ============================================================
  const renderInputMode = () => (
    <View style={s.inputContainer}>
      {/* Search / Selected Fund Area */}
      {!selectedFund ? (
        <TouchableOpacity
          style={s.searchTrigger}
          activeOpacity={0.7}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSearchModalVisible(true);
          }}
        >
          <View style={s.searchIconWrap}>
            <Ionicons name="search" size={18} color="#38BDF8" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.searchPlaceholderMain}>Search mutual fund...</Text>
            <Text style={s.searchPlaceholderSub}>SBI, HDFC, Parag Parikh, Axis, etc.</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#64748B" />
        </TouchableOpacity>
      ) : (
        <View style={s.selectedFundCard}>
          <View style={s.selectedFundTop}>
            <View style={{ flex: 1 }}>
              <Text style={s.selectedFundName} numberOfLines={2}>
                {selectedFund.name}
              </Text>
              <View style={s.fundMetaRow}>
                <Text style={s.fundMetaChip}>{selectedFund.amc || 'AMC'}</Text>
                <Text style={s.fundMetaDot}>{'\u2022'}</Text>
                <Text style={s.fundMetaChip}>{selectedFund.category}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedFund(null);
                setHasAnalyzed(false);
              }}
              style={s.clearBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Quick Metrics Row */}
          <View style={s.metricsStrip}>
            <View style={s.metricItem}>
              <Text style={s.metricLabel}>Expense</Text>
              <Text style={s.metricValue}>{selectedFund.currentExpense}</Text>
            </View>
            <View style={s.metricDivider} />
            <View style={s.metricItem}>
              <Text style={s.metricLabel}>5Y Return</Text>
              <Text style={[s.metricValue, { color: '#10B981' }]}>
                {selectedFund.currentCagr}
              </Text>
            </View>
            <View style={s.metricDivider} />
            <View style={s.metricItem}>
              <Text style={s.metricLabel}>vs Benchmark</Text>
              <Text
                style={[
                  s.metricValue,
                  {
                    color: selectedFund.alphaVsBenchmark?.includes('-')
                      ? '#EF4444'
                      : '#10B981',
                  },
                ]}
              >
                {selectedFund.alphaVsBenchmark || '+0.0%'}
              </Text>
            </View>
          </View>

          {/* Change Fund */}
          <TouchableOpacity
            style={s.changeFundBtn}
            onPress={() => setSearchModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="swap-horizontal" size={14} color="#38BDF8" />
            <Text style={s.changeFundText}>Change Fund</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Plan Type Toggle */}
      <View style={s.configSection}>
        <Text style={s.configLabel}>Plan Type</Text>
        <View style={s.planToggleRow}>
          <TouchableOpacity
            style={[
              s.planToggleBtn,
              planType === 'DIRECT' && s.planToggleBtnActiveDirect,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setPlanType('DIRECT');
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="flash"
              size={13}
              color={planType === 'DIRECT' ? '#10B981' : '#64748B'}
              style={{ marginRight: 5 }}
            />
            <Text
              style={[
                s.planToggleText,
                planType === 'DIRECT' && { color: '#10B981', fontWeight: '800' },
              ]}
            >
              Direct
            </Text>
            {planType === 'DIRECT' && (
              <Text style={s.planBadgeDirect}>0% Fee</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              s.planToggleBtn,
              planType === 'REGULAR' && s.planToggleBtnActiveRegular,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setPlanType('REGULAR');
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="business"
              size={13}
              color={planType === 'REGULAR' ? '#F59E0B' : '#64748B'}
              style={{ marginRight: 5 }}
            />
            <Text
              style={[
                s.planToggleText,
                planType === 'REGULAR' && { color: '#F59E0B', fontWeight: '800' },
              ]}
            >
              Regular
            </Text>
            {planType === 'REGULAR' && (
              <Text style={s.planBadgeRegular}>~1% Cut</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* SIP Amount */}
      <View style={s.configSection}>
        <View style={s.configLabelRow}>
          <Text style={s.configLabel}>Monthly SIP</Text>
          <Text style={s.configValueDisplay}>
            {'\u20B9'}{sipAmount.toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={s.pillRow}>
          {sipAmounts.map((tier) => {
            const isActive = sipAmount === tier.value;
            return (
              <TouchableOpacity
                key={tier.value}
                style={[s.pill, isActive && s.pillActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSipAmount(tier.value);
                }}
                activeOpacity={0.8}
              >
                <Text style={[s.pillText, isActive && s.pillTextActive]}>
                  {tier.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Investment Horizon */}
      <View style={s.configSection}>
        <View style={s.configLabelRow}>
          <Text style={s.configLabel}>Horizon</Text>
          <Text style={s.configValueDisplay}>{sipYears} Years</Text>
        </View>
        <View style={s.pillRow}>
          {yearOptions.map((yr) => {
            const isActive = sipYears === yr;
            return (
              <TouchableOpacity
                key={yr}
                style={[s.pill, s.pillWide, isActive && s.pillActiveGreen]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSipYears(yr);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    s.pillText,
                    isActive && { color: '#10B981', fontWeight: '800' },
                  ]}
                >
                  {yr}Y
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Annual Step-Up Option */}
      <View style={s.configSection}>
        <View style={s.configLabelRow}>
          <Text style={s.configLabel}>Annual Step-Up</Text>
          <Text style={[s.stepUpStatusBadge, hasStepUp ? { color: '#10B981' } : { color: '#64748B' }]}>
            {hasStepUp ? '+10% Increment / Yr' : 'Flat SIP (No Step-Up)'}
          </Text>
        </View>
        <View style={s.stepUpToggleRow}>
          <TouchableOpacity
            style={[s.stepUpToggleBtn, !hasStepUp && s.stepUpToggleBtnActiveFlat]}
            onPress={() => {
              Haptics.selectionAsync();
              setHasStepUp(false);
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="remove-circle-outline"
              size={14}
              color={!hasStepUp ? '#F59E0B' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                s.stepUpToggleText,
                !hasStepUp && { color: '#F59E0B', fontWeight: '800' },
              ]}
            >
              Flat SIP
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.stepUpToggleBtn, hasStepUp && s.stepUpToggleBtnActiveStepUp]}
            onPress={() => {
              Haptics.selectionAsync();
              setHasStepUp(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="trending-up"
              size={14}
              color={hasStepUp ? '#10B981' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                s.stepUpToggleText,
                hasStepUp && { color: '#10B981', fontWeight: '800' },
              ]}
            >
              +10% Annual Step-Up
            </Text>
            {hasStepUp && <Text style={s.stepUpTagDirect}>2x Speed</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* CTA Button */}
      <TouchableOpacity
        style={s.ctaBtn}
        activeOpacity={0.85}
        onPress={handleRunDiagnostic}
        disabled={isAnalyzing}
      >
        <LinearGradient
          colors={selectedFund ? ['#10B981', '#059669'] : ['#1E293B', '#0F172A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.ctaGrad}
        >
          {isAnalyzing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name={selectedFund ? 'pulse' : 'search'}
                size={18}
                color={selectedFund ? '#FFFFFF' : '#64748B'}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  s.ctaText,
                  !selectedFund && { color: '#94A3B8' },
                ]}
              >
                {selectedFund ? 'Check Health' : 'Select a fund first'}
              </Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  // ============================================================
  // RENDER: OUTPUT / RESULTS MODE
  // ============================================================
  const renderOutputMode = () => {
    if (!diagnosis) return null;
    const scoreColor = getScoreColor(diagnosis.healthScore);
    const isHealthy = diagnosis.isHealthy;

    return (
      <Animated.View style={[s.outputContainer, { opacity: fadeAnim }]}>
        {/* Score Hero */}
        <Animated.View
          style={[
            s.scoreHero,
            {
              transform: [
                {
                  scale: scoreAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.85, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Big Score Circle */}
          <View style={[s.scoreRing, { borderColor: scoreColor + '40' }]}>
            <View style={[s.scoreRingInner, { borderColor: scoreColor }]}>
              <Text style={[s.scoreNumber, { color: scoreColor }]}>
                {diagnosis.healthScore}
              </Text>
              <Text style={[s.scoreOutOf, { color: scoreColor + 'AA' }]}>
                / 100
              </Text>
            </View>
          </View>

          {/* Health Status Tag */}
          <View style={[s.healthTag, { backgroundColor: scoreColor + '15' }]}>
            <View style={[s.healthDot, { backgroundColor: scoreColor }]} />
            <Text style={[s.healthTagText, { color: scoreColor }]}>
              {isHealthy ? 'Healthy' : diagnosis.healthScore >= 65 ? 'Needs Attention' : 'Critical'}
            </Text>
          </View>

          {/* Fund Name */}
          <Text style={s.resultFundName} numberOfLines={2}>
            {selectedFund?.name}
          </Text>
          <Text style={s.resultFundMeta}>
            {planType === 'DIRECT' ? 'Direct Plan' : 'Regular Plan'}
            {' \u2022 '}{'\u20B9'}{sipAmount.toLocaleString('en-IN')}/mo
            {' \u2022 '}{hasStepUp ? '+10% Step-Up' : 'Flat SIP'}
            {' \u2022 '}{sipYears} Years
          </Text>
        </Animated.View>

        {/* Verdict Card */}
        <View style={[s.verdictCard, { borderColor: scoreColor + '25' }]}>
          <Text style={s.verdictTitle}>{diagnosis.title}</Text>
          <Text style={s.verdictNote}>{diagnosis.doctorNote}</Text>
        </View>

        {/* Step-Up Diagnostic Audit Card */}
        {!hasStepUp ? (
          <View style={s.stepUpAuditCard}>
            <View style={s.stepUpAuditHeader}>
              <View style={s.stepUpAlertBadge}>
                <Ionicons name="alert-circle" size={13} color="#F59E0B" style={{ marginRight: 4 }} />
                <Text style={s.stepUpAlertBadgeText}>FLAT SIP TRAP DETECTED</Text>
              </View>
              <Text style={s.stepUpGainHighlight}>+{formatWealth(stepUpGain / 100000)} Extra</Text>
            </View>
            <Text style={s.stepUpAuditDesc}>
              Salary/income har saal badhti hai, lekin aapki SIP freeze hai. Har saal sirf 10% Step-Up karne se aapka corpus {formatWealth(flatCorpus / 100000)} se badhkar {formatWealth(stepUpCorpus / 100000)} ho sakta hai!
            </Text>
            <View style={s.stepUpCompareStrip}>
              <View style={s.stepUpCompareItem}>
                <Text style={s.stepUpCompareLbl}>Flat SIP ({sipYears}Y)</Text>
                <Text style={s.stepUpCompareVal}>{formatWealth(flatCorpus / 100000)}</Text>
              </View>
              <Ionicons name="arrow-forward" size={14} color="#64748B" />
              <View style={[s.stepUpCompareItem, s.stepUpCompareItemHighlight]}>
                <Text style={[s.stepUpCompareLbl, { color: '#10B981' }]}>With +10% Step-Up</Text>
                <Text style={[s.stepUpCompareVal, { color: '#10B981' }]}>{formatWealth(stepUpCorpus / 100000)}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={s.stepUpSuccessCard}>
            <Ionicons name="trending-up" size={22} color="#10B981" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.stepUpSuccessTitle}>10% Annual Step-Up Active 🚀</Text>
              <Text style={s.stepUpSuccessDesc}>
                Peak Compounding Mode: 10% annual increment se aapka total corpus ~{formatWealth(stepUpCorpus / 100000)} tak pahuchega.
              </Text>
            </View>
          </View>
        )}

        {/* ===== HEALTHY PATH ===== */}
        {isHealthy ? (
          <>
            {/* Certificate */}
            <View style={s.certCard}>
              <View style={s.certIconRow}>
                <Text style={{ fontSize: 28 }}>{'\uD83C\uDFC6'}</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.certTitle}>Disciplined Investor</Text>
                  <Text style={s.certSub}>
                    Koi naya fund suggest nahi. Aap sahi raaste pe ho!
                  </Text>
                </View>
              </View>

              {/* Compounding Milestones */}
              <View style={s.milestonesRow}>
                {[
                  { yr: 5, val: m5Y, label: 'Base' },
                  { yr: 10, val: m10Y, label: 'Growth' },
                  { yr: 15, val: m15Y, label: 'Power' },
                  { yr: 20, val: m20Y, label: 'Freedom' },
                ].map((m, i) => (
                  <View key={m.yr} style={s.milestoneItem}>
                    <Text style={s.milestoneYear}>{m.yr}Y</Text>
                    <Text
                      style={[
                        s.milestoneAmount,
                        i >= 2 && { color: '#10B981' },
                      ]}
                    >
                      {parseFloat(m.val) >= 100
                        ? `\u20B9${(parseFloat(m.val) / 100).toFixed(1)}Cr`
                        : `\u20B9${m.val}L`}
                    </Text>
                    <Text style={s.milestoneLabel}>{m.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : (
          <>
            {/* ===== UNHEALTHY PATH ===== */}
            {/* Wealth Recovery Banner */}
            {calculatedExtraWealth > 0 && (
              <View style={s.recoveryCard}>
                <View style={s.recoveryIconWrap}>
                  <Ionicons name="trending-up" size={20} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.recoveryLabel}>Recoverable Wealth</Text>
                  <Text style={s.recoveryAmount}>
                    +{formatWealth(calculatedExtraWealth)}
                  </Text>
                  <Text style={s.recoverySub}>over {sipYears} years</Text>
                </View>
              </View>
            )}

            {/* Comparison Card (if replacement available) */}
            {diagnosis.replacement && (
              <View style={s.compareCard}>
                <Text style={s.compareHeader}>Recommended Switch</Text>
                <View style={s.compareGrid}>
                  {/* Current */}
                  <View style={s.compareCol}>
                    <Text style={s.compareColTag}>Current</Text>
                    <Text style={s.compareColName} numberOfLines={2}>
                      {selectedFund?.name}
                    </Text>
                    <View style={s.compareMetric}>
                      <Text style={s.compareMetricLabel}>Expense</Text>
                      <Text style={[s.compareMetricValue, { color: '#F59E0B' }]}>
                        {selectedFund?.currentExpense}
                      </Text>
                    </View>
                    <View style={s.compareMetric}>
                      <Text style={s.compareMetricLabel}>Return</Text>
                      <Text style={s.compareMetricValue}>
                        {selectedFund?.currentCagr}
                      </Text>
                    </View>
                    <View style={s.compareCorpus}>
                      <Text style={s.compareCorpusLabel}>{sipYears}Y Corpus</Text>
                      <Text style={s.compareCorpusValue}>
                        {formatWealth(baseWealthCur)}
                      </Text>
                    </View>
                  </View>

                  {/* Arrow */}
                  <View style={s.compareArrow}>
                    <Ionicons name="arrow-forward" size={16} color="#38BDF8" />
                  </View>

                  {/* Recommended */}
                  <View style={[s.compareCol, s.compareColHighlight]}>
                    <Text style={[s.compareColTag, { color: '#10B981' }]}>
                      Better
                    </Text>
                    <Text style={s.compareColName} numberOfLines={2}>
                      {diagnosis.replacement.name}
                    </Text>
                    <View style={s.compareMetric}>
                      <Text style={s.compareMetricLabel}>Expense</Text>
                      <Text style={[s.compareMetricValue, { color: '#10B981' }]}>
                        {diagnosis.replacement.expenseRatio}
                      </Text>
                    </View>
                    <View style={s.compareMetric}>
                      <Text style={s.compareMetricLabel}>Return</Text>
                      <Text style={[s.compareMetricValue, { color: '#10B981' }]}>
                        {diagnosis.replacement.cagr5Y}
                      </Text>
                    </View>
                    <View style={s.compareCorpus}>
                      <Text
                        style={[s.compareCorpusLabel, { color: '#10B981' }]}
                      >
                        {sipYears}Y Corpus
                      </Text>
                      <Text
                        style={[s.compareCorpusValue, { color: '#10B981' }]}
                      >
                        {formatWealth(baseWealthRep)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <TouchableOpacity
              style={s.actionPrimary}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setMigratingFund({
                  ...selectedFund,
                  lossOver20Y: `\u20B9${calculatedExtraWealth.toFixed(1)} Lakh`,
                  hiddenAgentCommission:
                    selectedFund?.agentCommissionCut || '0.95%',
                });
              }}
            >
              <LinearGradient
                colors={['#38BDF8', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.actionPrimaryGrad}
              >
                <Ionicons
                  name="flash"
                  size={17}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={s.actionPrimaryText}>
                  Switch to Direct Plan
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.actionSecondary}
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setTaxModalVisible(true);
              }}
            >
              <Ionicons
                name="calculator-outline"
                size={15}
                color="#38BDF8"
                style={{ marginRight: 8 }}
              />
              <Text style={s.actionSecondaryText}>
                Tax Harvesting Calculator
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#64748B" />
            </TouchableOpacity>
          </>
        )}

        {/* Re-check / Audit Another */}
        <TouchableOpacity
          style={s.resetBtn}
          activeOpacity={0.7}
          onPress={handleReset}
        >
          <Ionicons name="refresh" size={14} color="#64748B" style={{ marginRight: 6 }} />
          <Text style={s.resetBtnText}>Check Another Fund</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // ============================================================
  // RENDER: SEARCH MODAL
  // ============================================================
  const renderSearchModal = () => (
    <Modal
      visible={searchModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setSearchModalVisible(false)}
    >
      <View style={s.modalOverlay}>
        <View style={s.modalSheet}>
          {/* Handle bar */}
          <View style={s.modalHandle} />

          {/* Header */}
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Select Fund</Text>
            <TouchableOpacity
              onPress={() => setSearchModalVisible(false)}
              style={s.modalCloseBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={s.modalSearchBox}>
            <Ionicons name="search" size={15} color="#64748B" style={{ marginRight: 8 }} />
            <TextInput
              style={s.modalSearchInput}
              placeholder="Search fund name or AMC..."
              placeholderTextColor="#64748B"
              value={modalSearchText}
              onChangeText={setModalSearchText}
              autoFocus={true}
            />
            {modalSearchText.length > 0 && (
              <TouchableOpacity onPress={() => setModalSearchText('')}>
                <Ionicons name="close-circle" size={15} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 10, maxHeight: 32 }}
            contentContainerStyle={{ paddingHorizontal: 2 }}
          >
            {categories.map((cat) => {
              const isActive = categoryFilter === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[s.catPill, isActive && s.catPillActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCategoryFilter(cat.id);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      s.catPillText,
                      isActive && s.catPillTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Fund List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 420 }}
          >
            {filteredModalFunds.map((fund) => {
              const isSelected =
                selectedFund && selectedFund.id === fund.id;
              return (
                <TouchableOpacity
                  key={fund.id}
                  style={[
                    s.fundRow,
                    isSelected && s.fundRowSelected,
                  ]}
                  onPress={() => handleSelectFund(fund)}
                  activeOpacity={0.75}
                >
                  <View style={s.fundRowLeft}>
                    <Text
                      style={[
                        s.fundRowName,
                        isSelected && { color: '#38BDF8' },
                      ]}
                      numberOfLines={1}
                    >
                      {fund.name}
                    </Text>
                    <Text style={s.fundRowMeta}>
                      {fund.category}
                      {' \u2022 '}{fund.currentExpense}
                      {' \u2022 '}{fund.currentCagr}
                    </Text>
                  </View>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={18} color="#38BDF8" />
                  ) : (
                    <Ionicons name="chevron-forward" size={14} color="#475569" />
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Custom Fund Option */}
            {modalSearchText.trim().length > 2 && (
              <TouchableOpacity
                style={s.customFundBtn}
                activeOpacity={0.85}
                onPress={() => handleCustomFundSelect(modalSearchText)}
              >
                <Ionicons
                  name="add-circle"
                  size={17}
                  color="#38BDF8"
                  style={{ marginRight: 8 }}
                />
                <Text style={s.customFundText}>
                  Check "{modalSearchText.trim()}"
                </Text>
                <Ionicons name="arrow-forward" size={14} color="#38BDF8" />
              </TouchableOpacity>
            )}
            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <ScrollView
      style={s.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <AppHeader subtitle="SIP Health Check" onMenuPress={onOpenMenu} />

      {/* Analyzing Overlay */}
      {isAnalyzing && (
        <View style={s.analyzingOverlay}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={s.analyzingText}>Analyzing...</Text>
        </View>
      )}

      {!hasAnalyzed ? renderInputMode() : renderOutputMode()}

      {renderSearchModal()}

      <SIPMigrationModal
        visible={!!migratingFund}
        fund={migratingFund}
        onClose={() => setMigratingFund(null)}
      />

      <TaxHarvestingModal
        visible={taxModalVisible}
        onClose={() => setTaxModalVisible(false)}
      />
    </ScrollView>
  );
}

// ============================================================
// STYLES
// ============================================================
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07090E',
    paddingHorizontal: 16,
  },

  // ---- ANALYZING OVERLAY ----
  analyzingOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  analyzingText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 12,
    fontWeight: '600',
  },

  // ---- INPUT MODE ----
  inputContainer: {
    marginTop: 8,
    gap: 16,
  },

  // Search Trigger
  searchTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  searchIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPlaceholderMain: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
  },
  searchPlaceholderSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  // Selected Fund Card
  selectedFundCard: {
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  selectedFundTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  selectedFundName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.3,
    lineHeight: 21,
  },
  fundMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  fundMetaChip: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  fundMetaDot: {
    fontSize: 8,
    color: '#475569',
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // Metrics Strip
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

  changeFundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  changeFundText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },

  // Config Sections
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

  // Step-Up Toggle Styles
  stepUpStatusBadge: {
    fontSize: 11,
    fontWeight: '700',
  },
  stepUpToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepUpToggleBtn: {
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
  stepUpToggleBtnActiveFlat: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
  },
  stepUpToggleBtnActiveStepUp: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
  },
  stepUpToggleText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
  stepUpTagDirect: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#10B981',
    marginLeft: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },

  // Step-Up Audit Cards in Output Mode
  stepUpAuditCard: {
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  stepUpAuditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stepUpAlertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stepUpAlertBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.4,
  },
  stepUpGainHighlight: {
    fontSize: 14,
    fontWeight: '900',
    color: '#10B981',
  },
  stepUpAuditDesc: {
    fontSize: 11.5,
    color: '#94A3B8',
    lineHeight: 17,
    marginBottom: 10,
  },
  stepUpCompareStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131926',
    borderRadius: 10,
    padding: 8,
    justifyContent: 'space-between',
  },
  stepUpCompareItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepUpCompareItemHighlight: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 8,
    paddingVertical: 4,
  },
  stepUpCompareLbl: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '700',
  },
  stepUpCompareVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 2,
  },
  stepUpSuccessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  stepUpSuccessTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#10B981',
  },
  stepUpSuccessDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 16,
  },

  // Plan Toggle
  planToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  planToggleBtn: {
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
  planToggleBtnActiveDirect: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
  },
  planToggleBtnActiveRegular: {
    borderColor: 'rgba(245, 158, 11, 0.5)',
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
  },
  planToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  planBadgeDirect: {
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
  planBadgeRegular: {
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

  // Pills
  pillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D111A',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  pillWide: {
    flex: 1,
  },
  pillActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  pillActiveGreen: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  pillTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },

  // CTA
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

  // Score Hero
  scoreHero: {
    alignItems: 'center',
    paddingVertical: 16,
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
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
  },
  scoreOutOf: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: -4,
  },

  // Health Tag
  healthTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    marginBottom: 10,
  },
  healthDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  healthTagText: {
    fontSize: 12,
    fontWeight: '800',
  },

  // Result Fund info
  resultFundName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  resultFundMeta: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
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

  // Certificate
  certCard: {
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  certIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  certTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  certSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  milestonesRow: {
    flexDirection: 'row',
    backgroundColor: '#131926',
    borderRadius: 10,
    padding: 10,
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
    fontSize: 14,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 2,
  },
  milestoneLabel: {
    fontSize: 8,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },

  // Recovery Card
  recoveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  recoveryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recoveryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  recoveryAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 2,
  },
  recoverySub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
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
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  compareColTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.3,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  compareColName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
    lineHeight: 15,
  },
  compareMetric: {
    marginBottom: 4,
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
    fontSize: 13,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 1,
  },
  compareArrow: {
    paddingHorizontal: 8,
  },

  // Action Buttons
  actionPrimary: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionPrimaryGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  actionPrimaryText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  actionSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D111A',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  actionSecondaryText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
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

  // ---- MODAL ----
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#07090E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    maxHeight: '85%',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D111A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
    paddingVertical: 0,
  },

  // Category Pills
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: '#0D111A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginRight: 6,
  },
  catPillActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: '#38BDF8',
  },
  catPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  catPillTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },

  // Fund Rows
  fundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D111A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  fundRowSelected: {
    borderColor: 'rgba(56, 189, 248, 0.3)',
    backgroundColor: 'rgba(56, 189, 248, 0.06)',
  },
  fundRowLeft: {
    flex: 1,
    marginRight: 8,
  },
  fundRowName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  fundRowMeta: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },

  // Custom Fund
  customFundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  customFundText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
});
