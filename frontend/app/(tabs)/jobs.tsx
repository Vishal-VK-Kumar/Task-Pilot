import React, { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { useTasks } from '@/src/lib/store';
import { colors, font, radius, spacing } from '@/src/lib/theme';
import { STAGE_LABEL, STAGES, Stage, Task } from '@/src/lib/types';
import { EmptyState } from '@/src/components/TaskUi';
import { formatDisplay } from '@/src/components/DateTimeField';

export default function JobsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tasks, demoMode } = useTasks();

  const grouped = useMemo(() => {
    const g: Record<Stage, Task[]> = {
      to_apply: [],
      applied: [],
      interviewing: [],
      offer: [],
      rejected: [],
    };
    for (const t of tasks) {
      if (t.list !== 'job') continue;
      if (!t.stage) continue;
      if (!t.company && !t.role) continue; // only "applications", not plain job tasks
      g[t.stage].push(t);
    }
    for (const s of STAGES) {
      g[s].sort((a, b) => {
        const at = a.nextActionAt ? new Date(a.nextActionAt).getTime() : Infinity;
        const bt = b.nextActionAt ? new Date(b.nextActionAt).getTime() : Infinity;
        return at - bt;
      });
    }
    return g;
  }, [tasks]);

  const total = STAGES.reduce((n, s) => n + grouped[s].length, 0);

  const openLink = (url?: string | null) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Job board</Text>
          {demoMode ? <Text style={styles.demoTag}>SAMPLE DATA</Text> : null}
        </View>
        <Pressable
          testID="add-application-btn"
          onPress={() => router.push('/application/new')}
          style={styles.addBtn}
        >
          <Feather name="plus" size={16} color={colors.onBrandPrimary} />
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl + insets.bottom }}>
        {total === 0 ? <EmptyState text="No active job applications." testID="jobs-empty-state" /> : null}
        {STAGES.map((s) => (
          <View key={s} testID={`jobs-stage-${s}`}>
            <View style={styles.stageHeader}>
              <Text style={styles.stageHeaderText}>{STAGE_LABEL[s]}</Text>
              <Text style={styles.stageCount}>{grouped[s].length}</Text>
            </View>
            {grouped[s].length === 0 ? (
              <Text style={styles.stageEmpty}>—</Text>
            ) : (
              grouped[s].map((t) => (
                <Pressable
                  key={t.id}
                  testID={`application-card-${t.id}`}
                  onPress={() => router.push(`/task/${t.id}`)}
                  style={({ pressed }) => [styles.card, pressed && { opacity: 0.6 }]}
                >
                  <View style={styles.leftAccent} />
                  <View style={styles.cardBody}>
                    <Text style={styles.company} numberOfLines={1}>
                      {t.company || 'Untitled company'}
                    </Text>
                    <Text style={styles.role} numberOfLines={1}>
                      {t.role || '—'}
                    </Text>
                    {t.nextActionAt ? (
                      <Text style={styles.nextAction}>Next: {formatDisplay(new Date(t.nextActionAt))}</Text>
                    ) : (
                      <Text style={styles.nextActionMuted}>No next action</Text>
                    )}
                  </View>
                  {t.link ? (
                    <Pressable
                      testID={`application-link-${t.id}`}
                      onPress={(e) => {
                        e.stopPropagation();
                        openLink(t.link);
                      }}
                      hitSlop={12}
                      style={styles.linkBtn}
                    >
                      <Feather name="external-link" size={16} color={colors.info} />
                    </Pressable>
                  ) : null}
                </Pressable>
              ))
            )}
          </View>
        ))}
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: colors.onSurface },
  demoTag: { marginTop: 2, fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: colors.warning },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  addBtnText: { color: colors.onBrandPrimary, fontSize: font.base, fontWeight: '600' },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  stageHeaderText: {
    fontSize: font.sm,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: colors.onSurfaceSecondary,
    textTransform: 'uppercase',
  },
  stageCount: { fontSize: font.sm, color: colors.onSurfaceTertiary },
  stageEmpty: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, color: colors.onSurfaceTertiary },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  leftAccent: { width: 3, alignSelf: 'stretch', backgroundColor: colors.jobAccent },
  cardBody: { flex: 1, padding: spacing.md, gap: 2 },
  company: { fontSize: font.lg, fontWeight: '600', color: colors.onSurface },
  role: { fontSize: font.base, color: colors.onSurfaceSecondary },
  nextAction: { fontSize: font.sm, color: colors.onSurfaceSecondary, marginTop: 2 },
  nextActionMuted: { fontSize: font.sm, color: colors.onSurfaceTertiary, marginTop: 2 },
  linkBtn: { padding: spacing.md },
});
