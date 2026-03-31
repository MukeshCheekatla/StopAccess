import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  SafeAreaView,
  Alert,
  Vibration,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING, RADIUS } from '../components/theme';
import { getRules } from '@focusgate/state/rules';
import { storageAdapter } from '../store/storageAdapter';
import * as nextDNS from '../api/nextdns';
import { recordFocusSession } from '@focusgate/core/insights';

const { width } = Dimensions.get('window');
const RING_SIZE = width * 0.7;

export default function FocusScreen() {
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // Default 25m
  const [selectedDuration, setSelectedDuration] = useState(25);

  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectDuration = (mins: number) => {
    if (isActive) {
      return;
    }
    setSelectedDuration(mins);
    setTimeLeft(mins * 60);
  };

  const endFocus = useCallback(
    async (completed: boolean) => {
      setIsActive(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Unblock all apps
      nextDNS
        .unblockAll()
        .catch((e: Error) => console.error('Focus unblock error:', e.message));

      if (completed) {
        await recordFocusSession(storageAdapter, selectedDuration);
        Vibration.vibrate([0, 500, 200, 500]);
        Alert.alert(
          'Focus Session Complete!',
          'Great job staying focused. You earned it! 🏆',
        );
      }

      setTimeLeft(selectedDuration * 60);
    },
    [selectedDuration],
  );

  const startFocus = async () => {
    const isConfig = await nextDNS.isConfigured();
    if (!isConfig) {
      Alert.alert(
        'Configuration Required',
        'Please set up NextDNS in Settings before starting focus mode.',
      );
      return;
    }

    setIsActive(true);
    const rules = await getRules(storageAdapter);

    // Block all apps in background using full rule objects
    nextDNS
      .blockApps(rules)
      .catch((e: Error) => console.error('Focus block error:', e.message));
    Vibration.vibrate(50);
  };

  // Breathing animation (Pulse)
  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 4000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 4000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isActive, pulseAnim]);

  // Timer logic
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      endFocus(true);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, timeLeft, endFocus]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Deep Focus</Text>
        <Text style={styles.subtitle}>
          All controlled apps will be blocked.
        </Text>
      </View>

      <View style={styles.center}>
        {/* Breathing Ring */}
        <Animated.View
          style={[
            styles.ring,
            {
              transform: [{ scale: pulseAnim }],
              borderColor: isActive ? COLORS.accent : COLORS.border,
            },
          ]}
        >
          <View style={styles.timerBox}>
            <Text style={[styles.timer, isActive && styles.timerActive]}>
              {formatTimer(timeLeft)}
            </Text>
            <Text style={styles.timerLabel}>
              {isActive ? 'Breathing...' : 'Ready'}
            </Text>
          </View>
        </Animated.View>
      </View>

      <View style={styles.bottom}>
        {!isActive ? (
          <>
            <View style={styles.presets}>
              {[15, 25, 45, 60].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.preset,
                    selectedDuration === m && styles.presetActive,
                  ]}
                  onPress={() => selectDuration(m)}
                >
                  <Text
                    style={[
                      styles.presetTxt,
                      selectedDuration === m && styles.presetTxtActive,
                    ]}
                  >
                    {m}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.startBtn} onPress={startFocus}>
              <Icon name="rocket-launch" size={24} color="#fff" />
              <Text style={styles.startBtnTxt}>Start Focus Session</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.stopBtn}
            onPress={() => endFocus(false)}
          >
            <Text style={styles.stopBtnTxt}>End Session</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  title: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.01)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  timerBox: { alignItems: 'center' },
  timer: {
    color: COLORS.text,
    fontSize: 72,
    fontWeight: '200',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  timerActive: {
    color: COLORS.accent,
    fontWeight: '400',
  },
  timerLabel: {
    color: COLORS.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 3,
    fontWeight: '800',
    marginTop: 12,
    opacity: 0.6,
  },
  bottom: {
    padding: 24,
    paddingBottom: 60,
  },
  presets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  preset: {
    width: (width - 48 - 45) / 4,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  presetActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  presetTxt: {
    color: COLORS.muted,
    fontWeight: '800',
    fontSize: 14,
  },
  presetTxtActive: {
    color: '#fff',
  },
  startBtn: {
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 20,
    gap: 12,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  startBtnTxt: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  stopBtn: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  stopBtnTxt: {
    color: COLORS.red,
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});
