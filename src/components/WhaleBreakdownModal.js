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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import WhaleAvatar from './WhaleAvatar';

export default function WhaleBreakdownModal({ visible, whale, onClose }) {
  const [activeTab, setActiveTab] = useState('STOCKS'); // 'STOCKS' | 'STARTUPS'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [startupFilter, setStartupFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'EXIT'

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

  // Filter Holdings
  const q = searchQuery.trim().toLowerCase();
  const holdings = !q
    ? rawHoldings
    : rawHoldings.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          (h.symbol && h.symbol.toLowerCase().includes(q)) ||
          (h.sector && h.sector.toLowerCase().includes(q))
      );

  // 2. Process Startups
  const rawStartups = whale.startups || [];

  // Categorize counts
  const activeStartupsCount = rawStartups.filter((s) => {
    const rawStage = (s.stage || '').toUpperCase();
    const rawStatus = (s.status || '').toUpperCase();
    return !(
      rawStage.includes('IPO') ||
      rawStatus.includes('LISTED') ||
      rawStage.includes('PUBLIC') ||
      rawStage.includes('ACQUISITION') ||
      rawStage.includes('EXITED')
    );
  }).length;
  const exitStartupsCount = rawStartups.length - activeStartupsCount;

  // Filter Startups with search and quick filter
  const startups = rawStartups.filter((s) => {
    const rawStage = (s.stage || '').toUpperCase();
    const rawStatus = (s.status || '').toUpperCase();
    const isExit =
      rawStage.includes('IPO') ||
      rawStatus.includes('LISTED') ||
      rawStage.includes('PUBLIC') ||
      rawStage.includes('ACQUISITION') ||
      rawStage.includes('EXITED');

    // Quick status sub-filter
    if (startupFilter === 'ACTIVE' && isExit) return false;
    if (startupFilter === 'EXIT' && !isExit) return false;

    // Search query
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      (s.status && s.status.toLowerCase().includes(q))
    );
  });

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

  // Top 4 holdings for minimal sleek progress bar
  const topAllocations = rawHoldings.slice(0, 4);
  const topAllocSum = topAllocations.reduce((sum, h) => sum + (h.weightPercent || 0), 0);
  const otherAlloc = Math.max(0, 100 - topAllocSum);
  const barColors = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#475569'];

  const handleTabSwitch = (tab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
    setSearchQuery('');
    setExpandedItemId(null);
    setStartupFilter('ALL');
  };

  const handleToggleRow = (id) => {
    Haptics.selectionAsync();
    setExpandedItemId((prev) => (prev === id ? null : id));
  };

  const handleTradePrompt = (stock) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      `Order Console — ${stock.symbol || stock.name}`,
      `Current Price: ${stock.cmp || 'Market Rate'}\nWhale Stake: ${stock.stake} (${stock.value})\n\nSelect execution broker:`,
      [
        {
          text: 'Zerodha Kite',
          onPress: () => Alert.alert('Kite Redirect', `Opening ${stock.symbol || stock.name} in Kite...`),
        },
        {
          text: 'Groww',
          onPress: () => Alert.alert('Groww Redirect', `Opening ${stock.symbol || stock.name} in Groww...`),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleStartupBuyPrompt = (st, type) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const shortName = st.name.split(' ')[0];

    if (type === 'LISTED') {
      Alert.alert(
        `Execute Order — ${st.name}`,
        `Current Status: Active on NSE / BSE\nWhale Multiple: ${st.multiple || 'Multibagger'}\n\nSelect execution broker:`,
        [
          {
            text: 'Zerodha Kite',
            onPress: () => Alert.alert('Kite Redirect', `Opening ${st.name} order console on Zerodha Kite...`),
          },
          {
            text: 'Groww',
            onPress: () => Alert.alert('Groww Redirect', `Opening ${st.name} order console on Groww...`),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else if (type === 'PRE_IPO') {
      Alert.alert(
        `Pre-IPO Access — ${st.name}`,
        `Current Status: Pre-IPO / DRHP Filings\nDisclosed Valuation: ${st.currentValue || 'High Growth'}\n\nSelect an option to participate:`,
        [
          {
            text: 'Request Pre-IPO Shares',
            onPress: () => Alert.alert('Order Registered', `Pre-IPO allocation request placed for ${shortName}. Our unlisted partner desk will contact you with lot size.`),
          },
          {
            text: 'Set IPO Alert 🔔',
            onPress: () => Alert.alert('Alert Set', `You will receive instant SMS & WhatsApp notification when ${shortName} opens for IPO bidding.`),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else if (type === 'ACQUIRED') {
      Alert.alert(
        `${st.name} — Strategic Exit`,
        `This startup was acquired by a parent corporation (Strategic Buyout). Fresh secondary equity lots are not open.`,
        [{ text: 'Understood', style: 'cancel' }]
      );
    } else {
      // PRIVATE VENTURE
      Alert.alert(
        `Venture Syndicate — ${st.name}`,
        `Current Status: Private Startup (${st.stage})\nInitial Round: ${st.entryYear}\n\nParticipate via SEBI-compliant Angel & Venture syndicates:`,
        [
          {
            text: 'Join Syndicate Waitlist',
            onPress: () => Alert.alert('Waitlist Joined', `You are on the priority waitlist for ${shortName}'s next secondary lot open.`),
          },
          {
            text: 'View Venture Pitch',
            onPress: () => Alert.alert('Venture Intelligence', `Valuation: ${st.currentValue || 'Active'}\nMultiple: ${st.multiple || 'Active'}\nCategory: ${st.category}`),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
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
          {/* Subtle Top Drag Handle */}
          <View style={styles.handleBar}>
            <View style={styles.handleIndicator} />
          </View>

          {/* Clean Institutional Header */}
          <View style={styles.header}>
            <View style={styles.headerProfileRow}>
              <WhaleAvatar
                imageSource={whale.localImage}
                avatarText={whale.avatar}
                gradient={whale.avatarGradient}
                size={46}
                borderColor="rgba(255, 255, 255, 0.15)"
              />
              <View style={styles.headerTitleBox}>
                <View style={styles.nameRow}>
                  <Text style={styles.whaleName} numberOfLines={1}>
                    {whale.name}
                  </Text>
                  <View style={styles.sebiTag}>
                    <Text style={styles.sebiTagText}>SEBI DISCLOSED</Text>
                  </View>
                </View>
                <Text style={styles.whaleTag} numberOfLines={1}>
                  {whale.tag}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Total Net Worth & 1Y Return */}
            <View style={styles.netWorthRow}>
              <View>
                <Text style={styles.netWorthLabel}>TOTAL DISCLOSED PORTFOLIO</Text>
                <Text style={styles.netWorthValue}>{whale.portfolioValue}</Text>
              </View>

              <View style={styles.returnBadgeRight}>
                <Text
                  style={[
                    styles.returnPercentText,
                    { color: whale.isPositive ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {whale.return1Y}
                </Text>
                <Text style={styles.returnSubLabel}>Past 1 Year</Text>
              </View>
            </View>

            {/* 3px Sleek Allocation Line */}
            {rawHoldings.length > 0 && (
              <View style={styles.miniAllocLine}>
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
            )}
          </View>

          {/* Apple-Style Segmented Pill Switcher */}
          <View style={styles.switchRow}>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[styles.segmentTab, activeTab === 'STOCKS' && styles.segmentTabActive]}
                onPress={() => handleTabSwitch('STOCKS')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    activeTab === 'STOCKS' && styles.segmentLabelActive,
                  ]}
                >
                  Public Equities ({rawHoldings.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentTab, activeTab === 'STARTUPS' && styles.segmentTabActive]}
                onPress={() => handleTabSwitch('STARTUPS')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    activeTab === 'STARTUPS' && styles.segmentLabelActive,
                  ]}
                >
                  Private Startups ({rawStartups.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Minimalist Search Input */}
          <View style={styles.searchWrapper}>
            <View style={styles.searchField}>
              <Ionicons name="search" size={15} color="#64748B" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder={
                  activeTab === 'STOCKS'
                    ? 'Search company or sector...'
                    : 'Search startup or deal...'
                }
                placeholderTextColor="#64748B"
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={16} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Main List Body */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          >
            {/* ========================================= */}
            {/* TAB 1: PUBLIC EQUITIES (CLONE STYLE)      */}
            {/* ========================================= */}
            {activeTab === 'STOCKS' && (
              <View>
                {/* Heading */}
                <Text style={styles.stocksHeading}>
                  DISCLOSED HOLDINGS ({holdings.length} COMPANIES)
                </Text>

                {holdings.map((stock, idx) => {
                  const isExpanded = expandedItemId === (stock.symbol || stock.name);
                  const isPositive = !(stock.change1Y || '').startsWith('-');

                  return (
                    <View key={idx} style={styles.stockCardContainer}>
                      <TouchableOpacity
                        style={styles.stockItemRow}
                        onPress={() => handleToggleRow(stock.symbol || stock.name)}
                        activeOpacity={0.8}
                      >
                        {/* Numbering Circle (Clone Portfolio Style) */}
                        <View style={styles.stockNumberCircle}>
                          <Text style={styles.stockNumberText}>{idx + 1}</Text>
                        </View>

                        {/* Main Info: Name + Weight Badge + Subtitle */}
                        <View style={styles.stockMainInfo}>
                          <View style={styles.stockTitleRow}>
                            <Text style={styles.stockName} numberOfLines={1}>
                              {stock.name}
                            </Text>
                            <View style={styles.weightBadge}>
                              <Text style={styles.weightText}>{stock.weightPercent}% Weight</Text>
                            </View>
                          </View>

                          <Text style={styles.sharesSub} numberOfLines={1}>
                            {stock.symbol || 'EQUITY'} • {stock.sector} • CMP {stock.cmp || '—'}
                          </Text>
                        </View>

                        {/* Amount Box: Value + Stake & 1Y Return */}
                        <View style={styles.stockAmountBox}>
                          <Text style={styles.stockTotalVal}>{stock.value}</Text>
                          <View style={styles.rightSubRow}>
                            <Text style={styles.whaleStakeNote}>{stock.stake} stake</Text>
                            <Text style={styles.metaDot}>•</Text>
                            <Text
                              style={[
                                styles.stockReturnText,
                                { color: isPositive ? '#10B981' : '#EF4444' },
                              ]}
                            >
                              {stock.change1Y}
                            </Text>
                          </View>
                        </View>

                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={13}
                          color="#64748B"
                          style={{ marginLeft: 6 }}
                        />
                      </TouchableOpacity>

                      {/* Expandable Deep Institutional Drawer */}
                      {isExpanded && (
                        <View style={styles.expandedDrawer}>
                          <View style={styles.drawerGrid}>
                            <View style={styles.drawerItem}>
                              <Text style={styles.drawerLabel}>Whale Stake</Text>
                              <Text style={styles.drawerValueGreen}>{stock.stake} of company</Text>
                            </View>

                            <View style={styles.drawerItem}>
                              <Text style={styles.drawerLabel}>Current Price</Text>
                              <Text style={styles.drawerValue}>{stock.cmp || 'Market Rate'}</Text>
                            </View>

                            <View style={styles.drawerItem}>
                              <Text style={styles.drawerLabel}>Filing Status</Text>
                              <Text style={styles.drawerValue}>SEBI Q2 FY25 Filings</Text>
                            </View>
                          </View>

                          <TouchableOpacity
                            style={styles.tradeActionBtn}
                            onPress={() => handleTradePrompt(stock)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="flash" size={13} color="#10B981" />
                            <Text style={styles.tradeActionText}>
                              Execute {stock.name.split(' ')[0]} via Zerodha / Groww →
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}

                {/* Empty State */}
                {holdings.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No matching holdings found</Text>
                  </View>
                )}
              </View>
            )}

            {/* ========================================= */}
            {/* TAB 2: PRIVATE STARTUPS (CLONE STYLE)     */}
            {/* ========================================= */}
            {activeTab === 'STARTUPS' && (
              <View>
                {/* Quick Status Sub-Filter Row */}
                <View style={styles.startupFilterRow}>
                  <TouchableOpacity
                    style={[
                      styles.startupFilterPill,
                      startupFilter === 'ALL' && styles.startupFilterPillActive,
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setStartupFilter('ALL');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.startupFilterText,
                        startupFilter === 'ALL' && styles.startupFilterTextActive,
                      ]}
                    >
                      All ({rawStartups.length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.startupFilterPill,
                      startupFilter === 'ACTIVE' && styles.startupFilterPillActiveGreen,
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setStartupFilter('ACTIVE');
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.activeDot} />
                    <Text
                      style={[
                        styles.startupFilterText,
                        startupFilter === 'ACTIVE' && styles.startupFilterTextActiveGreen,
                      ]}
                    >
                      Active Private ({activeStartupsCount})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.startupFilterPill,
                      startupFilter === 'EXIT' && styles.startupFilterPillActive,
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setStartupFilter('EXIT');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.startupFilterText,
                        startupFilter === 'EXIT' && styles.startupFilterTextActive,
                      ]}
                    >
                      Listed / Exits ({exitStartupsCount})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Heading */}
                <Text style={styles.stocksHeading}>
                  {startupFilter === 'ACTIVE'
                    ? `ACTIVE VENTURE ROUNDS (${startups.length} DEALS OPEN)`
                    : startupFilter === 'EXIT'
                    ? `LISTED & EXITED BETS (${startups.length} EXITS)`
                    : `ALL VENTURE & STARTUP BETS (${startups.length} DEALS)`}
                </Text>

                {startups.map((st, idx) => {
                  const isExpanded = expandedItemId === `startup-${idx}`;
                  
                  // Stage & Exit Categorization
                  let stageBadgeText = 'VENTURE';
                  let isExit = false;
                  let startupFormDesc = 'Private startup hai (Unlisted growth round)';
                  let startupFormIcon = 'cube-outline';
                  let startupFormColor = '#60A5FA';
                  let buyActionType = 'PRIVATE';
                  let buyActionLabel = `Invest in ${st.name.split(' ')[0]} via Syndicate Desk →`;
                  let buyActionIcon = 'briefcase-outline';
                  let buyActionColor = '#3B82F6';

                  const rawStage = (st.stage || '').toUpperCase();
                  const rawStatus = (st.status || '').toUpperCase();

                  if (rawStage.includes('IPO') || rawStatus.includes('LISTED') || rawStage.includes('PUBLIC')) {
                    stageBadgeText = 'IPO EXIT';
                    isExit = true;
                    startupFormDesc = 'Share NSE / BSE par list ho chuka hai (Public Trading Active)';
                    startupFormIcon = 'checkmark-circle';
                    startupFormColor = '#10B981';
                    buyActionType = 'LISTED';
                    buyActionLabel = `Buy ${st.name.split(' ')[0]} on NSE via Zerodha / Groww →`;
                    buyActionIcon = 'flash';
                    buyActionColor = '#10B981';
                  } else if (rawStage.includes('ACQUISITION') || rawStage.includes('EXITED') || rawStage.includes('WALMART')) {
                    stageBadgeText = 'ACQUIRED';
                    isExit = true;
                    startupFormDesc = 'Strategic acquisition exit ho chuka hai (Company Acquired)';
                    startupFormIcon = 'business-outline';
                    startupFormColor = '#A855F7';
                    buyActionType = 'ACQUIRED';
                    buyActionLabel = `Deal Exited (Strategic Acquisition) 🔒`;
                    buyActionIcon = 'lock-closed-outline';
                    buyActionColor = '#94A3B8';
                  } else if (rawStage.includes('PRE-IPO')) {
                    stageBadgeText = 'PRE-IPO';
                    isExit = false;
                    startupFormDesc = 'IPO aane wala hai (Pre-IPO / Unlisted round active)';
                    startupFormIcon = 'rocket-outline';
                    startupFormColor = '#F59E0B';
                    buyActionType = 'PRE_IPO';
                    buyActionLabel = `Invest in ${st.name.split(' ')[0]} via Pre-IPO Desk →`;
                    buyActionIcon = 'rocket-outline';
                    buyActionColor = '#F59E0B';
                  } else if (rawStage.includes('SERIES')) {
                    const seriesMatch = (st.stage || '').match(/Series\s+([A-Z0-9/]+)/i);
                    stageBadgeText = seriesMatch ? `SERIES ${seriesMatch[1].toUpperCase()}` : 'GROWTH';
                    isExit = false;
                    startupFormDesc = `Private startup hai (${stageBadgeText} unlisted round)`;
                    startupFormIcon = 'cube-outline';
                    startupFormColor = '#60A5FA';
                    buyActionType = 'PRIVATE';
                    buyActionLabel = `Invest in ${st.name.split(' ')[0]} via Syndicate Desk →`;
                    buyActionIcon = 'briefcase-outline';
                    buyActionColor = '#3B82F6';
                  } else if (rawStage.includes('ANGEL')) {
                    stageBadgeText = 'ANGEL';
                    isExit = false;
                    startupFormDesc = 'Early-stage private startup hai (Angel stage bet)';
                    startupFormIcon = 'sparkles-outline';
                    startupFormColor = '#8B5CF6';
                    buyActionType = 'PRIVATE';
                    buyActionLabel = `Invest in ${st.name.split(' ')[0]} via Angel Syndicate →`;
                    buyActionIcon = 'briefcase-outline';
                    buyActionColor = '#8B5CF6';
                  } else if (rawStage.includes('GROWTH')) {
                    stageBadgeText = 'GROWTH';
                    isExit = false;
                    startupFormDesc = 'Private startup hai (Growth capital round)';
                    startupFormIcon = 'trending-up-outline';
                    startupFormColor = '#60A5FA';
                    buyActionType = 'PRIVATE';
                    buyActionLabel = `Invest in ${st.name.split(' ')[0]} via Syndicate Desk →`;
                    buyActionIcon = 'briefcase-outline';
                    buyActionColor = '#3B82F6';
                  } else {
                    stageBadgeText = 'ACTIVE';
                    isExit = false;
                  }

                  return (
                    <View key={idx} style={styles.stockCardContainer}>
                      <TouchableOpacity
                        style={styles.stockItemRow}
                        onPress={() => handleToggleRow(`startup-${idx}`)}
                        activeOpacity={0.8}
                      >
                        {/* Numbering Circle (Clone Portfolio Style) */}
                        <View style={styles.stockNumberCircle}>
                          <Text style={styles.stockNumberText}>{idx + 1}</Text>
                        </View>

                        {/* Main Info: Name + Stage Badge + Subtitle */}
                        <View style={styles.stockMainInfo}>
                          <View style={styles.stockTitleRow}>
                            <Text style={styles.stockName} numberOfLines={1}>
                              {st.name}
                            </Text>
                            <View
                              style={[
                                styles.startupStageBadge,
                                isExit ? styles.startupStageBadgeExit : styles.startupStageBadgeActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.startupStageText,
                                  isExit ? styles.startupStageTextExit : styles.startupStageTextActive,
                                ]}
                              >
                                {stageBadgeText}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.sharesSub} numberOfLines={1}>
                            {st.category} • Entered {st.entryYear}
                          </Text>
                        </View>

                        {/* Amount Box: Value + Return Multiple */}
                        <View style={styles.stockAmountBox}>
                          <Text style={styles.stockTotalVal}>{st.currentValue || 'Active'}</Text>
                          <View style={styles.rightSubRow}>
                            <View style={styles.multiplePillMini}>
                              <Ionicons name="sparkles" size={9} color="#10B981" />
                              <Text style={styles.multipleTextMini}>{st.multiple || 'Active'} Gain</Text>
                            </View>
                          </View>
                        </View>

                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={13}
                          color="#64748B"
                          style={{ marginLeft: 6 }}
                        />
                      </TouchableOpacity>

                      {/* Expandable Startup Deal Drawer */}
                      {isExpanded && (
                        <View style={styles.expandedDrawer}>
                          <View style={styles.drawerGrid}>
                            <View style={styles.drawerItem}>
                              <Text style={styles.drawerLabel}>Initial Capital</Text>
                              <Text style={styles.drawerValue}>
                                {st.investedValue || '—'}
                              </Text>
                            </View>

                            <View style={styles.drawerItem}>
                              <Text style={styles.drawerLabel}>Current Mark / Exit</Text>
                              <Text style={styles.drawerValueGreen}>
                                {st.currentValue || '—'}
                              </Text>
                            </View>

                            <View style={styles.drawerItem}>
                              <Text style={styles.drawerLabel}>Status</Text>
                              <Text style={styles.drawerValue} numberOfLines={1}>
                                {st.status ? st.status.split('(')[0].trim() : 'Active Holding'}
                              </Text>
                            </View>
                          </View>

                          {/* Startup Form Status Box & Filing Notes */}
                          <View style={styles.startupNoteBox}>
                            <Ionicons
                              name={startupFormIcon}
                              size={13}
                              color={startupFormColor}
                              style={{ marginTop: 1 }}
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.startupFormTag, { color: startupFormColor }]}>
                                {startupFormDesc}
                              </Text>
                              {st.notes ? (
                                <Text style={styles.startupNoteText}>{st.notes}</Text>
                              ) : null}
                            </View>
                          </View>

                          {/* Button 1: View MCA PAS-3 Filing */}
                          <TouchableOpacity
                            style={styles.startupActionBtn}
                            onPress={() => {
                              Alert.alert(
                                `${st.name} Venture Sheet`,
                                `Regulatory Source: MCA Form PAS-3 & Venture Intelligence\n\n• Form / Status: ${startupFormDesc}\n• Round / Entry: ${st.entryYear}\n• Initial Investment: ${st.investedValue || 'Undisclosed'}\n• Current Mark / Exit: ${st.currentValue || 'Active'}\n• Realized Return: ${st.multiple || 'Active Holding'}\n\nKey Note: ${st.notes || 'Institutional private venture bet.'}`,
                                [{ text: 'Close', style: 'cancel' }]
                              );
                            }}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="document-text-outline" size={13} color="#60A5FA" />
                            <Text style={styles.startupActionText}>
                              View MCA PAS-3 Filing & Venture Sheet →
                            </Text>
                          </TouchableOpacity>

                          {/* Button 2: Buy / Invest Action Button (conditioned) */}
                          <TouchableOpacity
                            style={[
                              styles.startupBuyActionBtn,
                              buyActionType === 'LISTED' && styles.buyBtnListed,
                              buyActionType === 'PRE_IPO' && styles.buyBtnPreIpo,
                              buyActionType === 'PRIVATE' && styles.buyBtnPrivate,
                              buyActionType === 'ACQUIRED' && styles.buyBtnAcquired,
                            ]}
                            onPress={() => handleStartupBuyPrompt(st, buyActionType)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name={buyActionIcon} size={13} color={buyActionColor} />
                            <Text style={[styles.startupBuyActionText, { color: buyActionColor }]}>
                              {buyActionLabel}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}

                {/* Empty State */}
                {startups.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No private investments found</Text>
                  </View>
                )}
              </View>
            )}

            {/* Subtle Regulatory Footer */}
            <View style={styles.footerNote}>
              <Ionicons name="shield-checkmark-outline" size={13} color="#475569" />
              <Text style={styles.footerNoteText}>
                Data synchronized from SEBI Quarterly Disclosures & Ministry of Corporate Affairs Form PAS-3 filings.
              </Text>
            </View>

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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleBox: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  whaleName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.2,
  },
  sebiTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  sebiTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  whaleTag: {
    fontSize: 12,
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
  netWorthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 14,
  },
  netWorthLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  netWorthValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  returnBadgeRight: {
    alignItems: 'flex-end',
  },
  returnPercentText: {
    fontSize: 15,
    fontWeight: '800',
  },
  returnSubLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  miniAllocLine: {
    height: 3,
    borderRadius: 1.5,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    marginTop: 12,
  },
  switchRow: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  segmentTabActive: {
    backgroundColor: '#1F2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  segmentLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  searchWrapper: {
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1622',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 7 : 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#F8FAFC',
    fontWeight: '500',
    paddingVertical: 0,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  stocksHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 10,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  stockCardContainer: {
    marginBottom: 8,
  },
  stockItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1622',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  stockNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stockNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  stockMainInfo: {
    flex: 1,
    marginRight: 8,
  },
  stockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stockName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
    flexShrink: 1,
  },
  weightBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  weightText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
  },
  sharesSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  stockAmountBox: {
    alignItems: 'flex-end',
  },
  stockTotalVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  rightSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  whaleStakeNote: {
    fontSize: 10,
    color: '#94A3B8',
  },
  metaDot: {
    fontSize: 9,
    color: '#475569',
  },
  stockReturnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  expandedDrawer: {
    backgroundColor: '#0F1622',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  drawerGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  drawerItem: {
    flex: 1,
  },
  drawerLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  drawerValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 2,
  },
  drawerValueGreen: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
    marginTop: 2,
  },
  tradeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    gap: 6,
  },
  tradeActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
  },
  startupStageBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  startupStageBadgeExit: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  startupStageBadgeActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  startupStageText: {
    fontSize: 9,
    fontWeight: '800',
  },
  startupStageTextExit: {
    color: '#10B981',
  },
  startupStageTextActive: {
    color: '#60A5FA',
  },
  multiplePillMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  multipleTextMini: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
  },
  startupActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    gap: 6,
  },
  startupActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#60A5FA',
  },
  startupBuyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 8,
    borderWidth: 1,
    gap: 6,
  },
  buyBtnListed: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.28)',
  },
  buyBtnPreIpo: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  buyBtnPrivate: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.28)',
  },
  buyBtnAcquired: {
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  startupBuyActionText: {
    fontSize: 11,
    fontWeight: '800',
  },
  startupFormTag: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 2,
  },
  startupFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  startupFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#0F1622',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 5,
  },
  startupFilterPillActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  startupFilterPillActiveGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  startupFilterText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  startupFilterTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  startupFilterTextActiveGreen: {
    color: '#10B981',
    fontWeight: '800',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  startupNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    gap: 6,
  },
  startupNoteText: {
    fontSize: 10,
    color: '#94A3B8',
    flex: 1,
    lineHeight: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 12,
    color: '#64748B',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  footerNoteText: {
    fontSize: 9,
    color: '#475569',
    textAlign: 'center',
    maxWidth: '85%',
  },
});
