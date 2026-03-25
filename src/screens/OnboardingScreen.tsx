import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING, RADIUS } from '../components/theme';
import { storage } from '../store/storage';
import {
  hasUsagePermission,
  requestUsagePermission,
} from '../modules/usageStats';

interface OnboardingStepProps {
  title: string;
  description: string;
  icon: string;
  children?: React.ReactNode;
}

const OnboardingStep = ({
  title,
  description,
  icon,
  children,
}: OnboardingStepProps) => (
  <View style={styles.step}>
    <View style={styles.iconCircle}>
      <Icon name={icon} size={48} color={COLORS.accent} />
    </View>
    <Text style={styles.stepTitle}>{title}</Text>
    <Text style={styles.stepDesc}>{description}</Text>
    {children}
  </View>
);

export default function OnboardingScreen({
  onFinish,
}: {
  onFinish: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);

  // NextDNS inputs
  const [apiKey, setApiKey] = useState('');
  const [profileId, setProfileId] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);

  const checkPermission = async () => {
    const has = await hasUsagePermission();
    if (has) {
      setPermissionGranted(true);
    } else {
      await requestUsagePermission();
    }
  };

  const next = () => {
    if (currentStep === 1) {
      // Save NextDNS credentials
      storage.set('nextdns_api_key', apiKey);
      storage.set('nextdns_profile_id', profileId);
    }

    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    } else {
      storage.set('onboarding_done', true);
      onFinish();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {currentStep === 0 && (
          <OnboardingStep
            icon="shield-check-outline"
            title="FocusGate"
            description="Reclaim your focus. FocusGate blocks distracting apps at the DNS level, making bypasses nearly impossible."
          />
        )}

        {currentStep === 1 && (
          <OnboardingStep
            icon="dns-outline"
            title="NextDNS Engine"
            description="FocusGate uses NextDNS to block domains like instagram.com. Enter your profile details to connect."
          >
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Profile ID</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. abc123def"
                placeholderTextColor={COLORS.muted}
                value={profileId}
                onChangeText={setProfileId}
                autoCapitalize="none"
              />
              <Text style={styles.label}>
                API Key (from Settings {'>'} My Account)
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Required for auto-blocking"
                placeholderTextColor={COLORS.muted}
                value={apiKey}
                onChangeText={setApiKey}
                autoCapitalize="none"
                secureTextEntry
              />
            </View>
          </OnboardingStep>
        )}

        {currentStep === 2 && (
          <OnboardingStep
            icon="chart-timeline-variant"
            title="Usage Permission"
            description="To block apps accurately, we need to know when they are being used. Please grant 'Usage Access' in the next screen."
          >
            <TouchableOpacity
              style={[
                styles.permBtn,
                permissionGranted && styles.permBtnActive,
              ]}
              onPress={checkPermission}
            >
              <Icon
                name={permissionGranted ? 'check-circle' : 'gesture-tap'}
                size={20}
                color={permissionGranted ? COLORS.green : '#fff'}
              />
              <Text style={styles.permBtnTxt}>
                {permissionGranted ? 'Permission Granted' : 'Grant Access'}
              </Text>
            </TouchableOpacity>
          </OnboardingStep>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[styles.dot, currentStep === i && styles.activeDot]}
            />
          ))}
        </View>
        <TouchableOpacity style={styles.nextBtn} onPress={next}>
          <Text style={styles.nextBtnTxt}>
            {currentStep === 2 ? 'Get Started' : 'Next'}
          </Text>
          <Icon name="arrow-right" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: SPACING.xl },
  step: { alignItems: 'center' },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(52,199,89,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.1)',
  },
  stepTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  stepDesc: {
    color: COLORS.muted,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  inputGroup: { width: '100%', marginTop: SPACING.lg },
  label: { color: COLORS.text, fontSize: 13, marginBottom: 8, opacity: 0.8 },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    color: COLORS.text,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  footer: {
    padding: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  activeDot: { backgroundColor: COLORS.accent, width: 24 },
  nextBtn: {
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: RADIUS.full,
    gap: 8,
  },
  nextBtnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  permBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.accent,
    padding: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  permBtnActive: {
    backgroundColor: 'rgba(52,199,89,0.1)',
    borderWidth: 1,
    borderColor: COLORS.green,
  },
  permBtnTxt: { color: '#fff', fontWeight: 'bold' },
});
