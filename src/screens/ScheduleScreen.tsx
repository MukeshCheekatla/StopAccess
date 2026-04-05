import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Switch,
  useWindowDimensions,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../components/theme';
import {
  getSchedules,
  addSchedule,
  deleteSchedule,
  toggleSchedule,
} from '@focusgate/state/schedules';
import { storageAdapter } from '../store/storageAdapter';
import { ScheduleRule } from '@focusgate/types';
import AppIcon from '../components/AppIcon';
import { getRules } from '@focusgate/state/rules';
import {
  AppScreen,
  PrimaryButton,
  ScreenHeader,
  SurfaceCard,
} from '../ui/mobile';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const FULL_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export default function ScheduleScreen() {
  const { width } = useWindowDimensions();
  const dayPillSize = Math.floor((width - 56) / 7);
  const [schedules, setSchedules] = useState<ScheduleRule[]>([]);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [modalVisible, setModalVisible] = useState(false);

  const [name, setName] = useState('Work Focus');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [days] = useState<number[]>([1, 2, 3, 4, 5]);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);

  const load = useCallback(async () => {
    const s = await getSchedules(storageAdapter);
    setSchedules(s);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filteredSchedules = schedules.filter((s) =>
    s.days.includes(selectedDay),
  );

  const onAdd = async () => {
    const rules = await getRules(storageAdapter);
    const currentApps = rules.map((r) => r.packageName);
    setSelectedApps(currentApps);
    setModalVisible(true);
  };

  const save = async () => {
    if (selectedApps.length === 0) {
      Alert.alert('No Apps', 'Please select at least one app to block.');
      return;
    }
    const newSchedule: ScheduleRule = {
      id: Date.now().toString(),
      name,
      startTime,
      endTime,
      days,
      appNames: selectedApps,
      active: true,
    };
    await addSchedule(storageAdapter, newSchedule);
    setModalVisible(false);
    load();
  };

  const remove = (id: string) => {
    Alert.alert('Delete Protocol', 'Remove this automated focus schedule?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSchedule(storageAdapter, id);
          load();
        },
      },
    ]);
  };

  return (
    <AppScreen>
      <ScreenHeader
        title="Protocols"
        subtitle="Automated focus scheduling"
        style={styles.header}
      />

      <SurfaceCard className="mb-6 rounded-[20px] px-4 py-3">
        <View style={styles.daysStrip}>
          {DAYS.map((day, i) => {
            const isSelected = selectedDay === i;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.dayItem,
                  { width: dayPillSize },
                  isSelected && styles.dayItemActive,
                ]}
                onPress={() => setSelectedDay(i)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.dayTxt, isSelected && styles.dayTxtActive]}
                >
                  {day}
                </Text>
                {schedules.some((s) => s.days.includes(i)) && (
                  <View style={[styles.dot, isSelected && styles.dotActive]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </SurfaceCard>

      <FlatList
        data={filteredSchedules}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <SurfaceCard className="mb-4 px-6 py-6">
            <View style={styles.cardRow}>
              <View style={styles.timeInfo}>
                <View style={styles.timeLabelRow}>
                  <Icon name="clock-outline" size={14} color={COLORS.accent} />
                  <Text style={styles.timeRange}>
                    {item.startTime} - {item.endTime}
                  </Text>
                </View>
                <Text style={styles.scheduleTitle}>{item.name}</Text>
              </View>
              <Switch
                value={item.active}
                onValueChange={async (v) => {
                  await toggleSchedule(storageAdapter, item.id, v);
                  load();
                }}
                trackColor={{ false: COLORS.border, true: COLORS.accent }}
                thumbColor={item.active ? '#fff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.iconsRow}>
                {item.appNames.slice(0, 4).map((pkg) => (
                  <View key={pkg} style={styles.miniIcon}>
                    <AppIcon packageName={pkg} size={22} />
                  </View>
                ))}
                {item.appNames.length > 4 && (
                  <View style={styles.moreCountBox}>
                    <Text style={styles.moreCount}>
                      +{item.appNames.length - 4}
                    </Text>
                  </View>
                )}
                <Text style={styles.appCountLabel}>
                  PROTECTING {item.appNames.length} APPS
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => remove(item.id)}
                style={styles.deleteBtn}
              >
                <Icon name="trash-can-outline" size={18} color={COLORS.muted} />
              </TouchableOpacity>
            </View>
          </SurfaceCard>
        )}
        ListEmptyComponent={
          <SurfaceCard className="items-center rounded-3xl px-8 py-16">
            <View style={styles.emptyIconBox}>
              <Icon name="calendar-clock" size={48} color={COLORS.border} />
            </View>
            <Text style={styles.emptyTitle}>Quiet Day ahead</Text>
            <Text style={styles.emptyText}>
              No automated focus protocols scheduled for{' '}
              {FULL_DAYS[selectedDay]}.
            </Text>
            <PrimaryButton
              label="Create Protocol"
              onPress={onAdd}
              style={styles.emptyBtn}
              textStyle={styles.emptyBtnTxt}
            />
          </SurfaceCard>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={onAdd} activeOpacity={0.9}>
        <Icon name="plus" size={32} color={COLORS.bg} />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.overlay}>
          <SurfaceCard className="rounded-[32px] bg-[#0A0C0C] p-8">
            <View style={styles.modalHeaderRow}>
              <Icon name="calendar-plus" size={24} color={COLORS.accent} />
              <Text style={styles.modalTitle}>New Protocol</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Protocol Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Deep Work"
                placeholderTextColor={COLORS.muted}
              />
            </View>

            <View style={styles.timeRow}>
              <View style={styles.timeFieldBase}>
                <Text style={styles.label}>Start Time</Text>
                <TextInput
                  style={styles.input}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="09:00"
                  placeholderTextColor={COLORS.muted}
                />
              </View>
              <View style={styles.timeFieldSpacer}>
                <Text style={styles.label}>End Time</Text>
                <TextInput
                  style={styles.input}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="17:00"
                  placeholderTextColor={COLORS.muted}
                />
              </View>
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.mBtnCancel}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.mBtnCancelTxt}>DISMISS</Text>
              </TouchableOpacity>
              <PrimaryButton
                label="Save Protocol"
                onPress={save}
                style={styles.mBtnPrimary}
              />
            </View>
          </SurfaceCard>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    marginBottom: 0,
  },
  daysStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayItem: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  dayItemActive: {
    backgroundColor: COLORS.accent,
  },
  dayTxt: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  dayTxtActive: {
    color: COLORS.bg,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
    marginTop: 4,
  },
  dotActive: {
    backgroundColor: COLORS.bg,
    opacity: 0.5,
  },
  list: { paddingBottom: 150 },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeInfo: { flex: 1 },
  timeLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeRange: {
    color: COLORS.accent,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  scheduleTitle: {
    color: COLORS.text,
    fontSize: 15,
    marginTop: 8,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  iconsRow: { flexDirection: 'row', alignItems: 'center' },
  miniIcon: {
    marginRight: -10,
    borderWidth: 2,
    borderColor: COLORS.card,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  moreCountBox: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  moreCount: { color: COLORS.muted, fontSize: 10, fontWeight: '900' },
  appCountLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginLeft: 16,
    opacity: 0.5,
  },
  deleteBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyText: {
    color: COLORS.muted,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 22,
    paddingHorizontal: 40,
  },
  emptyBtn: {
    marginTop: 32,
    borderRadius: 16,
    width: 190,
    backgroundColor: COLORS.accent + '15',
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
  },
  emptyBtnTxt: {
    color: COLORS.accent,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 24,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  inputGroup: { marginBottom: 20 },
  label: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    color: COLORS.text,
    padding: 18,
    borderRadius: 18,
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeRow: { flexDirection: 'row', gap: 16, marginBottom: 40 },
  timeFieldBase: { flex: 1 },
  timeFieldSpacer: { flex: 1 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  mBtnCancel: { flex: 1, paddingVertical: 18, alignItems: 'center' },
  mBtnCancelTxt: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  mBtnPrimary: {
    flex: 1.5,
    borderRadius: 18,
  },
});
