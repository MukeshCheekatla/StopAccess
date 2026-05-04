import {
  getSchedules,
  updateSchedule,
  deleteSchedule,
} from '@stopaccess/state/schedules';
import { VMPlatformDependencies } from './types';

export async function loadScheduleData(deps: VMPlatformDependencies) {
  return await getSchedules(deps.storage);
}

export async function createScheduleAction(
  deps: VMPlatformDependencies,
  scheduleObj: any,
) {
  await updateSchedule(deps.storage, scheduleObj);
  deps.sendCommand('manualSync');
}

export async function deleteScheduleAction(
  deps: VMPlatformDependencies,
  id: string,
) {
  await deleteSchedule(deps.storage, id);
  deps.sendCommand('manualSync');
}
