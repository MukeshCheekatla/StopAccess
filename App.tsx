import React, { useEffect, useState, useRef } from 'react';
import {
  StatusBar,
  StyleSheet,
  AppState,
  View,
  ActivityIndicator,
  Animated,
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
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [showSplash, setShowSplash] = useState(true);

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
          api: nextDNS as any,
          logger: { add: addLog },
          notifications: { notifyBlocked },
          enforcements: {
            applyBlockedPackages: async (pkgs: string[]) => {
              if (
                RuleEngine &&
                typeof RuleEngine.setBlockedPackages === 'function'
              ) {
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
        if (onboardingDone && !orchestrator.getEngine()) {
          initialized = true;
          await orchestrator.init(ctx);
        }
      } catch (e) {
        addLog('error', 'App Bootstrap Failed', String(e));
      } finally {
        // Seamless fade out for the splash overlay
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => setShowSplash(false));
      }
    }

    init();

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
  }, [fadeAnim]); // Added fadeAnim as dependency

  return (
    <SafeAreaProvider style={{ backgroundColor: COLORS.bg }}>
      <GestureHandlerRootView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />

        {/* Render Navigator early to avoid blank transition */}
        <AppNavigator />

        {/* Seamless Splash Overlay */}
        {showSplash && (
          <Animated.View style={[styles.splash, { opacity: fadeAnim }]}>
            <View className="h-36 w-36 items-center justify-center rounded-full">
              <Icon name="shield-lock" size={80} color={COLORS.accent} />
            </View>
            <ActivityIndicator
              size="small"
              color={COLORS.muted}
              style={styles.loader}
            />
          </Animated.View>
        )}
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loader: {
    marginTop: 24,
  },
});
