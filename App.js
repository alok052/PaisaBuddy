import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from './src/theme/colors';
import WhaleTrackerScreen from './src/screens/WhaleTrackerScreen';
import ExploreStartupsScreen from './src/screens/ExploreStartupsScreen';
import SIPDoctorScreen from './src/screens/SIPDoctorScreen';
import AIPortfolioReviewScreen from './src/screens/AIPortfolioReviewScreen';
import ToolsScreen from './src/screens/ToolsScreen';
import IPORadarScreen from './src/screens/IPORadarScreen';
import ExecutiveHubModal from './src/components/ExecutiveHubModal';
import { registerForPushNotificationsAsync } from './src/services/notificationService';

function MainApp() {
  const [activeTab, setActiveTab] = useState('whales');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  const tabs = [
    {
      id: 'whales',
      label: 'Whales',
      iconName: 'fish',
    },
    {
      id: 'startups',
      label: 'Startups',
      iconName: 'rocket',
    },
    {
      id: 'sip',
      label: 'SIP Doctor',
      iconName: 'medkit',
    },
    {
      id: 'review',
      label: 'AI Audit',
      iconName: 'sparkles',
    },
  ];

  const handleTabPress = (tabId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tabId);
  };

  const openDrawer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsDrawerOpen(true);
  };

  // Ensure bottom padding sits completely clear above Android system navigation buttons
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 28 : 14) + 8;
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0);

  return (
    <View style={[styles.mainContainer, { paddingTop: topPadding }]}>
      <ExpoStatusBar style="light" />

      {/* Screen Content */}
      <View style={styles.screenContainer}>
        {activeTab === 'whales' && <WhaleTrackerScreen onOpenMenu={openDrawer} />}
        {activeTab === 'startups' && <ExploreStartupsScreen onOpenMenu={openDrawer} />}
        {activeTab === 'sip' && <SIPDoctorScreen onOpenMenu={openDrawer} />}
        {activeTab === 'tools' && <ToolsScreen onOpenMenu={openDrawer} />}
        {activeTab === 'review' && <AIPortfolioReviewScreen onOpenMenu={openDrawer} />}
        {activeTab === 'ipos' && <IPORadarScreen onOpenMenu={openDrawer} />}
      </View>

      {/* Executive All-Pages Hub & Launchpad */}
      <ExecutiveHubModal
        visible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activePage={activeTab}
        onSelectPage={(pageId) => {
          setActiveTab(pageId);
        }}
      />

      {/* Bottom Floating Navigation Bar */}
      <View style={[styles.navBarWrapper, { paddingBottom: bottomPadding }]}>
        <View style={styles.navBar}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.navItem, isActive && styles.navItemActive]}
                onPress={() => handleTabPress(tab.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={tab.iconName}
                  size={21}
                  color={isActive ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.navLabel,
                    { color: isActive ? colors.primary : colors.textMuted },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContainer: {
    flex: 1,
  },
  navBarWrapper: {
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: 14,
  },
  navItemActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  navLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 3,
    letterSpacing: 0.2,
  },
});
