import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, SafeAreaView, ScrollView } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { Link, useFocusEffect } from 'expo-router';
import requiredQualifications from '../../api/required_qualifications.json';
import { MediaPreviewTest } from '../../components/MediaPreviewTest';

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
    
    db.execSync(`
      -- Drop existing tables first
      DROP TABLE IF EXISTS skillsfile;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS quals_req;

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

    // Verify table structure
    const tableInfo = db.getAllSync<{ name: string, type: string }>(
      "PRAGMA table_info(skillsfile)"
    );
    console.log('SkillsFile table structure:', tableInfo);

    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error during database initialization:', error);
    throw error;
  }
};

export default function TabOneScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQualification, setSelectedQualification] = useState<Qualification | null>(null);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);

  // Initialize database when screen is focused
  useFocusEffect(
    React.useCallback(() => {
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
    }, [])
  );

  const addQualification = async () => {
    if (!selectedQualification) {
      setError('Please select a qualification');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Selected qualification:', selectedQualification);
      
      // Verify table structure before insert
      const tableInfo = db.getAllSync<{ name: string, type: string }>(
        "PRAGMA table_info(skillsfile)"
      );
      console.log('SkillsFile table structure before insert:', tableInfo);

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
          '${selectedQualification.name}',
          ${selectedQualification.expires_months},
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
      // Verify table structure
      const tableInfo = db.getAllSync<{ name: string, type: string }>(
        "PRAGMA table_info(skillsfile)"
      );
      console.log('SkillsFile table structure:', tableInfo);
      
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

  const clearRecords = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Verify table structure
      const tableInfo = db.getAllSync<{ name: string, type: string }>(
        "PRAGMA table_info(skillsfile)"
      );
      console.log('SkillsFile table structure:', tableInfo);
      
      db.execSync('DELETE FROM skillsfile');
      console.log('Records cleared successfully');
      await loadRecords();
    } catch (err) {
      console.error('Error clearing records:', err);
      setError('Failed to clear records');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Qualification Tracker</Text>
            <Text style={styles.subtitle}>Record your qualifications</Text>
          </View>

          <View style={styles.qualificationSelector}>
            <Text style={styles.label}>Select Qualification:</Text>
            <ScrollView style={styles.qualificationList}>
              {requiredQualifications.qualifications.map((qual, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.qualificationButton,
                    selectedQualification?.uid === qual.uid && styles.selectedQualificationButton
                  ]}
                  onPress={() => setSelectedQualification(qual)}
                >
                  <Text style={[
                    styles.qualificationButtonText,
                    selectedQualification?.uid === qual.uid && styles.selectedQualificationButtonText
                  ]}>
                    {qual.name}
                  </Text>
                  <Text style={[
                    styles.qualificationSubtext,
                    selectedQualification?.uid === qual.uid && styles.selectedQualificationSubtext
                  ]}>
                    {qual.requested_by} • Expires in {qual.expires_months} months
                  </Text>
                  <Text style={[
                    styles.qualificationIntro,
                    selectedQualification?.uid === qual.uid && styles.selectedQualificationIntro
                  ]}>
                    {qual.intro}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={addQualification}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Adding...' : 'Add Qualification'}
            </Text>
          </TouchableOpacity>

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </View>
      </ScrollView>

      {!isLoading && <MediaPreviewTest />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  qualificationSelector: {
    flex: 1,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
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
  },
  selectedQualificationButton: {
    backgroundColor: '#007AFF',
  },
  qualificationButtonText: {
    fontSize: 16,
    color: '#000',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  selectedQualificationButtonText: {
    color: 'white',
  },
  qualificationSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  selectedQualificationSubtext: {
    color: '#E5E5EA',
  },
  qualificationIntro: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  selectedQualificationIntro: {
    color: '#E5E5EA',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
  },
});
