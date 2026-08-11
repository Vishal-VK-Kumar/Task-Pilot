/**
 * Integration tests for the notification lifecycle wired into the task store.
 *
 * Each test renders the full TasksProvider via renderHook, drives a store
 * mutation, and asserts on what expo-notifications was asked to do.
 *
 * Scenarios (matching the task-6 spec):
 *  1. Schedule on create
 *  2. Reschedule on due-date edit — fires once at the new time, not the old
 *  3. Cancel on complete
 *  4. Cancel on delete
 *  5. No scheduling for a past time
 *  6. Undo-complete reschedules a future reminder
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { TasksProvider, useTasks } from '../store';
import * as Notifications from 'expo-notifications';

// ── In-memory storage mock ─────────────────────────────────────────────────
// Persists values within a single test so notifMap reads/writes are coherent.

// Prefix with "mock" so Babel's jest.mock hoisting allows the reference.
const mockMem = new Map<string, any>();

jest.mock('@/src/utils/storage', () => ({
  storage: {
    getItem:     jest.fn((key: string, fallback: any) =>
      Promise.resolve(mockMem.has(key) ? mockMem.get(key) : fallback)),
    setItem:     jest.fn((key: string, value: any) => { mockMem.set(key, value); return Promise.resolve(true); }),
    removeItem:  jest.fn((key: string) => { mockMem.delete(key); return Promise.resolve(true); }),
    secureGet:   jest.fn((_k: string, fb: any) => Promise.resolve(fb)),
    secureSet:   jest.fn(() => Promise.resolve(true)),
    secureRemove:jest.fn(() => Promise.resolve(true)),
  },
}));

// ── expo-notifications mock ────────────────────────────────────────────────

jest.mock('expo-notifications', () => ({
  getPermissionsAsync:             jest.fn(),
  requestPermissionsAsync:         jest.fn(),
  scheduleNotificationAsync:       jest.fn(),
  cancelScheduledNotificationAsync:jest.fn(),
  setNotificationCategoryAsync:    jest.fn(),
  setNotificationChannelAsync:     jest.fn(),
  SchedulableTriggerInputTypes:    { DATE: 'date' },
  AndroidImportance:               { MAX: 5 },
}));

// ── Sync mock — fire-and-forget; must not affect assertions ───────────────

jest.mock('../sync', () => ({
  syncPushTask:  jest.fn().mockResolvedValue(undefined),
  syncDeleteTask:jest.fn().mockResolvedValue(undefined),
  syncPullAll:   jest.fn().mockResolvedValue(null),
  syncBulkPush:  jest.fn().mockResolvedValue(undefined),
  setDeviceId:   jest.fn(),
}));

// ── Convenience aliases ────────────────────────────────────────────────────

const mockSchedule = Notifications.scheduleNotificationAsync       as jest.Mock;
const mockCancel   = Notifications.cancelScheduledNotificationAsync as jest.Mock;

const MOCK_NOTIF_ID = 'mock-notif-id';

// Two hours from now — safely in the future for any test run.
const FUTURE = new Date(Date.now() + 2 * 60 * 60 * 1000);
const PAST   = new Date(Date.now() - 60 * 1000);

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockMem.clear();
  jest.clearAllMocks();
  (Notifications.getPermissionsAsync          as jest.Mock).mockResolvedValue({ status: 'granted' });
  (Notifications.setNotificationCategoryAsync as jest.Mock).mockResolvedValue(undefined);
  mockSchedule.mockResolvedValue(MOCK_NOTIF_ID);
  mockCancel.mockResolvedValue(undefined);
});

// ── Wrapper + helper ───────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  return <TasksProvider>{children}</TasksProvider>;
}

async function readyStore() {
  const { result } = renderHook(() => useTasks(), { wrapper });
  await waitFor(() => expect(result.current.ready).toBe(true));
  return result;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('notification lifecycle', () => {
  // ── 1. Schedule on create ────────────────────────────────────────────────

  it('schedules a notification when a task is created with a future reminderAt', async () => {
    const store = await readyStore();

    await act(async () => {
      await store.current.addTask({
        title: 'Buy milk',
        reminderAt: FUTURE.toISOString(),
        list: 'personal',
      });
    });

    expect(mockSchedule).toHaveBeenCalledTimes(1);
    const triggerDate: Date = mockSchedule.mock.calls[0][0].trigger.date;
    expect(triggerDate.getTime()).toBe(FUTURE.getTime());
  });

  // ── 5. No scheduling for a past time ────────────────────────────────────

  it('does not schedule when reminderAt is in the past', async () => {
    const store = await readyStore();

    await act(async () => {
      await store.current.addTask({
        title: 'Stale task',
        reminderAt: PAST.toISOString(),
        list: 'personal',
      });
    });

    expect(mockSchedule).not.toHaveBeenCalled();
  });

  // ── 2. Reschedule on edit ────────────────────────────────────────────────

  it('cancels the old notification and schedules exactly once at the new time on update', async () => {
    const store = await readyStore();
    const originalReminder = new Date(FUTURE.getTime());
    let taskId = '';

    // Create with an initial reminder → notifMap: {taskId: MOCK_NOTIF_ID}
    await act(async () => {
      const t = await store.current.addTask({
        title: 'Meeting',
        reminderAt: originalReminder.toISOString(),
        list: 'personal',
      });
      taskId = t.id;
    });

    mockSchedule.mockClear();
    mockCancel.mockClear();

    // Update with a different reminder time
    const newReminder = new Date(FUTURE.getTime() + 30 * 60 * 1000); // +30 min
    await act(async () => {
      await store.current.updateTask(taskId, { reminderAt: newReminder.toISOString() });
    });

    // Old notification cancelled exactly once
    expect(mockCancel).toHaveBeenCalledWith(MOCK_NOTIF_ID);
    // New notification scheduled exactly once at the new time (not the old)
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    const newTriggerDate: Date = mockSchedule.mock.calls[0][0].trigger.date;
    expect(newTriggerDate.getTime()).toBe(newReminder.getTime());
  });

  // ── 3. Cancel on complete ────────────────────────────────────────────────

  it('cancels the notification when a task is marked complete', async () => {
    const store = await readyStore();
    let taskId = '';

    await act(async () => {
      const t = await store.current.addTask({
        title: 'Exercise',
        reminderAt: FUTURE.toISOString(),
        list: 'personal',
      });
      taskId = t.id;
    });

    mockCancel.mockClear();
    mockSchedule.mockClear();

    await act(async () => {
      await store.current.toggleDone(taskId); // marks done
    });

    expect(mockCancel).toHaveBeenCalledWith(MOCK_NOTIF_ID);
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  // ── 4. Cancel on delete ──────────────────────────────────────────────────

  it('cancels the notification when a task is deleted', async () => {
    const store = await readyStore();
    let taskId = '';

    await act(async () => {
      const t = await store.current.addTask({
        title: 'Read book',
        reminderAt: FUTURE.toISOString(),
        list: 'personal',
      });
      taskId = t.id;
    });

    mockCancel.mockClear();
    mockSchedule.mockClear();

    await act(async () => {
      await store.current.deleteTask(taskId);
    });

    expect(mockCancel).toHaveBeenCalledWith(MOCK_NOTIF_ID);
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  // ── 6. Undo-complete reschedules ─────────────────────────────────────────

  it('reschedules the reminder at the original time after undo-complete', async () => {
    const store = await readyStore();
    let taskId = '';

    await act(async () => {
      const t = await store.current.addTask({
        title: 'Call dentist',
        reminderAt: FUTURE.toISOString(),
        list: 'personal',
      });
      taskId = t.id;
    });

    // Complete the task (cancels the notification)
    await act(async () => {
      await store.current.toggleDone(taskId);
    });

    mockSchedule.mockClear();
    mockCancel.mockClear();

    // Undo complete (should reschedule at the original time)
    await act(async () => {
      await store.current.toggleDone(taskId);
    });

    expect(mockSchedule).toHaveBeenCalledTimes(1);
    const rescheduled: Date = mockSchedule.mock.calls[0][0].trigger.date;
    expect(rescheduled.getTime()).toBe(FUTURE.getTime());
  });
});
