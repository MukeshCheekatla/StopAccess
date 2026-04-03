declare var chrome: any;
import {
  getSchedules,
  updateSchedule,
  deleteSchedule,
} from '@focusgate/state/schedules';
import { extensionAdapter as storage } from '../../../extension/src/background/platformAdapter';

export async function loadScheduleData() {
  return await getSchedules(storage);
}

export async function createScheduleAction(scheduleObj: any) {
  await updateSchedule(storage, scheduleObj);
  chrome.runtime.sendMessage({ action: 'manualSync' });
}

export async function deleteScheduleAction(id: string) {
  await deleteSchedule(storage, id);
  chrome.runtime.sendMessage({ action: 'manualSync' });
}
