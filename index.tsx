import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import * as SQLite from 'expo-sqlite';

interface TimestampRow {
  timestamp: string;
}

const db = SQLite.openDatabaseSync('timestamps.db');

export default function App() {
  const [timestamps, setTimestamps] = useState<string[]>([]);

  useEffect(() => {
    // Create table if it doesn't exist
    db.execSync(`
      CREATE TABLE IF NOT EXISTS timestamps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT
      )
    `);

    // Load existing timestamps
    loadTimestamps();
  }, []);

  const loadTimestamps = () => {
    try {
      const result = db.getAllSync<TimestampRow>(
        'SELECT timestamp FROM timestamps ORDER BY id DESC'
      );
      setTimestamps(result.map((row: TimestampRow) => row.timestamp));
    } catch (error) {
      console.error('Error loading timestamps:', error);
      Alert.alert('Error', 'Failed to load timestamps');
    }
  };

  const addTimestamp = () => {
    const currentTime = new Date().toISOString();
    
    try {
      db.execSync(
        `INSERT INTO timestamps (timestamp) VALUES ('${currentTime}')`
      );
      loadTimestamps(); // Refresh the list
    } catch (error) {
      console.error('Error adding timestamp:', error);
      Alert.alert('Error', 'Failed to add timestamp');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.button} onPress={addTimestamp}>
          <Text style={styles.buttonText}>Record Timestamp</Text>
        </TouchableOpacity>

        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>Recorded Timestamps:</Text>
          {timestamps.map((timestamp, index) => (
            <Text key={index} style={styles.timestamp}>
              {new Date(timestamp).toLocaleString()}
            </Text>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'MavenPro-Bold',
  },
  listContainer: {
    flex: 1,
  },
  listTitle: {
    fontSize: 18,
    fontFamily: 'MavenPro-Bold',
    marginBottom: 10,
  },
  timestamp: {
    fontSize: 16,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 5,
    marginBottom: 5,
    fontFamily: 'MavenPro-Regular',
  },
}); 