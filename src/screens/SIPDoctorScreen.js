import AppHeader from '../components/AppHeader';
import React, { useState } from 'react';
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

export default function SIPDoctorScreen({ onOpenMenu }) {
  const [selectedFund, setSelectedFund] = useState(null);
  const [planType, setPlanType] = useState('REGULAR'); // 'REGULAR' | 'DIRECT'
  const [sipAmount, setSipAmount] = useState(10000);
  const [sipYears, setSipYears] = useState(15);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [modalSearchText, setModalSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [migratingFund, setMigratingFund] = useState(null);
  const [taxModalVisible, setTaxModalVisible] = useState(false);

  const sipAmounts = [
    { label: '₹2.5K', value: 2500 },
    { label: '₹5K', value: 5000 },
    { label: '₹10K', value: 10000 },
    { label: '₹25K', value: 25000 },
    { label: '₹50K', value: 50000 },
  ];

  const yearTiers = [
    { label: '5 Yrs', value: 5, tag: 'Base' },
    { label: '10 Yrs', value: 10, tag: 'Growth' },
    { label: '15 Yrs', value: 15, tag: 'Compound' },
    { label: '20 Yrs', value: 20, tag: 'Freedom' },
  ];

  const categories = [
    { id: 'ALL', label: 'All Schemes' },
    { id: 'LARGE', label: 'Large Cap' },
    { id: 'FLEXI', label: 'Flexi Cap' },
    { id: 'MID', label: 'Mid Cap' },
    { id: 'SMALL', label: 'Small Cap' },
    { id: 'HYBRID', label: 'Hybrid' },
    { id: 'ELSS', label: 'ELSS Tax' },
  ];

  const popularFundIds = [
    'parag_parikh_flexicap',
    'nippon_smallcap',
    'hdfc_midcap',
    'quant_smallcap',
    'uti_nifty50_reg',
    'sbi_contra',
  ];
  const popularFunds = mockSIPFundsDatabase.filter((f) => popularFundIds.includes(f.id));

  // Dynamic calculations
  const multiplier = sipAmount / 10000;
  const yearMultiplier = sipYears / 15;
  const baseWealthCur = 46.2 * multiplier * yearMultiplier;
  const baseWealthRep = 84.7 * multiplier * yearMultiplier;
  const calculatedExtraWealth = Math.max(0, baseWealthRep - baseWealthCur);

  const diagnosis = selectedFund
    ? diagnoseFundHealth(selectedFund, planType, sipAmount, sipYears)
    : null;

  // Compounding milestones for healthy portfolio
  const m5Y = (sipAmount * 12 * 5 * 1.55 / 100000).toFixed(1);
  const m10Y = (sipAmount * 12 * 10 * 2.35 / 100000).toFixed(1);
  const m15Y = (sipAmount * 12 * 15 * 4.15 / 100000).toFixed(1);
  const m20Y = (sipAmount * 12 * 20 * 7.55 / 100000).toFixed(1);

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
    }, 550);
  };

  const handleReset = () => {
    Haptics.selectionAsync();
    setHasAnalyzed(false);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Brand Header */}
      <AppHeader
        subtitle="Portfolio Health & Fiduciary Check"
        onMenuPress={onOpenMenu}
      />

      {/* Floating Trust Strip */}
      <View style={styles.fiduciaryStrip}>
        <View style={styles.stripItem}>
          <Ionicons name="medkit" size={13} color="#10B981" />
          <Text style={styles.stripText}>0% Churn Doctor</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Ionicons name="shield-checkmark" size={13} color="#38BDF8" />
          <Text style={styles.stripText}>SEBI Direct Engine</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Ionicons name="cash-outline" size={13} color="#F59E0B" />
          <Text style={styles.stripText}>₹0 Agent Comm.</Text>
        </View>
      </View>

      {!hasAnalyzed ? (
        /* ========================================================= */
        /* INPUT MODE: EXECUTIVE ASSET STUDIO                        */
        /* ========================================================= */
        <View style={styles.studioWrapper}>
          {/* SECTION 1: SCHEME SELECTOR */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>MUTUAL FUND SCHEME</Text>
            <TouchableOpacity
              onPress={() => setSearchModalVisible(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.sectionAction}>Browse 50+ Schemes →</Text>
            </TouchableOpacity>
          </View>

          {!selectedFund ? (
            /* EMPTY STATE: SLEEK SEARCH TRIGGER CARD */
            <TouchableOpacity
              style={styles.searchHeroCard}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSearchModalVisible(true);
              }}
            >
              <LinearGradient
                colors={['#0F172A', '#0D111A']}
                style={styles.searchHeroGrad}
              >
                <View style={styles.searchHeroLeft}>
                  <View style={styles.searchIconAperture}>
                    <Ionicons name="search" size={20} color="#38BDF8" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.searchHeroTitle}>Select Mutual Fund to Audit</Text>
                    <Text style={styles.searchHeroSub}>
                      Audit expense ratio leakage, agent cuts & alpha
                    </Text>
                  </View>
                </View>

                {/* Simulated Input Bar */}
                <View style={styles.simulatedInputBar}>
                  <Ionicons name="search-outline" size={15} color="#64748B" style={{ marginRight: 8 }} />
                  <Text style={styles.simulatedInputText} numberOfLines={1}>
                    Search scheme (Parag Parikh, SBI, HDFC)...
                  </Text>
                  <View style={styles.searchActionPill}>
                    <Text style={styles.searchActionPillText}>Search</Text>
                    <Ionicons name="chevron-forward" size={12} color="#38BDF8" />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            /* ACTIVE FUND CARD: TITANIUM ASSET PREVIEW */
            <View style={styles.assetCard}>
              <View style={styles.assetCardHeader}>
                <View style={styles.assetBadgeRow}>
                  <View style={styles.amcTag}>
                    <Text style={styles.amcTagText}>{selectedFund.amc || 'AMC'}</Text>
                  </View>
                  <View style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>{selectedFund.category}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedFund(null);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.clearChip}
                >
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  <Text style={styles.clearChipText}>Clear</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.assetFundName}>{selectedFund.name}</Text>

              {/* 3 Metric Output Grid */}
              <View style={styles.assetMetricsRow}>
                <View style={styles.assetMetricCol}>
                  <Text style={styles.assetMetricLbl}>EXPENSE</Text>
                  <Text style={styles.assetMetricVal}>{selectedFund.currentExpense}</Text>
                </View>
                <View style={styles.assetMetricDivider} />
                <View style={styles.assetMetricCol}>
                  <Text style={styles.assetMetricLbl}>5Y CAGR</Text>
                  <Text style={[styles.assetMetricVal, { color: '#10B981' }]}>
                    {selectedFund.currentCagr}
                  </Text>
                </View>
                <View style={styles.assetMetricDivider} />
                <View style={styles.assetMetricCol}>
                  <Text style={styles.assetMetricLbl}>ALPHA</Text>
                  <Text
                    style={[
                      styles.assetMetricVal,
                      { color: selectedFund.alphaVsBenchmark?.includes('-') ? '#EF4444' : '#38BDF8' },
                    ]}
                  >
                    {selectedFund.alphaVsBenchmark || '+0.0%'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.changeFundRow}
                onPress={() => setSearchModalVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="swap-horizontal" size={14} color="#38BDF8" style={{ marginRight: 6 }} />
                <Text style={styles.changeFundText}>Change Scheme</Text>
                <Ionicons name="chevron-forward" size={13} color="#38BDF8" />
              </TouchableOpacity>
            </View>
          )}

          {/* Quick-Pick Popular Scheme Carousel */}
          <View style={styles.quickPicksWrapper}>
            <Text style={styles.quickPicksHeader}>POPULAR BENCHMARKS (1-TAP):</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 10 }}
            >
              {popularFunds.map((fund) => {
                const isCur = selectedFund && selectedFund.id === fund.id;
                const shortName = fund.name
                  .replace(' Fund', '')
                  .replace(' (Regular)', '')
                  .replace(' Opportunities', '')
                  .replace(' Prudential', '');

                return (
                  <TouchableOpacity
                    key={fund.id}
                    style={[styles.quickPickChip, isCur && styles.quickPickChipActive]}
                    onPress={() => handleSelectFund(fund)}
                    activeOpacity={0.75}
                  >
                    {isCur ? (
                      <Ionicons name="checkmark-circle" size={12} color="#38BDF8" style={{ marginRight: 5 }} />
                    ) : (
                      <Ionicons name="flash" size={11} color="#F59E0B" style={{ marginRight: 5 }} />
                    )}
                    <Text style={[styles.quickPickChipText, isCur && styles.quickPickChipTextActive]}>
                      {shortName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* SECTION 2: PLAN SELECTOR (DIRECT VS REGULAR) */}
          <Text style={[styles.sectionTitle, { marginTop: 16, marginBottom: 8 }]}>PLAN ARCHITECTURE</Text>
          <View style={styles.planSelectorGrid}>
            {/* Direct Plan */}
            <TouchableOpacity
              style={[
                styles.planCard,
                planType === 'DIRECT' && styles.planCardActiveDirect,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setPlanType('DIRECT');
              }}
              activeOpacity={0.85}
            >
              <View style={styles.planCardTop}>
                <View style={[styles.planIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Ionicons name="flash" size={15} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planCardTitle, planType === 'DIRECT' && { color: '#10B981' }]}>
                    Direct Plan
                  </Text>
                  <Text style={styles.planBadgeGreen}>0% Commission</Text>
                </View>
                {planType === 'DIRECT' && (
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                )}
              </View>
              <Text style={styles.planCardSub}>Zerodha, Groww Direct, AMC Online</Text>
            </TouchableOpacity>

            {/* Regular Plan */}
            <TouchableOpacity
              style={[
                styles.planCard,
                planType === 'REGULAR' && styles.planCardActiveRegular,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setPlanType('REGULAR');
              }}
              activeOpacity={0.85}
            >
              <View style={styles.planCardTop}>
                <View style={[styles.planIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Ionicons name="business" size={15} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planCardTitle, planType === 'REGULAR' && { color: '#F59E0B' }]}>
                    Regular Plan
                  </Text>
                  <Text style={styles.planBadgeAmber}>~1% Annual Cut</Text>
                </View>
                {planType === 'REGULAR' && (
                  <Ionicons name="checkmark-circle" size={18} color="#F59E0B" />
                )}
              </View>
              <Text style={styles.planCardSub}>Bank Branch, RM, Agent Broker</Text>
            </TouchableOpacity>
          </View>

          {/* SECTION 3: SIP ALLOCATION & HORIZON CARD */}
          <View style={styles.wealthScalerCard}>
            <View style={styles.scalerHeaderRow}>
              <View>
                <Text style={styles.scalerLabel}>MONTHLY SIP ALLOCATION</Text>
                <Text style={styles.scalerValue}>
                  ₹{sipAmount.toLocaleString('en-IN')}{' '}
                  <Text style={styles.scalerUnit}>/ month</Text>
                </Text>
              </View>
              <View style={styles.horizonBadge}>
                <Ionicons name="time-outline" size={12} color="#38BDF8" style={{ marginRight: 4 }} />
                <Text style={styles.horizonBadgeText}>{sipYears} Years</Text>
              </View>
            </View>

            {/* Amount Pills */}
            <View style={styles.amountPillsRow}>
              {sipAmounts.map((tier) => {
                const isSelected = sipAmount === tier.value;
                return (
                  <TouchableOpacity
                    key={tier.value}
                    style={[styles.scalerPill, isSelected && styles.scalerPillActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSipAmount(tier.value);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.scalerPillText, isSelected && styles.scalerPillTextActive]}>
                      {tier.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.scalerDivider} />

            {/* Horizon Pills */}
            <Text style={[styles.scalerLabel, { marginBottom: 8 }]}>INVESTMENT HORIZON</Text>
            <View style={styles.amountPillsRow}>
              {yearTiers.map((tier) => {
                const isSelected = sipYears === tier.value;
                return (
                  <TouchableOpacity
                    key={tier.value}
                    style={[styles.scalerPill, isSelected && styles.scalerPillActiveGreen]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSipYears(tier.value);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.scalerPillText, isSelected && { color: '#10B981', fontWeight: '800' }]}>
                      {tier.label}
                    </Text>
                    <Text style={[styles.scalerPillSub, isSelected && { color: '#10B981' }]}>
                      {tier.tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* PRIMARY AUDIT CTA */}
          <TouchableOpacity
            style={styles.primaryCta}
            activeOpacity={0.88}
            onPress={handleRunDiagnostic}
            disabled={isAnalyzing}
          >
            <LinearGradient
              colors={['#38BDF8', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryCtaGrad}
            >
              {isAnalyzing ? (
                <View style={styles.ctaInner}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 10 }} />
                  <Text style={styles.ctaTitle}>AUDITING WEALTH HEALTH...</Text>
                </View>
              ) : (
                <View style={styles.ctaInner}>
                  <View style={styles.ctaIconBox}>
                    <Ionicons name={selectedFund ? 'pulse' : 'search'} size={18} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.ctaTitle}>
                      {selectedFund ? 'DIAGNOSE PORTFOLIO HEALTH' : 'SELECT SCHEME TO AUDIT'}
                    </Text>
                    <Text style={styles.ctaSub}>
                      {selectedFund
                        ? 'Fiduciary diagnosis • Zero unnecessary churn'
                        : 'Choose from 50+ SEBI registered funds'}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        /* ========================================================= */
        /* OUTPUT MODE: INSTITUTIONAL CLINICAL REPORT                */
        /* ========================================================= */
        <View style={styles.reportContainer}>
          {/* Main Health Card with Visual Gauge Badge */}
          <View style={[styles.reportMainCard, { borderColor: diagnosis?.healthColor + '40' }]}>
            <View style={styles.reportTopRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.reportLabel}>CLINICAL VERDICT</Text>
                <Text style={styles.reportFundTitle}>{selectedFund?.name}</Text>
                <Text style={styles.reportFundPlan}>
                  {selectedFund?.amc || 'Mutual Fund'} • {planType === 'DIRECT' ? 'Direct Plan (0% Cut)' : 'Regular Plan'}
                </Text>
              </View>

              {/* Luminous Health Score Ring */}
              <View style={[styles.scoreDialBadge, { backgroundColor: diagnosis?.healthColor + '15', borderColor: diagnosis?.healthColor + '30' }]}>
                <Ionicons name="medkit" size={14} color={diagnosis?.healthColor} style={{ marginRight: 4 }} />
                <Text style={[styles.scoreDialNumber, { color: diagnosis?.healthColor }]}>
                  {diagnosis?.healthScore}
                </Text>
                <Text style={[styles.scoreDialMax, { color: diagnosis?.healthColor }]}>/100</Text>
              </View>
            </View>

            {/* Status Aura Strip */}
            <View style={[styles.verdictAuraStrip, { backgroundColor: diagnosis?.healthColor + '12' }]}>
              <View style={[styles.verdictAuraDot, { backgroundColor: diagnosis?.healthColor }]} />
              <Text style={[styles.verdictAuraText, { color: diagnosis?.healthColor }]}>
                {diagnosis?.healthTag}
              </Text>
            </View>

            <Text style={styles.verdictSummaryText}>
              {diagnosis?.isHealthy
                ? 'Aapka portfolio bilkul swasth hai. Direct Plan me hone ki wajah se koi agent commission leak nahi ho raha hai aur fund category benchmark ko beat kar raha hai. 19-20 ka mamuli market cycle fark normal hai — bar-bar fund switch karke exit load aur tax ka nuksan mat kijiye. Stay the course!'
                : diagnosis?.statusType === 'SWITCH_TO_DIRECT'
                ? 'Aapka fund manager aur portfolio solid hai, lekin Regular Plan hone se har saal ~1% distributor commission cut lag raha hai. Aapko naya fund lene ki zaroorat nahi hai, bas isi fund ke Direct Plan me switch karein.'
                : `${selectedFund?.name} pichhle 3 saal se apne category benchmark se ${selectedFund?.alphaVsBenchmark} peechhe chal raha hai. Low-cost Direct Index Fund me shift karna faydemand rahega.`}
            </Text>

            {/* Doctor's Actionable Prescription (Compact Points) */}
            <View style={styles.prescriptionCard}>
              <View style={styles.prescriptionHeader}>
                <Ionicons name="receipt-outline" size={14} color="#38BDF8" style={{ marginRight: 6 }} />
                <Text style={styles.prescriptionHeading}>DOCTOR'S PRESCRIPTION (ILAJ):</Text>
              </View>
              <Text style={styles.prescriptionActionText}>{diagnosis?.prescription}</Text>
              {diagnosis?.prescriptionPoints?.map((pt, idx) => (
                <View key={idx} style={styles.prescriptionBulletRow}>
                  <Ionicons name="checkmark-circle" size={13} color="#10B981" style={{ marginTop: 2, marginRight: 6 }} />
                  <Text style={styles.prescriptionBulletText}>{pt}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ======================================================== */}
          {/* SCENARIO 1: HEALTHY (19-20 FARK -> ZERO CHURN!)         */}
          {/* ======================================================== */}
          {diagnosis?.isHealthy ? (
            <View style={styles.healthySection}>
              {/* Disciplined Investor Certificate */}
              <View style={styles.certCard}>
                <View style={styles.certHeader}>
                  <Ionicons name="trophy" size={22} color="#F59E0B" style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.certTitle}>Certified Disciplined Investor 🏆</Text>
                    <Text style={styles.certSub}>Zero-Churn Protocol Active: No new fund suggested</Text>
                  </View>
                </View>

                {/* Compounding Milestones Grid */}
                <Text style={styles.milestoneGridHeader}>
                  YOUR COMPOUNDING ROADMAP (AT ₹{sipAmount.toLocaleString('en-IN')}/MO):
                </Text>
                <View style={styles.milestoneGrid}>
                  <View style={styles.milestoneBox}>
                    <Text style={styles.mYearLabel}>5 Yrs</Text>
                    <Text style={styles.mAmtText}>₹{m5Y}L</Text>
                    <Text style={styles.mPhaseLabel}>Base</Text>
                  </View>
                  <View style={styles.milestoneBox}>
                    <Text style={styles.mYearLabel}>10 Yrs</Text>
                    <Text style={styles.mAmtText}>₹{m10Y}L</Text>
                    <Text style={styles.mPhaseLabel}>Growth</Text>
                  </View>
                  <View style={styles.milestoneBox}>
                    <Text style={styles.mYearLabel}>15 Yrs</Text>
                    <Text style={[styles.mAmtText, { color: '#38BDF8' }]}>₹{m15Y}L</Text>
                    <Text style={styles.mPhaseLabel}>Compounding</Text>
                  </View>
                  <View style={styles.milestoneBox}>
                    <Text style={styles.mYearLabel}>20 Yrs</Text>
                    <Text style={[styles.mAmtText, { color: '#10B981' }]}>
                      {parseFloat(m20Y) >= 100 ? `₹${(parseFloat(m20Y) / 100).toFixed(2)}Cr` : `₹${m20Y}L`}
                    </Text>
                    <Text style={styles.mPhaseLabel}>Freedom</Text>
                  </View>
                </View>
              </View>

              {/* Audit Another Button */}
              <TouchableOpacity style={styles.auditAnotherBtn} activeOpacity={0.8} onPress={handleReset}>
                <Ionicons name="refresh" size={15} color="#94A3B8" style={{ marginRight: 8 }} />
                <Text style={styles.auditAnotherText}>Audit Another Mutual Fund Scheme</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ======================================================== */
            /* SCENARIO 2 & 3: LEAKAGE REMEDY & BATTLE CARD             */
            /* ======================================================== */
            <View style={styles.remedySection}>
              {/* Extra Wealth Recoverable Banner */}
              {calculatedExtraWealth > 0 && (
                <View style={styles.recoverableBanner}>
                  <Ionicons name="trending-up" size={26} color="#10B981" />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.recoverableLabel}>TOTAL WEALTH RECOVERABLE ({sipYears} YEARS)</Text>
                    <Text style={styles.recoverableAmount}>
                      +₹{calculatedExtraWealth >= 100 ? (calculatedExtraWealth / 100).toFixed(2) + ' Crore' : calculatedExtraWealth.toFixed(1) + ' Lakh'}
                    </Text>
                    <Text style={styles.recoverableSub}>
                      {diagnosis?.statusType === 'SWITCH_TO_DIRECT'
                        ? 'Saves 100% of distributor commission deductions in your family wealth.'
                        : 'Compounded gain by eliminating commission drain & trailing benchmark alpha.'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Head-to-Head Resolution Battle Card */}
              {diagnosis?.replacement && (
                <View style={styles.battleCard}>
                  <Text style={styles.battleTitle}>RECOMMENDED DIRECT RESOLUTION</Text>
                  <View style={styles.battleRow}>
                    {/* Left: Current Fund */}
                    <View style={styles.battleCol}>
                      <View style={styles.battleTagCurrent}>
                        <Text style={styles.battleTagCurrentText}>YOUR FUND</Text>
                      </View>
                      <Text style={styles.battleFundName} numberOfLines={2}>
                        {selectedFund?.name}
                      </Text>
                      <Text style={styles.battlePlanSub}>
                        {planType === 'DIRECT' ? 'Direct Plan' : 'Regular (Bank)'}
                      </Text>

                      <View style={styles.battleMetric}>
                        <Text style={styles.battleMetricLbl}>Expense Ratio</Text>
                        <Text style={[styles.battleMetricVal, { color: '#F59E0B' }]}>
                          {selectedFund?.currentExpense}
                        </Text>
                      </View>
                      <View style={styles.battleMetric}>
                        <Text style={styles.battleMetricLbl}>5Y Return</Text>
                        <Text style={styles.battleMetricVal}>{selectedFund?.currentCagr} CAGR</Text>
                      </View>
                      <View style={styles.battleCorpusBox}>
                        <Text style={styles.battleCorpusLbl}>{sipYears}Y Corpus</Text>
                        <Text style={styles.battleCorpusVal}>
                          ₹{baseWealthCur >= 100 ? (baseWealthCur / 100).toFixed(2) + ' Cr' : baseWealthCur.toFixed(1) + ' L'}
                        </Text>
                      </View>
                    </View>

                    {/* VS Badge */}
                    <View style={styles.battleVs}>
                      <View style={styles.vsCircle}>
                        <Text style={styles.vsText}>VS</Text>
                      </View>
                    </View>

                    {/* Right: Recommended Direct Alternative */}
                    <View style={[styles.battleCol, styles.battleColWinner]}>
                      <View style={styles.battleTagWinner}>
                        <Text style={styles.battleTagWinnerText}>RECOMMENDED</Text>
                      </View>
                      <Text style={styles.battleFundName} numberOfLines={2}>
                        {diagnosis.replacement.name}
                      </Text>
                      <Text style={[styles.battlePlanSub, { color: '#38BDF8' }]}>
                        Direct Plan (0% Cut)
                      </Text>

                      <View style={styles.battleMetric}>
                        <Text style={styles.battleMetricLbl}>Expense Ratio</Text>
                        <Text style={[styles.battleMetricVal, { color: '#10B981' }]}>
                          {diagnosis.replacement.expenseRatio}
                        </Text>
                      </View>
                      <View style={styles.battleMetric}>
                        <Text style={styles.battleMetricLbl}>5Y Return</Text>
                        <Text style={[styles.battleMetricVal, { color: '#10B981' }]}>
                          {diagnosis.replacement.cagr5Y} CAGR
                        </Text>
                      </View>
                      <View style={[styles.battleCorpusBox, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
                        <Text style={[styles.battleCorpusLbl, { color: '#38BDF8' }]}>
                          {sipYears}Y Estimated
                        </Text>
                        <Text style={[styles.battleCorpusVal, { color: '#38BDF8' }]}>
                          ₹{baseWealthRep >= 100 ? (baseWealthRep / 100).toFixed(2) + ' Cr' : baseWealthRep.toFixed(1) + ' L'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                {/* 1. Direct Switch Guide */}
                <TouchableOpacity
                  style={styles.switchBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setMigratingFund({
                      ...selectedFund,
                      lossOver20Y: `₹${calculatedExtraWealth.toFixed(1)} Lakh`,
                      hiddenAgentCommission: selectedFund?.agentCommissionCut || '0.95%',
                    });
                  }}
                >
                  <LinearGradient
                    colors={['#38BDF8', '#2563EB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.switchBtnGrad}
                  >
                    <Ionicons name="flash" size={17} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.switchBtnTitle}>Zero-Tax Direct Switch Roadmap →</Text>
                      <Text style={styles.switchBtnSub}>Paperless guide for MFCentral, Zerodha Coin & Groww</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={17} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>

                {/* 2. Tax Harvesting Button */}
                <TouchableOpacity
                  style={styles.taxBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setTaxModalVisible(true);
                  }}
                >
                  <Ionicons name="calculator-outline" size={16} color="#38BDF8" style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taxBtnTitle}>Claim ₹1.25L Tax-Free LTCG Harvest</Text>
                    <Text style={styles.taxBtnSub}>Section 112A lets you switch gains with ₹0 tax liability</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={15} color="#64748B" />
                </TouchableOpacity>

                {/* 3. Audit Another */}
                <TouchableOpacity style={styles.auditAnotherBtn} activeOpacity={0.8} onPress={handleReset}>
                  <Ionicons name="refresh" size={15} color="#94A3B8" style={{ marginRight: 8 }} />
                  <Text style={styles.auditAnotherText}>Audit Another Mutual Fund Scheme</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* COMPREHENSIVE SEARCH & SELECT DRAWER */}
      <Modal
        visible={searchModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Select Mutual Fund Scheme</Text>
                <Text style={styles.modalSub}>Search 50+ SEBI registered funds or type any scheme</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSearchModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchInputBox}>
              <Ionicons name="search" size={16} color="#64748B" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.modalSearchTextInput}
                placeholder="Search fund name, AMC, or category..."
                placeholderTextColor="#64748B"
                value={modalSearchText}
                onChangeText={setModalSearchText}
                autoFocus={true}
              />
              {modalSearchText.length > 0 && (
                <TouchableOpacity onPress={() => setModalSearchText('')}>
                  <Ionicons name="close-circle" size={16} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 12, maxHeight: 34 }}
              contentContainerStyle={{ paddingHorizontal: 2 }}
            >
              {categories.map((cat) => {
                const isCatActive = categoryFilter === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.modalCatPill, isCatActive && styles.modalCatPillActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setCategoryFilter(cat.id);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.modalCatPillText, isCatActive && styles.modalCatPillTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {filteredModalFunds.map((fund) => {
                const isSelected = selectedFund && selectedFund.id === fund.id;
                return (
                  <TouchableOpacity
                    key={fund.id}
                    style={[styles.modalFundRow, isSelected && styles.modalFundRowSelected]}
                    onPress={() => handleSelectFund(fund)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.modalFundIconCircle, isSelected && { backgroundColor: 'rgba(56, 189, 248, 0.2)' }]}>
                      <Ionicons
                        name={isSelected ? 'checkmark' : 'shield-checkmark-outline'}
                        size={15}
                        color={isSelected ? '#38BDF8' : '#64748B'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalFundName, isSelected && { color: '#38BDF8', fontWeight: '800' }]} numberOfLines={1}>
                        {fund.name}
                      </Text>
                      <Text style={styles.modalFundMeta}>
                        {fund.amc || 'AMC'} • {fund.category} • Fee: {fund.currentExpense}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="#64748B" />
                  </TouchableOpacity>
                );
              })}

              {modalSearchText.trim().length > 2 && (
                <TouchableOpacity
                  style={styles.customAuditCard}
                  activeOpacity={0.85}
                  onPress={() => handleCustomFundSelect(modalSearchText)}
                >
                  <LinearGradient
                    colors={['#131D2E', '#0B111E']}
                    style={styles.customAuditGrad}
                  >
                    <Ionicons name="sparkles" size={17} color="#38BDF8" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customAuditTitle}>
                        Audit Custom Scheme: "{modalSearchText.trim()}"
                      </Text>
                      <Text style={styles.customAuditSub}>
                        Algorithmically evaluate expense ratio & benchmark alpha
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={15} color="#38BDF8" />
                  </LinearGradient>
                </TouchableOpacity>
              )}
              <View style={{ height: 25 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MIGRATION ROADMAP MODAL */}
      <SIPMigrationModal
        visible={!!migratingFund}
        fund={migratingFund}
        onClose={() => setMigratingFund(null)}
      />

      {/* TAX HARVESTING MODAL */}
      <TaxHarvestingModal
        visible={taxModalVisible}
        onClose={() => setTaxModalVisible(false)}
      />

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07090E',
    paddingHorizontal: 16,
  },
  fiduciaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0D111A',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  stripItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  stripText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  stripDivider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  studioWrapper: {
    gap: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  sectionAction: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#38BDF8',
  },
  searchHeroCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  searchHeroGrad: {
    padding: 16,
  },
  searchHeroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  searchIconAperture: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  searchHeroTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  searchHeroSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 15,
  },
  simulatedInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#07090E',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  simulatedInputText: {
    flex: 1,
    fontSize: 12,
    color: '#94A3B8',
  },
  searchActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
  },
  searchActionPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
  },
  assetCard: {
    backgroundColor: '#0D111A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  assetCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  assetBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  amcTag: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  amcTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.4,
  },
  categoryTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  clearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  clearChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  assetFundName: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  assetMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131926',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: 12,
  },
  assetMetricCol: {
    flex: 1,
    alignItems: 'center',
  },
  assetMetricLbl: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  assetMetricVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  assetMetricDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  changeFundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  changeFundText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38BDF8',
    marginRight: 4,
  },
  quickPicksWrapper: {
    marginTop: 12,
  },
  quickPicksHeader: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  quickPickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D111A',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  quickPickChipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  quickPickChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  quickPickChipTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  planSelectorGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  planCard: {
    flex: 1,
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  planCardActiveDirect: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  planCardActiveRegular: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  planCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  planIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCardTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  planBadgeGreen: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.3,
  },
  planBadgeAmber: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.3,
  },
  planCardSub: {
    fontSize: 9.5,
    color: '#94A3B8',
    lineHeight: 13,
  },
  wealthScalerCard: {
    backgroundColor: '#0D111A',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  scalerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  scalerLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  scalerValue: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  scalerUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  horizonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  horizonBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#38BDF8',
  },
  amountPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  scalerPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#131926',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  scalerPillActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  scalerPillActiveGreen: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  scalerPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  scalerPillTextActive: {
    color: '#38BDF8',
    fontWeight: '900',
  },
  scalerPillSub: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  scalerDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 12,
  },
  primaryCta: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  primaryCtaGrad: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ctaIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  ctaSub: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.88)',
    marginTop: 2,
  },
  reportContainer: {
    gap: 12,
  },
  reportMainCard: {
    backgroundColor: '#0D111A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  reportTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  reportLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  reportFundTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  reportFundPlan: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  scoreDialBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  scoreDialNumber: {
    fontSize: 16,
    fontWeight: '900',
  },
  scoreDialMax: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 1,
  },
  verdictAuraStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
    marginBottom: 8,
  },
  verdictAuraDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  verdictAuraText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  verdictSummaryText: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
    marginBottom: 12,
  },
  prescriptionCard: {
    backgroundColor: '#131926',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  prescriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  prescriptionHeading: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.5,
  },
  prescriptionActionText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  prescriptionBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  prescriptionBulletText: {
    fontSize: 10.5,
    color: '#94A3B8',
    flex: 1,
    lineHeight: 15,
  },
  healthySection: {
    gap: 12,
  },
  certCard: {
    backgroundColor: '#0D111A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  certHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  certTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  certSub: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  milestoneGridHeader: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  milestoneGrid: {
    flexDirection: 'row',
    backgroundColor: '#131926',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  milestoneBox: {
    flex: 1,
    alignItems: 'center',
  },
  mYearLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  mAmtText: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  mPhaseLabel: {
    fontSize: 8.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  auditAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D111A',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 4,
  },
  auditAnotherText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  remedySection: {
    gap: 12,
  },
  recoverableBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D111A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  recoverableLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  recoverableAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  recoverableSub: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 14,
  },
  battleCard: {
    backgroundColor: '#0D111A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  battleTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  battleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  battleCol: {
    flex: 1,
    backgroundColor: '#131926',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  battleColWinner: {
    borderColor: 'rgba(56, 189, 248, 0.35)',
    backgroundColor: 'rgba(56, 189, 248, 0.06)',
  },
  battleTagCurrent: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  battleTagCurrentText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#94A3B8',
  },
  battleTagWinner: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  battleTagWinnerText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#38BDF8',
  },
  battleFundName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  battlePlanSub: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 1,
    marginBottom: 6,
  },
  battleMetric: {
    marginTop: 4,
  },
  battleMetricLbl: {
    fontSize: 8.5,
    color: '#64748B',
  },
  battleMetricVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  battleCorpusBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 6,
    padding: 6,
    marginTop: 8,
  },
  battleCorpusLbl: {
    fontSize: 8.5,
    color: '#64748B',
  },
  battleCorpusVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 1,
  },
  battleVs: {
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  vsText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#94A3B8',
  },
  actionRow: {
    gap: 10,
    marginTop: 2,
  },
  switchBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  switchBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  switchBtnTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  switchBtnSub: {
    fontSize: 9.5,
    color: 'rgba(255, 255, 255, 0.88)',
    marginTop: 2,
  },
  taxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  taxBtnTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  taxBtnSub: {
    fontSize: 9.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#07090E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '88%',
    paddingTop: 18,
    paddingHorizontal: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  modalSub: {
    fontSize: 10.5,
    color: '#94A3B8',
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
  modalSearchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D111A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  modalSearchTextInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#FFFFFF',
    fontWeight: '500',
    paddingVertical: 0,
  },
  modalCatPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0D111A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginRight: 6,
  },
  modalCatPillActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
  },
  modalCatPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  modalCatPillTextActive: {
    color: '#38BDF8',
  },
  modalFundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D111A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalFundRowSelected: {
    borderColor: 'rgba(56, 189, 248, 0.4)',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  modalFundIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalFundName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalFundMeta: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  customAuditCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  customAuditGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  customAuditTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#38BDF8',
  },
  customAuditSub: {
    fontSize: 9.5,
    color: '#94A3B8',
    marginTop: 2,
  },
});
