import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { Colors } from '../constants/styles';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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
        <TouchableOpacity 
          style={styles.drawerItem}
          onPress={() => {}}
          activeOpacity={1}
        >
          <Ionicons name="id-card-outline" size={22} color={Colors.white} style={styles.icon} />
          <Text style={styles.drawerItemText}>My Profile</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.drawerItem}
          onPress={() => {}}
          activeOpacity={1}
        >
          <Ionicons name="people-circle-outline" size={22} color={Colors.white} style={styles.icon} />
          <Text style={styles.drawerItemText}>Invite a Friend</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.drawerItem}
          onPress={() => {}}
          activeOpacity={1}
        >
          <Ionicons name="rocket-outline" size={22} color={Colors.white} style={styles.icon} />
          <Text style={styles.drawerItemText}>Find Training</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.drawerItem}
          onPress={() => {}}
          activeOpacity={1}
        >
          <Ionicons name="information-circle-outline" size={22} color={Colors.white} style={styles.icon} />
          <Text style={styles.drawerItemText}>About SkillsFile</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.drawerItem}
          onPress={() => router.push('/table')}
          activeOpacity={1}
        >
          <Ionicons name="bug-outline" size={22} color={Colors.white} style={styles.icon} />
          <Text style={styles.drawerItemText}>View Storage</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.drawerItem, styles.logoutItem]}
          onPress={() => {}}
          activeOpacity={1}
        >
          <Ionicons name="exit-outline" size={22} color={Colors.white} style={styles.icon} />
          <Text style={styles.drawerItemText}>Log Out</Text>
        </TouchableOpacity>
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