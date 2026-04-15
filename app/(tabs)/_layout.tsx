import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { C } from '@/constants/theme';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={[s.icon, focused && s.iconFocused]}>{emoji}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: s.tabBar,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.textMuted,
        tabBarLabelStyle: s.label,
      }}
    >
      <Tabs.Screen name="index"     options={{ title: 'Home',    tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }} />
      <Tabs.Screen name="add-wash"  options={{ title: 'Add Wash', tabBarIcon: ({ focused }) => <TabIcon emoji="➕" focused={focused} /> }} />
      <Tabs.Screen name="pending"   options={{ href: null }} />
      <Tabs.Screen name="records"   options={{ title: 'Records', tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} /> }} />
      <Tabs.Screen name="profile"   options={{ title: 'Profile', tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} /> }} />
    </Tabs>
  );
}

const s = StyleSheet.create({
  tabBar: {
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
    height: 68,
    paddingBottom: 10,
    paddingTop: 8,
  },
  label: { fontSize: 11, fontWeight: '700' },
  icon: { fontSize: 22, opacity: 0.45 },
  iconFocused: { opacity: 1 },
});
