import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Keyboard,
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { useTasks } from '@/src/lib/store';
import { Task } from '@/src/lib/types';
import { ListKey, colors, font, radius, spacing, listAccent, listLabel } from '@/src/lib/theme';
import { EmptyState, SectionHeader, SwipeableTaskRow } from '@/src/components/TaskUi';
import { DateTimeField } from '@/src/components/DateTimeField';
import { ensurePermission, getPermissionStatus } from '@/src/lib/notifications';
import { useUndo } from '@/src/components/UndoBar';

export default function TodayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showUndo } = useUndo();
  const { ready, tasks, addTask, toggleDone, deleteTask, restoreTask, snoozes, demoMode, notifPermission, setNotifPermission } = useTasks();

  const [title, setTitle] = useState('');
  const titleInputRef = useRef<any>(null);
  const [quickDate, setQuickDate] = useState<Date | null>(null);
  const [quickList, setQuickList] = useState<ListKey>('personal');
  const [showListPicker, setShowListPicker] = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  // Permission check on mount
  useEffect(() => {
    (async () => {
      const s = await getPermissionStatus();
      setNotifPermission(s);
      if (s === 'undetermined') {
        const r = await ensurePermission();
        setNotifPermission(r);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const { overdue, todaysList } = useMemo(() => {
    const overdueArr: Task[] = [];
    const todayArr: Task[] = [];
    for (const t of tasks) {
      if (t.done) continue;
      if (!t.dueAt) continue;
      const d = new Date(t.dueAt);
      if (isNaN(d.getTime())) continue;
      if (d < startOfToday) overdueArr.push(t);
      else if (d <= endOfToday) todayArr.push(t);
    }
    overdueArr.sort((a, b) => new Date(b.dueAt!).getTime() - new Date(a.dueAt!).getTime());
    todayArr.sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime());
    return { overdue: overdueArr, todaysList: todayArr };
  }, [tasks]);

  const handleQuickAdd = async () => {
    // Read from state; on web, also fall back to DOM value in case controlled
    // state hasn't caught the input event yet (e.g. Playwright fills).
    let effective = title;
    if (!effective.trim() && Platform.OS === 'web') {
      const el =
        (titleInputRef.current as any)?.value ??
        (typeof document !== 'undefined'
          ? (document.querySelector('[data-testid="quick-add-input"]') as HTMLInputElement | null)?.value
          : '');
      if (el) effective = el;
    }
    if (!effective.trim()) return;
    const dueAt = quickDate ? quickDate.toISOString() : null;
    await addTask({
      title: effective.trim(),
      dueAt,
      reminderAt: dueAt && quickDate!.getTime() > Date.now() ? dueAt : null,
      list: quickList,
    });
    setTitle('');
    // Also clear the DOM value if we read from it directly (Playwright case).
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const el = document.querySelector('[data-testid="quick-add-input"]') as HTMLInputElement | null;
      if (el) el.value = '';
    }
    setQuickDate(null);
    Keyboard.dismiss();
  };

  const handleToggle = async (id: string) => {
    await toggleDone(id);
    showUndo('Task marked done', () => toggleDone(id));
  };

  const handleDelete = async (id: string) => {
    const snapshot = tasks.find((t) => t.id === id);
    await deleteTask(id);
    if (snapshot) showUndo('Task deleted', () => restoreTask(snapshot));
  };

  const openSettings = () => {
    router.push('/settings');
  };

  const pastQuickDate = quickDate && quickDate.getTime() <= Date.now();

  if (!ready) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Today</Text>
            {demoMode ? (
              <Text style={styles.demoTag} testID="demo-mode-indicator">SAMPLE DATA — Demo Mode</Text>
            ) : null}
          </View>
          <View style={styles.headerActions}>
            <Pressable
              testID="open-history-btn"
              onPress={() => router.push('/history')}
              hitSlop={12}
              style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.5 }]}
            >
              <Feather name="check-circle" size={22} color={colors.onSurface} />
            </Pressable>
            <Pressable
              testID="open-settings-btn"
              onPress={openSettings}
              hitSlop={12}
              style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.5 }]}
            >
              <Feather name="settings" size={22} color={colors.onSurface} />
            </Pressable>
          </View>
        </View>

        {/* Notification permission banner */}
        {notifPermission === 'denied' && showBanner ? (
          <View style={styles.banner} testID="notif-permission-banner">
            <Feather name="bell-off" size={16} color={colors.warning} />
            <Text style={styles.bannerText}>Reminders are off. Enable notifications to get alerts.</Text>
            <Pressable onPress={() => Linking.openSettings()} testID="banner-open-settings">
              <Text style={styles.bannerAction}>Settings</Text>
            </Pressable>
            <Pressable onPress={() => setShowBanner(false)} testID="banner-dismiss" hitSlop={10}>
              <Feather name="x" size={16} color={colors.onSurfaceSecondary} />
            </Pressable>
          </View>
        ) : null}

        {/* Quick add bar */}
        <View style={styles.quickAdd}>
          <TextInput
            testID="quick-add-input"
            ref={titleInputRef}
            value={title}
            onChangeText={setTitle}
            placeholder="Add a task…"
            placeholderTextColor={colors.onSurfaceTertiary}
            style={styles.quickInput}
            returnKeyType="done"
            onSubmitEditing={handleQuickAdd}
          />
          <Text style={styles.quickRowLabel}>Deadline</Text>
          <View style={styles.quickRow}>
            <DateTimeField
              testID="quick-add-datetime"
              inline
              emptyText="No deadline"
              value={quickDate}
              onChange={setQuickDate}
            />
            <Pressable
              testID="quick-add-list-picker"
              onPress={() => setShowListPicker((v) => !v)}
              style={styles.listBtn}
            >
              <View style={[styles.listDot, { backgroundColor: listAccent(quickList) }]} />
              <Text style={styles.listBtnText}>{listLabel(quickList)}</Text>
              <Feather name="chevron-down" size={14} color={colors.onSurfaceSecondary} />
            </Pressable>
            <Pressable
              testID="quick-add-submit"
              onPress={handleQuickAdd}
              style={[styles.submitBtn, !title.trim() && { opacity: 0.6 }]}
            >
              <Feather name="arrow-right" size={18} color={colors.onBrandPrimary} />
            </Pressable>
          </View>
          {showListPicker ? (
            <View style={styles.listMenu}>
              {(['personal', 'studies', 'job'] as ListKey[]).map((l) => (
                <Pressable
                  key={l}
                  testID={`quick-list-${l}`}
                  onPress={() => {
                    setQuickList(l);
                    setShowListPicker(false);
                  }}
                  style={styles.listMenuItem}
                >
                  <View style={[styles.listDot, { backgroundColor: listAccent(l) }]} />
                  <Text style={styles.listMenuText}>{listLabel(l)}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {pastQuickDate ? (
            <Text style={styles.warn} testID="quick-add-past-warning">
              Time is in the past — task will be saved without a reminder.
            </Text>
          ) : null}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: spacing.xxxl + insets.bottom }}
          keyboardShouldPersistTaps="handled"
        >
          {overdue.length === 0 && todaysList.length === 0 ? (
            <EmptyState text="Nothing due today." testID="today-empty-state" />
          ) : null}

          {overdue.length > 0 ? (
            <>
              <SectionHeader label="Overdue" accent={colors.overdueAccent} />
              {overdue.map((t) => (
                <SwipeableTaskRow
                  key={t.id}
                  task={t}
                  overdue
                  snoozed={!!snoozes[t.id]}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onPress={(id) => router.push(`/task/${id}`)}
                />
              ))}
            </>
          ) : null}

          {todaysList.length > 0 ? (
            <>
              <SectionHeader label="Today" />
              {todaysList.map((t) => (
                <SwipeableTaskRow
                  key={t.id}
                  task={t}
                  snoozed={!!snoozes[t.id]}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onPress={(id) => router.push(`/task/${id}`)}
                />
              ))}
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: colors.onSurface },
  demoTag: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.warning,
  },
  headerIconBtn: { padding: spacing.xs },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFF7E6',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
  },
  bannerText: { flex: 1, fontSize: font.sm, color: colors.onSurface },
  bannerAction: { fontSize: font.sm, color: colors.info, fontWeight: '600' },
  quickAdd: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    gap: spacing.sm,
  },
  quickInput: {
    fontSize: font.lg,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  quickRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  listBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  listDot: { width: 8, height: 8, borderRadius: 4 },
  listBtnText: { fontSize: font.base, color: colors.onSurface },
  submitBtn: {
    backgroundColor: colors.brandPrimary,
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listMenu: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  listMenuItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  listMenuText: { fontSize: font.base, color: colors.onSurface },
  quickRowLabel: { fontSize: font.sm, color: colors.onSurfaceSecondary, fontWeight: '600' },
  warn: { fontSize: font.sm, color: colors.warning },
});
