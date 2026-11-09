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
// Temporarily hidden: import ExploreStartupsScreen from './src/screens/ExploreStartupsScreen';
import SIPDoctorScreen from './src/screens/SIPDoctorScreen';
import AIPortfolioReviewScreen from './src/screens/AIPortfolioReviewScreen';
import ToolsScreen from './src/screens/ToolsScreen';
// Temporarily hidden: import IPORadarScreen from './src/screens/IPORadarScreen';
import StocksScreen from './src/screens/StocksScreen';
import StepUpCalculatorScreen from './src/screens/StepUpCalculatorScreen';
import EMIPrepaymentScreen from './src/screens/EMIPrepaymentScreen';
import FinancialGoalPlannerScreen from './src/screens/FinancialGoalPlannerScreen';
import DividendYieldTrackerScreen from './src/screens/DividendYieldTrackerScreen';
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
      iconName: 'layers-outline',
      activeIcon: 'layers',
    },
    // Temporarily hidden: Startups tab
    // {
    //   id: 'startups',
    //   label: 'Startups',
    //   iconName: 'rocket-outline',
    //   activeIcon: 'rocket',
    // },
    {
      id: 'sip',
      label: 'SIP Doctor',
      iconName: 'pulse-outline',
      activeIcon: 'pulse',
    },
    {
      id: 'review',
      label: 'AI Audit',
      iconName: 'shield-checkmark-outline',
      activeIcon: 'shield-checkmark',
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

  // Status Bar Top Padding for true edge-to-edge Android (punch-hole & notch safe)
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0, 26);
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8);

  return (
    <View style={[styles.mainContainer, { paddingTop: topPadding }]}>
      <ExpoStatusBar style="light" />

      {/* Screen Content */}
      <View style={styles.screenContainer}>
        {activeTab === 'whales' && (
          <WhaleTrackerScreen
            onOpenMenu={openDrawer}
            onOpenStocks={() => setActiveTab('stocks')}
          />
        )}
        {/* Temporarily hidden: {activeTab === 'startups' && <ExploreStartupsScreen onOpenMenu={openDrawer} />} */}
        {activeTab === 'sip' && <SIPDoctorScreen onOpenMenu={openDrawer} />}
        {activeTab === 'tools' && <ToolsScreen onOpenMenu={openDrawer} onNavigatePage={setActiveTab} />}
        {activeTab === 'review' && <AIPortfolioReviewScreen onOpenMenu={openDrawer} />}
        {/* Temporarily hidden: {activeTab === 'ipos' && <IPORadarScreen onOpenMenu={openDrawer} />} */}
        {activeTab === 'stocks' && <StocksScreen onOpenMenu={openDrawer} />}
        {activeTab === 'stepup' && <StepUpCalculatorScreen onOpenMenu={openDrawer} />}
        {activeTab === 'emi' && <EMIPrepaymentScreen onOpenMenu={openDrawer} />}
        {activeTab === 'goals' && <FinancialGoalPlannerScreen onOpenMenu={openDrawer} />}
        {activeTab === 'dividend' && <DividendYieldTrackerScreen onOpenMenu={openDrawer} />}
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

      {/* Sleek Floating Dock Navigation (True Full-Screen Immersive UI) */}
      <View style={[styles.navBarWrapper, { paddingBottom: bottomInset }]}>
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
                  name={isActive ? tab.activeIcon : tab.iconName}
                  size={20}
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
    backgroundColor: '#07090E',
  },
  screenContainer: {
    flex: 1,
  },
  navBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(7, 9, 14, 0.97)',
    paddingHorizontal: 6,
    paddingTop: 3,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.3,
  },
});
