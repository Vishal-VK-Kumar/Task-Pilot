// Local scheduled notifications via expo-notifications.
// No push. Never schedule in the past. Cancel + reschedule on every task change.
// Includes snooze actions handled from the notification itself.

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { storage } from '@/src/utils/storage';
import { NOTIF_MAP_KEY, SNOOZE_KEY } from './keys';

export const isWeb = Platform.OS === 'web';

export const REMINDER_CATEGORY = 'reminder';
export const SNOOZE_10 = 'snooze_10';
export const SNOOZE_1H = 'snooze_1h';
export const SNOOZE_TONIGHT = 'snooze_tonight';

// ---- low-level storage helpers (module scope, usable from background handler) ----
async function loadMap(key: string): Promise<Record<string, string>> {
  const raw = await storage.getItem(key, '' as string);
  if (!raw) return {};
  try {
    return JSON.parse(raw as string) as Record<string, string>;
  } catch {
    return {};
  }
}
async function saveMap(key: string, m: Record<string, string>): Promise<void> {
  await storage.setItem(key, JSON.stringify(m));
}

// ---- permission ----
export async function ensurePermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (isWeb) return 'denied';
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted') return 'granted';
    if (!current.canAskAgain) return 'denied';
    const req = await Notifications.requestPermissionsAsync();
    return req.status === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

export async function getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (isWeb) return 'denied';
  try {
    const c = await Notifications.getPermissionsAsync();
    if (c.status === 'granted') return 'granted';
    if (c.status === 'undetermined') return 'undetermined';
    return 'denied';
  } catch {
    return 'denied';
  }
}

// ---- category setup (snooze actions) ----
export async function setupNotificationCategories(): Promise<void> {
  if (isWeb) return;
  try {
    await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY, [
      { identifier: SNOOZE_10, buttonTitle: '10 min', options: { opensAppToForeground: false } },
      { identifier: SNOOZE_1H, buttonTitle: '1 hour', options: { opensAppToForeground: false } },
      { identifier: SNOOZE_TONIGHT, buttonTitle: 'Tonight 6pm', options: { opensAppToForeground: false } },
    ]);
  } catch (e) {
    console.warn('setupNotificationCategories failed', e);
  }
}

// ---- scheduling ----
export async function scheduleReminder(
  when: Date,
  title: string,
  body: string | undefined,
  taskId: string
): Promise<string | null> {
  if (isWeb) return null;
  const now = new Date();
  if (when.getTime() <= now.getTime()) return null;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (perm.status !== 'granted') return null;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: body || undefined,
        sound: 'default',
        categoryIdentifier: REMINDER_CATEGORY,
        data: { taskId, title, body: body || '' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: when,
      } as any,
    });
    return id;
  } catch (e) {
    console.warn('scheduleReminder failed', e);
    return null;
  }
}

export async function cancelReminder(id?: string | null): Promise<void> {
  if (isWeb || !id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // ignore
  }
}

export async function scheduleTest60s(): Promise<string | null> {
  if (isWeb) return null;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (perm.status !== 'granted') {
      const r = await Notifications.requestPermissionsAsync();
      if (r.status !== 'granted') return null;
    }
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'TaskPilot test reminder',
        body: 'If you see this, reminders are working.',
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60,
      } as any,
    });
    return id;
  } catch (e) {
    console.warn('scheduleTest60s failed', e);
    return null;
  }
}

// ---- snooze handling (runs from notification response, incl. cold start) ----
function computeSnoozeDate(action: string): Date {
  const now = new Date();
  if (action === SNOOZE_10) return new Date(now.getTime() + 10 * 60 * 1000);
  if (action === SNOOZE_1H) return new Date(now.getTime() + 60 * 60 * 1000);
  // tonight 18:00 today
  const tonight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0, 0);
  if (tonight.getTime() <= now.getTime()) {
    // 6pm already passed — fall back to a valid near-future time (+1h)
    return new Date(now.getTime() + 60 * 60 * 1000);
  }
  return tonight;
}

/**
 * Handle a notification response. If it is one of the snooze actions, cancel the
 * current (fired) notification, schedule a fresh local notification at the snoozed
 * time, and record the snooze so the task row can show an indicator.
 * The task's due date is NOT changed here.
 * Returns true if it handled a snooze action.
 */
export async function handleNotificationResponse(
  response: Notifications.NotificationResponse
): Promise<boolean> {
  if (isWeb) return false;
  const action = response.actionIdentifier;
  if (action !== SNOOZE_10 && action !== SNOOZE_1H && action !== SNOOZE_TONIGHT) {
    return false;
  }
  try {
    const content = response.notification.request.content;
    const data = (content.data || {}) as any;
    const taskId: string | undefined = data.taskId;
    const title: string = data.title || content.title || 'Reminder';
    const body: string | undefined = data.body || content.body || undefined;

    const when = computeSnoozeDate(action);

    const newId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: body || undefined,
        sound: 'default',
        categoryIdentifier: REMINDER_CATEGORY,
        data: { taskId, title, body: body || '' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: when,
      } as any,
    });

    if (taskId) {
      const notifMap = await loadMap(NOTIF_MAP_KEY);
      notifMap[taskId] = newId;
      await saveMap(NOTIF_MAP_KEY, notifMap);

      const snoozeMap = await loadMap(SNOOZE_KEY);
      snoozeMap[taskId] = when.toISOString();
      await saveMap(SNOOZE_KEY, snoozeMap);
    }
    return true;
  } catch (e) {
    console.warn('handleNotificationResponse (snooze) failed', e);
    return false;
  }
}

export async function loadSnoozes(): Promise<Record<string, string>> {
  return loadMap(SNOOZE_KEY);
}

export async function clearSnooze(taskId: string): Promise<void> {
  const m = await loadMap(SNOOZE_KEY);
  if (m[taskId]) {
    delete m[taskId];
    await saveMap(SNOOZE_KEY, m);
  }
}
