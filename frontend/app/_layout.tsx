import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState, LogBox, Platform, StatusBar } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useIconFonts } from '@/src/hooks/use-icon-fonts';
import { TasksProvider, useTasks } from '@/src/lib/store';
import { UndoProvider } from '@/src/components/UndoBar';
import { handleNotificationResponse } from '@/src/lib/notifications';

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

// Foreground notification presentation — module scope, native only.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }) as any,
  });
}

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
  });
}

// Listens for notification action responses (snooze) and keeps the snooze
// indicators in sync. Rendered inside TasksProvider so it can refresh state.
function NotificationListener() {
  const { refreshSnoozes } = useTasks();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const sub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const handled = await handleNotificationResponse(response);
      if (handled) await refreshSnoozes();
    });

    // Cold start: app was launched by tapping a snooze action while killed.
    Notifications.getLastNotificationResponseAsync().then(async (response) => {
      if (!response) return;
      const handled = await handleNotificationResponse(response);
      if (handled) await refreshSnoozes();
    });

    // Refresh indicators whenever the app returns to the foreground (a snooze
    // may have been handled in the background while the app was closed).
    const appStateSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refreshSnoozes();
    });

    return () => {
      sub.remove();
      appStateSub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TasksProvider>
          <UndoProvider>
            <NotificationListener />
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="task/[id]" options={{ presentation: 'card' }} />
              <Stack.Screen name="settings" options={{ presentation: 'card' }} />
              <Stack.Screen name="application/new" options={{ presentation: 'modal' }} />
            </Stack>
          </UndoProvider>
        </TasksProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
