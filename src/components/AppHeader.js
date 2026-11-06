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
        {/* Left: Enhanced Attraction Logo + Typography + Sweet Micro Subheading */}
        <View style={styles.brandLeft}>
          {/* Logo Squircle with Gradient Ring & Embedded Trending Glyph */}
          <View style={styles.logoWrapper}>
            <LinearGradient
              colors={['#10B981', '#34D399', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoOuterRing}
            >
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
            </LinearGradient>
          </View>

          {/* Brand Name & Executive Subtitle */}
          <View style={styles.brandTextGroup}>
            <View style={styles.brandNameRow}>
              <Text style={styles.brandPaisa}>PAISA</Text>
              <Text style={styles.brandBuddy}>BUDDY</Text>
            </View>
            {subtitle ? (
              <Text style={styles.brandSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Right: Custom Action Button or Executive Menu */}
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
              <Ionicons name="reorder-two-outline" size={24} color="#F8FAFC" />
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
  logoWrapper: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  logoOuterRing: {
    width: 44,
    height: 44,
    borderRadius: 14,
    padding: 1.5,
  },
  logoInnerChamber: {
    flex: 1,
    borderRadius: 12.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
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
    bottom: 2,
    right: 2,
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
    fontWeight: '500',
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
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#0E131F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
