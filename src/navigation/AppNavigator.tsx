import React, { useMemo, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../components/theme';
import { storage } from '../store/storageAdapter';

// Screens
import DashboardScreen from '../screens/DashboardScreen';
import AppsScreen from '../screens/AppsScreen';
import FocusScreen from '../screens/FocusScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import SettingsScreen from '../screens/SettingsScreen';
import InsightsScreen from '../screens/InsightsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

// Sub-screens (To be outside the Tab Navigator)
import EngineSettingsScreen from '../screens/settings/EngineSettingsScreen';
import SecuritySettingsScreen from '../screens/settings/SecuritySettingsScreen';
import DiagnosticsSettingsScreen from '../screens/settings/DiagnosticsSettingsScreen';
import PrivacySettingsScreen from '../screens/settings/PrivacySettingsScreen';

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

const NavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.bg,
    card: COLORS.bg,
    text: COLORS.text,
    border: 'transparent',
  },
};

const TabBarIcon =
  (name: string) =>
  ({ focused }: { focused: boolean }) =>
    (
      <Icon
        name={name}
        size={22}
        color={focused ? COLORS.accent : COLORS.muted}
      />
    );

function TabNavigator() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const compactDevice = height < 760;
  const isTablet = width >= 768;

  const tabBarStyle = useMemo(
    () => ({
      backgroundColor: COLORS.bg,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      elevation: 0,
      shadowOpacity: 0,
      height: isTablet
        ? 74 + insets.bottom
        : (compactDevice ? 60 : 68) + insets.bottom,
      paddingBottom: Math.max(insets.bottom, isTablet ? 14 : 10),
      paddingTop: isTablet ? 8 : 4,
    }),
    [compactDevice, insets.bottom, isTablet],
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle,
        tabBarLabelStyle: {
          fontSize: isTablet ? 11 : 10,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: TabBarIcon('view-dashboard-outline'),
        }}
      />
      <Tab.Screen
        name="Apps"
        component={AppsScreen}
        options={{
          tabBarLabel: 'Apps',
          tabBarIcon: TabBarIcon('apps'),
        }}
      />
      <Tab.Screen
        name="Focus"
        component={FocusScreen}
        options={{
          tabBarLabel: 'Focus',
          tabBarIcon: TabBarIcon('target'),
        }}
      />
      <Tab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{
          tabBarLabel: 'Schedule',
          tabBarIcon: TabBarIcon('calendar-clock'),
        }}
      />
      <Tab.Screen
        name="Insights"
        component={InsightsScreen}
        options={{
          tabBarLabel: 'Insights',
          tabBarIcon: TabBarIcon('chart-bar'),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: TabBarIcon('cog-outline'),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [showOnboarding, setShowOnboarding] = useState(
    !storage.getBoolean('onboarding_done'),
  );

  const handleFinish = async () => {
    storage.set('onboarding_done', true);
    setShowOnboarding(false);
  };

  if (showOnboarding) {
    return <OnboardingScreen onFinish={handleFinish} />;
  }

  return (
    <NavigationContainer theme={NavTheme}>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
      >
        <RootStack.Screen name="Main" component={TabNavigator} />
        <RootStack.Screen
          name="EngineSettings"
          component={EngineSettingsScreen}
        />
        <RootStack.Screen
          name="SecuritySettings"
          component={SecuritySettingsScreen}
        />
        <RootStack.Screen
          name="DiagnosticsSettings"
          component={DiagnosticsSettingsScreen}
        />
        <RootStack.Screen
          name="PrivacySettings"
          component={PrivacySettingsScreen}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
