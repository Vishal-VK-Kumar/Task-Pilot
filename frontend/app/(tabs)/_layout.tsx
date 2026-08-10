import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/src/lib/theme';

export default function TabsLayout() {
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
          height: 62,
          paddingTop: 6,
          paddingBottom: 8,
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
