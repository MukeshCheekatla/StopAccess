import React, { useEffect, useState } from 'react';
import {
  Alert,
  StatusBar,
  StyleSheet,
  AppState,
  View,
  ActivityIndicator,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { orchestrator } from './src/engine/nativeEngine';
import { storageAdapter } from './src/store/storageAdapter';
import * as nextDNS from './src/api/nextdns';
import { addLog } from './src/services/logger';
import {
  hasUsagePermission,
  requestUsagePermission,
} from './src/modules/usageStats';
import { COLORS } from './src/components/theme';
import {
  setupNotifications,
  notifyBlocked,
} from './src/services/notifications';

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        await setupNotifications();

        const ctx = {
          storage: storageAdapter,
          api: nextDNS,
          logger: { add: addLog },
          notifications: { notifyBlocked },
          enforcements: {
            applyBlockedPackages: async (pkgs: string[]) => {
              const { RuleEngine } = require('react-native').NativeModules;
              if (RuleEngine) {
                RuleEngine.setBlockedPackages(pkgs);
              }
            },
          },
        };

        // Bootstrap Sync Strategy (Ensure hydration before mounting UI)
        await orchestrator.init(ctx);

        const hasPerm = await hasUsagePermission();
        if (!hasPerm) {
          Alert.alert(
            'Permission Required',
            'FocusGate needs Usage Access to track app screen time.',
            [{ text: 'OK', onPress: requestUsagePermission }],
          );
        }

        // Engine is started inside orchestrator.init()
      } catch (e) {
        addLog('error', 'App Bootstrap Failed', String(e));
      } finally {
        setIsLoaded(true);
      }
    }
    init();

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        orchestrator.getSync()?.onForeground();
      }
    });

    return () => sub.remove();
  }, []);

  if (!isLoaded) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

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
    backgroundColor: COLORS.bg,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
