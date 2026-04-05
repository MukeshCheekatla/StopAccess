import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, RADIUS } from '../../components/theme';
import { storageAdapter } from '../../store/storageAdapter';
import { securityVM, privacyVM } from '../../api/nextdnsSettings';
import { isConfigured as isNextDnsConfigured } from '../../api/nextdns';
import {
  NextDNSSecuritySettings,
  NextDNSPrivacySettings,
} from '@focusgate/types';

const STRICT_MODE_KEY = 'strict_mode_enabled';

const SettingRow = ({
  label,
  value,
  onValueChange,
  icon,
  showDivider = true,
}: any) => (
  <View style={styles.settingRow}>
    <View style={styles.settingMain}>
      <View style={styles.iconBox}>
        <Icon name={icon} size={20} color={COLORS.accent} />
      </View>
      <Text style={styles.settingLabel}>{label}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: COLORS.border, true: COLORS.accent }}
      thumbColor={value ? '#fff' : '#f4f3f4'}
    />
    {showDivider && <View style={styles.divider} />}
  </View>
);

export default function SecuritySettingsScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [strictMode, setStrictMode] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [removePinVisible, setRemovePinVisible] = useState(false);
  const [removePinInput, setRemovePinInput] = useState('');
  const [pin, setPin] = useState<string | null>(null);
  const [tldModalVisible, setTldModalVisible] = useState(false);
  const [tldInput, setTldInput] = useState('');

  const [securitySettings, setSecuritySettings] =
    useState<NextDNSSecuritySettings | null>(null);
  const [privacySettings, setPrivacySettings] =
    useState<NextDNSPrivacySettings | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load state on mount
  useEffect(() => {
    const loadState = async () => {
      const storedStrictMode = await storageAdapter.getString(STRICT_MODE_KEY);
      setStrictMode(storedStrictMode === 'true');

      const savedPin = await storageAdapter.getString('protection_pin');
      setPin(savedPin);

      if (await isNextDnsConfigured()) {
        setIsConfigured(true);
        try {
          const s = await securityVM.load();
          const p = await privacyVM.load();
          if (s.settings) {
            setSecuritySettings(s.settings);
          }
          if (p.settings) {
            setPrivacySettings(p.settings);
          }
        } catch (e) {
          console.error('Failed to load NextDNS settings:', e);
        }
      }
      setLoading(false);
    };

    loadState();
  }, []);

  const toggleStrictMode = async (value: boolean) => {
    if (value && !pin) {
      Alert.alert(
        'Security Required',
        'You must set a Protection PIN before enabling Strict Mode.',
      );
      return;
    }
    setStrictMode(value);
    await storageAdapter.set(STRICT_MODE_KEY, value);
  };

  const savePin = async () => {
    if (newPin.length < 4) {
      Alert.alert('Invalid PIN', 'PIN must be at least 4 digits.');
      return;
    }
    await storageAdapter.set('protection_pin', newPin);
    setPin(newPin);
    setNewPin('');
    Alert.alert('Success', 'Protection PIN has been set.');
  };

  const removePin = async () => {
    if (removePinInput === pin) {
      await storageAdapter.delete('protection_pin');
      setPin(null);
      setRemovePinInput('');
      setRemovePinVisible(false);
      // Also disable strict mode if pin is removed
      setStrictMode(false);
      await storageAdapter.set(STRICT_MODE_KEY, false);
      Alert.alert('Success', 'Protection PIN has been removed.');
    } else {
      Alert.alert('Error', 'Incorrect PIN.');
    }
  };

  const toggleNextDNSSecurity = async (
    key: keyof Omit<NextDNSSecuritySettings, 'tlds'>,
    value: boolean,
  ) => {
    if (!securitySettings) {
      return;
    }
    const updated = { ...securitySettings, [key]: value };
    setSecuritySettings(updated);
    try {
      const res = await securityVM.toggleSetting(key, value);
      if (!res.ok) {
        throw new Error(res.error);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update cloud settings.');
      setSecuritySettings(securitySettings); // revert
    }
  };

  const addBlockedTld = async () => {
    const normalized = tldInput.trim().toLowerCase().replace(/^\./, '');
    if (!normalized) {
      Alert.alert('Missing TLD', 'Enter a top-level domain such as `ru`.');
      return;
    }
    const result = await securityVM.addTld(normalized);
    if (!result.ok) {
      Alert.alert('Unable to Add', result.error || 'Please try again.');
      return;
    }
    setSecuritySettings((current) =>
      current
        ? {
            ...current,
            tlds: current.tlds.some((t) => t.id === normalized)
              ? current.tlds
              : [...current.tlds, { id: normalized }],
          }
        : current,
    );
    setTldInput('');
    setTldModalVisible(false);
  };

  const removeBlockedTld = async (id: string) => {
    const result = await securityVM.removeTld(id);
    if (!result.ok) {
      Alert.alert('Unable to Remove', result.error || 'Please try again.');
      return;
    }
    setSecuritySettings((current) =>
      current
        ? { ...current, tlds: current.tlds.filter((t) => t.id !== id) }
        : current,
    );
  };

  const toggleNextDNSPrivacy = async (
    key: 'disguisedTrackers' | 'allowAffiliate',
    value: boolean,
  ) => {
    if (!privacySettings) {
      return;
    }
    const updated = { ...privacySettings, [key]: value };
    setPrivacySettings(updated);
    try {
      const res =
        key === 'disguisedTrackers'
          ? await privacyVM.toggleDisguisedTrackers(value)
          : await privacyVM.toggleAllowAffiliate(value);
      if (!res.ok) {
        throw new Error(res.error);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update cloud settings.');
      setPrivacySettings(privacySettings); // revert
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Icon name="chevron-left" size={32} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>CORE PROTECTION</Text>
          <Text style={styles.sectionDesc}>
            Manage your local device security and override prevention.
          </Text>
        </View>

        <View style={[styles.metricGrid, isTablet && styles.metricGridTablet]}>
          <View style={[styles.metricCard, isTablet && styles.metricCardTablet]}>
            <Text style={styles.metricValue}>{strictMode ? 'ON' : 'OFF'}</Text>
            <Text style={styles.metricLabel}>Strict Mode</Text>
          </View>
          <View style={[styles.metricCard, isTablet && styles.metricCardTablet]}>
            <Text style={styles.metricValue}>
              {securitySettings?.tlds?.length ?? 0}
            </Text>
            <Text style={styles.metricLabel}>Blocked TLDs</Text>
          </View>
          <View style={[styles.metricCard, isTablet && styles.metricCardTablet]}>
            <Text style={styles.metricValue}>{pin ? 'SET' : 'NONE'}</Text>
            <Text style={styles.metricLabel}>Protection PIN</Text>
          </View>
        </View>

        <View style={styles.card}>
          <SettingRow
            label="Strict Mode"
            icon="shield-lock"
            value={strictMode}
            onValueChange={toggleStrictMode}
            showDivider={!!pin}
          />

          {pin ? (
            <TouchableOpacity
              style={styles.dangerZone}
              onPress={() => setRemovePinVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.dangerContent}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: COLORS.red + '15' },
                  ]}
                >
                  <Icon name="lock-reset" size={20} color={COLORS.red} />
                </View>
                <View>
                  <Text style={styles.dangerTitle}>Remove Protection PIN</Text>
                  <Text style={styles.dangerDesc}>
                    Required to disable security features
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.pinEntry}>
              <View style={styles.iconBox}>
                <Icon name="key-variant" size={20} color={COLORS.accent} />
              </View>
              <TextInput
                style={styles.pinInput}
                placeholder="Set 4-digit PIN"
                placeholderTextColor={COLORS.muted}
                keyboardType="numeric"
                secureTextEntry
                maxLength={4}
                value={newPin}
                onChangeText={setNewPin}
              />
              <TouchableOpacity style={styles.savePinBtn} onPress={savePin}>
                <Text style={styles.savePinTxt}>SET PIN</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {isConfigured && securitySettings && (
          <>
            <View style={[styles.sectionHeader, styles.marginTop32]}>
              <Text style={styles.sectionLabel}>CLOUD PROTECTION</Text>
              <Text style={styles.sectionDesc}>
                Advanced security intelligence managed at the network level.
              </Text>
            </View>

            <View style={styles.card}>
              <SettingRow
                label="Threat Intelligence"
                icon="shield-search"
                value={securitySettings.threatIntelligenceFeeds}
                onValueChange={(v: boolean) =>
                  toggleNextDNSSecurity('threatIntelligenceFeeds', v)
                }
              />
              <SettingRow
                label="AI Threat Detection"
                icon="robot-outline"
                value={securitySettings.aiThreatDetection}
                onValueChange={(v: boolean) =>
                  toggleNextDNSSecurity('aiThreatDetection', v)
                }
              />
              <SettingRow
                label="Domain Generation Alg"
                icon="blur"
                value={securitySettings.dga}
                onValueChange={(v: boolean) => toggleNextDNSSecurity('dga', v)}
              />
              <SettingRow
                label="DNS Rebinding"
                icon="link-variant-off"
                value={securitySettings.dnsRebinding}
                onValueChange={(v: boolean) =>
                  toggleNextDNSSecurity('dnsRebinding', v)
                }
              />
              <SettingRow
                label="Parked Domains"
                icon="parking"
                value={securitySettings.parking}
                onValueChange={(v: boolean) =>
                  toggleNextDNSSecurity('parking', v)
                }
              />
              <SettingRow
                label="New Domains (30d)"
                icon="new-box"
                value={securitySettings.nrd}
                onValueChange={(v: boolean) => toggleNextDNSSecurity('nrd', v)}
              />
              <SettingRow
                label="CSAM Blocking"
                icon="shield-alert"
                value={securitySettings.csam}
                onValueChange={(v: boolean) => toggleNextDNSSecurity('csam', v)}
                showDivider={false}
              />
            </View>

            <View style={styles.infoCard}>
              <Icon name="information-outline" size={16} color={COLORS.muted} />
              <Text style={styles.infoText}>
                Cloud settings are synced across all your FocusGate protected
                devices using NextDNS infrastructure.
              </Text>
            </View>

            <View style={[styles.sectionHeader, styles.marginTop32]}>
              <Text style={styles.sectionLabel}>TLD BLOCKING</Text>
              <Text style={styles.sectionDesc}>
                Restrict risky top-level domains the same way the extension does.
              </Text>
            </View>

            <View style={styles.card}>
              <TouchableOpacity
                style={styles.inlineAction}
                onPress={() => {
                  setTldInput('');
                  setTldModalVisible(true);
                }}
              >
                <View style={styles.inlineActionLead}>
                  <View style={styles.iconBox}>
                    <Icon name="plus-circle-outline" size={20} color={COLORS.accent} />
                  </View>
                  <View>
                    <Text style={styles.settingLabel}>Add Blocked TLD</Text>
                    <Text style={styles.helperText}>
                      Example: `ru`, `cn`, `zip`
                    </Text>
                  </View>
                </View>
                <Icon name="chevron-right" size={20} color={COLORS.muted} />
              </TouchableOpacity>

              <View style={styles.tokenWrap}>
                {securitySettings.tlds.length > 0 ? (
                  securitySettings.tlds.map((tld) => (
                    <View key={tld.id} style={styles.token}>
                      <Text style={styles.tokenText}>.{tld.id}</Text>
                      <TouchableOpacity onPress={() => removeBlockedTld(tld.id)}>
                        <Icon name="close" size={14} color={COLORS.muted} />
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyTokenText}>
                    No TLD restrictions configured yet.
                  </Text>
                )}
              </View>
            </View>
          </>
        )}

        {privacySettings && (
          <>
            <View style={[styles.sectionHeader, styles.marginTop8]}>
              <Text style={styles.sectionLabel}>PRIVACY ENFORCEMENT</Text>
              <Text style={styles.sectionDesc}>
                Restrict data-hungry tracking & affiliate redirects.
              </Text>
            </View>

            <View style={styles.card}>
              <SettingRow
                label="Block Trackers"
                icon="account-cancel"
                value={privacySettings.disguisedTrackers}
                onValueChange={(v: boolean) =>
                  toggleNextDNSPrivacy('disguisedTrackers', v)
                }
              />
              <SettingRow
                label="Allow Affiliates"
                icon="handshake-outline"
                value={privacySettings.allowAffiliate}
                onValueChange={(v: boolean) =>
                  toggleNextDNSPrivacy('allowAffiliate', v)
                }
                showDivider={false}
              />
            </View>
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.versionText}>
            FocusGate Security Engine v2.0.4
          </Text>
          <Text style={styles.engineText}>Powered by NextDNS Intelligence</Text>
        </View>
      </ScrollView>

      {/* PIN Removal Modal */}
      <Modal
        visible={tldModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTldModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Blocked TLD</Text>
            <Text style={styles.modalDesc}>
              Enter the top-level domain without the leading dot.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. ru"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="none"
              autoCorrect={false}
              value={tldInput}
              onChangeText={setTldInput}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => setTldModalVisible(false)}
              >
                <Text style={styles.modalBtnTxt}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={addBlockedTld}
              >
                <Text style={[styles.modalBtnTxt, { color: COLORS.bg }]}>
                  SAVE
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={removePinVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRemovePinVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Authentication Required</Text>
            <Text style={styles.modalDesc}>
              Enter your Protection PIN to disable security protocols.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter PIN"
              placeholderTextColor={COLORS.muted}
              keyboardType="numeric"
              secureTextEntry
              autoFocus
              value={removePinInput}
              onChangeText={setRemovePinInput}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => {
                  setRemovePinVisible(false);
                  setRemovePinInput('');
                }}
              >
                <Text style={styles.modalBtnTxt}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={removePin}
              >
                <Text style={[styles.modalBtnTxt, { color: COLORS.bg }]}>
                  CONFIRM
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
    marginLeft: 4,
    letterSpacing: -0.5,
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 },
  metricGridTablet: { flexWrap: 'nowrap' },
  metricCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  metricCardTablet: { flex: 1, width: undefined },
  metricValue: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  metricLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  sectionHeader: { marginBottom: 16, marginTop: 12 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.muted,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
    opacity: 0.8,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  settingMain: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingLabel: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  helperText: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    position: 'absolute',
    bottom: 0,
    left: 64,
    right: 12,
    height: 1,
    backgroundColor: COLORS.border,
    opacity: 0.3,
  },
  pinEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
  },
  pinInput: {
    flex: 1,
    height: 44,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 0,
  },
  savePinBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  savePinTxt: { fontSize: 12, fontWeight: '900', color: COLORS.bg },
  dangerZone: { padding: 12 },
  dangerContent: { flexDirection: 'row', alignItems: 'center' },
  dangerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.red },
  dangerDesc: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  infoText: { flex: 1, fontSize: 12, color: COLORS.muted, lineHeight: 18 },
  inlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  inlineActionLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  tokenWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 16,
  },
  token: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tokenText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyTokenText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  footer: { marginTop: 40, alignItems: 'center', opacity: 0.5 },
  versionText: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '800',
    letterSpacing: 1,
  },
  engineText: { fontSize: 10, color: COLORS.muted, marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 32,
    padding: 32,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalDesc: {
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    height: 60,
    textAlign: 'center',
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalBtnPrimary: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  modalBtnTxt: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  marginTop32: { marginTop: 32 },
  marginTop8: { marginTop: 8 },
});
