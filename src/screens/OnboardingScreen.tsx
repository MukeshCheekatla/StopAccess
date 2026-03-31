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
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
    width: '100%',
  },
  progressFill: {
    height: 4,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 32,
  },
  stepWrap: { alignItems: 'center' },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  stepTitle: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -1,
  },
  stepDesc: {
    color: COLORS.muted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    fontWeight: '500',
  },
  
  checklistCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    marginBottom: 40,
  },
  checklistTitle: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 20,
    opacity: 0.8,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  checkCircleDone: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  checkLabel: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  checkLabelDone: {
    color: COLORS.text,
    fontWeight: '800',
  },

  formCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 28,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  fieldLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 24,
    fontSize: 15,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 18,
    gap: 12,
    marginTop: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  primaryBtnTxt: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dimmed: {
    opacity: 0.5,
  },
  successLabel: {
    color: COLORS.green,
    textAlign: 'center',
    marginTop: 24,
    fontWeight: '800',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 24,
  },
  guidedBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginTop: 0,
    shadowOpacity: 0,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0,196,140,0.05)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,196,140,0.1)',
    marginTop: 8,
  },
  successBadgeTxt: {
    color: COLORS.green,
    fontWeight: '800',
    fontSize: 14,
  },
  skipHint: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '600',
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 40,
  },
  backBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dotActive: {
    backgroundColor: COLORS.accent,
    width: 24,
  },
  nextBtn: {
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    gap: 10,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  nextBtnTxt: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
