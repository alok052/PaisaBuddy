import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AppHeader from '../components/AppHeader';
import StockDetailModal from '../components/StockDetailModal';
import { colors } from '../theme/colors';
import {
  fetchNseStocksIndex,
  fetchLiveWhales,
  searchAndFilterNseStocks,
  formatInrPrice,
  formatIndianVolume,
} from '../services/dataService';

const FILTERS = [
  { id: 'TOP', label: '🔥 Most Active' },
  { id: 'GAINERS', label: '🟢 Top Gainers' },
  { id: 'LOSERS', label: '🔴 Top Losers' },
  { id: 'ETF', label: '📊 ETFs' },
  { id: 'SME', label: '🚀 NSE SME' },
];

export default function StocksScreen({ onOpenMenu, initialQuery = '' }) {
  const [stocks, setStocks] = useState([]);
  const [whalesList, setWhalesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedFilter, setSelectedFilter] = useState('TOP');
  const [selectedStock, setSelectedStock] = useState(null);

  const loadStocks = useCallback(async (force = false) => {
    try {
      const [nseData, whalesData] = await Promise.all([
        fetchNseStocksIndex({ forceRefresh: force }),
        fetchLiveWhales(),
      ]);
      if (Array.isArray(nseData)) setStocks(nseData);
      if (Array.isArray(whalesData)) setWhalesList(whalesData);
    } catch (err) {
      console.log('Error loading NSE stocks directory:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStocks(false);
  }, [loadStocks]);

  useEffect(() => {
    if (initialQuery) setSearchQuery(initialQuery);
  }, [initialQuery]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await loadStocks(true);
    setRefreshing(false);
  }, [loadStocks]);

  const displayedStocks = useMemo(
    () => searchAndFilterNseStocks(stocks, searchQuery, selectedFilter, searchQuery.trim() ? 120 : 100),
    [stocks, searchQuery, selectedFilter]
  );

  const latestDate = useMemo(() => {
    const firstWithDate = stocks.find((s) => s.lastTradeDate);
    return firstWithDate?.lastTradeDate || 'Latest EOD';
  }, [stocks]);

  const isSeedMode = useMemo(() => Boolean(stocks[0]?.isSeedFallback), [stocks]);

  const renderStockItem = useCallback(({ item }) => {
    const isPos = (item.dayChangePct ?? 0) >= 0;
    const pctColor = isPos ? '#10B981' : '#EF4444';
    const hasPrice = item.closePrice !== null && item.closePrice > 0;

    return (
      <TouchableOpacity
        style={styles.stockCard}
        activeOpacity={0.78}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedStock(item);
        }}
      >
        <View style={styles.cardLeft}>
          <View style={styles.symRow}>
            <Text style={styles.symText}>{item.symbol}</Text>
            <View style={styles.seriesBadge}>
              <Text style={styles.seriesText}>{item.series || 'EQ'}</Text>
            </View>
          </View>
          <Text style={styles.companyName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.metaLine} numberOfLines={1}>
            Vol {formatIndianVolume(item.volume)}
            {item.deliveryPct !== null && item.deliveryPct !== undefined
              ? ` • Deliv ${item.deliveryPct}%`
              : ''}
            {item.change1yPct !== null && item.change1yPct !== undefined
              ? ` • 1Y ${item.change1yPct >= 0 ? '+' : ''}${item.change1yPct}%`
              : ''}
          </Text>
        </View>

        <View style={styles.cardRight}>
          <Text style={styles.priceText}>
            {hasPrice ? formatInrPrice(item.closePrice) : 'Unquoted'}
          </Text>
          {hasPrice ? (
            <View
              style={[
                styles.pctPill,
                {
                  backgroundColor: isPos
                    ? 'rgba(16, 185, 129, 0.14)'
                    : 'rgba(239, 68, 68, 0.14)',
                },
              ]}
            >
              <Text style={[styles.pctText, { color: pctColor }]}>
                {isPos ? '+' : ''}
                {(item.dayChangePct ?? 0).toFixed(2)}%
              </Text>
            </View>
          ) : (
            <Text style={styles.inactiveSub}>No Recent Trade</Text>
          )}
        </View>

        <Ionicons name="chevron-forward" size={16} color="#475569" style={{ marginLeft: 6 }} />
      </TouchableOpacity>
    );
  }, []);

  const ListHeader = (
    <View>
      <AppHeader
        subtitle={`All ${stocks.length > 0 ? stocks.length.toLocaleString('en-IN') : '3,500+'} NSE Equities`}
        onMenuPress={onOpenMenu}
      />

      {/* Info Status Banner */}
      <View style={styles.infoBanner}>
        <View style={styles.infoBannerLeft}>
          <View style={styles.infoIconCircle}>
            <Ionicons name="stats-chart" size={16} color="#10B981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Official NSE All-Companies Terminal</Text>
            <Text style={styles.infoSub}>
              {stocks.length.toLocaleString('en-IN')} securities • EOD Date {latestDate}
              {isSeedMode ? ' (Local Snapshot)' : ' (Live DB)'}
            </Text>
          </View>
        </View>
        <View style={styles.safeBadge}>
          <Text style={styles.safeBadgeText}>NSE EOD</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={17} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search any NSE share (e.g. Reliance, Zomato, Tata, HDFC)..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Pills */}
      {!searchQuery.trim() ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {FILTERS.map((f) => {
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
      ) : (
        <Text style={styles.searchResultCount}>
          Found {displayedStocks.length} matching{' '}
          {displayedStocks.length === 1 ? 'company' : 'companies'} for "{searchQuery.trim()}"
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {loading && stocks.length === 0 ? (
        <View style={styles.loadingState}>
          <AppHeader subtitle="Loading All NSE Securities..." onMenuPress={onOpenMenu} />
          <View style={styles.loaderCenter}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loaderText}>Indexing 3,500+ NSE Listed Companies...</Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={displayedStocks}
          keyExtractor={(item) => item.symbol}
          renderItem={renderStockItem}
          ListHeaderComponent={ListHeader}
          showsVerticalScrollIndicator={false}
          initialNumToRender={16}
          maxToRenderPerBatch={20}
          windowSize={7}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary, colors.accentBlue]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="search-outline" size={28} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Matching NSE Company Found</Text>
              <Text style={styles.emptySub}>
                Try searching by NSE ticker (e.g. RELIANCE, ETERNAL, SBIN) or full company name.
              </Text>
              {searchQuery.length > 0 && (
                <TouchableOpacity style={styles.clearBtn} onPress={() => setSearchQuery('')}>
                  <Text style={styles.clearBtnText}>Reset Search</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {selectedStock && (
        <StockDetailModal
          visible={!!selectedStock}
          stock={selectedStock}
          whalesList={whalesList}
          onClose={() => setSelectedStock(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
  },
  loadingState: {
    flex: 1,
  },
  loaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
    gap: 12,
  },
  loaderText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 120,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0D1527',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginBottom: 10,
  },
  infoBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  infoIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  infoTitle: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  infoSub: {
    color: '#94A3B8',
    fontSize: 10.5,
    marginTop: 1,
    fontWeight: '500',
  },
  safeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  safeBadgeText: {
    color: '#10B981',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E1624',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    paddingVertical: 0,
  },
  filterScroll: {
    marginBottom: 12,
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  filterChip: {
    paddingHorizontal: 13,
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
    fontSize: 12.5,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  searchResultCount: {
    color: '#94A3B8',
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  stockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D111A',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  cardLeft: {
    flex: 1,
    marginRight: 10,
  },
  symRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  symText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  seriesBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  seriesText: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '800',
  },
  companyName: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '500',
  },
  metaLine: {
    color: '#64748B',
    fontSize: 10.5,
    marginTop: 3,
    fontWeight: '600',
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  priceText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '900',
  },
  pctPill: {
    marginTop: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  pctText: {
    fontSize: 11,
    fontWeight: '800',
  },
  inactiveSub: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 4,
  },
  emptyBox: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginTop: 10,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
  emptySub: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  clearBtn: {
    marginTop: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  clearBtnText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
  },
});
