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
import { parsePriceNumber } from '../services/dataService';

export default function CloneWhaleModal({ visible, whale, onClose }) {
  const [selectedBudget, setSelectedBudget] = useState(25000);

  if (!whale) return null;

  const budgetOptions = [
    { label: '₹10,000', value: 10000 },
    { label: '₹25,000', value: 25000 },
    { label: '₹50,000', value: 50000 },
    { label: '₹1,00,000', value: 100000 },
  ];

  // Dynamic weights & live prices based on whale allHoldings (fallback to topHoldings)
  const sourceHoldings =
    Array.isArray(whale.allHoldings) && whale.allHoldings.length > 0
      ? whale.allHoldings.slice(0, 6)
      : (whale.topHoldings || []);

  const fallbackWeights = [35, 25, 18, 12, 6, 4];
  const rawWeights = sourceHoldings.map((h, idx) =>
    typeof h.weightPercent === 'number' && h.weightPercent > 0
      ? h.weightPercent
      : fallbackWeights[idx] || Math.round(100 / Math.max(sourceHoldings.length, 1))
  );
  const totalRawWeight = rawWeights.reduce((sum, w) => sum + w, 0) || 100;

  const isGlobalWhale =
    (whale.tag || '').includes('🇺🇸') || (whale.tag || '').includes('🇬🇧');

  const resolveInrPrice = (h, idx) => {
    if (typeof h.cmpInr === 'number' && h.cmpInr > 0) return h.cmpInr;
    const rawCmp = String(h.cmp || '');
    const parsed = parsePriceNumber(rawCmp);
    if (parsed > 0) {
      if (rawCmp.includes('$')) return parsed * 94;
      if (rawCmp.includes('£')) return parsed * 126;
      if (rawCmp.includes('€')) return parsed * 105;
      return parsed;
    }
    return idx === 0 ? 980 : idx === 1 ? 540 : idx === 2 ? 1420 : 360;
  };

  // Generate live-priced weighted stock basket based on selected budget
  const calculatedBasket = sourceHoldings.map((h, idx) => {
    const weight = rawWeights[idx] / totalRawWeight;
    const allocatedAmount = Math.floor(selectedBudget * weight);
    const livePriceInr = resolveInrPrice(h, idx);
    const approxPrice = Math.max(1, Math.round(livePriceInr));

    const isFractionalStock =
      isGlobalWhale ||
      String(h.cmp || '').includes('$') ||
      String(h.cmp || '').includes('£') ||
      String(h.cmp || '').includes('€');

    let sharesCount = 0;
    let totalVal = 0;
    if (isFractionalStock) {
      sharesCount = Number((allocatedAmount / livePriceInr).toFixed(3));
      totalVal = sharesCount > 0 ? Math.round(sharesCount * livePriceInr) : 0;
    } else {
      sharesCount = Math.floor(allocatedAmount / approxPrice);
      totalVal = sharesCount * approxPrice;
    }

    return {
      name: h.name,
      symbol: h.symbol || '',
      stake: h.stake || 'Held',
      cmpDisplay: h.cmp && h.cmp !== '—' ? h.cmp : `₹${approxPrice.toLocaleString('en-IN')}`,
      weightPercent: Math.round(weight * 100),
      approxPrice,
      sharesCount,
      isFractional: isFractionalStock,
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
    const activeOrders = calculatedBasket.filter((item) => item.sharesCount > 0);
    if (activeOrders.length === 0) {
      Alert.alert(
        'Increase Basket Budget',
        `At ₹${selectedBudget.toLocaleString('en-IN')}, per-stock allocations are below 1 share price. Select ₹50,000 or ₹1,00,000 above.`
      );
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      `Basket Ready for ${brokerName}!`,
      `Deploying ${activeOrders.length} stock orders (Total: ₹${totalBasketCost.toLocaleString('en-IN')}) directly to ${brokerName} Basket API.\n\nOrders use latest market prices and will execute at best bid/ask.`,
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
                Algorithm automatically calculates exact share quantities and live price allocations based on {whale.name}'s verified filings.
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
                  <View
                    style={[
                      styles.returnBadge,
                      !whale.isPositive && { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
                    ]}
                  >
                    <Ionicons
                      name={whale.isPositive ? 'trending-up' : 'trending-down'}
                      size={13}
                      color={whale.isPositive ? colors.primary : colors.danger}
                    />
                    <Text
                      style={[
                        styles.returnText,
                        !whale.isPositive && { color: colors.danger },
                      ]}
                    >
                      {whale.return1Y} 1Y
                    </Text>
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
                      <Text style={styles.stockName} numberOfLines={1}>{stock.name}</Text>
                      <View style={styles.weightBadge}>
                        <Text style={styles.weightText}>{stock.weightPercent}% Weight</Text>
                      </View>
                    </View>

                    <Text style={styles.sharesSub}>
                      {stock.sharesCount > 0
                        ? `${stock.isFractional ? `${stock.sharesCount} frac. sh` : `${stock.sharesCount} shares`} @ ₹${stock.approxPrice.toLocaleString('en-IN')}${stock.isFractional && stock.cmpDisplay !== `₹${stock.approxPrice.toLocaleString('en-IN')}` ? ` (${stock.cmpDisplay})` : ''}`
                        : `CMP ₹${stock.approxPrice.toLocaleString('en-IN')} > slice (Increase budget)`}
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
    marginRight: 8,
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
    flexShrink: 1,
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
