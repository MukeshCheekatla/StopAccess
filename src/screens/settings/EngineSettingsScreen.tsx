import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  NativeModules,
  Modal,
  Clipboard,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING, RADIUS } from '../../components/theme';
import { saveConfig, getConfig } from '../../api/nextdns';
import * as nextDNSApi from '../../api/nextdns';
import { runFullEngineCycle } from '@stopaccess/core';
import { storageAdapter } from '../../store/storageAdapter';
import { addLog } from '../../services/logger';
import { notifyBlocked } from '../../services/notifications';

export default function EngineSettingsScreen({ navigation }: any) {
  const [profileId, setProfileId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [dashVisible, setDashVisible] = useState(false);
  const [dashStep, setDashStep] = useState(0); // 0: ID, 1: Key, 2: DNS Guide
  const [currentUrl, setCurrentUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [hudError, setHudError] = useState<string | null>(null);
  const [hudSuccess, setHudSuccess] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);

  const { RuleEngine } = NativeModules;

  const isConfigured = !!profileId && !!apiKey;
  const statusColor = isConfigured ? COLORS.accent : COLORS.red;

  useEffect(() => {
    getConfig().then((cfg) => {
      if (cfg) {
        if (cfg.profileId) {
          setProfileId(cfg.profileId);
        }
        if (cfg.apiKey) {
          setApiKey(cfg.apiKey);
        }
        setIsEditing(!(cfg.profileId && cfg.apiKey));
      } else {
        setIsEditing(true);
      }
    });
  }, []);

  const triggerEngineCycle = async () => {
    const ctx = {
      storage: storageAdapter,
      api: nextDNSApi as any,
      logger: { add: addLog },
      notifications: { notifyBlocked },
      enforcements: {
        applyBlockedPackages: async (pkgs: string[]) => {
          if (
            RuleEngine &&
            typeof RuleEngine.setBlockedPackages === 'function'
          ) {
            RuleEngine.setBlockedPackages(pkgs);
          }
        },
      },
    };
    await runFullEngineCycle(ctx);
  };

  /**
   * Auto-extract Profile ID from URL Fingerprint
   */
  useEffect(() => {
    const isLoginPage =
      currentUrl.includes('/login') ||
      currentUrl.includes('/signup') ||
      currentUrl.includes('/auth') ||
      currentUrl.includes('google.com') ||
      currentUrl === '' ||
      currentUrl === 'about:blank';

    if (dashStep === 0 && !isLoginPage) {
      const match = currentUrl.match(/my\.nextdns\.io\/([a-z0-9]{6})/i);
      if (match && match[1]) {
        const extractedId = match[1];
        if (profileId !== extractedId) {
          setProfileId(extractedId);
          saveConfig({ profileId: extractedId, apiKey });
        }
      }
    }
  }, [currentUrl, dashStep, apiKey, profileId]);

  const handleCaptureFromClipboard = async () => {
    const text = await Clipboard.getString();
    const cleanText = text.trim();

    if (dashStep === 0) {
      const captureId = cleanText.length === 6 ? cleanText : profileId;
      if (captureId.length === 6) {
        setProfileId(captureId);
        await saveConfig({ profileId: captureId, apiKey });
        setHudError(null);
        setHudSuccess(true);
        setTimeout(() => {
          setDashStep(1);
          setHudSuccess(false);
        }, 1200);
      } else {
        setHudError('Could not find your Profile ID. Please copy it.');
      }
    } else if (dashStep === 1) {
      if (cleanText.length > 20) {
        setApiKey(cleanText);
        await saveConfig({ profileId, apiKey: cleanText });
        setHudError(null);
        setHudSuccess(true);
        setTimeout(() => {
          setDashStep(2);
          setHudSuccess(false);
        }, 1200);
      } else {
        setHudError('Please copy a valid API Key.');
      }
    } else {
      setDashVisible(false);
      setIsEditing(false);
    }
  };

  /**
   * HUD Step-Based Verification Logic
   */
  const urlHasIdFingerprint = currentUrl.match(/[a-z0-9]{6}/i);
  const isOnAccountSettings =
    currentUrl.includes('/account') || currentUrl.includes('/settings');
  const isAuthOrBlank =
    currentUrl.includes('/login') ||
    currentUrl.includes('/signup') ||
    currentUrl.includes('/auth') ||
    currentUrl.includes('google.com') ||
    currentUrl === '' ||
    currentUrl === 'about:blank';

  let shouldShowHUD = false;
  if (!isAuthOrBlank) {
    if (dashStep === 0 && urlHasIdFingerprint) {
      shouldShowHUD = true;
    } else if (dashStep === 1 && isOnAccountSettings) {
      shouldShowHUD = true;
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Icon name="chevron-left" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Settings</Text>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionLabel}>
              {isEditing ? 'MANUAL SETUP' : 'CONNECTED ACCOUNT'}
            </Text>
            {isConfigured && !isEditing && (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Text style={styles.editBtnTxt}>EDIT INFO</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.sectionDesc}>
            {isEditing
              ? 'Enter your NextDNS credentials below.'
              : 'Your account is linked and protection is active.'}
          </Text>
        </View>

        {!isEditing && isConfigured ? (
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <View style={styles.summaryLabelWrap}>
                <Icon name="identifier" size={16} color={COLORS.muted} />
                <Text style={styles.summaryLabel}>PROFILE ID</Text>
              </View>
              <Text style={styles.summaryValue}>{profileId}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <View style={styles.summaryLabelWrap}>
                <Icon name="key-variant" size={16} color={COLORS.muted} />
                <Text style={styles.summaryLabel}>API KEY</Text>
              </View>
              <Text style={styles.summaryValue}>••••••••••••••••</Text>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Profile ID</Text>
              <TextInput
                style={styles.manualInput}
                value={profileId}
                onChangeText={setProfileId}
                placeholder="e.g. abc123"
                placeholderTextColor={COLORS.muted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroupNoTop}>
              <Text style={styles.label}>API Key</Text>
              <TextInput
                style={styles.manualInput}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="Enter your API key"
                placeholderTextColor={COLORS.muted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {isEditing && profileId && apiKey && (
              <TouchableOpacity
                style={styles.inlineSaveBtn}
                onPress={async () => {
                  setTesting(true);
                  try {
                    await saveConfig({ profileId, apiKey });
                    await triggerEngineCycle();
                    setIsEditing(false);
                  } catch (e) {
                    Alert.alert('Error', 'Verification failed.');
                  }
                  setTesting(false);
                }}
                disabled={testing}
              >
                {testing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Icon name="check-bold" size={18} color="#fff" />
                    <Text style={styles.inlineSaveBtnTxt}>
                      SAVE CREDENTIALS
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.infoBox}>
          <Icon name="information-outline" size={18} color={COLORS.muted} />
          <Text style={styles.infoTxt}>
            Credentials are encrypted and stored locally.
          </Text>
        </View>

        {/* 🚀 Nuvio-fied Active Deployment Bridge */}
        {profileId && (
          <View style={styles.activationCardSpacer}>
            <TouchableOpacity
              style={styles.activationGuideCard}
              onPress={() => {
                setDashStep(2);
                setDashVisible(true);
              }}
            >
              <View style={styles.activationIconWrap}>
                <Icon name="link-variant" size={24} color={COLORS.accent} />
              </View>
              <View style={styles.activationContent}>
                <Text style={styles.activationTitle}>Connect This Device</Text>
                <Text style={styles.activationSub}>
                  Link device to start block the tracking
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color={COLORS.muted} />
            </TouchableOpacity>
          </View>
        )}

        {isEditing && (
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.orLine} />
          </View>
        )}

        {isEditing && (
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => {
              setDashStep(0);
              setDashVisible(true);
            }}
          >
            <View style={styles.quickIconContainer}>
              <Icon name="lightning-bolt" size={24} color={COLORS.accent} />
            </View>
            <View style={styles.quickContent}>
              <View style={styles.quickTitleRow}>
                <Text style={styles.quickTitle}>Connect Account</Text>
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>RECOMMENDED</Text>
                </View>
              </View>
              <Text style={styles.quickSub}>Link your NextDNS dashboard</Text>
            </View>
            <Icon name="chevron-right" size={20} color={COLORS.muted} />
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={dashVisible} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setDashVisible(false)}
              style={styles.modalClose}
            >
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.modalHeaderCenter}>
              <View style={styles.secureBadgeHeader}>
                <Icon name="shield-lock" size={14} color={COLORS.green} />
                <Text style={styles.secureBadgeTxt}>SECURE</Text>
              </View>
              <Text style={styles.modalTitle}>
                {isAuthOrBlank
                  ? 'Sign in to NextDNS'
                  : dashStep === 0
                  ? 'Identify Profile'
                  : dashStep === 1
                  ? 'Link API Access'
                  : 'Connect Device'}
              </Text>
            </View>
            <View style={styles.modalPlaceholder} />
          </View>

          <View style={webviewStyles.container}>
            {dashStep < 2 ? (
              <WebView
                source={{
                  uri:
                    dashStep === 0
                      ? 'https://my.nextdns.io/setup'
                      : 'https://my.nextdns.io/account',
                }}
                style={[
                  webviewStyles.webView,
                  shouldShowHUD && webviewStyles.webViewWithHUD,
                ]}
                onNavigationStateChange={(nav) => setCurrentUrl(nav.url)}
                startInLoadingState
              />
            ) : (
              <ScrollView style={styles.finalStepScroll}>
                <View style={styles.finalStepContent}>
                  <View style={styles.explainerCard}>
                    <Icon name="shield-check" size={40} color={COLORS.green} />
                    <Text style={styles.explainerTitle}>Connect Device</Text>
                    <Text style={styles.explainerBody}>
                      Finish the connection to start blocking. Follow the steps
                      below to link this device.
                    </Text>
                  </View>

                  <View style={styles.dnsCopyBox}>
                    <Text style={styles.dnsLabel}>
                      PRIVATE DNS ADDRESS (DNA)
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.dnsValueRow,
                        copied && { borderColor: COLORS.green },
                      ]}
                      onPress={() => {
                        const addr = `${profileId}.dns.nextdns.io`;
                        Clipboard.setString(addr);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                    >
                      <Text style={styles.dnsValue}>
                        {profileId || '••••••'}.dns.nextdns.io
                      </Text>
                      <Icon
                        name={copied ? 'check-all' : 'content-copy'}
                        size={18}
                        color={copied ? COLORS.green : COLORS.accent}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.brutalInstructions}>
                    <View style={styles.instructionLine}>
                      <View style={styles.stepNumIndicator} />
                      <Text style={styles.stepText}>
                        Select "Private DNS provider hostname"
                      </Text>
                    </View>
                    <View style={styles.instructionLine}>
                      <View style={styles.stepNumIndicator} />
                      <Text style={styles.stepText}>
                        Paste the address you just copied
                      </Text>
                    </View>
                    <View style={styles.instructionLine}>
                      <View style={styles.stepNumIndicator} />
                      <Text style={styles.stepText}>Tap Save</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.openSettingsBtn}
                    onPress={() => {
                      if (
                        RuleEngine &&
                        typeof RuleEngine.openPrivateDnsSettings === 'function'
                      ) {
                        RuleEngine.openPrivateDnsSettings();
                      }
                    }}
                  >
                    <Icon name="link-variant" size={20} color={COLORS.bg} />
                    <Text style={styles.openSettingsBtnTxt}>
                      LINK VIA SYSTEM SETTINGS
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.finishBtn}
                    onPress={() => {
                      setDashVisible(false);
                      setIsEditing(false);
                      navigation.goBack();
                    }}
                  >
                    <Text style={styles.finishBtnTxt}>
                      I'VE CONNECTED THIS DEVICE
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}

            {shouldShowHUD && (
              <View style={styles.hudOverlay}>
                <View style={styles.hudContent}>
                  <View style={styles.hudInfo}>
                    <Text style={styles.hudTitle}>
                      {dashStep === 0
                        ? '🎯 Locate Profile ID'
                        : dashStep === 1
                        ? '🔑 Link API Access'
                        : '🚀 Connect Device'}
                    </Text>
                    <Text style={styles.hudSub}>
                      {dashStep === 0
                        ? 'Copy the 6-character ID from the dashboard header.'
                        : dashStep === 1
                        ? 'Go to Account settings and click "Generate API Key".'
                        : 'Ready to sync. Copy the DNA link and connect below.'}
                    </Text>
                  </View>

                  {hudError && (
                    <View style={styles.hudErrorStrip}>
                      <Icon name="alert-circle" size={14} color={COLORS.red} />
                      <Text style={styles.hudErrorTxt}>{hudError}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.captureHUD,
                      hudSuccess && { backgroundColor: COLORS.green },
                    ]}
                    onPress={handleCaptureFromClipboard}
                  >
                    <Icon
                      name={
                        hudSuccess
                          ? 'check-circle'
                          : dashStep === 2
                          ? 'link'
                          : 'content-save-all'
                      }
                      size={20}
                      color={COLORS.bg}
                    />
                    <Text style={styles.captureHUDTxt}>
                      {hudSuccess
                        ? 'CONFIRMED'
                        : dashStep === 1
                        ? "DONE, I'VE COPIED KEY"
                        : dashStep === 0
                        ? "DONE, I'VE COPIED ID"
                        : 'FINISH SETUP'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const webviewStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webView: {
    flex: 1,
    marginBottom: 0,
  },
  webViewWithHUD: {
    marginBottom: 170,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  backBtn: { marginRight: 16 },
  headerTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  scroll: { padding: SPACING.md },
  sectionHeader: { marginBottom: 24, marginTop: 12 },
  sectionLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionDesc: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.8,
    marginTop: 8,
  },
  editBtnTxt: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  inputGroup: { padding: 20 },
  inputGroupNoTop: { padding: 20, paddingTop: 0 },
  label: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  manualInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 4,
  },
  inlineSaveBtn: {
    backgroundColor: COLORS.accent,
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  inlineSaveBtnTxt: {
    color: COLORS.bg,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  activationCardSpacer: {
    marginTop: 0,
    marginBottom: 8,
  },
  activationGuideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
  },
  activationIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activationContent: {
    flex: 1,
  },
  activationTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  activationSub: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 16,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  orText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  quickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
    marginBottom: 12,
  },
  quickIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickContent: {
    flex: 1,
  },
  quickTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  quickSub: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  recommendedBadge: {
    backgroundColor: COLORS.accent + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
  },
  recommendedText: {
    color: COLORS.accent,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  infoBox: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    gap: 12,
  },
  infoTxt: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalHeaderCenter: {
    alignItems: 'center',
    gap: 4,
  },
  secureBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.green + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  secureBadgeTxt: {
    color: COLORS.green,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalClose: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  modalPlaceholder: {
    width: 40,
  },
  hudOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(2, 4, 4, 0.98)',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: 40,
  },
  hudContent: {
    gap: 16,
  },
  hudInfo: {
    gap: 6,
  },
  hudTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  hudSub: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  captureHUD: {
    backgroundColor: COLORS.accent,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  captureHUDTxt: {
    color: COLORS.bg,
    fontWeight: '900',
    fontSize: 13,
  },
  hudErrorStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.red + '15',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.red + '30',
  },
  hudErrorTxt: {
    color: COLORS.red,
    fontSize: 12,
    fontWeight: '700',
  },
  finalStepScroll: {
    flex: 1,
  },
  finalStepContent: {
    padding: 24,
    gap: 24,
    paddingBottom: 200,
  },
  explainerCard: {
    backgroundColor: COLORS.card,
    padding: 24,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  explainerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 16,
    marginBottom: 8,
  },
  explainerBody: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  dnsCopyBox: {
    gap: 12,
  },
  dnsLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 8,
  },
  dnsValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dnsValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  brutalInstructions: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  instructionLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },
  stepText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  openSettingsBtn: {
    backgroundColor: COLORS.accent,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  openSettingsBtnTxt: {
    color: COLORS.bg,
    fontWeight: '900',
    fontSize: 13,
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 12,
  },
  finishBtnTxt: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
