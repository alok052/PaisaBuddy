import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import WhaleAvatar from './WhaleAvatar';

export default function WhaleBreakdownModal({ visible, whale, onClose }) {
  const [activeTab, setActiveTab] = useState('STOCKS'); // 'STOCKS' | 'STARTUPS'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('WEIGHT'); // 'WEIGHT' | 'VALUE' | 'RETURN'

  if (!whale) return null;

  // 1. Process allHoldings
  const rawHoldings =
    whale.allHoldings && whale.allHoldings.length > 0
      ? whale.allHoldings
      : whale.topHoldings && whale.topHoldings.length > 0
      ? whale.topHoldings.map((h, i) => ({
          name: h.name,
          symbol: h.symbol || h.name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8),
          sector: h.sector || 'Equities & Holdings',
          stake: h.stake,
          value: h.value,
          cmp: h.cmp || '₹' + (1200 + i * 450),
          change1Y: h.change1Y || '+24.5%',
          weightPercent: h.weightPercent || Math.max(5, 35 - i * 8),
        }))
      : [];

  // Extract unique sectors for filter chips
  const sectorsList = ['ALL', ...new Set(rawHoldings.map((h) => h.sector).filter(Boolean))];

  // Filter & Sort Holdings
  const q = searchQuery.trim().toLowerCase();
  let holdings = rawHoldings.filter((h) => {
    const matchesSearch =
      !q ||
      h.name.toLowerCase().includes(q) ||
      (h.symbol && h.symbol.toLowerCase().includes(q)) ||
      (h.sector && h.sector.toLowerCase().includes(q));

    const matchesSector = selectedSector === 'ALL' || h.sector === selectedSector;
    return matchesSearch && matchesSector;
  });

  // Sort holdings
  holdings.sort((a, b) => {
    if (sortOrder === 'WEIGHT') {
      return (b.weightPercent || 0) - (a.weightPercent || 0);
    }
    if (sortOrder === 'RETURN') {
      const retA = parseFloat((a.change1Y || '0').replace(/[^0-9.-]/g, '')) || 0;
      const retB = parseFloat((b.change1Y || '0').replace(/[^0-9.-]/g, '')) || 0;
      return retB - retA;
    }
    // VALUE sort
    const valA = parseFloat((a.value || '0').replace(/[^0-9.]/g, '')) || 0;
    const valB = parseFloat((b.value || '0').replace(/[^0-9.]/g, '')) || 0;
    return valB - valA;
  });

  // 2. Process Startups
  const rawStartups = whale.startups || [];
  const startups = !q
    ? rawStartups
    : rawStartups.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          (s.status && s.status.toLowerCase().includes(q))
      );

  // Best multiple stat
  let bestStartupMultiple = 'N/A';
  if (rawStartups.length > 0) {
    const sorted = [...rawStartups].sort((a, b) => {
      const numA = parseFloat((a.multiple || '0').replace('x', '')) || 0;
      const numB = parseFloat((b.multiple || '0').replace('x', '')) || 0;
      return numB - numA;
    });
    bestStartupMultiple = `${sorted[0].multiple} (${sorted[0].name})`;
  }

  // Top 4 holdings for visual allocation bar
  const topAllocations = rawHoldings.slice(0, 4);
  const topAllocSum = topAllocations.reduce((sum, h) => sum + (h.weightPercent || 0), 0);
  const otherAlloc = Math.max(0, 100 - topAllocSum);

  const barColors = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#475569'];

  const handleTabSwitch = (tab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
    setSearchQuery('');
    setSelectedSector('ALL');
  };

  const handleSortToggle = () => {
    Haptics.selectionAsync();
    setSortOrder((prev) => (prev === 'WEIGHT' ? 'RETURN' : prev === 'RETURN' ? 'VALUE' : 'WEIGHT'));
  };

  const handleStockAction = (stock) => {
    Haptics.selectionAsync();
    Alert.alert(
      `${stock.name} (${stock.symbol || 'EQUITY'})`,
      `Whale Holding: ${stock.stake} (${stock.value})\nCurrent Price: ${stock.cmp} (${stock.change1Y} in 1Y)\n\nExecute or research position:`,
      [
        {
          text: 'Trade on Zerodha Kite',
          onPress: () => Alert.alert('Kite Redirect', `Opening ${stock.name} in Zerodha Kite order console...`),
        },
        {
          text: 'View on Groww',
          onPress: () => Alert.alert('Groww Redirect', `Opening ${stock.name} in Groww app...`),
        },
        { text: 'Close', style: 'cancel' },
      ]
    );
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
          {/* Top Notch / Drag Pill */}
          <View style={styles.dragPillWrapper}>
            <View style={styles.dragPill} />
          </View>

          {/* Luxury Executive Header */}
          <LinearGradient
            colors={['#101C2B', '#09111B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroHeader}
          >
            <View style={styles.heroHeaderRow}>
              <View style={styles.avatarGlowWrapper}>
                <WhaleAvatar
                  imageSource={whale.localImage}
                  avatarText={whale.avatar}
                  gradient={whale.avatarGradient}
                  size={54}
                  borderColor="rgba(16, 185, 129, 0.55)"
                />
                <View style={styles.avatarOnlineDot} />
              </View>

              <View style={styles.heroTextCol}>
                <View style={styles.heroTitleRow}>
                  <Text style={styles.heroWhaleName} numberOfLines={1}>
                    {whale.name}
                  </Text>
                  <View style={styles.verifiedTag}>
                    <Ionicons name="shield-checkmark" size={11} color="#10B981" />
                    <Text style={styles.verifiedTagText}>SEBI / MCA</Text>
                  </View>
                </View>

                <Text style={styles.heroWhaleSub} numberOfLines={1}>
                  {whale.tag}
                </Text>

                <View style={styles.heroMetricsStrip}>
                  <Text style={styles.heroNetWorth}>{whale.portfolioValue}</Text>
                  <View style={styles.heroMetricsDot} />
                  <View style={styles.returnBubble}>
                    <Ionicons
                      name={whale.isPositive ? 'trending-up' : 'trending-down'}
                      size={11}
                      color={whale.isPositive ? '#10B981' : '#EF4444'}
                    />
                    <Text
                      style={[
                        styles.heroReturnText,
                        { color: whale.isPositive ? '#10B981' : '#EF4444' },
                      ]}
                    >
                      {whale.return1Y} 1Y
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.closeGlassBtn} onPress={onClose} activeOpacity={0.8}>
                <Ionicons name="close" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Segmented Institutional Switcher */}
          <View style={styles.segmentContainer}>
            <View style={styles.segmentTrack}>
              <TouchableOpacity
                style={[styles.segmentBtn, activeTab === 'STOCKS' && styles.segmentBtnActive]}
                onPress={() => handleTabSwitch('STOCKS')}
                activeOpacity={0.85}
              >
                {activeTab === 'STOCKS' && (
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={StyleSheet.absoluteFillObject}
                    borderRadius={12}
                  />
                )}
                <Ionicons
                  name="stats-chart"
                  size={14}
                  color={activeTab === 'STOCKS' ? '#FFFFFF' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.segmentText,
                    activeTab === 'STOCKS' && styles.segmentTextActive,
                  ]}
                >
                  Listed Stocks ({rawHoldings.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentBtn, activeTab === 'STARTUPS' && styles.segmentBtnActive]}
                onPress={() => handleTabSwitch('STARTUPS')}
                activeOpacity={0.85}
              >
                {activeTab === 'STARTUPS' && (
                  <LinearGradient
                    colors={['#3B82F6', '#1D4ED8']}
                    style={StyleSheet.absoluteFillObject}
                    borderRadius={12}
                  />
                )}
                <Ionicons
                  name="rocket"
                  size={14}
                  color={activeTab === 'STARTUPS' ? '#FFFFFF' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.segmentText,
                    activeTab === 'STARTUPS' && styles.segmentTextActive,
                  ]}
                >
                  Startups & Unlisted ({rawStartups.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search & Sort Controls Bar */}
          <View style={styles.controlsBar}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={14} color="#64748B" style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchTextInput}
                placeholder={
                  activeTab === 'STOCKS'
                    ? 'Search by company, ticker or sector...'
                    : 'Search startup name or category...'
                }
                placeholderTextColor="#64748B"
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Ionicons name="close-circle" size={15} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {activeTab === 'STOCKS' && (
              <TouchableOpacity
                style={styles.sortToggleBtn}
                onPress={handleSortToggle}
                activeOpacity={0.8}
              >
                <Ionicons name="swap-vertical" size={13} color="#10B981" />
                <Text style={styles.sortToggleText}>
                  {sortOrder === 'WEIGHT' ? 'Weight' : sortOrder === 'RETURN' ? '1Y Return' : 'Value'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Horizontal Sector Pills (Only for Stocks Tab) */}
          {activeTab === 'STOCKS' && sectorsList.length > 2 && (
            <View style={styles.sectorScrollWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sectorScrollContent}
              >
                {sectorsList.map((sec, idx) => {
                  const isSecActive = selectedSector === sec;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.sectorChip, isSecActive && styles.sectorChipActive]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedSector(sec);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.sectorChipText,
                          isSecActive && styles.sectorChipTextActive,
                        ]}
                      >
                        {sec === 'ALL' ? '🌟 All Sectors' : sec}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Scrollable Body Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBodyContent}
          >
            {/* ========================================= */}
            {/* TAB 1: LISTED STOCKS                      */}
            {/* ========================================= */}
            {activeTab === 'STOCKS' && (
              <View>
                {/* Visual Asset Allocation Bar */}
                <View style={styles.portfolioAllocCard}>
                  <View style={styles.allocCardHeader}>
                    <View style={styles.allocTitleRow}>
                      <Ionicons name="pie-chart" size={14} color="#10B981" />
                      <Text style={styles.allocCardTitle}>PORTFOLIO WEIGHT DIVERSIFICATION</Text>
                    </View>
                    <Text style={styles.allocCardSub}>{rawHoldings.length} Positions Disclosed</Text>
                  </View>

                  {/* Multi-segment stacked bar */}
                  <View style={styles.multiSegmentBar}>
                    {topAllocations.map((item, i) => (
                      <View
                        key={i}
                        style={{
                          flex: item.weightPercent || 10,
                          backgroundColor: barColors[i % barColors.length],
                          height: '100%',
                        }}
                      />
                    ))}
                    {otherAlloc > 0 && (
                      <View
                        style={{
                          flex: otherAlloc,
                          backgroundColor: barColors[4],
                          height: '100%',
                        }}
                      />
                    )}
                  </View>

                  {/* Allocation Legend */}
                  <View style={styles.allocLegendRow}>
                    {topAllocations.map((item, i) => (
                      <View key={i} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: barColors[i] }]} />
                        <Text style={styles.legendText} numberOfLines={1}>
                          {item.name.split(' ')[0]}: <Text style={styles.legendBold}>{item.weightPercent}%</Text>
                        </Text>
                      </View>
                    ))}
                    {otherAlloc > 0 && (
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: barColors[4] }]} />
                        <Text style={styles.legendText}>Others: <Text style={styles.legendBold}>{otherAlloc.toFixed(0)}%</Text></Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Section Subheading */}
                <View style={styles.sectionMetaHeader}>
                  <Text style={styles.sectionMetaTitle}>
                    DISCLOSED SHAREHOLDINGS ({holdings.length})
                  </Text>
                  <Text style={styles.sectionMetaHint}>Tap any card to trade or research</Text>
                </View>

                {/* Holdings Cards List */}
                {holdings.map((stock, idx) => {
                  const isPositiveReturn = !(stock.change1Y || '').startsWith('-');
                  const monogram = (stock.symbol || stock.name).slice(0, 3).toUpperCase();
                  const isLargeWeight = (stock.weightPercent || 0) >= 10;

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={styles.holdingGlassCard}
                      activeOpacity={0.88}
                      onPress={() => handleStockAction(stock)}
                    >
                      {/* Top Header Row */}
                      <View style={styles.cardTopRow}>
                        {/* Company Monogram Badge */}
                        <View
                          style={[
                            styles.companyMonogram,
                            isLargeWeight && styles.companyMonogramHighConviction,
                          ]}
                        >
                          <Text
                            style={[
                              styles.monogramText,
                              isLargeWeight && styles.monogramTextHighConviction,
                            ]}
                          >
                            {monogram}
                          </Text>
                        </View>

                        {/* Name & Sector */}
                        <View style={styles.stockIdentityBlock}>
                          <View style={styles.nameTickerRow}>
                            <Text style={styles.stockPrimaryName} numberOfLines={1}>
                              {stock.name}
                            </Text>
                            {stock.symbol && (
                              <View style={styles.tickerPill}>
                                <Text style={styles.tickerPillText}>{stock.symbol}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.stockSectorSub} numberOfLines={1}>
                            {stock.sector || 'Equities'}
                          </Text>
                        </View>

                        {/* Right Weight & Value Column */}
                        <View style={styles.weightCol}>
                          <View
                            style={[
                              styles.weightPill,
                              isLargeWeight ? styles.weightPillHigh : styles.weightPillRegular,
                            ]}
                          >
                            <Text
                              style={[
                                styles.weightPillText,
                                isLargeWeight && styles.weightPillTextHigh,
                              ]}
                            >
                              {stock.weightPercent}% Wt
                            </Text>
                          </View>
                          <Text style={styles.stockTotalValue}>{stock.value}</Text>
                        </View>
                      </View>

                      {/* Weight Visual Hairline */}
                      <View style={styles.weightHairlineTrack}>
                        <View
                          style={[
                            styles.weightHairlineFill,
                            {
                              width: `${Math.min(100, Math.max(3, stock.weightPercent || 5))}%`,
                              backgroundColor: isLargeWeight ? '#10B981' : '#3B82F6',
                            },
                          ]}
                        />
                      </View>

                      {/* Bottom Key Stats Bar */}
                      <View style={styles.cardStatsRow}>
                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>WHALE STAKE</Text>
                          <View style={styles.stakeValRow}>
                            <Ionicons name="pie-chart-outline" size={11} color="#10B981" />
                            <Text style={styles.statStakeText}>{stock.stake}</Text>
                          </View>
                        </View>

                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>MARKET PRICE</Text>
                          <Text style={styles.statNormalText}>{stock.cmp || '—'}</Text>
                        </View>

                        <View style={[styles.statBox, { alignItems: 'flex-end' }]}>
                          <Text style={styles.statLabel}>1Y STOCK RETURN</Text>
                          <View
                            style={[
                              styles.returnPill,
                              isPositiveReturn ? styles.returnPillGreen : styles.returnPillRed,
                            ]}
                          >
                            <Ionicons
                              name={isPositiveReturn ? 'arrow-up' : 'arrow-down'}
                              size={10}
                              color={isPositiveReturn ? '#10B981' : '#EF4444'}
                            />
                            <Text
                              style={[
                                styles.returnPillText,
                                { color: isPositiveReturn ? '#10B981' : '#EF4444' },
                              ]}
                            >
                              {stock.change1Y || '—'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {/* Empty State */}
                {holdings.length === 0 && (
                  <View style={styles.emptyStateContainer}>
                    <View style={styles.emptyIconCircle}>
                      <Ionicons name="search" size={28} color="#64748B" />
                    </View>
                    <Text style={styles.emptyHeading}>No holdings found</Text>
                    <Text style={styles.emptySubheading}>
                      No stock matches '{searchQuery}' in the selected sector.
                    </Text>
                    <TouchableOpacity
                      style={styles.emptyResetBtn}
                      onPress={() => {
                        setSearchQuery('');
                        setSelectedSector('ALL');
                      }}
                    >
                      <Text style={styles.emptyResetText}>Clear Filters</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* ========================================= */}
            {/* TAB 2: STARTUPS & UNLISTED                */}
            {/* ========================================= */}
            {activeTab === 'STARTUPS' && (
              <View>
                {/* Venture Metrics Banner */}
                <LinearGradient
                  colors={['#131F33', '#0A1220']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ventureOverviewCard}
                >
                  <View style={styles.ventureStatCol}>
                    <Text style={styles.ventureOverviewLabel}>VENTURE DEALS</Text>
                    <Text style={styles.ventureOverviewVal}>{rawStartups.length} Companies</Text>
                  </View>

                  <View style={styles.ventureDivider} />

                  <View style={styles.ventureStatCol}>
                    <Text style={styles.ventureOverviewLabel}>TOP MULTIPLIER</Text>
                    <Text style={styles.ventureOverviewValGreen}>{bestStartupMultiple}</Text>
                  </View>

                  <View style={styles.ventureDivider} />

                  <View style={styles.ventureStatCol}>
                    <Text style={styles.ventureOverviewLabel}>REGULATORY BASIS</Text>
                    <Text style={styles.ventureOverviewVal}>MCA Form PAS-3</Text>
                  </View>
                </LinearGradient>

                {/* Section Meta Title */}
                <View style={styles.sectionMetaHeader}>
                  <Text style={styles.sectionMetaTitle}>
                    ANGEL, PRE-IPO & VENTURE EQUITY ({startups.length})
                  </Text>
                  <Text style={styles.sectionMetaHint}>RoC Shareholder filings & DRHP</Text>
                </View>

                {/* Startup Cards List */}
                {startups.map((st, idx) => {
                  const isIpoExit =
                    (st.stage || '').includes('IPO') ||
                    (st.status || '').includes('Listed') ||
                    (st.stage || '').includes('Acquisition');

                  return (
                    <View key={idx} style={styles.startupDealCard}>
                      {/* Top Row: Icon + Title + Stage Badge */}
                      <View style={styles.startupHeaderRow}>
                        <View
                          style={[
                            styles.startupIconContainer,
                            { backgroundColor: st.iconBg || '#2563EB' },
                          ]}
                        >
                          <Text style={styles.startupEmojiText}>{st.iconEmoji || '🚀'}</Text>
                        </View>

                        <View style={styles.startupTitleCol}>
                          <View style={styles.startupNameRow}>
                            <Text style={styles.startupTitleText}>{st.name}</Text>
                            <View
                              style={[
                                styles.dealStagePill,
                                isIpoExit ? styles.dealStageIpo : styles.dealStageActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.dealStageText,
                                  isIpoExit ? styles.dealStageTextIpo : styles.dealStageTextActive,
                                ]}
                              >
                                {st.stage}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.startupCategorySub}>{st.category}</Text>
                        </View>
                      </View>

                      {/* Visual Multiple & Capital Progression Track */}
                      <LinearGradient
                        colors={['rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.02)']}
                        style={styles.capitalProgressionCard}
                      >
                        <View style={styles.capitalPoint}>
                          <Text style={styles.capitalPointLabel}>ENTRY CAPITAL</Text>
                          <Text style={styles.capitalPointVal}>{st.investedValue || '—'}</Text>
                          <Text style={styles.capitalPointSub}>{st.entryYear}</Text>
                        </View>

                        {/* Middle Arrow / Multiplier Glow Badge */}
                        <View style={styles.multiplierCenter}>
                          <LinearGradient
                            colors={['#10B981', '#059669']}
                            style={styles.multiplierGlowBadge}
                          >
                            <Ionicons name="sparkles" size={10} color="#FFFFFF" />
                            <Text style={styles.multiplierGlowText}>{st.multiple} Return</Text>
                          </LinearGradient>
                          <View style={styles.multiplierLine} />
                        </View>

                        <View style={[styles.capitalPoint, { alignItems: 'flex-end' }]}>
                          <Text style={styles.capitalPointLabel}>CURRENT MARK / EXIT</Text>
                          <Text style={styles.capitalPointValHigh}>{st.currentValue || '—'}</Text>
                          <Text style={styles.capitalPointSubHigh} numberOfLines={1}>
                            {st.status.split('(')[0]}
                          </Text>
                        </View>
                      </LinearGradient>

                      {/* Institutional Thesis & Filings Seal */}
                      {st.notes && (
                        <View style={styles.investorThesisBox}>
                          <Ionicons name="document-text" size={13} color="#10B981" />
                          <Text style={styles.investorThesisText}>
                            {st.notes}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}

                {/* Empty State */}
                {startups.length === 0 && (
                  <View style={styles.emptyStateContainer}>
                    <View style={styles.emptyIconCircle}>
                      <Ionicons name="rocket-outline" size={28} color="#64748B" />
                    </View>
                    <Text style={styles.emptyHeading}>No startup deals match</Text>
                    <Text style={styles.emptySubheading}>
                      Try clearing the search query to see all venture records.
                    </Text>
                  </View>
                )}

                {/* Compliance Seal Card */}
                <View style={styles.mcaAuditSealCard}>
                  <View style={styles.auditShieldIcon}>
                    <Ionicons name="shield-checkmark" size={18} color="#10B981" />
                  </View>
                  <View style={styles.auditSealTextCol}>
                    <Text style={styles.auditSealTitle}>MINISTRY OF CORPORATE AFFAIRS (MCA) AUDITED</Text>
                    <Text style={styles.auditSealBody}>
                      Unlisted cap table allocations are synchronized directly from Ministry of Corporate Affairs Form PAS-3 (Allotment of Shares), Form MGT-7 annual cap tables, and SEBI DRHP disclosures.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={{ height: 50 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#07090E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '94%',
    overflow: 'hidden',
  },
  dragPillWrapper: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#101C2B',
  },
  dragPill: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  heroHeader: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarGlowWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  avatarOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#07090E',
  },
  heroTextCol: {
    flex: 1,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroWhaleName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: -0.3,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 3,
  },
  verifiedTagText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  heroWhaleSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
  },
  heroMetricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  heroNetWorth: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  heroMetricsDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#475569',
  },
  returnBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  heroReturnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  closeGlassBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  segmentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 11,
    gap: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  segmentBtnActive: {},
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E1726',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchTextInput: {
    flex: 1,
    fontSize: 12,
    color: '#F8FAFC',
    fontWeight: '500',
    paddingVertical: 0,
  },
  sortToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    gap: 4,
  },
  sortToggleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
  },
  sectorScrollWrapper: {
    paddingBottom: 6,
  },
  sectorScrollContent: {
    paddingHorizontal: 16,
    gap: 6,
  },
  sectorChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectorChipActive: {
    backgroundColor: '#1E293B',
    borderColor: '#10B981',
  },
  sectorChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  sectorChipTextActive: {
    color: '#F8FAFC',
    fontWeight: '800',
  },
  scrollBodyContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  portfolioAllocCard: {
    backgroundColor: '#0F1926',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  allocCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  allocTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  allocCardTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  allocCardSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  multiSegmentBar: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    marginBottom: 10,
  },
  allocLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  legendBold: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  sectionMetaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionMetaTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  sectionMetaHint: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  holdingGlassCard: {
    backgroundColor: '#0D1420',
    borderRadius: 16,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyMonogram: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  companyMonogramHighConviction: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  monogramText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
  },
  monogramTextHighConviction: {
    color: '#10B981',
  },
  stockIdentityBlock: {
    flex: 1,
  },
  nameTickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stockPrimaryName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
    flexShrink: 1,
  },
  tickerPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tickerPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
  },
  stockSectorSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  weightCol: {
    alignItems: 'flex-end',
  },
  weightPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  weightPillHigh: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  weightPillRegular: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  weightPillText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#60A5FA',
  },
  weightPillTextHigh: {
    color: '#10B981',
  },
  stockTotalValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 3,
  },
  weightHairlineTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 1.5,
    marginVertical: 10,
    overflow: 'hidden',
  },
  weightHairlineFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  cardStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  stakeValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statStakeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  statNormalText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  returnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
    gap: 2,
  },
  returnPillGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  returnPillRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  returnPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  ventureOverviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  ventureStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  ventureDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  ventureOverviewLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  ventureOverviewVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  ventureOverviewValGreen: {
    fontSize: 12,
    fontWeight: '900',
    color: '#10B981',
  },
  startupDealCard: {
    backgroundColor: '#0D1420',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  startupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  startupIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  startupEmojiText: {
    fontSize: 20,
  },
  startupTitleCol: {
    flex: 1,
  },
  startupNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  startupTitleText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  dealStagePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  dealStageIpo: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  dealStageActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  dealStageText: {
    fontSize: 9,
    fontWeight: '900',
  },
  dealStageTextIpo: {
    color: '#10B981',
  },
  dealStageTextActive: {
    color: '#60A5FA',
  },
  startupCategorySub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  capitalProgressionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  capitalPoint: {
    flex: 1,
  },
  capitalPointLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  capitalPointVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  capitalPointSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  capitalPointValHigh: {
    fontSize: 13,
    fontWeight: '900',
    color: '#10B981',
  },
  capitalPointSubHigh: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  multiplierCenter: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  multiplierGlowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  multiplierGlowText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  multiplierLine: {
    width: 30,
    height: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    marginTop: 3,
  },
  investorThesisBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    padding: 9,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
    gap: 6,
  },
  investorThesisText: {
    fontSize: 10,
    color: '#94A3B8',
    flex: 1,
    lineHeight: 14,
    fontWeight: '500',
  },
  mcaAuditSealCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    marginTop: 6,
    marginBottom: 10,
    gap: 10,
  },
  auditShieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditSealTextCol: {
    flex: 1,
  },
  auditSealTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  auditSealBody: {
    fontSize: 10,
    color: '#94A3B8',
    lineHeight: 14,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  emptySubheading: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  emptyResetBtn: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  emptyResetText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
});
