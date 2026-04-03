import React, { useState, useCallback } from 'react';
import {
  NativeModules,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  UIManager,
} from 'react-native';
import Animated, { SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../components/theme';
import {
  hasUsagePermission,
  requestUsagePermission,
} from '../modules/usageStats';
import { saveConfig, testConnection } from '../api/nextdns';
import { AutoSetupModal } from '../components/AutoSetupModal';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 3; // 0: Welcome, 1: Credentials, 2: Permissions

// ---------------------------------------------------------------------------
// Checklist item
// ---------------------------------------------------------------------------

const CheckItem = ({ done, label }: { done: boolean; label: string }) => (
  <View style={styles.checkItem}>
    <View style={[styles.checkCircle, done && styles.checkCircleDone]}>
      <Icon
        name={done ? 'check' : 'circle-outline'}
        size={14}
        color={done ? '#000' : COLORS.muted}
      />
    </View>
    <Text style={[styles.checkLabel, done && styles.checkLabelDone]}>
      {label}
    </Text>
  </View>
);

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function OnboardingScreen({
  onFinish,
}: {
  onFinish: () => void;
}) {
  const [step, setStep] = useState(0);
  const insets = useSafeAreaInsets();

  const nextStep = () => {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  // Step 1 state
  const [profileId, setProfileId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [autoSetupVisible, setAutoSetupVisible] = useState(false);
  const [testing, setTesting] = useState(false);
  const [credsSaved, setCredsSaved] = useState(false);

  // Step 2 state
  const [usagePerm, setUsagePerm] = useState(false);
  const [a11yPerm, setA11yPerm] = useState(false);
  const [overlayPerm, setOverlayPerm] = useState(false);
  const [notiPerm, setNotiPerm] = useState(false);

  // Check permissions once on mount (user may have already granted them)
  const refreshPerms = useCallback(async () => {
    const usageOk = await hasUsagePermission();
    setUsagePerm(usageOk);

    const ruleEngine = NativeModules.RuleEngine;
    if (ruleEngine) {
      if (typeof ruleEngine.isAccessibilityEnabled === 'function') {
        setA11yPerm(await ruleEngine.isAccessibilityEnabled());
      }
      if (typeof ruleEngine.isOverlayEnabled === 'function') {
        setOverlayPerm(await ruleEngine.isOverlayEnabled());
      }
      if (typeof ruleEngine.areNotificationsEnabled === 'function') {
        setNotiPerm(await ruleEngine.areNotificationsEnabled());
      }
    }
  }, []);

  // Re-check on every step or interval if needed
  React.useEffect(() => {
    if (step === 2) {
      const timer = setInterval(refreshPerms, 2000);
      return () => clearInterval(timer);
    }
  }, [step, refreshPerms]);

  const handleAutoSetupSuccess = useCallback(
    async (pid: string, key: string) => {
      setAutoSetupVisible(false);
      setProfileId(pid);
      setApiKey(key);
      setTesting(true);

      await saveConfig({ profileId: pid.trim(), apiKey: key.trim() });
      const ok = await testConnection();
      setTesting(false);

      if (ok) {
        setCredsSaved(true);
        setTimeout(() => nextStep(), 500);
      } else {
        Alert.alert(
          'Connection failed',
          'Could not reach NextDNS. Please check your credentials.',
        );
      }
    },
    [],
  );

  const handleManualSave = async () => {
    if (!profileId || !apiKey) {
      Alert.alert('Missing Info', 'Please enter both ID and Password.');
      return;
    }
    setTesting(true);
    await saveConfig({ profileId: profileId.trim(), apiKey: apiKey.trim() });
    const ok = await testConnection();
    setTesting(false);

    if (ok) {
      setCredsSaved(true);
      nextStep();
    } else {
      Alert.alert('Connection Failed', 'Invalid ID or Password.');
    }
  };

  const handleGrantUsage = async () => {
    await requestUsagePermission();
    setTimeout(refreshPerms, 1500);
  };

  const handleGrantA11y = async () => {
    const ruleEngine = NativeModules.RuleEngine;
    if (
      ruleEngine &&
      typeof ruleEngine.openAccessibilitySettings === 'function'
    ) {
      ruleEngine.openAccessibilitySettings();
    }
  };

  const handleGrantOverlay = () => {
    const ruleEngine = NativeModules.RuleEngine;
    if (ruleEngine && typeof ruleEngine.openOverlaySettings === 'function') {
      ruleEngine.openOverlaySettings();
    }
  };

  const handleGrantNoti = () => {
    const ruleEngine = NativeModules.RuleEngine;
    if (
      ruleEngine &&
      typeof ruleEngine.openNotificationSettings === 'function'
    ) {
      ruleEngine.openNotificationSettings();
    }
  };

  const handleFinish = async () => {
    await refreshPerms();
    if (!usagePerm || !a11yPerm || !overlayPerm || !notiPerm) {
      Alert.alert(
        'Required',
        'Please turn on all protection layers to secure your phone.',
      );
      return;
    }
    onFinish();
  };

  // removed unused canAdvanceStep1 constant
  const progressPct = (step / (TOTAL_STEPS - 1)) * 100;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      {/* Top Banner / Progress Indicator */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Icon name="gate" size={24} color={COLORS.accent} />
          <Text style={styles.brandText}>FOCUSGATE</Text>
        </View>
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 0 && (
          <Animated.View
            key="step_welcome"
            entering={SlideInRight.duration(400)}
            exiting={SlideOutLeft.duration(200)}
            style={styles.stepWrap}
          >
            <View style={styles.heroCircle}>
              <Icon name="shield-check" size={64} color={COLORS.accent} />
            </View>
            <Text style={styles.stepTitle}>Block Distractions</Text>
            <Text style={styles.stepDesc}>
              Stop wasting time on addictive apps. FocusGate builds a wall
              around your focus so you can get things done.
            </Text>

            <View style={styles.glassCard}>
              <Text style={styles.cardHeader}>HOW IT WORKS</Text>
              <CheckItem done={false} label="Rules Stay Synced" />
              <CheckItem done={false} label="Works in Every App" />
              <CheckItem done={false} label="Hard to Bypass" />
            </View>
          </Animated.View>
        )}

        {step === 1 && (
          <Animated.View
            key="step_creds"
            entering={SlideInRight.duration(400)}
            exiting={SlideOutLeft.duration(200)}
            style={styles.stepWrap}
          >
            <View style={styles.heroCircle}>
              <Icon name="dns" size={64} color={COLORS.accent} />
            </View>
            <Text style={styles.stepTitle}>Connect Filter</Text>
            <Text style={styles.stepDesc}>
              We use NextDNS to filter out unwanted apps. Link your account to
              keep your custom rules active.
            </Text>

            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>ID NUMBER</Text>
                <TextInput
                  style={styles.input}
                  value={profileId}
                  onChangeText={setProfileId}
                  placeholder="e.g. abc123"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>SECRET KEY</Text>
                <TextInput
                  style={styles.input}
                  value={apiKey}
                  onChangeText={setApiKey}
                  placeholder="Your secure password"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  (testing || credsSaved) && styles.dimmed,
                ]}
                onPress={handleManualSave}
                disabled={testing || credsSaved}
              >
                {testing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon
                      name={credsSaved ? 'check-decagram' : 'connection'}
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.primaryBtnTxt}>
                      {credsSaved ? 'LINKED' : 'CONNECT NOW'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.cardDivider} />

              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={() => setAutoSetupVisible(true)}
                disabled={testing || credsSaved}
              >
                <Icon name="auto-fix" size={18} color="rgba(255,255,255,0.6)" />
                <Text style={styles.ghostBtnTxt}>I need help logging in</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {step === 2 && (
          <Animated.View
            key="step_perms"
            entering={SlideInRight.duration(400)}
            exiting={SlideOutLeft.duration(200)}
            style={styles.stepWrap}
          >
            <View style={styles.heroCircle}>
              <Icon
                name="shield-lock-outline"
                size={64}
                color={COLORS.accent}
              />
            </View>
            <Text style={styles.stepTitle}>Final Step</Text>
            <Text style={styles.stepDesc}>
              Last few things to secure your phone. All permissions are required
              to ensure your rules can't be easily bypassed.
            </Text>

            <View style={styles.glassCard}>
              <CheckItem done={credsSaved} label="Filter Connected" />
              <CheckItem done={usagePerm} label="Usage Tracking" />
              <CheckItem done={a11yPerm} label="Blocker Service" />
              <CheckItem done={overlayPerm} label="Display Overlay" />
              <CheckItem done={notiPerm} label="Status Alerts" />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.permScroll}
            >
              <View style={styles.permGroup}>
                {!usagePerm && (
                  <TouchableOpacity
                    style={styles.primaryBtnSmall}
                    onPress={handleGrantUsage}
                  >
                    <Icon name="chart-line" size={16} color="#000" />
                    <Text style={styles.primaryBtnTxtSmall}>USAGE</Text>
                  </TouchableOpacity>
                )}

                {!a11yPerm && (
                  <TouchableOpacity
                    style={[
                      styles.primaryBtnSmall,
                      { backgroundColor: COLORS.blue },
                    ]}
                    onPress={handleGrantA11y}
                  >
                    <Icon name="gesture-tap" size={16} color="#fff" />
                    <Text
                      style={[
                        styles.primaryBtnTxtSmall,
                        styles.primaryBtnTxtSmallWhite,
                      ]}
                    >
                      BLOCKER
                    </Text>
                  </TouchableOpacity>
                )}

                {!overlayPerm && (
                  <TouchableOpacity
                    style={[
                      styles.primaryBtnSmall,
                      { backgroundColor: COLORS.yellow },
                    ]}
                    onPress={handleGrantOverlay}
                  >
                    <Icon name="layers-outline" size={16} color="#000" />
                    <Text style={styles.primaryBtnTxtSmall}>OVERLAY</Text>
                  </TouchableOpacity>
                )}

                {!notiPerm && (
                  <TouchableOpacity
                    style={[
                      styles.primaryBtnSmall,
                      { backgroundColor: COLORS.green },
                    ]}
                    onPress={handleGrantNoti}
                  >
                    <Icon name="bell-outline" size={16} color="#fff" />
                    <Text
                      style={[
                        styles.primaryBtnTxtSmall,
                        styles.primaryBtnTxtSmallWhite,
                      ]}
                    >
                      ALERTS
                    </Text>
                  </TouchableOpacity>
                )}

                {usagePerm && a11yPerm && overlayPerm && notiPerm && (
                  <View style={styles.successBadge}>
                    <Icon
                      name="check-decagram"
                      size={22}
                      color={COLORS.green}
                    />
                    <Text style={styles.successBadgeTxt}>SHIELD ACTIVE</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <Text style={styles.skipHint}>
              All must be turned on to secure your phone.
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Modern Footer Nav */}
      <View style={styles.footer}>
        <View style={[styles.sideBtnSlot, styles.sideBtnSlotStart]}>
          {step > 0 ? (
            <TouchableOpacity
              key="back_active"
              style={styles.backBtn}
              onPress={prevStep}
            >
              <Icon name="chevron-left" size={28} color={COLORS.muted} />
            </TouchableOpacity>
          ) : (
            <View key="back_placeholder" style={styles.backBtn} />
          )}
        </View>

        <View style={styles.pagination}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.paginationDot,
                step === i && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>

        <View style={styles.sideBtnSlot}>
          {step === 2 ? (
            <TouchableOpacity
              key="btn_finish"
              style={[
                styles.accentBtn,
                (!usagePerm || !a11yPerm || !overlayPerm || !notiPerm) &&
                  styles.dimmed,
              ]}
              onPress={handleFinish}
              disabled={!usagePerm || !a11yPerm || !overlayPerm || !notiPerm}
            >
              <Text style={styles.accentBtnTxt}>FINISH</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              key="btn_next"
              style={styles.accentBtn}
              onPress={nextStep}
            >
              <Text style={styles.accentBtnTxt}>
                {step === 0 ? 'START' : credsSaved ? 'NEXT' : 'SKIP FOR NOW'}
              </Text>
              <Icon
                name={step === 0 ? 'arrow-right' : 'chevron-right'}
                size={20}
                color="#000"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {autoSetupVisible && (
        <AutoSetupModal
          visible={autoSetupVisible}
          onClose={() => setAutoSetupVisible(false)}
          onSuccess={handleAutoSetupSuccess}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    opacity: 0.8,
  },
  brandText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  progressRow: {
    width: '100%',
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  stepWrap: { width: '100%' },
  heroCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 209, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.1)',
  },
  stepTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -1,
  },
  stepDesc: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    fontWeight: '600',
    paddingHorizontal: 16,
  },
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardHeader: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 20,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  checkCircleDone: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  checkLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '700',
  },
  checkLabelDone: {
    color: '#fff',
    fontWeight: '800',
  },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  fieldLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  permScroll: {
    maxHeight: 80,
    marginTop: 8,
  },
  permGroup: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 4,
  },
  primaryBtn: {
    backgroundColor: COLORS.accent,
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  primaryBtnSmall: {
    backgroundColor: COLORS.accent,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnTxtSmall: {
    color: '#000',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 1,
  },
  primaryBtnTxtSmallWhite: {
    color: '#fff',
  },
  primaryBtnTxt: {
    color: '#000',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1.2,
  },
  dimmed: { opacity: 0.5 },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: '100%',
  },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  ghostBtnTxt: {
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '700',
    fontSize: 13,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0,196,140,0.08)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,196,140,0.2)',
    marginTop: 4,
  },
  successBadgeTxt: {
    color: COLORS.green,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1.5,
  },
  skipHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 8,
  },
  sideBtnSlot: {
    flex: 1,
    minWidth: 80,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  sideBtnSlotStart: {
    alignItems: 'flex-start',
  },
  pagination: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flex: 2,
    justifyContent: 'center',
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  paginationDotActive: {
    width: 20,
    backgroundColor: COLORS.accent,
  },
  backBtn: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  accentBtn: {
    backgroundColor: COLORS.accent,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minWidth: 100,
  },
  accentBtnTxt: {
    color: '#000',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
