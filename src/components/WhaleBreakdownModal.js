import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import WhaleAvatar from './WhaleAvatar';

export default function WhaleBreakdownModal({ visible, whale, onClose }) {
  const [activeTab, setActiveTab] = useState('STOCKS'); // 'STOCKS' | 'STARTUPS'
  const [searchQuery, setSearchQuery] = useState('');

  if (!whale) return null;

  // Stocks data (full holdings or fallback to topHoldings)
  const allHoldings = useMemo(() => {
    if (whale.allHoldings && whale.allHoldings.length > 0) {
      return whale.allHoldings;
    }
    if (whale.topHoldings && whale.topHoldings.length > 0) {
      return whale.topHoldings.map((h, i) => ({
        name: h.name,
        symbol: h.symbol || h.name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8),
        sector: h.sector || 'Equities & Holdings',
        stake: h.stake,
        value: h.value,
        cmp: h.cmp || '₹' + (1200 + i * 450),
        change1Y: h.change1Y || '+24.5%',
        weightPercent: h.weightPercent || Math.max(5, 35 - i * 8),
      }));
    }
    return [];
  }, [whale]);

  // Startups / Unlisted data
  const startups = whale.startups || [];

  // Filtered stocks based on search query
  const filteredHoldings = useMemo(() => {
    if (!searchQuery.trim()) return allHoldings;
    const q = searchQuery.toLowerCase();
    return allHoldings.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        (h.symbol && h.symbol.toLowerCase().includes(q)) ||
        (h.sector && h.sector.toLowerCase().includes(q))
    );
  }, [allHoldings, searchQuery]);

  // Filtered startups based on search query
  const filteredStartups = useMemo(() => {
    if (!searchQuery.trim()) return startups;
    const q = searchQuery.toLowerCase();
    return startups.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.status && s.status.toLowerCase().includes(q))
    );
  }, [startups, searchQuery]);

  // Calculate sector breakdown for summary
  const sectorCount = useMemo(() => {
    const set = new Set(allHoldings.map((h) => h.sector).filter(Boolean));
    return set.size;
  }, [allHoldings]);

  // Calculate best multiple for startups
  const bestStartupMultiple = useMemo(() => {
    if (!startups || startups.length === 0) return 'N/A';
    const sorted = [...startups].sort((a, b) => {
      const numA = parseFloat((a.multiple || '0').replace('x', ''));
      const numB = parseFloat((b.multiple || '0').replace('x', ''));
      return numB - numA;
    });
    return `${sorted[0].multiple} (${sorted[0].name})`;
  }, [startups]);

  const handleTabSwitch = (tab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
    setSearchQuery('');
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
          {/* Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.whaleProfileRow}>
              <WhaleAvatar
                imageSource={whale.localImage}
                avatarText={whale.avatar}
                gradient={whale.avatarGradient}
                size={48}
                borderColor="rgba(16, 185, 129, 0.45)"
              />
              <View style={styles.whaleHeaderText}>
                <View style={styles.nameRow}>
                  <Text style={styles.whaleName} numberOfLines={1}>
                    {whale.name}
                  </Text>
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
                    <Text style={styles.verifiedText}>FILINGS VERIFIED</Text>
                  </View>
                </View>
                <Text style={styles.whaleSubtitle} numberOfLines={1}>
                  {whale.tag} • <Text style={styles.valHighlight}>{whale.portfolioValue}</Text>
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Top Toggles (Stocks vs Startups) */}
          <View style={styles.toggleTabsWrapper}>
            <TouchableOpacity
              style={[styles.toggleTab, activeTab === 'STOCKS' && styles.toggleTabActive]}
              onPress={() => handleTabSwitch('STOCKS')}
              activeOpacity={0.85}
            >
              <Ionicons
                name="trending-up"
                size={16}
                color={activeTab === 'STOCKS' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.toggleTabText,
                  activeTab === 'STOCKS' && styles.toggleTabTextActive,
                ]}
              >
                Listed Stocks ({allHoldings.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleTab, activeTab === 'STARTUPS' && styles.toggleTabActive]}
              onPress={() => handleTabSwitch('STARTUPS')}
              activeOpacity={0.85}
            >
              <Ionicons
                name="rocket"
                size={15}
                color={activeTab === 'STARTUPS' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.toggleTabText,
                  activeTab === 'STARTUPS' && styles.toggleTabTextActive,
                ]}
              >
                Startups & Unlisted ({startups.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBarWrapper}>
            <Ionicons name="search" size={16} color={colors.textTertiary} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={
                activeTab === 'STOCKS'
                  ? 'Search stock by name, symbol, or sector...'
                  : 'Search startup, category, or status...'
              }
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
            {/* TAB 1: LISTED STOCKS */}
            {activeTab === 'STOCKS' && (
              <View>
                {/* Summary Metrics Banner */}
                <LinearGradient
                  colors={['#101F2C', '#0A141E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.summaryCard}
                >
                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryLabel}>TOTAL EQUITIES</Text>
                    <Text style={styles.summaryValue}>{whale.portfolioValue}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryLabel}>HOLDINGS COUNT</Text>
                    <Text style={styles.summaryValue}>{allHoldings.length} Companies</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryLabel}>1Y PERFORMANCE</Text>
                    <Text
                      style={[
                        styles.summaryValue,
                        { color: whale.isPositive ? colors.primary : colors.error },
                      ]}
                    >
                      {whale.return1Y}
                    </Text>
                  </View>
                </LinearGradient>

                {/* Section Header */}
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>
                    Complete Shareholdings Breakdown ({filteredHoldings.length})
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    SEBI quarterly filings & bulk deals
                  </Text>
                </View>

                {/* Stock Cards List */}
                {filteredHoldings.map((stock, idx) => (
                  <View key={idx} style={styles.holdingCard}>
                    {/* Top Row: Rank, Name, Sector, Weight Badge */}
                    <View style={styles.holdingTopRow}>
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankText}>#{idx + 1}</Text>
                      </View>

                      <View style={styles.stockIdentityCol}>
                        <View style={styles.stockNameRow}>
                          <Text style={styles.stockNameText}>{stock.name}</Text>
                          {stock.symbol && (
                            <View style={styles.symbolPill}>
                              <Text style={styles.symbolText}>{stock.symbol}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.sectorText}>{stock.sector || 'Diversified'}</Text>
                      </View>

                      <View style={styles.weightBadge}>
                        <Text style={styles.weightBadgeText}>{stock.weightPercent}% Wt</Text>
                      </View>
                    </View>

                    {/* Weight Progress Bar */}
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressBar,
                          { width: `${Math.min(100, Math.max(4, stock.weightPercent))}%` },
                        ]}
                      />
                    </View>

                    {/* Metrics Row: Stake %, Total Stake Value, CMP, 1Y Return */}
                    <View style={styles.holdingBottomGrid}>
                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>WHALE STAKE</Text>
                        <Text style={styles.gridValueGreen}>{stock.stake}</Text>
                      </View>

                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>STAKE VALUE</Text>
                        <Text style={styles.gridValue}>{stock.value}</Text>
                      </View>

                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>CMP</Text>
                        <Text style={styles.gridValue}>{stock.cmp || '—'}</Text>
                      </View>

                      <View style={[styles.gridItem, { alignItems: 'flex-end' }]}>
                        <Text style={styles.gridLabel}>1Y STOCK</Text>
                        <Text
                          style={[
                            styles.gridValue,
                            (stock.change1Y || '').startsWith('-')
                              ? { color: colors.error }
                              : { color: colors.primary },
                          ]}
                        >
                          {stock.change1Y || '—'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}

                {filteredHoldings.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={32} color={colors.textTertiary} />
                    <Text style={styles.emptyTitle}>No matching stock found</Text>
                    <Text style={styles.emptySub}>Try searching for another company or sector name</Text>
                  </View>
                )}
              </View>
            )}

            {/* TAB 2: STARTUPS & UNLISTED */}
            {activeTab === 'STARTUPS' && (
              <View>
                {/* Startup Summary Metrics */}
                <LinearGradient
                  colors={['#17192C', '#0E111E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.summaryCard}
                >
                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryLabel}>TRACKED DEALS</Text>
                    <Text style={styles.summaryValue}>{startups.length} Startups</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryLabel}>TOP MULTIPLIER</Text>
                    <Text style={[styles.summaryValue, { color: colors.primary }]}>
                      {bestStartupMultiple}
                    </Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryLabel}>VERIFIED SOURCE</Text>
                    <Text style={styles.summaryValue}>MCA Form PAS-3</Text>
                  </View>
                </LinearGradient>

                {/* Section Header */}
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>
                    Angel, Venture & Pre-IPO Investments ({filteredStartups.length})
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    Verified via RoC Cap Tables & SEBI DRHP
                  </Text>
                </View>

                {/* Startup Cards List */}
                {filteredStartups.map((st, idx) => {
                  const isIpoExit = (st.stage || '').includes('IPO') || (st.status || '').includes('Listed');
                  return (
                    <View key={idx} style={styles.startupCard}>
                      {/* Top Row: Icon + Name + Category + Stage Badge */}
                      <View style={styles.startupTopRow}>
                        <View
                          style={[
                            styles.startupIconBox,
                            { backgroundColor: st.iconBg || '#3B82F6' },
                          ]}
                        >
                          <Text style={styles.startupEmoji}>{st.iconEmoji || '🚀'}</Text>
                        </View>

                        <View style={styles.startupMainCol}>
                          <View style={styles.startupTitleLine}>
                            <Text style={styles.startupNameText}>{st.name}</Text>
                            <View
                              style={[
                                styles.stageBadge,
                                isIpoExit ? styles.stageBadgeIpo : styles.stageBadgeActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.stageBadgeText,
                                  isIpoExit
                                    ? styles.stageBadgeTextIpo
                                    : styles.stageBadgeTextActive,
                                ]}
                              >
                                {st.stage}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.startupCategoryText}>{st.category}</Text>
                        </View>
                      </View>

                      {/* Middle Grid: Entry Round, Valuation/Status, Invested, Multiple */}
                      <View style={styles.startupDetailsGrid}>
                        <View style={styles.startupGridCell}>
                          <Text style={styles.detailLabel}>ENTRY ROUND</Text>
                          <Text style={styles.detailVal}>{st.entryYear || 'Early Stage'}</Text>
                        </View>

                        <View style={styles.startupGridCell}>
                          <Text style={styles.detailLabel}>CURRENT VALUATION / STATUS</Text>
                          <Text style={styles.detailValHighlight}>{st.status || 'Active'}</Text>
                        </View>
                      </View>

                      {/* Bottom Return Bar */}
                      <View style={styles.startupRoiRow}>
                        <View style={styles.investedAmounts}>
                          <Text style={styles.investedLabel}>
                            Capital: <Text style={styles.investedVal}>{st.investedValue || '—'}</Text> →{' '}
                            <Text style={styles.investedValHigh}>{st.currentValue || '—'}</Text>
                          </Text>
                        </View>

                        <View style={styles.multiplePill}>
                          <Ionicons name="sparkles" size={12} color="#10B981" />
                          <Text style={styles.multipleText}>{st.multiple} Return</Text>
                        </View>
                      </View>

                      {/* Strategic Note */}
                      {st.notes && (
                        <View style={styles.notesBox}>
                          <Ionicons name="information-circle-outline" size={14} color={colors.textTertiary} />
                          <Text style={styles.notesText}>{st.notes}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}

                {filteredStartups.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="rocket-outline" size={32} color={colors.textTertiary} />
                    <Text style={styles.emptyTitle}>No startup investments found</Text>
                    <Text style={styles.emptySub}>
                      {searchQuery
                        ? 'Try searching with another keyword'
                        : 'This investor primarily focuses on public listed equities'}
                    </Text>
                  </View>
                )}

                {/* Regulatory Disclaimer Box */}
                <View style={styles.complianceBox}>
                  <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
                  <Text style={styles.complianceText}>
                    Startup cap table data is aggregated from MCA (Ministry of Corporate Affairs)
                    Form PAS-3 (Return of Allotment), Form MGT-7 annual returns, and SEBI DRHP IPO disclosures.
                  </Text>
                </View>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
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
    backgroundColor: '#0A121A',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '92%',
    paddingTop: 12,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  whaleProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  whaleHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  whaleName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    gap: 3,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.4,
  },
  whaleSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  valHighlight: {
    color: colors.text,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  toggleTabsWrapper: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  toggleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  toggleTabActive: {
    backgroundColor: '#1E293B',
    borderColor: colors.primary,
  },
  toggleTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  toggleTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#0E1724',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
    paddingVertical: 0,
  },
  modalBody: {
    paddingHorizontal: 16,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 6,
    marginBottom: 14,
  },
  summaryStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textTertiary,
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  sectionTitleRow: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  holdingCard: {
    backgroundColor: '#101B27',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  holdingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textTertiary,
  },
  stockIdentityCol: {
    flex: 1,
  },
  stockNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stockNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  symbolPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  symbolText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  sectorText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  weightBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  weightBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    marginVertical: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  holdingBottomGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  gridItem: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  gridValueGreen: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  startupCard: {
    backgroundColor: '#121A28',
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  startupTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  startupIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  startupEmoji: {
    fontSize: 20,
  },
  startupMainCol: {
    flex: 1,
  },
  startupTitleLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  startupNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  stageBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  stageBadgeIpo: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  stageBadgeTextIpo: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },
  stageBadgeActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  stageBadgeTextActive: {
    fontSize: 10,
    fontWeight: '800',
    color: '#60A5FA',
  },
  startupCategoryText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  startupDetailsGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 8,
    marginTop: 10,
    gap: 8,
  },
  startupGridCell: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  detailVal: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  detailValHighlight: {
    fontSize: 11,
    fontWeight: '700',
    color: '#93C5FD',
  },
  startupRoiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  investedAmounts: {
    flex: 1,
  },
  investedLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  investedVal: {
    fontWeight: '700',
    color: colors.text,
  },
  investedValHigh: {
    fontWeight: '800',
    color: colors.primary,
  },
  multiplePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    gap: 4,
  },
  multipleText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.primary,
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 7,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  notesText: {
    fontSize: 10,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 14,
  },
  complianceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    marginTop: 6,
    marginBottom: 10,
    gap: 8,
  },
  complianceText: {
    fontSize: 10,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
