import React, { useState, useCallback, useMemo } from 'react';
import {
  NativeModules,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../components/theme';
import { isShort } from '../constants/layout';
import { AppScreen, PrimaryButton, SurfaceCard } from '../ui/mobile';
import {
  hasUsagePermission,
  requestUsagePermission,
} from '../modules/usageStats';

const TOTAL_STEPS = 2; // 0: Welcome, 1: Permissions

const CheckItem = ({ done, label }: { done: boolean; label: string }) => (
  <View className="mb-[18px] flex-row items-center gap-3.5">
    <View style={[styles.checkCircle, done && styles.checkCircleDone]}>
      <Icon
        name={done ? 'check' : 'circle-outline'}
        size={14}
        color={done ? COLORS.bg : COLORS.muted}
      />
    </View>
    <Text style={[styles.checkLabel, done && styles.checkLabelDone]}>
      {label}
    </Text>
  </View>
);

export default function OnboardingScreen({
  onFinish,
}: {
  onFinish: () => void;
}) {
  const [step, setStep] = useState(0);

  const responsive = useMemo(
    () => ({
      heroSize: isShort ? 80 : 120,
      heroIcon: isShort ? 36 : 56,
      titleSize: isShort ? 28 : 34,
      descMargin: isShort ? 12 : 16,
      cardPadding: isShort ? 20 : 28,
      vSpacing: isShort ? 16 : 40,
    }),
    [],
  );

  const containerStyle = useMemo(
    () =>
      ({
        justifyContent: (isShort ? 'flex-start' : 'center') as
          | 'flex-start'
          | 'center',
        paddingTop: isShort ? 20 : 10,
        paddingBottom: 60,
      } as const),
    [],
  );

  const titleFontSize = useMemo(() => (isShort ? 13 : 15), []);
  const marginStyle = useMemo(() => ({ marginBottom: isShort ? 12 : 24 }), []);

  const nextStep = () => {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  const [usagePerm, setUsagePerm] = useState(false);
  const [a11yPerm, setA11yPerm] = useState(false);
  const [overlayPerm, setOverlayPerm] = useState(false);
  const [notiPerm, setNotiPerm] = useState(false);

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

  React.useEffect(() => {
    if (step === 1) {
      const timer = setInterval(refreshPerms, 2000);
      return () => clearInterval(timer);
    }
  }, [step, refreshPerms]);

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
    onFinish();
  };

  const progressPct = (step / (TOTAL_STEPS - 1)) * 100;

  return (
    <AppScreen>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <ScrollView
        contentContainerStyle={[styles.scroll, containerStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Icon name="shield-lock" size={24} color={COLORS.accent} />
            <Text style={styles.brandText}>StopAccess</Text>
          </View>
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${progressPct}%` }]}
              />
            </View>
          </View>
        </View>

        {step === 0 && (
          <View key="step_welcome" className="w-full">
            <View
              style={[
                styles.heroCircle,
                {
                  width: responsive.heroSize,
                  height: responsive.heroSize,
                  marginBottom: responsive.vSpacing,
                },
              ]}
            >
              <View
                style={[
                  styles.heroGlow,
                  {
                    width: responsive.heroSize / 2,
                    height: responsive.heroSize / 2,
                  },
                ]}
              />
              <Icon
                name="shield-check"
                size={responsive.heroIcon}
                color={COLORS.accent}
              />
            </View>
            <Text
              style={[styles.stepTitle, { fontSize: responsive.titleSize }]}
            >
              Block apps, sites, and weak moments
            </Text>
            <Text
              style={[
                styles.stepDesc,
                {
                  marginBottom: responsive.vSpacing,
                  fontSize: titleFontSize,
                },
              ]}
            >
              StopAccess combines Android app blocking, NextDNS rules, focus
              sessions, schedules, and strict controls so your limits are harder
              to casually bypass.
            </Text>

            <SurfaceCard
              className="mb-6 rounded-[28px] px-7 py-7"
              style={{ paddingHorizontal: responsive.cardPadding }}
            >
              <View style={styles.cardHeaderRow}>
                <Icon name="auto-fix" size={14} color={COLORS.accent} />
                <Text style={styles.cardHeader}>WHAT GETS PROTECTED</Text>
              </View>
              <CheckItem done={false} label="Android app limits and blocks" />
              <CheckItem done={false} label="NextDNS profile-wide rules" />
              <CheckItem done={false} label="Strict Mode and Guardian PIN" />
            </SurfaceCard>
          </View>
        )}

        {step === 1 && (
          <View key="step_perms" className="w-full">
            <View
              style={[
                styles.heroCircle,
                {
                  width: responsive.heroSize,
                  height: responsive.heroSize,
                  marginBottom: responsive.vSpacing,
                },
              ]}
            >
              <View
                style={[
                  styles.heroGlow,
                  {
                    width: responsive.heroSize / 2,
                    height: responsive.heroSize / 2,
                  },
                ]}
              />
              <Icon
                name="shield-key-outline"
                size={responsive.heroIcon}
                color={COLORS.accent}
              />
            </View>
            <Text
              style={[styles.stepTitle, { fontSize: responsive.titleSize }]}
            >
              Enable Android enforcement
            </Text>
            <Text
              style={[
                styles.stepDesc,
                {
                  marginBottom: responsive.vSpacing,
                  fontSize: titleFontSize,
                },
              ]}
            >
              These permissions let StopAccess detect app usage, block active
              distractions, show the block screen, and warn you when protection
              needs attention.
            </Text>

            <SurfaceCard
              className="rounded-[28px] p-7"
              style={{
                padding: responsive.cardPadding,
                marginBottom: marginStyle.marginBottom,
              }}
            >
              <CheckItem done={usagePerm} label="Usage access for app limits" />
              <CheckItem done={a11yPerm} label="Accessibility app detection" />
              <CheckItem done={overlayPerm} label="Block screen overlay" />
              <CheckItem done={notiPerm} label="Protection alerts" />
            </SurfaceCard>

            <View style={styles.permGrid}>
              {!usagePerm && (
                <PrimaryButton
                  label="Grant Usage"
                  icon="chart-box-outline"
                  onPress={handleGrantUsage}
                  style={styles.permBtn}
                  textStyle={styles.permBtnTextColor}
                />
              )}

              {!a11yPerm && (
                <PrimaryButton
                  label="Enable Blocker"
                  icon="gesture-tap"
                  onPress={handleGrantA11y}
                  style={styles.permBtn}
                  textStyle={styles.permBtnTextColor}
                />
              )}

              {!overlayPerm && (
                <PrimaryButton
                  label="HUD Overlay"
                  icon="layers-outline"
                  onPress={handleGrantOverlay}
                  style={styles.permBtn}
                  textStyle={styles.permBtnTextColor}
                />
              )}

              {!notiPerm && (
                <PrimaryButton
                  label="System Alerts"
                  icon="bell-outline"
                  onPress={handleGrantNoti}
                  style={styles.permBtn}
                  textStyle={styles.permBtnTextColor}
                />
              )}

              {usagePerm && a11yPerm && overlayPerm && notiPerm && (
                <View className="mt-2.5 flex-row items-center justify-center gap-3 rounded-3xl border border-[#03DAC633] bg-[#03DAC61A] p-6">
                  <Icon name="check-decagram" size={24} color={COLORS.green} />
                  <Text style={styles.successBadgeTxt}>ALL LAYERS ACTIVE</Text>
                </View>
              )}
            </View>

            <Text style={styles.skipHint}>
              Full activation is recommended for reliable Android blocking.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.sideBtnSlotStart}>
          {step > 0 ? (
            <TouchableOpacity
              key="back_active"
              style={styles.backBtn}
              onPress={prevStep}
              activeOpacity={0.7}
            >
              <Icon name="chevron-left" size={32} color={COLORS.muted} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
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

        <View style={styles.sideBtnSlotEnd}>
          {step === TOTAL_STEPS - 1 ? (
            <PrimaryButton
              label={
                !usagePerm || !a11yPerm || !overlayPerm || !notiPerm
                  ? 'Skip'
                  : 'Ready'
              }
              onPress={handleFinish}
              style={styles.accentBtn}
            />
          ) : (
            <PrimaryButton
              label="Start"
              icon="chevron-right"
              onPress={nextStep}
              style={styles.accentBtn}
            />
          )}
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    opacity: 0.8,
  },
  brandText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 3,
  },
  progressRow: {
    width: '100%',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 32,
  },
  heroCircle: {
    width: 120,
    height: 120,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.accent,
    opacity: 0.1,
  },
  stepTitle: {
    color: COLORS.text,
    fontSize: 34,
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
    paddingHorizontal: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  cardHeader: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  checkCircleDone: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  checkLabel: {
    color: COLORS.muted,
    fontSize: 15,
    fontWeight: '600',
  },
  checkLabelDone: {
    color: COLORS.text,
    fontWeight: '800',
  },
  permGrid: { gap: 12 },
  permBtn: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
    backgroundColor: 'rgba(255,255,255,0.02)',
    height: 60,
  },
  permBtnTextColor: {
    color: COLORS.accent,
  },
  successBadgeTxt: {
    color: COLORS.green,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 2,
  },
  skipHint: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '600',
    opacity: 0.5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 10,
  },
  sideBtnSlotStart: { flex: 1, alignItems: 'flex-start' },
  sideBtnSlotEnd: { flex: 1, alignItems: 'flex-end' },
  pagination: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: COLORS.accent,
  },
  backBtn: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accentBtn: {
    height: 54,
    borderRadius: 18,
    paddingHorizontal: 24,
  },
});
