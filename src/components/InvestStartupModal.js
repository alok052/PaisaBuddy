import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';

export default function InvestStartupModal({ visible, startup, onClose }) {
  if (!startup) return null;

  const tickets = [
    { label: '₹5,000', value: 5000, desc: 'Micro Ticket' },
    { label: '₹25,000', value: 25000, desc: 'Syndicate Tier' },
    { label: '₹50,000', value: 50000, desc: 'Growth Ticket' },
    { label: '₹1,00,000', value: 100000, desc: 'Lead Angel' },
  ];

  const [selectedTicket, setSelectedTicket] = useState(tickets[0]);
  const [upiId, setUpiId] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirmInvestment = () => {
    if (!agreedTerms) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Terms Required', 'Please accept the SEBI Angel Network Syndicate disclosure to proceed.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        'Allocation Request Confirmed! 🚀',
        `Your allocation request of ₹${selectedTicket.value.toLocaleString('en-IN')} for ${startup.name} has been placed into the SEBI-regulated Escrow account.\n\nDematerialized CCPS / Equity shares will be credited to your Demat within 7 working days following round closing.`,
        [
          {
            text: 'View Syndicate Dashboard',
            onPress: () => {
              onClose();
            },
          },
        ]
      );
    }, 1200);
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
              <View style={styles.stageTag}>
                <Text style={styles.stageText}>{startup.stage}</Text>
              </View>
              <Text style={styles.title}>Co-Invest in {startup.name}</Text>
              <Text style={styles.subtitle}>
                Valuation: {startup.valuation} • Target: {startup.target}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
            {/* Round Status Banner */}
            <View style={styles.statusBanner}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Round Progress</Text>
                <Text style={styles.statusValue}>{startup.raised} ({startup.percentFilled}% Filled)</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.min(startup.percentFilled || 75, 100)}%` }]} />
              </View>
            </View>

            {/* Ticket Selector */}
            <Text style={styles.sectionTitle}>Select Investment Commitment</Text>
            <View style={styles.ticketGrid}>
              {tickets.map((t) => {
                const isSelected = selectedTicket.value === t.value;
                return (
                  <TouchableOpacity
                    key={t.value}
                    style={[styles.ticketCard, isSelected && styles.ticketCardActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedTicket(t);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.ticketAmt, isSelected && styles.ticketAmtActive]}>
                      {t.label}
                    </Text>
                    <Text style={[styles.ticketDesc, isSelected && styles.ticketDescActive]}>
                      {t.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Financial Details Box */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Investment Amount</Text>
                <Text style={styles.summaryValue}>₹{selectedTicket.value.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Instrument Type</Text>
                <Text style={styles.summaryValue}>Compulsorily Convertible (CCPS)</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Syndicate Escrow Fee</Text>
                <Text style={[styles.summaryValue, { color: colors.primary }]}>₹0 (Waived for Pro Members)</Text>
              </View>
              <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.summaryLabel}>Allotment Depository</Text>
                <Text style={styles.summaryValue}>CDSL / NSDL Direct Demat</Text>
              </View>
            </View>

            {/* Syndicate Lead Info */}
            <View style={styles.leadBox}>
              <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.leadTitle}>Backed by Institutional Lead Investors</Text>
                <Text style={styles.leadSub}>
                  Co-invest on matching commercial terms with: {startup.leadInvestors ? startup.leadInvestors.join(', ') : 'Marquee Angel Network & VCs'}
                </Text>
              </View>
            </View>

            {/* UPI ID / Payment Option */}
            <Text style={styles.sectionTitle}>UPI Payment Mandate</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="card-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter UPI ID (e.g. mobile@okhdfcbank)"
                placeholderTextColor={colors.textMuted}
                value={upiId}
                onChangeText={setUpiId}
                autoCapitalize="none"
              />
            </View>

            {/* SEBI Compliance Undertaking */}
            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => {
                Haptics.selectionAsync();
                setAgreedTerms(!agreedTerms);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, agreedTerms && styles.checkboxActive]}>
                {agreedTerms && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <Text style={styles.termsText}>
                I confirm that I understand startup investments carry equity risk, illiquidity, and I agree to the SEBI Angel Syndicate Terms & Conditions.
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Action Button */}
          <TouchableOpacity
            style={styles.confirmBtn}
            activeOpacity={0.85}
            onPress={handleConfirmInvestment}
            disabled={isSubmitting}
          >
            <LinearGradient
              colors={[colors.primary, '#059669']}
              style={styles.confirmBtnGrad}
            >
              <Ionicons name="lock-closed" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.confirmBtnText}>
                {isSubmitting ? 'Securing Allocation...' : `Confirm & Commit ₹${selectedTicket.value.toLocaleString('en-IN')}`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  stageTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(168, 85, 247, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  stageText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  title: {
    fontSize: 20,
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
    marginTop: 14,
    marginBottom: 14,
  },
  statusBanner: {
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statusValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  ticketGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  ticketCard: {
    width: '48%',
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  ticketCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
  },
  ticketAmt: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.text,
  },
  ticketAmtActive: {
    color: colors.primary,
  },
  ticketDesc: {
    fontSize: 10.5,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  ticketDescActive: {
    color: colors.text,
  },
  summaryCard: {
    backgroundColor: '#141E2E',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  leadBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
    marginBottom: 16,
  },
  leadTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  leadSub: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
    marginTop: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  textInput: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termsText: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  confirmBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
  },
  confirmBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
