import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { useTasks } from '@/src/lib/store';
import { colors, font, radius, spacing, listAccent, listLabel } from '@/src/lib/theme';
import { Task } from '@/src/lib/types';
import { formatDisplay } from '@/src/components/DateTimeField';
import { EmptyState } from '@/src/components/TaskUi';

type Bucket = 'today' | 'yesterday' | 'week' | 'earlier';
const BUCKET_LABEL: Record<Bucket, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'This week',
  earlier: 'Earlier',
};
const BUCKET_ORDER: Bucket[] = ['today', 'yesterday', 'week', 'earlier'];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function bucketFor(completedAt: Date, now: Date): Bucket {
  const today0 = startOfDay(now).getTime();
  const c0 = startOfDay(completedAt).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  if (c0 === today0) return 'today';
  if (c0 === today0 - dayMs) return 'yesterday';
  if (c0 > today0 - 7 * dayMs) return 'week';
  return 'earlier';
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tasks, toggleDone } = useTasks();

  const { groups, total, onTimePct, measuredCount } = useMemo(() => {
    const now = new Date();
    const completed = tasks
      .filter((t) => t.done && t.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

    const g: Record<Bucket, Task[]> = { today: [], yesterday: [], week: [], earlier: [] };
    let onTime = 0;
    let measured = 0;
    for (const t of completed) {
      const c = new Date(t.completedAt!);
      g[bucketFor(c, now)].push(t);
      if (t.dueAt) {
        measured += 1;
        if (new Date(t.completedAt!).getTime() <= new Date(t.dueAt).getTime()) onTime += 1;
      }
    }
    const pct = measured > 0 ? Math.round((onTime / measured) * 100) : null;
    return { groups: g, total: completed.length, onTimePct: pct, measuredCount: measured };
  }, [tasks]);

  const handleUndo = async (id: string) => {
    // Returns the task to the active list, clears completedAt, and reschedules
    // its reminder if still in the future (handled inside the store).
    await toggleDone(id);
  };

  const empty = total === 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={12} testID="history-back">
          <Feather name="chevron-left" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>History</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.summary} testID="history-summary">
        <Text style={styles.summaryText}>
          {total} completed
          {onTimePct !== null ? ` · ${onTimePct}% on time` : ' · no deadlines to measure'}
        </Text>
        {onTimePct !== null ? (
          <Text style={styles.summarySub}>{measuredCount} with a deadline</Text>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl + insets.bottom }}>
        {empty ? <EmptyState text="No completed tasks yet." testID="history-empty-state" /> : null}
        {BUCKET_ORDER.map((b) =>
          groups[b].length > 0 ? (
            <View key={b} testID={`history-section-${b}`}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{BUCKET_LABEL[b]}</Text>
              </View>
              {groups[b].map((t) => {
                const due = t.dueAt ? new Date(t.dueAt) : null;
                const onTime =
                  due && t.completedAt
                    ? new Date(t.completedAt).getTime() <= due.getTime()
                    : null;
                return (
                  <Pressable
                    key={t.id}
                    testID={`history-row-${t.id}`}
                    onPress={() => router.push(`/task/${t.id}`)}
                    style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
                  >
                    <View style={[styles.dot, { backgroundColor: listAccent(t.list) }]} />
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle} numberOfLines={2}>
                        {t.title}
                      </Text>
                      <View style={styles.rowMeta}>
                        <Text style={styles.metaText}>{listLabel(t.list)}</Text>
                        {due ? (
                          <>
                            <Text style={styles.sep}>·</Text>
                            <Text style={styles.metaText}>Due {formatDisplay(due)}</Text>
                          </>
                        ) : null}
                      </View>
                    </View>
                    {onTime !== null ? (
                      <View
                        style={[styles.badge, onTime ? styles.badgeOnTime : styles.badgeLate]}
                        testID={`history-status-${t.id}`}
                      >
                        <Text style={[styles.badgeText, onTime ? styles.badgeTextOnTime : styles.badgeTextLate]}>
                          {onTime ? 'On time' : 'Late'}
                        </Text>
                      </View>
                    ) : null}
                    <Pressable
                      testID={`history-undo-${t.id}`}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleUndo(t.id);
                      }}
                      hitSlop={10}
                      style={styles.undoBtn}
                    >
                      <Feather name="rotate-ccw" size={16} color={colors.info} />
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          ) : null
        )}
      </ScrollView>
    </SafeAreaView>
  );
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
  summary: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  summaryText: { fontSize: font.lg, fontWeight: '600', color: colors.onSurface },
  summarySub: { fontSize: font.sm, color: colors.onSurfaceSecondary, marginTop: 2 },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  sectionHeaderText: {
    fontSize: font.sm,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: colors.onSurfaceSecondary,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowBody: { flex: 1, gap: 4 },
  rowTitle: { fontSize: font.lg, color: colors.onSurface },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: font.sm, color: colors.onSurfaceSecondary },
  sep: { fontSize: font.sm, color: colors.onSurfaceTertiary },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  badgeOnTime: { backgroundColor: '#E8F8EE' },
  badgeLate: { backgroundColor: '#FDECEA' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  badgeTextOnTime: { color: colors.success },
  badgeTextLate: { color: colors.error },
  undoBtn: { padding: spacing.xs },
});
