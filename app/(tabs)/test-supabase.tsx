import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity } from 'react-native';
import { testSupabaseConnection, syncToSupabase } from '../../services/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/styles';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('skillsfile.db');

interface CountResult {
  count: number;
}

export default function TestSupabaseScreen() {
  const router = useRouter();
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [dbStatus, setDbStatus] = useState<string>('');

  const checkDatabase = () => {
    try {
      const totalRecords = (db.getAllSync<CountResult>('SELECT COUNT(*) as count FROM qualifications')[0]).count;
      const unsyncedRecords = (db.getAllSync<CountResult>('SELECT COUNT(*) as count FROM qualifications WHERE synced = 0')[0]).count;
      const syncedRecords = (db.getAllSync<CountResult>('SELECT COUNT(*) as count FROM qualifications WHERE synced = 1')[0]).count;
      
      setDbStatus(`Total records: ${totalRecords}\nUnsynced: ${unsyncedRecords}\nSynced: ${syncedRecords}`);
    } catch (error) {
      setDbStatus(`Error checking database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testConnection = async () => {
    try {
      setConnectionStatus('Testing connection...');
      const isConnected = await testSupabaseConnection();
      setConnectionStatus(isConnected ? '✅ Connected to Supabase' : '❌ Failed to connect to Supabase');
    } catch (error) {
      setConnectionStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testSync = async () => {
    try {
      setSyncStatus('Starting sync...');
      const result = await syncToSupabase();
      setSyncStatus(
        result.success
          ? `✅ Sync successful. Synced ${result.syncedCount} records.`
          : `❌ Sync failed: ${result.error}`
      );
      checkDatabase(); // Refresh database status after sync
    } catch (error) {
      setSyncStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.blueDark} />
          </TouchableOpacity>
          <Text style={styles.title}>Supabase Connection Test</Text>
        </View>
        
        <View style={styles.section}>
          <Button title="Check Database" onPress={checkDatabase} />
          <Text style={styles.status}>{dbStatus}</Text>
        </View>

        <View style={styles.section}>
          <Button title="Test Connection" onPress={testConnection} />
          <Text style={styles.status}>{connectionStatus}</Text>
        </View>

        <View style={styles.section}>
          <Button title="Test Sync" onPress={testSync} />
          <Text style={styles.status}>{syncStatus}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6F3FF',
    paddingTop: 120,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.blueDark,
    fontFamily: 'MavenPro-Bold',
  },
  section: {
    marginBottom: 20,
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  status: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'MavenPro-Regular',
    color: Colors.blueDark,
  },
}); 