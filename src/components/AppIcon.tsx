import React, { useState, useEffect } from 'react';
import { View, Image, ViewStyle, StyleSheet, Text } from 'react-native';
import { getIconByPackage } from '../modules/installedApps';
import { resolveIconUrl } from '@stopaccess/core';

interface AppIconProps {
  packageName?: string;
  appName?: string;
  iconBase64?: string;
  size?: number;
  style?: ViewStyle;
}

const ICON_CACHE: Record<string, string> = {};

/**
 * Unified AppIcon Component for React Native.
 * Handles:
 *  1. Local Android App Icons (Base64)
 *  2. Remote Brand Icons (via @stopaccess/core)
 *  3. Initials Fallback
 */
const AppIcon: React.FC<AppIconProps> = ({
  packageName,
  appName,
  iconBase64,
  size = 36,
  style,
}) => {
  const initialBase64 =
    iconBase64 && iconBase64.length > 10
      ? iconBase64
      : packageName
      ? ICON_CACHE[packageName]
      : undefined;

  const [base64, setBase64] = useState<string | undefined>(initialBase64);
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);

  useEffect(() => {
    // 1. If we have a local icon provided via prop
    if (iconBase64 && iconBase64.length > 10) {
      setBase64(iconBase64);
      return;
    }

    // 2. If we have a package name, try local Android icon cache first
    if (packageName) {
      if (ICON_CACHE[packageName]) {
        setBase64(ICON_CACHE[packageName]);
      } else {
        // Fetch local icon from Android
        getIconByPackage(packageName).then((fetched) => {
          if (fetched && fetched.length > 10) {
            ICON_CACHE[packageName] = fetched;
            setBase64(fetched);
          } else {
            // Fallback to remote branded icon if local fetch fails
            const url = resolveIconUrl(packageName);
            if (url) {
              setRemoteUrl(url);
            }
          }
        });
      }
    } else if (appName) {
      // 3. Fallback to remote branded icon via appName
      const url = resolveIconUrl(appName);
      if (url) {
        setRemoteUrl(url);
      }
    }
  }, [packageName, appName, iconBase64]);

  const borderRadius = size / 4;
  const containerStyle = [
    styles.iconContainer,
    { width: size, height: size, borderRadius },
    style,
  ];

  // Render Strategy

  // A. Local Android Base64 Image
  if (base64) {
    return (
      <Image
        source={{ uri: `data:image/png;base64,${base64}` }}
        style={[styles.image, { width: size, height: size, borderRadius }]}
      />
    );
  }

  // B. Remote Branded Icon (from @stopaccess/core)
  if (remoteUrl) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: remoteUrl }}
          style={{ width: size * 0.7, height: size * 0.7 }}
          resizeMode="contain"
        />
      </View>
    );
  }

  // C. Fallback to Initials
  const label = String(appName || packageName || '?')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={containerStyle}>
      <Text style={[styles.fallbackText, { fontSize: size * 0.35 }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  image: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  fallbackText: {
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '900',
  },
});

export default AppIcon;
