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

export default function IPOBidModal({ visible, ipo, onClose }) {
  if (!ipo) return null;

  const [lotCount, setLotCount] = useState(1);
  const [upiId, setUpiId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parse numerical min investment if available, default to ₹15,000
  const baseInvestment = 15000;
  const totalAmount = baseInvestment * lotCount;
  const estimatedProfitPerLot = 12500; // estimated GMP listing gains
  const totalProfit = estimatedProfitPerLot * lotCount;

  const handleConfirmBid = () => {
    if (!upiId.trim() || !upiId.includes('@')) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Valid UPI Required', 'Please enter your bank UPI ID (e.g., yourname@okhdfcbank) to create the ASBA blocking mandate.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        'ASBA UPI Mandate Initiated! 🟢',
        `A blocking request for ₹${totalAmount.toLocaleString('en-IN')} has been sent to ${upiId}.\n\nPlease approve the mandate in your UPI app (Google Pay / PhonePe / Paytm / BHIM) before 5:00 PM on ${ipo.closeDate}.\n\nFunds remain safely in your bank account until allotment is finalized on ${ipo.allotmentDate || 'Nov 12'}.`,
        [
          {
            text: 'Track Allotment Status',
            onPress: () => onClose(),
          },
        ]
      );
    }, 1200);
  };

  const handleBrokerRedirect = (brokerName) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      `Redirecting to ${brokerName}`,
      `Opening ${ipo.name} IPO application order form on ${brokerName} mobile app...`,
      [{ text: 'OK', onPress: () => onClose() }]
    );
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
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{ipo.category} IPO</Text>
                </View>
                <View style={[styles.gmpBadge, { backgroundColor: 'rgba(16, 185, 129, 0.18)' }]}>
                  <Ionicons name="trending-up" size={12} color={colors.primary} />
                  <Text style={styles.gmpBadgeText}>GMP {ipo.gmpPercent} ({ipo.gmpPrice})</Text>
                </View>
              </View>
              <Text style={styles.title}>{ipo.name}</Text>
              <Text style={styles.subtitle}>
                Price Band: {ipo.priceBand} • Lot: {ipo.lotSize} Shares
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
            {/* Timeline Row */}
            <View style={styles.timelineCard}>
              <View style={styles.timelineItem}>
                <Text style={styles.timelineDate}>{ipo.openDate}</Text>
                <Text style={styles.timelineLbl}>Bidding Opens</Text>
              </View>
              <View style={styles.timelineDivider} />
              <View style={styles.timelineItem}>
                <Text style={[styles.timelineDate, { color: colors.warning }]}>{ipo.closeDate}</Text>
                <Text style={styles.timelineLbl}>Bidding Closes</Text>
              </View>
              <View style={styles.timelineDivider} />
              <View style={styles.timelineItem}>
                <Text style={[styles.timelineDate, { color: colors.primary }]}>{ipo.listingDate}</Text>
                <Text style={styles.timelineLbl}>BSE/NSE Listing</Text>
              </View>
            </View>

            {/* Lot Counter */}
            <Text style={styles.sectionTitle}>Select Bid Quantity (Lots)</Text>
            <View style={styles.lotRow}>
              {[1, 2, 5, 10].map((num) => {
                const isSelected = lotCount === num;
                return (
                  <TouchableOpacity
                    key={num}
                    style={[styles.lotPill, isSelected && styles.lotPillActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setLotCount(num);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.lotPillNum, isSelected && styles.lotPillNumActive]}>
                      {num} {num === 1 ? 'Lot' : 'Lots'}
                    </Text>
                    <Text style={[styles.lotPillSub, isSelected && styles.lotPillSubActive]}>
                      ₹{(baseInvestment * num).toLocaleString('en-IN')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Expected Returns Calculation */}
            <View style={styles.calcCard}>
              <View style={styles.calcRow}>
                <Text style={styles.calcLbl}>Total ASBA Block Amount:</Text>
                <Text style={styles.calcVal}>₹{totalAmount.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.calcRow}>
                <Text style={styles.calcLbl}>Bid Price Setting:</Text>
                <Text style={[styles.calcVal, { color: colors.primary }]}>Cut-Off Price (Recommended)</Text>
              </View>
              <View style={[styles.calcRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.calcLbl}>Projected Listing Gain:</Text>
                <Text style={[styles.calcVal, { color: colors.warning, fontWeight: '900' }]}>
                  +₹{totalProfit.toLocaleString('en-IN')} ({ipo.gmpPercent})
                </Text>
              </View>
            </View>

            {/* AI Verdict Box */}
            <View style={[styles.verdictBox, { borderColor: ipo.verdictColor + '40' }]}>
              <View style={styles.verdictHeader}>
                <Ionicons name="sparkles" size={14} color={ipo.verdictColor} />
                <Text style={[styles.verdictBadge, { color: ipo.verdictColor }]}>
                  AI RECOMMENDATION: {ipo.verdict}
                </Text>
              </View>
              <Text style={styles.verdictReason}>{ipo.verdictReason}</Text>
            </View>

            {/* UPI ASBA Input */}
            <Text style={styles.sectionTitle}>Submit UPI ASBA Mandate</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="phone-portrait-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter UPI ID (e.g. mobile@okhdfcbank)"
                placeholderTextColor={colors.textMuted}
                value={upiId}
                onChangeText={setUpiId}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={styles.submitBidBtn}
              activeOpacity={0.85}
              onPress={handleConfirmBid}
              disabled={isSubmitting}
            >
              <LinearGradient
                colors={[colors.warning, '#D97706']}
                style={styles.submitBidGrad}
              >
                <Ionicons name="flash" size={16} color="#000000" style={{ marginRight: 6 }} />
                <Text style={styles.submitBidText}>
                  {isSubmitting ? 'Requesting UPI Mandate...' : `Place UPI Bid (₹${totalAmount.toLocaleString('en-IN')})`}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Or Quick-Launch Broker */}
            <View style={styles.orDivider}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR APPLY VIA BROKER CONSOLE</Text>
              <View style={styles.orLine} />
            </View>

            <View style={styles.brokerGrid}>
              <TouchableOpacity
                style={styles.brokerBtn}
                activeOpacity={0.8}
                onPress={() => handleBrokerRedirect('Zerodha Kite')}
              >
                <Text style={styles.brokerBtnText}>Zerodha Kite</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.brokerBtn}
                activeOpacity={0.8}
                onPress={() => handleBrokerRedirect('Groww')}
              >
                <Text style={styles.brokerBtnText}>Groww</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.brokerBtn}
                activeOpacity={0.8}
                onPress={() => handleBrokerRedirect('Angel One')}
              >
                <Text style={styles.brokerBtnText}>Angel One</Text>
              </TouchableOpacity>
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
    maxHeight: '92%',
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
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  gmpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gmpBadgeText: {
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
  },
  timelineCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  timelineItem: {
    flex: 1,
    alignItems: 'center',
  },
  timelineDate: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  timelineLbl: {
    fontSize: 9.5,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  timelineDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#334155',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  lotRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  lotPill: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  lotPillActive: {
    borderColor: colors.warning,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  lotPillNum: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  lotPillNumActive: {
    color: colors.warning,
  },
  lotPillSub: {
    fontSize: 9.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  lotPillSubActive: {
    color: colors.text,
  },
  calcCard: {
    backgroundColor: '#141E2E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  calcLbl: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  calcVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  verdictBox: {
    backgroundColor: '#101A28',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  verdictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  verdictBadge: {
    fontSize: 11,
    fontWeight: '800',
  },
  verdictReason: {
    fontSize: 11.5,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  textInput: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
  },
  submitBidBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  submitBidGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  submitBidText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  orText: {
    fontSize: 9.5,
    color: colors.textMuted,
    fontWeight: '700',
  },
  brokerGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  brokerBtn: {
    flex: 1,
    backgroundColor: colors.surfaceHighlight,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  brokerBtnText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
});
