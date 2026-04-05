import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, RADIUS } from '../../components/theme';
import { privacyVM } from '../../api/nextdnsSettings';
import type { NextDNSPrivacySettings } from '@focusgate/types';

function ToggleRow({
  icon,
  label,
  description,
  value,
  onChange,
  showDivider = true,
}: {
  icon: string;
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  showDivider?: boolean;
}) {
  return (
    <View style={styles.rowShell}>
      <View style={styles.rowLead}>
        <View style={styles.iconBox}>
          <Icon name={icon} size={18} color={COLORS.accent} />
        </View>
        <View style={styles.rowCopy}>
          <Text style={styles.rowTitle}>{label}</Text>
          <Text style={styles.rowDescription}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: COLORS.border, true: COLORS.accent }}
        thumbColor={value ? '#fff' : '#f4f3f4'}
      />
      {showDivider ? <View style={styles.divider} /> : null}
    </View>
  );
}

function CollectionCard({
  title,
  subtitle,
  icon,
  accent,
  items,
  addLabel,
  onAdd,
  onRemove,
  emptyLabel,
}: {
  title: string;
  subtitle: string;
  icon: string;
  accent: string;
  items: Array<{ id: string; name?: string }>;
  addLabel: string;
  onAdd: () => void;
  onRemove: (id: string) => void;
  emptyLabel: string;
}) {
  return (
    <View style={styles.collectionCard}>
      <View style={styles.collectionHeader}>
        <View style={styles.collectionLead}>
          <View style={[styles.collectionIconBox, { backgroundColor: accent + '15' }]}>
            <Icon name={icon} size={18} color={accent} />
          </View>
          <View style={styles.collectionCopy}>
            <Text style={styles.collectionTitle}>{title}</Text>
            <Text style={styles.collectionSubtitle}>{subtitle}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.collectionAction, { borderColor: accent + '45' }]}
          onPress={onAdd}
        >
          <Text style={[styles.collectionActionText, { color: accent }]}>
            {addLabel}
          </Text>
        </TouchableOpacity>
      </View>

      {items.length > 0 ? (
        <View style={styles.tokenWrap}>
          {items.map((item) => (
            <View key={item.id} style={styles.token}>
              <Text style={styles.tokenText}>{item.name || item.id}</Text>
              <TouchableOpacity onPress={() => onRemove(item.id)}>
                <Icon name="close" size={14} color={COLORS.muted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyCollection}>
          <Text style={styles.emptyCollectionText}>{emptyLabel}</Text>
        </View>
      )}
    </View>
  );
}

export default function PrivacySettingsScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [privacySettings, setPrivacySettings] =
    useState<NextDNSPrivacySettings | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'blocklist' | 'native'>(
    'blocklist',
  );
  const [draftId, setDraftId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await privacyVM.load();
      setIsConfigured(result.isConfigured);
      setPrivacySettings(result.settings);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = useMemo(() => {
    const blocklists = privacySettings?.blocklists?.length ?? 0;
    const natives = privacySettings?.natives?.length ?? 0;
    return [
      { label: 'Blocklists', value: String(blocklists), icon: 'shield-moon' },
      { label: 'Native Trackers', value: String(natives), icon: 'cellphone-link' },
      {
        label: 'Smart Tracking',
        value: privacySettings?.disguisedTrackers ? 'On' : 'Off',
        icon: 'incognito',
      },
    ];
  }, [privacySettings]);

  const openAddModal = (mode: 'blocklist' | 'native') => {
    setModalMode(mode);
    setDraftId('');
    setModalVisible(true);
  };

  const saveCollectionItem = async () => {
    const normalized = draftId.trim().toLowerCase();
    if (!normalized) {
      Alert.alert('Missing Value', 'Enter an id to continue.');
      return;
    }

    const result =
      modalMode === 'blocklist'
        ? await privacyVM.addBlocklist(normalized)
        : await privacyVM.addNativeTracking(normalized);

    if (!result.ok) {
      Alert.alert('Unable to Save', result.error || 'Please try again.');
      return;
    }

    setModalVisible(false);
    load();
  };

  const removeCollectionItem = async (mode: 'blocklist' | 'native', id: string) => {
    const result =
      mode === 'blocklist'
        ? await privacyVM.removeBlocklist(id)
        : await privacyVM.removeNativeTracking(id);

    if (!result.ok) {
      Alert.alert('Unable to Remove', result.error || 'Please try again.');
      return;
    }

    load();
  };

  const togglePrivacy = async (
    key: 'disguisedTrackers' | 'allowAffiliate',
    value: boolean,
  ) => {
    if (!privacySettings) {
      return;
    }

    const previous = privacySettings;
    setPrivacySettings({ ...privacySettings, [key]: value });

    const result =
      key === 'disguisedTrackers'
        ? await privacyVM.toggleDisguisedTrackers(value)
        : await privacyVM.toggleAllowAffiliate(value);

    if (!result.ok) {
      setPrivacySettings(previous);
      Alert.alert('Unable to Update', result.error || 'Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderScreen}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="chevron-left" size={30} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isTablet && styles.scrollTablet,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>TRACKING DEFENSE</Text>
          <Text style={styles.sectionDesc}>
            Bring the extension&apos;s privacy controls into the app: smart
            tracker filtering, curated blocklists, and native telemetry
            blocking.
          </Text>
        </View>

        {!isConfigured ? (
          <View style={styles.warningCard}>
            <Icon name="cloud-off-outline" size={20} color={COLORS.yellow} />
            <View style={styles.warningCopy}>
              <Text style={styles.warningTitle}>NextDNS profile required</Text>
              <Text style={styles.warningText}>
                Connect your profile to manage privacy rules across devices.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={[styles.metricGrid, isTablet && styles.metricGridTablet]}>
          {metrics.map((metric) => (
            <View
              key={metric.label}
              style={[styles.metricCard, isTablet && styles.metricCardTablet]}
            >
              <View style={styles.metricIconBox}>
                <Icon name={metric.icon} size={18} color={COLORS.accent} />
              </View>
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricLabel}>{metric.label}</Text>
            </View>
          ))}
        </View>

        {privacySettings ? (
          <>
            <View style={styles.card}>
              <ToggleRow
                icon="incognito"
                label="Disguised Trackers"
                description="Block trackers hidden behind first-party requests."
                value={privacySettings.disguisedTrackers}
                onChange={(value) => togglePrivacy('disguisedTrackers', value)}
              />
              <ToggleRow
                icon="handshake-outline"
                label="Allow Affiliate Links"
                description="Let affiliate redirects pass through when needed."
                value={privacySettings.allowAffiliate}
                onChange={(value) => togglePrivacy('allowAffiliate', value)}
                showDivider={false}
              />
            </View>

            <View style={[styles.collections, isTablet && styles.collectionsTablet]}>
              <CollectionCard
                title="Blocklists"
                subtitle="Curated DNS deny catalogs"
                icon="shield-moon-outline"
                accent={COLORS.accent}
                items={privacySettings.blocklists}
                addLabel="Add"
                onAdd={() => openAddModal('blocklist')}
                onRemove={(id) => removeCollectionItem('blocklist', id)}
                emptyLabel="No blocklists active yet."
              />

              <CollectionCard
                title="Native Tracking"
                subtitle="OEM telemetry providers"
                icon="cellphone-link"
                accent={COLORS.green}
                items={privacySettings.natives}
                addLabel="Add"
                onAdd={() => openAddModal('native')}
                onRemove={(id) => removeCollectionItem('native', id)}
                emptyLabel="No native tracking providers configured."
              />
            </View>
          </>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>FocusGate Privacy Bridge</Text>
          <Text style={styles.footerCopy}>
            Powered by the same shared privacy view-models used by the extension.
          </Text>
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Add {modalMode === 'blocklist' ? 'Blocklist' : 'Native Tracker'}
            </Text>
            <Text style={styles.modalCopy}>
              Enter the NextDNS id exactly as it should be stored.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={draftId}
              onChangeText={setDraftId}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={modalMode === 'blocklist' ? 'e.g. oisd' : 'e.g. apple'}
              placeholderTextColor={COLORS.muted}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimary} onPress={saveCollectionItem}>
                <Text style={styles.modalPrimaryText}>Save</Text>
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
  loaderScreen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
    marginRight: 6,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  scrollTablet: {
    paddingHorizontal: 32,
  },
  sectionHeader: {
    marginBottom: 18,
  },
  sectionLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginBottom: 8,
  },
  sectionDesc: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.8,
  },
  warningCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.yellow + '30',
    backgroundColor: COLORS.yellow + '14',
    padding: 16,
    marginBottom: 16,
  },
  warningCopy: { flex: 1 },
  warningTitle: {
    color: COLORS.yellow,
    fontSize: 14,
    fontWeight: '800',
  },
  warningText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  metricGridTablet: {
    flexWrap: 'nowrap',
  },
  metricCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
  },
  metricCardTablet: {
    flex: 1,
    width: undefined,
  },
  metricIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.accent + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  metricValue: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  metricLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginTop: 5,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 18,
  },
  rowShell: {
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  rowLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingRight: 56,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {
    flex: 1,
    paddingRight: 12,
  },
  rowTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  rowDescription: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  divider: {
    position: 'absolute',
    left: 64,
    right: 14,
    bottom: 0,
    height: 1,
    backgroundColor: COLORS.border,
    opacity: 0.4,
  },
  collections: {
    gap: 14,
  },
  collectionsTablet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  collectionCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
  },
  collectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  collectionLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  collectionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionCopy: { flex: 1 },
  collectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  collectionSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  collectionAction: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  collectionActionText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tokenWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  token: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tokenText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCollection: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    padding: 16,
  },
  emptyCollectionText: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  footer: {
    marginTop: 26,
    alignItems: 'center',
    opacity: 0.65,
  },
  footerTitle: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  footerCopy: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  modalCopy: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  modalInput: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
    color: COLORS.text,
    paddingHorizontal: 16,
    marginTop: 20,
    fontSize: 15,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalCancel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
  },
  modalCancelText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  modalPrimary: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
  },
  modalPrimaryText: {
    color: COLORS.bg,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
