import React, { useState, useEffect } from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { getIconByPackage } from '../modules/installedApps';
import { COLORS } from './theme';
import AppIcon from './AppIcon';

interface Props {
  iconBase64?: string;
  packageName?: string;
  size?: number;
  appName?: string;
}

const ICON_CACHE: Record<string, string> = {};

export const AppIconImage: React.FC<Props> = ({
  iconBase64,
  packageName,
  size = 48,
  appName,
}) => {
  // If we have a non-empty base64 string, use it. Otherwise, look in cache or fetch.
  const initialBase64 =
    iconBase64 && iconBase64.length > 10
      ? iconBase64
      : packageName
      ? ICON_CACHE[packageName]
      : undefined;

  const [base64, setBase64] = useState<string | undefined>(initialBase64);
  const [loading, setLoading] = useState(false); // Default to false to avoid initial blink

  useEffect(() => {
    // Priority 1: Explicitly provided long base64 string
    if (iconBase64 && iconBase64.length > 10) {
      if (iconBase64 !== base64) {
        setBase64(iconBase64);
        setLoading(false);
      }
      return;
    }

    // Priority 2: Fetch by package name if we don't have a valid icon yet
    if (packageName && (!base64 || base64.length < 10)) {
      if (ICON_CACHE[packageName]) {
        setBase64(ICON_CACHE[packageName]);
        setLoading(false);
      } else {
        loadIcon(packageName);
      }
    }
  }, [iconBase64, packageName, base64]);

  async function loadIcon(pkg: string) {
    setLoading(true);
    const fetched = await getIconByPackage(pkg);
    if (fetched && fetched.length > 10) {
      ICON_CACHE[pkg] = fetched;
      setBase64(fetched);
    }
    setLoading(false);
  }

  if (loading && !base64) {
    return (
      <View
        style={[
          styles.placeholder,
          { width: size, height: size, borderRadius: size / 4 },
        ]}
      >
        <View style={StyleSheet.absoluteFill} />
      </View>
    );
  }

  if (!base64 || base64.length < 10) {
    return (
      <AppIcon
        appName={appName || packageName || ''}
        size={size}
        style={{ ...styles.fallbackIcon, borderRadius: size / 4 }}
      />
    );
  }

  return (
    <Image
      source={{ uri: `data:image/png;base64,${base64}` }}
      style={[
        styles.image,
        { width: size, height: size, borderRadius: size / 4 },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackIcon: {
    overflow: 'hidden',
  },
  image: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
});
