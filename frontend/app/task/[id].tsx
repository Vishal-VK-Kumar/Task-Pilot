import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { useTasks } from '@/src/lib/store';
import { colors, font, listAccent, listLabel, radius, spacing, ListKey } from '@/src/lib/theme';
import { STAGE_LABEL, STAGES, Stage, Task } from '@/src/lib/types';
import { DateTimeField } from '@/src/components/DateTimeField';
import { isWeb } from '@/src/lib/notifications';
import { useUndo } from '@/src/components/UndoBar';

type ReminderPreset = 'none' | 'at_due' | '1h' | '1d' | 'custom';

function classifyReminder(reminderAt?: string | null, dueAt?: string | null): ReminderPreset {
  if (!reminderAt) return 'none';
  if (!dueAt) return 'custom';
  const r = new Date(reminderAt).getTime();
  const d = new Date(dueAt).getTime();
  const diff = d - r;
  if (diff === 0) return 'at_due';
  if (diff === 60 * 60 * 1000) return '1h';
  if (diff === 24 * 60 * 60 * 1000) return '1d';
  return 'custom';
}

function computeReminderFromPreset(p: ReminderPreset, dueAt: Date | null, existingCustom: Date | null): Date | null {
  if (p === 'none') return null;
  if (p === 'custom') return existingCustom;
  if (!dueAt) return null;
  if (p === 'at_due') return new Date(dueAt);
  if (p === '1h') return new Date(dueAt.getTime() - 60 * 60 * 1000);
  if (p === '1d') return new Date(dueAt.getTime() - 24 * 60 * 60 * 1000);
  return null;
}

export default function TaskDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tasks, updateTask, deleteTask, restoreTask, toggleDone } = useTasks();
  const { showUndo } = useUndo();
  const task = useMemo(() => tasks.find((t) => t.id === id) || null, [tasks, id]);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [list, setList] = useState<ListKey>('personal');
  const [dueAt, setDueAt] = useState<Date | null>(null);
  const [reminderPreset, setReminderPreset] = useState<ReminderPreset>('none');
  const [customReminder, setCustomReminder] = useState<Date | null>(null);
  // Application fields
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [link, setLink] = useState('');
  const [stage, setStage] = useState<Stage | null>(null);
  const [nextActionAt, setNextActionAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setNotes(task.notes || '');
    setList(task.list);
    setDueAt(task.dueAt ? new Date(task.dueAt) : null);
    const preset = classifyReminder(task.reminderAt, task.dueAt);
    setReminderPreset(preset);
    setCustomReminder(preset === 'custom' && task.reminderAt ? new Date(task.reminderAt) : null);
    setCompany(task.company || '');
    setRole(task.role || '');
    setLink(task.link || '');
    setStage(task.stage || null);
    setNextActionAt(task.nextActionAt ? new Date(task.nextActionAt) : null);
  }, [task?.id]);

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} testID="detail-back" style={styles.headerBtn} hitSlop={12}>
            <Feather name="chevron-left" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>Task</Text>
          <View style={styles.headerBtn} />
        </View>
        <Text style={{ padding: spacing.lg, color: colors.onSurfaceSecondary }}>Task not found.</Text>
      </SafeAreaView>
    );
  }

  const reminderDate = computeReminderFromPreset(reminderPreset, dueAt, customReminder);
  const reminderInPast = reminderDate && reminderDate.getTime() <= Date.now();

  const save = async () => {
    const patch: Partial<Task> = {
      title: title.trim() || task.title,
      notes: notes || null,
      list,
      dueAt: dueAt ? dueAt.toISOString() : null,
      reminderAt: reminderDate && !reminderInPast ? reminderDate.toISOString() : null,
      company: list === 'job' ? company || null : null,
      role: list === 'job' ? role || null : null,
      link: list === 'job' ? link || null : null,
      stage: list === 'job' ? stage : null,
      nextActionAt: list === 'job' && nextActionAt ? nextActionAt.toISOString() : null,
    };
    await updateTask(task.id, patch);
    router.back();
  };

  const doDelete = async () => {
    const snapshot = task;
    await deleteTask(task.id);
    router.back();
    if (snapshot) showUndo('Task deleted', () => restoreTask(snapshot));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} testID="detail-back" style={styles.headerBtn} hitSlop={12}>
          <Feather name="chevron-left" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit</Text>
        <Pressable onPress={save} testID="detail-save" style={styles.headerBtn} hitSlop={12}>
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
          <TextInput
            testID="detail-title"
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            style={styles.titleInput}
            multiline
          />

          <Pressable
            testID="detail-mark-done"
            onPress={() => toggleDone(task.id)}
            style={styles.doneToggle}
          >
            <View style={[styles.circle, task.done && styles.circleDone]}>
              {task.done ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
            </View>
            <Text style={styles.doneText}>{task.done ? 'Marked done' : 'Mark done'}</Text>
          </Pressable>

          {/* List selector */}
          <Text style={styles.sectionLabel}>List</Text>
          <View style={styles.listRow}>
            {(['personal', 'studies', 'job'] as ListKey[]).map((l) => (
              <Pressable
                key={l}
                testID={`detail-list-${l}`}
                onPress={() => setList(l)}
                style={[styles.listChip, list === l && { borderColor: listAccent(l), borderWidth: 2 }]}
              >
                <View style={[styles.chipDot, { backgroundColor: listAccent(l) }]} />
                <Text style={styles.chipText}>{listLabel(l)}</Text>
              </Pressable>
            ))}
          </View>

          {/* Due date */}
          <DateTimeField testID="detail-due" label="Due date/time" value={dueAt} onChange={setDueAt} />

          {/* Reminder */}
          <Text style={styles.sectionLabel}>Reminder</Text>
          <View style={styles.reminderRow}>
            {(['none', 'at_due', '1h', '1d', 'custom'] as ReminderPreset[]).map((p) => {
              const disabled = (p === 'at_due' || p === '1h' || p === '1d') && !dueAt;
              return (
                <Pressable
                  key={p}
                  testID={`detail-reminder-${p}`}
                  disabled={disabled}
                  onPress={() => setReminderPreset(p)}
                  style={[
                    styles.reminderChip,
                    reminderPreset === p && styles.reminderChipActive,
                    disabled && { opacity: 0.35 },
                  ]}
                >
                  <Text
                    style={[
                      styles.reminderChipText,
                      reminderPreset === p && styles.reminderChipTextActive,
                    ]}
                  >
                    {reminderLabel(p)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {reminderPreset === 'custom' ? (
            <DateTimeField
              testID="detail-reminder-custom"
              label="Custom reminder"
              value={customReminder}
              onChange={setCustomReminder}
            />
          ) : null}
          {reminderInPast ? (
            <Text style={styles.warn} testID="detail-reminder-warn">
              Reminder time is in the past — no notification will be scheduled.
            </Text>
          ) : null}
          {isWeb && reminderDate && !reminderInPast ? (
            <Text style={styles.info} testID="detail-web-info">
              Reminders are delivered on the phone only. This reminder will fire when you open TaskPilot on your phone.
            </Text>
          ) : null}

          {/* Notes */}
          <Text style={styles.sectionLabel}>Notes</Text>
          <TextInput
            testID="detail-notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes…"
            style={styles.notesInput}
            multiline
          />

          {/* Application fields */}
          {list === 'job' ? (
            <>
              <Text style={styles.sectionHeaderLg}>Application</Text>
              <Text style={styles.sectionLabel}>Company</Text>
              <TextInput
                testID="detail-company"
                value={company}
                onChangeText={setCompany}
                placeholder="e.g. Flipkart"
                style={styles.input}
              />
              <Text style={styles.sectionLabel}>Role</Text>
              <TextInput
                testID="detail-role"
                value={role}
                onChangeText={setRole}
                placeholder="e.g. Business Analyst"
                style={styles.input}
              />
              <Text style={styles.sectionLabel}>Link</Text>
              <TextInput
                testID="detail-link"
                value={link}
                onChangeText={setLink}
                placeholder="https://…"
                style={styles.input}
                autoCapitalize="none"
                keyboardType="url"
              />
              {link ? (
                <Pressable onPress={() => Linking.openURL(link)} testID="detail-open-link">
                  <Text style={styles.linkText}>Open link</Text>
                </Pressable>
              ) : null}
              <Text style={styles.sectionLabel}>Stage</Text>
              <View style={styles.reminderRow}>
                {STAGES.map((s) => (
                  <Pressable
                    key={s}
                    testID={`detail-stage-${s}`}
                    onPress={() => setStage(s)}
                    style={[styles.reminderChip, stage === s && styles.reminderChipActive]}
                  >
                    <Text style={[styles.reminderChipText, stage === s && styles.reminderChipTextActive]}>
                      {STAGE_LABEL[s]}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <DateTimeField
                testID="detail-next-action"
                label="Next action date"
                value={nextActionAt}
                onChange={setNextActionAt}
              />
            </>
          ) : null}

          <Pressable onPress={doDelete} style={styles.deleteBtn} testID="detail-delete">
            <Feather name="trash-2" size={16} color={colors.error} />
            <Text style={styles.deleteText}>Delete task</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function reminderLabel(p: ReminderPreset): string {
  if (p === 'none') return 'None';
  if (p === 'at_due') return 'At due time';
  if (p === '1h') return '1h before';
  if (p === '1d') return '1d before';
  return 'Custom';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  headerBtn: { minWidth: 60, alignItems: 'center', paddingVertical: 4 },
  headerTitle: { fontSize: font.lg, fontWeight: '600', color: colors.onSurface },
  saveText: { color: colors.info, fontSize: font.base, fontWeight: '600' },
  titleInput: {
    fontSize: font.xxl,
    fontWeight: '600',
    color: colors.onSurface,
    paddingVertical: spacing.sm,
  },
  doneToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  circle: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: colors.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  circleDone: { backgroundColor: colors.onSurface, borderColor: colors.onSurface },
  doneText: { color: colors.onSurface, fontSize: font.base },
  sectionLabel: {
    fontSize: font.sm, color: colors.onSurfaceSecondary, fontWeight: '600',
    marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  sectionHeaderLg: {
    fontSize: font.lg, fontWeight: '700', color: colors.onSurface,
    marginTop: spacing.xl,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  listRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  listChip: {
    flexDirection: 'row', gap: 6, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.pill,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { color: colors.onSurface, fontSize: font.base },
  reminderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reminderChip: {
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.pill,
  },
  reminderChipActive: { backgroundColor: colors.onSurface, borderColor: colors.onSurface },
  reminderChipText: { color: colors.onSurface, fontSize: font.base },
  reminderChipTextActive: { color: colors.onBrandPrimary },
  notesInput: {
    minHeight: 100, textAlignVertical: 'top',
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.md, fontSize: font.base, color: colors.onSurface,
  },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.md, fontSize: font.base, color: colors.onSurface,
  },
  warn: { fontSize: font.sm, color: colors.warning, marginTop: spacing.xs },
  info: { fontSize: font.sm, color: colors.info, marginTop: spacing.xs },
  linkText: { color: colors.info, fontSize: font.sm, paddingVertical: spacing.xs },
  deleteBtn: {
    marginTop: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
  },
  deleteText: { color: colors.error, fontSize: font.base, fontWeight: '600' },
});
