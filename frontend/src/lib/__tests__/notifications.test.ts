/**
 * Unit tests for the core notification helpers in notifications.ts.
 *
 * These exercise scheduleReminder and cancelReminder in isolation by mocking
 * expo-notifications and the storage singleton. Platform.OS is 'ios' in the
 * jest-expo preset, so the isWeb guard is false and every code path runs.
 */

import { scheduleReminder, cancelReminder } from '../notifications';
import * as Notifications from 'expo-notifications';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  setNotificationCategoryAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval' },
}));

// notifications.ts reads the snooze map on snooze operations; stub storage
// so those reads return empty without hitting AsyncStorage.
jest.mock('@/src/utils/storage', () => ({
  storage: {
    getItem: jest.fn().mockResolvedValue(''),
    setItem: jest.fn().mockResolvedValue(true),
    removeItem: jest.fn().mockResolvedValue(true),
    secureGet: jest.fn().mockResolvedValue(null),
    secureSet: jest.fn().mockResolvedValue(true),
    secureRemove: jest.fn().mockResolvedValue(true),
  },
}));

const mockGetPerm = Notifications.getPermissionsAsync as jest.Mock;
const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock;
const mockCancel = Notifications.cancelScheduledNotificationAsync as jest.Mock;

// ── Helpers ────────────────────────────────────────────────────────────────

const future = (ms = 60 * 60 * 1000) => new Date(Date.now() + ms);
const past   = (ms = 60 * 1000)       => new Date(Date.now() - ms);

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockGetPerm.mockResolvedValue({ status: 'granted' });
  mockSchedule.mockResolvedValue('test-notif-id');
  mockCancel.mockResolvedValue(undefined);
});

// ── scheduleReminder ───────────────────────────────────────────────────────

describe('scheduleReminder', () => {
  it('schedules and returns an id when the time is in the future', async () => {
    const when = future();
    const id = await scheduleReminder(when, 'Buy milk', 'notes', 'task-1');

    expect(id).toBe('test-notif-id');
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: 'Buy milk' }),
        trigger: expect.objectContaining({ date: when }),
      })
    );
  });

  it('returns null and does not call expo when the time is in the past', async () => {
    const id = await scheduleReminder(past(), 'Stale task', undefined, 'task-2');

    expect(id).toBeNull();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('returns null and does not call expo when permission is denied', async () => {
    mockGetPerm.mockResolvedValue({ status: 'denied' });

    const id = await scheduleReminder(future(), 'Blocked', undefined, 'task-3');

    expect(id).toBeNull();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('passes the body through to the notification content', async () => {
    await scheduleReminder(future(), 'Title', 'Some notes', 'task-4');

    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ body: 'Some notes' }),
      })
    );
  });

  it('embeds taskId in notification data for snooze routing', async () => {
    await scheduleReminder(future(), 'Title', undefined, 'task-abc');

    const [arg] = mockSchedule.mock.calls[0];
    expect(arg.content.data.taskId).toBe('task-abc');
  });
});

// ── cancelReminder ─────────────────────────────────────────────────────────

describe('cancelReminder', () => {
  it('calls cancelScheduledNotificationAsync with the given id', async () => {
    await cancelReminder('some-notif-id');

    expect(mockCancel).toHaveBeenCalledWith('some-notif-id');
  });

  it('does nothing when id is null', async () => {
    await cancelReminder(null);

    expect(mockCancel).not.toHaveBeenCalled();
  });

  it('does nothing when id is undefined', async () => {
    await cancelReminder(undefined);

    expect(mockCancel).not.toHaveBeenCalled();
  });
});
