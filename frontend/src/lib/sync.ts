// Backend sync (fire-and-forget). Local storage is source of truth.
// Last-write-wins by updatedAt on server.

import { Task } from './types';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || '';

let deviceId = 'device-unknown';
export function setDeviceId(id: string) {
  deviceId = id;
}

async function req(path: string, init?: RequestInit): Promise<Response | null> {
  if (!BASE) return null;
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        ...(init?.headers || {}),
      },
    });
    return res;
  } catch (e) {
    return null;
  }
}

function stripLocal(t: Task): any {
  const { notifId, ...rest } = t;
  return { ...rest, deviceId };
}

export async function syncPushTask(t: Task): Promise<void> {
  const body = stripLocal({ ...t, updatedAt: new Date().toISOString() });
  await req(`/api/tasks/${encodeURIComponent(t.id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function syncDeleteTask(id: string): Promise<void> {
  await req(`/api/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function syncPullAll(): Promise<Task[] | null> {
  const res = await req(`/api/tasks?deviceId=${encodeURIComponent(deviceId)}`);
  if (!res || !res.ok) return null;
  try {
    return (await res.json()) as Task[];
  } catch {
    return null;
  }
}

export async function syncBulkPush(tasks: Task[]): Promise<void> {
  const body = tasks.map((t) => stripLocal({ ...t, updatedAt: t.updatedAt || new Date().toISOString() }));
  await req(`/api/sync`, { method: 'POST', body: JSON.stringify(body) });
}
