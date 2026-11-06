import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import AppHeader from '../components/AppHeader';
import TaxHarvestingModal from '../components/TaxHarvestingModal';

export default function ToolsScreen({ onOpenMenu }) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [taxModalVisible, setTaxModalVisible] = useState(false);

  const categories = [
    { id: 'ALL', label: 'All Tools' },
    { id: 'TAX', label: 'Tax & Savings' },
    { id: 'WEALTH', label: 'Wealth & SIP' },
    { id: 'LOANS', label: 'Loans & Goals' },
  ];

  const tools = [
    {
      id: 'tax_harvest',
      category: 'TAX',
      title: 'Tax Harvesting Calculator',
      subtitle: '₹1.25L Tax-Free LTCG • Section 112A',
      description:
        'Claim your annual ₹1,25,000 tax-free LTCG exemption before March 31. Reset cost basis higher and save up to ₹15,625 direct cash legally.',
      icon: 'calculator',
      accentColor: colors.primary,
      gradientColors: ['#062E23', '#031F17'],
      tag: 'ACTIVE • SAVE ₹15,625',
      tagColor: colors.primary,
      available: true,
      stats: 'Save up to ₹15,625/yr',
    },
    {
      id: 'elss_planner',
      category: 'TAX',
      title: 'ELSS Tax Saver Planner',
      subtitle: '80C Deduction • ₹1.5L Limit',
      description:
        'Plan your Section 80C investments across ELSS mutual funds with the shortest 3-year lock-in and best historical returns.',
      icon: 'shield-checkmark',
      accentColor: colors.accentBlue,
      gradientColors: ['#0C1A2E', '#071220'],
      tag: 'COMING SOON',
      tagColor: colors.accentBlue,
      available: false,
      stats: 'Save up to ₹46,800/yr',
    },
    {
      id: 'sip_step_up',
      category: 'WEALTH',
      title: 'SIP Step-Up Calculator',
      subtitle: 'Annual Increment Strategy',
      description:
        'Calculate how stepping up your SIP by 10-25% every year can 3x your final corpus over 15-20 years using disciplined annual increments.',
      icon: 'trending-up',
      accentColor: colors.accentPurple,
      gradientColors: ['#150E24', '#0D0818'],
      tag: 'COMING SOON',
      tagColor: colors.accentPurple,
      available: false,
      stats: '3x Wealth Multiplier',
    },
    {
      id: 'dividend_tracker',
      category: 'WEALTH',
      title: 'Dividend Yield Tracker',
      subtitle: 'Passive Income Dashboard',
      description:
        'Track dividend income from your stock portfolio, projected annual yield, ex-dividend dates, and build a passive income cashflow.',
      icon: 'cash',
      accentColor: '#22D3EE',
      gradientColors: ['#0A1A1E', '#061214'],
      tag: 'COMING SOON',
      tagColor: '#22D3EE',
      available: false,
      stats: 'Passive Cashflow',
    },
    {
      id: 'emi_calculator',
      category: 'LOANS',
      title: 'EMI & Prepayment Analyzer',
      subtitle: 'Home Loan • Car Loan • Personal',
      description:
        'Calculate monthly EMI, total interest, and discover how 1 extra EMI per year cuts loan tenure by 6+ years and saves lakhs in interest.',
      icon: 'card',
      accentColor: '#F472B6',
      gradientColors: ['#1E0E18', '#140810'],
      tag: 'COMING SOON',
      tagColor: '#F472B6',
      available: false,
      stats: 'Save Lakhs on Interest',
    },
    {
      id: 'goal_planner',
      category: 'LOANS',
      title: 'Financial Goal Planner',
      subtitle: 'Retirement • House • Education',
      description:
        'Set your life goals with target amounts and timelines. Get a personalized SIP & lumpsum blueprint adjusted for Indian inflation.',
      icon: 'flag',
      accentColor: colors.warning,
      gradientColors: ['#1E1A0E', '#141208'],
      tag: 'COMING SOON',
      tagColor: colors.warning,
      available: false,
      stats: 'Inflation-Adjusted',
    },
  ];

  const handleToolPress = (tool) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (tool.available && tool.id === 'tax_harvest') {
      setTaxModalVisible(true);
    } else {
      Alert.alert(
        tool.title,
        `${tool.description}\n\nStatus: Currently under active development. It will be released in the upcoming update.`,
        [{ text: 'Got It' }]
      );
    }
  };

  const filteredTools = tools.filter((t) => {
    if (selectedCategory === 'ALL') return true;
    return t.category === selectedCategory;
  });

  const availableTools = filteredTools.filter((t) => t.available);
  const comingSoonTools = filteredTools.filter((t) => !t.available);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Clean Premium Brand Header */}
      <AppHeader subtitle="Financial Power Tools & Calculators" onMenuPress={onOpenMenu} />

      {/* Category Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
      >
        {categories.map((c) => {
          const isActive = selectedCategory === c.id;
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.categoryChip, isActive && styles.categoryChipActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedCategory(c.id);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  isActive && styles.categoryChipTextActive,
                ]}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Active Tools Section */}
      {availableTools.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.sectionBadgeText}>ACTIVE TOOL</Text>
            </View>
            <Text style={styles.sectionCount}>
              {availableTools.length} Ready to Use
            </Text>
          </View>

          {availableTools.map((tool) => (
            <TouchableOpacity
              key={tool.id}
              style={styles.toolCard}
              activeOpacity={0.85}
              onPress={() => handleToolPress(tool)}
            >
              <LinearGradient
                colors={tool.gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.toolGradient}
              >
                {/* Top Row: Icon + Info + Tag */}
                <View style={styles.toolTopRow}>
                  <View
                    style={[
                      styles.toolIconBox,
                      { backgroundColor: tool.accentColor + '20' },
                    ]}
                  >
                    <Ionicons
                      name={tool.icon}
                      size={22}
                      color={tool.accentColor}
                    />
                  </View>

                  <View style={styles.toolInfoCol}>
                    <Text style={styles.toolTitle}>{tool.title}</Text>
                    <Text style={styles.toolSubtitle}>{tool.subtitle}</Text>
                  </View>

                  <View
                    style={[
                      styles.toolTag,
                      {
                        backgroundColor: tool.tagColor + '20',
                        borderColor: tool.tagColor + '40',
                      },
                    ]}
                  >
                    <Text
                      style={[styles.toolTagText, { color: tool.tagColor }]}
                    >
                      {tool.tag}
                    </Text>
                  </View>
                </View>

                {/* Description */}
                <Text style={styles.toolDescription}>{tool.description}</Text>

                {/* Footer: Highlights + Open Button */}
                <View style={styles.toolFooter}>
                  <View style={styles.toolHighlightBadge}>
                    <Ionicons
                      name="sparkles"
                      size={12}
                      color={colors.primary}
                    />
                    <Text style={styles.toolHighlightText}>{tool.stats}</Text>
                  </View>

                  <View style={styles.toolCtaBtn}>
                    <Text style={styles.toolCtaText}>Launch Calculator</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={13}
                      color="#FFFFFF"
                      style={{ marginLeft: 4 }}
                    />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Coming Soon Section */}
      {comingSoonTools.length > 0 && (
        <>
          <View style={[styles.sectionHeader, { marginTop: 20 }]}>
            <View style={styles.sectionBadge}>
              <Ionicons
                name="hourglass-outline"
                size={12}
                color={colors.textMuted}
              />
              <Text
                style={[styles.sectionBadgeText, { color: colors.textMuted }]}
              >
                UPCOMING TOOLS PIPELINE
              </Text>
            </View>
            <Text style={styles.sectionCount}>
              {comingSoonTools.length} In Development
            </Text>
          </View>

          {comingSoonTools.map((tool) => (
            <TouchableOpacity
              key={tool.id}
              style={styles.comingCard}
              activeOpacity={0.8}
              onPress={() => handleToolPress(tool)}
            >
              <View
                style={[
                  styles.comingIconBox,
                  { backgroundColor: tool.accentColor + '15' },
                ]}
              >
                <Ionicons
                  name={tool.icon}
                  size={20}
                  color={tool.accentColor}
                />
              </View>

              <View style={styles.comingInfoCol}>
                <View style={styles.comingTitleRow}>
                  <Text style={styles.comingTitle}>{tool.title}</Text>
                  <View
                    style={[
                      styles.comingTag,
                      { borderColor: tool.tagColor + '30' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.comingTagText,
                        { color: tool.tagColor },
                      ]}
                    >
                      {tool.tag}
                    </Text>
                  </View>
                </View>
                <Text style={styles.comingSubtitle}>{tool.subtitle}</Text>
                <Text style={styles.comingDesc} numberOfLines={2}>
                  {tool.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Bottom Request / Suggestion Banner */}
      <View style={styles.requestBanner}>
        <View style={styles.requestIconCircle}>
          <Ionicons name="bulb" size={18} color={colors.warning} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.requestTitle}>Have a Tool Request?</Text>
          <Text style={styles.requestSub}>
            Tell us which financial calculator or investment analysis tool you would like added next!
          </Text>
        </View>
      </View>

      {/* Tax Harvesting & ₹1.25L Tax-Free LTCG Modal */}
      <TaxHarvestingModal
        visible={taxModalVisible}
        onClose={() => setTaxModalVisible(false)}
      />

      <View style={{ height: 90 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
  },

  /* Category Filter Chips */
  categoryScroll: {
    marginVertical: 12,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },

  /* Section Headers */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 12,
  },
  sectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  sectionCount: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },

  /* Active Tool Card */
  toolCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  toolGradient: {
    padding: 16,
  },
  toolTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolInfoCol: {
    flex: 1,
    marginLeft: 12,
  },
  toolTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: colors.text,
  },
  toolSubtitle: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  toolTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    marginLeft: 8,
  },
  toolTagText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  toolDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  toolFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  toolHighlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  toolHighlightText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  toolCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toolCtaText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Coming Soon Card */
  comingCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  comingIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  comingInfoCol: {
    flex: 1,
    marginLeft: 12,
  },
  comingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  comingTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.text,
  },
  comingSubtitle: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  comingDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 15,
  },
  comingTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 6,
  },
  comingTagText: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  /* Request Banner */
  requestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  requestIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  requestSub: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
});
