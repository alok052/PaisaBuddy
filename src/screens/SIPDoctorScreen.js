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
    }, 700);
  };

  const handleReset = () => {
    Haptics.selectionAsync();
    setHasAnalyzed(false);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Premium Brand Header */}
      <AppHeader
        subtitle="SIP Doctor • Fiduciary Health Audit"
        onMenuPress={onOpenMenu}
      />

      {/* Fiduciary Guarantee Strip: Hippocratic Oath */}
      <View style={styles.fiduciaryBanner}>
        <View style={styles.fiduciaryItem}>
          <Ionicons name="medkit" size={12} color="#10B981" />
          <Text style={styles.fiduciaryText} numberOfLines={1}>0% Churn Doctor</Text>
        </View>
        <View style={styles.fiduciaryDivider} />
        <View style={styles.fiduciaryItem}>
          <Ionicons name="shield-checkmark" size={12} color="#38BDF8" />
          <Text style={styles.fiduciaryText} numberOfLines={1}>SEBI Direct Plans</Text>
        </View>
        <View style={styles.fiduciaryDivider} />
        <View style={styles.fiduciaryItem}>
          <Ionicons name="cash-outline" size={12} color="#F59E0B" />
          <Text style={styles.fiduciaryText} numberOfLines={1}>₹0 Agent Comm.</Text>
        </View>
      </View>

      {!hasAnalyzed ? (
        /* TOOL INPUT MODE */
        <View style={styles.toolCard}>
          <View style={styles.toolHeader}>
            <View style={styles.toolIconAperture}>
              <Ionicons name="pulse-outline" size={18} color="#38BDF8" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.toolMainTitle}>Mutual Fund Health Diagnostic</Text>
              <Text style={styles.toolMainSub}>
                Detect hidden commission drains, verify benchmark alpha, or confirm portfolio fitness.
              </Text>
            </View>
          </View>

          {/* STEP 1: SELECT YOUR MUTUAL FUND */}
          <Text style={styles.inputSectionLabel}>1. SELECT MUTUAL FUND TO AUDIT</Text>

          {/* Search Bar Trigger */}
          <TouchableOpacity
            style={styles.mainSearchBar}
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSearchModalVisible(true);
            }}
          >
            <Ionicons name="search" size={16} color="#64748B" style={{ marginRight: 8 }} />
            <Text style={styles.mainSearchPlaceholder} numberOfLines={1}>
              Search 50+ schemes (Parag Parikh, SBI, HDFC)...
            </Text>
            <View style={styles.browsePill}>
              <Text style={styles.browsePillText}>Browse 50+</Text>
              <Ionicons name="chevron-forward" size={11} color="#38BDF8" style={{ marginLeft: 2 }} />
            </View>
          </TouchableOpacity>

          {/* Currently Selected Fund Card */}
          <View style={styles.activeFundCard}>
            <View style={styles.activeFundLeft}>
              <View style={styles.activeFundIcon}>
                <Ionicons name="shield-checkmark" size={17} color="#38BDF8" />
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
              <Ionicons name="chevron-forward" size={12} color="#38BDF8" />
            </TouchableOpacity>
          </View>

          {/* Popular Schemes Carousel (1-Tap Selection) */}
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
                    <Ionicons name="checkmark-circle" size={12} color="#38BDF8" style={{ marginRight: 4 }} />
                  ) : (
                    <Ionicons name="flash" size={11} color="#F59E0B" style={{ marginRight: 4 }} />
                  )}
                  <Text style={[styles.quickPickChipText, isCur && styles.quickPickChipTextActive]}>
                    {shortName}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.quickPickBrowseAll}
              onPress={() => {
                Haptics.selectionAsync();
                setSearchModalVisible(true);
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="grid-outline" size={12} color="#38BDF8" style={{ marginRight: 4 }} />
              <Text style={styles.quickPickBrowseAllText}>All 50+ Schemes →</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* STEP 2: PLAN TYPE SELECTOR (Crucial Fiduciary Input) */}
          <Text style={[styles.inputSectionLabel, { marginTop: 14 }]}>
            2. YOUR PLAN TYPE (WHERE DID YOU BUY?)
          </Text>

          <View style={styles.planTypeRow}>
            {/* Regular Plan Card */}
            <TouchableOpacity
              style={[styles.planCard, planType === 'REGULAR' && styles.planCardActiveRegular]}
              onPress={() => {
                Haptics.selectionAsync();
                setPlanType('REGULAR');
              }}
              activeOpacity={0.8}
            >
              <View style={styles.planCardTop}>
                <Ionicons
                  name="business-outline"
                  size={16}
                  color={planType === 'REGULAR' ? '#F59E0B' : '#64748B'}
                />
                <Text
                  style={[
                    styles.planCardTitle,
                    planType === 'REGULAR' && { color: '#F59E0B' },
                  ]}
                >
                  Regular Plan
                </Text>
              </View>
              <Text style={styles.planCardSub}>
                Via Bank Manager, Agent, ya Distributor (~1% fee cut)
              </Text>
            </TouchableOpacity>

            {/* Direct Plan Card */}
            <TouchableOpacity
              style={[styles.planCard, planType === 'DIRECT' && styles.planCardActiveDirect]}
              onPress={() => {
                Haptics.selectionAsync();
                setPlanType('DIRECT');
              }}
              activeOpacity={0.8}
            >
              <View style={styles.planCardTop}>
                <Ionicons
                  name="flash-outline"
                  size={16}
                  color={planType === 'DIRECT' ? '#10B981' : '#64748B'}
                />
                <Text
                  style={[
                    styles.planCardTitle,
                    planType === 'DIRECT' && { color: '#10B981' },
                  ]}
                >
                  Direct Plan
                </Text>
              </View>
              <Text style={styles.planCardSub}>
                Via Zerodha Coin, Groww, MFCentral (0% commission)
              </Text>
            </TouchableOpacity>
          </View>

          {/* STEP 3: MONTHLY SIP AMOUNT */}
          <Text style={[styles.inputSectionLabel, { marginTop: 14 }]}>3. MONTHLY SIP COMMITMENT</Text>
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

          {/* STEP 4: INVESTMENT HORIZON */}
          <Text style={styles.inputSectionLabel}>4. INVESTMENT TIMELINE</Text>
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

          {/* LUXURY EXECUTIVE CTA BUTTON */}
          <TouchableOpacity
            style={styles.runButton}
            activeOpacity={0.88}
            onPress={handleRunDiagnostic}
            disabled={isAnalyzing}
          >
            <LinearGradient
              colors={['#38BDF8', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.runButtonGrad}
            >
              {isAnalyzing ? (
                <View style={styles.runBtnInner}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.runButtonMainText}>RUNNING CLINICAL WEALTH AUDIT...</Text>
                    <Text style={styles.runButtonSubText}>Auditing expense ratio drag & rolling alpha</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.runBtnInner}>
                  <View style={styles.runBtnIconAperture}>
                    <Ionicons name="medkit" size={17} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.runButtonMainText}>RUN WEALTH HEALTH AUDIT</Text>
                    <Text style={styles.runButtonSubText}>
                      Fiduciary diagnosis • Zero churn promise • Instant remedy
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ opacity: 0.9 }} />
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
                <Text style={styles.diagSub}>DIAGNOSTIC VERDICT</Text>
                <Text style={styles.diagFundName}>{selectedFund.name}</Text>
                <Text style={styles.diagCategory}>
                  {selectedFund.amc || 'Mutual Fund'} • {planType === 'DIRECT' ? 'Direct Plan (0% Cut)' : 'Regular Plan'}
                </Text>
              </View>

              <View style={[styles.healthScoreBadge, { backgroundColor: diagnosis.healthColor + '18' }]}>
                <Ionicons name="medkit" size={14} color={diagnosis.healthColor} style={{ marginRight: 4 }} />
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
                <Ionicons name="receipt-outline" size={15} color="#38BDF8" />
                <Text style={styles.prescriptionTitle}>DOCTOR'S PRESCRIPTION (ILAJ):</Text>
              </View>
              <Text style={styles.prescriptionMainText}>{diagnosis.prescription}</Text>
              {diagnosis.prescriptionPoints.map((pt, idx) => (
                <View key={idx} style={styles.prescPointRow}>
                  <Ionicons name="checkmark-circle" size={13} color="#10B981" style={{ marginTop: 2 }} />
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
                  <Ionicons name="trophy" size={20} color="#F59E0B" />
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
                <Ionicons name="refresh" size={15} color="#94A3B8" style={{ marginRight: 8 }} />
                <Text style={styles.resetBtnText}>Audit Another Mutual Fund Scheme</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ======================================================== */
            /* SCENARIO 2 & 3: LEAKAGE / REMEDY ACTIONS                 */
            /* ======================================================== */
            <View>
              {/* Extra Wealth Created / Recovered Banner */}
              {calculatedExtraWealth > 0 && (
                <View style={styles.extraWealthCard}>
                  <Ionicons name="trending-up" size={24} color="#10B981" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
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
                    <Ionicons name="flash" size={17} color="#FFFFFF" style={{ marginRight: 8 }} />
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
                  <Ionicons name="calculator-outline" size={16} color="#38BDF8" style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taxSwitchTitle}>Claim ₹1.25L Tax-Free LTCG Harvest</Text>
                    <Text style={styles.taxSwitchSub}>
                      Section 112A lets you switch gains with ₹0 tax liability before March 31.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={15} color="#64748B" />
                </TouchableOpacity>

                {/* 3. Reset Button */}
                <TouchableOpacity style={styles.resetBtn} activeOpacity={0.8} onPress={handleReset}>
                  <Ionicons name="refresh" size={15} color="#94A3B8" style={{ marginRight: 8 }} />
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
    backgroundColor: '#0A0E17',
    paddingHorizontal: 8,
  },
  fiduciaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F1622',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 6,
    marginTop: 2,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  fiduciaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  fiduciaryText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  fiduciaryDivider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  toolCard: {
    backgroundColor: '#0F1622',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  toolIconAperture: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  toolMainTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  toolMainSub: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 14,
  },
  inputSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 6,
  },
  mainSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131D2E',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  mainSearchPlaceholder: {
    flex: 1,
    fontSize: 11.5,
    color: '#94A3B8',
  },
  browsePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  browsePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
  },
  activeFundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 12,
  },
  activeFundLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  activeFundIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFundName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  activeFundMeta: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  changeFundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
  },
  changeFundBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#38BDF8',
  },
  quickPicksLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 6,
  },
  quickPicksScroll: {
    marginBottom: 12,
  },
  quickPickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131D2E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  quickPickChipActive: {
    borderColor: 'rgba(56, 189, 248, 0.4)',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  quickPickChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  quickPickChipTextActive: {
    color: '#38BDF8',
  },
  quickPickBrowseAll: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  quickPickBrowseAllText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#38BDF8',
  },
  planTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  planCard: {
    flex: 1,
    backgroundColor: '#131D2E',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  planCardActiveRegular: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  planCardActiveDirect: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  planCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  planCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  planCardSub: {
    fontSize: 9.5,
    color: '#94A3B8',
    lineHeight: 13,
  },
  tierRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  tierPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#131D2E',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tierPillActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
  },
  tierPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tierPillTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  runButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  runButtonGrad: {
    paddingVertical: 12,
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
    fontSize: 12.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  runButtonSubText: {
    fontSize: 9.5,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  resultsContainer: {
    gap: 12,
  },
  diagnosticCard: {
    backgroundColor: '#0F1622',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  diagHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  diagSub: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  diagFundName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginTop: 2,
  },
  diagCategory: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  healthScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  healthScoreText: {
    fontSize: 13,
    fontWeight: '900',
  },
  leakNoteBox: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  leakTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
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
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  leakTagReason: {
    fontSize: 11,
    color: '#CBD5E1',
    lineHeight: 16,
  },
  prescriptionBox: {
    backgroundColor: '#131D2E',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  prescriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  prescriptionTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.5,
  },
  prescriptionMainText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  prescPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  prescPointText: {
    fontSize: 10.5,
    color: '#94A3B8',
    flex: 1,
    lineHeight: 14,
  },
  healthyContainer: {
    gap: 12,
  },
  healthyCard: {
    backgroundColor: '#0F1622',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  healthyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  healthyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  healthySubText: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
    marginBottom: 14,
  },
  milestoneHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  milestoneGrid: {
    flexDirection: 'row',
    backgroundColor: '#131D2E',
    borderRadius: 10,
    padding: 10,
    justifyContent: 'space-between',
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
  milestoneAmt: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  milestoneLabel: {
    fontSize: 8.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  extraWealthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1622',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  extraWealthSub: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  extraWealthAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  extraWealthNote: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 14,
  },
  battleCard: {
    backgroundColor: '#0F1622',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  battleTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  battleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideCol: {
    flex: 1,
    backgroundColor: '#131D2E',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sideColWinner: {
    borderColor: 'rgba(56, 189, 248, 0.3)',
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
  },
  currentTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
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
    marginBottom: 4,
  },
  winnerTagText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#38BDF8',
  },
  sideFundName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sideSub: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 1,
    marginBottom: 6,
  },
  sideMetricItem: {
    marginTop: 4,
  },
  sideMetricLbl: {
    fontSize: 8.5,
    color: '#64748B',
  },
  sideMetricVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sideWealthItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 6,
    padding: 6,
    marginTop: 8,
  },
  sideWealthLbl: {
    fontSize: 8.5,
    color: '#64748B',
  },
  sideWealthVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 1,
  },
  battleDivider: {
    paddingHorizontal: 6,
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
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  vsText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#94A3B8',
  },
  resultActions: {
    gap: 8,
    marginTop: 4,
  },
  switchRoadmapBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  switchRoadmapGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  switchRoadmapTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  switchRoadmapSub: {
    fontSize: 9.5,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  taxSwitchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1622',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  taxSwitchTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  taxSwitchSub: {
    fontSize: 9.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F1622',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 4,
  },
  resetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0A0E17',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    maxHeight: '88%',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalSub: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1622',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 9 : 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  modalSearchTextInput: {
    flex: 1,
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
    paddingVertical: 0,
  },
  modalCategoryScroll: {
    marginBottom: 10,
    maxHeight: 34,
  },
  modalCatChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#0F1622',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginRight: 6,
  },
  modalCatChipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
  },
  modalCatChipText: {
    fontSize: 10.5,
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
    backgroundColor: '#0F1622',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  modalFundRowSelected: {
    borderColor: 'rgba(56, 189, 248, 0.35)',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  modalFundIcon: {
    width: 30,
    height: 30,
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
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalFundNameSelected: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  modalFundSub: {
    fontSize: 9.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  customAuditCard: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  customAuditGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  customAuditTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38BDF8',
  },
  customAuditSub: {
    fontSize: 9.5,
    color: '#94A3B8',
    marginTop: 2,
  },
});
