import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';
import { Text } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            display: 'none'  // Hide the tab bar completely
          }
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
        <Tabs.Screen
          name="qualifications"
          options={{
            title: 'Quals',
            tabBarIcon: ({ color }) => <Text style={{ color }}>📝</Text>,
            href: null,
          }}
        />
      </Tabs>
    </View>
  );
}
