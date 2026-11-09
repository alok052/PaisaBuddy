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
  Alert,
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
  const handleItemPress = (itemOrId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (typeof itemOrId === 'string') {
      if (onSelectPage) {
        onSelectPage(itemOrId);
      }
      if (onClose) {
        onClose();
      }
      return;
    }

    if (itemOrId.isUpcoming) {
      Alert.alert(
        itemOrId.title,
        `${itemOrId.description}\n\nStatus: Currently under active development. It will be released in the upcoming update.`,
        [
          {
            text: 'Open Tools Hub',
            onPress: () => {
              if (onSelectPage) {
                onSelectPage('tools');
              }
              if (onClose) {
                onClose();
              }
            },
          },
          { text: 'Got It', style: 'cancel' },
        ]
      );
      return;
    }

    if (itemOrId.id === 'notifications') {
      Alert.alert(
        'Market Alerts & Bulk Deals',
        'Real-time SEBI disclosures, bulk deals, and SMS alerts are available inside the Whales Radar desk.',
        [
          {
            text: 'Open Whales Radar',
            onPress: () => {
              if (onSelectPage) {
                onSelectPage('whales');
              }
              if (onClose) {
                onClose();
              }
            },
          },
          { text: 'OK', style: 'cancel' },
        ]
      );
      return;
    }

    if (onSelectPage) {
      onSelectPage(itemOrId.id);
    }
    if (onClose) {
      onClose();
    }
  };

  const bentoGrid = [
    {
      id: 'ipos',
      title: 'IPO & GMP Radar',
      subtitle: 'Live Grey Market Premiums & Bids',
      icon: 'trending-up-outline',
      gradient: ['#131B2E', '#090E17'],
      borderColor: 'rgba(255, 255, 255, 0.08)',
      iconColor: '#38BDF8',
      category: 'PRIMARY',
      isUpcoming: false,
    },
    {
      id: 'notifications',
      title: 'Market Alerts',
      subtitle: 'Disclosures & Block Deals Feed',
      icon: 'notifications-outline',
      gradient: ['#171B24', '#0D1017'],
      borderColor: 'rgba(255, 255, 255, 0.08)',
      iconColor: '#F59E0B',
      category: 'ALERTS',
      isUpcoming: false,
    },
    {
      id: 'stepup',
      title: 'Step-Up Calculator',
      subtitle: 'Annual SIP Increment Multiplier',
      description:
        'Calculate how stepping up your SIP by 10-25% every year can 3x your final corpus over 15-20 years using disciplined annual increments.',
      icon: 'stats-chart-outline',
      gradient: ['#0A1D1A', '#051210'],
      borderColor: 'rgba(255, 255, 255, 0.08)',
      iconColor: '#10B981',
      category: 'WEALTH',
      isUpcoming: false,
    },
    {
      id: 'emi',
      title: 'EMI & Prepayment',
      subtitle: 'Loan Tenure & Interest Saver',
      description:
        'Calculate monthly EMI, total interest, and discover how 1 extra EMI per year cuts loan tenure by 6+ years and saves lakhs in interest.',
      icon: 'card-outline',
      gradient: ['#1B111B', '#100910'],
      borderColor: 'rgba(255, 255, 255, 0.08)',
      iconColor: '#F472B6',
      category: 'LOANS',
      isUpcoming: false,
    },
    {
      id: 'goals',
      title: 'Financial Goal Planner',
      subtitle: 'Inflation-Adjusted Life Milestones',
      description:
        'Set your life goals with target amounts and timelines. Get a personalized SIP & lumpsum blueprint adjusted for Indian inflation.',
      icon: 'flag-outline',
      gradient: ['#1A160B', '#0F0D06'],
      borderColor: 'rgba(255, 255, 255, 0.08)',
      iconColor: '#F59E0B',
      category: 'GOALS',
      isUpcoming: false,
    },
    {
      id: 'dividend',
      title: 'Dividend Yield Tracker',
      subtitle: 'Passive Cashflow & DRIP Snowball',
      description:
        'Track dividend income from your stock & REIT portfolio, projected annual yield, quarterly payout dates, and Section 194 TDS insights.',
      icon: 'cash-outline',
      gradient: ['#09181C', '#050F12'],
      borderColor: 'rgba(255, 255, 255, 0.08)',
      iconColor: '#22D3EE',
      category: 'INCOME',
      isUpcoming: false,
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
            {/* Executive Status Banner */}
            <View style={styles.vipBannerWrapper}>
              <View style={styles.vipBanner}>
                <View style={styles.vipBannerLeft}>
                  <View style={styles.crownCircle}>
                    <Ionicons name="apps-outline" size={16} color="#10B981" />
                  </View>
                  <View style={styles.vipTextGroup}>
                    <Text style={styles.vipTitle}>INSTITUTIONAL DIRECTORY</Text>
                    <Text style={styles.vipSubtitle}>
                      Curated Terminals & Financial Engines
                    </Text>
                  </View>
                </View>
                <View style={styles.vipTag}>
                  <Text style={styles.vipTagText}>SUITE</Text>
                </View>
              </View>
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
                  colors={['#081914', '#040F0C']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroToolGradient}
                >
                  <View style={styles.heroTopRow}>
                    <View style={styles.heroIconBox}>
                      <View style={styles.heroIconInner}>
                        <Ionicons name="calculator-outline" size={22} color="#10B981" />
                      </View>
                    </View>

                    <View style={styles.heroBadgeBox}>
                      <View style={styles.taxSavePill}>
                        <Text style={styles.taxSavePillText}>6 TOOLS INSIDE</Text>
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
                      <Ionicons name="layers-outline" size={14} color="#64748B" />
                      <Text style={styles.heroToolsCountText}>
                        Calculators & Capital Planners
                      </Text>
                    </View>
                    <View style={styles.launchButton}>
                      <Text style={styles.launchButtonText}>Open Tools</Text>
                      <Ionicons name="arrow-forward" size={13} color="#041F18" />
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* BENTO GRID: RADARS & UPCOMING TOOLS */}
            <View style={styles.bentoSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>RADARS & TOOLS SUITE</Text>
                <Text style={styles.sectionSubCount}>
                  {bentoGrid.length} Modules
                </Text>
              </View>

              <View style={styles.bentoGrid}>
                {bentoGrid.map((item) => {
                  const isActive = !item.isUpcoming && activePage === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.bentoCard,
                        isActive && { borderColor: 'rgba(16, 185, 129, 0.4)' },
                      ]}
                      activeOpacity={0.8}
                      onPress={() => handleItemPress(item)}
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
                              { backgroundColor: `${item.iconColor}14` },
                            ]}
                          >
                            <Ionicons
                              name={item.icon}
                              size={18}
                              color={item.iconColor}
                            />
                          </View>
                          <Text
                            style={[
                              styles.bentoCategoryText,
                              item.isUpcoming && { color: '#F59E0B' },
                            ]}
                          >
                            {item.category}
                          </Text>
                        </View>

                        <Text
                          style={styles.bentoTitle}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.85}
                        >
                          {item.title}
                        </Text>
                        <Text style={styles.bentoSubtitle} numberOfLines={2}>
                          {item.subtitle}
                        </Text>

                        <View style={styles.bentoArrowRow}>
                          <Text
                            style={[
                              styles.bentoActionText,
                              { color: isActive ? '#10B981' : '#94A3B8' },
                            ]}
                          >
                            {item.isUpcoming
                              ? 'Coming Soon'
                              : isActive
                              ? 'Current Desk'
                              : 'Open Desk'}
                          </Text>
                          <Ionicons
                            name={
                              item.isUpcoming
                                ? 'time-outline'
                                : isActive
                                ? 'checkmark-outline'
                                : 'chevron-forward'
                            }
                            size={13}
                            color={
                              item.isUpcoming
                                ? '#F59E0B'
                                : isActive
                                ? '#10B981'
                                : '#64748B'
                            }
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
                <Text style={styles.sectionSubCount}>Next Release</Text>
              </View>

              <View style={styles.pipelinePillsContainer}>
                {pipelinePills.map((pill) => (
                  <View key={pill.id} style={styles.pipelinePill}>
                    <Ionicons name={pill.icon} size={15} color="#64748B" />
                    <Text style={styles.pipelinePillText}>{pill.label}</Text>
                    <Ionicons name="chevron-forward" size={13} color="#334155" />
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
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0C111C',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  vipBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  crownCircle: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  vipTextGroup: {
    flex: 1,
  },
  vipTitle: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  vipSubtitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '400',
    marginTop: 2,
  },
  vipTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    marginLeft: 8,
  },
  vipTagText: {
    color: '#94A3B8',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.6,
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
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  activeTagText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  heroSection: {
    marginBottom: 20,
  },
  heroToolCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    backgroundColor: '#0A120E',
  },
  heroToolCardActive: {
    borderColor: '#10B981',
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
    borderRadius: 12,
    overflow: 'hidden',
  },
  heroIconInner: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taxSavePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  taxSavePillText: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  heroDescription: {
    color: '#94A3B8',
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: '400',
    marginBottom: 14,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  heroToolsCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroToolsCountText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 5,
  },
  launchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  launchButtonText: {
    color: '#041F18',
    fontSize: 11,
    fontWeight: '800',
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
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  bentoGradient: {
    padding: 12,
    minHeight: 124,
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
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoCategoryText: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  bentoTitle: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
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
    fontWeight: '700',
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
    backgroundColor: '#0D121D',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pipelinePillText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
    marginLeft: 8,
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
