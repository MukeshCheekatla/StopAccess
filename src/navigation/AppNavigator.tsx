import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../components/theme';
import DashboardScreen from '../screens/DashboardScreen';
import AppsScreen from '../screens/AppsScreen';
import FocusScreen from '../screens/FocusScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import SettingsScreen from '../screens/SettingsScreen';
import InsightsScreen from '../screens/InsightsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import { storage } from '../store/storageAdapter';

const Tab = createBottomTabNavigator();

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
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: COLORS.card,
            borderTopWidth: 0,
            elevation: 0,
            height: 64,
            paddingBottom: 10,
          },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarLabel: 'Dashboard',
            tabBarIcon: TabBarIcon('view-dashboard'),
            title: '📊 Dashboard',
          }}
        />
        <Tab.Screen
          name="Apps"
          component={AppsScreen}
          options={{
            tabBarLabel: 'Apps',
            tabBarIcon: TabBarIcon('apps'),
            title: '📱 Apps',
          }}
        />
        <Tab.Screen
          name="Focus"
          component={FocusScreen}
          options={{
            tabBarLabel: 'Focus',
            tabBarIcon: TabBarIcon('target'),
            title: '🎯 Focus',
          }}
        />
        <Tab.Screen
          name="Schedule"
          component={ScheduleScreen}
          options={{
            tabBarLabel: 'Schedule',
            tabBarIcon: TabBarIcon('calendar-clock'),
            title: '🕐 Schedule',
          }}
        />
        <Tab.Screen
          name="Insights"
          component={InsightsScreen}
          options={{
            tabBarLabel: 'Insights',
            tabBarIcon: TabBarIcon('chart-bar'),
            title: '📈 Insights',
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Settings',
            tabBarIcon: TabBarIcon('cog'),
            title: '⚙️ Settings',
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
