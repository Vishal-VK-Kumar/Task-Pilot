import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { useTasks } from '@/src/lib/store';
import { colors, font, radius, spacing } from '@/src/lib/theme';
import { ensurePermission, getPermissionStatus, isWeb, scheduleTest60s } from '@/src/lib/notifications';

export default function SettingsScreen() {
  const router = useRouter();
  const { demoMode, setDemoMode, notifPermission, setNotifPermission } = useTasks();
  const [testStatus, setTestStatus] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await getPermissionStatus();
      setNotifPermission(s);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestPermission = async () => {
    if (isWeb) return;
    const s = await ensurePermission();
    setNotifPermission(s);
    if (s === 'denied') {
      Linking.openSettings().catch(() => {});
    }
  };

  const runTest = async () => {
    if (isWeb) {
      setTestStatus('Notifications only work on the phone, not on web.');
      return;
    }
    const s = await ensurePermission();
    setNotifPermission(s);
    if (s !== 'granted') {
      setTestStatus('Permission not granted — enable it in system settings.');
      return;
    }
    const id = await scheduleTest60s();
    if (id) setTestStatus('A test notification will fire in 60 seconds.');
    else setTestStatus('Could not schedule test notification.');
  };

  const toggleDemo = async (v: boolean) => {
    setSaving(true);
    await setDemoMode(v);
    setSaving(false);
  };

  const permText =
    notifPermission === 'granted'
      ? 'Enabled'
      : notifPermission === 'denied'
      ? 'Denied'
      : 'Not requested';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={12} testID="settings-back">
          <Feather name="chevron-left" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerBtn} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        {/* Demo mode */}
        <View style={styles.card}>
          <View style={styles.rowSpread}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Demo mode</Text>
              <Text style={styles.rowSub}>
                Swap real data for a sample dataset. Toggle back to restore your real tasks — untouched.
              </Text>
            </View>
            <Switch
              testID="demo-mode-toggle"
              value={demoMode}
              onValueChange={toggleDemo}
              disabled={saving}
            />
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.card}>
          <Text style={styles.rowTitle}>Notifications</Text>
          <View style={styles.rowSpread}>
            <Text style={styles.rowSub}>Permission status</Text>
            <Text testID="notif-permission-status" style={styles.rowValue}>
              {isWeb ? 'Web (no notifications)' : permText}
            </Text>
          </View>
          {!isWeb && notifPermission !== 'granted' ? (
            <Pressable onPress={requestPermission} style={styles.textBtn} testID="request-permission-btn">
              <Text style={styles.textBtnText}>
                {notifPermission === 'denied' ? 'Open system settings' : 'Enable notifications'}
              </Text>
            </Pressable>
          ) : null}

          <Pressable onPress={runTest} style={styles.primaryBtn} testID="test-notification-btn">
            <Feather name="bell" size={16} color={colors.onBrandPrimary} />
            <Text style={styles.primaryBtnText}>Send test notification (60s)</Text>
          </Pressable>
          {testStatus ? (
            <Text style={styles.status} testID="test-notification-status">
              {testStatus}
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.rowTitle}>About</Text>
          <Text style={styles.rowSub}>TaskPilot · Personal task manager.</Text>
          <Text style={styles.rowSub}>
            Reminders are scheduled locally on your device. They fire with the app closed and the phone locked.
          </Text>
        </View>
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
  card: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.surface,
  },
  rowSpread: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  rowTitle: { fontSize: font.lg, fontWeight: '600', color: colors.onSurface },
  rowSub: { fontSize: font.sm, color: colors.onSurfaceSecondary, marginTop: 2 },
  rowValue: { fontSize: font.base, color: colors.onSurface, fontWeight: '500' },
  textBtn: { paddingVertical: spacing.sm },
  textBtnText: { color: colors.info, fontSize: font.base, fontWeight: '600' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.brandPrimary, paddingVertical: spacing.md,
    borderRadius: radius.md, marginTop: spacing.sm,
  },
  primaryBtnText: { color: colors.onBrandPrimary, fontSize: font.base, fontWeight: '600' },
  status: { fontSize: font.sm, color: colors.onSurfaceSecondary },
});
