import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SERVICE_URLS } from '@stopaccess/core';
import { COLORS, SPACING, RADIUS } from './theme';

interface AutoSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (profileId: string, apiKey: string) => void;
}

export function AutoSetupModal({
  visible,
  onClose,
  onSuccess,
}: AutoSetupModalProps) {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState('');
  const webViewRef = useRef<WebView>(null);

  // Reset state when opening
  useEffect(() => {
    if (visible) {
      setProfileId(null);
      setApiKey('');
      setCurrentUrl('');
      setLoading(true);
    }
  }, [visible]);

  // When both are found, finish
  useEffect(() => {
    if (visible && profileId && apiKey) {
      const timer = setTimeout(() => {
        onSuccess(profileId, apiKey);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [visible, profileId, apiKey, onSuccess]);

  const onNavigationStateChange = (navState: any) => {
    const url = navState.url;
    setCurrentUrl(url);

    // 1. Detect Profile ID from URL
    if (!profileId) {
      const match = url.match(/my\.nextdns\.io\/([a-f0-9]{6})/i);
      if (match && match[1]) {
        setProfileId(match[1]);
      }
    }
  };

  const handleFinish = () => {
    if (profileId && apiKey && apiKey.length > 20) {
      onSuccess(profileId, apiKey.trim());
    }
  };

  const goToAccount = () => {
    webViewRef.current?.injectJavaScript(
      "window.location.href = '/account'; true;",
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Icon name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>NextDNS Setup</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {currentUrl.replace('https://', '')}
            </Text>
          </View>
        </View>

        <View style={styles.trackerRow}>
          <View style={[styles.stepItem, profileId ? styles.stepDone : null]}>
            <Icon
              name={profileId ? 'check-circle' : 'circle-outline'}
              size={18}
              color={profileId ? COLORS.green : COLORS.muted}
            />
            <Text
              style={[styles.stepText, profileId ? styles.textGreen : null]}
            >
              Profile ID
            </Text>
          </View>
          <View style={[styles.stepItem, apiKey ? styles.stepDone : null]}>
            <Icon
              name={apiKey ? 'check-circle' : 'circle-outline'}
              size={18}
              color={apiKey ? COLORS.green : COLORS.muted}
            />
            <Text style={[styles.stepText, apiKey ? styles.textGreen : null]}>
              API Key
            </Text>
          </View>
        </View>

        <View style={styles.instructions}>
          {!profileId && (
            <Text style={styles.instructionText}>
              Please <Text style={styles.bold}>Log In</Text> or{' '}
              <Text style={styles.bold}>Sign Up</Text> below.
            </Text>
          )}
          {profileId && !apiKey && (
            <Text style={styles.instructionText}>
              Redirecting to Account... If you already have an API key, we will
              detect it. Otherwise, tap{' '}
              <Text style={styles.bold}>New API Key</Text>.
            </Text>
          )}
          {profileId && apiKey && (
            <Text style={[styles.instructionText, styles.textGreen]}>
              Setup Complete!
            </Text>
          )}
        </View>

        <View style={styles.webContainer}>
          {loading && (
            <ActivityIndicator
              size="large"
              color={COLORS.accent}
              style={styles.loader}
            />
          )}
          <WebView
            ref={webViewRef}
            source={{ uri: SERVICE_URLS.NEXTDNS_LOGIN }}
            onNavigationStateChange={onNavigationStateChange}
            onLoadEnd={() => setLoading(false)}
            incognito={false}
          />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.footer}
        >
          <View style={styles.manualInputCard}>
            <View style={styles.inputHeader}>
              <Text style={styles.inputTitle}>Step 2: Paste API Key</Text>
              <TouchableOpacity onPress={goToAccount}>
                <Text style={styles.linkText}>Go to Account Page</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              value={apiKey || ''}
              onChangeText={setApiKey}
              placeholder="Paste your 64-char API key here"
              placeholderTextColor={COLORS.muted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[
                styles.finishBtn,
                (!profileId || !apiKey || apiKey.length < 20) &&
                  styles.disabled,
              ]}
              onPress={handleFinish}
              disabled={!profileId || !apiKey || apiKey.length < 20}
            >
              <Text style={styles.finishBtnTxt}>Complete Setup</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeBtn: {
    padding: SPACING.sm,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    marginRight: 36, // offset internal close button
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  trackerRow: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    justifyContent: 'space-around',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.6,
  },
  stepDone: {
    opacity: 1,
  },
  stepText: {
    color: COLORS.text,
    marginLeft: 6,
    fontWeight: 'bold',
  },
  textGreen: {
    color: COLORS.green,
  },
  instructions: {
    padding: SPACING.md,
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  instructionText: {
    color: COLORS.text,
    fontSize: 14,
    textAlign: 'center',
  },
  bold: {
    fontWeight: 'bold',
  },
  webContainer: {
    flex: 1,
  },
  loader: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    zIndex: 10,
  },
  footer: {
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  manualInputCard: {
    gap: 12,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  linkText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: RADIUS.md,
    padding: 12,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 13,
  },
  finishBtn: {
    backgroundColor: COLORS.accent,
    padding: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  finishBtnTxt: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  disabled: {
    opacity: 0.5,
  },
});
