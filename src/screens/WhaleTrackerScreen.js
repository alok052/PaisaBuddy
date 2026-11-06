import AppHeader from '../components/AppHeader';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import WhaleAvatar from '../components/WhaleAvatar';
import CloneWhaleModal from '../components/CloneWhaleModal';
import WhaleBreakdownModal from '../components/WhaleBreakdownModal';
import { fetchLiveWhales, fetchLiveAlert, subscribeToWhales } from '../services/dataService';
import { mockConsensusStocks } from '../data/mockConsensus';


export default function WhaleTrackerScreen({ onOpenMenu }) {
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState('1'); // first one expanded by default
  const [whalesList, setWhalesList] = useState([]);
  const [liveAlert, setLiveAlert] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cloningWhale, setCloningWhale] = useState(null);
  const [viewingBreakdownWhale, setViewingBreakdownWhale] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    const [whalesData, alertData] = await Promise.all([
      fetchLiveWhales(),
      fetchLiveAlert(),
    ]);
    setWhalesList(whalesData);
    setLiveAlert(alertData);
  };

  useEffect(() => {
    loadData();

    const channel = subscribeToWhales((updatedRow) => {
      setWhalesList((prev) =>
        prev.map((w) =>
          w.id === updatedRow.id
            ? {
                ...w,
                portfolioValue: updatedRow.portfolio_value,
                topHoldings: updatedRow.top_holdings || w.topHoldings,
                recentMoves: updatedRow.recent_moves || w.recentMoves,
              }
            : w
        )
      );
    });

    return () => {
      if (channel && channel.unsubscribe) {
        channel.unsubscribe();
      }
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await loadData();
    setRefreshing(false);
  }, []);

  const filters = [
    { id: 'ALL', label: '🌟 All 50 Whales' },
    { id: 'CONSENSUS', label: '💎 Whale Consensus' },
    { id: 'IN', label: '🇮🇳 India (35)' },
    { id: 'US', label: '🇺🇸 Global (15)' },
    { id: 'BUYS', label: '🟢 Recent Buys' },
  ];

  const handleToggleExpand = (id) => {
    Haptics.selectionAsync();
    setExpandedId(expandedId === id ? null : id);
  };

  const handleBrokerTrade = (stock) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      `Trade ${stock.name} (${stock.symbol})`,
      `Current Price: ${stock.cmp} (${stock.change1Y} in 1Y)\nCombined Whale Stake: ${stock.combinedStakeValue}\n\nExecute multi-billionaire backed position via:`,
      [
        { text: 'Zerodha Kite', onPress: () => Alert.alert('Kite Redirect', `Opening ${stock.symbol} order console in Zerodha Kite...`) },
        { text: 'Groww', onPress: () => Alert.alert('Groww Redirect', `Opening ${stock.symbol} order console in Groww...`) },
        { text: 'Angel One', onPress: () => Alert.alert('Angel One Redirect', `Opening ${stock.symbol} order console in Angel One...`) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleAddToWatchlist = (stock) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Watchlist Updated', `Added ${stock.name} (${stock.symbol}) to your Super-Investor Watchlist.`);
  };

  const filteredWhales = (whalesList || []).filter((w) => {
    // 1. Category / Origin Filter
    if (selectedFilter === 'IN' && !w.tag.includes('🇮🇳')) return false;
    if (selectedFilter === 'US' && !w.tag.includes('🇺🇸') && !w.tag.includes('🇬🇧')) return false;
    if (selectedFilter === 'BUYS' && !w.recentMoves.some((m) => m.type === 'BUY')) return false;

    // 2. Search Query Filter (Investor Name, Tag, or Held Stock Name)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesName = w.name.toLowerCase().includes(q);
      const matchesTag = w.tag.toLowerCase().includes(q);
      const matchesStock = (w.topHoldings || []).some((h) => h.name.toLowerCase().includes(q));
      return matchesName || matchesTag || matchesStock;
    }

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
          tintColor={colors.primary}
          colors={[colors.primary, colors.accentBlue]}
        />
      }
    >
      {/* Premium Brand Header */}
      <AppHeader
        subtitle="Billionaires & Institutional Radar"
        onMenuPress={onOpenMenu}
      />

      {/* Real-Time Exchange Sync Pill */}
      <View style={styles.syncStatusBar}>
        <View style={styles.syncStatusLeft}>
          <View style={styles.livePulseDot} />
          <Text style={styles.syncStatusTitle}>REAL-TIME EXCHANGE FEED</Text>
        </View>
        <Text style={styles.syncStatusTime}>SEBI & 13F VERIFIED</Text>
      </View>
      

      {/* Sleek Search Bar for 50 Whales */}
      <View style={styles.searchBarWrapper}>
        <Ionicons name="search" size={17} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchTextInput}
          placeholder="Search 50 whales, stocks (e.g. Kedia, Titan, Apple)..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingRight: 16 }}>
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

      {/* Whale Consensus Screener OR Individual Investor Cards */}
      {selectedFilter === 'CONSENSUS' ? (
        <View style={styles.consensusContainer}>
          {/* Consensus Explainer Banner */}
          <View style={styles.consensusHeaderBox}>
            <View style={styles.consensusBadgeRow}>
              <View style={styles.consensusTag}>
                <Ionicons name="layers-outline" size={13} color={colors.accentBlue} />
                <Text style={styles.consensusTagText}>INSTITUTIONAL RADAR</Text>
              </View>
              <Text style={styles.consensusCountText}>{mockConsensusStocks.length} Verified Overlaps</Text>
            </View>
            <Text style={styles.consensusHeadline}>Multi-Billionaire Co-Invested Stocks</Text>
            <Text style={styles.consensusSub}>
              Companies where 2 or more super-investors concurrently hold >1% equity stake based on official SEBI filings.
            </Text>
          </View>

          {/* Consensus Stock Cards */}
          {mockConsensusStocks.map((stock) => (
            <View key={stock.id} style={styles.consensusCard}>
              {/* Top Row: Symbol, Sector, Conviction Pill */}
              <View style={styles.cTopRow}>
                <View style={styles.cSymbolPill}>
                  <Text style={styles.cSymbolText}>{stock.symbol}</Text>
                </View>
                <Text style={styles.cSectorText} numberOfLines={1}>{stock.sector}</Text>
                <View style={styles.cConvictionPill}>
                  <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
                  <Text style={styles.cConvictionScore}>{stock.convictionScore}%</Text>
                </View>
              </View>

              {/* Name & Combined Stake Row */}
              <View style={styles.cNameRow}>
                <Text style={styles.cNameText}>{stock.name}</Text>
                <View style={styles.cStakeBadge}>
                  <Text style={styles.cStakeText}>{stock.combinedStakeValue}</Text>
                </View>
              </View>

              {/* Price & 1Y Return */}
              <View style={styles.cPriceRow}>
                <Text style={styles.cPriceText}>{stock.cmp}</Text>
                <View
                  style={[
                    styles.cReturnPill,
                    {
                      backgroundColor: stock.isPositive
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                    },
                  ]}
                >
                  <Ionicons
                    name={stock.isPositive ? 'trending-up' : 'trending-down'}
                    size={12}
                    color={stock.isPositive ? colors.primary : colors.danger}
                  />
                  <Text
                    style={[
                      styles.cReturnText,
                      { color: stock.isPositive ? colors.primary : colors.danger },
                    ]}
                  >
                    {stock.change1Y} 1Y
                  </Text>
                </View>
              </View>

              {/* Backing Whales */}
              <View style={styles.cBackersBox}>
                <Text style={styles.cBackersTitle}>Co-Invested Super-Investors:</Text>
                <View style={styles.cBackersList}>
                  {stock.billionaires.map((b, idx) => (
                    <View key={idx} style={styles.cBackerChip}>
                      <Ionicons name="person-circle" size={16} color={colors.primary} />
                      <Text style={styles.cBackerName}>{b.name}</Text>
                      <View style={styles.cBackerStake}>
                        <Text style={styles.cBackerStakeText}>{b.stake}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Catalyst Box */}
              <View style={styles.cDetailBox}>
                <View style={styles.cDetailHeader}>
                  <Ionicons name="bulb-outline" size={14} color={colors.warning} />
                  <Text style={styles.cDetailLabel}>Growth Catalyst:</Text>
                </View>
                <Text style={styles.cDetailText}>{stock.catalyst}</Text>
              </View>

              {/* Quarter Move */}
              <View
                style={[
                  styles.cDetailBox,
                  {
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    borderColor: 'rgba(59, 130, 246, 0.2)',
                  },
                ]}
              >
                <View style={styles.cDetailHeader}>
                  <Ionicons name="swap-horizontal" size={14} color={colors.accentBlue} />
                  <Text style={[styles.cDetailLabel, { color: colors.accentBlue }]}>
                    Latest Filing Move:
                  </Text>
                </View>
                <Text style={styles.cDetailText}>{stock.quarterMove}</Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.cActionRow}>
                <TouchableOpacity
                  style={styles.cTradeBtn}
                  activeOpacity={0.8}
                  onPress={() => handleBrokerTrade(stock)}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    style={styles.cTradeBtnGrad}
                  >
                    <Ionicons name="flash" size={14} color="#FFFFFF" />
                    <Text style={styles.cTradeBtnText}>Trade on Broker</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cWatchlistBtn}
                  activeOpacity={0.8}
                  onPress={() => handleAddToWatchlist(stock)}
                >
                  <Ionicons name="bookmark-outline" size={15} color={colors.text} />
                  <Text style={styles.cWatchlistBtnText}>Watchlist</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : (
        /* Investor Cards */
        <View style={styles.cardsList}>
          {filteredWhales.map((whale) => {
            const isExpanded = expandedId === whale.id;
            return (
              <TouchableOpacity
                key={whale.id}
                style={styles.whaleCard}
                activeOpacity={0.9}
                onPress={() => handleToggleExpand(whale.id)}
              >
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <WhaleAvatar
                    imageSource={whale.localImage}
                    avatarText={whale.avatar}
                    gradient={whale.avatarGradient}
                    size={52}
                    borderColor={whale.isPositive ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.15)'}
                  />

                  <View style={styles.cardInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.whaleName}>{whale.name}</Text>
                    </View>
                    <Text style={styles.whaleTag}>{whale.tag}</Text>
                    <Text style={styles.portfolioVal}>{whale.portfolioValue}</Text>
                  </View>

                  <View style={styles.returnBadge}>
                    <Text style={styles.returnText}>{whale.return1Y}</Text>
                    <Text style={styles.returnLabel}>1Y Return</Text>
                  </View>
                </View>

                {/* Top Holdings Preview */}
                <View style={styles.holdingsPreview}>
                  <Text style={styles.sectionMiniTitle}>Top Holdings:</Text>
                  <View style={styles.holdingsTags}>
                    {whale.topHoldings.slice(0, 3).map((h, i) => (
                      <View key={i} style={styles.holdingPill}>
                        <Text style={styles.holdingPillText}>
                          {h.name} <Text style={{ color: colors.primary }}>{h.stake}</Text>
                        </Text>
                      </View>
                    ))}
                    {whale.topHoldings.length > 3 && (
                      <View style={styles.morePill}>
                        <Text style={styles.morePillText}>+{whale.topHoldings.length - 3} more</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Expandable Section */}
                {isExpanded && (
                  <View style={styles.expandArea}>
                    <View style={styles.divider} />
                    <Text style={styles.expandTitle}>📊 Recent Portfolio Activity</Text>
                    {whale.recentMoves.map((m, idx) => (
                      <View key={idx} style={styles.moveRow}>
                        <View
                          style={[
                            styles.moveTypeBadge,
                            {
                              backgroundColor:
                                m.type === 'BUY'
                                  ? 'rgba(16, 185, 129, 0.2)'
                                  : m.type === 'SELL'
                                  ? 'rgba(239, 68, 68, 0.2)'
                                  : 'rgba(59, 130, 246, 0.2)',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.moveTypeText,
                              {
                                color:
                                  m.type === 'BUY'
                                    ? colors.primary
                                    : m.type === 'SELL'
                                    ? colors.danger
                                    : colors.accentBlue,
                              },
                            ]}
                          >
                            {m.type}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.moveStock}>{m.stock}</Text>
                          <Text style={styles.moveDetail}>{m.detail}</Text>
                        </View>
                        <Text style={styles.moveDate}>{m.date}</Text>
                      </View>
                    ))}

                    <TouchableOpacity
                      style={styles.cloneButton}
                      activeOpacity={0.8}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setCloningWhale(whale);
                      }}
                    >
                      <LinearGradient
                        colors={[colors.primary, colors.primaryDark]}
                        style={styles.cloneButtonGrad}
                      >
                        <Ionicons name="flash" size={15} color="#FFFFFF" />
                        <Text style={styles.cloneButtonText}>
                          Clone Portfolio (₹10k - ₹1L Basket) →
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.viewFullButton}
                      activeOpacity={0.8}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setViewingBreakdownWhale(whale);
                      }}
                    >
                      <Text style={styles.viewFullText}>Full Holdings & Weights Breakdown →</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Pro Alerts CTA */}
      <LinearGradient
        colors={['rgba(245, 158, 11, 0.15)', 'rgba(217, 119, 6, 0.25)']}
        style={styles.proCta}
      >
        <Ionicons name="notifications-outline" size={26} color={colors.warning} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.proTitle}>Real-Time Whale SMS Alerts</Text>
          <Text style={styles.proSub}>
            Instant real-time SMS & Push alerts when billionaires buy or sell (₹99/mo)
          </Text>
        </View>
        <TouchableOpacity style={styles.proButton} activeOpacity={0.8}>
          <Text style={styles.proButtonText}>Upgrade</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Clone Whale Portfolio Modal */}
      <CloneWhaleModal
        visible={!!cloningWhale}
        whale={cloningWhale}
        onClose={() => setCloningWhale(null)}
      />

      {/* Complete Holdings & Startups Research Breakdown Modal */}
      <WhaleBreakdownModal
        visible={!!viewingBreakdownWhale}
        whale={viewingBreakdownWhale}
        onClose={() => setViewingBreakdownWhale(null)}
      />

      <View style={{ height: 125 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E1624',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 7,
    marginTop: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchTextInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    paddingVertical: 0,
  },
  syncStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginTop: 2,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  syncStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  syncStatusTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.6,
  },
  syncStatusTime: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
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
  bellButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  liveIndicatorDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.card,
  },
  alertCardWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 16,
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
  filterScroll: {
    marginTop: 6,
    marginBottom: 16,
    marginHorizontal: -8,
    paddingHorizontal: 8,
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
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
    gap: 15,
  },
  whaleCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 17,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  whaleName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  whaleTag: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  portfolioVal: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  returnBadge: {
    alignItems: 'flex-end',
  },
  returnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  returnLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  holdingsPreview: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  sectionMiniTitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 6,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  holdingsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  holdingPill: {
    backgroundColor: colors.cardSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  holdingPillText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '500',
  },
  morePill: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 9,
    paddingVertical: 6.5,
    borderRadius: 8,
  },
  morePillText: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: '600',
  },
  expandArea: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginBottom: 10,
  },
  expandTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  moveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  moveTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 10,
  },
  moveTypeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  moveStock: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  moveDetail: {
    fontSize: 11,
    color: colors.textMuted,
  },
  moveDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  cloneButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 6,
  },
  cloneButtonGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  cloneButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  viewFullButton: {
    backgroundColor: colors.surfaceHighlight,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 2,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  viewFullText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  proCta: {
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  proTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  proSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  proButton: {
    backgroundColor: colors.warning,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  proButtonText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 12,
  },
  // Whale Consensus Screener Styles
  consensusContainer: {
    marginTop: 6,
    gap: 16,
  },
  consensusHeaderBox: {
    backgroundColor: '#121824',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  consensusBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  consensusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  consensusTagText: {
    color: colors.warning,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  consensusCountText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  consensusHeadline: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  consensusSub: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  consensusCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  cSymbolPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cSymbolText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  cSectorText: {
    flex: 1,
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  cConvictionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  cConvictionScore: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  cNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cNameText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  cStakeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cStakeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  cPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  cPriceText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
  },
  cReturnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  cReturnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cBackersBox: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  cBackersTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cBackersList: {
    gap: 6,
  },
  cBackerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'space-between',
  },
  cBackerName: {
    flex: 1,
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  cBackerStake: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cBackerStakeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  cDetailBox: {
    backgroundColor: '#141E2E',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  cDetailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warning,
  },
  cDetailText: {
    fontSize: 11.5,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  cActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cTradeBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cTradeBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  cTradeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  cWatchlistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cWatchlistBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
});
