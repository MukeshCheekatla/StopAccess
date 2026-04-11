/**
 * @stopaccess/state — Schedule Persistence
 */

import { ScheduleRule, StorageAdapter } from '@stopaccess/types';

export const SCHEDULES_KEY = 'schedules';

export async function getSchedules(
  storage: StorageAdapter,
): Promise<ScheduleRule[]> {
  const raw = await storage.getString(SCHEDULES_KEY);
  if (!raw) {
    return [];
  }
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

export async function saveSchedules(
  storage: StorageAdapter,
  schedules: ScheduleRule[],
): Promise<void> {
  await storage.set(SCHEDULES_KEY, JSON.stringify(schedules));
}

export async function addSchedule(
  storage: StorageAdapter,
  schedule: Partial<ScheduleRule>,
): Promise<ScheduleRule[]> {
  const schedules = await getSchedules(storage);
  const newSchedule: ScheduleRule = {
    id: String(Date.now()),
    name: 'New Schedule',
    startTime: '09:00',
    endTime: '17:00',
    days: [1, 2, 3, 4, 5],
    appNames: [],
    active: true,
    ...schedule,
    updatedAt: Date.now(),
  };
  schedules.push(newSchedule);
  await saveSchedules(storage, schedules);
  return schedules;
}

export async function toggleSchedule(
  storage: StorageAdapter,
  id: string,
  value?: boolean,
): Promise<ScheduleRule[]> {
  const schedules = await getSchedules(storage);
  const idx = schedules.findIndex((s) => s.id === id);
  if (idx >= 0) {
    schedules[idx].active =
      value !== undefined ? value : !schedules[idx].active;
    schedules[idx].updatedAt = Date.now();
  }
  await saveSchedules(storage, schedules);
  return schedules;
}

export async function updateSchedule(
  storage: StorageAdapter,
  updated: ScheduleRule,
): Promise<ScheduleRule[]> {
  const schedules = await getSchedules(storage);
  const idx = schedules.findIndex((s) => s.id === updated.id);
  if (idx >= 0) {
    schedules[idx] = { ...updated, updatedAt: Date.now() };
  } else {
    schedules.push({ ...updated, updatedAt: Date.now() });
  }
  await saveSchedules(storage, schedules);
  return schedules;
}

export async function deleteSchedule(
  storage: any,
  id: string,
): Promise<ScheduleRule[]> {
  let schedules = await getSchedules(storage);
  schedules = schedules.filter((s) => s.id !== id);
  await saveSchedules(storage, schedules);
  return schedules;
}
