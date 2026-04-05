import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  NativeModules,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../components/theme';
import {
  SCREEN_WIDTH,
  HORIZONTAL_PADDING,
  isTablet,
  isShort,
} from '../constants/layout';
import { getRules } from '@focusgate/state/rules';
import { storageAdapter } from '../store/storageAdapter';
import * as nextDNS from '../api/nextdns';
import { recordFocusSession } from '@focusgate/core/insights';
import { orchestrator } from '../engine/nativeEngine';

const { RuleEngine } = NativeModules;

export default function FocusScreen() {
  const insets = useSafeAreaInsets();

  const ringSize = useMemo(() => Math.min(SCREEN_WIDTH * 0.75, 320), []);
  const presetColumns = isTablet ? 4 : 4;
  const presetGap = 12;
  const presetWidth = useMemo(
    () =>
      (SCREEN_WIDTH -
        HORIZONTAL_PADDING * 2 -
        presetGap * (presetColumns - 1)) /
      presetColumns,
    [presetColumns],
  );

  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [protectionLevel, setProtectionLevel] = useState('NONE');

  const ringStyle = useMemo(
    () => ({
      width: ringSize,
      height: ringSize,
      borderRadius: ringSize / 2,
    }),
    [ringSize],
  );

  const timerFontSize = useMemo(() => Math.min(SCREEN_WIDTH * 0.22, 88), []);

  const bottomStyle = useMemo(
    () => ({
      marginBottom: insets.bottom + (isShort ? 20 : 40),
    }),
    [insets.bottom],
  );

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectDuration = (mins: number) => {
    if (isActive) {
      return;
    }
    setSelectedDuration(mins);
    setTimeLeft(mins * 60);
  };

  useEffect(() => {
    const checkStatus = async () => {
      if (RuleEngine && typeof RuleEngine.getProtectionLevel === 'function') {
        try {
          const level = await RuleEngine.getProtectionLevel();
          setProtectionLevel(level);
        } catch (e) {
          console.warn('[Focus] Protection check failed');
        }
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const endFocus = useCallback(
    async (completed: boolean) => {
      setIsActive(false);
      nextDNS.unblockAll().catch(() => {});

      if (completed) {
        await recordFocusSession(storageAdapter, selectedDuration);
        Vibration.vibrate([0, 500, 200, 500]);
        Alert.alert(
          'Session Complete',
          'Excellent work. Flow session recorded.',
        );
      }

      setTimeLeft(selectedDuration * 60);
      await storageAdapter.set('focus_mode_end_time', 0);
      await orchestrator.runCycle(true);
    },
    [selectedDuration],
  );

  const startFocus = async () => {
    const a11y = RuleEngine?.isAccessibilityServiceEnabled
      ? await RuleEngine.isAccessibilityServiceEnabled()
      : true;

    if (!a11y) {
      Alert.alert(
        'Accessibility Required',
        'Direct enforcement requires Accessibility Service.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Settings',
            onPress: () => RuleEngine?.openAccessibilitySettings(),
          },
        ],
      );
      return;
    }

    setIsActive(true);
    const rules = await getRules(storageAdapter);
    nextDNS.blockApps(rules).catch(() => {});

    const endTime = Date.now() + selectedDuration * 60 * 1000;
    await storageAdapter.set('focus_mode_end_time', endTime);
    await orchestrator.runCycle(true);
    Vibration.vibrate(50);
  };

  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive]);

  useEffect(() => {
    if (timeLeft === 0 && isActive) {
      endFocus(true);
    }
  }, [timeLeft, isActive, endFocus]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <StatusBar barStyle="light-content" />

      <View
        className="items-center px-5"
        style={{ marginTop: insets.top + (isShort ? 20 : 40) }}
      >
        <Text className="text-[32px] font-black tracking-tightest text-white">
          Flow Protocol
        </Text>
        <Text className="mt-2 text-[10px] font-black uppercase tracking-[2.5px] text-muted/60">
          Silence distractions and activate focus
        </Text>
      </View>

      <View className="flex-1 items-center justify-center">
        <View
          style={[
            styles.ring,
            isActive ? styles.ringActive : styles.ringInactive,
            ringStyle,
          ]}
        >
          <View className="items-center">
            <Text
              className={
                isActive
                  ? 'font-normal text-white'
                  : 'font-extralight text-white'
              }
              style={[styles.timerText, { fontSize: timerFontSize }]}
            >
              {formatTimer(timeLeft)}
            </Text>

            <View className="mt-3 flex-row items-center gap-2">
              <View
                style={[
                  styles.statusDot,
                  isActive ? styles.dotActive : styles.dotInactive,
                ]}
              />
              <Text className="text-[11px] font-black uppercase tracking-[2px] text-muted">
                {isActive ? 'SHIELD ACTIVE' : 'ENGINE READY'}
              </Text>
            </View>

            <View className="mt-6 flex-row items-center gap-1.5 rounded-xl border border-border bg-white/5 px-3 py-1.5">
              <Icon name="shield-lock" size={14} color={COLORS.accent} />
              <Text className="text-[10px] font-black text-muted">
                {protectionLevel} PROTECTION
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View className="px-5" style={bottomStyle}>
        {!isActive ? (
          <View>
            <View className="mb-6 flex-row justify-between">
              {[15, 25, 45, 60].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.presetItem,
                    { width: presetWidth },
                    selectedDuration === m && styles.presetActive,
                  ]}
                  onPress={() => selectDuration(m)}
                >
                  <Text
                    className={`text-base font-extrabold ${
                      selectedDuration === m ? 'text-black' : 'text-muted'
                    }`}
                  >
                    {m}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              className="h-[72px] flex-row items-center justify-center gap-3 rounded-3xl bg-accent"
              onPress={startFocus}
              activeOpacity={0.9}
            >
              <Icon name="power" size={24} color="#000" />
              <Text className="text-base font-black uppercase tracking-[1px] text-black">
                Initiate Focus
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <TouchableOpacity
              className="h-[72px] flex-row items-center justify-center gap-2.5 rounded-3xl border border-[#CF66794D] bg-[#CF66791A]"
              onPress={() => endFocus(false)}
              activeOpacity={0.8}
            >
              <Icon name="stop-circle" size={20} color={COLORS.red} />
              <Text className="text-[13px] font-black uppercase tracking-[1px] text-red">
                Abort Flow Session
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  ringActive: { borderColor: COLORS.accent },
  ringInactive: { borderColor: COLORS.border },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: COLORS.green },
  dotInactive: { backgroundColor: COLORS.muted },
  timerText: {
    letterSpacing: -3,
    fontVariant: ['tabular-nums'],
  },
  presetItem: {
    height: 56,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  presetActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
});
