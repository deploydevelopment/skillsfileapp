import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { Colors } from '../constants/styles';
import { router } from 'expo-router';

export function CustomDrawerContent(props: any) {
  return (
    <DrawerContentScrollView {...props}>
      <View style={styles.drawerHeader}>
        <Image 
          source={require('../assets/images/avatar.png')}
          style={styles.avatar}
        />
        <Text style={styles.userName}>Matt Riley</Text>
        <Text style={styles.userEmail}>mriley@example.com</Text>
      </View>
      
      <View style={styles.drawerContent}>
        <TouchableOpacity 
          style={styles.drawerItem}
          onPress={() => router.push('/')}
        >
          <Text style={styles.drawerItemText}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.drawerItem}
          onPress={() => router.push('/qualifications')}
        >
          <Text style={styles.drawerItemText}>Qualifications</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.drawerItem}
          onPress={() => router.push('/messages')}
        >
          <Text style={styles.drawerItemText}>Messages</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.drawerItem}
          onPress={() => router.push('/companies')}
        >
          <Text style={styles.drawerItemText}>Companies</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.drawerItem}
          onPress={() => router.push('/share')}
        >
          <Text style={styles.drawerItemText}>Share</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
    color: Colors.blueDark,
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: 'MavenPro-Regular',
    color: Colors.blueDark,
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
  },
  drawerItemText: {
    fontSize: 16,
    fontFamily: 'MavenPro-Regular',
    color: Colors.blueDark,
  },
}); 