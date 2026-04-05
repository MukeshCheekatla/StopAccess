import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  NativeModules,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../components/theme';
import { HORIZONTAL_PADDING, isShort } from '../constants/layout';
import { securityVM, privacyVM } from '../api/nextdnsSettings';
import { getLogs } from '../services/logger';

function FeatureTile({
  title,
  subtitle,
  icon,
  tint,
  badge,
  onPress,
  style,
}: {
  title: string;
  subtitle: string;
  icon: string;
  tint: string;
  badge?: string;
  onPress: () => void;
  style?: any;
}) {
  return (
    <TouchableOpacity style={[styles.featureTile, style]} onPress={onPress}>
      <View style={[styles.featureIconBox, { backgroundColor: tint + '12' }]}>
        <Icon name={icon} size={20} color={tint} />
      </View>
      <View style={styles.featureCopy}>
        <View style={styles.featureTitleRow}>
          <Text style={styles.featureTitle}>{title}</Text>
          {badge ? (
            <View style={[styles.badge, { borderColor: tint + '40' }]}>
              <Text style={[styles.badgeText, { color: tint }]}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.featureSubtitle}>{subtitle}</Text>
      </View>
      <Icon name="chevron-right" size={20} color={COLORS.muted} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ navigation }: any) {
  const [protectionLevel, setProtectionLevel] = useState('NONE');
  const [protectionWarning, setProtectionWarning] = useState<string | null>(
    null,
  );
  const [a11yEnabled, setA11yEnabled] = useState(false);
  const [cloudConnected, setCloudConnected] = useState(false);
  const [securityEnabledCount, setSecurityEnabledCount] = useState(0);
  const [privacyFeatureCount, setPrivacyFeatureCount] = useState(0);
  const [diagnosticEvents, setDiagnosticEvents] = useState(0);
  const { width } = useWindowDimensions();
  const { RuleEngine } = NativeModules;

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        if (RuleEngine) {
          try {
            const level = await RuleEngine.getProtectionLevel();
            const warning = await RuleEngine.getProtectionWarning();
            const a11yOn = await RuleEngine.isAccessibilityEnabled();
            setProtectionLevel(level || 'NONE');
            setProtectionWarning(warning);
            setA11yEnabled(a11yOn);

            const { getConfig } = require('../api/nextdns');
            const cfg = await getConfig();
            setCloudConnected(!!cfg?.profileId && !!cfg?.apiKey);
          } catch (e) {
            console.error('Error loading health:', e);
          }
        }

        try {
          const [securityData, privacyData] = await Promise.all([
            securityVM.load(),
            privacyVM.load(),
          ]);

          if (securityData.settings) {
            setSecurityEnabledCount(await securityVM.getActiveCount());
          } else {
            setSecurityEnabledCount(0);
          }

          if (privacyData.settings) {
            const count =
              (privacyData.settings.blocklists?.length ?? 0) +
              (privacyData.settings.natives?.length ?? 0) +
              (privacyData.settings.disguisedTrackers ? 1 : 0) +
              (privacyData.settings.allowAffiliate ? 1 : 0);
            setPrivacyFeatureCount(count);
          } else {
            setPrivacyFeatureCount(0);
          }
        } catch {
          setSecurityEnabledCount(0);
          setPrivacyFeatureCount(0);
        }

        setDiagnosticEvents(getLogs().length);
      };
      load();
    }, [RuleEngine]),
  );

  const renderSectionHeader = (title: string, showLive = false) => (
    <View className="mb-4 mt-2 flex-row items-center justify-between">
      <Text className="text-[11px] font-black uppercase tracking-[2px] text-muted/60">
        {title}
      </Text>
      {showLive && (
        <View className="flex-row items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1">
          <View style={[styles.liveDot, { backgroundColor: COLORS.green }]} />
          <Text className="text-[9px] font-black uppercase tracking-[1px] text-green">
            READY
          </Text>
        </View>
      )}
    </View>
  );

  const headerStyle = useMemo(
    () => ({
      marginTop: isShort ? 20 : 40,
    }),
    [],
  );

  const featureColumns = width >= 768 ? 2 : 1;
  const featureItems = [
    {
      key: 'engine',
      title: 'NextDNS Profile',
      subtitle: 'Credentials, connection guide, and device linking',
      icon: 'dns-outline',
      tint: COLORS.accent,
      badge: cloudConnected ? 'LINKED' : 'SETUP',
      onPress: () => navigation.navigate('EngineSettings'),
    },
    {
      key: 'security',
      title: 'Security Controls',
      subtitle: 'Strict mode, cloud threat toggles, and TLD protections',
      icon: 'shield-key-outline',
      tint: COLORS.red,
      badge: `${securityEnabledCount} ON`,
      onPress: () => navigation.navigate('SecuritySettings'),
    },
    {
      key: 'privacy',
      title: 'Privacy Controls',
      subtitle: 'Tracker blocking, blocklists, and native telemetry rules',
      icon: 'incognito',
      tint: COLORS.green,
      badge: `${privacyFeatureCount} LIVE`,
      onPress: () => navigation.navigate('PrivacySettings'),
    },
    {
      key: 'diagnostics',
      title: 'Diagnostics',
      subtitle: 'Logs, sync state, and engine inspection tools',
      icon: 'application-braces-outline',
      tint: COLORS.yellow,
      badge: `${diagnosticEvents} EVENTS`,
      onPress: () => navigation.navigate('DiagnosticsSettings'),
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#0A0A0A]">
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingHorizontal: HORIZONTAL_PADDING },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={headerStyle} className="mb-8">
          <Text className="text-[34px] font-black tracking-tightest text-white">
            System Hub
          </Text>
          <Text className="mt-1 text-sm font-semibold text-muted">
            Manage protection and connectivity
          </Text>
        </View>

        {protectionWarning && (
          <TouchableOpacity
            className="mb-8 flex-row items-center gap-3 rounded-[20px] border border-[#CF66794D] bg-[#CF667926] p-4"
            onPress={() => RuleEngine?.openAccessibilitySettings()}
            activeOpacity={0.8}
          >
            <Icon name="alert-decagram" color={COLORS.red} size={22} />
            <Text className="flex-1 text-[13px] font-extrabold leading-[18px] text-red">
              {protectionWarning}
            </Text>
            <View className="rounded-lg bg-red px-3 py-1.5">
              <Text className="text-[10px] font-black uppercase text-black">
                Resolve
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {renderSectionHeader('PROTECTION HEALTH', true)}

        <View className="mb-8 rounded-3xl border border-border bg-card p-5">
          <View className="mb-[18px] flex-row items-center gap-3.5">
            <View
              className="flex-row items-center gap-1.5 rounded-[10px] px-2.5 py-1"
              style={{
                backgroundColor:
                  protectionLevel === 'STRONG'
                    ? COLORS.green + '15'
                    : COLORS.red + '15',
              }}
            >
              <Icon
                name={
                  protectionLevel === 'STRONG' ? 'shield-check' : 'shield-alert'
                }
                color={protectionLevel === 'STRONG' ? COLORS.green : COLORS.red}
                size={16}
              />
              <Text
                className="text-[11px] font-black uppercase"
                style={{
                  color:
                    protectionLevel === 'STRONG' ? COLORS.green : COLORS.red,
                }}
              >
                {protectionLevel}
              </Text>
            </View>
            <Text className="text-[17px] font-extrabold text-white">
              {protectionLevel === 'STRONG'
                ? 'Shield Verified'
                : 'Limited Defense'}
            </Text>
          </View>

          <View className="mb-[18px] h-px bg-border opacity-50" />

          <View className="gap-3.5">
            <View className="flex-row items-center gap-3">
              <Icon
                name="gesture-tap"
                size={18}
                color={a11yEnabled ? COLORS.green : COLORS.red}
              />
              <Text className="flex-1 text-sm font-semibold text-muted">
                Accessibility
              </Text>
              <Text
                className="text-[11px] font-black"
                style={{ color: a11yEnabled ? COLORS.green : COLORS.red }}
              >
                {a11yEnabled ? 'ON' : 'OFF'}
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              <Icon
                name="cloud-sync"
                size={18}
                color={cloudConnected ? COLORS.accent : COLORS.muted}
              />
              <Text className="flex-1 text-sm font-semibold text-muted">
                Cloud Sync
              </Text>
              <Text
                className="text-[11px] font-black"
                style={{ color: cloudConnected ? COLORS.accent : COLORS.muted }}
              >
                {cloudConnected ? 'LINKED' : 'MISSING'}
              </Text>
            </View>
          </View>
        </View>

        {renderSectionHeader('CONFIGURATION')}

        <View
          style={[
            styles.featureGrid,
            featureColumns === 2 && styles.featureGridTablet,
          ]}
        >
          {featureItems.map((item) => (
            <FeatureTile
              key={item.key}
              title={item.title}
              subtitle={item.subtitle}
              icon={item.icon}
              tint={item.tint}
              badge={item.badge}
              onPress={item.onPress}
              style={featureColumns === 2 ? styles.featureTileTablet : undefined}
            />
          ))}
        </View>

        <View className="items-center gap-2 pb-10">
          <View className="flex-row items-center gap-2 opacity-50">
            <Icon name="shield-star" size={18} color={COLORS.accent} />
            <Text className="text-[11px] font-black uppercase tracking-[1px] text-white">
              FocusGate Mobile v1.2
            </Text>
          </View>
          <Text className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-muted/40">
            Powered by NextDNS Engine
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 100 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  featureGrid: {
    marginBottom: 40,
    gap: 14,
  },
  featureGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureTile: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    width: '100%',
  },
  featureTileTablet: {
    width: '48.5%',
  },
  featureIconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCopy: { flex: 1 },
  featureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  featureTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  featureSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    opacity: 0.75,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
