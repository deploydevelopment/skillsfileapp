import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { Colors } from '../constants/styles';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedButton } from './AnimatedButton';

export function CustomDrawerContent(props: any) {
  return (
    <DrawerContentScrollView {...props}>
      <View style={styles.drawerHeader}>
        <Image 
          source={require('../assets/images/avatar.png')}
          style={styles.avatar}
        />
        <Text style={styles.userName}>Sebastian Riley</Text>
        <Text style={styles.userEmail}>@hugosebriley</Text>
      </View>
      
      <View style={styles.drawerContent}>
        <AnimatedButton 
          style={styles.drawerItem}
          onPress={() => {}}
        >
          <Ionicons name="person-outline" size={22} color={Colors.white} style={styles.icon} />
          <Text style={styles.drawerItemText}>Profile</Text>
        </AnimatedButton>
        
        <AnimatedButton 
          style={styles.drawerItem}
          onPress={() => {}}
        >
          <Ionicons name="settings-outline" size={22} color={Colors.white} style={styles.icon} />
          <Text style={styles.drawerItemText}>Settings</Text>
        </AnimatedButton>
        
        <AnimatedButton 
          style={styles.drawerItem}
          onPress={() => {}}
        >
          <Ionicons name="information-circle-outline" size={22} color={Colors.white} style={styles.icon} />
          <Text style={styles.drawerItemText}>About SkillsFile</Text>
        </AnimatedButton>
        
        <AnimatedButton 
          style={styles.drawerItem}
          onPress={() => router.push('/table')}
        >
          <Ionicons name="bug-outline" size={22} color={Colors.white} style={styles.icon} />
          <Text style={styles.drawerItemText}>View Storage</Text>
        </AnimatedButton>
        
        <AnimatedButton 
          style={[styles.drawerItem, styles.logoutItem]}
          onPress={() => {}}
        >
          <Ionicons name="exit-outline" size={22} color={Colors.white} style={styles.icon} />
          <Text style={styles.drawerItemText}>Log Out</Text>
        </AnimatedButton>
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    fontFamily: 'MavenPro-Medium',
    color: Colors.white,
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: 'MavenPro-Regular',
    color: Colors.white,
    opacity: 0.7,
  },
  drawerContent: {
    padding: 15,
  },
  drawerItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  drawerItemText: {
    fontSize: 16,
    fontFamily: 'MavenPro-Regular',
    color: Colors.white,
  },
  logoutItem: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 20,
  }
}); 