// Shared UI helpers
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, listAccent, listLabel, radius, spacing, font } from '@/src/lib/theme';
import { Task } from '@/src/lib/types';

export function ListDot({ list, size = 8 }: { list: Task['list']; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: listAccent(list),
      }}
    />
  );
}

export function TaskRow({
  task,
  onToggle,
  onPress,
  overdue,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onPress: (id: string) => void;
  overdue?: boolean;
}) {
  const timeStr = task.dueAt ? formatTime(new Date(task.dueAt)) : '';
  return (
    <Pressable
      testID={`task-row-${task.id}`}
      onPress={() => onPress(task.id)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
    >
      <Pressable
        testID={`task-toggle-${task.id}`}
        onPress={(e) => {
          e.stopPropagation();
          onToggle(task.id);
        }}
        hitSlop={12}
        style={styles.circleWrap}
      >
        <View style={[styles.circle, task.done && styles.circleDone]}>
          {task.done ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
        </View>
      </Pressable>
      <View style={styles.rowBody}>
        <Text
          style={[
            styles.rowTitle,
            task.done && styles.rowTitleDone,
            overdue && !task.done && styles.rowTitleOverdue,
          ]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        <View style={styles.rowMeta}>
          <ListDot list={task.list} />
          <Text style={styles.rowMetaText}>{listLabel(task.list)}</Text>
          {timeStr ? (
            <>
              <Text style={styles.dotSep}>·</Text>
              <Text style={[styles.rowMetaText, overdue && !task.done && { color: colors.overdueAccent }]}>
                {overdue && !task.done ? `Overdue · ${timeStr}` : timeStr}
              </Text>
            </>
          ) : null}
          {task.reminderAt && !task.done ? (
            <>
              <Text style={styles.dotSep}>·</Text>
              <Feather name="bell" size={11} color={colors.onSurfaceSecondary} />
            </>
          ) : null}
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={colors.onSurfaceTertiary} />
    </Pressable>
  );
}

export function SectionHeader({ label, accent }: { label: string; accent?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionHeaderText, accent ? { color: accent } : null]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ text, testID }: { text: string; testID?: string }) {
  return (
    <View style={styles.empty} testID={testID}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

export function formatTime(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${h}:${mm} ${ap}`;
}

export function formatDayHeader(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (24 * 3600 * 1000));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  const opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
  return target.toLocaleDateString(undefined, opts);
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  circleWrap: { paddingRight: 2 },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: {
    backgroundColor: colors.onSurface,
    borderColor: colors.onSurface,
  },
  rowBody: { flex: 1, gap: 4 },
  rowTitle: { fontSize: font.lg, color: colors.onSurface },
  rowTitleDone: { color: colors.onSurfaceTertiary, textDecorationLine: 'line-through' },
  rowTitleOverdue: { color: colors.onSurface },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowMetaText: { fontSize: font.sm, color: colors.onSurfaceSecondary },
  dotSep: { fontSize: font.sm, color: colors.onSurfaceTertiary, marginHorizontal: 2 },
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
  empty: {
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: font.base,
    color: colors.onSurfaceTertiary,
  },
});

export { styles as sharedStyles };
