import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import AppHeader from '../components/AppHeader';
import InvestStartupModal from '../components/InvestStartupModal';
import TaxHarvestingModal from '../components/TaxHarvestingModal';
import { fetchLiveStartups } from '../services/dataService';

export default function ExploreStartupsScreen({ onOpenMenu }) {
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [startupsList, setStartupsList] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [investingStartup, setInvestingStartup] = useState(null);
  const [taxModalVisible, setTaxModalVisible] = useState(false);

  const loadData = async () => {
    const data = await fetchLiveStartups();
    setStartupsList(data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await loadData();
    setRefreshing(false);
  }, []);

  const filters = [
    { id: 'ALL', label: '🔥 All Deals' },
    { id: 'UNICORNS', label: '🦄 Unicorns' },
    { id: 'EARLY', label: '🌱 ₹5,000 Entry' },
    { id: 'GROWTH', label: '⚡ Growth Stage' },
  ];

  const handleInvestPress = (startup) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setInvestingStartup(startup);
  };

  const handlePitchDeckPress = (startup) => {
    Haptics.selectionAsync();
    Alert.alert(
      `${startup.name} • Pitch Deck`,
      `Sector: ${startup.sector}\nStage: ${startup.stage}\nValuation: ${startup.valuation}\nTarget: ${startup.target}\n\nKey Highlights:\n• Backed by: ${startup.leadInvestors ? startup.leadInvestors.join(', ') : 'Marquee Investors'}\n• 12-Month ARR Growth: +140% YoY\n• Gross Margins: 64%\n\nFull 24-page PDF Pitch Deck downloaded to your device viewer.`,
      [{ text: 'View Pitch Deck PDF' }, { text: 'Done', style: 'cancel' }]
    );
  };

  const filteredStartups = (startupsList || []).filter((s) => {
    if (selectedFilter === 'UNICORNS') return s.isUnicorn;
    if (selectedFilter === 'EARLY') return s.minInvestment === '₹5,000';
    if (selectedFilter === 'GROWTH') return s.stage.includes('Growth') || s.stage.includes('Series G');
    return true;
  });

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accentPurple}
          colors={[colors.accentPurple, colors.primary]}
        />
      }
    >
      {/* Premium Brand Header */}
      <AppHeader
        subtitle="Pre-IPO & Early-Stage Rounds"
        onMenuPress={onOpenMenu}
      />

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {filters.map((f) => {
          const isActive = selectedFilter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedFilter(f.id);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Startup Cards */}
      <View style={styles.cardsList}>
        {filteredStartups.map((startup) => (
          <View key={startup.id} style={styles.card}>
            {/* Card Top */}
            <View style={styles.cardTop}>
              <View style={[styles.iconBox, { backgroundColor: startup.iconBg }]}>
                <Text style={styles.iconEmoji}>{startup.iconEmoji}</Text>
              </View>

              <View style={styles.cardHeaderInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.startupName}>{startup.name}</Text>
                  {startup.isUnicorn && (
                    <View style={styles.unicornBadge}>
                      <Text style={styles.unicornText}>🦄 Unicorn</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.categoryText}>{startup.category}</Text>
                <Text style={styles.growthText}>📈 {startup.growthMetric}</Text>
              </View>
            </View>

            {/* Metrics Grid */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Valuation</Text>
                <Text style={styles.metricValue}>{startup.valuation}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Total Raised</Text>
                <Text style={styles.metricValue}>{startup.totalRaised}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Min. Entry</Text>
                <Text style={[styles.metricValue, { color: colors.primary }]}>
                  {startup.minInvestment}
                </Text>
              </View>
            </View>

            {/* Funding Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLeft}>
                  {startup.raisedSoFar} <Text style={{ color: colors.textMuted }}>raised</Text>
                </Text>
                <Text style={styles.progressRight}>Target: {startup.targetAmount}</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${startup.progressPercent}%`,
                      backgroundColor:
                        startup.progressPercent > 90
                          ? colors.primary
                          : startup.progressPercent > 70
                          ? colors.accentBlue
                          : colors.warning,
                    },
                  ]}
                />
              </View>
              <View style={styles.progressFooter}>
                <Text style={styles.investorsCount}>👥 {startup.investorCount} Backers</Text>
                <Text style={styles.daysLeftText}>⏰ {startup.daysLeft} days left</Text>
              </View>
            </View>

            {/* Key Backers */}
            <View style={styles.backersRow}>
              <Text style={styles.backersLabel}>Key Investors:</Text>
              <View style={styles.backersTags}>
                {startup.investors.map((inv, idx) => (
                  <View key={idx} style={styles.backerPill}>
                    <Text style={styles.backerText}>{inv}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.investButton}
                activeOpacity={0.8}
                onPress={() => handleInvestPress(startup)}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.investGradient}
                >
                  <Text style={styles.investBtnText}>
                    💰 Invest from {startup.minInvestment}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pitchDeckBtn}
                activeOpacity={0.8}
                onPress={() => handlePitchDeckPress(startup)}
              >
                <Text style={styles.pitchDeckText}>Pitch Deck</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Monthly Ecosystem Overview */}
      <View style={styles.ecoCard}>
        <Text style={styles.ecoTitle}>📊 India Startup Funding This Month</Text>
        <View style={styles.ecoGrid}>
          <View style={styles.ecoItem}>
            <Text style={[styles.ecoVal, { color: colors.primary }]}>₹8,400 Cr</Text>
            <Text style={styles.ecoSub}>Total Inflow</Text>
          </View>
          <View style={styles.ecoItem}>
            <Text style={[styles.ecoVal, { color: colors.accentBlue }]}>47</Text>
            <Text style={styles.ecoSub}>Deals Closed</Text>
          </View>
          <View style={styles.ecoItem}>
            <Text style={[styles.ecoVal, { color: colors.accentPurple }]}>3</Text>
            <Text style={styles.ecoSub}>New Unicorns</Text>
          </View>
        </View>
      </View>

      {/* Startup Syndicate Investment Modal */}
      <InvestStartupModal
        visible={!!investingStartup}
        startup={investingStartup}
        onClose={() => setInvestingStartup(null)}
      />

      {/* Tax Harvesting & ₹1.25L Tax-Free LTCG Modal */}
      <TaxHarvestingModal
        visible={taxModalVisible}
        onClose={() => setTaxModalVisible(false)}
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
  headerTaxPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  headerTaxPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.primary,
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
  alertCardWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.28)',
    borderLeftWidth: 4,
    borderLeftColor: colors.accentPurple,
    shadowColor: '#8B5CF6',
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
  livePulseRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentPurple,
  },
  liveTagText: {
    color: colors.accentPurple,
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
  filterScroll: {
    marginTop: 6,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.accentBlue,
    borderColor: colors.accentBlue,
  },
  filterText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  cardsList: {
    gap: 14,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 24,
  },
  cardHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  startupName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  unicornBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  unicornText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },
  categoryText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  growthText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    backgroundColor: colors.cardSecondary,
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLeft: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  progressRight: {
    fontSize: 11,
    color: colors.textMuted,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.cardSecondary,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  investorsCount: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  daysLeftText: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: '700',
  },
  backersRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  backersLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  backersTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  backerPill: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  backerText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  investButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  investGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  investBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  pitchDeckBtn: {
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardSecondary,
  },
  pitchDeckText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  ecoCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  ecoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  ecoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  ecoItem: {
    alignItems: 'center',
  },
  ecoVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  ecoSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});
