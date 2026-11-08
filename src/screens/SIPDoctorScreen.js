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
    { label: '5Y', value: 5 },
    { label: '10Y', value: 10 },
    { label: '15Y', value: 15 },
    { label: '20Y', value: 20 },
  ];

  const categories = [
    { id: 'ALL', label: 'All' },
    { id: 'LARGE', label: 'Large Cap' },
    { id: 'FLEXI', label: 'Flexi Cap' },
    { id: 'MID', label: 'Mid Cap' },
    { id: 'SMALL', label: 'Small Cap' },
    { id: 'HYBRID', label: 'Hybrid' },
    { id: 'ELSS', label: 'ELSS' },
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

  // Compounding milestones
  const m5Y = (sipAmount * 12 * 5 * 1.55 / 100000).toFixed(1);
  const m10Y = (sipAmount * 12 * 10 * 2.35 / 100000).toFixed(1);
  const m15Y = (sipAmount * 12 * 15 * 4.15 / 100000).toFixed(1);
  const m20Y = (sipAmount * 12 * 20 * 7.55 / 100000).toFixed(1);

  // Filter modal funds
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
    }, 500);
  };

  const handleReset = () => {
    Haptics.selectionAsync();
    setHasAnalyzed(false);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Clean Header */}
      <AppHeader
        subtitle="Portfolio Health Check"
        onMenuPress={onOpenMenu}
      />

      {!hasAnalyzed ? (
        /* ========================================================= */
        /* CLEAN, MINIMAL INPUT FLOW (NO TEXT CLUTTER)               */
        /* ========================================================= */
        <View style={styles.flowWrapper}>
          {/* 1. FUND SELECTOR (SEARCH BAR OR COMPACT CARD) */}
          <Text style={styles.miniLabel}>MUTUAL FUND SCHEME</Text>

          {!selectedFund ? (
            /* Search Trigger */
            <TouchableOpacity
              style={styles.searchBarTrigger}
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSearchModalVisible(true);
              }}
            >
              <Ionicons name="search" size={17} color="#38BDF8" style={{ marginRight: 10 }} />
              <Text style={styles.searchPlaceholderText}>
                Search 50+ schemes (Parag Parikh, SBI, HDFC)...
              </Text>
              <Ionicons name="chevron-forward" size={15} color="#64748B" />
            </TouchableOpacity>
          ) : (
            /* Clean Selected Fund Card */
            <View style={styles.selectedFundCard}>
              <View style={styles.selectedFundTop}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.selectedFundName} numberOfLines={1}>
                    {selectedFund.name}
                  </Text>
                  <Text style={styles.selectedFundMeta}>
                    {selectedFund.amc || 'AMC'} • {selectedFund.category}
                  </Text>
                </View>

                {/* Clear Button */}
                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedFund(null);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.clearBtn}
                >
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* 3 Clean Numbers */}
              <View style={styles.selectedMetricsRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>EXPENSE</Text>
                  <Text style={styles.metricVal}>{selectedFund.currentExpense}</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>5Y CAGR</Text>
                  <Text style={[styles.metricVal, { color: '#10B981' }]}>
                    {selectedFund.currentCagr}
                  </Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>ALPHA</Text>
                  <Text style={[styles.metricVal, { color: selectedFund.alphaVsBenchmark?.includes('-') ? '#EF4444' : '#38BDF8' }]}>
                    {selectedFund.alphaVsBenchmark || '0.0%'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.changeAction}
                onPress={() => setSearchModalVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.changeActionText}>Change Fund →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Quick-Pick Popular Scheme Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickScroll}
            contentContainerStyle={{ paddingVertical: 2 }}
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
                  style={[styles.quickChip, isCur && styles.quickChipActive]}
                  onPress={() => handleSelectFund(fund)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.quickChipText, isCur && styles.quickChipTextActive]}>
                    {shortName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 2. PLAN TYPE (SLEEK SEGMENTED SWITCHER) */}
          <Text style={[styles.miniLabel, { marginTop: 14 }]}>PLAN TYPE</Text>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[
                styles.segmentTab,
                planType === 'DIRECT' && styles.segmentTabActiveDirect,
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
                  styles.segmentText,
                  planType === 'DIRECT' && styles.segmentTextActiveDirect,
                ]}
              >
                Direct (0% Cut)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentTab,
                planType === 'REGULAR' && styles.segmentTabActiveRegular,
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
                  styles.segmentText,
                  planType === 'REGULAR' && styles.segmentTextActiveRegular,
                ]}
              >
                Regular (~1% Cut)
              </Text>
            </TouchableOpacity>
          </View>

          {/* 3. SIP AMOUNT & HORIZON (CLEAN COMPACT CARD) */}
          <View style={styles.calcCard}>
            {/* Amount */}
            <View style={styles.calcRowHeader}>
              <Text style={styles.calcLabel}>MONTHLY SIP</Text>
              <Text style={styles.calcVal}>₹{sipAmount.toLocaleString('en-IN')}</Text>
            </View>

            <View style={styles.pillRow}>
              {sipAmounts.map((tier) => {
                const isSelected = sipAmount === tier.value;
                return (
                  <TouchableOpacity
                    key={tier.value}
                    style={[styles.pillBtn, isSelected && styles.pillBtnActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSipAmount(tier.value);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillBtnText, isSelected && styles.pillBtnTextActive]}>
                      {tier.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.calcDivider} />

            {/* Horizon */}
            <View style={styles.calcRowHeader}>
              <Text style={styles.calcLabel}>HORIZON</Text>
              <Text style={styles.calcVal}>{sipYears} Years</Text>
            </View>

            <View style={styles.pillRow}>
              {yearTiers.map((tier) => {
                const isSelected = sipYears === tier.value;
                return (
                  <TouchableOpacity
                    key={tier.value}
                    style={[styles.pillBtn, isSelected && styles.pillBtnActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSipYears(tier.value);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillBtnText, isSelected && styles.pillBtnTextActive]}>
                      {tier.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 4. PRIMARY AUDIT BUTTON (PUNCHY, NO PARAGRAPH) */}
          <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.88}
            onPress={handleRunDiagnostic}
            disabled={isAnalyzing}
          >
            <LinearGradient
              colors={['#38BDF8', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              {isAnalyzing ? (
                <View style={styles.ctaInner}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.ctaText}>Auditing Portfolio Health...</Text>
                </View>
              ) : (
                <View style={styles.ctaInner}>
                  <Ionicons
                    name={selectedFund ? 'pulse' : 'search'}
                    size={17}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.ctaText}>
                    {selectedFund ? 'Check SIP Health →' : 'Select a Fund to Check →'}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        /* ========================================================= */
        /* CLEAN CLINICAL REPORT CARD (PUNCHY & MINIMAL)             */
        /* ========================================================= */
        <View style={styles.reportWrapper}>
          {/* Verdict Score Hero */}
          <View style={[styles.scoreHeroCard, { borderColor: diagnosis?.healthColor + '40' }]}>
            <View style={styles.scoreRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.reportFundName} numberOfLines={1}>
                  {selectedFund?.name}
                </Text>
                <Text style={styles.reportFundSub}>
                  {planType === 'DIRECT' ? 'Direct Plan (0% Commission)' : 'Regular Plan (~1% Leak)'}
                </Text>
              </View>

              <View style={[styles.scoreBadge, { backgroundColor: diagnosis?.healthColor + '18' }]}>
                <Text style={[styles.scoreNumber, { color: diagnosis?.healthColor }]}>
                  {diagnosis?.healthScore}
                </Text>
                <Text style={[styles.scoreOutOf, { color: diagnosis?.healthColor }]}>/100</Text>
              </View>
            </View>

            {/* 1-Sentence Punchy Verdict */}
            <View style={[styles.verdictStrip, { backgroundColor: diagnosis?.healthColor + '10' }]}>
              <View style={[styles.verdictDot, { backgroundColor: diagnosis?.healthColor }]} />
              <Text style={styles.verdictHeading}>
                {diagnosis?.isHealthy
                  ? 'Healthy Portfolio (No Action Needed)'
                  : diagnosis?.statusType === 'SWITCH_TO_DIRECT'
                  ? 'Commission Leak Detected'
                  : 'Underperforming Benchmark'}
              </Text>
            </View>

            <Text style={styles.shortVerdictText}>
              {diagnosis?.isHealthy
                ? 'Aapka fund Direct Plan me bilkul swasth hai aur benchmark ko beat/match kar raha hai. 19-20 ka market cycle fark normal hota hai. Fund change mat karein, SIP continue rakhein.'
                : diagnosis?.statusType === 'SWITCH_TO_DIRECT'
                ? 'Fund accha hai, par Regular Plan hone se har saal ~1% distributor commission kat raha hai. Same fund ke Direct Plan me switch karein.'
                : `${selectedFund?.name} benchmark se peechhe chal raha hai. Low-cost Direct Index Fund me shift karna behtar hoga.`}
            </Text>
          </View>

          {/* SCENARIO 1: HEALTHY (ZERO CHURN) */}
          {diagnosis?.isHealthy ? (
            <View style={styles.healthyBlock}>
              {/* Compounding Milestones (Clean Numbers) */}
              <View style={styles.milestoneCard}>
                <Text style={styles.milestoneTitle}>
                  COMPOUNDING TRAJECTORY (AT ₹{sipAmount.toLocaleString('en-IN')}/MO):
                </Text>
                <View style={styles.milestoneRow}>
                  <View style={styles.milestoneCol}>
                    <Text style={styles.mYear}>5Y</Text>
                    <Text style={styles.mAmt}>₹{m5Y}L</Text>
                  </View>
                  <View style={styles.milestoneCol}>
                    <Text style={styles.mYear}>10Y</Text>
                    <Text style={styles.mAmt}>₹{m10Y}L</Text>
                  </View>
                  <View style={styles.milestoneCol}>
                    <Text style={styles.mYear}>15Y</Text>
                    <Text style={[styles.mAmt, { color: '#38BDF8' }]}>₹{m15Y}L</Text>
                  </View>
                  <View style={styles.milestoneCol}>
                    <Text style={styles.mYear}>20Y</Text>
                    <Text style={[styles.mAmt, { color: '#10B981' }]}>
                      {parseFloat(m20Y) >= 100 ? `₹${(parseFloat(m20Y) / 100).toFixed(2)}Cr` : `₹${m20Y}L`}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.resetOutlineBtn} activeOpacity={0.8} onPress={handleReset}>
                <Ionicons name="refresh" size={14} color="#94A3B8" style={{ marginRight: 6 }} />
                <Text style={styles.resetOutlineBtnText}>Check Another Fund</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* SCENARIO 2 & 3: LEAKAGE REMEDY */
            <View style={styles.remedyBlock}>
              {/* Recoverable Wealth Number */}
              {calculatedExtraWealth > 0 && (
                <View style={styles.extraStatCard}>
                  <Text style={styles.extraStatLabel}>POTENTIAL RECOVERABLE WEALTH ({sipYears}Y)</Text>
                  <Text style={styles.extraStatValue}>
                    +₹{calculatedExtraWealth >= 100 ? (calculatedExtraWealth / 100).toFixed(2) + ' Crore' : calculatedExtraWealth.toFixed(1) + ' Lakh'}
                  </Text>
                  <Text style={styles.extraStatSub}>
                    By eliminating ~1% annual agent cut and moving to SEBI Direct Plan.
                  </Text>
                </View>
              )}

              {/* Head-to-Head Compact Comparison */}
              {diagnosis?.replacement && (
                <View style={styles.comparisonCard}>
                  <View style={styles.compCol}>
                    <Text style={styles.compHead}>CURRENT</Text>
                    <Text style={styles.compName} numberOfLines={1}>{selectedFund?.name}</Text>
                    <Text style={styles.compStat}>{selectedFund?.currentExpense} Fee</Text>
                    <Text style={styles.compStat}>{selectedFund?.currentCagr} CAGR</Text>
                  </View>
                  <View style={styles.compVs}>
                    <Text style={styles.compVsText}>VS</Text>
                  </View>
                  <View style={[styles.compCol, { backgroundColor: 'rgba(56, 189, 248, 0.08)' }]}>
                    <Text style={[styles.compHead, { color: '#38BDF8' }]}>DIRECT FIX</Text>
                    <Text style={[styles.compName, { color: '#38BDF8' }]} numberOfLines={1}>
                      {diagnosis.replacement.name}
                    </Text>
                    <Text style={[styles.compStat, { color: '#10B981' }]}>
                      {diagnosis.replacement.expenseRatio} Fee
                    </Text>
                    <Text style={[styles.compStat, { color: '#10B981' }]}>
                      {diagnosis.replacement.cagr5Y} CAGR
                    </Text>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <TouchableOpacity
                style={styles.actionPrimaryBtn}
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
                  style={styles.actionPrimaryGrad}
                >
                  <Ionicons name="flash" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.actionPrimaryText}>Direct Switch Guide (0% Cut) →</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionSecondaryBtn}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setTaxModalVisible(true);
                }}
              >
                <Ionicons name="calculator-outline" size={15} color="#38BDF8" style={{ marginRight: 6 }} />
                <Text style={styles.actionSecondaryText}>Claim ₹1.25L Tax-Free LTCG Harvest</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.resetOutlineBtn} activeOpacity={0.8} onPress={handleReset}>
                <Ionicons name="refresh" size={14} color="#94A3B8" style={{ marginRight: 6 }} />
                <Text style={styles.resetOutlineBtnText}>Check Another Fund</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* COMPACT SEARCH & SELECT MODAL */}
      <Modal
        visible={searchModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Mutual Fund</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSearchModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchInputWrapper}>
              <Ionicons name="search" size={15} color="#64748B" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.modalSearchTextInput}
                placeholder="Search scheme name or AMC..."
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

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 10, maxHeight: 32 }}
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
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalFundName, isSelected && { color: '#38BDF8' }]} numberOfLines={1}>
                        {fund.name}
                      </Text>
                      <Text style={styles.modalFundSub}>
                        {fund.category} • Fee: {fund.currentExpense}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="#64748B" />
                  </TouchableOpacity>
                );
              })}

              {modalSearchText.trim().length > 2 && (
                <TouchableOpacity
                  style={styles.customAuditRow}
                  activeOpacity={0.85}
                  onPress={() => handleCustomFundSelect(modalSearchText)}
                >
                  <Ionicons name="sparkles" size={15} color="#38BDF8" style={{ marginRight: 8 }} />
                  <Text style={styles.customAuditText}>
                    Audit "{modalSearchText.trim()}"
                  </Text>
                </TouchableOpacity>
              )}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MIGRATION MODAL */}
      <SIPMigrationModal
        visible={!!migratingFund}
        fund={migratingFund}
        onClose={() => setMigratingFund(null)}
      />

      {/* TAX MODAL */}
      <TaxHarvestingModal
        visible={taxModalVisible}
        onClose={() => setTaxModalVisible(false)}
      />

      <View style={{ height: 110 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07090E',
    paddingHorizontal: 16,
  },
  flowWrapper: {
    gap: 0,
    marginTop: 6,
  },
  miniLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  searchBarTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D111A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchPlaceholderText: {
    flex: 1,
    fontSize: 12.5,
    color: '#94A3B8',
  },
  selectedFundCard: {
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  selectedFundTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  selectedFundName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  selectedFundMeta: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  clearBtn: {
    padding: 2,
  },
  selectedMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131926',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#64748B',
  },
  metricVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  changeAction: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  changeActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
  },
  quickScroll: {
    marginTop: 10,
    marginBottom: 6,
  },
  quickChip: {
    backgroundColor: '#0D111A',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 7,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  quickChipActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  quickChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  quickChipTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#0D111A',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 14,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
  },
  segmentTabActiveDirect: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  segmentTabActiveRegular: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  segmentText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  segmentTextActiveDirect: {
    color: '#10B981',
    fontWeight: '800',
  },
  segmentTextActiveRegular: {
    color: '#F59E0B',
    fontWeight: '800',
  },
  calcCard: {
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  calcRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calcLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  calcVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pillBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#131926',
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  pillBtnActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  pillBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  pillBtnTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  calcDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 12,
  },
  ctaButton: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  ctaGradient: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  reportWrapper: {
    gap: 12,
    marginTop: 6,
  },
  scoreHeroCard: {
    backgroundColor: '#0D111A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reportFundName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  reportFundSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  scoreNumber: {
    fontSize: 18,
    fontWeight: '900',
  },
  scoreOutOf: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 1,
  },
  verdictStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
    marginBottom: 8,
  },
  verdictDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  verdictHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  shortVerdictText: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
  },
  healthyBlock: {
    gap: 12,
  },
  milestoneCard: {
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  milestoneTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 10,
  },
  milestoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  milestoneCol: {
    alignItems: 'center',
    flex: 1,
  },
  mYear: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  mAmt: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  remedyBlock: {
    gap: 12,
  },
  extraStatCard: {
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  extraStatLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  extraStatValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  extraStatSub: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  comparisonCard: {
    flexDirection: 'row',
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  compCol: {
    flex: 1,
    backgroundColor: '#131926',
    borderRadius: 10,
    padding: 10,
  },
  compHead: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 2,
  },
  compName: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  compStat: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  compVs: {
    paddingHorizontal: 8,
  },
  compVsText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748B',
  },
  actionPrimaryBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionPrimaryGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  actionPrimaryText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  actionSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D111A',
    borderRadius: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionSecondaryText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#38BDF8',
  },
  resetOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 8,
  },
  resetOutlineBtnText: {
    fontSize: 11,
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 16,
    paddingHorizontal: 16,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSearchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D111A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  modalSearchTextInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  modalCatChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#0D111A',
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalCatChipActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  modalCatChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  modalCatChipTextActive: {
    color: '#38BDF8',
  },
  modalFundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D111A',
    borderRadius: 10,
    padding: 11,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  modalFundRowSelected: {
    borderColor: '#38BDF8',
  },
  modalFundName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalFundSub: {
    fontSize: 9.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  customAuditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#0D111A',
    borderRadius: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  customAuditText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#38BDF8',
  },
});
