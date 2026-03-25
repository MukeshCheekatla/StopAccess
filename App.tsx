import React, { useEffect } from 'react';
import { Alert, StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { startRuleEngine } from './src/engine/ruleEngine';
import {
  hasUsagePermission,
  requestUsagePermission,
  refreshTodayUsage,
} from './src/modules/usageStats';
import { COLORS } from './src/components/theme';

import { setupNotifications } from './src/services/notifications';

export default function App() {
  useEffect(() => {
    async function init() {
      await setupNotifications();
      const hasPerm = await hasUsagePermission();
      if (!hasPerm) {
        Alert.alert(
          'Permission Required',
          'FocusGate needs Usage Access to track app screen time. Please grant it in the next screen.',
          [{ text: 'OK', onPress: requestUsagePermission }],
        );
      } else {
        await refreshTodayUsage();
      }
      startRuleEngine();
    }
    init();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <AppNavigator />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
