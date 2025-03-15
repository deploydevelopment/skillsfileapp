import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ScrollView, Image, Animated, Dimensions, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SQLite from 'expo-sqlite';
import { Link, useFocusEffect, useRouter, useNavigation } from 'expo-router';
import requiredQualifications from '../../api/required_qualifications.json';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '../../constants/styles';
import { DrawerActions } from '@react-navigation/native';

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
  parent_uid?: string;
  reference?: string;
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
          updator TEXT,
          parent_uid TEXT(36),
          reference TEXT(50)
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
          'hugosebriley'
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
      console.log('Tables already exist, checking for new columns...');
      
      // Check if the new columns exist
      const columns = db.getAllSync<{ name: string }>(
        "PRAGMA table_info(skillsfile)"
      );
      
      const columnNames = columns.map(col => col.name);
      
      // Add parent_uid column if it doesn't exist
      if (!columnNames.includes('parent_uid')) {
        console.log('Adding parent_uid column...');
        db.execSync('ALTER TABLE skillsfile ADD COLUMN parent_uid TEXT(36)');
      }
      
      // Add reference column if it doesn't exist
      if (!columnNames.includes('reference')) {
        console.log('Adding reference column...');
        db.execSync('ALTER TABLE skillsfile ADD COLUMN reference TEXT(50)');
      }
      
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
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isBack = useRef(false);
  const isFirstLoad = useRef(true);

  // Add navigation listener for back button
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      isBack.current = true;
    });

    return unsubscribe;
  }, [navigation]);

  useFocusEffect(
    React.useCallback(() => {
      if (!isFirstLoad.current) {
        // Only animate if it's not the first load
        slideAnim.setValue(-Dimensions.get('window').width);
        
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }).start();
      } else {
        // On first load, just set the position without animation
        slideAnim.setValue(0);
        isFirstLoad.current = false;
      }

      // Initialize database
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

      return () => {
        // Always slide out to right
        Animated.timing(slideAnim, {
          toValue: Dimensions.get('window').width,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }).start(() => {
          isBack.current = false;
        });
      };
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
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <Animated.View 
        style={[
          styles.container, 
          { 
            transform: [{ translateX: slideAnim }]
          }
        ]}
      >
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
            <View style={styles.menuButtonContainer}>
              <Text style={styles.headerName}>Sebastian</Text>
              <TouchableOpacity 
                onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
                style={styles.menuButton}
              >
                <Image 
                  source={require('../../assets/images/avatar.png')}
                  style={styles.avatar}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

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
      </Animated.View>
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
    top: 115,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '80%',
    opacity: 1,
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
    paddingLeft: 15,
    paddingRight: 10,
    paddingTop: 30,
    paddingBottom: 15,
  },
  logo: {
    width: 144,
    height: 36,
    resizeMode: 'contain',
  },
  menuButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerName: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: 'MavenPro-Medium',
  },
  menuButton: {
    padding: 5,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 15,
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
});
