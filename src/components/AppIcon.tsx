import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';

interface AppIconProps {
  appName: string;
  size?: number;
  style?: ViewStyle;
}

const AppIcon: React.FC<AppIconProps> = ({ size = 36, style }) => {
  return (
    <View
      style={[
        styles.iconContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 4,
          backgroundColor: 'rgba(255,255,255,0.05)',
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
});

export default AppIcon;
