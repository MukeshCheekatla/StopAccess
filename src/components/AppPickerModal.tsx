import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  BackHandler,
  TouchableWithoutFeedback,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from './theme';
import { getInstalledApps, InstalledApp } from '../modules/installedApps';
import AppIcon from './AppIcon';
import { refreshTodayUsage, getCachedUsage } from '../modules/usageStats';
import { AppUsageStat } from '@focusgate/types';
import { formatDuration } from '../utils/time';

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
  const { height: SCREEN_HEIGHT } = useWindowDimensions();
  // Memoized so the value only changes when screen height actually changes
  const MAX_TRANSLATE_Y = React.useMemo(
    () => -SCREEN_HEIGHT * 0.92,
    [SCREEN_HEIGHT],
  );

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
        translateY.value = withTiming(0, { duration: 250 });
      } else {
        translateY.value = withSpring(destination, {
          damping: 50,
          stiffness: 260,
          mass: 0.5,
          restDisplacementThreshold: 0.1,
          restSpeedThreshold: 0.1,
        });
      }
    },
    [active, translateY],
  );

  useEffect(() => {
    loadApps();
  }, []);

  useEffect(() => {
    if (visible) {
      scrollTo(MAX_TRANSLATE_Y);
      refreshTodayUsage().catch(() => {});
    } else {
      scrollTo(0);
    }
  }, [visible, scrollTo, MAX_TRANSLATE_Y]);

  const backAction = useCallback(() => {
    if (visible && active.value) {
      translateY.value = withTiming(0, { duration: 220 }, (isFinished) => {
        if (isFinished) {
          runOnJS(onClose)();
        }
      });
      return true;
    }
    return false;
  }, [active, onClose, translateY, visible]);

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
        if (nameA === query && nameB !== query) {
          return -1;
        }
        if (nameB === query && nameA !== query) {
          return 1;
        }
        const startsA = nameA.startsWith(query);
        const startsB = nameB.startsWith(query);
        if (startsA && !startsB) {
          return -1;
        }
        if (startsB && !startsA) {
          return 1;
        }
        return apps.indexOf(a) - apps.indexOf(b);
      });
  }, [apps, search]);

  const context = useSharedValue({ y: 0 });
  const gesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
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
    return { transform: [{ translateY: translateY.value }] };
  });

  const backdropStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        translateY.value,
        [0, MAX_TRANSLATE_Y],
        [0, 1],
        Extrapolation.CLAMP,
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

      <Animated.View
        style={[
          styles.container,
          { height: SCREEN_HEIGHT, top: SCREEN_HEIGHT },
          animatedStyle,
        ]}
      >
        <GestureDetector gesture={gesture}>
          <View style={styles.handleContainer}>
            <View style={styles.line} />
            <View style={styles.header}>
              <Text style={styles.title}>Secure New App</Text>
              <Text style={styles.subtitle}>
                Select an application to enforce focus rules
              </Text>
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
            placeholder="Search installed applications..."
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
              <Text style={styles.loadingText}>Indexing installed apps...</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => `${item.packageName}-${item.appName}`}
              renderItem={({ item }: { item: InstalledApp }) => {
                const minutes = usage[item.packageName] || 0;
                const isAdded = alreadySelectedPackages.includes(
                  item.packageName,
                );
                return (
                  <TouchableOpacity
                    style={[styles.item, isAdded && styles.itemDisabled]}
                    disabled={isAdded}
                    onPress={() => onSelect(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconWrapper}>
                      <AppIcon
                        packageName={item.packageName}
                        appName={item.appName}
                        size={40}
                      />
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.appName} numberOfLines={1}>
                        {item.appName}
                      </Text>
                      <Text style={styles.appPkg} numberOfLines={1}>
                        {item.packageName}
                      </Text>
                    </View>
                    <View style={styles.usageInfo}>
                      {minutes > 0 ? (
                        <View style={styles.usageBadge}>
                          <Text style={styles.usageText}>
                            {formatDuration(minutes).toUpperCase()}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.usageSpacer} />
                      )}
                      <Icon
                        name={isAdded ? 'shield-check' : 'plus-circle'}
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
          activeOpacity={0.9}
        >
          <Icon name="check-bold" size={28} color={COLORS.bg} />
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
    width: '100%',
    backgroundColor: '#0A0C0C',
    position: 'absolute',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 1000,
    // height and top are set via inline style (dynamic from useWindowDimensions)
  },
  handleContainer: { paddingBottom: 8 },
  line: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginVertical: 14,
    borderRadius: 2,
  },
  header: { paddingHorizontal: 24, paddingBottom: 8 },
  title: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    margin: 20,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15, fontWeight: '600' },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
  loadingText: {
    color: COLORS.muted,
    marginTop: 16,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  list: { paddingBottom: 150 },
  content: { flex: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 8,
    borderRadius: 16,
  },
  itemDisabled: { opacity: 0.3 },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: { flex: 1, marginLeft: 16 },
  appName: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  appPkg: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    opacity: 0.6,
  },
  usageInfo: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  usageBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  usageText: { color: COLORS.muted, fontSize: 9, fontWeight: '900' },
  usageSpacer: { width: 1 },
  usageGapSpacer: { width: 1 },
  fab: {
    position: 'absolute',
    bottom: 40,
    right: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AppPickerModal;
