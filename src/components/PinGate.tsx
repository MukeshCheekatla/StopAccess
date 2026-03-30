import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING } from './theme';
import { storage } from '../store/storageAdapter';

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
          setTimeout(() => setInput(''), 500);
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
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeBtn} onPress={onCancel}>
            <Icon name="close" size={24} color={COLORS.muted} />
          </TouchableOpacity>

          <Icon name="lock-outline" size={48} color={COLORS.accent} />
          <Text style={styles.title}>Guardian PIN</Text>
          <Text style={styles.subtitle}>Enter PIN to access settings</Text>

          <View style={styles.dots}>
            {[1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  input.length >= i && { backgroundColor: COLORS.accent },
                ]}
              />
            ))}
          </View>

          <View style={styles.keypad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <TouchableOpacity
                key={num}
                style={styles.key}
                onPress={() => onKeyPress(String(num))}
              >
                <Text style={styles.keyText}>{num}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.key} />
            <TouchableOpacity
              style={styles.key}
              onPress={() => onKeyPress('0')}
            >
              <Text style={styles.keyText}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={onBackspace}>
              <Icon name="backspace-outline" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
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
    padding: SPACING.xl,
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  title: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 8,
    marginBottom: 40,
  },
  dots: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 60,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  keypad: {
    width: '80%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  key: {
    width: '33%',
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '500',
  },
});
