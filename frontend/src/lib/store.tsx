// TasksStore — single source of truth for all tasks (including job applications).
// Local storage is authoritative. Backend is a mirror (fire-and-forget).
// Notifications are scheduled/cancelled here whenever tasks mutate.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '@/src/utils/storage';
import { Task } from './types';
import { cancelReminder, scheduleReminder } from './notifications';
import { syncBulkPush, syncDeleteTask, syncPullAll, syncPushTask, setDeviceId } from './sync';
import { buildDemoData } from './demoData';

const REAL_KEY = 'tp.tasks.v1';
const DEMO_MODE_KEY = 'tp.demoMode.v1';
const DEMO_TASKS_KEY = 'tp.demoTasks.v1';
const NOTIF_MAP_KEY = 'tp.notifMap.v1'; // taskId -> notifId
const DEVICE_ID_KEY = 'tp.deviceId.v1';

type NotifMap = Record<string, string>; // taskId -> notifId

async function loadTasks(key: string): Promise<Task[]> {
  const raw = await storage.getItem(key, '' as string);
  if (!raw) return [];
  try {
    return JSON.parse(raw as string) as Task[];
  } catch {
    return [];
  }
}
async function saveTasks(key: string, tasks: Task[]): Promise<void> {
  await storage.setItem(key, JSON.stringify(tasks));
}
async function loadNotifMap(): Promise<NotifMap> {
  const raw = await storage.getItem(NOTIF_MAP_KEY, '' as string);
  if (!raw) return {};
  try {
    return JSON.parse(raw as string) as NotifMap;
  } catch {
    return {};
  }
}
async function saveNotifMap(m: NotifMap): Promise<void> {
  await storage.setItem(NOTIF_MAP_KEY, JSON.stringify(m));
}

function uid(): string {
  return 'tsk_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

async function ensureDeviceId(): Promise<string> {
  const existing = await storage.getItem(DEVICE_ID_KEY, '' as string);
  if (existing) {
    setDeviceId(existing as string);
    return existing as string;
  }
  const id = 'dev_' + Math.random().toString(36).slice(2, 12);
  await storage.setItem(DEVICE_ID_KEY, id);
  setDeviceId(id);
  return id;
}

type Ctx = {
  ready: boolean;
  tasks: Task[];
  demoMode: boolean;
  notifPermission: 'granted' | 'denied' | 'undetermined';
  setNotifPermission: (v: 'granted' | 'denied' | 'undetermined') => void;
  addTask: (draft: Omit<Task, 'id' | 'createdAt' | 'done'> & { done?: boolean }) => Promise<Task>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleDone: (id: string) => Promise<void>;
  setDemoMode: (v: boolean) => Promise<void>;
};

const TasksContext = createContext<Ctx | null>(null);

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [demoMode, setDemoModeState] = useState(false);
  const [notifPermission, setNotifPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

  // Initial load
  useEffect(() => {
    (async () => {
      await ensureDeviceId();
      const dm = await storage.getItem(DEMO_MODE_KEY, false);
      const isDemo = dm === true;
      setDemoModeState(isDemo);
      if (isDemo) {
        let demo = await loadTasks(DEMO_TASKS_KEY);
        if (demo.length === 0) {
          demo = buildDemoData();
          await saveTasks(DEMO_TASKS_KEY, demo);
        }
        setTasks(demo);
      } else {
        const real = await loadTasks(REAL_KEY);
        setTasks(real);
        // fire-and-forget: try to pull from backend
        (async () => {
          const remote = await syncPullAll();
          if (remote && remote.length > 0 && real.length === 0) {
            await saveTasks(REAL_KEY, remote);
            setTasks(remote);
          }
        })();
      }
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeKey = demoMode ? DEMO_TASKS_KEY : REAL_KEY;

  const persist = useCallback(
    async (next: Task[]) => {
      setTasks(next);
      await saveTasks(activeKey, next);
    },
    [activeKey]
  );

  const cancelNotifFor = useCallback(async (taskId: string) => {
    const map = await loadNotifMap();
    if (map[taskId]) {
      await cancelReminder(map[taskId]);
      delete map[taskId];
      await saveNotifMap(map);
    }
  }, []);

  const scheduleNotifFor = useCallback(async (task: Task) => {
    // cancel any existing first
    await cancelNotifFor(task.id);
    if (task.done) return;
    if (!task.reminderAt) return;
    const when = new Date(task.reminderAt);
    if (isNaN(when.getTime())) return;
    if (when.getTime() <= Date.now()) return;
    const id = await scheduleReminder(when, task.title, task.notes || undefined);
    if (id) {
      const map = await loadNotifMap();
      map[task.id] = id;
      await saveNotifMap(map);
    }
  }, [cancelNotifFor]);

  const addTask = useCallback(async (draft: Omit<Task, 'id' | 'createdAt' | 'done'> & { done?: boolean }) => {
    const now = new Date().toISOString();
    const t: Task = {
      id: uid(),
      title: draft.title,
      dueAt: draft.dueAt ?? null,
      reminderAt: draft.reminderAt ?? null,
      done: draft.done ?? false,
      list: draft.list ?? 'personal',
      notes: draft.notes ?? null,
      createdAt: now,
      completedAt: null,
      company: draft.company ?? null,
      role: draft.role ?? null,
      link: draft.link ?? null,
      stage: draft.stage ?? null,
      nextActionAt: draft.nextActionAt ?? null,
      updatedAt: now,
    };
    const next = [t, ...tasks];
    await persist(next);
    await scheduleNotifFor(t);
    if (!demoMode) syncPushTask(t).catch(() => {});
    return t;
  }, [tasks, persist, scheduleNotifFor, demoMode]);

  const updateTask = useCallback(async (id: string, patch: Partial<Task>) => {
    const next = tasks.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t));
    const updated = next.find((t) => t.id === id);
    await persist(next);
    if (updated) {
      await scheduleNotifFor(updated);
      if (!demoMode) syncPushTask(updated).catch(() => {});
    }
  }, [tasks, persist, scheduleNotifFor, demoMode]);

  const deleteTask = useCallback(async (id: string) => {
    await cancelNotifFor(id);
    const next = tasks.filter((t) => t.id !== id);
    await persist(next);
    if (!demoMode) syncDeleteTask(id).catch(() => {});
  }, [tasks, persist, cancelNotifFor, demoMode]);

  const toggleDone = useCallback(async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const now = new Date().toISOString();
    const patch: Partial<Task> = task.done
      ? { done: false, completedAt: null }
      : { done: true, completedAt: now };
    await updateTask(id, patch);
  }, [tasks, updateTask]);

  const setDemoMode = useCallback(async (v: boolean) => {
    // Cancel all currently-scheduled notifications (they belong to the currently visible set)
    const map = await loadNotifMap();
    for (const nid of Object.values(map)) {
      await cancelReminder(nid);
    }
    await saveNotifMap({});

    await storage.setItem(DEMO_MODE_KEY, v);
    setDemoModeState(v);
    if (v) {
      let demo = await loadTasks(DEMO_TASKS_KEY);
      if (demo.length === 0) {
        demo = buildDemoData();
        await saveTasks(DEMO_TASKS_KEY, demo);
      }
      setTasks(demo);
      // Do NOT schedule notifications for demo tasks (dates are illustrative)
    } else {
      const real = await loadTasks(REAL_KEY);
      setTasks(real);
      // Re-schedule reminders for real tasks
      for (const t of real) {
        // eslint-disable-next-line no-await-in-loop
        await (async () => {
          if (t.done || !t.reminderAt) return;
          const when = new Date(t.reminderAt);
          if (isNaN(when.getTime()) || when.getTime() <= Date.now()) return;
          const id = await scheduleReminder(when, t.title, t.notes || undefined);
          if (id) {
            const m = await loadNotifMap();
            m[t.id] = id;
            await saveNotifMap(m);
          }
        })();
      }
      // Fire bulk push of real data to backend
      if (real.length > 0) syncBulkPush(real).catch(() => {});
    }
  }, []);

  const value: Ctx = useMemo(
    () => ({
      ready,
      tasks,
      demoMode,
      notifPermission,
      setNotifPermission,
      addTask,
      updateTask,
      deleteTask,
      toggleDone,
      setDemoMode,
    }),
    [ready, tasks, demoMode, notifPermission, addTask, updateTask, deleteTask, toggleDone, setDemoMode]
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): Ctx {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used inside TasksProvider');
  return ctx;
}
