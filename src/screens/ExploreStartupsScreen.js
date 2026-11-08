import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import AppHeader from '../components/AppHeader';
import InvestStartupModal from '../components/InvestStartupModal';
import StartupPitchRoomModal from '../components/StartupPitchRoomModal';
import { fetchLiveStartups } from '../services/dataService';

export default function ExploreStartupsScreen({ onOpenMenu }) {
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [startupsList, setStartupsList] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [investingStartup, setInvestingStartup] = useState(null);
  const [pitchRoomStartup, setPitchRoomStartup] = useState(null);

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

  // Filter Counts
  const allCount = startupsList.length;
  const whaleCount = startupsList.filter((s) => Boolean(s.whaleBacker)).length;
  const preIpoCount = startupsList.filter((s) => (s.stage || '').includes('Pre-IPO') || (s.stage || '').includes('DRHP')).length;
  const microCount = startupsList.filter((s) => (s.minInvestment || '').includes('5,000')).length;
  const unicornCount = startupsList.filter((s) => s.isUnicorn).length;

  const filters = [
    { id: 'ALL', label: `🔥 All Deals (${allCount})` },
    { id: 'WHALES', label: `🐋 Whale-Backed (${whaleCount})` },
    { id: 'PRE_IPO', label: `🚀 Pre-IPO Stage (${preIpoCount})` },
    { id: 'MICRO', label: `🌱 ₹5K Entry (${microCount})` },
    { id: 'UNICORNS', label: `🦄 Unicorns (${unicornCount})` },
  ];

  const handleOpenPitchRoom = (startup) => {
    Haptics.selectionAsync();
    setPitchRoomStartup(startup);
  };

  const handleOpenInvest = (startup) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setInvestingStartup(startup);
  };

  const q = searchQuery.trim().toLowerCase();

  const filteredStartups = (startupsList || []).filter((s) => {
    // 1. Tag filter
    if (selectedFilter === 'WHALES' && !s.whaleBacker) return false;
    if (selectedFilter === 'PRE_IPO' && !((s.stage || '').includes('Pre-IPO') || (s.stage || '').includes('DRHP'))) return false;
    if (selectedFilter === 'MICRO' && !(s.minInvestment || '').includes('5,000')) return false;
    if (selectedFilter === 'UNICORNS' && !s.isUnicorn) return false;

    // 2. Search query filter
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      (s.category && s.category.toLowerCase().includes(q)) ||
      (s.whaleBacker && s.whaleBacker.toLowerCase().includes(q)) ||
      (s.founders && s.founders.toLowerCase().includes(q)) ||
      (s.city && s.city.toLowerCase().includes(q))
    );
  });

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary, colors.accentBlue]}
        />
      }
    >
      {/* Premium Brand Header */}
      <AppHeader
        subtitle="Pre-IPO & Angel Syndicates"
        onMenuPress={onOpenMenu}
      />

      {/* Trust & Guarantee Banner */}
      <View style={styles.trustBanner}>
        <View style={styles.trustItem}>
          <Ionicons name="shield-checkmark" size={12} color="#38BDF8" />
          <Text style={styles.trustText} numberOfLines={1}>SEBI AIF</Text>
        </View>
        <View style={styles.trustDivider} />
        <View style={styles.trustItem}>
          <Ionicons name="wallet-outline" size={12} color="#818CF8" />
          <Text style={styles.trustText} numberOfLines={1}>CDSL Demat</Text>
        </View>
        <View style={styles.trustDivider} />
        <View style={styles.trustItem}>
          <Ionicons name="sparkles" size={12} color="#F59E0B" />
          <Text style={styles.trustText} numberOfLines={1}>Min ₹5,000</Text>
        </View>
      </View>

      {/* Sleek Search Bar */}
      <View style={styles.searchBarWrapper}>
        <Ionicons name="search" size={16} color="#64748B" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchTextInput}
          placeholder="Search startups, sectors, or whale backers..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color="#64748B" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={{ paddingRight: 16 }}
      >
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



      {/* Startup Cards List */}
      <View style={styles.cardsList}>
        {filteredStartups.map((startup) => (
          <View key={startup.id} style={styles.card}>
            {/* Card Top: Avatar + Name & Category + Stage Badge */}
            <View style={styles.cardTopRow}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.iconBox, { backgroundColor: startup.iconBg || '#1E293B' }]}>
                  <Text style={styles.iconEmoji}>{startup.iconEmoji || '🚀'}</Text>
                </View>

                <View style={styles.headerInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.startupName} numberOfLines={1}>
                      {startup.name}
                    </Text>
                    {startup.isUnicorn && (
                      <View style={styles.unicornBadge}>
                        <Text style={styles.unicornEmoji}>🦄</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.shortIntroText} numberOfLines={1}>
                    {startup.shortIntro || startup.category?.split('•')[0]?.trim()}
                  </Text>
                </View>
              </View>

              <View style={styles.stagePill}>
                <Text style={styles.stagePillText}>{startup.stage || 'Pre-IPO'}</Text>
                <Text style={styles.daysLeftText}>{startup.daysLeft}d left</Text>
              </View>
            </View>

            {/* Whale Backer Highlight Moat (Clean Midnight/Slate, No Green Background) */}
            {startup.whaleBacker && (
              <View style={styles.whaleBackerStrip}>
                <Ionicons name="shield-checkmark" size={13} color="#38BDF8" />
                <Text style={styles.whaleBackerText} numberOfLines={1}>
                  Co-investing with <Text style={styles.whaleBackerHighlight}>{startup.whaleBacker}</Text>
                </Text>
              </View>
            )}

            {/* 2x2 Clean Financial Metrics Grid (Spacious & Clean, No Awkward Wrapping) */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricsRow}>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>VALUATION</Text>
                  <Text style={styles.metricValue}>{startup.valuation}</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>MIN. TICKET</Text>
                  <Text style={[styles.metricValue, { color: '#38BDF8' }]}>
                    {startup.minInvestment}
                  </Text>
                </View>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricsRow}>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>REVENUE (ARR)</Text>
                  <Text style={styles.metricValue} numberOfLines={1}>
                    {startup.arrRevenue || startup.growthMetric}
                  </Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>TARGET EXIT</Text>
                  <Text style={[styles.metricValue, { color: '#F59E0B' }]} numberOfLines={1}>
                    {startup.targetExit || startup.stage}
                  </Text>
                </View>
              </View>
            </View>

            {/* Progress Bar & Syndicate Allocation Status */}
            <View style={styles.progressContainer}>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLeft}>
                  {startup.raisedSoFar} <Text style={{ color: '#64748B' }}>raised of {startup.targetAmount}</Text>
                </Text>
                <Text style={styles.progressRight}>{startup.progressPercent}% Allocated</Text>
              </View>

              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(startup.progressPercent || 85, 100)}%` },
                  ]}
                />
              </View>

              <View style={styles.progressFooter}>
                <View style={styles.backerRow}>
                  <Ionicons name="people-outline" size={12} color="#64748B" />
                  <Text style={styles.investorsCount}>{startup.investorCount} Backers In Round</Text>
                </View>
                <Text style={styles.escrowNote}>• SEBI Escrow Protected</Text>
              </View>
            </View>

            {/* Dual Action Buttons (No Dark Green Background, Clean 1-Line Labels) */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.pitchDeckBtn}
                activeOpacity={0.8}
                onPress={() => handleOpenPitchRoom(startup)}
              >
                <Ionicons name="document-text-outline" size={13} color="#94A3B8" />
                <Text style={styles.pitchDeckText}>Pitch & Thesis</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.investBtnWrapper}
                activeOpacity={0.85}
                onPress={() => handleOpenInvest(startup)}
              >
                <LinearGradient
                  colors={['#38BDF8', '#2563EB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.investBtnGrad}
                >
                  <Ionicons name="flash" size={13} color="#FFFFFF" />
                  <Text style={styles.investBtnText}>
                    Co-Invest ({startup.minInvestment})
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {filteredStartups.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="rocket-outline" size={32} color="#64748B" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>No Matching Startups Found</Text>
            <Text style={styles.emptySubtitle}>Try clearing your search query or switching filters.</Text>
          </View>
        )}
      </View>

      {/* Monthly Ecosystem Overview */}
      <View style={styles.ecoCard}>
        <View style={styles.ecoHeaderRow}>
          <Ionicons name="analytics" size={16} color="#38BDF8" />
          <Text style={styles.ecoTitle}>India Venture Capital & Syndicate Pulse</Text>
        </View>
        <View style={styles.ecoGrid}>
          <View style={styles.ecoItem}>
            <Text style={[styles.ecoVal, { color: '#38BDF8' }]}>₹8,400 Cr</Text>
            <Text style={styles.ecoSub}>Monthly Inflow</Text>
          </View>
          <View style={styles.ecoItem}>
            <Text style={[styles.ecoVal, { color: '#818CF8' }]}>47 Deals</Text>
            <Text style={styles.ecoSub}>Syndicates Closed</Text>
          </View>
          <View style={styles.ecoItem}>
            <Text style={[styles.ecoVal, { color: '#F59E0B' }]}>3 Unicorns</Text>
            <Text style={styles.ecoSub}>New Unicorns</Text>
          </View>
        </View>
      </View>

      {/* Regulatory Transparency Footer */}
      <View style={styles.regulatoryNote}>
        <Ionicons name="shield-checkmark-outline" size={13} color="#475569" />
        <Text style={styles.regulatoryNoteText}>
          All syndicate allocations are conducted under SEBI Alternative Investment Funds (AIF) Regulations, 2012. Shares are credited as CCPS directly to your Demat.
        </Text>
      </View>

      {/* Modals */}
      <StartupPitchRoomModal
        visible={!!pitchRoomStartup}
        startup={pitchRoomStartup}
        onClose={() => setPitchRoomStartup(null)}
        onCoInvestPress={(st) => {
          setPitchRoomStartup(null);
          setTimeout(() => {
            setInvestingStartup(st);
          }, 200);
        }}
      />

      <InvestStartupModal
        visible={!!investingStartup}
        startup={investingStartup}
        onClose={() => setInvestingStartup(null)}
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
  trustBanner: {
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
  trustItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  trustText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  trustDivider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1622',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 9 : 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  searchTextInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#FFFFFF',
    fontWeight: '500',
    paddingVertical: 0,
  },
  filterScroll: {
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0F1622',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.16)',
    borderColor: 'rgba(59, 130, 246, 0.45)',
  },
  filterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#60A5FA',
    fontWeight: '800',
  },
  sectionHeaderRow: {
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  sectionHeaderSub: {
    fontSize: 10,
    color: '#475569',
    marginTop: 1,
  },
  cardsList: {
    gap: 12,
  },
  card: {
    backgroundColor: '#0F1622',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  iconEmoji: {
    fontSize: 20,
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shortIntroText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
  },
  startupName: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  unicornBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unicornEmoji: {
    fontSize: 10.5,
  },
  categoryText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
  },
  founderText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  stagePill: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  stagePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#60A5FA',
  },
  daysLeftText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 1,
  },
  whaleBackerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131D2E',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    gap: 6,
  },
  whaleBackerText: {
    fontSize: 11,
    color: '#CBD5E1',
    flex: 1,
  },
  whaleBackerHighlight: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  metricsGrid: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricCell: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metricValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  metricDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginVertical: 8,
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
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  progressRight: {
    fontSize: 11,
    fontWeight: '800',
    color: '#60A5FA',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#2563EB',
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  backerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  investorsCount: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  escrowNote: {
    fontSize: 10,
    color: '#475569',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  pitchDeckBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#162032',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  pitchDeckText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#CBD5E1',
  },
  investBtnWrapper: {
    flex: 1.25,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  investBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  investBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptySubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  ecoCard: {
    backgroundColor: '#0F1622',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 18,
  },
  ecoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  ecoTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  ecoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ecoItem: {
    flex: 1,
  },
  ecoVal: {
    fontSize: 14,
    fontWeight: '900',
  },
  ecoSub: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 2,
  },
  regulatoryNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  regulatoryNoteText: {
    fontSize: 9,
    color: '#475569',
    textAlign: 'center',
    maxWidth: '88%',
    lineHeight: 13,
  },
});
