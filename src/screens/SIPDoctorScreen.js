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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import AppHeader from '../components/AppHeader';
import SIPMigrationModal from '../components/SIPMigrationModal';
import TaxHarvestingModal from '../components/TaxHarvestingModal';
import { mockSIPFundsDatabase, resolveFundAudit } from '../data/mockSIPFunds';

export default function SIPDoctorScreen({ onOpenMenu }) {
  const [selectedFund, setSelectedFund] = useState(mockSIPFundsDatabase[0]);
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
    { label: '₹2.5k', value: 2500 },
    { label: '₹5k', value: 5000 },
    { label: '₹10k', value: 10000 },
    { label: '₹25k', value: 25000 },
    { label: '₹50k', value: 50000 },
  ];

  const yearTiers = [
    { label: '5 Yrs', value: 5 },
    { label: '10 Yrs', value: 10 },
    { label: '15 Yrs', value: 15 },
    { label: '20 Yrs', value: 20 },
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
    'tata_smallcap',
    'axis_bluechip',
    'sbi_contra',
    'icici_baf',
  ];
  const popularFunds = mockSIPFundsDatabase.filter((f) => popularFundIds.includes(f.id));

  // Dynamic calculations based on SIP amount & years
  const multiplier = sipAmount / 10000;
  const yearMultiplier = sipYears / 15;
  const baseWealthCur = 46.2 * multiplier * yearMultiplier;
  const baseWealthRep = 84.7 * multiplier * yearMultiplier;
  const calculatedExtraWealth = Math.max(0, baseWealthRep - baseWealthCur);

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
    }, 850);
  };

  const handleReset = () => {
    Haptics.selectionAsync();
    setHasAnalyzed(false);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Clean Premium Brand Header (Zero top alert boxes) */}
      <AppHeader
        subtitle="Mutual Fund Replacement Tool"
        rightAction={
          <TouchableOpacity
            style={styles.headerTaxPill}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setTaxModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="calculator-outline" size={13} color={colors.primary} />
            <Text style={styles.headerTaxPillText}>₹1.25L Free</Text>
          </TouchableOpacity>
        }
      />

      {!hasAnalyzed ? (
        /* TOOL INPUT MODE */
        <View style={styles.toolCard}>
          <View style={styles.toolHeader}>
            <View style={styles.toolIconAperture}>
              <Ionicons name="sparkles" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.toolMainTitle}>Mutual Fund Diagnostic Engine</Text>
              <Text style={styles.toolMainSub}>
                Audit hidden middleman fees & discover superior Direct Plan replacements.
              </Text>
            </View>
          </View>

          {/* STEP 1: SELECT YOUR MUTUAL FUND (Clean single-line label with zero text collision) */}
          <Text style={styles.inputSectionLabel}>1. SELECT MUTUAL FUND TO AUDIT</Text>

          {/* Interactive Search Bar Trigger with embedded Browse 50+ pill */}
          <TouchableOpacity
            style={styles.mainSearchBar}
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSearchModalVisible(true);
            }}
          >
            <Ionicons name="search" size={17} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.mainSearchPlaceholder} numberOfLines={1}>
              Search 50+ schemes (SBI, HDFC, Parag Parikh)...
            </Text>
            <View style={styles.browsePill}>
              <Text style={styles.browsePillText}>Browse 50+</Text>
              <Ionicons name="chevron-forward" size={11} color={colors.primary} style={{ marginLeft: 2 }} />
            </View>
          </TouchableOpacity>

          {/* Currently Selected Fund Card */}
          <View style={styles.activeFundCard}>
            <View style={styles.activeFundLeft}>
              <View style={styles.activeFundIcon}>
                <Ionicons name="shield-checkmark" size={17} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.activeFundName} numberOfLines={1}>
                  {selectedFund.name}
                </Text>
                <Text style={styles.activeFundMeta} numberOfLines={1}>
                  {selectedFund.amc || 'AMC'} • {selectedFund.category} • Fee: {selectedFund.currentExpense}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.changeFundBtn}
              activeOpacity={0.7}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSearchModalVisible(true);
              }}
            >
              <Text style={styles.changeFundBtnText}>Change</Text>
              <Ionicons name="chevron-forward" size={12} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Popular Schemes Carousel (1-Tap Fast Selection) */}
          <Text style={styles.quickPicksLabel}>POPULAR SCHEMES (1-TAP SELECT):</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickPicksScroll}
            contentContainerStyle={{ paddingRight: 8 }}
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
                  style={[styles.quickPickChip, isCur && styles.quickPickChipActive]}
                  onPress={() => handleSelectFund(fund)}
                  activeOpacity={0.75}
                >
                  {isCur ? (
                    <Ionicons name="checkmark-circle" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                  ) : (
                    <Ionicons name="flash" size={11} color={colors.warning} style={{ marginRight: 4 }} />
                  )}
                  <Text style={[styles.quickPickChipText, isCur && styles.quickPickChipTextActive]}>
                    {shortName}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Trailing Chip to open full 50+ directory */}
            <TouchableOpacity
              style={styles.quickPickBrowseAll}
              onPress={() => {
                Haptics.selectionAsync();
                setSearchModalVisible(true);
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="grid-outline" size={12} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.quickPickBrowseAllText}>All 50+ Schemes →</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* STEP 2: MONTHLY SIP AMOUNT */}
          <Text style={[styles.inputSectionLabel, { marginTop: 16 }]}>2. YOUR MONTHLY SIP AMOUNT</Text>
          <View style={styles.tierRow}>
            {sipAmounts.map((tier) => {
              const isSelected = sipAmount === tier.value;
              return (
                <TouchableOpacity
                  key={tier.value}
                  style={[styles.tierPill, isSelected && styles.tierPillActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSipAmount(tier.value);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tierPillText, isSelected && styles.tierPillTextActive]}>
                    {tier.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* STEP 3: INVESTMENT TIMELINE */}
          <Text style={styles.inputSectionLabel}>3. INVESTMENT HORIZON</Text>
          <View style={styles.tierRow}>
            {yearTiers.map((tier) => {
              const isSelected = sipYears === tier.value;
              return (
                <TouchableOpacity
                  key={tier.value}
                  style={[styles.tierPill, isSelected && styles.tierPillActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSipYears(tier.value);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tierPillText, isSelected && styles.tierPillTextActive]}>
                    {tier.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ========================================================= */}
          {/* PREMIUM INSTITUTIONAL AUDIT MATRIX & EXECUTIVE LAUNCHPAD  */}
          {/* ========================================================= */}
          <View style={styles.auditPreviewCard}>
            <View style={styles.auditPreviewHeader}>
              <View style={styles.auditPreviewIcon}>
                <Ionicons name="shield-checkmark" size={15} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.auditPreviewTitle}>INSTITUTIONAL AUDIT ENGINE</Text>
                <Text style={styles.auditPreviewSub}>
                  SEBI Direct Plan vs Regular Plan Delta
                </Text>
              </View>
              <View style={styles.zeroCutBadge}>
                <Text style={styles.zeroCutBadgeText}>ZERO COMMISSIONS</Text>
              </View>
            </View>

            <View style={styles.auditMatrixRow}>
              <View style={styles.auditMatrixCol}>
                <Ionicons name="cash-outline" size={13} color="#EF4444" style={{ marginBottom: 2 }} />
                <Text style={styles.auditMatrixVal}>~1.0% / Yr</Text>
                <Text style={styles.auditMatrixLbl}>Agent Fee Drain</Text>
              </View>

              <View style={styles.auditMatrixDivider} />

              <View style={styles.auditMatrixCol}>
                <Ionicons name="stats-chart" size={13} color={colors.primary} style={{ marginBottom: 2 }} />
                <Text style={styles.auditMatrixVal}>5Y Rolling Alpha</Text>
                <Text style={styles.auditMatrixLbl}>Benchmark Delta</Text>
              </View>

              <View style={styles.auditMatrixDivider} />

              <View style={styles.auditMatrixCol}>
                <Ionicons name="trending-up" size={13} color={colors.warning} style={{ marginBottom: 2 }} />
                <Text style={styles.auditMatrixVal}>+{sipYears}Y Corpus</Text>
                <Text style={styles.auditMatrixLbl}>Compounded Gain</Text>
              </View>
            </View>
          </View>

          {/* LUXURY EXECUTIVE CTA BUTTON */}
          <TouchableOpacity
            style={styles.runButton}
            activeOpacity={0.88}
            onPress={handleRunDiagnostic}
            disabled={isAnalyzing}
          >
            <LinearGradient
              colors={['#10B981', '#059669', '#047857']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.runButtonGrad}
            >
              {isAnalyzing ? (
                <View style={styles.runBtnInner}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.runButtonMainText}>AUDITING EXPENSE LEAKAGE...</Text>
                    <Text style={styles.runButtonSubText}>Screening 2,400+ SEBI registered Direct Plans</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.runBtnInner}>
                  <View style={styles.runBtnIconAperture}>
                    <Ionicons name="flash" size={17} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.runButtonMainText}>RUN WEALTH AUDIT & FIND DIRECT PLAN</Text>
                    <Text style={styles.runButtonSubText}>
                      Instant Side-by-Side Comparison • 100% Free SEBI Analysis
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ opacity: 0.9 }} />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* REGULATORY TRUST STRIP */}
          <View style={styles.trustStrip}>
            <Ionicons name="lock-closed" size={11} color={colors.textMuted} style={{ marginRight: 5 }} />
            <Text style={styles.trustStripText}>
              Section 112A Tax-Protected • Direct AMC Execution • Zero Intermediary Cut
            </Text>
          </View>
        </View>
      ) : (
        /* DIAGNOSTIC & REPLACEMENT RESULT VIEW */
        <View style={styles.resultsContainer}>
          {/* Diagnostic Health Summary Card */}
          <View style={styles.diagnosticCard}>
            <View style={styles.diagHeaderRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.diagSub}>AUDIT RESULT FOR</Text>
                <Text style={styles.diagFundName}>{selectedFund.name}</Text>
                <Text style={styles.diagCategory}>
                  {selectedFund.amc || 'Mutual Fund'} • {selectedFund.category}
                </Text>
              </View>

              <View style={[styles.healthScoreBadge, { backgroundColor: selectedFund.healthColor + '18' }]}>
                <Ionicons name="medkit" size={13} color={selectedFund.healthColor} style={{ marginRight: 4 }} />
                <Text style={[styles.healthScoreText, { color: selectedFund.healthColor }]}>
                  {selectedFund.healthScore}/100
                </Text>
              </View>
            </View>

            {/* Leak Note Box */}
            <View style={styles.leakNoteBox}>
              <Text style={[styles.leakTagTitle, { color: selectedFund.healthColor }]}>
                {selectedFund.healthTag}
              </Text>
              <Text style={styles.leakTagReason}>{selectedFund.leakageReason}</Text>
            </View>

            {/* 3 Metrics: Current Expense, Benchmark Alpha, Distributor Cut */}
            <View style={styles.diagMetricsRow}>
              <View style={styles.diagCol}>
                <Text style={styles.diagColLbl}>REGULAR EXPENSE</Text>
                <Text style={[styles.diagColVal, { color: colors.warning }]}>
                  {selectedFund.currentExpense}
                </Text>
                <Text style={styles.diagColSub}>Annual Drag</Text>
              </View>

              <View style={styles.diagDivider} />

              <View style={styles.diagCol}>
                <Text style={styles.diagColLbl}>VS BENCHMARK</Text>
                <Text
                  style={[
                    styles.diagColVal,
                    { color: selectedFund.alphaVsBenchmark.startsWith('+') ? colors.primary : '#EF4444' },
                  ]}
                >
                  {selectedFund.alphaVsBenchmark}
                </Text>
                <Text style={styles.diagColSub}>{selectedFund.benchmarkName}</Text>
              </View>

              <View style={styles.diagDivider} />

              <View style={styles.diagCol}>
                <Text style={styles.diagColLbl}>AGENT CUT</Text>
                <Text style={[styles.diagColVal, { color: '#EF4444' }]}>
                  -{selectedFund.agentCommissionCut}
                </Text>
                <Text style={styles.diagColSub}>Lost Every Year</Text>
              </View>
            </View>
          </View>

          {/* HEAD-TO-HEAD BATTLE CARD: CURRENT VS REPLACEMENT */}
          <Text style={styles.battleTitle}>RECOMMENDED DIRECT PLAN REPLACEMENT</Text>

          <View style={styles.battleCard}>
            <View style={styles.battleRow}>
              {/* LEFT: Current Fund */}
              <View style={styles.sideCol}>
                <View style={styles.currentTag}>
                  <Text style={styles.currentTagText}>YOUR FUND</Text>
                </View>
                <Text style={styles.sideFundName} numberOfLines={2}>
                  {selectedFund.name}
                </Text>
                <Text style={styles.sideSub}>Regular Plan</Text>

                <View style={styles.sideMetricItem}>
                  <Text style={styles.sideMetricLbl}>Expense Ratio</Text>
                  <Text style={[styles.sideMetricVal, { color: colors.warning }]}>
                    {selectedFund.currentExpense}
                  </Text>
                </View>

                <View style={styles.sideMetricItem}>
                  <Text style={styles.sideMetricLbl}>5-Year Return</Text>
                  <Text style={styles.sideMetricVal}>{selectedFund.currentCagr} CAGR</Text>
                </View>

                <View style={styles.sideWealthItem}>
                  <Text style={styles.sideWealthLbl}>{sipYears}Y Corpus</Text>
                  <Text style={styles.sideWealthVal}>
                    ₹{(baseWealthCur >= 100 ? (baseWealthCur / 100).toFixed(2) + ' Cr' : baseWealthCur.toFixed(1) + ' L')}
                  </Text>
                </View>
              </View>

              {/* VS Divider */}
              <View style={styles.battleDivider}>
                <View style={styles.vsBadge}>
                  <Text style={styles.vsText}>VS</Text>
                </View>
              </View>

              {/* RIGHT: Recommended Replacement */}
              <View style={[styles.sideCol, styles.sideColWinner]}>
                <View style={styles.winnerTag}>
                  <Text style={styles.winnerTagText}>BEST DIRECT</Text>
                </View>
                <Text style={styles.sideFundName} numberOfLines={2}>
                  {selectedFund.replacement.name}
                </Text>
                <Text style={[styles.sideSub, { color: colors.primary }]}>
                  Direct Plan (0% Cut)
                </Text>

                <View style={styles.sideMetricItem}>
                  <Text style={styles.sideMetricLbl}>Expense Ratio</Text>
                  <Text style={[styles.sideMetricVal, { color: colors.primary }]}>
                    {selectedFund.replacement.expenseRatio}
                  </Text>
                </View>

                <View style={styles.sideMetricItem}>
                  <Text style={styles.sideMetricLbl}>5-Year Return</Text>
                  <Text style={[styles.sideMetricVal, { color: colors.primary }]}>
                    {selectedFund.replacement.cagr5Y} CAGR
                  </Text>
                </View>

                <View style={[styles.sideWealthItem, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Text style={[styles.sideWealthLbl, { color: colors.primary }]}>
                    {sipYears}Y Estimated
                  </Text>
                  <Text style={[styles.sideWealthVal, { color: colors.primary }]}>
                    ₹{(baseWealthRep >= 100 ? (baseWealthRep / 100).toFixed(2) + ' Cr' : baseWealthRep.toFixed(1) + ' L')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Extra Wealth Created Gold Banner */}
            {calculatedExtraWealth > 0 && (
              <LinearGradient
                colors={['#062E23', '#031F17']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.extraWealthBanner}
              >
                <Ionicons name="trending-up" size={22} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.extraWealthSub}>TOTAL ADDITIONAL WEALTH CREATED</Text>
                  <Text style={styles.extraWealthAmount}>
                    +₹{(calculatedExtraWealth >= 100 ? (calculatedExtraWealth / 100).toFixed(2) + ' Crore' : calculatedExtraWealth.toFixed(1) + ' Lakh')}
                  </Text>
                  <Text style={styles.extraWealthNote}>
                    Kept in your family by eliminating hidden distributor commissions and upgrading alpha.
                  </Text>
                </View>
              </LinearGradient>
            )}
          </View>

          {/* WHY THIS REPLACEMENT IS SUPERIOR */}
          <View style={styles.reasonsCard}>
            <Text style={styles.reasonsTitle}>Why Switch to This Replacement?</Text>
            {selectedFund.replacement.reasons.map((reason, idx) => (
              <View key={idx} style={styles.reasonRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} style={{ marginTop: 2 }} />
                <Text style={styles.reasonText}>{reason}</Text>
              </View>
            ))}
          </View>

          {/* LUXURY EXECUTIVE RESULTS ACTIONS */}
          <View style={styles.resultActions}>
            <TouchableOpacity
              style={styles.switchRoadmapBtn}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setMigratingFund({
                  ...selectedFund,
                  lossOver20Y: `₹${calculatedExtraWealth.toFixed(1)} Lakh`,
                  hiddenAgentCommission: selectedFund.agentCommissionCut,
                });
              }}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.switchRoadmapGrad}
              >
                <View style={styles.switchRoadmapInner}>
                  <View style={styles.switchRoadmapIconAperture}>
                    <Ionicons name="flash" size={18} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.switchRoadmapTitle}>Zero-Tax Direct Switch Roadmap →</Text>
                    <Text style={styles.switchRoadmapSub}>
                      Step-by-step paperless guide for MFCentral, Zerodha Coin & Groww
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#FFFFFF" style={{ opacity: 0.9 }} />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Section 112A Tax Harvesting Calculator Button */}
            <TouchableOpacity
              style={styles.taxSwitchBanner}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setTaxModalVisible(true);
              }}
            >
              <LinearGradient
                colors={['#0F241C', '#071712']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.taxSwitchGrad}
              >
                <View style={styles.taxSwitchLeft}>
                  <View style={styles.taxSwitchIconAperture}>
                    <Ionicons name="calculator" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.taxSwitchTitle}>Claim ₹1.25L Tax-Free LTCG Harvest</Text>
                    <Text style={styles.taxSwitchSub}>
                      Section 112A lets you switch gains with ₹0 tax liability before March 31.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resetBtn} activeOpacity={0.8} onPress={handleReset}>
              <Ionicons name="refresh" size={15} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.resetBtnText}>Audit Another Mutual Fund Scheme</Text>
                <Text style={styles.resetBtnSubText}>Screen any of 2,400+ SEBI registered funds</Text>
              </View>
            </TouchableOpacity>
          </View>
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
                <Text style={styles.modalTitle}>Select Mutual Fund</Text>
                <Text style={styles.modalSubtitle}>Search all major AMCs & equity funds in India</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSearchModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Live Search Input */}
            <View style={styles.modalSearchBar}>
              <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search by fund or AMC (e.g. Parag Parikh, SBI, Quant)..."
                placeholderTextColor={colors.textMuted}
                value={modalSearchText}
                onChangeText={setModalSearchText}
                autoFocus={true}
              />
              {modalSearchText.length > 0 && (
                <TouchableOpacity onPress={() => setModalSearchText('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Category Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalFilterScroll}>
              {categories.map((c) => {
                const isActive = categoryFilter === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.modalFilterChip, isActive && styles.modalFilterChipActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setCategoryFilter(c.id);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.modalFilterChipText, isActive && styles.modalFilterChipTextActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Funds List */}
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalFundsList}>
              {filteredModalFunds.map((fund) => {
                const isCurrent = selectedFund.id === fund.id;
                return (
                  <TouchableOpacity
                    key={fund.id}
                    style={[styles.fundListItem, isCurrent && styles.fundListItemActive]}
                    activeOpacity={0.75}
                    onPress={() => handleSelectFund(fund)}
                  >
                    <View style={styles.fundItemIcon}>
                      <Ionicons name="pie-chart" size={16} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.fundItemName, isCurrent && styles.fundItemNameActive]} numberOfLines={1}>
                        {fund.name}
                      </Text>
                      <Text style={styles.fundItemMeta} numberOfLines={1}>
                        {fund.amc || 'AMC'} • {fund.category}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                      <Text style={styles.fundItemExpense}>{fund.currentExpense}</Text>
                      <Text style={styles.fundItemExpenseLbl}>Expense</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Dynamic Option if User Types Custom Fund Name */}
              {modalSearchText.trim().length > 2 && (
                <TouchableOpacity
                  style={styles.customFundItem}
                  activeOpacity={0.8}
                  onPress={() => handleCustomFundSelect(modalSearchText)}
                >
                  <Ionicons name="sparkles" size={18} color={colors.warning} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.customFundTitle}>
                      Select & Audit: "{modalSearchText.trim()}"
                    </Text>
                    <Text style={styles.customFundSub}>
                      Instantly generate deep diagnostic & direct index replacement for this fund.
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color={colors.warning} />
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Zero Penalty Direct Plan Migration Wizard Modal */}
      <SIPMigrationModal
        visible={!!migratingFund}
        fund={migratingFund}
        onClose={() => setMigratingFund(null)}
      />

      <View style={{ height: 90 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
  },
  toolCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  toolIconAperture: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolMainTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: colors.text,
  },
  toolMainSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  inputSectionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 2,
  },
  mainSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  mainSearchPlaceholder: {
    flex: 1,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  browsePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 6,
  },
  browsePillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.primary,
  },
  activeFundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#141E2E',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    marginBottom: 12,
  },
  activeFundLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  activeFundIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFundName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.text,
  },
  activeFundMeta: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  changeFundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 2,
  },
  changeFundBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  quickPicksLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  quickPicksScroll: {
    marginBottom: 4,
  },
  quickPickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  quickPickChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: colors.primary,
  },
  quickPickChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  quickPickChipTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  quickPickBrowseAll: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131F33',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  quickPickBrowseAllText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  tierRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
    marginTop: 8,
  },
  tierPill: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tierPillActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  tierPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tierPillTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },

  // PRE-AUDIT MATRIX CARD
  auditPreviewCard: {
    backgroundColor: '#0B1322',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.22)',
    marginBottom: 12,
    marginTop: 2,
  },
  auditPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  auditPreviewIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditPreviewTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 0.5,
  },
  auditPreviewSub: {
    fontSize: 9.5,
    color: colors.textMuted,
    marginTop: 1,
  },
  zeroCutBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  zeroCutBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.4,
  },
  auditMatrixRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  auditMatrixCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  auditMatrixVal: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
  },
  auditMatrixLbl: {
    fontSize: 8.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  auditMatrixDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },

  // EXECUTIVE CTA BUTTON
  runButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  runButtonGrad: {
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  runBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  runBtnIconAperture: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  runButtonMainText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  runButtonSubText: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 9.5,
    marginTop: 1.5,
  },
  trustStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  trustStripText: {
    fontSize: 9.5,
    color: colors.textMuted,
  },

  // RESULTS CONTAINER
  resultsContainer: {
    marginTop: 12,
    gap: 14,
  },
  diagnosticCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  diagHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  diagSub: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  diagFundName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginTop: 1,
  },
  diagCategory: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  healthScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  healthScoreText: {
    fontSize: 11,
    fontWeight: '900',
  },
  leakNoteBox: {
    backgroundColor: '#141E2E',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  leakTagTitle: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  leakTagReason: {
    fontSize: 11.5,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  diagMetricsRow: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  diagCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  diagColLbl: {
    fontSize: 8,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  diagColVal: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text,
    marginTop: 2,
  },
  diagColSub: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 1,
  },
  diagDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#1E293B',
  },
  battleTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.warning,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  battleCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  battleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  sideCol: {
    flex: 1,
    backgroundColor: '#141E2E',
    borderRadius: 12,
    padding: 10,
  },
  sideColWinner: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  currentTag: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  currentTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.textMuted,
  },
  winnerTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  winnerTagText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.primary,
  },
  sideFundName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 16,
  },
  sideSub: {
    fontSize: 9.5,
    color: colors.textMuted,
    marginTop: 1,
    marginBottom: 8,
  },
  sideMetricItem: {
    marginVertical: 4,
  },
  sideMetricLbl: {
    fontSize: 9,
    color: colors.textMuted,
  },
  sideMetricVal: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  sideWealthItem: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  sideWealthLbl: {
    fontSize: 8.5,
    color: colors.textMuted,
    fontWeight: '600',
  },
  sideWealthVal: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.text,
    marginTop: 1,
  },
  battleDivider: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  vsText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: colors.warning,
  },
  extraWealthBanner: {
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  extraWealthSub: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  extraWealthAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 1,
  },
  extraWealthNote: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
    lineHeight: 14,
  },
  reasonsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  reasonsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  reasonText: {
    flex: 1,
    fontSize: 11.5,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  // RESULTS ACTIONS
  resultActions: {
    gap: 10,
    marginTop: 4,
  },
  switchRoadmapBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  switchRoadmapGrad: {
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  switchRoadmapInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchRoadmapIconAperture: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRoadmapTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  switchRoadmapSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 9.5,
    marginTop: 1.5,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111C2E',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  resetBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  resetBtnSubText: {
    color: colors.textMuted,
    fontSize: 9,
    marginTop: 1,
  },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 28,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 20,
  },
  modalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  modalFilterScroll: {
    marginBottom: 12,
  },
  modalFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modalFilterChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: colors.primary,
  },
  modalFilterChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalFilterChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  modalFundsList: {
    maxHeight: 400,
  },
  fundListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141E2E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  fundListItemActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  fundItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fundItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  fundItemNameActive: {
    color: colors.primary,
  },
  fundItemMeta: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  fundItemExpense: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.warning,
  },
  fundItemExpenseLbl: {
    fontSize: 9,
    color: colors.textMuted,
  },
  customFundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginTop: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  customFundTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.warning,
  },
  customFundSub: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 14,
  },
});
