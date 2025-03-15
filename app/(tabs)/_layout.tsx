import React from 'react';
import { Tabs } from 'expo-router';
import { Image, ImageBackground } from 'react-native';
import { Colors } from '../../constants/styles';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.white,
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.5)',
        tabBarStyle: {
          height: 100,
          paddingBottom: 35,
          paddingTop: 8,
          backgroundColor: 'transparent',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          borderTopWidth: 0,
        },
        tabBarBackground: () => (
          <ImageBackground
            source={require('../../assets/images/bg-gradient.png')}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 100,
            }}
            resizeMode="cover"
          />
        ),
        tabBarLabelStyle: {
          fontFamily: 'MavenPro-Medium',
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('../../assets/images/icons/house.png')}
              style={{ width: 24, height: 24, opacity: focused ? 1 : 0.5 }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('../../assets/images/icons/chat.png')}
              style={{ width: 24, height: 24, opacity: focused ? 1 : 0.5 }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="companies"
        options={{
          title: 'Companies',
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('../../assets/images/icons/companies.png')}
              style={{ width: 24, height: 24, opacity: focused ? 1 : 0.5 }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="share"
        options={{
          title: 'Share',
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('../../assets/images/icons/Share.png')}
              style={{ width: 24, height: 24, opacity: focused ? 1 : 0.5 }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="table"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="qualifications"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
