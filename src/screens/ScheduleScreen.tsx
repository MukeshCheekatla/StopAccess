import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Switch,
  SafeAreaView,
  Dimensions,
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

const { width } = Dimensions.get('window');
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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
  const [schedules, setSchedules] = useState<ScheduleRule[]>([]);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [modalVisible, setModalVisible] = useState(false);

  // New Schedule Form State
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
    // Pick all currently controlled apps by default
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
      appNames: selectedApps, // Note: appNames actually stores packageNames in our types for robustness
      active: true,
    };
    await addSchedule(storageAdapter, newSchedule);
    setModalVisible(false);
    load();
  };

  const remove = (id: string) => {
    Alert.alert('Delete Schedule', 'Are you sure?', [
      { text: 'Cancel' },
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Schedule</Text>
        <Text style={styles.subtitle}>Set recurring focus periods.</Text>
      </View>

      {/* Day Selector Strip */}
      <View style={styles.daysStrip}>
        {DAYS.map((day, i) => {
          const isSelected = selectedDay === i;
          return (
            <TouchableOpacity
              key={day}
              style={[styles.dayItem, isSelected && styles.dayItemActive]}
              onPress={() => setSelectedDay(i)}
            >
              <Text style={[styles.dayTxt, isSelected && styles.dayTxtActive]}>
                {day}
              </Text>
              {schedules.some((s) => s.days.includes(i)) && (
                <View style={[styles.dot, isSelected && styles.dotActive]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredSchedules}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.timeInfo}>
                <Text style={styles.timeRange}>
                  {item.startTime} — {item.endTime}
                </Text>
                <Text style={styles.scheduleTitle}>{item.name}</Text>
              </View>
              <Switch
                value={item.active}
                onValueChange={async (v) => {
                  await toggleSchedule(storageAdapter, item.id, v);
                  load();
                }}
                trackColor={{ false: COLORS.border, true: COLORS.accent }}
              />
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.iconsRow}>
                {item.appNames.slice(0, 5).map((pkg) => (
                  <View key={pkg} style={styles.miniIcon}>
                    <AppIcon packageName={pkg} size={24} />
                  </View>
                ))}
                {item.appNames.length > 5 && (
                  <Text style={styles.moreCount}>
                    +{item.appNames.length - 5}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => remove(item.id)}>
                <Icon name="trash-can-outline" size={20} color={COLORS.muted} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="calendar-blank" size={48} color={COLORS.border} />
            <Text style={styles.emptyText}>
              No schedules for {FULL_DAYS[selectedDay]}.
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={onAdd}>
              <Text style={styles.emptyBtnTxt}>Add Session</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={onAdd}>
        <Icon name="plus" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Simple Add Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Focus Schedule</Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Work Morning"
              placeholderTextColor={COLORS.muted}
            />

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
                style={styles.mBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.mBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mBtn, styles.primaryButton]}
                onPress={save}
              >
                <Text style={[styles.mBtnTxt, styles.primaryButtonText]}>
                  Save Schedule
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.8,
  },

  daysStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingVertical: 12,
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  dayItem: {
    width: (width - 40 - 80) / 7,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  dayItemActive: {
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  dayTxt: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  dayTxtActive: {
    color: '#fff',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
    marginTop: 4,
  },
  dotActive: {
    backgroundColor: '#fff',
  },

  list: {
    padding: 20,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeInfo: {
    flex: 1,
  },
  timeRange: {
    color: COLORS.accent,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  scheduleTitle: {
    color: COLORS.text,
    fontSize: 14,
    marginTop: 6,
    fontWeight: '700',
    opacity: 0.9,
  },
  
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.03)',
  },
  iconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniIcon: {
    marginRight: -10,
    borderWidth: 2,
    borderColor: '#0A0A0F',
    borderRadius: 12,
    overflow: 'hidden',
  },
  moreCount: {
    color: COLORS.muted,
    fontSize: 11,
    marginLeft: 16,
    fontWeight: '800',
  },

  empty: {
    alignItems: 'center',
    marginTop: 80,
    padding: 40,
  },
  emptyText: {
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyBtn: {
    marginTop: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  emptyBtnTxt: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#0A0A0F',
    width: '90%',
    borderRadius: 32,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  label: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    color: COLORS.text,
    padding: 16,
    borderRadius: 16,
    fontSize: 15,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  timeFieldBase: { flex: 1 },
  timeFieldSpacer: { flex: 1, marginLeft: 16 },
  timeRow: { flexDirection: 'row', marginBottom: 20 },
  modalBtns: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  mBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  mBtnTxt: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  primaryButtonText: {
    color: '#fff',
  },
});
