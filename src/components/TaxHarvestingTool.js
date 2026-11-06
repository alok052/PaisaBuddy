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

export default function TaxHarvestingTool({ onClose }) {
  // Financial Year Inputs
  const [realizedLtcg, setRealizedLtcg] = useState(0);
  const [unrealizedLtcg, setUnrealizedLtcg] = useState(125000);
  const [unrealizedStcl, setUnrealizedStcl] = useState(0);

  // Sample Interactive Holdings for Simulation
  const [holdings, setHoldings] = useState([
    {
      id: 'rel',
      name: 'Reliance Industries',
      type: 'Stock',
      gain: 38500,
      holdingDays: 420,
      isLtcg: true,
      selected: true,
      quantity: 40,
    },
    {
      id: 'tatamotors',
      name: 'Tata Motors',
      type: 'Stock',
      gain: 46200,
      holdingDays: 530,
      isLtcg: true,
      selected: true,
      quantity: 110,
    },
    {
      id: 'ppfas',
      name: 'Parag Parikh Flexi Cap',
      type: 'Mutual Fund',
      gain: 36400,
      holdingDays: 640,
      isLtcg: true,
      selected: true,
      quantity: 520,
    },
    {
      id: 'hdfcbank',
      name: 'HDFC Bank',
      type: 'Stock',
      gain: 54000,
      holdingDays: 480,
      isLtcg: true,
      selected: false,
      quantity: 85,
    },
    {
      id: 'paytm',
      name: 'Paytm (Loss Offset)',
      type: 'Stock',
      gain: -18500,
      holdingDays: 190,
      isLtcg: false,
      selected: false,
      quantity: 60,
    },
  ]);

  const realizedOptions = [
    { label: '₹0 (None)', value: 0 },
    { label: '₹25,000', value: 25000 },
    { label: '₹50,000', value: 50000 },
    { label: '₹1,00,000', value: 100000 },
  ];

  const unrealizedOptions = [
    { label: '₹50,000', value: 50000 },
    { label: '₹1,00,000', value: 100000 },
    { label: '₹1,25,000', value: 125000 },
    { label: '₹2,50,000', value: 250000 },
    { label: '₹5,00,000', value: 500000 },
  ];

  const lossOptions = [
    { label: '₹0 (None)', value: 0 },
    { label: '₹20,000', value: 20000 },
    { label: '₹50,000', value: 50000 },
    { label: '₹1,00,000', value: 100000 },
  ];

  // Core Section 112A Mathematics
  const annualExemptionLimit = 125000; // Post-Budget 2024 revision
  const remainingFreeLimit = Math.max(0, annualExemptionLimit - realizedLtcg);
  const recommendedHarvest = Math.min(unrealizedLtcg, remainingFreeLimit);

  // Direct Tax Savings (12.5% LTCG + 20% STCG offset)
  const directLtcgTaxSaved = Math.round(recommendedHarvest * 0.125);
  const lossHarvestSavings = Math.round(unrealizedStcl * 0.20);
  const totalImmediateTaxSaved = directLtcgTaxSaved + lossHarvestSavings;

  // 15-Year Compounding Wealth (Investing saved tax at 14% CAGR)
  // Formula: P * [((1+r)^n - 1) / r] * (1+r)
  const r = 0.14;
  const n = 15;
  const compoundingMultiplier = ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  const extraFamilyWealth15Y = Math.round(directLtcgTaxSaved * compoundingMultiplier);

  // Selected holdings calculation
  const selectedHoldings = holdings.filter((h) => h.selected);
  const totalHarvestGainSelected = selectedHoldings
    .filter((h) => h.gain > 0)
    .reduce((sum, h) => sum + h.gain, 0);
  const totalLossSelected = Math.abs(
    selectedHoldings.filter((h) => h.gain < 0).reduce((sum, h) => sum + h.gain, 0)
  );

  const toggleHolding = (id) => {
    Haptics.selectionAsync();
    setHoldings((prev) =>
      prev.map((h) => (h.id === id ? { ...h, selected: !h.selected } : h))
    );
  };

  const handleBrokerRedirect = (broker) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      `Ready to Harvest via ${broker}!`,
      `Harvest Plan:\n• Sell ₹${totalHarvestGainSelected.toLocaleString('en-IN')} long-term gains\n• Buyback on same day/next day to reset cost basis higher\n• Tax Saved: ₹${Math.round(totalHarvestGainSelected * 0.125).toLocaleString('en-IN')}\n• Net STT & Brokerage: ~₹110\n\nRedirecting to ${broker} order console...`,
      [
        { text: `Open ${broker} App`, style: 'default' },
        { text: 'Done', style: 'cancel' },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Tool Header */}
      <View style={styles.header}>
        <View style={styles.headerIconWrapper}>
          <Ionicons name="calculator" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.headerTitle}>Tax-Free LTCG Harvestor</Text>
          <Text style={styles.headerSubtitle}>
            Section 112A Income Tax Exemption & Cost Basis Reset Engine
          </Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* March 31 Deadline Urgency Banner */}
      <LinearGradient
        colors={['#1E1A0E', '#141208']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.deadlineBanner}
      >
        <View style={styles.deadlineLeft}>
          <View style={styles.deadlineBadge}>
            <Ionicons name="alarm" size={13} color={colors.warning} />
            <Text style={styles.deadlineBadgeText}>FY 2024-25 DEADLINE</Text>
          </View>
          <Text style={styles.deadlineTitle}>March 31 "Use It or Lose It" Rule</Text>
          <Text style={styles.deadlineDesc}>
            Your ₹1.25 Lakh tax-free quota expires every March 31. Unused limit does NOT carry forward. Harvesting resets your purchase price higher with ₹0 tax liability!
          </Text>
        </View>
      </LinearGradient>

      {/* STEP 1: CURRENT FINANCIAL YEAR POSITION */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>1. REALIZED LTCG BOOKED SO FAR THIS YEAR</Text>
        <Text style={styles.sectionHelper}>
          Total long-term profit already booked in your Demat/MF accounts since April 1, 2024.
        </Text>
        <View style={styles.pillRow}>
          {realizedOptions.map((opt) => {
            const isSelected = realizedLtcg === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.pill, isSelected && styles.pillActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setRealizedLtcg(opt.value);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 14 }]}>
          2. YOUR UNREALIZED LONG-TERM GAINS (>365 DAYS)
        </Text>
        <Text style={styles.sectionHelper}>
          Profit sitting in stocks/funds held over 1 year waiting to be harvested.
        </Text>
        <View style={styles.pillRow}>
          {unrealizedOptions.map((opt) => {
            const isSelected = unrealizedLtcg === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.pill, isSelected && styles.pillActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setUnrealizedLtcg(opt.value);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 14 }]}>
          3. UNREALIZED SHORT-TERM LOSSES (OPTIONAL TAX OFFSET)
        </Text>
        <Text style={styles.sectionHelper}>
          Stocks sitting in loss (under 1 year) that can offset 20% short-term tax.
        </Text>
        <View style={styles.pillRow}>
          {lossOptions.map((opt) => {
            const isSelected = unrealizedStcl === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.pill, isSelected && styles.pillActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setUnrealizedStcl(opt.value);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* LIVE DIAGNOSTIC IMPACT RESULT */}
      <View style={styles.diagnosticCard}>
        <View style={styles.diagHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.diagSub}>SECTION 112A QUOTA STATUS</Text>
            <Text style={styles.diagQuotaTitle}>
              ₹{remainingFreeLimit.toLocaleString('en-IN')} Free Limit Available
            </Text>
          </View>
          <View style={styles.freeTaxBadge}>
            <Ionicons name="shield-checkmark" size={13} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.freeTaxBadgeText}>100% TAX FREE</Text>
          </View>
        </View>

        {/* Visual Progress Bar */}
        <View style={styles.progressBarWrapper}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(100, (realizedLtcg / annualExemptionLimit) * 100)}%` },
            ]}
          />
        </View>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabelText}>
            Used: ₹{realizedLtcg.toLocaleString('en-IN')}
          </Text>
          <Text style={[styles.progressLabelText, { color: colors.primary, fontWeight: '700' }]}>
            Claimable: ₹{remainingFreeLimit.toLocaleString('en-IN')}
          </Text>
        </View>

        {/* 3 Metric Output Grid */}
        <View style={styles.matrixRow}>
          <View style={styles.matrixCol}>
            <Text style={styles.matrixLbl}>Direct Cash Tax Saved</Text>
            <Text style={[styles.matrixVal, { color: colors.primary }]}>
              ₹{directLtcgTaxSaved.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.matrixSub}>12.5% Tax Legally Saved</Text>
          </View>

          <View style={styles.matrixDivider} />

          <View style={styles.matrixCol}>
            <Text style={styles.matrixLbl}>New Reset Cost Basis</Text>
            <Text style={styles.matrixVal}>+₹{recommendedHarvest.toLocaleString('en-IN')}</Text>
            <Text style={styles.matrixSub}>Zero Future Tax Base</Text>
          </View>

          <View style={styles.matrixDivider} />

          <View style={styles.matrixCol}>
            <Text style={styles.matrixLbl}>15Y Wealth Created</Text>
            <Text style={[styles.matrixVal, { color: colors.warning }]}>
              +₹{(extraFamilyWealth15Y / 100000).toFixed(1)} Lakh
            </Text>
            <Text style={styles.matrixSub}>Compounded @ 14%</Text>
          </View>
        </View>
      </View>

      {/* INTERACTIVE HOLDINGS HARVESTOR SIMULATOR */}
      <View style={styles.card}>
        <View style={styles.simHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.simTitle}>Holdings Harvest Simulator</Text>
            <Text style={styles.simSub}>
              Select holdings to sell & immediately buy back today
            </Text>
          </View>
          <View style={styles.simTotalBadge}>
            <Text style={styles.simTotalBadgeText}>
              Selected: ₹{totalHarvestGainSelected.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Holdings List */}
        <View style={styles.holdingsList}>
          {holdings.map((h) => {
            const isPositive = h.gain > 0;
            return (
              <TouchableOpacity
                key={h.id}
                style={[styles.holdingRow, h.selected && styles.holdingRowActive]}
                activeOpacity={0.8}
                onPress={() => toggleHolding(h.id)}
              >
                <View style={[styles.checkbox, h.selected && styles.checkboxActive]}>
                  {h.selected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.holdingName}>{h.name}</Text>
                  <Text style={styles.holdingMeta}>
                    {h.type} • Held {h.holdingDays} days ({h.isLtcg ? 'LTCG Safe' : 'STCL Offset'})
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={[
                      styles.holdingGainVal,
                      { color: isPositive ? colors.primary : colors.danger },
                    ]}
                  >
                    {isPositive ? `+₹${h.gain.toLocaleString('en-IN')}` : `-₹${Math.abs(h.gain).toLocaleString('en-IN')}`}
                  </Text>
                  <Text style={styles.holdingActionLbl}>
                    {isPositive ? 'Harvest Gain' : 'Harvest Loss'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Status Callout Banner */}
        <View
          style={[
            styles.statusBanner,
            totalHarvestGainSelected <= annualExemptionLimit
              ? styles.statusBannerSafe
              : styles.statusBannerWarn,
          ]}
        >
          <Ionicons
            name={totalHarvestGainSelected <= annualExemptionLimit ? 'shield-checkmark' : 'alert-circle'}
            size={18}
            color={totalHarvestGainSelected <= annualExemptionLimit ? colors.primary : colors.warning}
          />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text
              style={[
                styles.statusBannerTitle,
                { color: totalHarvestGainSelected <= annualExemptionLimit ? colors.primary : colors.warning },
              ]}
            >
              {totalHarvestGainSelected <= annualExemptionLimit
                ? '100% Tax-Free Execution Zone'
                : 'Exceeds ₹1.25L Exemption Limit'}
            </Text>
            <Text style={styles.statusBannerDesc}>
              {totalHarvestGainSelected <= annualExemptionLimit
                ? `Selling and re-buying these holdings saves ₹${Math.round(totalHarvestGainSelected * 0.125).toLocaleString('en-IN')} in direct tax with ZERO capital gains tax liability!`
                : `₹${(totalHarvestGainSelected - annualExemptionLimit).toLocaleString('en-IN')} exceeds the annual free quota and will attract 12.5% tax.`}
            </Text>
          </View>
        </View>
      </View>

      {/* THE 4-STEP ZERO-RISK EXECUTION PLAYBOOK */}
      <View style={styles.playbookCard}>
        <Text style={styles.playbookHeader}>HOW TO EXECUTE (ZERO-RISK PLAYBOOK)</Text>

        <View style={styles.playbookStep}>
          <View style={styles.stepNumCircle}>
            <Text style={styles.stepNumText}>1</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>Sell Selected Units on NSE/BSE</Text>
            <Text style={styles.stepDesc}>
              Place a normal delivery SELL order for your selected profitable holdings during market hours (10:00 AM - 2:00 PM).
            </Text>
          </View>
        </View>

        <View style={styles.playbookStep}>
          <View style={styles.stepNumCircle}>
            <Text style={styles.stepNumText}>2</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>Buy Back Exact Same Quantity</Text>
            <Text style={styles.stepDesc}>
              Buy back the exact same number of shares on the same day or next morning. Your portfolio stock count remains 100% unchanged!
            </Text>
          </View>
        </View>

        <View style={styles.playbookStep}>
          <View style={styles.stepNumCircle}>
            <Text style={styles.stepNumText}>3</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>Pay Micro-Brokerage (~₹110)</Text>
            <Text style={styles.stepDesc}>
              Total STT + Exchange turnover fees on a ₹1.25 Lakh harvest is ~₹110. You spend ₹110 to save ₹15,625 in tax (142x Return on Investment)!
            </Text>
          </View>
        </View>

        <View style={styles.playbookStep}>
          <View style={styles.stepNumCircle}>
            <Text style={styles.stepNumText}>4</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>New Higher Cost Basis Locked In</Text>
            <Text style={styles.stepDesc}>
              Your purchase price is now legally updated higher on the Income Tax AIS portal. In the future, you will NEVER pay tax on this ₹1.25L gain again!
            </Text>
          </View>
        </View>
      </View>

      {/* 1-CLICK BROKER EXECUTION LAUNCHERS */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>EXECUTE HARVEST ON YOUR BROKER</Text>
        <View style={styles.brokerGrid}>
          <TouchableOpacity
            style={styles.brokerBtn}
            activeOpacity={0.8}
            onPress={() => handleBrokerRedirect('Zerodha Kite')}
          >
            <Text style={styles.brokerBtnText}>Zerodha Kite</Text>
            <Ionicons name="arrow-forward" size={13} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.brokerBtn}
            activeOpacity={0.8}
            onPress={() => handleBrokerRedirect('Groww')}
          >
            <Text style={styles.brokerBtnText}>Groww</Text>
            <Ionicons name="arrow-forward" size={13} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.brokerBtn}
            activeOpacity={0.8}
            onPress={() => handleBrokerRedirect('Angel One')}
          >
            <Text style={styles.brokerBtnText}>Angel One</Text>
            <Ionicons name="arrow-forward" size={13} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.brokerBtn}
            activeOpacity={0.8}
            onPress={() => handleBrokerRedirect('Upstox')}
          >
            <Text style={styles.brokerBtnText}>Upstox</Text>
            <Ionicons name="arrow-forward" size={13} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  headerIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: colors.cardSecondary,
  },
  deadlineBanner: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 14,
  },
  deadlineLeft: {
    flex: 1,
  },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  deadlineBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.warning,
    letterSpacing: 0.5,
  },
  deadlineTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.text,
  },
  deadlineDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 15,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionHelper: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 8,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    backgroundColor: colors.cardSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  pillActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  diagnosticCard: {
    backgroundColor: '#0F1A28',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    marginBottom: 14,
  },
  diagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  diagSub: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  diagQuotaTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
    marginTop: 2,
  },
  freeTaxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  freeTaxBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.4,
  },
  progressBarWrapper: {
    height: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.warning,
    borderRadius: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  progressLabelText: {
    fontSize: 10.5,
    color: colors.textSecondary,
  },
  matrixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1320',
    borderRadius: 12,
    paddingVertical: 12,
  },
  matrixCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  matrixLbl: {
    fontSize: 8.5,
    fontWeight: '700',
    color: colors.textMuted,
    textAlign: 'center',
  },
  matrixVal: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text,
    marginTop: 3,
  },
  matrixSub: {
    fontSize: 8.5,
    color: colors.textSecondary,
    marginTop: 1,
    textAlign: 'center',
  },
  matrixDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  simHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  simTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  simSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  simTotalBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  simTotalBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },
  holdingsList: {
    gap: 8,
    marginBottom: 12,
  },
  holdingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSecondary,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  holdingRowActive: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  holdingName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  holdingMeta: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  holdingGainVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  holdingActionLbl: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 1,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  statusBannerSafe: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusBannerWarn: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statusBannerTitle: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  statusBannerDesc: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 14,
  },
  playbookCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 14,
  },
  playbookHeader: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.warning,
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  playbookStep: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  stepNumCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.primary,
  },
  stepTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.text,
  },
  stepDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  brokerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  brokerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '48%',
    backgroundColor: colors.cardSecondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  brokerBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.text,
  },
});
