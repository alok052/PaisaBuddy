import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';

export default function StartupPitchRoomModal({ visible, startup, onClose, onCoInvestPress }) {
  const [activeTab, setActiveTab] = useState('THESIS'); // 'THESIS' | 'CAP_TABLE' | 'CALCULATOR'
  const [calcCheque, setCalcCheque] = useState(10000);

  if (!startup) return null;

  const chequeOptions = [5000, 10000, 25000, 50000, 100000];

  const handleTabSwitch = (tab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  const handleSelectCheque = (amt) => {
    Haptics.selectionAsync();
    setCalcCheque(amt);
  };

  const handleProceedToInvest = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
    if (onCoInvestPress) {
      setTimeout(() => {
        onCoInvestPress(startup);
      }, 250);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Top Drag Indicator */}
          <View style={styles.handleBar}>
            <View style={styles.handleIndicator} />
          </View>

          {/* Institutional Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.avatarBox, { backgroundColor: startup.iconBg || '#10B981' }]}>
                <Text style={styles.avatarEmoji}>{startup.iconEmoji || '🚀'}</Text>
              </View>
              <View style={styles.headerTitleBox}>
                <View style={styles.titleRow}>
                  <Text style={styles.startupName} numberOfLines={1}>
                    {startup.name}
                  </Text>
                  {startup.isUnicorn && (
                    <View style={styles.unicornBadge}>
                      <Text style={styles.unicornBadgeText}>🦄 Unicorn</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.categorySub} numberOfLines={1}>
                  {startup.category} • {startup.city}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Segmented Control */}
          <View style={styles.segmentedControlWrapper}>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[styles.segmentTab, activeTab === 'THESIS' && styles.segmentTabActive]}
                onPress={() => handleTabSwitch('THESIS')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    activeTab === 'THESIS' && styles.segmentLabelActive,
                  ]}
                >
                  📑 Deal Thesis
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentTab, activeTab === 'CAP_TABLE' && styles.segmentTabActive]}
                onPress={() => handleTabSwitch('CAP_TABLE')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    activeTab === 'CAP_TABLE' && styles.segmentLabelActive,
                  ]}
                >
                  👥 Cap Table
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentTab, activeTab === 'CALCULATOR' && styles.segmentTabActive]}
                onPress={() => handleTabSwitch('CALCULATOR')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    activeTab === 'CALCULATOR' && styles.segmentLabelActive,
                  ]}
                >
                  🧮 ROI Calculator
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ======================================================== */}
            {/* TAB 1: DEAL THESIS & BUSINESS MODEL                      */}
            {/* ======================================================== */}
            {activeTab === 'THESIS' && (
              <View>
                {/* Whale Backer Spotlight Banner */}
                {startup.whaleBacker && (
                  <View style={styles.whaleSpotlightBox}>
                    <Ionicons name="shield-checkmark" size={16} color="#38BDF8" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.whaleSpotlightTitle}>
                        Co-Invest with {startup.whaleBacker}
                      </Text>
                      <Text style={styles.whaleSpotlightDesc}>
                        Lead institutional syndicate allocation verified under SEBI Angel Fund / AIF Category I norms.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Core Deal Financial Metrics Grid */}
                <View style={styles.metricsCard}>
                  <Text style={styles.cardSectionHeading}>INSTITUTIONAL ROUND METRICS</Text>
                  <View style={styles.metricsGrid}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Valuation</Text>
                      <Text style={styles.metricValueHighlight}>{startup.valuation}</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Round Stage</Text>
                      <Text style={styles.metricValue}>{startup.stage}</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Total Raised</Text>
                      <Text style={styles.metricValue}>{startup.totalRaised}</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Min. Cheque</Text>
                      <Text style={[styles.metricValue, { color: '#10B981' }]}>
                        {startup.minInvestment}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Financial Traction Box */}
                <View style={styles.tractionCard}>
                  <Text style={styles.cardSectionHeading}>FINANCIAL TRACTION & RUNWAY</Text>
                  <View style={styles.tractionRow}>
                    <View style={styles.tractionItem}>
                      <Text style={styles.tractionVal}>{startup.arrRevenue || '₹850 Cr Run-Rate'}</Text>
                      <Text style={styles.tractionSub}>Annualized Scale</Text>
                    </View>
                    <View style={styles.tractionItem}>
                      <Text style={[styles.tractionVal, { color: '#10B981' }]}>
                        {startup.growthMetric}
                      </Text>
                      <Text style={styles.tractionSub}>YoY Traction</Text>
                    </View>
                    <View style={styles.tractionItem}>
                      <Text style={styles.tractionVal}>{startup.grossMargin || '62% Margins'}</Text>
                      <Text style={styles.tractionSub}>Unit Economics</Text>
                    </View>
                  </View>
                </View>

                {/* Investment Thesis & Moat */}
                <View style={styles.thesisCard}>
                  <Text style={styles.cardSectionHeading}>INVESTMENT THESIS & MOAT</Text>
                  <Text style={styles.thesisText}>
                    {startup.pitchThesis ||
                      `${startup.name} is building market leadership in ${startup.category} with strong network effects and automated unit economics.`}
                  </Text>

                  <View style={styles.moatBulletRow}>
                    <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                    <Text style={styles.moatBulletText}>
                      Founding Team: <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>{startup.founders || 'Veteran Operators'}</Text>
                    </Text>
                  </View>

                  <View style={styles.moatBulletRow}>
                    <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                    <Text style={styles.moatBulletText}>
                      Target Exit Window: <Text style={{ color: '#F59E0B', fontWeight: '700' }}>{startup.targetExit || 'NSE / BSE Listing in 2026'}</Text>
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* ======================================================== */}
            {/* TAB 2: CAP TABLE & REGULATORY ESCROW                     */}
            {/* ======================================================== */}
            {activeTab === 'CAP_TABLE' && (
              <View>
                {/* Institutional Co-Investors */}
                <View style={styles.capCard}>
                  <Text style={styles.cardSectionHeading}>INSTITUTIONAL INVESTORS & MARQUEE BACKERS</Text>
                  <View style={styles.investorPillContainer}>
                    {(startup.investors || []).map((inv, idx) => (
                      <View key={idx} style={styles.investorTag}>
                        <Ionicons name="business-outline" size={12} color="#60A5FA" />
                        <Text style={styles.investorTagText}>{inv}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Regulatory Escrow & Demat Allotment */}
                <View style={styles.trustCard}>
                  <Text style={styles.cardSectionHeading}>LEGAL STRUCTURE & ESCROW PROTECTION</Text>
                  
                  <View style={styles.trustRow}>
                    <Ionicons name="lock-closed" size={16} color="#10B981" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.trustTitle}>SEBI-Regulated Escrow Account</Text>
                      <Text style={styles.trustDesc}>
                        {startup.escrowBank || 'ICICI Bank Escrow / Axis Trustee Services Ltd'}. Funds remain in escrow until round closes.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.trustRow}>
                    <Ionicons name="wallet-outline" size={16} color="#3B82F6" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.trustTitle}>Demat Direct Credit</Text>
                      <Text style={styles.trustDesc}>
                        {startup.instrument || 'Compulsorily Convertible Preference Shares (CCPS)'} credited directly to your CDSL / NSDL Demat account within 7 working days.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.trustRow}>
                    <Ionicons name="document-text-outline" size={16} color="#F59E0B" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.trustTitle}>Shareholders' Agreement (SHA)</Text>
                      <Text style={styles.trustDesc}>
                        Full tag-along rights, liquidation preference, and institutional information rights shared quarterly.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* ======================================================== */}
            {/* TAB 3: INTERACTIVE EXIT ROI CALCULATOR                   */}
            {/* ======================================================== */}
            {activeTab === 'CALCULATOR' && (
              <View>
                <View style={styles.calcCard}>
                  <Text style={styles.cardSectionHeading}>SELECT INVESTMENT CHEQUE</Text>
                  <Text style={styles.calcSubtitle}>
                    Simulate your wealth outcome across conservative, IPO, and multibagger unicorn exit scenarios.
                  </Text>

                  {/* Cheque Selector */}
                  <View style={styles.chequePillRow}>
                    {chequeOptions.map((amt) => {
                      const isSelected = calcCheque === amt;
                      return (
                        <TouchableOpacity
                          key={amt}
                          style={[styles.chequePill, isSelected && styles.chequePillActive]}
                          onPress={() => handleSelectCheque(amt)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.chequePillText, isSelected && styles.chequePillTextActive]}>
                            ₹{amt.toLocaleString('en-IN')}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Scenario Cards */}
                <View style={styles.scenariosContainer}>
                  {/* Scenario 1: Conservative Exit */}
                  <View style={styles.scenarioCard}>
                    <View style={styles.scenarioHeader}>
                      <View style={[styles.scenarioDot, { backgroundColor: '#3B82F6' }]} />
                      <Text style={styles.scenarioName}>CONSERVATIVE EXIT (2.5x)</Text>
                    </View>
                    <Text style={styles.scenarioOutcome}>
                      ₹{(calcCheque * 2.5).toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.scenarioGain}>
                      +₹{(calcCheque * 1.5).toLocaleString('en-IN')} Profit (+150% Gain)
                    </Text>
                    <Text style={styles.scenarioNote}>
                      Target: Secondary tender offer / corporate strategic buyout.
                    </Text>
                  </View>

                  {/* Scenario 2: Target IPO Exit */}
                  <View style={[styles.scenarioCard, styles.scenarioCardHighlight]}>
                    <View style={styles.scenarioHeader}>
                      <View style={[styles.scenarioDot, { backgroundColor: '#10B981' }]} />
                      <Text style={[styles.scenarioName, { color: '#10B981' }]}>
                        TARGET IPO LISTING (5.0x) 🏆
                      </Text>
                    </View>
                    <Text style={[styles.scenarioOutcome, { color: '#10B981' }]}>
                      ₹{(calcCheque * 5.0).toLocaleString('en-IN')}
                    </Text>
                    <Text style={[styles.scenarioGain, { color: '#10B981' }]}>
                      +₹{(calcCheque * 4.0).toLocaleString('en-IN')} Profit (+400% Gain)
                    </Text>
                    <Text style={styles.scenarioNote}>
                      Target: Successful public listing on NSE / BSE mainboard.
                    </Text>
                  </View>

                  {/* Scenario 3: Multibagger Unicorn Case */}
                  <View style={styles.scenarioCard}>
                    <View style={styles.scenarioHeader}>
                      <View style={[styles.scenarioDot, { backgroundColor: '#F59E0B' }]} />
                      <Text style={[styles.scenarioName, { color: '#F59E0B' }]}>
                        MULTIBAGGER DECACORN (10.0x) 🚀
                      </Text>
                    </View>
                    <Text style={styles.scenarioOutcome}>
                      ₹{(calcCheque * 10.0).toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.scenarioGain}>
                      +₹{(calcCheque * 9.0).toLocaleString('en-IN')} Profit (+900% Gain)
                    </Text>
                    <Text style={styles.scenarioNote}>
                      Target: Global decacorn category dominance ($10B+ scale).
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={{ height: 30 }} />
          </ScrollView>

          {/* Bottom Sticky Action Footer */}
          <View style={styles.footerBar}>
            <View style={styles.footerInfo}>
              <Text style={styles.footerMinLabel}>Minimum Commitment</Text>
              <Text style={styles.footerMinVal}>{startup.minInvestment}</Text>
            </View>

            <TouchableOpacity
              style={styles.ctaButtonWrapper}
              onPress={handleProceedToInvest}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#38BDF8', '#2563EB']}
                style={styles.ctaButtonGrad}
              >
                <Ionicons name="flash" size={14} color="#FFFFFF" />
                <Text style={styles.ctaButtonText}>Co-Invest in Round →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0A0E17',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    maxHeight: '92%',
    overflow: 'hidden',
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handleIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 22,
  },
  headerTitleBox: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  startupName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  unicornBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unicornBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
  },
  categorySub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedControlWrapper: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentTabActive: {
    backgroundColor: '#0F1622',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  segmentLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  segmentLabelActive: {
    color: '#F8FAFC',
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  whaleSpotlightBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 12,
    gap: 8,
  },
  whaleSpotlightTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  whaleSpotlightDesc: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 14,
  },
  metricsCard: {
    backgroundColor: '#0F1622',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 12,
  },
  cardSectionHeading: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricItem: {
    width: '48%',
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 2,
  },
  metricValueHighlight: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  tractionCard: {
    backgroundColor: '#0F1622',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 12,
  },
  tractionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tractionItem: {
    flex: 1,
  },
  tractionVal: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  tractionSub: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 2,
  },
  thesisCard: {
    backgroundColor: '#0F1622',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 12,
  },
  thesisText: {
    fontSize: 11.5,
    color: '#CBD5E1',
    lineHeight: 17,
    marginBottom: 12,
  },
  moatBulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  moatBulletText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  capCard: {
    backgroundColor: '#0F1622',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 12,
  },
  investorPillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  investorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    gap: 5,
  },
  investorTagText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#60A5FA',
  },
  trustCard: {
    backgroundColor: '#0F1622',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 12,
    gap: 12,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  trustTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  trustDesc: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 14,
  },
  calcCard: {
    backgroundColor: '#0F1622',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 12,
  },
  calcSubtitle: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginBottom: 12,
    lineHeight: 15,
  },
  chequePillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chequePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chequePillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  chequePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  chequePillTextActive: {
    color: '#10B981',
    fontWeight: '800',
  },
  scenariosContainer: {
    gap: 10,
  },
  scenarioCard: {
    backgroundColor: '#0F1622',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  scenarioCardHighlight: {
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  scenarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  scenarioDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scenarioName: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  scenarioOutcome: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  scenarioGain: {
    fontSize: 11,
    fontWeight: '800',
    color: '#60A5FA',
    marginTop: 2,
  },
  scenarioNote: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 6,
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#0D141F',
  },
  footerInfo: {},
  footerMinLabel: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  footerMinVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#60A5FA',
    marginTop: 1,
  },
  ctaButtonWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  ctaButtonGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 6,
  },
  ctaButtonText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
