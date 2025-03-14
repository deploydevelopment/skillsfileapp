import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Text } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0A1929',
          borderTopWidth: 0,
        },
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#666666',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ color }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="table"
        options={{
          title: 'Table',
          tabBarIcon: ({ color }) => <Text style={{ color }}>📊</Text>,
        }}
      />
    </Tabs>
  );
}
