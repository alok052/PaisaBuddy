import AppHeader from '../components/AppHeader';
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import IPODetailModal from '../components/IPODetailModal';
import { mockIPOs } from '../data/mockIPOs';

export default function IPORadarScreen({ onOpenMenu }) {
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [biddingIPO, setBiddingIPO] = useState(null);

  const filters = [
    { id: 'ALL', label: 'All IPOs' },
    { id: 'MAINBOARD', label: 'Mainboard' },
    { id: 'SME', label: 'SME Issues' },
    { id: 'OPEN', label: 'Bidding Open' },
  ];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  }, []);

  const handleApplyPress = (ipo) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBiddingIPO(ipo);
  };

  const filteredIPOs = mockIPOs.filter((item) => {
    if (selectedFilter === 'MAINBOARD') return item.category === 'Mainboard';
    if (selectedFilter === 'SME') return item.category === 'SME';
    if (selectedFilter === 'OPEN') return item.status.includes('ACTIVE') || item.status.includes('BIDDING');
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
          tintColor={colors.warning}
          colors={[colors.warning, colors.primary]}
        />
      }
    >
      {/* Premium Brand Header */}
      <AppHeader
        subtitle="Institutional IPO & Grey Market Radar"
        onMenuPress={onOpenMenu}
      />
      

      {/* Featured Grey Market Intelligence Banner (Matches Home & Startups Architecture) */}
      <View style={styles.alertCardWrapper}>
        <LinearGradient
          colors={['#1E1610', '#120D08']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.alertCard}
        >
          {/* Top Row: Live Radar Indicator + Exchange Quotes */}
          <View style={styles.alertHeader}>
            <View style={styles.liveTagContainer}>
              <Ionicons name="pulse-outline" size={14} color={colors.warning} style={{ marginRight: 6 }} />
              <Text style={styles.liveTagText}>GREY MARKET RADAR</Text>
            </View>

            <View style={styles.sourcePill}>
              <Text style={styles.sourcePillText}>NSE / BSE Dealer Quotes</Text>
            </View>
          </View>

          {/* Institutional Headline */}
          <Text style={styles.alertTitle}>
            Waaree Energies delivered <Text style={{ color: colors.warning, fontWeight: '800' }}>+103.8% (₹1,560)</Text> listing day gains for allotted bidders.
          </Text>

          {/* Subtitle Detail Pill */}
          <View style={styles.alertDetailRow}>
            <View style={styles.detailPill}>
              <Text style={styles.detailPillText} numberOfLines={1}>
                ₹2.41 Lakh Cr institutional bids • 76.3x Subscribed
              </Text>
            </View>
            <Ionicons name="trending-up" size={14} color={colors.warning} />
          </View>
        </LinearGradient>
      </View>

      {/* Segment Filter Chips */}
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

      {/* Institutional IPO Cards List */}
      <View style={styles.cardsList}>
        {filteredIPOs.map((ipo) => (
          <View key={ipo.id} style={styles.ipoCard}>
            {/* ROW 1: Metadata Badges (Category Left, Status Right) */}
            <View style={styles.cardHeaderRow}>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillText}>{ipo.category.toUpperCase()} ISSUE</Text>
              </View>

              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: ipo.status.includes('ACTIVE') || ipo.status.includes('BIDDING')
                      ? 'rgba(16, 185, 129, 0.15)'
                      : ipo.status.includes('ALLOTMENT')
                      ? 'rgba(59, 130, 246, 0.15)'
                      : 'rgba(255, 255, 255, 0.08)',
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: ipo.status.includes('ACTIVE') || ipo.status.includes('BIDDING')
                        ? colors.primary
                        : ipo.status.includes('ALLOTMENT')
                        ? colors.accentBlue
                        : colors.textMuted,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.statusPillText,
                    {
                      color: ipo.status.includes('ACTIVE') || ipo.status.includes('BIDDING')
                        ? colors.primary
                        : ipo.status.includes('ALLOTMENT')
                        ? colors.accentBlue
                        : colors.textSecondary,
                    },
                  ]}
                >
                  {ipo.status}
                </Text>
              </View>
            </View>

            {/* ROW 2: Company Name & Sector Subtitle */}
            <View style={styles.identityBox}>
              <Text style={styles.ipoName}>{ipo.name}</Text>
              <Text style={styles.sectorText} numberOfLines={1}>{ipo.sector}</Text>
            </View>

            {/* ROW 3: Hero Live Grey Market Premium (GMP) Box */}
            <LinearGradient
              colors={['#0F241C', '#0A1A14']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGmpBox}
            >
              <View style={styles.gmpLeftCol}>
                <Text style={styles.cardGmpLabel}>GREY MARKET PREMIUM</Text>
                <Text style={styles.cardGmpPrice}>{ipo.gmpPrice}</Text>
                <View style={styles.cardGmpBadge}>
                  <Ionicons name="trending-up" size={11} color={colors.primary} />
                  <Text style={styles.cardGmpPercent}>{ipo.gmpPercent} Expected Gain</Text>
                </View>
              </View>

              <View style={styles.gmpRightCol}>
                <Text style={styles.cardGmpLabel}>ESTIMATED LISTING</Text>
                <Text style={styles.cardExpectedVal}>{ipo.expectedListing}</Text>
                <Text style={styles.cardIssueSub}>Issue: {ipo.priceBand.split('–')[1]?.trim() || ipo.priceBand}</Text>
              </View>
            </LinearGradient>

            {/* ROW 4: 2x2 Balanced Financial Architecture Grid */}
            <View style={styles.gridContainer}>
              {/* Cell 1: Price Band */}
              <View style={styles.gridCell}>
                <Text style={styles.cellLabel}>PRICE BAND</Text>
                <Text style={styles.cellValue}>{ipo.priceBand}</Text>
              </View>

              {/* Cell 2: Minimum Investment */}
              <View style={styles.gridCell}>
                <Text style={styles.cellLabel}>MIN INVESTMENT</Text>
                <Text style={styles.cellValue}>{ipo.minInvestment}</Text>
                <Text style={styles.cellSub}>{ipo.lotSize} Shares / Lot</Text>
              </View>

              {/* Cell 3: Issue Size */}
              <View style={[styles.gridCell, styles.cellBottom]}>
                <Text style={styles.cellLabel}>ISSUE SIZE</Text>
                <Text style={[styles.cellValue, { color: colors.warning }]}>{ipo.issueSize}</Text>
              </View>

              {/* Cell 4: Demand Multiple */}
              <View style={[styles.gridCell, styles.cellBottom]}>
                <Text style={styles.cellLabel}>TOTAL DEMAND</Text>
                <Text style={styles.cellValue}>{ipo.subscriptionTotal}</Text>
              </View>
            </View>

            {/* ROW 5: Institutional Book Breakdown Chips */}
            <View style={styles.bookContainer}>
              <View style={styles.bookChip}>
                <Text style={styles.bookChipLabel}>QIB</Text>
                <Text style={[styles.bookChipVal, { color: colors.primary }]}>{ipo.qibSub}</Text>
              </View>

              <View style={styles.bookChip}>
                <Text style={styles.bookChipLabel}>NII / HNI</Text>
                <Text style={[styles.bookChipVal, { color: colors.accentBlue }]}>{ipo.niiSub}</Text>
              </View>

              <View style={styles.bookChip}>
                <Text style={styles.bookChipLabel}>Retail</Text>
                <Text style={[styles.bookChipVal, { color: colors.warning }]}>{ipo.retailSub}</Text>
              </View>
            </View>

            {/* ROW 6: Recommendation Badge */}
            <View style={styles.verdictRow}>
              <View style={[styles.verdictBadge, { backgroundColor: ipo.verdictColor + '18', borderColor: ipo.verdictColor + '40' }]}>
                <Ionicons name="shield-checkmark" size={12} color={ipo.verdictColor} style={{ marginRight: 5 }} />
                <Text style={[styles.verdictText, { color: ipo.verdictColor }]}>
                  {ipo.verdict}
                </Text>
              </View>
              <Text style={styles.verdictNote} numberOfLines={1}>{ipo.verdictReason}</Text>
            </View>

            {/* ROW 7: Action Buttons (Equal Width, Balanced) */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.applyBtn}
                activeOpacity={0.8}
                onPress={() => handleApplyPress(ipo)}
              >
                <LinearGradient
                  colors={[colors.warning, '#D97706']}
                  style={styles.applyBtnGrad}
                >
                  <Ionicons name="open-outline" size={15} color="#000000" />
                  <Text style={styles.applyBtnText}>Apply on Broker</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.detailBtn}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.selectionAsync();
                  setBiddingIPO(ipo);
                }}
              >
                <Ionicons name="stats-chart-outline" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={styles.detailBtnText}>Full Audit & GMP</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Institutional IPO Audit & Broker Bidding Portal */}
      <IPODetailModal
        visible={!!biddingIPO}
        ipo={biddingIPO}
        onClose={() => setBiddingIPO(null)}
      />

      <View style={{ height: 95 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
  },
  alertCardWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.28)',
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    shadowColor: colors.warning,
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
  },
  liveTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.warning,
    letterSpacing: 0.5,
  },
  sourcePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sourcePillText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  alertDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flex: 1,
    marginRight: 8,
  },
  detailPillText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  filterScroll: {
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
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: colors.warning,
  },
  filterText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.warning,
    fontWeight: '700',
  },
  cardsList: {
    gap: 16,
  },
  ipoCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryPillText: {
    color: colors.warning,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  identityBox: {
    marginBottom: 12,
  },
  ipoName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.2,
    lineHeight: 23,
  },
  sectorText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  cardGmpBox: {
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  gmpLeftCol: {
    flex: 1,
  },
  gmpRightCol: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  cardGmpLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardGmpPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primary,
    marginTop: 2,
  },
  cardGmpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
    marginTop: 3,
    alignSelf: 'flex-start',
  },
  cardGmpPercent: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  cardExpectedVal: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    marginTop: 2,
  },
  cardIssueSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 3,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#121824',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  gridCell: {
    width: '50%',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cellBottom: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 8,
  },
  cellLabel: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  cellValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  cellSub: {
    fontSize: 9.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  bookContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  bookChip: {
    flex: 1,
    backgroundColor: '#141E2E',
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  bookChipLabel: {
    fontSize: 8.5,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bookChipVal: {
    fontSize: 11.5,
    fontWeight: '800',
    marginTop: 1,
  },
  verdictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    gap: 8,
  },
  verdictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  verdictText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  verdictNote: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  applyBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  applyBtnText: {
    color: '#000000',
    fontSize: 12.5,
    fontWeight: '900',
  },
  detailBtn: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  detailBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
});
