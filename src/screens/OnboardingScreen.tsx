import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING, RADIUS } from '../components/theme';
import {
  hasUsagePermission,
  requestUsagePermission,
} from '../modules/usageStats';
import { saveConfig, testConnection } from '../api/nextdns';
import { AutoSetupModal } from '../components/AutoSetupModal';

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

  // Step 1 state
  const [profileId, setProfileId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [autoSetupVisible, setAutoSetupVisible] = useState(false);
  const [testing, setTesting] = useState(false);
  const [credsSaved, setCredsSaved] = useState(false);

  // Step 2 state
  const [permGranted, setPermGranted] = useState(false);

  // Check permission once on mount (user may have already granted it)
  const checkPerm = useCallback(async () => {
    const has = await hasUsagePermission();
    setPermGranted(has);
    return has;
  }, []);

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
        setTimeout(() => setStep(2), 500);
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
      Alert.alert('Missing Info', 'Please enter both Profile ID and API Key.');
      return;
    }
    setTesting(true);
    await saveConfig({ profileId: profileId.trim(), apiKey: apiKey.trim() });
    const ok = await testConnection();
    setTesting(false);

    if (ok) {
      setCredsSaved(true);
      setStep(2);
    } else {
      Alert.alert('Connection Failed', 'Invalid Profile ID or API Key.');
    }
  };

  const handleGrantPerm = async () => {
    await requestUsagePermission();
    // Give the system a moment, then re-check
    setTimeout(async () => {
      const has = await hasUsagePermission();
      setPermGranted(has);
    }, 1500);
  };

  const handleFinish = async () => {
    // Re-check perm in case user didn't tap grant
    await checkPerm();
    onFinish();
  };

  const canAdvanceStep1 = credsSaved;
  const progressPct = (step / (TOTAL_STEPS - 1)) * 100;

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Step 0: Welcome ── */}
        {step === 0 && (
          <View style={styles.stepWrap}>
            <View style={styles.iconCircle}>
              <Icon name="shield-check" size={56} color={COLORS.accent} />
            </View>
            <Text style={styles.stepTitle}>Welcome to FocusGate</Text>
            <Text style={styles.stepDesc}>
              Block distracting apps at the DNS level — no VPN, no root. Once
              set up, blocking is near-impossible to bypass.
            </Text>

            {/* Setup checklist preview */}
            <View style={styles.checklistCard}>
              <Text style={styles.checklistTitle}>Setup Checklist</Text>
              <CheckItem done={false} label="Connect your NextDNS profile" />
              <CheckItem done={false} label="Grant Usage Access permission" />
              <CheckItem done={false} label="Add your first app to block" />
            </View>
          </View>
        )}

        {/* ── Step 1: Credentials ── */}
        {step === 1 && (
          <View style={styles.stepWrap}>
            <View style={styles.iconCircle}>
              <Icon name="dns" size={56} color={COLORS.accent} />
            </View>
            <Text style={styles.stepTitle}>Connect NextDNS</Text>
            <Text style={styles.stepDesc}>
              FocusGate secures your connection at the DNS level. We'll help you
              log in and connect your account automatically.
            </Text>

            <View style={styles.formCard}>
              <Text style={styles.fieldLabel}>PROFILE ID</Text>
              <TextInput
                style={styles.input}
                value={profileId}
                onChangeText={setProfileId}
                placeholder="e.g. abc123"
                placeholderTextColor={COLORS.muted}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.fieldLabel}>API KEY</Text>
              <TextInput
                style={styles.input}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="Paste your API key here"
                placeholderTextColor={COLORS.muted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />

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
                      name={credsSaved ? 'check-circle' : 'content-save'}
                      size={18}
                      color="#fff"
                    />
                    <Text style={styles.primaryBtnTxt}>
                      {credsSaved ? 'Saved' : 'Verify & Continue'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  styles.guidedBtn,
                  testing && styles.dimmed,
                ]}
                onPress={() => setAutoSetupVisible(true)}
                disabled={testing || credsSaved}
              >
                <Icon name="wizard-hat" size={18} color={COLORS.accent} />
                <Text style={[styles.primaryBtnTxt, { color: COLORS.accent }]}>
                  Guided Setup Help
                </Text>
              </TouchableOpacity>
            </View>
            {credsSaved && (
              <Text style={styles.successLabel}>
                Profile linked successfully
              </Text>
            )}
          </View>
        )}

        {/* ── Step 2: Permissions ── */}
        {step === 2 && (
          <View style={styles.stepWrap}>
            <View style={styles.iconCircle}>
              <Icon
                name="chart-timeline-variant"
                size={56}
                color={COLORS.accent}
              />
            </View>
            <Text style={styles.stepTitle}>Usage Access</Text>
            <Text style={styles.stepDesc}>
              To enforce daily time limits, FocusGate needs to measure how long
              each app is used. This data stays on-device.
            </Text>

            {/* Live checklist */}
            <View style={styles.checklistCard}>
              <Text style={styles.checklistTitle}>Setup Checklist</Text>
              <CheckItem done={credsSaved} label="NextDNS profile connected" />
              <CheckItem done={permGranted} label="Usage Access granted" />
              <CheckItem done={false} label="Add your first app to block" />
            </View>

            {!permGranted ? (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleGrantPerm}
              >
                <Icon name="gesture-tap" size={18} color="#fff" />
                <Text style={styles.primaryBtnTxt}>Grant Access</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.successBadge}>
                <Icon name="check-circle" size={20} color={COLORS.green} />
                <Text style={styles.successBadgeTxt}>Permission granted</Text>
              </View>
            )}

            <Text style={styles.skipHint}>
              You can skip this and grant it later in Settings.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer nav */}
      <View style={styles.footer}>
        {step > 0 ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setStep((s) => s - 1)}
          >
            <Icon name="arrow-left" size={20} color={COLORS.muted} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}

        {/* Step dots */}
        <View style={styles.dots}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, step === i && styles.dotActive]}
            />
          ))}
        </View>

        {step === 0 && (
          <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(1)}>
            <Text style={styles.nextBtnTxt}>Get Started</Text>
            <Icon name="arrow-right" size={18} color="#fff" />
          </TouchableOpacity>
        )}
        {step === 1 && (
          <TouchableOpacity
            style={[styles.nextBtn, !canAdvanceStep1 && styles.dimmed]}
            disabled={!canAdvanceStep1}
            onPress={() => setStep(2)}
          >
            <Text style={styles.nextBtnTxt}>Next</Text>
            <Icon name="arrow-right" size={18} color="#fff" />
          </TouchableOpacity>
        )}
        {step === 2 && (
          <TouchableOpacity style={styles.nextBtn} onPress={handleFinish}>
            <Text style={styles.nextBtnTxt}>
              {permGranted ? 'Finish' : 'Skip'}
            </Text>
            <Icon
              name={permGranted ? 'check' : 'arrow-right'}
              size={18}
              color="#fff"
            />
          </TouchableOpacity>
        )}
      </View>

      {autoSetupVisible && (
        <AutoSetupModal
          visible={autoSetupVisible}
          onClose={() => setAutoSetupVisible(false)}
          onSuccess={handleAutoSetupSuccess}
        />
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  progressTrack: {
    height: 3,
    backgroundColor: COLORS.border,
    width: '100%',
  },
  progressFill: {
    height: 3,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
    paddingBottom: 0,
  },
  stepWrap: { alignItems: 'center' },
  iconCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(52,199,89,0.07)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.12)',
  },
  stepTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  stepDesc: {
    color: COLORS.muted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: SPACING.xl,
  },
  link: { color: COLORS.accent },
  // Checklist
  checklistCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xl,
  },
  checklistTitle: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: SPACING.md,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkCircleDone: { backgroundColor: COLORS.accent },
  checkLabel: { color: COLORS.muted, fontSize: 14 },
  checkLabelDone: { color: COLORS.text },
  // Form
  formCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fieldLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: RADIUS.md,
    padding: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    fontSize: 15,
  },
  primaryBtn: {
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: RADIUS.md,
    gap: 8,
    marginTop: SPACING.sm,
  },
  primaryBtnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  dimmed: { opacity: 0.55 },
  successLabel: {
    color: COLORS.green,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
    opacity: 0.3,
  },
  guidedBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.accent,
    marginTop: 0,
  },
  stepControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 24,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,196,140,0.08)',
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,196,140,0.2)',
    marginTop: SPACING.sm,
  },
  successBadgeTxt: { color: COLORS.green, fontWeight: 'bold', fontSize: 14 },
  skipHint: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.xl,
    paddingTop: SPACING.md,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotActive: { backgroundColor: COLORS.accent, width: 24 },
  nextBtn: {
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  nextBtnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
