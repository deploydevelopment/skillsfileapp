import { Tabs } from 'expo-router';
import React, { createContext, useContext, useState } from 'react';
import { Platform, View } from 'react-native';
import { Text } from 'react-native';
import * as Progress from 'react-native-progress';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

// Create context for progress bar visibility
export const ProgressBarContext = createContext<{
  showProgressBar: boolean;
  setShowProgressBar: (show: boolean) => void;
}>({
  showProgressBar: true,
  setShowProgressBar: () => {},
});

export const useProgressBar = () => useContext(ProgressBarContext);

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [showProgressBar, setShowProgressBar] = useState(true);

  return (
    <ProgressBarContext.Provider value={{ showProgressBar, setShowProgressBar }}>
      <View style={{ flex: 1 }}>
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
          <Tabs.Screen
            name="qualifications"
            options={{
              title: 'Quals',
              tabBarIcon: ({ color }) => <Text style={{ color }}>📝</Text>,
              href: null,
              tabBarStyle: { display: 'none' }, // Hide the tab bar completely
            }}
          />
        </Tabs>
        {showProgressBar && (
          <View style={{
            padding: 20,
            width: '100%',
            backgroundColor: 'white',
            borderTopWidth: 1,
            borderTopColor: '#E5E5EA',
          }}>
            <Text style={{
              fontSize: 14,
              color: '#333',
              fontFamily: 'MavenPro-Regular',
              marginBottom: 8,
            }}>Nothing to upload</Text>
            <Progress.Bar 
              progress={0} 
              width={null} 
              height={8}
              color="#4A90E2"
              unfilledColor="#E5E5E5"
              borderWidth={0}
              borderRadius={4}
              style={{ width: '100%' }}
            />
          </View>
        )}
      </View>
    </ProgressBarContext.Provider>
  );
}
