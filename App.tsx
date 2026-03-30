import React, { useEffect, useRef, useState } from 'react';
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
import { startEngine } from '@focusgate/core/engine';
import { SyncOrchestrator } from '@focusgate/sync';
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
  const syncRef = useRef<SyncOrchestrator | null>(null);

  useEffect(() => {
    async function init() {
      try {
        await setupNotifications();

        const ctx = {
          storage: storageAdapter,
          api: nextDNS,
          logger: { add: addLog },
          notifications: { notifyBlocked },
        };

        // Bootstrap Sync Strategy (Ensure hydration before mounting UI)
        syncRef.current = new SyncOrchestrator(ctx);
        await syncRef.current.onLaunch();

        const hasPerm = await hasUsagePermission();
        if (!hasPerm) {
          Alert.alert(
            'Permission Required',
            'FocusGate needs Usage Access to track app screen time.',
            [{ text: 'OK', onPress: requestUsagePermission }],
          );
        }

        startEngine(ctx);
      } catch (e) {
        addLog('error', 'App Bootstrap Failed', String(e));
      } finally {
        setIsLoaded(true);
      }
    }
    init();

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && syncRef.current) {
        syncRef.current.onForeground();
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
