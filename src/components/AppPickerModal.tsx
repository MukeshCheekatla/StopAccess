import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Dimensions,
  BackHandler,
  TouchableWithoutFeedback,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING, RADIUS, FONT } from './theme';
import { getInstalledApps, InstalledApp } from '../modules/installedApps';
import { AppIconImage } from './AppIconImage';
import { refreshTodayUsage, getCachedUsage } from '../modules/usageStats';
import { AppUsageStat } from '../types';
import { formatDuration } from '../utils/time';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_TRANSLATE_Y = -SCREEN_HEIGHT * 0.92;

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (app: InstalledApp) => void;
  alreadySelectedPackages: string[];
}

export const AppPickerModal: React.FC<Props> = ({
  visible,
  onClose,
  onSelect,
  alreadySelectedPackages,
}) => {
  const [loading, setLoading] = useState(false);
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');

  // Animation values
  const translateY = useSharedValue(0);
  const active = useSharedValue(false);

  const scrollTo = useCallback(
    (destination: number) => {
      'worklet';
      active.value = destination !== 0;

      if (destination === 0) {
        // Snappier close with timing
        translateY.value = withTiming(0, { duration: 250 });
      } else {
        // Better spring for opening (less bouncy, more responsive)
        translateY.value = withSpring(destination, {
          damping: 50,
          stiffness: 250,
          mass: 0.5,
          restDisplacementThreshold: 0.1,
          restSpeedThreshold: 0.1,
        });
      }
    },
    [active, translateY],
  );

  useEffect(() => {
    // Load once on mount to avoid "fake loading" every time
    loadApps();
  }, []);

  useEffect(() => {
    if (visible) {
      scrollTo(MAX_TRANSLATE_Y);
      // Refresh usage in background if needed, but don't show loader
      refreshTodayUsage().catch(() => {});
    } else {
      scrollTo(0);
    }
  }, [visible, scrollTo]);

  const backAction = useCallback(() => {
    if (visible && active.value) {
      // Immediate Native Close
      translateY.value = withTiming(0, { duration: 150 }, (isFinished) => {
        if (isFinished) {
          runOnJS(onClose)();
        }
      });
      return true;
    }
    return false;
  }, [active, onClose, translateY, visible]);

  // Handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );
    return () => backHandler.remove();
  }, [backAction]);

  async function loadApps() {
    setLoading(true);
    try {
      const [installedApps, usageStats] = await Promise.all([
        getInstalledApps(),
        refreshTodayUsage().catch(() => getCachedUsage() as AppUsageStat[]),
      ]);

      const usageMap: Record<string, number> = {};
      usageStats.forEach((s) => {
        usageMap[s.packageName] = s.totalMinutes;
      });

      const sorted = installedApps.sort((a, b) => {
        const useA = usageMap[a.packageName] || 0;
        const useB = usageMap[b.packageName] || 0;
        if (useB !== useA) {
          return useB - useA;
        }
        return a.appName.localeCompare(b.appName);
      });

      setUsage(usageMap);
      setApps(sorted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) {
      return apps;
    }
    const query = search.trim().toLowerCase();

    return apps
      .filter((app) => (app.appName || '').toLowerCase().includes(query))
      .sort((a, b) => {
        const nameA = (a.appName || '').toLowerCase();
        const nameB = (b.appName || '').toLowerCase();

        // 1. Exact match
        if (nameA === query && nameB !== query) {
          return -1;
        }
        if (nameB === query && nameA !== query) {
          return 1;
        }

        // 2. Starts with
        const startsA = nameA.startsWith(query);
        const startsB = nameB.startsWith(query);
        if (startsA && !startsB) {
          return -1;
        }
        if (startsB && !startsA) {
          return 1;
        }

        // 3. Keep original usage-based order
        return apps.indexOf(a) - apps.indexOf(b);
      });
  }, [apps, search]);

  const context = useSharedValue({ y: 0 });
  const gesture = Gesture.Pan()
    .activeOffsetY([-10, 10]) // Don't steal vertical scroll immediately
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      // Only allow swiping down to close
      const nextY = event.translationY + context.value.y;
      if (nextY >= MAX_TRANSLATE_Y) {
        translateY.value = nextY;
      }
    })
    .onEnd((event) => {
      const shouldClose =
        translateY.value > MAX_TRANSLATE_Y / 1.3 || event.velocityY > 600;
      if (shouldClose) {
        translateY.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(onClose)();
        });
      } else {
        scrollTo(MAX_TRANSLATE_Y);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        translateY.value,
        [0, MAX_TRANSLATE_Y],
        [0, 1],
        Extrapolate.CLAMP,
      ),
      display: translateY.value === 0 ? 'none' : 'flex',
    };
  });

  if (!visible && translateY.value === 0) {
    return null;
  }

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.container, animatedStyle]}>
        {/* ONLY this top section handles gestures to close */}
        <GestureDetector gesture={gesture}>
          <View style={styles.handleContainer}>
            <View style={styles.line} />
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>All Installed Apps</Text>
                <Text style={styles.subtitle}>Swipe down header to hide</Text>
              </View>
            </View>
          </View>
        </GestureDetector>

        <View style={styles.searchBar}>
          <Icon
            name="magnify"
            size={20}
            color={COLORS.muted}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search apps by name..."
            placeholderTextColor={COLORS.muted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
        </View>

        <View style={styles.content}>
          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={COLORS.accent} size="large" />
              <Text style={styles.loadingText}>Loading all apps...</Text>
            </View>
          ) : (
            <Animated.FlatList
              data={filtered}
              keyExtractor={(item) => `${item.packageName}-${item.appName}`}
              renderItem={({ item }) => {
                const minutes = usage[item.packageName] || 0;
                const isAdded = alreadySelectedPackages.includes(
                  item.packageName,
                );
                return (
                  <TouchableOpacity
                    style={[styles.item, isAdded && styles.itemDisabled]}
                    disabled={isAdded}
                    onPress={() => onSelect(item)}
                  >
                    <AppIconImage
                      packageName={item.packageName}
                      appName={item.appName}
                      size={44}
                    />
                    <View style={styles.itemInfo}>
                      <Text style={styles.appName}>{item.appName}</Text>
                    </View>
                    <View style={styles.usageInfo}>
                      {minutes > 0 && (
                        <Text style={styles.usageText}>
                          {formatDuration(minutes)}
                        </Text>
                      )}
                      <Icon
                        name={isAdded ? 'check-circle' : 'plus-circle-outline'}
                        size={24}
                        color={isAdded ? COLORS.green : COLORS.accent}
                      />
                    </View>
                  </TouchableOpacity>
                );
              }}
              windowSize={5}
              initialNumToRender={12}
              maxToRenderPerBatch={10}
              removeClippedSubviews={true}
              contentContainerStyle={styles.list}
            />
          )}
        </View>

        <TouchableOpacity
          style={styles.fab}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Icon name="check" size={28} color="#000" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  container: {
    height: SCREEN_HEIGHT,
    width: '100%',
    backgroundColor: COLORS.bg,
    position: 'absolute',
    top: SCREEN_HEIGHT,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 1000,
    elevation: 10,
    overflow: 'hidden',
  },
  handleContainer: {
    paddingBottom: 8,
    backgroundColor: COLORS.bg,
  },
  line: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginVertical: 12,
    borderRadius: 2,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  title: { color: COLORS.text, fontSize: FONT.sizes.lg, fontWeight: 'bold' },
  subtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    margin: SPACING.md,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: { marginRight: SPACING.xs },
  searchInput: { flex: 1, color: COLORS.text, fontSize: FONT.sizes.md },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: COLORS.muted, marginTop: SPACING.md },
  list: { paddingBottom: 100 },
  content: { flex: 1 },
  item: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md },
  itemDisabled: { opacity: 0.6 },
  itemInfo: { flex: 1, marginLeft: SPACING.md },
  appName: { color: COLORS.text, fontSize: FONT.sizes.md, fontWeight: '600' },
  usageInfo: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  usageText: { color: COLORS.green, fontSize: 13, fontWeight: 'bold' },
  sep: { height: 1, backgroundColor: COLORS.border, marginLeft: 76 },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

export default AppPickerModal;
