import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';

export default function SIPMigrationModal({ visible, fund, onClose }) {
  if (!fund) return null;

  const platforms = [
    {
      name: 'MFCentral',
      url: 'https://www.mfcentral.com',
      tag: 'Official SEBI & Registrar Portal',
      color: '#2563EB',
    },
    {
      name: 'Zerodha Coin',
      url: 'https://coin.zerodha.com',
      tag: 'Demat Direct Mode • 0% Commission',
      color: '#EA580C',
    },
    {
      name: 'Groww Direct',
      url: 'https://groww.in/mutual-funds',
      tag: 'Paperless Direct Switch',
      color: '#00D09C',
    },
    {
      name: 'CAMS / KFintech Direct',
      url: 'https://mycams.camsonline.com',
      tag: 'Direct AMC Account Management',
      color: '#7C3AED',
    },
  ];

  const handleOpenPlatform = async (platform) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await Linking.openURL(platform.url);
    } catch {
      Alert.alert(
        `Opening ${platform.name}`,
        `Please open ${platform.name} to switch ${fund.name} into its Direct Plan.`
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
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <View style={styles.leakBadge}>
                  <Text style={styles.leakBadgeText}>COMMISSION RECOVERY BLUEPRINT</Text>
                </View>
              </View>
              <Text style={styles.title}>Switch {fund.name}</Text>
              <Text style={styles.subtitle}>
                Eliminate {fund.hiddenAgentCommission} annual agent cut • Save {fund.lossOver20Y}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
            {/* Wealth Recovery Hero Banner */}
            <LinearGradient
              colors={['#062E23', '#031F17']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroBanner}
            >
              <View style={styles.heroRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroSub}>TOTAL {fund.horizonYears || 20}-YEAR WEALTH RECOVERED</Text>
                  <Text style={styles.heroAmount}>{fund.lossOver20Y}</Text>
                  <Text style={styles.heroNote}>Compounding wealth kept in your family instead of paying bank distributor commissions.</Text>
                </View>
                <View style={styles.heroIconBox}>
                  <Ionicons name="shield-checkmark" size={28} color={colors.primary} />
                </View>
              </View>
            </LinearGradient>

            {/* Step-by-Step Migration Guide */}
            <Text style={styles.sectionTitle}>4-Step Zero-Penalty Migration Roadmap</Text>

            {/* Step 1 */}
            <View style={styles.stepCard}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Verify Statement Suffix</Text>
                <Text style={styles.stepDesc}>
                  Open your CAS statement. If the scheme name mentions "Regular - Growth", your distributor or bank takes up to {fund.hiddenAgentCommission} of your portfolio value every year.
                </Text>
              </View>
            </View>

            {/* Step 2 */}
            <View style={styles.stepCard}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Stop Future Regular SIP Debits</Text>
                <Text style={styles.stepDesc}>
                  Do NOT sell your existing units immediately! Simply pause or cancel future monthly auto-debits in the Regular Plan to stop feeding new commissions.
                </Text>
              </View>
            </View>

            {/* Step 3 */}
            <View style={styles.stepCard}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Start Fresh SIP in "Direct - Growth"</Text>
                <Text style={styles.stepDesc}>
                  Start an identical SIP under "{fund.name} - Direct Plan Growth" on zero-commission direct platforms like MFCentral, Zerodha Coin, or Groww Direct.
                </Text>
              </View>
            </View>

            {/* Step 4 */}
            <View style={styles.stepCard}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Tax-Smart Gradual Switch</Text>
                <Text style={styles.stepDesc}>
                  Switch existing units only after holding them for >365 days. Under Section 112A, the first ₹1,25,000 of Long-Term Capital Gains (LTCG) per financial year is 100% tax-free!
                </Text>
              </View>
            </View>

            {/* 1-Click Zero Commission Platforms */}
            <Text style={styles.sectionTitle}>Execute Switch on Zero-Fee Platforms</Text>
            <View style={styles.platformList}>
              {platforms.map((p) => (
                <TouchableOpacity
                  key={p.name}
                  style={styles.platformCard}
                  activeOpacity={0.8}
                  onPress={() => handleOpenPlatform(p)}
                >
                  <View style={[styles.platformDot, { backgroundColor: p.color }]} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.platformName}>{p.name}</Text>
                    <Text style={styles.platformTag}>{p.tag}</Text>
                  </View>
                  <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 28,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  badgeRow: {
    marginBottom: 6,
  },
  leakBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  leakBadgeText: {
    color: colors.danger,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 20,
  },
  scrollArea: {
    marginTop: 12,
  },
  heroBanner: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroSub: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  heroAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  heroNote: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 15,
    marginTop: 4,
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: '#141E2E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    gap: 12,
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 3,
  },
  stepDesc: {
    fontSize: 11.5,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  platformList: {
    gap: 8,
    marginBottom: 14,
  },
  platformCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  platformDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  platformName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  platformTag: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 1,
  },
});
