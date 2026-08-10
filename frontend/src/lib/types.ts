import { ListKey } from './theme';

export type Stage = 'to_apply' | 'applied' | 'interviewing' | 'offer' | 'rejected';

export const STAGES: Stage[] = ['to_apply', 'applied', 'interviewing', 'offer', 'rejected'];
export const STAGE_LABEL: Record<Stage, string> = {
  to_apply: 'To apply',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
};

export type Task = {
  id: string;
  title: string;
  dueAt?: string | null;
  reminderAt?: string | null;
  done: boolean;
  list: ListKey;
  notes?: string | null;
  createdAt: string;
  completedAt?: string | null;
  // Application fields (only meaningful when list === 'job')
  company?: string | null;
  role?: string | null;
  link?: string | null;
  stage?: Stage | null;
  nextActionAt?: string | null;
  updatedAt?: string | null;
  // notification id assigned by local scheduler (not synced to server)
  notifId?: string | null;
};
