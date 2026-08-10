import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { useTasks } from '@/src/lib/store';
import { colors, font, radius, spacing } from '@/src/lib/theme';
import { STAGE_LABEL, STAGES, Stage } from '@/src/lib/types';
import { DateTimeField } from '@/src/components/DateTimeField';

export default function NewApplication() {
  const router = useRouter();
  const { addTask } = useTasks();

  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [link, setLink] = useState('');
  const [stage, setStage] = useState<Stage>('to_apply');
  const [nextActionAt, setNextActionAt] = useState<Date | null>(null);

  const save = async () => {
    if (!company.trim() && !role.trim()) return;
    const title = [company.trim(), role.trim()].filter(Boolean).join(' — ');
    await addTask({
      title,
      list: 'job',
      company: company.trim() || null,
      role: role.trim() || null,
      link: link.trim() || null,
      stage,
      nextActionAt: nextActionAt ? nextActionAt.toISOString() : null,
      dueAt: nextActionAt ? nextActionAt.toISOString() : null,
      reminderAt: nextActionAt && nextActionAt.getTime() > Date.now() ? nextActionAt.toISOString() : null,
    });
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn} testID="new-app-back" hitSlop={12}>
          <Feather name="x" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>New application</Text>
        <Pressable
          onPress={save}
          disabled={!company.trim() && !role.trim()}
          style={[styles.headerBtn, (!company.trim() && !role.trim()) && { opacity: 0.4 }]}
          testID="new-app-save"
        >
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
          <Text style={styles.sectionLabel}>Company</Text>
          <TextInput
            testID="new-app-company"
            value={company}
            onChangeText={setCompany}
            placeholder="e.g. Flipkart"
            style={styles.input}
          />
          <Text style={styles.sectionLabel}>Role</Text>
          <TextInput
            testID="new-app-role"
            value={role}
            onChangeText={setRole}
            placeholder="e.g. Business Analyst"
            style={styles.input}
          />
          <Text style={styles.sectionLabel}>Link</Text>
          <TextInput
            testID="new-app-link"
            value={link}
            onChangeText={setLink}
            placeholder="https://…"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="url"
          />
          <Text style={styles.sectionLabel}>Stage</Text>
          <View style={styles.chipRow}>
            {STAGES.map((s) => (
              <Pressable
                key={s}
                testID={`new-app-stage-${s}`}
                onPress={() => setStage(s)}
                style={[styles.chip, stage === s && styles.chipActive]}
              >
                <Text style={[styles.chipText, stage === s && styles.chipTextActive]}>{STAGE_LABEL[s]}</Text>
              </Pressable>
            ))}
          </View>
          <DateTimeField
            testID="new-app-next-action"
            label="Next action date"
            value={nextActionAt}
            onChange={setNextActionAt}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
  saveText: { color: colors.info, fontSize: font.base, fontWeight: '600' },
  sectionLabel: { fontSize: font.sm, color: colors.onSurfaceSecondary, fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.md, fontSize: font.base, color: colors.onSurface,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.pill,
  },
  chipActive: { backgroundColor: colors.onSurface, borderColor: colors.onSurface },
  chipText: { color: colors.onSurface, fontSize: font.base },
  chipTextActive: { color: colors.onBrandPrimary },
});
