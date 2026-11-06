import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';

export default function AppHeader({
  subtitle = 'Smart Money & Venture Radar',
  rightAction,
  onMenuPress,
}) {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.brandBar}>
        {/* Left: Brand Attraction Logo + Typography + Subtitle */}
        <View style={styles.brandLeft}>
          {/* Logo Squircle: Clean Hardware-Stable Architecture (Zero Internal Blink) */}
          <View style={styles.logoOuterSquircle}>
            <LinearGradient
              colors={['#064E3B', '#022C22', '#041F18']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoInnerChamber}
            >
              <Text style={styles.logoRupee}>₹</Text>
              <View style={styles.logoArrowBadge}>
                <Ionicons name="trending-up" size={10} color="#10B981" />
              </View>
            </LinearGradient>
          </View>

          {/* Brand Name & Dynamic Subtitle */}
          <View style={styles.brandTextGroup}>
            <View style={styles.brandNameRow}>
              <Text style={styles.brandPaisa}>PAISA</Text>
              <Text style={styles.brandBuddy}>BUDDY</Text>
            </View>
            {subtitle ? (
              <Text style={styles.brandSubtitle} numberOfLines={1} ellipsizeMode="tail">
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Right: Custom Action Button or 3-Line Menu Button */}
        <View style={styles.brandRight}>
          {rightAction ? (
            rightAction
          ) : onMenuPress ? (
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onMenuPress();
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="reorder-three" size={26} color="#10B981" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: 10,
    paddingBottom: 14,
    marginBottom: 6,
  },
  brandBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 14,
  },
  logoOuterSquircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    padding: 1.5,
    backgroundColor: '#064E3B',
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  logoInnerChamber: {
    flex: 1,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoRupee: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: -2,
    marginRight: 2,
  },
  logoArrowBadge: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTextGroup: {
    marginLeft: 11,
    flex: 1,
  },
  brandNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandPaisa: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  brandBuddy: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  brandRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
