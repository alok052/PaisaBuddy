import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';

export default function ExecutiveMenuDrawer({
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

  const pagesList = [
    {
      id: 'tools',
      title: 'Tools & Calculators',
      subtitle: 'Section 112A Tax Harvestor, ELSS & SIP Planners',
      icon: 'construct',
      iconColor: colors.primary,
      iconBg: 'rgba(16, 185, 129, 0.15)',
      badge: 'SAVE ₹15,625',
      badgeColor: colors.primary,
    },
    {
      id: 'ipos',
      title: 'IPO & Grey Market Radar',
      subtitle: 'Live GMP trends, institutional bids, SME & Mainboard',
      icon: 'flame',
      iconColor: colors.warning,
      iconBg: 'rgba(245, 158, 11, 0.15)',
      badge: 'LIVE GMP',
      badgeColor: colors.warning,
    },
    {
      id: 'whales',
      title: 'Super-Investor Whales',
      subtitle: 'Track 10+ Billionaires, portfolio changes & bulk deals',
      icon: 'fish',
      iconColor: colors.accentBlue,
      iconBg: 'rgba(59, 130, 246, 0.15)',
      badge: '10 WHALES',
      badgeColor: colors.accentBlue,
    },
    {
      id: 'startups',
      title: 'Pre-IPO & Startup Deals',
      subtitle: 'Co-invest in early-stage rounds & unlisted equities',
      icon: 'rocket',
      iconColor: colors.accentPurple,
      iconBg: 'rgba(168, 85, 247, 0.15)',
      badge: 'DEALS',
      badgeColor: colors.accentPurple,
    },
    {
      id: 'sip',
      title: 'SIP Doctor & Switcher',
      subtitle: 'Switch regular funds to direct and save 1.5% commission',
      icon: 'medkit',
      iconColor: '#34D399',
      iconBg: 'rgba(52, 211, 153, 0.15)',
      badge: '0% COMM',
      badgeColor: '#34D399',
    },
    {
      id: 'review',
      title: 'AI Portfolio Audit',
      subtitle: 'Mutual fund overlap, risk check & executive PDF export',
      icon: 'sparkles',
      iconColor: '#EC4899',
      iconBg: 'rgba(236, 72, 153, 0.15)',
      badge: 'AI AUDIT',
      badgeColor: '#EC4899',
    },
  ];

  const upcomingPages = [
    {
      id: 'heatmap',
      title: 'Sector Heatmap & Breath',
      subtitle: 'FII/DII real-time net flows & sentiment index',
      icon: 'grid',
      badge: 'COMING SOON',
    },
    {
      id: 'fire',
      title: 'Retirement & FIRE Planner',
      subtitle: 'Corpus planning & safe withdrawal rate (SWR)',
      icon: 'hourglass',
      badge: 'COMING SOON',
    },
    {
      id: 'gold',
      title: 'Digital Gold & Sovereign Bonds',
      subtitle: 'SGB tranches & 2.5% annual interest tracker',
      icon: 'trophy',
      badge: 'COMING SOON',
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop Tappable Area */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (onClose) onClose();
          }}
        />

        {/* Slide-in Drawer Container */}
        <View style={styles.drawerContainer}>
          {/* Top Bar with Close Button */}
          <View style={styles.drawerHeader}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerBrandIcon}>
                <Ionicons name="apps" size={16} color={colors.primary} />
              </View>
              <Text style={styles.drawerHeaderTitle}>PAGES & HUBS</Text>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (onClose) onClose();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Executive VIP User Card */}
          <View style={styles.profileCardWrapper}>
            <LinearGradient
              colors={['#101C2B', '#0B1320']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileCard}
            >
              <View style={styles.profileLeft}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.profileAvatar}
                >
                  <Text style={styles.profileAvatarText}>₹</Text>
                </LinearGradient>
                <View style={styles.profileTextGroup}>
                  <View style={styles.profileNameRow}>
                    <Text style={styles.profileName}>PaisaBuddy Executive</Text>
                    <View style={styles.vipPill}>
                      <Ionicons name="sparkles" size={9} color="#F59E0B" />
                      <Text style={styles.vipPillText}>VIP</Text>
                    </View>
                  </View>
                  <Text style={styles.profileRole}>All Financial Hubs Unlocked</Text>
                </View>
              </View>
              <View style={styles.liveFeedBadge}>
                <View style={styles.livePulseDot} />
                <Text style={styles.liveFeedText}>LIVE</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Scrollable Navigation List */}
          <ScrollView
            style={styles.drawerScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.drawerScrollContent}
          >
            {/* Section 1: Active Pages & Hubs */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>ALL ACTIVE HUBS</Text>
              <Text style={styles.sectionSubtitle}>{pagesList.length} Modular Pages</Text>
            </View>

            {pagesList.map((page) => {
              const isActive = activePage === page.id;
              return (
                <TouchableOpacity
                  key={page.id}
                  style={[
                    styles.pageCard,
                    isActive && styles.pageCardActive,
                  ]}
                  onPress={() => handleItemPress(page.id)}
                  activeOpacity={0.75}
                >
                  {/* Icon Squircle */}
                  <View
                    style={[
                      styles.pageIconSquircle,
                      { backgroundColor: page.iconBg },
                    ]}
                  >
                    <Ionicons name={page.icon} size={20} color={page.iconColor} />
                  </View>

                  {/* Text Information */}
                  <View style={styles.pageInfo}>
                    <View style={styles.pageTitleRow}>
                      <Text
                        style={[
                          styles.pageTitle,
                          isActive && { color: colors.primary, fontWeight: '800' },
                        ]}
                      >
                        {page.title}
                      </Text>
                      {page.badge && (
                        <View
                          style={[
                            styles.badgePill,
                            {
                              backgroundColor: `${page.badgeColor}20`,
                              borderColor: `${page.badgeColor}40`,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgePillText,
                              { color: page.badgeColor },
                            ]}
                          >
                            {page.badge}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.pageSubtitle} numberOfLines={1}>
                      {page.subtitle}
                    </Text>
                  </View>

                  {/* Chevron or Active Indicator */}
                  <Ionicons
                    name={isActive ? 'checkmark-circle' : 'chevron-forward'}
                    size={18}
                    color={isActive ? colors.primary : colors.textMuted}
                  />
                </TouchableOpacity>
              );
            })}

            {/* Section 2: Future Expandable Pipeline */}
            <View style={[styles.sectionHeader, { marginTop: 22 }]}>
              <Text style={styles.sectionTitle}>UPCOMING IN PIPELINE</Text>
              <Text style={styles.sectionSubtitle}>Under Development</Text>
            </View>

            {upcomingPages.map((item) => (
              <View key={item.id} style={styles.upcomingCard}>
                <View style={styles.upcomingIconSquircle}>
                  <Ionicons name={item.icon} size={18} color={colors.textMuted} />
                </View>
                <View style={styles.upcomingInfo}>
                  <View style={styles.pageTitleRow}>
                    <Text style={styles.upcomingTitle}>{item.title}</Text>
                    <View style={styles.soonPill}>
                      <Text style={styles.soonPillText}>{item.badge}</Text>
                    </View>
                  </View>
                  <Text style={styles.upcomingSubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>
              </View>
            ))}

            {/* Section 3: Preferences & System Info */}
            <View style={[styles.sectionHeader, { marginTop: 22 }]}>
              <Text style={styles.sectionTitle}>SYSTEM & PREFERENCES</Text>
            </View>

            <View style={styles.systemCard}>
              <View style={styles.systemRow}>
                <View style={styles.systemRowLeft}>
                  <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.systemRowText}>Base Currency</Text>
                </View>
                <Text style={styles.systemRowValue}>INR (₹ Indian Rupee)</Text>
              </View>
              <View style={styles.systemDivider} />
              <View style={styles.systemRow}>
                <View style={styles.systemRowLeft}>
                  <Ionicons name="moon-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.systemRowText}>Theme Palette</Text>
                </View>
                <Text style={styles.systemRowValue}>Executive Midnight</Text>
              </View>
              <View style={styles.systemDivider} />
              <View style={styles.systemRow}>
                <View style={styles.systemRowLeft}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
                  <Text style={styles.systemRowText}>SEBI Investor Safety</Text>
                </View>
                <Text style={[styles.systemRowValue, { color: colors.primary }]}>Educational Mode</Text>
              </View>
            </View>

            {/* Footer Branding */}
            <View style={styles.drawerFooter}>
              <Text style={styles.footerBrand}>PAISA BUDDY PRO • v1.2.0</Text>
              <Text style={styles.footerSub}>High-Conviction Financial Intelligence</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
  },
  drawerContainer: {
    width: '86%',
    maxWidth: 340,
    height: '100%',
    backgroundColor: '#080C14',
    borderLeftWidth: 1.5,
    borderLeftColor: '#1E293B',
    paddingTop: Platform.OS === 'android' ? 40 : 54,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30, 41, 59, 0.6)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBrandIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  drawerHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCardWrapper: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  profileCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  profileAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  profileTextGroup: {
    flex: 1,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  vipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 6,
  },
  vipPillText: {
    color: colors.warning,
    fontSize: 8,
    fontWeight: '900',
    marginLeft: 2,
  },
  profileRole: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  liveFeedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: 4,
  },
  liveFeedText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  drawerScroll: {
    flex: 1,
  },
  drawerScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  pageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#101726',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    marginBottom: 9,
  },
  pageCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  pageIconSquircle: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  pageInfo: {
    flex: 1,
    marginRight: 8,
  },
  pageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  pageTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  pageSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  badgePill: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgePillText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 23, 38, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    opacity: 0.65,
  },
  upcomingIconSquircle: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  upcomingSubtitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  soonPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  soonPillText: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '800',
  },
  systemCard: {
    backgroundColor: '#101726',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
  },
  systemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  systemRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  systemRowText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  systemRowValue: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  systemDivider: {
    height: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    marginVertical: 4,
  },
  drawerFooter: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerBrand: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  footerSub: {
    color: 'rgba(255, 255, 255, 0.25)',
    fontSize: 9,
    marginTop: 2,
  },
});
