// Shared UI helpers
import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
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
  snoozed,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onPress: (id: string) => void;
  overdue?: boolean;
  snoozed?: boolean;
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
          {task.reminderAt && !task.done && !snoozed ? (
            <>
              <Text style={styles.dotSep}>·</Text>
              <Feather name="bell" size={11} color={colors.onSurfaceSecondary} />
            </>
          ) : null}
          {snoozed && !task.done ? (
            <View style={styles.snoozeBadge} testID={`task-snoozed-${task.id}`}>
              <Feather name="clock" size={10} color={colors.info} />
              <Text style={styles.snoozeText}>Snoozed</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={colors.onSurfaceTertiary} />
    </Pressable>
  );
}

// Swipe right -> complete (same code path as tapping the circle).
// Swipe left -> delete. Parent supplies onComplete / onDelete.
export function SwipeableTaskRow({
  task,
  onToggle,
  onPress,
  onDelete,
  overdue,
  snoozed,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onPress: (id: string) => void;
  onDelete: (id: string) => void;
  overdue?: boolean;
  snoozed?: boolean;
}) {
  const ref = useRef<any>(null);

  const renderLeft = () => (
    <View style={[styles.swipeAction, styles.swipeComplete]} testID={`swipe-complete-${task.id}`}>
      <Feather name="check" size={20} color="#FFFFFF" />
      <Text style={styles.swipeText}>Done</Text>
    </View>
  );
  const renderRight = () => (
    <View style={[styles.swipeAction, styles.swipeDelete]} testID={`swipe-delete-${task.id}`}>
      <Feather name="trash-2" size={20} color="#FFFFFF" />
      <Text style={styles.swipeText}>Delete</Text>
    </View>
  );

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      leftThreshold={40}
      rightThreshold={40}
      renderLeftActions={task.done ? undefined : renderLeft}
      renderRightActions={renderRight}
      onSwipeableOpen={(direction: 'left' | 'right') => {
        // 'left' = user swiped right (left actions revealed) -> complete.
        // 'right' = user swiped left (right actions revealed) -> delete.
        ref.current?.close?.();
        if (direction === 'left') {
          if (!task.done) onToggle(task.id);
        } else {
          onDelete(task.id);
        }
      }}
    >
      <TaskRow task={task} onToggle={onToggle} onPress={onPress} overdue={overdue} snoozed={snoozed} />
    </ReanimatedSwipeable>
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
  snoozeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EAF3FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginLeft: 2,
  },
  snoozeText: { fontSize: 10, color: colors.info, fontWeight: '600' },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    gap: 2,
  },
  swipeComplete: { backgroundColor: colors.success },
  swipeDelete: { backgroundColor: colors.error },
  swipeText: { color: '#FFFFFF', fontSize: font.sm, fontWeight: '600' },
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
