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
        {/* Left: Brand Logo & Executive Subtitle */}
        <View style={styles.brandLeft}>
          {/* Logo Squircle with Clean Hairline Border (Flicker-Free, No Heavy GPU Shadow) */}
          <View style={styles.logoWrapper}>
            <LinearGradient
              colors={['#064E3B', '#022C22']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoInnerChamber}
            >
              <Text style={styles.logoRupee}>₹</Text>
              <View style={styles.logoArrowBadge}>
                <Ionicons name="trending-up" size={9} color="#10B981" />
              </View>
            </LinearGradient>
          </View>

          {/* Brand Name & Dynamic Executive Subtitle */}
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

        {/* Right: Custom Action Button or Executive 3-Line Menu */}
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 11,
    backgroundColor: '#07090E',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.07)',
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
    marginRight: 12,
  },
  logoWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    overflow: 'hidden',
    backgroundColor: '#041F18',
  },
  logoInnerChamber: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoRupee: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: -2,
    marginRight: 2,
  },
  logoArrowBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTextGroup: {
    marginLeft: 10,
    flex: 1,
  },
  brandNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandPaisa: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  brandBuddy: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 0.3,
    marginTop: 1.5,
  },
  brandRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: '#0E131F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
