import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ScrollView, Image, Modal, Animated, Easing, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SQLite from 'expo-sqlite';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import requiredQualifications from '../../api/required_qualifications.json';
import * as Progress from 'react-native-progress';
import { useProgressBar } from './_layout';

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
  const router = useRouter();
  const { showProgressBar } = useProgressBar();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);

  useEffect(() => {
    if (isDrawerOpen) {
      setIsDrawerVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: Dimensions.get('window').width,
        duration: 250,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }).start(() => {
        setIsDrawerVisible(false);
      });
    }
  }, [isDrawerOpen]);

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

  const addQualification = async (qual: Qualification) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Adding qualification:', qual);
      
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
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Image 
        source={require('../../assets/images/bg-light.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.headerContainer}>
        <Image 
          source={require('../../assets/images/bg-gradient.png')}
          style={styles.headerBackground}
        />
        <View style={styles.headerContent}>
          <Image 
            source={require('../../assets/images/logo-white.png')}
            style={styles.logo}
          />
          <TouchableOpacity 
            onPress={() => setIsDrawerOpen(true)}
            style={styles.menuButton}
          >
            <Image 
              source={require('../../assets/images/avatar.png')}
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={isDrawerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDrawerOpen(false)}
      >
        <View style={styles.drawerOverlay}>
          <TouchableOpacity 
            style={styles.drawerOverlayTouchable}
            activeOpacity={1}
            onPress={() => setIsDrawerOpen(false)}
          />
          <Animated.View style={[
            styles.drawerContent,
            {
              transform: [{ translateX: slideAnim }]
            }
          ]}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Menu</Text>
              <TouchableOpacity 
                onPress={() => setIsDrawerOpen(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Link href="/(tabs)/qualifications" asChild>
              <TouchableOpacity 
                style={styles.drawerItem}
                onPress={() => setIsDrawerOpen(false)}
              >
                <Text style={styles.drawerItemText}>Qualifications</Text>
              </TouchableOpacity>
            </Link>
            <TouchableOpacity style={styles.drawerItem}>
              <Text style={styles.drawerItemText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem}>
              <Text style={styles.drawerItemText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem}>
              <Text style={styles.drawerItemText}>Help</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem}>
              <Text style={styles.drawerItemText}>About</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.iconGrid}>
            <View style={styles.iconItem}>
              <Image 
                source={require('../../assets/images/home-icons/cvs.png')}
                style={styles.icon}
              />
              <Text style={styles.iconText}>CVs</Text>
            </View>
            <View style={styles.iconItem}>
              <Image 
                source={require('../../assets/images/home-icons/cover-letters.png')}
                style={styles.icon}
              />
              <Text style={styles.iconText}>Cover Letters</Text>
            </View>
            <View style={styles.iconItem}>
              <Image 
                source={require('../../assets/images/home-icons/experience.png')}
                style={styles.icon}
              />
              <Text style={styles.iconText}>Experience</Text>
            </View>
            <View style={styles.iconItem}>
              <Image 
                source={require('../../assets/images/home-icons/medicals.png')}
                style={styles.icon}
              />
              <Text style={styles.iconText}>Medicals</Text>
            </View>
            <Link href="/(tabs)/qualifications" asChild>
              <TouchableOpacity style={styles.iconItem}>
                <Image 
                  source={require('../../assets/images/home-icons/qualifications.png')}
                  style={styles.icon}
                />
                <Text style={styles.iconText}>Qualifications</Text>
              </TouchableOpacity>
            </Link>
            <View style={styles.iconItem}>
              <Image 
                source={require('../../assets/images/home-icons/testimonials.png')}
                style={styles.icon}
              />
              <Text style={styles.iconText}>Testimonials</Text>
            </View>
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
    marginTop: 0,
    paddingTop: 0,
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
    zIndex: 0,
  },
  headerContainer: {
    height: 150,
    position: 'relative',
    marginTop: 0,
    paddingTop: 20,
    paddingBottom: 15,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 15,
  },
  logo: {
    width: 160,
    height: 40,
    resizeMode: 'contain',
  },
  menuButton: {
    padding: 5,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  content: {
    flex: 1,
    padding: 20,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: 'transparent',
  },
  iconItem: {
    width: '45%',
    alignItems: 'center',
    marginBottom: 30,
  },
  icon: {
    width: 70,
    height: 70,
    marginBottom: 8,
  },
  iconText: {
    fontSize: 14,
    fontFamily: 'MavenPro-Regular',
    color: '#000',
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    marginBottom: 20,
    fontFamily: 'MavenPro-Regular',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerOverlayTouchable: {
    flex: 1,
  },
  drawerContent: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '80%',
    backgroundColor: '#0A1929',
    padding: 20,
    paddingTop: 60,
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  drawerTitle: {
    fontSize: 20,
    fontFamily: 'MavenPro-Bold',
    color: '#ffffff',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#ffffff',
  },
  drawerItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  drawerItemText: {
    fontSize: 16,
    fontFamily: 'MavenPro-Regular',
    color: '#ffffff',
  },
});
