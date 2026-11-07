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
          <Ionicons name="shield-checkmark" size={13} color="#10B981" />
          <Text style={styles.trustText}>SEBI AIF Escrow</Text>
        </View>
        <Text style={styles.trustDot}>•</Text>
        <View style={styles.trustItem}>
          <Ionicons name="wallet-outline" size={13} color="#3B82F6" />
          <Text style={styles.trustText}>CDSL / NSDL Demat</Text>
        </View>
        <Text style={styles.trustDot}>•</Text>
        <View style={styles.trustItem}>
          <Ionicons name="sparkles" size={13} color="#F59E0B" />
          <Text style={styles.trustText}>From ₹5,000 Cheque</Text>
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

      {/* Section Heading */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderTitle}>
          VERIFIED SYNDICATE DEALS ({filteredStartups.length})
        </Text>
        <Text style={styles.sectionHeaderSub}>Live rounds open for allocation</Text>
      </View>

      {/* Startup Cards List */}
      <View style={styles.cardsList}>
        {filteredStartups.map((startup, idx) => (
          <View key={startup.id} style={styles.card}>
            {/* Card Top: Rank + Avatar + Name + Urgency Tag */}
            <View style={styles.cardTopRow}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.rankCircle}>
                  <Text style={styles.rankText}>{idx + 1}</Text>
                </View>

                <View style={[styles.iconBox, { backgroundColor: startup.iconBg || '#10B981' }]}>
                  <Text style={styles.iconEmoji}>{startup.iconEmoji || '🚀'}</Text>
                </View>

                <View style={styles.headerInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.startupName} numberOfLines={1}>
                      {startup.name}
                    </Text>
                    {startup.isUnicorn && (
                      <View style={styles.unicornBadge}>
                        <Text style={styles.unicornText}>🦄 Unicorn</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.categoryText} numberOfLines={1}>
                    {startup.category}
                  </Text>
                  {startup.founders && (
                    <Text style={styles.founderText} numberOfLines={1}>
                      {startup.founders} • {startup.city}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.urgencyPill}>
                <View style={styles.pulseDot} />
                <Text style={styles.urgencyText}>{startup.daysLeft}d left</Text>
              </View>
            </View>

            {/* Whale Backer Highlight Box (Crucial Moat!) */}
            {startup.whaleBacker && (
              <View style={styles.whaleBackerPill}>
                <Ionicons name="shield-checkmark" size={13} color="#10B981" />
                <Text style={styles.whaleBackerText} numberOfLines={1}>
                  Co-Invest with <Text style={{ color: '#10B981', fontWeight: '800' }}>{startup.whaleBacker}</Text>
                </Text>
              </View>
            )}

            {/* 4 Core Financial Metrics Grid */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Valuation</Text>
                <Text style={styles.metricValue}>{startup.valuation}</Text>
              </View>

              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Min. Entry</Text>
                <Text style={[styles.metricValue, { color: '#10B981' }]}>
                  {startup.minInvestment}
                </Text>
              </View>

              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Growth / ARR</Text>
                <Text style={styles.metricValue} numberOfLines={1}>
                  {startup.arrRevenue || startup.growthMetric}
                </Text>
              </View>

              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Target Exit</Text>
                <Text style={[styles.metricValue, { color: '#F59E0B' }]} numberOfLines={1}>
                  {startup.targetExit || startup.stage}
                </Text>
              </View>
            </View>

            {/* Progress Bar & Funding Status */}
            <View style={styles.progressContainer}>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLeft}>
                  {startup.raisedSoFar} <Text style={{ color: '#64748B' }}>raised of {startup.targetAmount}</Text>
                </Text>
                <Text style={styles.progressRight}>{startup.progressPercent}% Filled</Text>
              </View>

              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(startup.progressPercent || 85, 100)}%`,
                      backgroundColor: startup.progressPercent >= 90 ? '#10B981' : '#3B82F6',
                    },
                  ]}
                />
              </View>

              <View style={styles.progressFooter}>
                <View style={styles.backerRow}>
                  <Ionicons name="people-outline" size={12} color="#64748B" />
                  <Text style={styles.investorsCount}>{startup.investorCount} Backers In Round</Text>
                </View>
                <Text style={styles.escrowNote}>• Verified Escrow</Text>
              </View>
            </View>

            {/* Dual Action Buttons */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.pitchDeckBtn}
                activeOpacity={0.8}
                onPress={() => handleOpenPitchRoom(startup)}
              >
                <Ionicons name="document-text-outline" size={13} color="#60A5FA" />
                <Text style={styles.pitchDeckText}>Pitch Room & Thesis →</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.investButton}
                activeOpacity={0.85}
                onPress={() => handleOpenInvest(startup)}
              >
                <Ionicons name="flash" size={13} color="#052E16" />
                <Text style={styles.investBtnText}>
                  Co-Invest from {startup.minInvestment}
                </Text>
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
          <Ionicons name="analytics" size={16} color="#10B981" />
          <Text style={styles.ecoTitle}>India Venture Capital & Syndicate Pulse</Text>
        </View>
        <View style={styles.ecoGrid}>
          <View style={styles.ecoItem}>
            <Text style={[styles.ecoVal, { color: '#10B981' }]}>₹8,400 Cr</Text>
            <Text style={styles.ecoSub}>Monthly Inflow</Text>
          </View>
          <View style={styles.ecoItem}>
            <Text style={[styles.ecoVal, { color: '#60A5FA' }]}>47 Deals</Text>
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
          All syndicate investments are conducted under SEBI Alternative Investment Funds (AIF) Regulations, 2012. Shares are credited as CCPS directly to your Demat.
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
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginTop: 2,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    gap: 8,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  trustDot: {
    fontSize: 8,
    color: '#475569',
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
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  filterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#10B981',
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
    alignItems: 'flex-start',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  rankCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  rankText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
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
  startupName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  unicornBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  unicornText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
  },
  categoryText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  founderText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  urgencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  pulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F59E0B',
  },
  urgencyText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#F59E0B',
  },
  whaleBackerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.22)',
    gap: 6,
  },
  whaleBackerText: {
    fontSize: 11,
    color: '#E2E8F0',
    flex: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#F8FAFC',
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
    fontSize: 10.5,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  progressRight: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#10B981',
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
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    gap: 6,
  },
  pitchDeckText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#60A5FA',
  },
  investButton: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 9,
    gap: 6,
  },
  investBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#052E16',
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
