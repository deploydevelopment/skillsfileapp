import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image, Modal, Animated, Dimensions } from 'react-native';
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
  const [activeTab, setActiveTab] = useState('required');
  const [selectedQual, setSelectedQual] = useState<Qualification | null>(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const drawerAnimation = useRef(new Animated.Value(0)).current;

  const showDrawer = (qual: Qualification) => {
    setSelectedQual(qual);
    setIsDrawerVisible(true);
    Animated.spring(drawerAnimation, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const hideDrawer = () => {
    Animated.spring(drawerAnimation, {
      toValue: 0,
      useNativeDriver: true,
    }).start(() => {
      setIsDrawerVisible(false);
      setSelectedQual(null);
    });
  };

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

  const renderQualificationDrawer = () => {
    if (!selectedQual) return null;

    const translateY = drawerAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [600, 0],
    });

    return (
      <Modal
        visible={isDrawerVisible}
        transparent
        animationType="none"
        onRequestClose={hideDrawer}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={hideDrawer}
        >
          <Animated.View 
            style={[
              styles.drawer,
              {
                transform: [{ translateY }],
              },
            ]}
          >
            <View style={styles.drawerHandle} />
            <View style={styles.drawerContent}>
              <Text style={styles.drawerTitle}>{selectedQual.name}</Text>
              <Text style={styles.drawerSubtitle}>
                Requested by {selectedQual.requested_by}
              </Text>
              <Text style={styles.drawerExpiry}>
                Expires in {selectedQual.expires_months} months
              </Text>
              <Text style={styles.drawerDescription}>
                {selectedQual.intro}
              </Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => {
                  addQualification(selectedQual);
                  hideDrawer();
                }}
              >
                <Text style={styles.addButtonText}>Add Qualification</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderTabContent = () => {
    if (activeTab === 'achieved') {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No qualifications achieved yet</Text>
          <Text style={styles.emptyStateSubtext}>Your achieved qualifications will appear here</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.qualificationList}>
        {requiredQualifications.qualifications.map((qual, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.qualificationButton,
              isLoading && styles.buttonDisabled
            ]}
            onPress={() => showDrawer(qual)}
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
    );
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

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[
            styles.tabButton,
            activeTab === 'achieved' && styles.activeTabButton
          ]}
          onPress={() => setActiveTab('achieved')}
        >
          <Text style={[
            styles.tabButtonText,
            activeTab === 'achieved' && styles.activeTabButtonText
          ]}>Achieved</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.tabButton,
            activeTab === 'required' && styles.activeTabButton
          ]}
          onPress={() => setActiveTab('required')}
        >
          <Text style={[
            styles.tabButtonText,
            activeTab === 'required' && styles.activeTabButtonText
          ]}>Required</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {renderTabContent()}
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>
      {renderQualificationDrawer()}
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
    paddingTop: 80,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'MavenPro-Medium',
    color: '#0A1929',
  },
  content: {
    flex: 1,
    padding: 20,
    backgroundColor: 'transparent',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0A1929',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#ffffff',
  },
  tabButtonText: {
    fontSize: 16,
    fontFamily: 'MavenPro-Regular',
    color: '#666666',
  },
  activeTabButtonText: {
    color: '#ffffff',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: 'MavenPro-Bold',
    color: '#666666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: 'MavenPro-Regular',
    color: '#999999',
    textAlign: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  drawer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  drawerHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  drawerContent: {
    padding: 10,
  },
  drawerTitle: {
    fontSize: 24,
    fontFamily: 'MavenPro-Medium',
    color: '#0A1929',
    marginBottom: 10,
  },
  drawerSubtitle: {
    fontSize: 16,
    fontFamily: 'MavenPro-Regular',
    color: '#666666',
    marginBottom: 5,
  },
  drawerExpiry: {
    fontSize: 14,
    fontFamily: 'MavenPro-Regular',
    color: '#666666',
    marginBottom: 15,
  },
  drawerDescription: {
    fontSize: 16,
    fontFamily: 'MavenPro-Regular',
    color: '#333333',
    marginBottom: 30,
    lineHeight: 24,
  },
  addButton: {
    backgroundColor: '#0A1929',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'MavenPro-Medium',
  },
}); 