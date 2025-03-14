import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SQLite from 'expo-sqlite';
import requiredQualifications from '../../api/required_qualifications.json';

interface Qualification {
  uid: string;
  name: string;
  intro: string;
  requested_by: string;
  expires_months: number;
  created: string;
  creator: string;
  updated: string;
  updator: string;
}

const db = SQLite.openDatabaseSync('timestamps.db');

const formatToSQLDateTime = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
};

const generateUID = () => {
  return Array.from({ length: 36 }, () => {
    const random = Math.random() * 16 | 0;
    return random.toString(16);
  }).join('');
};

// Initialize database schema
const initializeDatabase = () => {
  try {
    console.log('Starting database initialization...');
    
    // Check if tables exist
    const tables = db.getAllSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('skillsfile', 'users', 'quals_req')"
    );
    
    if (tables.length === 0) {
      console.log('Creating tables for the first time...');
      db.execSync(`
        -- Create tables with correct schema
        CREATE TABLE skillsfile (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uid TEXT NOT NULL,
          name TEXT NOT NULL,
          expires_months INTEGER NOT NULL DEFAULT 0,
          created TEXT NOT NULL,
          creator TEXT NOT NULL,
          updated TEXT,
          updator TEXT
        );

        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uid TEXT NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          username TEXT NOT NULL,
          created TEXT NOT NULL,
          creator TEXT NOT NULL,
          updated TEXT,
          updator TEXT
        );

        CREATE TABLE quals_req (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uid TEXT NOT NULL,
          name TEXT NOT NULL,
          intro TEXT NOT NULL,
          requested_by TEXT NOT NULL,
          expires_months INTEGER NOT NULL,
          created TEXT NOT NULL,
          creator TEXT NOT NULL,
          updated TEXT,
          updator TEXT
        );

        -- Insert default user
        INSERT INTO users (
          uid, created, creator, updated, updator,
          first_name, last_name, username
        ) VALUES (
          '${generateUID()}', 
          '${formatToSQLDateTime(new Date())}',
          'system',
          '',
          '',
          'Matt',
          'Riley',
          'mriley'
        );

        -- Insert required qualifications from JSON
        ${requiredQualifications.qualifications.map(q => `
          INSERT INTO quals_req (
            uid, name, intro, requested_by, expires_months,
            created, creator, updated, updator
          ) VALUES (
            '${q.uid}',
            '${q.name}',
            '${q.intro}',
            '${q.requested_by}',
            ${q.expires_months},
            '${q.created}',
            '${q.creator}',
            '${q.updated}',
            '${q.updator}'
          );
        `).join('\n')}
      `);
      console.log('Tables created and initial data inserted successfully');
    } else {
      console.log('Tables already exist, skipping initialization');
    }

    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error during database initialization:', error);
    throw error;
  }
};

export default function QualificationsScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);

  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('Initializing database...');
        initializeDatabase();
        // Load records after initialization
        await loadRecords();
      } catch (error) {
        console.error('Error during database initialization:', error);
        setError('Failed to initialize database');
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  const addQualification = async (qual: Qualification) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Adding qualification:', qual);
      
      const now = new Date();
      const uid = generateUID();
      console.log('Generated UID:', uid);
      
      // Get the first user's UID to use as creator
      const userResult = db.getAllSync<{ uid: string }>(
        'SELECT uid FROM users LIMIT 1'
      );
      console.log('User result:', userResult);
      
      if (userResult.length === 0) {
        throw new Error('No users found in database');
      }

      const creatorUid = userResult[0].uid;
      console.log('Creator UID:', creatorUid);
      
      const insertSQL = `
        INSERT INTO skillsfile (
          uid, name, expires_months, created, creator, updated, updator
        ) VALUES (
          '${uid}',
          '${qual.name}',
          ${qual.expires_months},
          '${formatToSQLDateTime(now)}',
          '${creatorUid}',
          '',
          ''
        )
      `;
      console.log('Insert SQL:', insertSQL);
      
      db.execSync(insertSQL);
      console.log('Qualification added successfully');
      await loadRecords(); // Reload records after adding
    } catch (err) {
      console.error('Error adding qualification:', err);
      setError('Failed to add qualification');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecords = async () => {
    try {
      const records = db.getAllSync<Qualification>(
        'SELECT * FROM skillsfile ORDER BY created DESC'
      );
      console.log('Loaded records:', records);
      setQualifications(records);
    } catch (err) {
      console.error('Error loading records:', err);
      setError('Failed to load records');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Image 
        source={require('../../assets/images/bg-light.jpg')}
        style={styles.backgroundImage}
      />
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Qualifications</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.qualificationSelector}>
            <Text style={styles.label}>Available Qualifications:</Text>
            <ScrollView style={styles.qualificationList}>
              {requiredQualifications.qualifications.map((qual, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.qualificationButton,
                    isLoading && styles.buttonDisabled
                  ]}
                  onPress={() => addQualification(qual)}
                  disabled={isLoading}
                >
                  <Text style={styles.qualificationButtonText}>
                    {qual.name}
                  </Text>
                  <Text style={styles.qualificationSubtext}>
                    {qual.requested_by} • Expires in {qual.expires_months} months
                  </Text>
                  <Text style={styles.qualificationIntro}>
                    {qual.intro}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6F3FF',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.5,
  },
  headerContainer: {
    padding: 20,
    backgroundColor: '#0A1929',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'MavenPro-Bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 20,
    backgroundColor: 'transparent',
  },
  qualificationSelector: {
    flex: 1,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: 'MavenPro-Bold',
    marginBottom: 10,
  },
  qualificationList: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  qualificationButton: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: 'white',
  },
  qualificationButtonText: {
    fontSize: 16,
    color: '#000',
    marginBottom: 4,
    fontFamily: 'MavenPro-Bold',
  },
  qualificationSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'MavenPro-Regular',
  },
  qualificationIntro: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    fontFamily: 'MavenPro-Regular',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  errorText: {
    color: 'red',
    marginBottom: 20,
    fontFamily: 'MavenPro-Regular',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
}); 