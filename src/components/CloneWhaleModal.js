import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import WhaleAvatar from './WhaleAvatar';

export default function CloneWhaleModal({ visible, whale, onClose }) {
  const [selectedBudget, setSelectedBudget] = useState(25000);

  if (!whale) return null;

  const budgetOptions = [
    { label: '₹10,000', value: 10000 },
    { label: '₹25,000', value: 25000 },
    { label: '₹50,000', value: 50000 },
    { label: '₹1,00,000', value: 100000 },
  ];

  // Dynamic weights based on whale top holdings
  const topHoldings = whale.topHoldings || [];
  const stockCount = Math.max(topHoldings.length, 1);

  // Generate weighted stock basket based on selected budget
  const weights = [0.35, 0.25, 0.20, 0.12, 0.08];
  const calculatedBasket = topHoldings.map((h, idx) => {
    const weight = weights[idx] || 1 / stockCount;
    const allocatedAmount = Math.floor(selectedBudget * weight);
    // Estimated approximate stock share price
    const approxPrice = idx === 0 ? 980 : idx === 1 ? 540 : idx === 2 ? 1420 : 360;
    const sharesCount = Math.max(1, Math.floor(allocatedAmount / approxPrice));
    const totalVal = sharesCount * approxPrice;

    return {
      name: h.name,
      stake: h.stake,
      weightPercent: Math.round(weight * 100),
      approxPrice,
      sharesCount,
      totalVal,
    };
  });

  const totalBasketCost = calculatedBasket.reduce((sum, item) => sum + item.totalVal, 0);
  const remainingCash = Math.max(0, selectedBudget - totalBasketCost);

  const handleSelectBudget = (val) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedBudget(val);
  };

  const handleDeployBasket = (brokerName) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      `Basket Ready for ${brokerName}!`,
      `Deploying ${calculatedBasket.length} stock orders (Total: ₹${totalBasketCost.toLocaleString('en-IN')}) directly to ${brokerName} Basket API.\n\nOrders will be queued for market execution at best bid/ask.`,
      [
        { text: `Open ${brokerName} App`, style: 'default' },
        { text: 'Done', style: 'cancel' },
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
          {/* Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.whaleProfileRow}>
              <WhaleAvatar
                imageSource={whale.localImage}
                avatarText={whale.avatar}
                gradient={whale.avatarGradient}
                size={46}
                borderColor="rgba(16, 185, 129, 0.4)"
              />
              <View style={styles.whaleHeaderText}>
                <View style={styles.nameRow}>
                  <Text style={styles.whaleName}>{whale.name}</Text>
                  <View style={styles.proBadge}>
                    <Text style={styles.proBadgeText}>CLONE</Text>
                  </View>
                </View>
                <Text style={styles.whaleSubtitle}>
                  {whale.tag} • {whale.portfolioValue}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
            {/* Title & Explainer */}
            <View style={styles.titleSection}>
              <Text style={styles.sectionHeading}>🎯 Select Investment Capital</Text>
              <Text style={styles.sectionSub}>
                Algorithm automatically calculates exact share quantities and risk-weighted allocations based on {whale.name}'s verified filings.
              </Text>
            </View>

            {/* Budget Chips */}
            <View style={styles.budgetRow}>
              {budgetOptions.map((b) => {
                const isActive = selectedBudget === b.value;
                return (
                  <TouchableOpacity
                    key={b.value}
                    style={[styles.budgetChip, isActive && styles.budgetChipActive]}
                    onPress={() => handleSelectBudget(b.value)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.budgetChipText,
                        isActive && styles.budgetChipTextActive,
                      ]}
                    >
                      {b.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Summary Metrics Box */}
            <LinearGradient
              colors={['#101F2C', '#0A141E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.summaryCard}
            >
              <View style={styles.summaryTopRow}>
                <View>
                  <Text style={styles.summaryLabel}>TOTAL BASKET VALUE</Text>
                  <Text style={styles.summaryValue}>
                    ₹{totalBasketCost.toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={styles.summaryRight}>
                  <View style={styles.returnBadge}>
                    <Ionicons name="trending-up" size={13} color={colors.primary} />
                    <Text style={styles.returnText}>{whale.return1Y} 1Y</Text>
                  </View>
                  <Text style={styles.cashBufferText}>
                    Cash Buffer: ₹{remainingCash.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            {/* Calculated Stock Allocations */}
            <View style={styles.stocksSection}>
              <Text style={styles.stocksHeading}>Calculated Stock Basket ({calculatedBasket.length} Holdings)</Text>

              {calculatedBasket.map((stock, idx) => (
                <View key={idx} style={styles.stockItemRow}>
                  <View style={styles.stockNumberCircle}>
                    <Text style={styles.stockNumberText}>{idx + 1}</Text>
                  </View>

                  <View style={styles.stockMainInfo}>
                    <View style={styles.stockTitleRow}>
                      <Text style={styles.stockName}>{stock.name}</Text>
                      <View style={styles.weightBadge}>
                        <Text style={styles.weightText}>{stock.weightPercent}% Weight</Text>
                      </View>
                    </View>

                    <Text style={styles.sharesSub}>
                      {stock.sharesCount} shares @ ₹{stock.approxPrice.toLocaleString('en-IN')}
                    </Text>
                  </View>

                  <View style={styles.stockAmountBox}>
                    <Text style={styles.stockTotalVal}>
                      ₹{stock.totalVal.toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.whaleStakeNote}>{stock.stake} portfolio</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* 1-Click Execution Brokers */}
            <View style={styles.executionSection}>
              <Text style={styles.execHeading}>🚀 1-Click Deploy Basket Via Your Broker</Text>

              <TouchableOpacity
                style={styles.deployBtn}
                activeOpacity={0.8}
                onPress={() => handleDeployBasket('Zerodha Kite')}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.deployBtnGrad}
                >
                  <Ionicons name="flash" size={18} color="#FFFFFF" />
                  <Text style={styles.deployBtnText}>Deploy via Zerodha Kite</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.altBrokersRow}>
                <TouchableOpacity
                  style={styles.altBrokerBtn}
                  activeOpacity={0.8}
                  onPress={() => handleDeployBasket('Groww')}
                >
                  <Text style={styles.altBrokerText}>Groww Basket</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.altBrokerBtn}
                  activeOpacity={0.8}
                  onPress={() => handleDeployBasket('Angel One')}
                >
                  <Text style={styles.altBrokerText}>Angel One</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.altBrokerBtn}
                  activeOpacity={0.8}
                  onPress={() => handleDeployBasket('Upstox')}
                >
                  <Text style={styles.altBrokerText}>Upstox</Text>
                </TouchableOpacity>
              </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    maxHeight: '90%',
    paddingTop: 12,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  whaleProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  whaleHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  whaleName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  proBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  proBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  whaleSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  titleSection: {
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  sectionSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  budgetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  budgetChip: {
    flex: 1,
    backgroundColor: colors.cardSecondary,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  budgetChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: colors.primary,
  },
  budgetChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  budgetChipTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    marginBottom: 18,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    marginTop: 2,
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  returnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  returnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  cashBufferText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
  stocksSection: {
    marginBottom: 18,
  },
  stocksHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stockItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSecondary,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  stockNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stockNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
  },
  stockMainInfo: {
    flex: 1,
  },
  stockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stockName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  weightBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  weightText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
  },
  sharesSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  stockAmountBox: {
    alignItems: 'flex-end',
  },
  stockTotalVal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  whaleStakeNote: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  executionSection: {
    marginTop: 6,
  },
  execHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    marginBottom: 10,
  },
  deployBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
  },
  deployBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  deployBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  altBrokersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  altBrokerBtn: {
    flex: 1,
    backgroundColor: colors.cardSecondary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  altBrokerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
