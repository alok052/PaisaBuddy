import React, { useState, useEffect } from 'react';
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

  // Extract base minimum amount
  const minNumeric = parseInt((startup.minInvestment || '₹10,000').replace(/[^\d]/g, ''), 10) || 10000;

  const tickets = [
    { label: `₹${minNumeric.toLocaleString('en-IN')}`, value: minNumeric, desc: 'Minimum Cheque' },
    { label: `₹${(minNumeric * 2).toLocaleString('en-IN')}`, value: minNumeric * 2, desc: 'Syndicate Tier' },
    { label: `₹${(minNumeric * 5).toLocaleString('en-IN')}`, value: minNumeric * 5, desc: 'Growth Ticket' },
    { label: `₹${(minNumeric * 10).toLocaleString('en-IN')}`, value: minNumeric * 10, desc: 'Lead Angel' },
  ];

  const [selectedTicket, setSelectedTicket] = useState(tickets[0]);
  const [dematId, setDematId] = useState('');
  const [upiId, setUpiId] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setSelectedTicket(tickets[0]);
  }, [startup]);

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
        `Your allocation request of ₹${selectedTicket.value.toLocaleString('en-IN')} for ${startup.name} has been placed into the SEBI-regulated Escrow account (${startup.escrowBank || 'ICICI Bank Escrow'}).\n\nDematerialized CCPS shares will be credited to your Demat (${dematId.trim() || 'CDSL BO-ID On File'}) within 7 working days following round closing.`,
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
          {/* Drag Indicator */}
          <View style={styles.handleBar}>
            <View style={styles.handleIndicator} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.stageTag}>
                <Text style={styles.stageText}>{startup.stage}</Text>
              </View>
              <Text style={styles.title}>Co-Invest in {startup.name}</Text>
              <Text style={styles.subtitle}>
                Valuation: {startup.valuation} • Cheque from {startup.minInvestment}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
            {/* Whale Backer Spotlight */}
            {startup.whaleBacker && (
              <View style={styles.whaleCoInvestBox}>
                <Ionicons name="shield-checkmark" size={15} color="#10B981" />
                <Text style={styles.whaleCoInvestText}>
                  Co-investing on matching terms with <Text style={{ color: '#10B981', fontWeight: '800' }}>{startup.whaleBacker}</Text>
                </Text>
              </View>
            )}

            {/* Round Status Banner */}
            <View style={styles.statusBanner}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Round Progress</Text>
                <Text style={styles.statusValue}>
                  {startup.raisedSoFar} of {startup.targetAmount} ({startup.progressPercent}% Filled)
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.min(startup.progressPercent || 85, 100)}%` }]} />
              </View>
            </View>

            {/* Ticket Selector */}
            <Text style={styles.sectionTitle}>SELECT INVESTMENT COMMITMENT</Text>
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

            {/* Demat Input Box */}
            <Text style={styles.sectionTitle}>CDSL / NSDL DEMAT ACCOUNT</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="wallet-outline" size={17} color="#64748B" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.textInput}
                placeholder="16-Digit Demat BO-ID (e.g. 12081600...)"
                placeholderTextColor="#64748B"
                value={dematId}
                onChangeText={setDematId}
                autoCapitalize="characters"
              />
            </View>

            {/* UPI ID / Payment Option */}
            <Text style={styles.sectionTitle}>UPI ESCROW PAYMENT MANDATE</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="card-outline" size={17} color="#64748B" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.textInput}
                placeholder="UPI ID (e.g. mobile@okaxis)"
                placeholderTextColor="#64748B"
                value={upiId}
                onChangeText={setUpiId}
                autoCapitalize="none"
              />
            </View>

            {/* Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Investment Amount</Text>
                <Text style={styles.summaryValue}>₹{selectedTicket.value.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Instrument Type</Text>
                <Text style={styles.summaryValue}>{startup.instrument || 'Compulsorily Convertible (CCPS)'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Escrow Trustee</Text>
                <Text style={styles.summaryValue}>{startup.escrowBank || 'ICICI Bank / Axis Trustee'}</Text>
              </View>
              <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.summaryLabel}>Syndicate Platform Fee</Text>
                <Text style={[styles.summaryValue, { color: '#10B981' }]}>₹0 (Waived for Pro Members)</Text>
              </View>
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
                {agreedTerms && <Ionicons name="checkmark" size={13} color="#052E16" />}
              </View>
              <Text style={styles.termsText}>
                I confirm that I understand startup investments carry equity risk, illiquidity, and I agree to the SEBI Angel Syndicate Terms & Escrow Conditions.
              </Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Action Button */}
          <TouchableOpacity
            style={styles.confirmBtn}
            activeOpacity={0.85}
            onPress={handleConfirmInvestment}
            disabled={isSubmitting}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.confirmBtnGrad}
            >
              <Ionicons name="lock-closed" size={15} color="#052E16" style={{ marginRight: 6 }} />
              <Text style={styles.confirmBtnText}>
                {isSubmitting ? 'Securing Escrow Allocation...' : `Commit ₹${selectedTicket.value.toLocaleString('en-IN')} via Escrow`}
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
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0A0E17',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    maxHeight: '92%',
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  handleBar: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  handleIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  stageTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  stageText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#60A5FA',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
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
  scrollArea: {
    paddingTop: 12,
  },
  whaleCoInvestBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    padding: 9,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginBottom: 12,
    gap: 6,
  },
  whaleCoInvestText: {
    fontSize: 11,
    color: '#CBD5E1',
    flex: 1,
  },
  statusBanner: {
    backgroundColor: '#0F1622',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 14,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '700',
  },
  statusValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
  },
  progressBarBg: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 6,
  },
  ticketGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  ticketCard: {
    width: '48.5%',
    backgroundColor: '#0F1622',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  ticketCardActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  ticketAmt: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ticketAmtActive: {
    color: '#10B981',
  },
  ticketDesc: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 2,
  },
  ticketDescActive: {
    color: '#10B981',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1622',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    paddingVertical: 0,
  },
  summaryCard: {
    backgroundColor: '#0F1622',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  summaryLabel: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 14,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  termsText: {
    fontSize: 10,
    color: '#94A3B8',
    flex: 1,
    lineHeight: 14,
  },
  confirmBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  confirmBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  confirmBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#052E16',
  },
});
