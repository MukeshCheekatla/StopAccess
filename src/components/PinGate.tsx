import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from './theme';
import { storage } from '../store/storageAdapter';

const { width } = Dimensions.get('window');
const PIN_KEY = 'guardian_pin';

export const PinGate = ({
  visible,
  onSuccess,
  onCancel,
}: {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}) => {
  const [input, setInput] = useState('');
  const savedPin = storage.getString(PIN_KEY);

  useEffect(() => {
    if (visible) {
      setInput('');
    }
  }, [visible]);

  const onKeyPress = (key: string) => {
    if (input.length < 4) {
      const newVal = input + key;
      setInput(newVal);
      if (newVal.length === 4) {
        if (newVal === savedPin) {
          onSuccess();
        } else {
          // Vibration or shake effect could go here
          setTimeout(() => setInput(''), 400);
        }
      }
    }
  };

  const onBackspace = () => {
    setInput(input.slice(0, -1));
  };

  if (!savedPin) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Icon name="close" size={24} color={COLORS.muted} />
          </TouchableOpacity>

          <View style={styles.heroGlow} />
          <Icon
            name="shield-lock"
            size={64}
            color={COLORS.accent}
            style={styles.lockIcon}
          />
          <Text style={styles.title}>Secure Gateway</Text>
          <Text style={styles.subtitle}>
            AUTHORIZATION REQUIRED TO MODIFY ENGINE
          </Text>

          <View style={styles.dots}>
            {[1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[
                  styles.dotOuter,
                  input.length >= i && { borderColor: COLORS.accent },
                ]}
              >
                <View
                  style={[
                    styles.dotInner,
                    input.length >= i && { backgroundColor: COLORS.accent },
                  ]}
                />
              </View>
            ))}
          </View>

          <View style={styles.keypad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <TouchableOpacity
                key={num}
                style={styles.key}
                onPress={() => onKeyPress(String(num))}
                activeOpacity={0.6}
              >
                <Text style={styles.keyText}>{num}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.key} />
            <TouchableOpacity
              style={styles.key}
              onPress={() => onKeyPress('0')}
              activeOpacity={0.6}
            >
              <Text style={styles.keyText}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.key}
              onPress={onBackspace}
              activeOpacity={0.6}
            >
              <Icon name="backspace-outline" size={24} color={COLORS.muted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.footerHint}>POWERED BY NEXTDNS ENFORCEMENT</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    alignItems: 'center',
    padding: 32,
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  heroGlow: {
    display: 'none',
  },
  lockIcon: { marginTop: 20, marginBottom: 24 },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 10,
    marginBottom: 60,
    opacity: 0.6,
  },
  dots: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 80,
  },
  dotOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'transparent',
  },
  keypad: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  key: {
    width: width / 4,
    height: width / 4,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
    borderRadius: width / 4 / 2,
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  keyText: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '300',
  },
  footerHint: {
    marginTop: 60,
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    opacity: 0.3,
  },
});
