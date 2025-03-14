import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabase('skillsfile.db');

export default function App() {
  const [timestamps, setTimestamps] = useState([]);

  useEffect(() => {
    db.transaction(tx => {
      // Create table if it doesn't exist
      tx.executeSql(
        'CREATE TABLE IF NOT EXISTS timestamps (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT)'
      );
    });

    // Load existing timestamps
    loadTimestamps();
  }, []);

  const loadTimestamps = () => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT timestamp FROM timestamps ORDER BY id DESC',
        [],
        (_, { rows: { _array } }) => {
          setTimestamps(_array.map(row => row.timestamp));
        },
        (_, error) => {
          console.error('Error loading timestamps:', error);
          Alert.alert('Error', 'Failed to load timestamps');
        }
      );
    });
  };

  const addTimestamp = () => {
    const currentTime = new Date().toISOString();
    
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO timestamps (timestamp) VALUES (?)',
        [currentTime],
        (_, result) => {
          loadTimestamps(); // Refresh the list
        },
        (_, error) => {
          console.error('Error adding timestamp:', error);
          Alert.alert('Error', 'Failed to add timestamp');
        }
      );
    });
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
    fontWeight: 'bold',
  },
  listContainer: {
    flex: 1,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  timestamp: {
    fontSize: 16,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 5,
    marginBottom: 5,
  },
}); 