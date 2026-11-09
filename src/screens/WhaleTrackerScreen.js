import AppHeader from '../components/AppHeader';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
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
import StockDetailModal from '../components/StockDetailModal';
import {
  fetchLiveWhales,
  fetchLiveConsensusStocks,
  buildLiveConsensusStocks,
  subscribeToWhales,
  subscribeToConsensus,
  fetchNseStocksIndex,
  searchAndFilterNseStocks,
  formatInrPrice,
  formatIndianVolume,
} from '../services/dataService';
import { mockConsensusStocks } from '../data/mockConsensus';
import { readJsonStore, STORE_KEYS } from '../services/localStore';
import { openBrokerTerminal } from '../services/externalLinks';
import {
  toggleWatchlistEntry,
  removeWatchlistEntry,
  isItemSavedInWatchlist,
  enrichWatchlistItems,
} from '../services/watchlistService';
import {
  shareConsensusStockInsight,
  shareNseStockInsight,
  shareWhaleInsight,
} from '../services/shareService';

export default function WhaleTrackerScreen({ onOpenMenu, onOpenStocks }) {
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState('1'); // first one expanded by default
  const [whalesList, setWhalesList] = useState([]);
  const [nseStocks, setNseStocks] = useState([]);
  const [consensusOverride, setConsensusOverride] = useState(null);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [savedWatchlist, setSavedWatchlist] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [cloningWhale, setCloningWhale] = useState(null);
  const [viewingBreakdownWhale, setViewingBreakdownWhale] = useState(null);
  const [selectedNseStock, setSelectedNseStock] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    readJsonStore(STORE_KEYS.WATCHLIST, []).then((items) => {
      if (Array.isArray(items)) setSavedWatchlist(items);
    });
  }, []);

  const loadData = useCallback(async (forceStocks = false) => {
    try {
      const [whalesData, stocksData] = await Promise.all([
        fetchLiveWhales(),
        fetchNseStocksIndex({ forceRefresh: forceStocks }),
      ]);
      setWhalesList(whalesData);
      if (Array.isArray(stocksData)) {
        setNseStocks(stocksData);
      }
      const consensusData = await fetchLiveConsensusStocks(whalesData);
      if (Array.isArray(consensusData) && consensusData.length > 0) {
        setConsensusOverride(consensusData);
      }
    } catch (err) {
      console.log('Error loading whale radar data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();

    const whalesChannel = subscribeToWhales((mappedWhale) => {
      if (!mappedWhale) return;
      setConsensusOverride(null);
      setWhalesList((prev) => {
        const exists = prev.some((w) => String(w.id) === String(mappedWhale.id));
        const next = exists
          ? prev.map((w) => (String(w.id) === String(mappedWhale.id) ? mappedWhale : w))
          : [...prev, mappedWhale];
        next.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));
        return next;
      });
    });

    const consensusChannel = subscribeToConsensus(async () => {
      const refreshed = await fetchLiveConsensusStocks();
      if (Array.isArray(refreshed) && refreshed.length > 0) {
        setConsensusOverride(refreshed);
      }
    });

    return () => {
      if (whalesChannel?.unsubscribe) whalesChannel.unsubscribe();
      if (consensusChannel?.unsubscribe) consensusChannel.unsubscribe();
    };
  }, [loadData]);

  const consensusList = useMemo(() => {
    if (Array.isArray(consensusOverride) && consensusOverride.length > 0) {
      return consensusOverride;
    }
    return buildLiveConsensusStocks(whalesList, mockConsensusStocks);
  }, [consensusOverride, whalesList]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await loadData(true);
    setRefreshing(false);
  }, [loadData]);

  const totalCount = whalesList.length > 0 ? whalesList.length : 50;
  const indiaCount = useMemo(
    () => (whalesList.length > 0 ? whalesList.filter((w) => (w.tag || '').includes('🇮🇳')).length : 35),
    [whalesList]
  );
  const globalCount = useMemo(
    () =>
      whalesList.length > 0
        ? whalesList.filter((w) => (w.tag || '').includes('🇺🇸') || (w.tag || '').includes('🇬🇧')).length
        : 15,
    [whalesList]
  );
  const stocksCountLabel = useMemo(() => {
    if (nseStocks.length >= 100) {
      return `${Math.floor(nseStocks.length / 100) * 100}+`;
    }
    return '3,500+';
  }, [nseStocks]);

  const filters = [
    { id: 'ALL', label: `🌟 All ${totalCount} Whales` },
    { id: 'WATCHLIST', label: `🔖 Watchlist (${savedWatchlist.length})` },
    { id: 'CONSENSUS', label: `💎 Consensus (${consensusList.length})` },
    { id: 'STOCKS', label: `📈 All Stocks (${stocksCountLabel})` },
    { id: 'IN', label: `🇮🇳 India (${indiaCount})` },
    { id: 'US', label: `🇺🇸 Global (${globalCount})` },
    { id: 'BUYS', label: '🟢 Recent Buys' },
  ];

  const handleToggleExpand = (id) => {
    Haptics.selectionAsync();
    setExpandedId(expandedId === id ? null : id);
  };

  const isInWatchlist = useCallback(
    (stock) => isItemSavedInWatchlist(savedWatchlist, stock),
    [savedWatchlist]
  );

  const handleBrokerTrade = (stock) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const ticker = stock.resolvedSymbol || stock.symbol || stock.name;
    const priceLabel = stock.livePrice > 0 ? formatInrPrice(stock.livePrice) : stock.cmp || 'Market Rate';
    Alert.alert(
      `Trade ${stock.displayName || stock.name} (${ticker})`,
      `Current Price: ${priceLabel}${stock.change1Y ? ` (${stock.change1Y} in 1Y)` : ''}${
        stock.combinedStakeValue ? `\nCombined Whale Stake: ${stock.combinedStakeValue}` : ''
      }\n\nOpen real broker / exchange portal:`,
      [
        { text: 'Zerodha Kite', onPress: () => openBrokerTerminal('Zerodha Kite', ticker) },
        { text: 'Groww', onPress: () => openBrokerTerminal('Groww', ticker) },
        { text: 'Angel One', onPress: () => openBrokerTerminal('Angel One', ticker) },
        { text: 'NSE Quote', onPress: () => openBrokerTerminal('NSE Quote', ticker) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleAddToWatchlist = async (stock) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { nextList, added } = await toggleWatchlistEntry(savedWatchlist, stock);
    setSavedWatchlist(nextList);
    Alert.alert(
      added ? 'Saved to Watchlist' : 'Removed from Watchlist',
      added
        ? `Saved ${stock.name} (${stock.symbol || 'Tracked'}) persistently on this device.`
        : `Removed ${stock.name} (${stock.symbol || 'Tracked'}) from your saved watchlist.`
    );
  };

  const handleRemoveWatchlistItem = async (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextList = await removeWatchlistEntry(savedWatchlist, item.key);
    setSavedWatchlist(nextList);
  };

  const enrichedWatchlist = useMemo(
    () => enrichWatchlistItems(savedWatchlist, nseStocks, whalesList),
    [savedWatchlist, nseStocks, whalesList]
  );

  const filteredWatchlist = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return enrichedWatchlist;
    return enrichedWatchlist.filter(
      (item) =>
        (item.displayName || '').toLowerCase().includes(q) ||
        (item.resolvedSymbol || '').toLowerCase().includes(q) ||
        (item.sector || '').toLowerCase().includes(q)
    );
  }, [enrichedWatchlist, searchQuery]);

  const filteredWhales = (whalesList || []).filter((w) => {
    const tagStr = w.tag || '';
    const moves = Array.isArray(w.recentMoves) ? w.recentMoves : [];
    const holdings = Array.isArray(w.topHoldings) ? w.topHoldings : [];

    // 1. Category / Origin Filter
    if (selectedFilter === 'IN' && !tagStr.includes('🇮🇳')) return false;
    if (selectedFilter === 'US' && !tagStr.includes('🇺🇸') && !tagStr.includes('🇬🇧')) return false;
    if (selectedFilter === 'BUYS' && !moves.some((m) => m.type === 'BUY')) return false;

    // 2. Search Query Filter (Investor Name, Tag, Held Stock Name or Ticker)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesName = (w.name || '').toLowerCase().includes(q);
      const matchesTag = tagStr.toLowerCase().includes(q);
      const matchesStock = holdings.some(
        (h) =>
          (h.name || '').toLowerCase().includes(q) ||
          (h.symbol || '').toLowerCase().includes(q)
      );
      return matchesName || matchesTag || matchesStock;
    }

    return true;
  });

  const filteredConsensus = useMemo(() => {
    if (!searchQuery.trim()) return consensusList;
    const q = searchQuery.toLowerCase().trim();
    return consensusList.filter(
      (stock) =>
        (stock.name || '').toLowerCase().includes(q) ||
        (stock.symbol || '').toLowerCase().includes(q) ||
        (stock.sector || '').toLowerCase().includes(q) ||
        (stock.billionaires || []).some((b) => (b.name || '').toLowerCase().includes(q))
    );
  }, [consensusList, searchQuery]);

  const matchingNseStocks = useMemo(() => {
    const limit = selectedFilter === 'STOCKS' ? 40 : 6;
    if (selectedFilter !== 'STOCKS' && !searchQuery.trim()) return [];
    return searchAndFilterNseStocks(nseStocks, searchQuery, 'TOP', limit);
  }, [nseStocks, searchQuery, selectedFilter]);

  const renderNseStockRow = (st) => {
    const isPos = (st.dayChangePct ?? 0) >= 0;
    const pctColor = isPos ? colors.primary : colors.danger;
    const hasPrice = st.closePrice !== null && st.closePrice > 0;
    return (
      <TouchableOpacity
        key={st.symbol}
        style={styles.nseInlineCard}
        activeOpacity={0.8}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedNseStock(st);
        }}
      >
        <View style={{ flex: 1, marginRight: 10 }}>
          <View style={styles.nseSymRow}>
            <Text style={styles.nseSymText}>{st.symbol}</Text>
            <View style={styles.nseSeriesPill}>
              <Text style={styles.nseSeriesText}>{st.series || 'EQ'}</Text>
            </View>
            <View style={styles.nseEodBadge}>
              <Text style={styles.nseEodBadgeText}>EOD CHART</Text>
            </View>
          </View>
          <Text style={styles.nseCompanyText} numberOfLines={1}>
            {st.name}
          </Text>
          <Text style={styles.nseMetaText} numberOfLines={1}>
            Vol {formatIndianVolume(st.volume)}
            {st.deliveryPct !== null && st.deliveryPct !== undefined ? ` • Deliv ${st.deliveryPct}%` : ''}
            {st.lastTradeDate ? ` • ${st.lastTradeDate}` : ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.nsePriceText}>{hasPrice ? formatInrPrice(st.closePrice) : 'Unquoted'}</Text>
          {hasPrice ? (
            <View
              style={[
                styles.nsePctBadge,
                { backgroundColor: isPos ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)' },
              ]}
            >
              <Text style={[styles.nsePctText, { color: pctColor }]}>
                {isPos ? '+' : ''}
                {(st.dayChangePct ?? 0).toFixed(2)}%
              </Text>
            </View>
          ) : (
            <Text style={styles.nseMetaText}>No Trade</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color="#64748B" style={{ marginLeft: 6 }} />
      </TouchableOpacity>
    );
  };

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

      {/* Sleek Search Bar for All NSE Stocks & 50 Whales */}
      <View style={styles.searchBarWrapper}>
        <Ionicons name="search" size={17} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchTextInput}
          placeholder="Search any NSE share (Reliance, Zomato, TCS) or whales..."
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

      {/* SAVED WATCHLIST OR ALL NSE STOCKS OR CONSENSUS OR WHALE CARDS */}
      {selectedFilter === 'WATCHLIST' ? (
        <View style={styles.watchlistSection}>
          <View style={styles.watchlistHeroCard}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <View style={styles.watchlistTagRow}>
                <Ionicons name="bookmark" size={13} color={colors.primary} />
                <Text style={styles.watchlistTagText}>SAVED WATCHLIST TERMINAL</Text>
              </View>
              <Text style={styles.watchlistHeroTitle}>
                Tracked Stocks &amp; Private Picks ({filteredWatchlist.length})
              </Text>
              <Text style={styles.watchlistHeroSub}>
                Live NSE EOD prices &amp; 50-Whale ownership automatically synced on-device.
              </Text>
            </View>
            <View style={styles.watchlistCountBox}>
              <Text style={styles.watchlistCountNum}>{savedWatchlist.length}</Text>
              <Text style={styles.watchlistCountLbl}>SAVED</Text>
            </View>
          </View>

          {filteredWatchlist.map((item) => {
            const hasLive = item.livePrice !== null && item.livePrice > 0;
            const pct = item.dayChangePct;
            const isPos = (pct ?? 0) >= 0;
            const badgeText =
              item.stage === 'PRE-IPO' || item.stage === 'PRIVATE'
                ? item.stage
                : item.nseMatch
                ? `NSE • ${item.nseMatch.series || 'EQ'}`
                : item.stage || 'TRACKED';

            return (
              <TouchableOpacity
                key={item.key}
                style={styles.wlCard}
                activeOpacity={0.86}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (item.nseMatch) {
                    setSelectedNseStock(item.nseMatch);
                  } else if (item.resolvedSymbol) {
                    openBrokerTerminal('NSE Quote', item.resolvedSymbol);
                  }
                }}
              >
                <View style={styles.wlTopRow}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <View style={styles.wlBadgeRow}>
                      <View style={styles.wlSymBadge}>
                        <Text style={styles.wlSymText}>
                          {item.resolvedSymbol || item.key}
                        </Text>
                      </View>
                      <View style={styles.wlStagePill}>
                        <Text style={styles.wlStageText}>{badgeText}</Text>
                      </View>
                      {item.whaleHolders.length > 0 && (
                        <View style={styles.wlWhalePill}>
                          <Text style={styles.wlWhaleText}>
                            🐋 {item.whaleHolders.length} Whale
                            {item.whaleHolders.length > 1 ? 's' : ''}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.wlName} numberOfLines={1}>
                      {item.displayName}
                    </Text>
                    {item.sector && (
                      <Text style={styles.wlMeta} numberOfLines={1}>
                        {item.sector}
                        {item.deliveryPct != null ? ` • Delivery ${item.deliveryPct}%` : ''}
                      </Text>
                    )}
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.wlPrice}>
                      {item.displayPriceText ||
                        (hasLive && !item.isUsdPrice
                          ? formatInrPrice(item.livePrice)
                          : item.cmp || 'Track Only')}
                    </Text>
                    {pct !== null && pct !== undefined ? (
                      <View
                        style={[
                          styles.wlPctBadge,
                          {
                            backgroundColor: isPos
                              ? 'rgba(16, 185, 129, 0.14)'
                              : 'rgba(239, 68, 68, 0.14)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.wlPctText,
                            { color: isPos ? colors.primary : colors.danger },
                          ]}
                        >
                          {isPos ? '+' : ''}
                          {pct.toFixed(2)}%
                        </Text>
                      </View>
                    ) : item.change1Y ? (
                      <Text style={styles.wlChangeSub}>{item.change1Y} 1Y</Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.wlActionRow}>
                  <TouchableOpacity
                    style={styles.wlPrimaryBtn}
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (item.nseMatch) {
                        setSelectedNseStock(item.nseMatch);
                      } else {
                        handleBrokerTrade(item);
                      }
                    }}
                  >
                    <Ionicons
                      name={item.nseMatch ? 'analytics-outline' : 'open-outline'}
                      size={14}
                      color="#10B981"
                    />
                    <Text style={styles.wlPrimaryBtnText}>
                      {item.nseMatch ? '1Y Chart & Whales' : 'Research Quote'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.wlIconBtn}
                    activeOpacity={0.8}
                    onPress={() => handleBrokerTrade(item)}
                  >
                    <Ionicons name="flash-outline" size={15} color="#CBD5E1" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.wlIconBtn}
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      shareNseStockInsight(
                        item.nseMatch || {
                          symbol: item.resolvedSymbol || item.key,
                          name: item.displayName,
                          closePrice: !item.isUsdPrice ? item.livePrice : null,
                          cmp: item.cmp,
                          dayChangePct: item.dayChangePct,
                          deliveryPct: item.deliveryPct,
                        },
                        item.whaleHolders
                      );
                    }}
                  >
                    <Ionicons name="share-social-outline" size={15} color="#38BDF8" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.wlIconBtn, styles.wlRemoveBtn]}
                    activeOpacity={0.8}
                    onPress={() => handleRemoveWatchlistItem(item)}
                  >
                    <Ionicons name="trash-outline" size={15} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}

          {filteredWatchlist.length === 0 && (
            <View style={styles.emptySearchBox}>
              <Ionicons name="bookmark-outline" size={30} color={colors.primary} />
              <Text style={styles.emptySearchTitle}>
                {searchQuery.trim() ? 'No Watchlist Match' : 'Your Watchlist Is Empty'}
              </Text>
              <Text style={styles.emptySearchSub}>
                {searchQuery.trim()
                  ? `No saved stock matched "${searchQuery}".`
                  : 'Tap "Watchlist" on Consensus stocks, NSE Shares, or Whale Holdings to track prices & super-investor moves here.'}
              </Text>
              <View style={styles.wlEmptyActions}>
                <TouchableOpacity
                  style={styles.resetFilterBtn}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedFilter('CONSENSUS');
                  }}
                >
                  <Text style={styles.resetFilterBtnText}>💎 Browse Consensus</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.resetFilterBtn, { borderColor: 'rgba(56, 189, 248, 0.4)' }]}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedFilter('STOCKS');
                  }}
                >
                  <Text style={[styles.resetFilterBtnText, { color: '#38BDF8' }]}>
                    📈 Explore NSE Stocks
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      ) : selectedFilter === 'STOCKS' ? (
        <View style={styles.nseDirectorySection}>
          <View style={styles.nseDirBanner}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.nseDirTitle}>Official NSE All-Companies Price &amp; History</Text>
              <Text style={styles.nseDirSub}>
                Tap any share across {nseStocks.length > 0 ? nseStocks.length.toLocaleString('en-IN') : '3,500+'} NSE equities to inspect price, delivery %, &amp; 1Y EOD chart.
              </Text>
            </View>
            {onOpenStocks && (
              <TouchableOpacity
                style={styles.fullTerminalBtn}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onOpenStocks();
                }}
              >
                <Text style={styles.fullTerminalBtnText}>Full View →</Text>
              </TouchableOpacity>
            )}
          </View>

          {matchingNseStocks.map(renderNseStockRow)}

          {matchingNseStocks.length === 0 && (
            <View style={styles.emptySearchBox}>
              <Ionicons name="search-outline" size={28} color={colors.textMuted} />
              <Text style={styles.emptySearchTitle}>No NSE Stock Found</Text>
              <Text style={styles.emptySearchSub}>
                No NSE symbol or company matched "{searchQuery}".
              </Text>
              <TouchableOpacity style={styles.resetFilterBtn} onPress={() => setSearchQuery('')}>
                <Text style={styles.resetFilterBtnText}>Clear Search</Text>
              </TouchableOpacity>
            </View>
          )}

          {onOpenStocks && matchingNseStocks.length > 0 && (
            <TouchableOpacity
              style={styles.viewAllStocksFooterBtn}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onOpenStocks();
              }}
            >
              <Text style={styles.viewAllStocksFooterText}>
                Open Complete {nseStocks.length.toLocaleString('en-IN')} Stocks Explorer (Gainers, Losers &amp; ETFs) →
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : selectedFilter === 'CONSENSUS' ? (
        <View style={styles.consensusContainer}>
          {/* Consensus Explainer Banner */}
          <View style={styles.consensusHeaderBox}>
            <View style={styles.consensusBadgeRow}>
              <View style={styles.consensusTag}>
                <Ionicons name="layers-outline" size={13} color={colors.accentBlue} />
                <Text style={styles.consensusTagText}>LIVE OVERLAP RADAR</Text>
              </View>
              <Text style={styles.consensusCountText}>{filteredConsensus.length} Live Overlaps</Text>
            </View>
            <Text style={styles.consensusHeadline}>Multi-Billionaire Co-Invested Stocks</Text>
            <Text style={styles.consensusSub}>
              Companies where 2 or more super-investors concurrently hold positions across live NSE/SEBI &amp; US SEC Form 13F-HR filings.
            </Text>
          </View>

          {/* Consensus Stock Cards */}
          {filteredConsensus.map((stock) => (
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
                <Text style={styles.cBackersTitle}>Co-Invested Super-Investors ({(stock.billionaires || []).length}):</Text>
                <View style={styles.cBackersList}>
                  {(stock.billionaires || []).map((b, idx) => (
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
                  <Ionicons
                    name={isInWatchlist(stock) ? 'bookmark' : 'bookmark-outline'}
                    size={15}
                    color={isInWatchlist(stock) ? colors.primary : colors.text}
                  />
                  <Text
                    style={[
                      styles.cWatchlistBtnText,
                      isInWatchlist(stock) && { color: colors.primary },
                    ]}
                  >
                    {isInWatchlist(stock) ? 'Saved' : 'Watchlist'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cShareIconBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    shareConsensusStockInsight(stock);
                  }}
                >
                  <Ionicons name="share-social-outline" size={16} color="#38BDF8" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {filteredConsensus.length === 0 && searchQuery.trim().length > 0 && matchingNseStocks.length > 0 && (
            <View style={styles.nseInlineBlock}>
              <Text style={styles.nseInlineHeader}>📈 MATCHING NSE SHARES ({matchingNseStocks.length})</Text>
              {matchingNseStocks.map(renderNseStockRow)}
            </View>
          )}

          {filteredConsensus.length === 0 && matchingNseStocks.length === 0 && (
            <View style={styles.emptySearchBox}>
              <Ionicons name="search-outline" size={28} color={colors.textMuted} />
              <Text style={styles.emptySearchTitle}>No Matching Consensus Stocks</Text>
              <Text style={styles.emptySearchSub}>Try clearing "{searchQuery}" to view all live overlaps.</Text>
              <TouchableOpacity style={styles.resetFilterBtn} onPress={() => setSearchQuery('')}>
                <Text style={styles.resetFilterBtnText}>Clear Search</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        /* Investor Cards (+ Instant NSE Share Matches when searching) */
        <View style={styles.cardsList}>
          {searchQuery.trim().length > 0 && matchingNseStocks.length > 0 && (
            <View style={styles.nseInlineBlock}>
              <View style={styles.nseInlineHeaderRow}>
                <Text style={styles.nseInlineHeader}>
                  📈 NSE LISTED SHARES ({matchingNseStocks.length} MATCH{matchingNseStocks.length === 1 ? '' : 'ES'})
                </Text>
                {onOpenStocks && (
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onOpenStocks();
                    }}
                  >
                    <Text style={styles.nseInlineMoreLink}>Full Terminal →</Text>
                  </TouchableOpacity>
                )}
              </View>
              {matchingNseStocks.map(renderNseStockRow)}
            </View>
          )}

          {filteredWhales.map((whale) => {
            const isExpanded = expandedId === whale.id;
            const topHoldings = Array.isArray(whale.topHoldings) ? whale.topHoldings : [];
            const allCount = Array.isArray(whale.allHoldings) ? whale.allHoldings.length : topHoldings.length;
            const recentMoves = Array.isArray(whale.recentMoves) ? whale.recentMoves : [];
            const extraCount = Math.max(0, allCount - 3);

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
                    <Text
                      style={[
                        styles.returnText,
                        { color: whale.isPositive ? colors.primary : colors.danger },
                      ]}
                    >
                      {whale.return1Y}
                    </Text>
                    <Text style={styles.returnLabel}>1Y Return</Text>
                  </View>
                </View>

                {/* Top Holdings Preview */}
                <View style={styles.holdingsPreview}>
                  <Text style={styles.sectionMiniTitle}>Top Holdings:</Text>
                  <View style={styles.holdingsTags}>
                    {topHoldings.slice(0, 3).map((h, i) => (
                      <View key={i} style={styles.holdingPill}>
                        <Text style={styles.holdingPillText}>
                          {h.name} <Text style={{ color: colors.primary }}>{h.stake}</Text>
                        </Text>
                      </View>
                    ))}
                    {extraCount > 0 && (
                      <View style={styles.morePill}>
                        <Text style={styles.morePillText}>+{extraCount} more</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Expandable Section */}
                {isExpanded && (
                  <View style={styles.expandArea}>
                    <View style={styles.divider} />
                    <Text style={styles.expandTitle}>📊 Recent Portfolio Activity</Text>
                    {recentMoves.map((m, idx) => (
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

                    <View style={styles.expandFooterActions}>
                      <TouchableOpacity
                        style={[styles.viewFullButton, { flex: 1 }]}
                        activeOpacity={0.8}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setViewingBreakdownWhale(whale);
                        }}
                      >
                        <Text style={styles.viewFullText}>Full Holdings Breakdown →</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.whaleShareBtn}
                        activeOpacity={0.8}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          shareWhaleInsight(whale);
                        }}
                      >
                        <Ionicons name="share-social-outline" size={16} color="#38BDF8" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {filteredWhales.length === 0 && matchingNseStocks.length === 0 && (
            <View style={styles.emptySearchBox}>
              <Ionicons name="search-outline" size={28} color={colors.textMuted} />
              <Text style={styles.emptySearchTitle}>No Matching Shares or Whales</Text>
              <Text style={styles.emptySearchSub}>
                No matches for "{searchQuery || selectedFilter}" across NSE equities &amp; {totalCount} whales.
              </Text>
              <TouchableOpacity
                style={styles.resetFilterBtn}
                onPress={() => {
                  setSearchQuery('');
                  setSelectedFilter('ALL');
                }}
              >
                <Text style={styles.resetFilterBtnText}>Show All {totalCount} Whales</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Free 24/7 Live Exchange Radar CTA */}
      <LinearGradient
        colors={
          alertsEnabled
            ? ['rgba(16, 185, 129, 0.14)', 'rgba(5, 150, 105, 0.22)']
            : ['rgba(245, 158, 11, 0.15)', 'rgba(217, 119, 6, 0.25)']
        }
        style={[
          styles.proCta,
          alertsEnabled && { borderColor: 'rgba(16, 185, 129, 0.35)' },
        ]}
      >
        <Ionicons
          name={alertsEnabled ? 'radio' : 'notifications-outline'}
          size={24}
          color={alertsEnabled ? colors.primary : colors.warning}
        />
        <View style={styles.proTextCol}>
          <Text style={styles.proTitle} numberOfLines={1}>
            {alertsEnabled ? '24/7 Live Exchange Radar' : 'Enable Live Exchange Radar'}
          </Text>
          <Text style={styles.proSub} numberOfLines={2}>
            Instant NSE Bulk Deals &amp; SEC Form 13F-HR pushes via Supabase Realtime (₹0 Free)
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.proButton,
            alertsEnabled && { backgroundColor: colors.primary },
          ]}
          activeOpacity={0.8}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const next = !alertsEnabled;
            setAlertsEnabled(next);
            Alert.alert(
              next ? '24/7 Whale Radar Enabled' : 'Live Alert Banner Hidden',
              next
                ? 'Subscribed to live NSE Bulk/Block Deals, Insider filings & US SEC Form 13F-HR pushes via Supabase Realtime (100% Free).'
                : 'Live exchange alert banner hidden for now. Tap "Turn On" anytime to restore real-time alerts.'
            );
          }}
        >
          <Text style={[styles.proButtonText, alertsEnabled && { color: '#FFFFFF' }]}>
            {alertsEnabled ? 'Live On' : 'Turn On'}
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Clone Whale Portfolio Modal */}
      {cloningWhale && (
        <CloneWhaleModal
          visible={!!cloningWhale}
          whale={cloningWhale}
          onClose={() => setCloningWhale(null)}
        />
      )}

      {/* Complete Holdings & Startups Research Breakdown Modal */}
      {viewingBreakdownWhale && (
        <WhaleBreakdownModal
          visible={!!viewingBreakdownWhale}
          whale={viewingBreakdownWhale}
          onWatchlistChange={setSavedWatchlist}
          onClose={() => setViewingBreakdownWhale(null)}
        />
      )}

      {/* Official NSE Stock Price, OHLC & 1Y Chart Modal */}
      {selectedNseStock && (
        <StockDetailModal
          visible={!!selectedNseStock}
          stock={selectedNseStock}
          whalesList={whalesList}
          onWatchlistChange={setSavedWatchlist}
          onClose={() => setSelectedNseStock(null)}
        />
      )}

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
  emptySearchBox: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emptySearchTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginTop: 10,
  },
  emptySearchSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  resetFilterBtn: {
    marginTop: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  resetFilterBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  proCta: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  proTextCol: {
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
  },
  proTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.2,
  },
  proSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 15,
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
    flex: 1,
    marginRight: 8,
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
  nseDirectorySection: {
    marginTop: 4,
    gap: 8,
  },
  nseDirBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1527',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.28)',
    marginBottom: 4,
  },
  nseDirTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  nseDirSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  fullTerminalBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  fullTerminalBtnText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
  },
  viewAllStocksFooterBtn: {
    backgroundColor: '#0D1527',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    marginTop: 6,
  },
  viewAllStocksFooterText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  nseInlineBlock: {
    gap: 8,
    marginBottom: 6,
  },
  nseInlineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  nseInlineHeader: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  nseInlineMoreLink: {
    color: '#60A5FA',
    fontSize: 11.5,
    fontWeight: '700',
  },
  nseInlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1527',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.22)',
  },
  nseSymRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  nseSymText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  nseSeriesPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  nseSeriesText: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '800',
  },
  nseEodBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  nseEodBadgeText: {
    color: '#10B981',
    fontSize: 8.5,
    fontWeight: '800',
  },
  nseCompanyText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '500',
  },
  nseMetaText: {
    color: '#64748B',
    fontSize: 10.5,
    marginTop: 2,
    fontWeight: '600',
  },
  nsePriceText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '900',
  },
  nsePctBadge: {
    marginTop: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nsePctText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cShareIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  whaleShareBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  watchlistSection: {
    gap: 10,
    marginTop: 4,
  },
  watchlistHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1527',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.28)',
  },
  watchlistTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  watchlistTagText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  watchlistHeroTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  watchlistHeroSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 3,
    lineHeight: 15,
  },
  watchlistCountBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  watchlistCountNum: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '900',
  },
  watchlistCountLbl: {
    color: '#94A3B8',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  wlCard: {
    backgroundColor: '#0D1527',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  wlTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  wlBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 5,
  },
  wlSymBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  wlSymText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  wlStagePill: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  wlStageText: {
    color: '#60A5FA',
    fontSize: 9.5,
    fontWeight: '800',
  },
  wlWhalePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  wlWhaleText: {
    color: '#10B981',
    fontSize: 9.5,
    fontWeight: '800',
  },
  wlName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  wlMeta: {
    color: '#64748B',
    fontSize: 10.5,
    marginTop: 2,
  },
  wlPrice: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  wlPctBadge: {
    marginTop: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  wlPctText: {
    fontSize: 11,
    fontWeight: '800',
  },
  wlChangeSub: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  wlActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  wlPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  wlPrimaryBtnText: {
    color: '#10B981',
    fontSize: 11.5,
    fontWeight: '800',
  },
  wlIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#141E30',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wlRemoveBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  wlEmptyActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
});
