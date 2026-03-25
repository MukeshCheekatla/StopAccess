import React from 'react';
import { View, Text, ViewStyle, StyleSheet } from 'react-native';
import { COLORS } from './theme';

const EMOJI_MAP: Record<string, string> = {};

interface AppIconProps {
  appName: string;
  size?: number;
  style?: ViewStyle;
}

const AppIcon: React.FC<AppIconProps> = ({ appName, size = 36, style }) => {
  const key = appName.toLowerCase();
  const emoji = EMOJI_MAP[key] ?? '📱';
  return (
    <View
      style={[
        styles.iconContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: size * 0.55 }}>{emoji}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    backgroundColor: COLORS.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AppIcon;
