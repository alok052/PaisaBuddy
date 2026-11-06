import AppHeader from '../components/AppHeader';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { mockPortfolioReview } from '../data/mockReview';
import WhaleAvatar from '../components/WhaleAvatar';
import { generateAndShareAuditPdf } from '../services/pdfService';

export default function AIPortfolioReviewScreen({ onOpenMenu }) {
  const [hasReviewed, setHasReviewed] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsExportingPdf(true);
      await generateAndShareAuditPdf(mockPortfolioReview);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('PDF export error:', error);
      Alert.alert('Export Failed', 'Unable to create PDF report on this device: ' + error.message);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Gallery access is required to select portfolio screenshots.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      startAIScan('Scanning screenshot text & holdings...');
    }
  };

  const startAIScan = (initialMessage = 'AI Scanning Holdings...') => {
    setIsScanning(true);
    setScanStatus(initialMessage);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setTimeout(() => {
      setScanStatus('Matching with SEBI Billionaire filings...');
    }, 1200);

    setTimeout(() => {
      setScanStatus('Calculating Mutual Fund overlaps & tax impact...');
    }, 2400);

    setTimeout(() => {
      setIsScanning(false);
      setHasReviewed(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 3600);
  };

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHasReviewed(false);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Premium Brand Header */}
      <AppHeader
        subtitle="Portfolio Health & Direct Audit"
        onMenuPress={onOpenMenu}
      />

      {hasReviewed && (
        <View style={styles.resetHeaderRow}>
          <Text style={styles.resetHeaderTitle}>DIAGNOSTIC REPORT</Text>
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.8}>
            <Ionicons name="refresh-outline" size={13} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.resetBtnText}>New Scan</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Scanning Loader State */}
      {isScanning && (
        <View style={styles.scanningCard}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.scanningTitle}>PaisaBuddy AI Active</Text>
          <Text style={styles.scanningStatus}>{scanStatus}</Text>
          <View style={styles.scanningPulse}>
            <Text style={styles.scanningTip}>⚡ Gemini Vision Engine is analyzing holdings...</Text>
          </View>
        </View>
      )}

      {/* STATE 1: UPLOAD & DIAGNOSTICS HUB (If not reviewed) */}
      {!hasReviewed && !isScanning && (
        <View style={styles.uploadContainer}>
          {/* Main Hero Upload Box */}
          <TouchableOpacity
            style={styles.mainUploadBox}
            activeOpacity={0.85}
            onPress={handlePickImage}
          >
            <LinearGradient
              colors={['#101A28', '#0A121E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.uploadGradient}
            >
              <View style={styles.scannerAperture}>
                <Ionicons name="scan-outline" size={32} color={colors.primary} />
              </View>
              <Text style={styles.uploadTitle}>Upload Portfolio Screenshot</Text>
              <Text style={styles.uploadSubtitle}>
                Select screenshot of your Holdings, P&L, or Mutual Funds from any broker
              </Text>

              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.uploadBtnGradient}
              >
                <Ionicons name="images" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.uploadBtnText}>Select from Photos / Gallery</Text>
              </LinearGradient>
            </LinearGradient>
          </TouchableOpacity>

          {/* Direct File Importers */}
          <View style={styles.altUploadGrid}>
            <TouchableOpacity
              style={styles.altUploadBox}
              activeOpacity={0.8}
              onPress={() => startAIScan('Parsing CAMS / KFintech CAS PDF statement...')}
            >
              <View style={[styles.altIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Ionicons name="document-text" size={20} color={colors.accentBlue} />
              </View>
              <Text style={styles.altTitle}>CAMS / KFintech</Text>
              <Text style={styles.altSub}>Official Mutual Fund CAS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.altUploadBox}
              activeOpacity={0.8}
              onPress={() => startAIScan('Parsing Zerodha P&L Excel / CSV file...')}
            >
              <View style={[styles.altIconCircle, { backgroundColor: 'rgba(37, 99, 235, 0.15)' }]}>
                <Ionicons name="stats-chart" size={20} color={colors.accentBlue} />
              </View>
              <Text style={styles.altTitle}>Broker P&L File</Text>
              <Text style={styles.altSub}>Zerodha / Groww CSV</Text>
            </TouchableOpacity>
          </View>

          {/* Supported Brokers Strip */}
          <View style={styles.brokerStrip}>
            <Text style={styles.brokerStripLabel}>SUPPORTED PLATFORMS</Text>
            <View style={styles.brokerChipsRow}>
              {['Groww', 'Zerodha', 'Angel One', 'INDmoney', 'Upstox', 'CAMS'].map((b) => (
                <View key={b} style={styles.brokerChip}>
                  <Text style={styles.brokerChipText}>{b}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Privacy & Security Guarantee */}
          <View style={styles.privacyCard}>
            <View style={styles.privacyIconCircle}>
              <Ionicons name="lock-closed" size={15} color={colors.primary} />
            </View>
            <Text style={styles.privacyText}>
              256-Bit On-Device Privacy: Your financial statements are parsed locally in temporary memory. No data is stored on remote servers.
            </Text>
          </View>
        </View>
      )}

      {/* STATE 2: AI REVIEW RESULTS */}
      {hasReviewed && !isScanning && (
        <View style={styles.reviewResults}>
          {/* 1. HERO HEALTH SCORE CARD */}
          <View style={styles.scoreCardWrapper}>
            <LinearGradient
              colors={['#101B2B', '#09121E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.scoreCard}
            >
              <View style={styles.scoreTopHeader}>
                <View style={styles.scoreRadarTag}>
                  <View style={styles.scoreRadarDot} />
                  <Text style={styles.scoreRadarText}>AI AUDIT REPORT</Text>
                </View>
                <View style={styles.gradePill}>
                  <Text style={styles.gradePillText}>GRADE B • MODERATE RISK</Text>
                </View>
              </View>

              <View style={styles.scoreCircleWrapper}>
                <View style={styles.scoreCircle}>
                  <Text style={styles.scoreNumber}>{mockPortfolioReview.healthScore}</Text>
                  <Text style={styles.scoreMax}>/ 100</Text>
                </View>
              </View>

              <Text style={styles.scoreStatusTitle}>
                {mockPortfolioReview.scoreLabel}
              </Text>

              <View style={styles.percentilePill}>
                <Ionicons name="trending-up" size={13} color={colors.primary} />
                <Text style={styles.percentilePillText}>
                  {mockPortfolioReview.percentileRank}
                </Text>
              </View>
            </LinearGradient>
          </View>

          {/* 2. SUB-SCORES 2x2 GRID */}
          <View style={styles.subScoresGrid}>
            {mockPortfolioReview.subScores.map((item, idx) => (
              <View key={idx} style={styles.subScoreItem}>
                <View style={styles.subScoreTop}>
                  <Text style={styles.subScoreLabel} numberOfLines={1}>{item.label}</Text>
                  <Text style={[styles.subScoreVal, { color: item.color }]}>
                    {item.score}
                  </Text>
                </View>
                <View style={styles.subProgressBarBg}>
                  <View
                    style={[
                      styles.subProgressBarFill,
                      { width: `${item.score}%`, backgroundColor: item.color },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>

          {/* 3. OVERLAP DETECTION CARD (Bulletproof Structure) */}
          <View style={styles.overlapCardWrapper}>
            <LinearGradient
              colors={['#241217', '#150A0E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.overlapCard}
            >
              <View style={styles.overlapHeader}>
                <View style={styles.overlapTagRow}>
                  <View style={styles.dangerDot} />
                  <Text style={styles.dangerTagText}>CRITICAL OVERLAP DETECTED</Text>
                </View>
                <View style={styles.overlapSavedBadge}>
                  <Text style={styles.overlapSavedText}>Save ₹1,400/yr</Text>
                </View>
              </View>

              <Text style={styles.overlapHeading}>
                Your Mutual Funds hold <Text style={{ color: colors.danger }}>67% Identical Stocks</Text>!
              </Text>

              {mockPortfolioReview.overlaps.map((ov, i) => (
                <View key={i} style={styles.overlapBox}>
                  {/* Fund A vs Fund B Tree Layout */}
                  <View style={styles.fundPairBlock}>
                    <View style={styles.fundSingleRow}>
                      <View style={[styles.fundBullet, { backgroundColor: '#F87171' }]} />
                      <Text style={styles.fundNameText}>{ov.fundA}</Text>
                    </View>

                    <View style={styles.overlapCenterBar}>
                      <View style={styles.overlapLine} />
                      <View style={styles.overlapBadge}>
                        <Ionicons name="swap-vertical" size={12} color={colors.danger} />
                        <Text style={styles.overlapBadgeText}>{ov.overlapPercent}% Common Stocks</Text>
                      </View>
                      <View style={styles.overlapLine} />
                    </View>

                    <View style={styles.fundSingleRow}>
                      <View style={[styles.fundBullet, { backgroundColor: '#60A5FA' }]} />
                      <Text style={styles.fundNameText}>{ov.fundB}</Text>
                    </View>
                  </View>

                  {/* Overlapping Shared Stocks */}
                  <View style={styles.sharedHoldingsContainer}>
                    <Text style={styles.sharedLabel}>SHARED HOLDINGS:</Text>
                    <View style={styles.sharedPillsRow}>
                      {ov.sharedStocks.map((stk, sIdx) => (
                        <View key={sIdx} style={styles.sharedStockPill}>
                          <Text style={styles.sharedStockText}>{stk}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Verdict & Fix Pill */}
                  <Text style={styles.overlapVerdictText}>{ov.verdict}</Text>
                  <View style={styles.fixPill}>
                    <Ionicons name="bulb" size={13} color={colors.primary} />
                    <Text style={styles.fixPillText}>{ov.fix}</Text>
                  </View>
                </View>
              ))}
            </LinearGradient>
          </View>

          {/* 4. SECTOR ALLOCATION & RISK (Clean 3-Line Layout) */}
          <View style={styles.sectorCard}>
            <View style={styles.sectorCardHeader}>
              <Text style={styles.sectionTitle}>Sector Allocation & Risk</Text>
              <View style={styles.sectorStatusBadge}>
                <Text style={styles.sectorStatusBadgeText}>5 Sectors</Text>
              </View>
            </View>

            {mockPortfolioReview.sectorAllocations.map((sec, i) => (
              <View key={i} style={styles.sectorRowItem}>
                <View style={styles.sectorHeaderRow}>
                  <Text style={styles.sectorNameText}>{sec.sector}</Text>
                  <View
                    style={[
                      styles.sectorPctBadge,
                      {
                        backgroundColor: sec.isHighRisk
                          ? 'rgba(239, 68, 68, 0.15)'
                          : 'rgba(16, 185, 129, 0.15)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sectorPctText,
                        { color: sec.isHighRisk ? colors.danger : colors.primary },
                      ]}
                    >
                      {sec.percent}% {sec.isHighRisk ? 'HIGH RISK' : 'HEALTHY'}
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.sectorBarBg}>
                  <View
                    style={[
                      styles.sectorBarFill,
                      {
                        width: `${sec.percent}%`,
                        backgroundColor: sec.isHighRisk ? colors.danger : colors.primary,
                      },
                    ]}
                  />
                </View>

                {/* Status Explanation Note */}
                <Text
                  style={[
                    styles.sectorNoteText,
                    { color: sec.isHighRisk ? '#FCA5A5' : colors.textMuted },
                  ]}
                >
                  {sec.status}
                </Text>
              </View>
            ))}
          </View>

          {/* 5. BILLIONAIRE MATCHES */}
          <View style={styles.whaleCrossCard}>
            <View style={styles.whaleCrossHeader}>
              <View style={styles.whaleHeaderTag}>
                <View style={styles.whaleDot} />
                <Text style={styles.whaleHeaderTagText}>SUPER-INVESTOR ALIGNMENT</Text>
              </View>
            </View>

            <Text style={styles.whaleCrossTitle}>
              Your holdings are co-owned by India's top Super-Investors!
            </Text>

            {mockPortfolioReview.whaleMatches.map((wm, i) => (
              <View key={i} style={styles.whaleMatchItem}>
                {/* Header Row: Avatar + Stock Name + Badge */}
                <View style={styles.matchTopRow}>
                  {wm.localImage ? (
                    <WhaleAvatar
                      imageSource={wm.localImage}
                      avatarText={wm.whale.slice(0, 2).toUpperCase()}
                      size={44}
                      borderColor={wm.color}
                    />
                  ) : (
                    <View
                      style={[
                        styles.matchIconFallback,
                        { backgroundColor: wm.color + '20', borderColor: wm.color },
                      ]}
                    >
                      <Ionicons name="alert-circle" size={22} color={wm.color} />
                    </View>
                  )}

                  <View style={styles.matchInfoCol}>
                    <Text style={styles.matchStockName}>{wm.stock}</Text>
                    <Text style={styles.matchWhaleSub}>
                      {wm.whale} • <Text style={{ color: wm.color, fontWeight: '700' }}>{wm.stake}</Text>
                    </Text>
                  </View>

                  <View style={[styles.matchBadge, { backgroundColor: wm.color + '18' }]}>
                    <Text style={[styles.matchBadgeText, { color: wm.color }]}>
                      {wm.badge}
                    </Text>
                  </View>
                </View>

                {/* Sentiment Note Box */}
                <View style={styles.matchSentimentBox}>
                  <Text style={styles.matchSentimentText}>{wm.sentiment}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* 6. AI ACTION ROADMAP */}
          <View style={styles.actionPlanCard}>
            <Text style={styles.sectionTitle}>🎯 4-Step AI Action Roadmap</Text>

            {mockPortfolioReview.actionPlan.map((act) => (
              <View key={act.step} style={styles.planCardItem}>
                <View style={styles.planItemHeader}>
                  <View style={[styles.stepCircle, { backgroundColor: act.color }]}>
                    <Text style={styles.stepCircleText}>{act.step}</Text>
                  </View>

                  <View style={[styles.actionTypeBadge, { backgroundColor: act.color + '20' }]}>
                    <Text style={[styles.actionTypeText, { color: act.color }]}>
                      {act.action}
                    </Text>
                  </View>

                  <Text style={styles.planItemTitle} numberOfLines={1}>
                    {act.title}
                  </Text>
                </View>

                <Text style={styles.planDetailText}>{act.detail}</Text>
              </View>
            ))}
          </View>

          {/* 7. ANNUAL SAVINGS SUMMARY */}
          <View style={styles.savingsCardWrapper}>
            <LinearGradient
              colors={['#062E23', '#031F17']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.savingsCard}
            >
              <Text style={styles.savingsHeader}>TOTAL ESTIMATED ANNUAL SAVINGS</Text>
              <Text style={styles.savingsAmount}>
                {mockPortfolioReview.savingsSummary.totalAnnualSavings}
              </Text>

              <View style={styles.savingsColumnsRow}>
                <View style={styles.savingsCol}>
                  <Text style={styles.savingsColVal}>
                    {mockPortfolioReview.savingsSummary.expenseRatioSaved}
                  </Text>
                  <Text style={styles.savingsColLabel}>Expense Ratio Saved</Text>
                </View>
                <View style={styles.savingsColDivider} />
                <View style={styles.savingsCol}>
                  <Text style={styles.savingsColVal}>
                    {mockPortfolioReview.savingsSummary.taxHarvestSaved}
                  </Text>
                  <Text style={styles.savingsColLabel}>Tax Loss Harvesting</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* 8. ACTION BUTTONS */}
          <View style={styles.actionBtnRow}>
            <TouchableOpacity
              style={styles.downloadPdfBtn}
              activeOpacity={0.8}
              onPress={handleExportPdf}
              disabled={isExportingPdf}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.downloadPdfGrad}
              >
                {isExportingPdf ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.downloadPdfText}>Generating 3-Page PDF...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="document-text" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.downloadPdfText}>Export CA-Ready Audit PDF</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shareBtn}
              activeOpacity={0.8}
              onPress={handleExportPdf}
              disabled={isExportingPdf}
            >
              <Ionicons name="share-social" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={{ height: 125 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  resetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 8,
  },
  resetHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  resetBtnText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  privacyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  privacyPillText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  scanningCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginTop: 30,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  scanningTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
  },
  scanningStatus: {
    fontSize: 13,
    color: colors.primary,
    marginTop: 6,
    textAlign: 'center',
  },
  scanningPulse: {
    backgroundColor: colors.cardSecondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 18,
  },
  scanningTip: {
    fontSize: 11,
    color: colors.textMuted,
  },
  uploadContainer: {
    marginTop: 16,
    gap: 12,
  },
  alertCardWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.28)',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  alertCard: {
    padding: 14,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveTagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveTagText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  sourcePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sourcePillText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 20,
    marginBottom: 10,
  },
  alertDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  detailPill: {
    flex: 1,
    marginRight: 6,
  },
  detailPillText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  mainUploadBox: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.28)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  uploadGradient: {
    padding: 24,
    alignItems: 'center',
  },
  scannerAperture: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  uploadSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  uploadBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  altUploadGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  altUploadBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  altIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  altTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  altSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  brokerStrip: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  brokerStripLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  brokerChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  brokerChip: {
    backgroundColor: colors.cardSecondary,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  brokerChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  privacyCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    padding: 12,
    borderRadius: 14,
    gap: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  privacyIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyText: {
    fontSize: 11,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 16,
  },
  reviewResults: {
    gap: 16,
    marginTop: 14,
  },
  scoreCardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  scoreCard: {
    padding: 18,
    alignItems: 'center',
  },
  scoreTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  scoreRadarTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreRadarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  scoreRadarText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.8,
  },
  gradePill: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  gradePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  scoreCircleWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 8,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  scoreCircle: {
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 36,
    fontWeight: '900',
    color: '#F59E0B',
  },
  scoreMax: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '700',
  },
  scoreStatusTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginTop: 12,
    textAlign: 'center',
  },
  percentilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  percentilePillText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },
  subScoresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  subScoreItem: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  subScoreTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  subScoreLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    flex: 1,
    marginRight: 4,
  },
  subScoreVal: {
    fontSize: 13,
    fontWeight: '900',
  },
  subProgressBarBg: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.cardSecondary,
    overflow: 'hidden',
  },
  subProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  overlapCardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  overlapCard: {
    padding: 16,
  },
  overlapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  overlapTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dangerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger,
  },
  dangerTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.danger,
    letterSpacing: 0.8,
  },
  overlapSavedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  overlapSavedText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },
  overlapHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  overlapBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  fundPairBlock: {
    marginBottom: 10,
  },
  fundSingleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fundBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fundNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  overlapCenterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    paddingLeft: 3,
  },
  overlapLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  overlapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginHorizontal: 8,
  },
  overlapBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FCA5A5',
  },
  sharedHoldingsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  sharedLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sharedPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  sharedStockPill: {
    backgroundColor: colors.cardSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sharedStockText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  overlapVerdictText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 8,
  },
  fixPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  fixPillText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
    flex: 1,
    lineHeight: 16,
  },
  sectorCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  sectorCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectorStatusBadge: {
    backgroundColor: colors.cardSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sectorStatusBadgeText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '700',
  },
  sectorRowItem: {
    marginBottom: 12,
  },
  sectorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectorNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  sectorPctBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sectorPctText: {
    fontSize: 10,
    fontWeight: '800',
  },
  sectorBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.cardSecondary,
    overflow: 'hidden',
  },
  sectorBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectorNoteText: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
    fontWeight: '500',
  },
  whaleCrossCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  whaleCrossHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  whaleHeaderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  whaleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentBlue,
  },
  whaleHeaderTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.accentBlue,
    letterSpacing: 0.8,
  },
  whaleCrossTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  whaleMatchItem: {
    backgroundColor: colors.cardSecondary,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  matchTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchIconFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  matchInfoCol: {
    flex: 1,
    marginLeft: 10,
    marginRight: 6,
  },
  matchStockName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  matchWhaleSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  matchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  matchBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  matchSentimentBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  matchSentimentText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  actionPlanCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  planCardItem: {
    backgroundColor: colors.cardSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  planItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  actionTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actionTypeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  planItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  planDetailText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    paddingLeft: 30,
  },
  savingsCardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  savingsCard: {
    padding: 16,
    alignItems: 'center',
  },
  savingsHeader: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  savingsAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 6,
  },
  savingsColumnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  savingsCol: {
    alignItems: 'center',
    flex: 1,
  },
  savingsColVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  savingsColLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  savingsColDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  downloadPdfBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  downloadPdfGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  downloadPdfText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  shareBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
