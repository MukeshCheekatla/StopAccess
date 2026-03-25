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
import OnboardingScreen from '../screens/OnboardingScreen';
import { storage } from '../store/storage';

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

  if (showOnboarding) {
    return <OnboardingScreen onFinish={() => setShowOnboarding(false)} />;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.bg,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerShadowVisible: false,
          headerTintColor: COLORS.text,
          tabBarStyle: {
            backgroundColor: COLORS.card,
            borderTopWidth: 0,
            elevation: 0,
            height: 64,
            paddingBottom: 10,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            marginBottom: 4,
          },
          tabBarActiveTintColor: COLORS.accent,
          tabBarInactiveTintColor: COLORS.muted,
          headerTitleStyle: {
            color: COLORS.text,
            fontWeight: 'bold',
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
