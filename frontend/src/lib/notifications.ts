// Local scheduled notifications via expo-notifications.
// No push. Never schedule in the past. Cancel + reschedule on every task change.

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export const isWeb = Platform.OS === 'web';

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

/**
 * Schedule a local notification at the given local ISO date.
 * Returns notification identifier, or null if not scheduled (past / permission / web).
 */
export async function scheduleReminder(
  when: Date,
  title: string,
  body?: string
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
