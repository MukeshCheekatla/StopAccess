import { ScheduleRule } from '../types';
import { storage } from './storage';

const SCHEDULES_KEY = 'schedule_rules';

export function getSchedules(): ScheduleRule[] {
  const raw = storage.getString(SCHEDULES_KEY);
  return raw ? (JSON.parse(raw) as ScheduleRule[]) : [];
}
export function saveSchedules(schedules: ScheduleRule[]): void {
  storage.set(SCHEDULES_KEY, JSON.stringify(schedules));
}
export function addSchedule(schedule: ScheduleRule): void {
  const schedules = getSchedules();
  schedules.push(schedule);
  saveSchedules(schedules);
}
export function deleteSchedule(id: string): void {
  saveSchedules(getSchedules().filter((s) => s.id !== id));
}
export function toggleSchedule(id: string, active: boolean): void {
  saveSchedules(
    getSchedules().map((s) => (s.id === id ? { ...s, active } : s)),
  );
}
