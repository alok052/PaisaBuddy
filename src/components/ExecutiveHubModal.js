import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ExecutiveHubModal({
  visible,
  onClose,
  activePage = 'whales',
  onSelectPage,
}) {
  const handleItemPress = (pageId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onSelectPage) {
      onSelectPage(pageId);
    }
    if (onClose) {
      onClose();
    }
  };

  const bentoGrid = [
    {
      id: 'ipos',
      title: 'IPO & GMP Radar',
      subtitle: 'Live Grey Market Premiums & Institutional Bids',
      icon: 'flame',
      gradient: ['#2A1708', '#140A04'],
      borderColor: 'rgba(245, 158, 11, 0.45)',
      iconColor: '#F59E0B',
      badge: 'LIVE GMP',
      badgeColor: '#F59E0B',
    },
    {
      id: 'whales',
      title: 'Whale Portfolios',
      subtitle: '10+ Super-Investors & Bulk Deals Radar',
      icon: 'fish',
      gradient: ['#0C2038', '#06101E'],
      borderColor: 'rgba(59, 130, 246, 0.45)',
      iconColor: '#3B82F6',
      badge: 'BSE / NSE',
      badgeColor: '#3B82F6',
    },
    {
      id: 'startups',
      title: 'Startups Syndicate',
      subtitle: 'Pre-IPO Allocations & Angel Equity Deals',
      icon: 'rocket',
      gradient: ['#220F38', '#10071C'],
      borderColor: 'rgba(168, 85, 247, 0.45)',
      iconColor: '#A855F7',
      badge: 'HOT DEALS',
      badgeColor: '#A855F7',
    },
    {
      id: 'sip',
      title: 'SIP Doctor',
      subtitle: '0% Commission Direct Plan Switcher',
      icon: 'medkit',
      gradient: ['#082C22', '#041712'],
      borderColor: 'rgba(16, 185, 129, 0.45)',
      iconColor: '#10B981',
      badge: 'SAVE 1.5%',
      badgeColor: '#10B981',
    },
    {
      id: 'review',
      title: 'AI Portfolio Audit',
      subtitle: 'Instant Overlap Check & 3-Page PDF Report',
      icon: 'sparkles',
      gradient: ['#300F26', '#170612'],
      borderColor: 'rgba(236, 72, 153, 0.45)',
      iconColor: '#EC4899',
      badge: 'AI AUDIT',
      badgeColor: '#EC4899',
    },
    {
      id: 'notifications',
      title: 'Market Alerts',
      subtitle: 'Real-Time Disclosures & Block Deals Feed',
      icon: 'notifications',
      gradient: ['#201A0A', '#100C04'],
      borderColor: 'rgba(234, 179, 8, 0.45)',
      iconColor: '#EAB308',
      badge: 'REALTIME',
      badgeColor: '#EAB308',
    },
  ];

  const pipelinePills = [
    { id: 'heatmap', label: 'Sector Heatmap & FII Flows', icon: 'grid-outline' },
    { id: 'fire', label: '30-Yr FIRE & Wealth Goal', icon: 'hourglass-outline' },
    { id: 'gold', label: 'Digital Gold & SGB Tranches', icon: 'trophy-outline' },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        {/* Full-Screen Glassmorphism Container */}
        <View style={styles.sheetContainer}>
          {/* Top Drag Pill */}
          <View style={styles.dragPillWrapper}>
            <View style={styles.dragPill} />
          </View>

          {/* Luxury Executive Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.brandBadge}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.brandBadgeIcon}
              >
                <Text style={styles.brandBadgeRupee}>₹</Text>
              </LinearGradient>
              <View>
                <Text style={styles.brandTitle}>PAISA BUDDY</Text>
                <Text style={styles.brandSub}>EXECUTIVE HUB & PAGES</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (onClose) onClose();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollArea}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* VIP Status Gold & Emerald Banner */}
            <View style={styles.vipBannerWrapper}>
              <LinearGradient
                colors={['#064E3B', '#022C22', '#041F18']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.vipBanner}
              >
                <View style={styles.vipBannerLeft}>
                  <View style={styles.crownCircle}>
                    <Ionicons name="sparkles" size={16} color="#F59E0B" />
                  </View>
                  <View style={styles.vipTextGroup}>
                    <Text style={styles.vipTitle}>EXECUTIVE ALL-PAGES DESK</Text>
                    <Text style={styles.vipSubtitle}>
                      Institutional Radars • High-Conviction Engines
                    </Text>
                  </View>
                </View>
                <View style={styles.livePulseBadge}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.livePulseText}>LIVE</Text>
                </View>
              </LinearGradient>
            </View>

            {/* FEATURED HERO TILE: FINANCIAL POWER TOOLS & CALCULATORS */}
            <View style={styles.heroSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>FEATURED POWER HUB</Text>
                <View style={styles.activeTag}>
                  <Text style={styles.activeTagText}>PRIMARY DESK</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.heroToolCard,
                  activePage === 'tools' && styles.heroToolCardActive,
                ]}
                activeOpacity={0.85}
                onPress={() => handleItemPress('tools')}
              >
                <LinearGradient
                  colors={['#063C2E', '#032018', '#01120D']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroToolGradient}
                >
                  <View style={styles.heroTopRow}>
                    <View style={styles.heroIconBox}>
                      <LinearGradient
                        colors={['#10B981', '#059669']}
                        style={styles.heroIconInner}
                      >
                        <Ionicons name="construct" size={24} color="#FFFFFF" />
                      </LinearGradient>
                    </View>

                    <View style={styles.heroBadgeBox}>
                      <View style={styles.taxSavePill}>
                        <Ionicons name="shield-checkmark" size={11} color="#10B981" />
                        <Text style={styles.taxSavePillText}>SAVE ₹15,625 TAX</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.heroTitle}>Financial Power Tools Hub</Text>
                  <Text style={styles.heroDescription}>
                    Post-Budget 2024 Section 112A Tax-Free LTCG Harvestor, ELSS Tax
                    Saver Planner, SIP Step-Up Multipliers, Dividend Cashflow & Loan
                    Prepayment Analyzers.
                  </Text>

                  <View style={styles.heroFooter}>
                    <View style={styles.heroToolsCount}>
                      <Ionicons name="layers-outline" size={14} color="#34D399" />
                      <Text style={styles.heroToolsCountText}>
                        6 Specialized Calculators Inside
                      </Text>
                    </View>
                    <View style={styles.launchButton}>
                      <Text style={styles.launchButtonText}>Open Tools</Text>
                      <Ionicons name="arrow-forward" size={14} color="#041F18" />
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* BENTO GRID: OTHER SPECIALIZED PAGES */}
            <View style={styles.bentoSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>ALL RADARS & PAGES</Text>
                <Text style={styles.sectionSubCount}>
                  {bentoGrid.length} Specialized Desks
                </Text>
              </View>

              <View style={styles.bentoGrid}>
                {bentoGrid.map((item) => {
                  const isActive = activePage === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.bentoCard,
                        isActive && { borderColor: item.iconColor },
                      ]}
                      activeOpacity={0.8}
                      onPress={() => handleItemPress(item.id)}
                    >
                      <LinearGradient
                        colors={item.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.bentoGradient}
                      >
                        <View style={styles.bentoTop}>
                          <View
                            style={[
                              styles.bentoIconBox,
                              { backgroundColor: `${item.iconColor}22` },
                            ]}
                          >
                            <Ionicons
                              name={item.icon}
                              size={20}
                              color={item.iconColor}
                            />
                          </View>
                          <View
                            style={[
                              styles.bentoBadge,
                              {
                                backgroundColor: `${item.badgeColor}18`,
                                borderColor: `${item.badgeColor}50`,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.bentoBadgeText,
                                { color: item.badgeColor },
                              ]}
                            >
                              {item.badge}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.bentoTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.bentoSubtitle} numberOfLines={2}>
                          {item.subtitle}
                        </Text>

                        <View style={styles.bentoArrowRow}>
                          <Text
                            style={[
                              styles.bentoActionText,
                              { color: item.iconColor },
                            ]}
                          >
                            {isActive ? 'Current Page' : 'Enter Desk'}
                          </Text>
                          <Ionicons
                            name={isActive ? 'checkmark' : 'chevron-forward'}
                            size={14}
                            color={item.iconColor}
                          />
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* EXPANDABLE PIPELINE (COMING NEXT) */}
            <View style={styles.pipelineSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>EXPANDABLE PIPELINE</Text>
                <Text style={styles.sectionSubCount}>Coming in Next Update</Text>
              </View>

              <View style={styles.pipelinePillsContainer}>
                {pipelinePills.map((pill) => (
                  <View key={pill.id} style={styles.pipelinePill}>
                    <Ionicons name={pill.icon} size={14} color="#94A3B8" />
                    <Text style={styles.pipelinePillText}>{pill.label}</Text>
                    <View style={styles.pipelineSoonTag}>
                      <Text style={styles.pipelineSoonText}>SOON</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* LUXURY FOOTER BRANDING */}
            <View style={styles.footerContainer}>
              <View style={styles.footerDivider} />
              <Text style={styles.footerText}>
                PAISA BUDDY PRO • INSTITUTIONAL FINTECH
              </Text>
              <Text style={styles.footerSubText}>
                Curated for High-Conviction Indian Capitalists
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    width: '100%',
    height: '92%',
    backgroundColor: '#070A12',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  dragPillWrapper: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  dragPill: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandBadgeIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  brandBadgeRupee: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  brandSub: {
    color: colors.primary,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },
  vipBannerWrapper: {
    marginBottom: 18,
  },
  vipBanner: {
    borderRadius: 16,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  vipBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  crownCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  vipTextGroup: {
    flex: 1,
  },
  vipTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  vipSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  livePulseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginLeft: 8,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  livePulseText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionHeading: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sectionSubCount: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  activeTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  activeTagText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  heroSection: {
    marginBottom: 20,
  },
  heroToolCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  heroToolCardActive: {
    borderColor: '#34D399',
    borderWidth: 2,
  },
  heroToolGradient: {
    padding: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heroIconBox: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  heroIconInner: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taxSavePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  taxSavePillText: {
    color: '#10B981',
    fontSize: 9.5,
    fontWeight: '900',
    marginLeft: 4,
    letterSpacing: 0.4,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  heroDescription: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
    marginBottom: 14,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroToolsCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroToolsCountText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 5,
  },
  launchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  launchButtonText: {
    color: '#041F18',
    fontSize: 11.5,
    fontWeight: '900',
    marginRight: 4,
  },
  bentoSection: {
    marginBottom: 20,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  bentoCard: {
    width: (SCREEN_WIDTH - 42) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  bentoGradient: {
    padding: 12,
    minHeight: 132,
    justifyContent: 'space-between',
  },
  bentoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bentoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoBadge: {
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  bentoBadgeText: {
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  bentoTitle: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
    marginBottom: 2,
  },
  bentoSubtitle: {
    color: '#94A3B8',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '400',
  },
  bentoArrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  bentoActionText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  pipelineSection: {
    marginBottom: 20,
  },
  pipelinePillsContainer: {
    gap: 8,
  },
  pipelinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  pipelinePillText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
  pipelineSoonTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  pipelineSoonText: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: '800',
  },
  footerContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  footerDivider: {
    width: 60,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 10,
  },
  footerText: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1,
  },
  footerSubText: {
    color: 'rgba(255, 255, 255, 0.2)',
    fontSize: 9,
    marginTop: 2,
  },
});
