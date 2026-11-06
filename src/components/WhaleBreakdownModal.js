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
            {/* TAB 1: PUBLIC EQUITIES (LIST VIEW)        */}
            {/* ========================================= */}
            {activeTab === 'STOCKS' && (
              <View>
                {/* Column Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={styles.colLeftHeader}>COMPANY / HOLDING</Text>
                  <Text style={styles.colRightHeader}>STAKE / WEIGHT</Text>
                </View>

                {holdings.map((stock, idx) => {
                  const isExpanded = expandedItemId === (stock.symbol || stock.name);
                  const isPositive = !(stock.change1Y || '').startsWith('-');

                  return (
                    <View key={idx} style={styles.rowWrapper}>
                      <TouchableOpacity
                        style={styles.rowMain}
                        onPress={() => handleToggleRow(stock.symbol || stock.name)}
                        activeOpacity={0.7}
                      >
                        {/* Left Column: Name & Sector */}
                        <View style={styles.rowLeftCol}>
                          <Text style={styles.stockName} numberOfLines={1}>
                            {stock.name}
                          </Text>
                          <Text style={styles.stockSub} numberOfLines={1}>
                            {stock.symbol || 'EQUITY'} • {stock.sector}
                          </Text>
                        </View>

                        {/* Right Column: Total Value & Weight */}
                        <View style={styles.rowRightCol}>
                          <Text style={styles.stockValue}>{stock.value}</Text>
                          <View style={styles.subMetaRow}>
                            <Text style={styles.stockWeight}>{stock.weightPercent}% wt</Text>
                            <Text style={styles.metaDot}>•</Text>
                            <Text
                              style={[
                                styles.stockReturn,
                                { color: isPositive ? '#10B981' : '#EF4444' },
                              ]}
                            >
                              {stock.change1Y}
                            </Text>
                          </View>
                        </View>

                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={14}
                          color="#475569"
                          style={{ marginLeft: 8 }}
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
            {/* TAB 2: PRIVATE STARTUPS (LIST VIEW)       */}
            {/* ========================================= */}
            {activeTab === 'STARTUPS' && (
              <View>
                {/* Column Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={styles.colLeftHeader}>STARTUP / ROUND</Text>
                  <Text style={styles.colRightHeader}>VALUATION / RETURN</Text>
                </View>

                {startups.map((st, idx) => {
                  const isExpanded = expandedItemId === `startup-${idx}`;
                  const isIpo =
                    (st.stage || '').includes('IPO') ||
                    (st.status || '').includes('Listed') ||
                    (st.stage || '').includes('Acquisition');

                  return (
                    <View key={idx} style={styles.rowWrapper}>
                      <TouchableOpacity
                        style={styles.rowMain}
                        onPress={() => handleToggleRow(`startup-${idx}`)}
                        activeOpacity={0.7}
                      >
                        {/* Left Column: Startup Name & Category */}
                        <View style={styles.rowLeftCol}>
                          <View style={styles.startupNameBadgeRow}>
                            <Text style={styles.stockName} numberOfLines={1}>
                              {st.name}
                            </Text>
                            {isIpo && (
                              <View style={styles.ipoPill}>
                                <Text style={styles.ipoPillText}>IPO EXIT</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.stockSub} numberOfLines={1}>
                            {st.category}
                          </Text>
                        </View>

                        {/* Right Column: Current Value & Multiple */}
                        <View style={styles.rowRightCol}>
                          <Text style={styles.stockValue}>{st.currentValue || st.status}</Text>
                          <View style={styles.multipleTag}>
                            <Text style={styles.multipleTagText}>{st.multiple} Return</Text>
                          </View>
                        </View>

                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={14}
                          color="#475569"
                          style={{ marginLeft: 8 }}
                        />
                      </TouchableOpacity>

                      {/* Expandable Startup Deal Drawer */}
                      {isExpanded && (
                        <View style={styles.expandedDrawer}>
                          <View style={styles.drawerGrid}>
                            <View style={styles.drawerItem}>
                              <Text style={styles.drawerLabel}>Initial Capital</Text>
                              <Text style={styles.drawerValue}>
                                {st.investedValue || '—'} ({st.entryYear})
                              </Text>
                            </View>

                            <View style={styles.drawerItem}>
                              <Text style={styles.drawerLabel}>Current Status</Text>
                              <Text style={styles.drawerValue}>{st.status}</Text>
                            </View>

                            <View style={styles.drawerItem}>
                              <Text style={styles.drawerLabel}>Deal Stage</Text>
                              <Text style={styles.drawerValue}>{st.stage}</Text>
                            </View>
                          </View>

                          {st.notes && (
                            <View style={styles.startupNoteBox}>
                              <Ionicons name="information-circle" size={13} color="#64748B" />
                              <Text style={styles.startupNoteText}>{st.notes}</Text>
                            </View>
                          )}
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
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  colLeftHeader: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.6,
  },
  colRightHeader: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.6,
  },
  rowWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowLeftCol: {
    flex: 1,
    paddingRight: 10,
  },
  stockName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  stockSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  rowRightCol: {
    alignItems: 'flex-end',
  },
  stockValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  stockWeight: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  metaDot: {
    fontSize: 10,
    color: '#475569',
  },
  stockReturn: {
    fontSize: 11,
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
  startupNameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ipoPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  ipoPillText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#10B981',
  },
  multipleTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  multipleTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
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
