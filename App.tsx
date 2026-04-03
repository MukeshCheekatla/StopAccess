import React, { useEffect, useState } from 'react';
import {
  StatusBar,
  StyleSheet,
  AppState,
  View,
  ActivityIndicator,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppNavigator from './src/navigation/AppNavigator';
import { orchestrator } from './src/engine/nativeEngine';
import { storageAdapter, storage } from './src/store/storageAdapter';
import * as nextDNS from './src/api/nextdns';
import { addLog } from './src/services/logger';
import { COLORS } from './src/components/theme';
import {
  setupNotifications,
  notifyBlocked,
} from './src/services/notifications';
import { getForegroundApp } from './src/modules/usageStats';

const { RuleEngine } = require('react-native').NativeModules;

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let initialized = false;

    async function init() {
      if (initialized) {
        return;
      }
      try {
        await setupNotifications();

        const ctx = {
          storage: storageAdapter,
          api: nextDNS as any, // Cast to satisfy SyncContext interface
          logger: { add: addLog },
          notifications: { notifyBlocked },
          enforcements: {
            applyBlockedPackages: async (pkgs: string[]) => {
              console.log('[NativeBridge] Syncing Blocklist:', pkgs);
              if (RuleEngine) {
                RuleEngine.setBlockedPackages(pkgs);
              }
            },
            showOverlay: (packageName: string) => {
              if (RuleEngine && typeof RuleEngine.showOverlay === 'function') {
                RuleEngine.showOverlay(packageName);
              }
            },
            dismissOverlay: () => {
              if (RuleEngine && typeof RuleEngine.hideOverlay === 'function') {
                RuleEngine.hideOverlay();
              }
            },
            getForegroundApp,
          },
        };

        const onboardingDone = await storageAdapter.getBoolean(
          'onboarding_done',
          false,
        );
        // FORCE init even if NextDNS is not fully set up
        if (onboardingDone && !orchestrator.getEngine()) {
          initialized = true;
          await orchestrator.init(ctx);
          console.log('[Engine] Started successfully');
        }
      } catch (e) {
        addLog('error', 'App Bootstrap Failed', String(e));
      } finally {
        setIsLoaded(true);
      }
    }

    init();

    // Listen for MMKV changes (onboarding finish)
    const listener = storage.addOnValueChangedListener((key: string) => {
      if (key === 'onboarding_done') {
        init();
      }
    });

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        orchestrator.getSync()?.onForeground();
      }
    });

    return () => {
      listener.remove?.();
      sub.remove();
    };
  }, []);

  if (!isLoaded) {
    return (
      <View style={styles.splash}>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />
        <View style={styles.logoGlow}>
          <Icon name="shield-lock" size={80} color={COLORS.accent} />
        </View>
        <ActivityIndicator
          size="small"
          color={COLORS.muted}
          style={{ marginTop: 24 }}
        />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />
        <AppNavigator />
      </GestureHandlerRootView>
    </SafeAreaProvider>
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
  splash: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoGlow: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(0, 209, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.1)',
  },
});
