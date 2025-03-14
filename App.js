import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { 
  useFonts,
  MavenPro_400Regular,
  MavenPro_500Medium,
  MavenPro_700Bold,
} from '@expo-google-fonts/maven-pro';
import * as SplashScreen from 'expo-splash-screen';
import { Colors } from './constants/styles';

const db = SQLite.openDatabase('skillsfile.db');

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [timestamps, setTimestamps] = useState([]);

  const [fontsLoaded, fontError] = useFonts({
    'MavenPro-Regular': MavenPro_400Regular,
    'MavenPro-Medium': MavenPro_500Medium,
    'MavenPro-Bold': MavenPro_700Bold,
  });

  useEffect(() => {
    const prepare = async () => {
      try {
        // Initialize database
        db.transaction(tx => {
          tx.executeSql(
            'CREATE TABLE IF NOT EXISTS timestamps (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT)'
          );
        });
        
        // Load initial timestamps
        loadTimestamps();
      } catch (e) {
        console.warn(e);
      }
    };

    prepare();
  }, []);

  useEffect(() => {
    const onLayoutRootView = async () => {
      if (fontsLoaded || fontError) {
        await SplashScreen.hideAsync();
      }
    };

    onLayoutRootView();
  }, [fontsLoaded, fontError]);

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

  if (!fontsLoaded) {
    return null;
  }

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
    backgroundColor: Colors.silver,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  button: {
    backgroundColor: Colors.blueDark,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: 'MavenPro-Bold',
  },
  listContainer: {
    flex: 1,
  },
  listTitle: {
    fontSize: 18,
    fontFamily: 'MavenPro-Bold',
    color: Colors.blueDark,
    marginBottom: 10,
  },
  timestamp: {
    fontSize: 16,
    fontFamily: 'MavenPro-Regular',
    padding: 10,
    backgroundColor: Colors.white,
    borderRadius: 5,
    marginBottom: 5,
    color: Colors.charcoal,
  },
}); 