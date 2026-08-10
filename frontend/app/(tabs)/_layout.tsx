import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/src/lib/theme';

const BASE_TAB_HEIGHT = 56;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // Add the system navigation-bar inset as EXTRA bottom padding and grow the
  // container height by the same amount, so the icons keep their size and the
  // bar never sits under the Android navigation bar (works for both gesture
  // and three-button navigation, which report different insets).
  const bottomInset = insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.onSurface,
        tabBarInactiveTintColor: colors.onSurfaceTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: BASE_TAB_HEIGHT + bottomInset,
          paddingTop: 6,
          paddingBottom: bottomInset + 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => <Feather name="sun" color={color} size={size ?? 20} />,
          tabBarButtonTestID: 'tab-today',
        }}
      />
      <Tabs.Screen
        name="upcoming"
        options={{
          title: 'Upcoming',
          tabBarIcon: ({ color, size }) => <Feather name="calendar" color={color} size={size ?? 20} />,
          tabBarButtonTestID: 'tab-upcoming',
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Job board',
          tabBarIcon: ({ color, size }) => <Feather name="briefcase" color={color} size={size ?? 20} />,
          tabBarButtonTestID: 'tab-jobs',
        }}
      />
    </Tabs>
  );
}
