import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useTasks } from '@/src/lib/store';
import { colors, font, spacing } from '@/src/lib/theme';
import { EmptyState, SectionHeader, SwipeableTaskRow, formatDayHeader } from '@/src/components/TaskUi';
import { Task } from '@/src/lib/types';
import { useUndo } from '@/src/components/UndoBar';

export default function UpcomingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showUndo } = useUndo();
  const { tasks, toggleDone, deleteTask, restoreTask, snoozes, demoMode } = useTasks();

  const handleToggle = async (id: string) => {
    await toggleDone(id);
    showUndo('Task marked done', () => toggleDone(id));
  };
  const handleDelete = async (id: string) => {
    const snapshot = tasks.find((t) => t.id === id);
    await deleteTask(id);
    if (snapshot) showUndo('Task deleted', () => restoreTask(snapshot));
  };

  const groups = useMemo(() => {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const byDay: Record<string, { date: Date; items: Task[] }> = {};
    const someday: Task[] = [];
    for (const t of tasks) {
      if (t.done) continue;
      if (!t.dueAt) {
        someday.push(t);
        continue;
      }
      const d = new Date(t.dueAt);
      if (isNaN(d.getTime())) continue;
      if (d <= endOfToday) continue; // Today/overdue live on Today screen
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!byDay[key]) byDay[key] = { date: new Date(d.getFullYear(), d.getMonth(), d.getDate()), items: [] };
      byDay[key].items.push(t);
    }
    const orderedKeys = Object.keys(byDay).sort((a, b) => byDay[a].date.getTime() - byDay[b].date.getTime());
    for (const k of orderedKeys) {
      byDay[k].items.sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime());
    }
    return { days: orderedKeys.map((k) => byDay[k]), someday };
  }, [tasks]);

  const empty = groups.days.length === 0 && groups.someday.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Upcoming</Text>
        {demoMode ? <Text style={styles.demoTag}>SAMPLE DATA</Text> : null}
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl + insets.bottom }}>
        {empty ? <EmptyState text="No upcoming tasks." testID="upcoming-empty-state" /> : null}
        {groups.days.map((g) => (
          <View key={g.date.toISOString()}>
            <SectionHeader label={formatDayHeader(g.date)} />
            {g.items.map((t) => (
              <SwipeableTaskRow
                key={t.id}
                task={t}
                snoozed={!!snoozes[t.id]}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onPress={(id) => router.push(`/task/${id}`)}
              />
            ))}
          </View>
        ))}
        {groups.someday.length > 0 ? (
          <>
            <SectionHeader label="Someday" />
            {groups.someday.map((t) => (
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: colors.onSurface },
  demoTag: { marginTop: 2, fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: colors.warning },
});
