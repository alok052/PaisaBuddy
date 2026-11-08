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
  const [selectedFund, setSelectedFund] = useState(mockSIPFundsDatabase[0]);
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
    { id: 'ALL', label: 'All Funds' },
    { id: 'LARGE', label: 'Large Cap' },
    { id: 'FLEXI', label: 'Flexi & Multi' },
    { id: 'MID', label: 'Mid Cap' },
    { id: 'SMALL', label: 'Small Cap' },
    { id: 'HYBRID', label: 'Hybrid / BAF' },
    { id: 'ELSS', label: 'ELSS Tax' },
  ];

  // Quick popular picks for 1-tap testing
  const popularFundIds = [
    'parag_parikh_flexicap',
    'nippon_smallcap',
    'hdfc_midcap',
    'quant_smallcap',
    'uti_nifty50_reg',
    'sbi_contra',
    'axis_bluechip',
    'icici_bluechip',
  ];
  const popularFunds = mockSIPFundsDatabase.filter((f) => popularFundIds.includes(f.id));

  // Dynamic calculations based on SIP amount & years
  const multiplier = sipAmount / 10000;
  const yearMultiplier = sipYears / 15;
  const baseWealthCur = 46.2 * multiplier * yearMultiplier;
  const baseWealthRep = 84.7 * multiplier * yearMultiplier;
  const calculatedExtraWealth = Math.max(0, baseWealthRep - baseWealthCur);

  // Diagnostic outcome calculation
  const diagnosis = diagnoseFundHealth(selectedFund, planType, sipAmount, sipYears);

  // Compounding milestones for healthy portfolio
  const m5Y = (sipAmount * 12 * 5 * 1.55 / 100000).toFixed(1);
  const m10Y = (sipAmount * 12 * 10 * 2.35 / 100000).toFixed(1);
  const m15Y = (sipAmount * 12 * 15 * 4.15 / 100000).toFixed(1);
  const m20Y = (sipAmount * 12 * 20 * 7.55 / 100000).toFixed(1);

  // Filter fund database for modal search
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsAnalyzing(true);

    setTimeout(() => {
      setIsAnalyzing(false);
      setHasAnalyzed(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 600);
  };

  const handleReset = () => {
    Haptics.selectionAsync();
    setHasAnalyzed(false);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Premium Brand Header */}
      <AppHeader
        subtitle="Portfolio Health & Leakage Audit"
        onMenuPress={onOpenMenu}
      />

      {/* Fiduciary Guarantee Strip (Native floating surface) */}
      <View style={styles.fiduciaryBanner}>
        <View style={styles.fiduciaryItem}>
          <Ionicons name="medkit" size={13} color="#10B981" />
          <Text style={styles.fiduciaryText} numberOfLines={1}>0% Churn Doctor</Text>
        </View>
        <View style={styles.fiduciaryDivider} />
        <View style={styles.fiduciaryItem}>
          <Ionicons name="shield-checkmark" size={13} color="#38BDF8" />
          <Text style={styles.fiduciaryText} numberOfLines={1}>SEBI Direct Engine</Text>
        </View>
        <View style={styles.fiduciaryDivider} />
        <View style={styles.fiduciaryItem}>
          <Ionicons name="cash-outline" size={13} color="#F59E0B" />
          <Text style={styles.fiduciaryText} numberOfLines={1}>₹0 Agent Comm.</Text>
        </View>
      </View>

      {!hasAnalyzed ? (
        /* ========================================================= */
        /* OPEN NATIVE INPUT LAYOUT (NO MONOLITHIC BOX CONTAINER)    */
        /* ========================================================= */
        <View style={styles.openContentWrapper}>
          {/* Hero Editorial Header */}
          <View style={styles.heroSection}>
            <View style={styles.heroAuraPill}>
              <View style={styles.heroPulseDot} />
              <Text style={styles.heroAuraText}>CLINICAL PORTFOLIO AUDIT</Text>
            </View>
            <Text style={styles.heroTitle}>Is your SIP leaking wealth?</Text>
            <Text style={styles.heroSubtitle}>
              Detect silent ~1% regular commission drains, verify benchmark alpha, or confirm your portfolio fitness.
            </Text>
          </View>

          {/* SECTION 1: ACTIVE SCHEME SHOWCASE (TITANIUM ASSET CARD) */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>1. SCHEME UNDER EXAMINATION</Text>
            <TouchableOpacity
              onPress={() => setSearchModalVisible(true)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.sectionActionText}>Browse 50+ →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroAssetCard}>
            {/* Asset Top Tags */}
            <View style={styles.assetTagRow}>
              <View style={styles.assetAmcBadge}>
                <Text style={styles.assetAmcText}>{selectedFund.amc || 'MUTUAL FUND'}</Text>
              </View>
              <View style={styles.assetCategoryBadge}>
                <Text style={styles.assetCategoryText}>{selectedFund.category}</Text>
              </View>
              <View style={styles.assetStarBadge}>
                <Ionicons name="star" size={10} color="#F59E0B" style={{ marginRight: 3 }} />
                <Text style={styles.assetStarText}>Top Rated</Text>
              </View>
            </View>

            {/* Scheme Name */}
            <Text style={styles.assetTitle}>{selectedFund.name}</Text>

            {/* Micro Metrics Grid */}
            <View style={styles.assetMetricsGrid}>
              <View style={styles.assetMetricCol}>
                <Text style={styles.assetMetricLabel}>EXPENSE RATIO</Text>
                <Text style={styles.assetMetricValue}>{selectedFund.currentExpense}</Text>
                <Text style={styles.assetMetricSub}>
                  {planType === 'DIRECT' ? 'Direct (0% Cut)' : 'Regular Plan'}
                </Text>
              </View>
              <View style={styles.assetMetricDivider} />
              <View style={styles.assetMetricCol}>
                <Text style={styles.assetMetricLabel}>5Y CAGR</Text>
                <Text style={[styles.assetMetricValue, { color: '#10B981' }]}>
                  {selectedFund.currentCagr}
                </Text>
                <Text style={styles.assetMetricSub}>Historical</Text>
              </View>
              <View style={styles.assetMetricDivider} />
              <View style={styles.assetMetricCol}>
                <Text style={styles.assetMetricLabel}>BENCHMARK</Text>
                <Text style={styles.assetMetricValue} numberOfLines={1}>
                  {selectedFund.benchmarkName || 'Nifty 50'}
                </Text>
                <Text style={styles.assetMetricSub}>
                  Alpha: {selectedFund.alphaVsBenchmark || '+0.0%'}
                </Text>
              </View>
            </View>

            {/* Change Fund Trigger Button */}
            <TouchableOpacity
              style={styles.assetChangeBtn}
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSearchModalVisible(true);
              }}
            >
              <Ionicons name="search" size={14} color="#38BDF8" style={{ marginRight: 6 }} />
              <Text style={styles.assetChangeBtnText}>Switch Scheme (Search 50+ Funds)</Text>
              <Ionicons name="chevron-forward" size={14} color="#38BDF8" />
            </TouchableOpacity>
          </View>

          {/* Quick-Pick Popular Scheme Chips */}
          <View style={styles.quickPickContainer}>
            <Text style={styles.quickPickHeaderLabel}>QUICK BENCHMARK PICKS (1-TAP):</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 10 }}
            >
              {popularFunds.map((fund) => {
                const isCur = selectedFund.id === fund.id;
                const shortName = fund.name
                  .replace(' Fund', '')
                  .replace(' (Regular)', '')
                  .replace(' Opportunities', '')
                  .replace(' Prudential', '');

                return (
                  <TouchableOpacity
                    key={fund.id}
                    style={[styles.quickPickPill, isCur && styles.quickPickPillActive]}
                    onPress={() => handleSelectFund(fund)}
                    activeOpacity={0.75}
                  >
                    {isCur ? (
                      <Ionicons name="checkmark-circle" size={12} color="#38BDF8" style={{ marginRight: 5 }} />
                    ) : (
                      <Ionicons name="flash" size={11} color="#F59E0B" style={{ marginRight: 5 }} />
                    )}
                    <Text style={[styles.quickPickPillText, isCur && styles.quickPickPillTextActive]}>
                      {shortName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* SECTION 2: PLAN ARCHITECTURE (DIRECT VS REGULAR) */}
          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
            2. PLAN TYPE (WHERE IS YOUR SIP RUNNING?)
          </Text>

          <View style={styles.planSelectorRow}>
            {/* Direct Plan Card */}
            <TouchableOpacity
              style={[
                styles.planOptionCard,
                planType === 'DIRECT' && styles.planOptionCardDirectActive,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setPlanType('DIRECT');
              }}
              activeOpacity={0.85}
            >
              <View style={styles.planCardHeader}>
                <View
                  style={[
                    styles.planIconWrapper,
                    { backgroundColor: planType === 'DIRECT' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.04)' },
                  ]}
                >
                  <Ionicons
                    name="flash"
                    size={16}
                    color={planType === 'DIRECT' ? '#10B981' : '#64748B'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planTitle, planType === 'DIRECT' && { color: '#10B981' }]}>
                    Direct Plan
                  </Text>
                  <Text style={styles.planBadgeText}>0% COMMISSION</Text>
                </View>
                {planType === 'DIRECT' && (
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                )}
              </View>
              <Text style={styles.planDescription}>
                Via Zerodha Coin, Groww Direct, Kuvera, or AMC website.
              </Text>
            </TouchableOpacity>

            {/* Regular Plan Card */}
            <TouchableOpacity
              style={[
                styles.planOptionCard,
                planType === 'REGULAR' && styles.planOptionCardRegularActive,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setPlanType('REGULAR');
              }}
              activeOpacity={0.85}
            >
              <View style={styles.planCardHeader}>
                <View
                  style={[
                    styles.planIconWrapper,
                    { backgroundColor: planType === 'REGULAR' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(255, 255, 255, 0.04)' },
                  ]}
                >
                  <Ionicons
                    name="business"
                    size={16}
                    color={planType === 'REGULAR' ? '#F59E0B' : '#64748B'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planTitle, planType === 'REGULAR' && { color: '#F59E0B' }]}>
                    Regular Plan
                  </Text>
                  <Text style={[styles.planBadgeText, { color: '#F59E0B' }]}>~1% ANNUAL CUT</Text>
                </View>
                {planType === 'REGULAR' && (
                  <Ionicons name="checkmark-circle" size={18} color="#F59E0B" />
                )}
              </View>
              <Text style={styles.planDescription}>
                Via Bank Branch, RM, Financial Agent, or Distributor.
              </Text>
            </TouchableOpacity>
          </View>

          {/* SECTION 3: MONTHLY SIP ALLOCATION & HORIZON */}
          <View style={styles.amountHorizonCard}>
            <View style={styles.amountHeaderRow}>
              <View>
                <Text style={styles.amountSectionLabel}>MONTHLY SIP COMMITMENT</Text>
                <Text style={styles.amountHeroDisplay}>
                  ₹{sipAmount.toLocaleString('en-IN')}{' '}
                  <Text style={styles.amountHeroUnit}>/ month</Text>
                </Text>
              </View>
              <View style={styles.horizonBadge}>
                <Ionicons name="hourglass-outline" size={12} color="#38BDF8" style={{ marginRight: 4 }} />
                <Text style={styles.horizonBadgeText}>{sipYears} Years Horizon</Text>
              </View>
            </View>

            {/* Amount Quick Tiers */}
            <View style={styles.tierPillsRow}>
              {sipAmounts.map((tier) => {
                const isSelected = sipAmount === tier.value;
                return (
                  <TouchableOpacity
                    key={tier.value}
                    style={[styles.tierPillButton, isSelected && styles.tierPillButtonActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSipAmount(tier.value);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.tierPillButtonText,
                        isSelected && styles.tierPillButtonTextActive,
                      ]}
                    >
                      {tier.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.cardSeparator} />

            {/* Horizon Selection Row */}
            <Text style={styles.horizonSectionLabel}>INVESTMENT HORIZON (COMPOUNDING PHASES)</Text>
            <View style={styles.horizonPillsRow}>
              {yearTiers.map((tier) => {
                const isSelected = sipYears === tier.value;
                return (
                  <TouchableOpacity
                    key={tier.value}
                    style={[styles.horizonPillButton, isSelected && styles.horizonPillButtonActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSipYears(tier.value);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.horizonPillText,
                        isSelected && styles.horizonPillTextActive,
                      ]}
                    >
                      {tier.label}
                    </Text>
                    <Text
                      style={[
                        styles.horizonPillSub,
                        isSelected && styles.horizonPillSubActive,
                      ]}
                    >
                      {tier.tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* PRIMARY EXECUTIVE CTA: DIAGNOSE WEALTH HEALTH */}
          <TouchableOpacity
            style={styles.runAuditButton}
            activeOpacity={0.88}
            onPress={handleRunDiagnostic}
            disabled={isAnalyzing}
          >
            <LinearGradient
              colors={['#38BDF8', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.runAuditGradient}
            >
              {isAnalyzing ? (
                <View style={styles.runBtnInner}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.runBtnTitle}>RUNNING FIDUCIARY CLINICAL AUDIT...</Text>
                    <Text style={styles.runBtnSub}>Auditing expense ratio drag & rolling alpha</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.runBtnInner}>
                  <View style={styles.runBtnIconAperture}>
                    <Ionicons name="pulse" size={18} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.runBtnTitle}>DIAGNOSE PORTFOLIO HEALTH</Text>
                    <Text style={styles.runBtnSub}>
                      Fiduciary diagnosis • Zero churn promise • Instant remedy
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ opacity: 0.9 }} />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        /* ========================================================= */
        /* DIAGNOSTIC REPORT & ACTIONABLE PRESCRIPTION               */
        /* ========================================================= */
        <View style={styles.resultsContainer}>
          {/* Main Health Diagnostic Card */}
          <View style={[styles.diagnosticCard, { borderColor: diagnosis.healthColor + '40' }]}>
            <View style={styles.diagHeaderRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.diagSub}>CLINICAL VERDICT</Text>
                <Text style={styles.diagFundName}>{selectedFund.name}</Text>
                <Text style={styles.diagCategory}>
                  {selectedFund.amc || 'Mutual Fund'} • {planType === 'DIRECT' ? 'Direct Plan (0% Cut)' : 'Regular Plan'}
                </Text>
              </View>

              <View style={[styles.healthScoreBadge, { backgroundColor: diagnosis.healthColor + '18' }]}>
                <Ionicons name="medkit" size={15} color={diagnosis.healthColor} style={{ marginRight: 5 }} />
                <Text style={[styles.healthScoreText, { color: diagnosis.healthColor }]}>
                  {diagnosis.healthScore}/100
                </Text>
              </View>
            </View>

            {/* Doctor Note Box */}
            <View style={[styles.leakNoteBox, { backgroundColor: diagnosis.healthColor + '10' }]}>
              <View style={styles.leakTagRow}>
                <View style={[styles.leakDot, { backgroundColor: diagnosis.healthColor }]} />
                <Text style={[styles.leakTagTitle, { color: diagnosis.healthColor }]}>
                  {diagnosis.healthTag}
                </Text>
              </View>
              <Text style={styles.leakTagHeading}>{diagnosis.title}</Text>
              <Text style={styles.leakTagReason}>{diagnosis.doctorNote}</Text>
            </View>

            {/* Doctor's Official Prescription Callout */}
            <View style={styles.prescriptionBox}>
              <View style={styles.prescriptionHeader}>
                <Ionicons name="receipt-outline" size={16} color="#38BDF8" />
                <Text style={styles.prescriptionTitle}>DOCTOR'S PRESCRIPTION (ILAJ):</Text>
              </View>
              <Text style={styles.prescriptionMainText}>{diagnosis.prescription}</Text>
              {diagnosis.prescriptionPoints.map((pt, idx) => (
                <View key={idx} style={styles.prescPointRow}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginTop: 2 }} />
                  <Text style={styles.prescPointText}>{pt}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ======================================================== */}
          {/* SCENARIO 1: 100% HEALTHY (19-20 KA FARK) -> ZERO CHURN!  */}
          {/* ======================================================== */}
          {diagnosis.isHealthy ? (
            <View style={styles.healthyContainer}>
              {/* Disciplined Investor Certificate */}
              <View style={styles.healthyCard}>
                <View style={styles.healthyHeaderRow}>
                  <Ionicons name="trophy" size={22} color="#F59E0B" />
                  <Text style={styles.healthyTitle}>Certified Disciplined Investor 🏆</Text>
                </View>
                <Text style={styles.healthySubText}>
                  Aapka fund bilkul swasth hai. Jo 19-20 ka mamuli return difference market cycles me hota hai, uske liye bar-bar fund switch karna portfolio ko nuksan pahuchata hai. Stay the course!
                </Text>

                {/* Compounding Milestones Roadmap */}
                <Text style={styles.milestoneHeading}>
                  YOUR COMPOUNDING ROADMAP (AT ₹{sipAmount.toLocaleString('en-IN')}/MO):
                </Text>
                <View style={styles.milestoneGrid}>
                  <View style={styles.milestoneItem}>
                    <Text style={styles.milestoneYear}>5 Yrs</Text>
                    <Text style={styles.milestoneAmt}>₹{m5Y} Lakh</Text>
                    <Text style={styles.milestoneLabel}>Initial Base</Text>
                  </View>
                  <View style={styles.milestoneItem}>
                    <Text style={styles.milestoneYear}>10 Yrs</Text>
                    <Text style={styles.milestoneAmt}>₹{m10Y} Lakh</Text>
                    <Text style={styles.milestoneLabel}>Momentum</Text>
                  </View>
                  <View style={styles.milestoneItem}>
                    <Text style={styles.milestoneYear}>15 Yrs</Text>
                    <Text style={[styles.milestoneAmt, { color: '#38BDF8' }]}>₹{m15Y} Lakh</Text>
                    <Text style={styles.milestoneLabel}>Compounding</Text>
                  </View>
                  <View style={styles.milestoneItem}>
                    <Text style={styles.milestoneYear}>20 Yrs</Text>
                    <Text style={[styles.milestoneAmt, { color: '#10B981' }]}>
                      {parseFloat(m20Y) >= 100 ? `₹${(parseFloat(m20Y) / 100).toFixed(2)} Cr` : `₹${m20Y} L`}
                    </Text>
                    <Text style={styles.milestoneLabel}>Financial Freedom</Text>
                  </View>
                </View>
              </View>

              {/* Reset / Audit Another */}
              <TouchableOpacity style={styles.resetBtn} activeOpacity={0.8} onPress={handleReset}>
                <Ionicons name="refresh" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                <Text style={styles.resetBtnText}>Audit Another Mutual Fund Scheme</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ======================================================== */
            /* SCENARIO 2 & 3: LEAKAGE / REMEDY ACTIONS                 */
            /* ======================================================== */
            <View style={{ gap: 12 }}>
              {/* Extra Wealth Created / Recovered Banner */}
              {calculatedExtraWealth > 0 && (
                <View style={styles.extraWealthCard}>
                  <Ionicons name="trending-up" size={26} color="#10B981" />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.extraWealthSub}>TOTAL WEALTH RECOVERABLE OVER {sipYears} YEARS</Text>
                    <Text style={styles.extraWealthAmount}>
                      +₹{calculatedExtraWealth >= 100 ? (calculatedExtraWealth / 100).toFixed(2) + ' Crore' : calculatedExtraWealth.toFixed(1) + ' Lakh'}
                    </Text>
                    <Text style={styles.extraWealthNote}>
                      {diagnosis.statusType === 'SWITCH_TO_DIRECT'
                        ? 'Saves 100% of distributor commission deductions in your family wealth.'
                        : 'Compounded gain by eliminating commission drain & trailing benchmark alpha.'}
                    </Text>
                  </View>
                </View>
              )}

              {/* HEAD-TO-HEAD BATTLE CARD: If Replacement exists */}
              {diagnosis.replacement && (
                <View style={styles.battleCard}>
                  <Text style={styles.battleTitle}>RECOMMENDED DIRECT RESOLUTION</Text>
                  <View style={styles.battleRow}>
                    {/* LEFT: Current Fund */}
                    <View style={styles.sideCol}>
                      <View style={styles.currentTag}>
                        <Text style={styles.currentTagText}>YOUR FUND</Text>
                      </View>
                      <Text style={styles.sideFundName} numberOfLines={2}>
                        {selectedFund.name}
                      </Text>
                      <Text style={styles.sideSub}>
                        {planType === 'DIRECT' ? 'Direct Plan' : 'Regular Plan (Bank)'}
                      </Text>

                      <View style={styles.sideMetricItem}>
                        <Text style={styles.sideMetricLbl}>Expense Ratio</Text>
                        <Text style={[styles.sideMetricVal, { color: '#F59E0B' }]}>
                          {selectedFund.currentExpense}
                        </Text>
                      </View>

                      <View style={styles.sideMetricItem}>
                        <Text style={styles.sideMetricLbl}>5Y Return</Text>
                        <Text style={styles.sideMetricVal}>{selectedFund.currentCagr} CAGR</Text>
                      </View>

                      <View style={styles.sideWealthItem}>
                        <Text style={styles.sideWealthLbl}>{sipYears}Y Corpus</Text>
                        <Text style={styles.sideWealthVal}>
                          ₹{baseWealthCur >= 100 ? (baseWealthCur / 100).toFixed(2) + ' Cr' : baseWealthCur.toFixed(1) + ' L'}
                        </Text>
                      </View>
                    </View>

                    {/* VS Divider */}
                    <View style={styles.battleDivider}>
                      <View style={styles.vsBadge}>
                        <Text style={styles.vsText}>VS</Text>
                      </View>
                    </View>

                    {/* RIGHT: Recommended Direct Solution */}
                    <View style={[styles.sideCol, styles.sideColWinner]}>
                      <View style={styles.winnerTag}>
                        <Text style={styles.winnerTagText}>RECOMMENDED</Text>
                      </View>
                      <Text style={styles.sideFundName} numberOfLines={2}>
                        {diagnosis.replacement.name}
                      </Text>
                      <Text style={[styles.sideSub, { color: '#38BDF8' }]}>
                        Direct Plan (0% Commission)
                      </Text>

                      <View style={styles.sideMetricItem}>
                        <Text style={styles.sideMetricLbl}>Expense Ratio</Text>
                        <Text style={[styles.sideMetricVal, { color: '#10B981' }]}>
                          {diagnosis.replacement.expenseRatio}
                        </Text>
                      </View>

                      <View style={styles.sideMetricItem}>
                        <Text style={styles.sideMetricLbl}>5Y Return</Text>
                        <Text style={[styles.sideMetricVal, { color: '#10B981' }]}>
                          {diagnosis.replacement.cagr5Y} CAGR
                        </Text>
                      </View>

                      <View style={[styles.sideWealthItem, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
                        <Text style={[styles.sideWealthLbl, { color: '#38BDF8' }]}>
                          {sipYears}Y Estimated
                        </Text>
                        <Text style={[styles.sideWealthVal, { color: '#38BDF8' }]}>
                          ₹{baseWealthRep >= 100 ? (baseWealthRep / 100).toFixed(2) + ' Cr' : baseWealthRep.toFixed(1) + ' L'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* ACTION BUTTONS */}
              <View style={styles.resultActions}>
                {/* 1. Direct Switch Roadmap */}
                <TouchableOpacity
                  style={styles.switchRoadmapBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setMigratingFund({
                      ...selectedFund,
                      lossOver20Y: `₹${calculatedExtraWealth.toFixed(1)} Lakh`,
                      hiddenAgentCommission: selectedFund.agentCommissionCut || '0.95%',
                    });
                  }}
                >
                  <LinearGradient
                    colors={['#38BDF8', '#2563EB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.switchRoadmapGrad}
                  >
                    <Ionicons name="flash" size={18} color="#FFFFFF" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.switchRoadmapTitle}>Zero-Tax Direct Switch Roadmap →</Text>
                      <Text style={styles.switchRoadmapSub}>
                        Paperless guide for MFCentral, Zerodha Coin & Groww Direct
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>

                {/* 2. Tax Harvesting Helper */}
                <TouchableOpacity
                  style={styles.taxSwitchBanner}
                  activeOpacity={0.85}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setTaxModalVisible(true);
                  }}
                >
                  <Ionicons name="calculator-outline" size={18} color="#38BDF8" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taxSwitchTitle}>Claim ₹1.25L Tax-Free LTCG Harvest</Text>
                    <Text style={styles.taxSwitchSub}>
                      Section 112A lets you switch gains with ₹0 tax liability before March 31.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#64748B" />
                </TouchableOpacity>

                {/* 3. Reset Button */}
                <TouchableOpacity style={styles.resetBtn} activeOpacity={0.8} onPress={handleReset}>
                  <Ionicons name="refresh" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                  <Text style={styles.resetBtnText}>Audit Another Mutual Fund Scheme</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* COMPREHENSIVE MUTUAL FUND SEARCH & SELECT MODAL */}
      <Modal
        visible={searchModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Select Mutual Fund Scheme</Text>
                <Text style={styles.modalSub}>Search from 50+ SEBI registered schemes or enter custom fund</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSearchModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Search Input Field */}
            <View style={styles.modalSearchInputWrapper}>
              <Ionicons name="search" size={16} color="#64748B" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.modalSearchTextInput}
                placeholder="Search fund name, AMC, or category..."
                placeholderTextColor="#64748B"
                value={modalSearchText}
                onChangeText={setModalSearchText}
                autoFocus={true}
                clearButtonMode="while-editing"
              />
              {modalSearchText.length > 0 && (
                <TouchableOpacity onPress={() => setModalSearchText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={16} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>

            {/* Category Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.modalCategoryScroll}
              contentContainerStyle={{ paddingHorizontal: 4 }}
            >
              {categories.map((cat) => {
                const isCatActive = categoryFilter === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.modalCatChip, isCatActive && styles.modalCatChipActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setCategoryFilter(cat.id);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.modalCatChipText, isCatActive && styles.modalCatChipTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Funds List */}
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalFundsList}>
              {filteredModalFunds.map((fund) => {
                const isSelected = selectedFund.id === fund.id;
                return (
                  <TouchableOpacity
                    key={fund.id}
                    style={[styles.modalFundRow, isSelected && styles.modalFundRowSelected]}
                    onPress={() => handleSelectFund(fund)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.modalFundIcon, isSelected && styles.modalFundIconSelected]}>
                      <Ionicons
                        name={isSelected ? 'checkmark' : 'shield-checkmark-outline'}
                        size={16}
                        color={isSelected ? '#38BDF8' : '#64748B'}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalFundName, isSelected && styles.modalFundNameSelected]}>
                        {fund.name}
                      </Text>
                      <Text style={styles.modalFundSub}>
                        {fund.amc || 'AMC'} • {fund.category} • Fee: {fund.currentExpense}
                      </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={14} color="#64748B" />
                  </TouchableOpacity>
                );
              })}

              {/* Custom Fund Auditor Fallback */}
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
                    <Ionicons name="sparkles" size={18} color="#38BDF8" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customAuditTitle}>
                        Audit Custom Scheme: "{modalSearchText.trim()}"
                      </Text>
                      <Text style={styles.customAuditSub}>
                        Algorithmically screen expense ratios and alpha for this unlisted fund.
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color="#38BDF8" />
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <View style={{ height: 30 }} />
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

      <View style={{ height: 125 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07090E',
    paddingHorizontal: 16,
  },
  fiduciaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0D111A',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  fiduciaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  fiduciaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  fiduciaryDivider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  openContentWrapper: {
    gap: 0,
  },
  heroSection: {
    marginBottom: 18,
  },
  heroAuraPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    marginBottom: 8,
    gap: 6,
  },
  heroPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38BDF8',
  },
  heroAuraText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontSize: 12.5,
    color: '#94A3B8',
    marginTop: 5,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  sectionActionText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#38BDF8',
  },
  heroAssetCard: {
    backgroundColor: '#0D111A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  assetTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  assetAmcBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  assetAmcText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.4,
  },
  assetCategoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  assetCategoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  assetStarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  assetStarText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#F59E0B',
  },
  assetTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  assetMetricsGrid: {
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
  assetMetricLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  assetMetricValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  assetMetricSub: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 2,
  },
  assetMetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  assetChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  assetChangeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38BDF8',
    marginRight: 4,
  },
  quickPickContainer: {
    marginTop: 14,
  },
  quickPickHeaderLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  quickPickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D111A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  quickPickPillActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  quickPickPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  quickPickPillTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  planSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  planOptionCard: {
    flex: 1,
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  planOptionCardDirectActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  planOptionCardRegularActive: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  planIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  planBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.4,
  },
  planDescription: {
    fontSize: 10,
    color: '#94A3B8',
    lineHeight: 14,
  },
  amountHorizonCard: {
    backgroundColor: '#0D111A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 16,
  },
  amountHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  amountSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  amountHeroDisplay: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 3,
    letterSpacing: -0.4,
  },
  amountHeroUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  horizonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  horizonBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#38BDF8',
  },
  tierPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tierPillButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#131926',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tierPillButtonActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
  },
  tierPillButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tierPillButtonTextActive: {
    color: '#38BDF8',
    fontWeight: '900',
  },
  cardSeparator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 14,
  },
  horizonSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  horizonPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  horizonPillButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#131926',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  horizonPillButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10B981',
  },
  horizonPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
  },
  horizonPillTextActive: {
    color: '#10B981',
  },
  horizonPillSub: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  horizonPillSubActive: {
    color: '#10B981',
  },
  runAuditButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  runAuditGradient: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  runBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  runBtnIconAperture: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  runBtnTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  runBtnSub: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.88)',
    marginTop: 2,
  },
  resultsContainer: {
    gap: 14,
  },
  diagnosticCard: {
    backgroundColor: '#0D111A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  diagHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  diagSub: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  diagFundName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  diagCategory: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 3,
  },
  healthScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  healthScoreText: {
    fontSize: 14,
    fontWeight: '900',
  },
  leakNoteBox: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  leakTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  leakDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  leakTagTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  leakTagHeading: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  leakTagReason: {
    fontSize: 11.5,
    color: '#CBD5E1',
    lineHeight: 17,
  },
  prescriptionBox: {
    backgroundColor: '#131926',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  prescriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  prescriptionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.5,
  },
  prescriptionMainText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  prescPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginBottom: 5,
  },
  prescPointText: {
    fontSize: 11,
    color: '#94A3B8',
    flex: 1,
    lineHeight: 15,
  },
  healthyContainer: {
    gap: 12,
  },
  healthyCard: {
    backgroundColor: '#0D111A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  healthyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  healthyTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  healthySubText: {
    fontSize: 11.5,
    color: '#94A3B8',
    lineHeight: 17,
    marginBottom: 16,
  },
  milestoneHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 10,
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
  milestoneItem: {
    flex: 1,
    alignItems: 'center',
  },
  milestoneYear: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '700',
  },
  milestoneAmt: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 3,
  },
  milestoneLabel: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 3,
  },
  extraWealthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D111A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  extraWealthSub: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.6,
  },
  extraWealthAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 3,
  },
  extraWealthNote: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 3,
    lineHeight: 15,
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
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  battleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideCol: {
    flex: 1,
    backgroundColor: '#131926',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sideColWinner: {
    borderColor: 'rgba(56, 189, 248, 0.35)',
    backgroundColor: 'rgba(56, 189, 248, 0.06)',
  },
  currentTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 5,
  },
  currentTagText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#94A3B8',
  },
  winnerTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 5,
  },
  winnerTagText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#38BDF8',
  },
  sideFundName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sideSub: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 8,
  },
  sideMetricItem: {
    marginTop: 4,
  },
  sideMetricLbl: {
    fontSize: 9,
    color: '#64748B',
  },
  sideMetricVal: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sideWealthItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    padding: 7,
    marginTop: 10,
  },
  sideWealthLbl: {
    fontSize: 9,
    color: '#64748B',
  },
  sideWealthVal: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  battleDivider: {
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsBadge: {
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
    fontSize: 9,
    fontWeight: '900',
    color: '#94A3B8',
  },
  resultActions: {
    gap: 10,
    marginTop: 4,
  },
  switchRoadmapBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  switchRoadmapGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  switchRoadmapTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  switchRoadmapSub: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.88)',
    marginTop: 2,
  },
  taxSwitchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  taxSwitchTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  taxSwitchSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  resetBtn: {
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
  resetBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94A3B8',
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
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  modalSub: {
    fontSize: 11,
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
  modalSearchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D111A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  modalSearchTextInput: {
    flex: 1,
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
    paddingVertical: 0,
  },
  modalCategoryScroll: {
    marginBottom: 12,
    maxHeight: 36,
  },
  modalCatChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0D111A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginRight: 6,
  },
  modalCatChipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
  },
  modalCatChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  modalCatChipTextActive: {
    color: '#38BDF8',
  },
  modalFundsList: {
    paddingTop: 4,
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
  modalFundIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalFundIconSelected: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  modalFundName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalFundNameSelected: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  modalFundSub: {
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
    fontSize: 13,
    fontWeight: '800',
    color: '#38BDF8',
  },
  customAuditSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 3,
  },
});
