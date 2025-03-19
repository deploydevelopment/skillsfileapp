import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ScrollView, Image, Animated, Dimensions, Easing, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SQLite from 'expo-sqlite';
import { Link, useFocusEffect, useRouter, useNavigation } from 'expo-router';
import { pullJson, RequiredQualification, SampleQualification } from '../../api/data';
import { pullAPI } from '../../api/pullAPI';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '../../constants/styles';
import { DrawerActions } from '@react-navigation/native';
import { AnimatedButton } from '../../components/AnimatedButton';
import Toast from 'react-native-toast-message';

interface Company {
  uid: string;
  name: string;
  status: number;
}

const db = SQLite.openDatabaseSync('skillsfile.db');

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
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('qualifications', 'skillsfile', 'users', 'quals_req', 'companies', 'qual_company_req')"
    );
    
    if (tables.length === 0) {
      console.log('Creating tables for the first time...');
      db.execSync(`
        -- Create tables with correct schema
        CREATE TABLE qualifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uid TEXT NOT NULL,
          name TEXT NOT NULL,
          expires_months INTEGER NOT NULL DEFAULT 0,
          created TEXT NOT NULL,
          creator TEXT NOT NULL,
          updated TEXT,
          updator TEXT,
          parent_uid TEXT(36),
          reference TEXT(50),
          achieved TEXT,
          status INTEGER NOT NULL DEFAULT 0 CHECK (status IN (0, 1, 2)),
          synced TINYINT NOT NULL DEFAULT 0
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
          updator TEXT,
          status INTEGER NOT NULL DEFAULT 0 CHECK (status IN (0, 1, 2)),
          synced TINYINT NOT NULL DEFAULT 0
        );

        CREATE TABLE quals_req (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uid TEXT NOT NULL,
          name TEXT NOT NULL,
          intro TEXT NOT NULL,
          category_name TEXT NOT NULL,
          expires_months INTEGER NOT NULL,
          created TEXT NOT NULL,
          creator TEXT NOT NULL,
          updated TEXT,
          updator TEXT,
          accreditor TEXT NOT NULL,
          status INTEGER NOT NULL DEFAULT 0 CHECK (status IN (0, 1, 2)),
          synced TINYINT NOT NULL DEFAULT 0
        );

        CREATE TABLE qual_company_req (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          qual_uid TEXT NOT NULL,
          company_uid TEXT NOT NULL,
          created TEXT NOT NULL,
          creator TEXT NOT NULL,
          updated TEXT,
          updator TEXT,
          synced TINYINT NOT NULL DEFAULT 0,
          FOREIGN KEY (qual_uid) REFERENCES quals_req(uid),
          FOREIGN KEY (company_uid) REFERENCES companies(uid)
        );

        CREATE TABLE companies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uid TEXT NOT NULL,
          name TEXT NOT NULL,
          status INTEGER NOT NULL DEFAULT 0 CHECK (status IN (0, 1, 2)),
          created TEXT NOT NULL,
          creator TEXT NOT NULL,
          updated TEXT,
          updator TEXT,
          synced TINYINT NOT NULL DEFAULT 0
        );

        -- Insert default user
        INSERT INTO users (
          uid, first_name, last_name, username, status,
          created, creator, updated, updator, synced
        ) VALUES (
          '${generateUID()}',
          'Matt',
          'Riley',
          'hugosebriley',
          0,
          '${formatToSQLDateTime(new Date())}',
          'system',
          '',
          '',
          1
        );
      `);

      // Insert required qualifications from JSON
      const reqQuals = pullJson('req_quals');
      reqQuals.forEach(q => {
        db.execSync(`
          INSERT INTO quals_req (
            uid, name, intro, category_name, expires_months,
            created, creator, updated, updator, status, accreditor, synced
          ) VALUES (
            '${q.uid}',
            '${q.name}',
            '${q.intro}',
            '${q.category_name}',
            ${q.expires_months},
            '${q.created}',
            '${q.creator}',
            '${q.updated}',
            '${q.updator}',
            ${q.status},
            '${q.accreditor}',
            1
          );
        `);

        // Insert company requests for this qualification
        if (q.comp_requests) {
          q.comp_requests.forEach(cr => {
            db.execSync(`
              INSERT INTO qual_company_req (
                qual_uid, company_uid, created, creator, updated, updator, synced
              ) VALUES (
                '${q.uid}',
                '${cr.creator}',
                '${cr.created}',
                'system',
                '${cr.updated}',
                '${cr.updator}',
                1
              );
            `);
          });
        }
      });

      // Insert companies from JSON
      const companiesList = pullJson('companies');
      companiesList.forEach(c => {
        db.execSync(`
          INSERT INTO companies (
            uid, name, status,
            created, creator, updated, updator, synced
          ) VALUES (
            '${c.uid}',
            '${c.name}',
            ${c.status},
            '${formatToSQLDateTime(new Date())}',
            'system',
            '',
            '',
            1
          );
        `);
      });

      console.log('Tables created and initial data inserted successfully');
    } else {
      console.log('Tables exist, checking for migrations...');
      
      // Check if we need to migrate from skillsfile to qualifications
      const hasOldTable = tables.some(t => t.name === 'skillsfile');
      const hasNewTable = tables.some(t => t.name === 'qualifications');
      
      if (hasOldTable && !hasNewTable) {
        console.log('Migrating from skillsfile to qualifications...');
        db.execSync(`
          CREATE TABLE qualifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uid TEXT NOT NULL,
            name TEXT NOT NULL,
            expires_months INTEGER NOT NULL DEFAULT 0,
            created TEXT NOT NULL,
            creator TEXT NOT NULL,
            updated TEXT,
            updator TEXT,
            parent_uid TEXT(36),
            reference TEXT(50),
            achieved TEXT,
            status INTEGER NOT NULL DEFAULT 0 CHECK (status IN (0, 1, 2)),
            synced TINYINT NOT NULL DEFAULT 0
          );
          
          INSERT INTO qualifications 
          SELECT id, uid, name, expires_months, created, creator, updated, updator, parent_uid, reference, NULL as achieved
          FROM skillsfile;
          
          DROP TABLE skillsfile;
        `);
        console.log('Migration completed successfully');
      }
      
      // Check for new columns
      if (hasNewTable) {
        const columns = db.getAllSync<{ name: string }>(
          "PRAGMA table_info(qualifications)"
        );
        
        const columnNames = columns.map(col => col.name);
        
        if (!columnNames.includes('parent_uid')) {
          console.log('Adding parent_uid column...');
          db.execSync('ALTER TABLE qualifications ADD COLUMN parent_uid TEXT(36)');
        }
        
        if (!columnNames.includes('reference')) {
          console.log('Adding reference column...');
          db.execSync('ALTER TABLE qualifications ADD COLUMN reference TEXT(50)');
        }
        
        if (!columnNames.includes('achieved')) {
          console.log('Adding achieved column...');
          db.execSync('ALTER TABLE qualifications ADD COLUMN achieved TEXT');
        }

        if (!columnNames.includes('status')) {
          console.log('Adding status column...');
          db.execSync('ALTER TABLE qualifications ADD COLUMN status INTEGER NOT NULL DEFAULT 0 CHECK (status IN (0, 1, 2))');
        }
      }

      // Check if companies table exists
      const hasCompaniesTable = tables.some(t => t.name === 'companies');
      if (!hasCompaniesTable) {
        console.log('Creating companies table...');
        db.execSync(`
          CREATE TABLE companies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uid TEXT NOT NULL,
            name TEXT NOT NULL,
            status INTEGER NOT NULL DEFAULT 0 CHECK (status IN (0, 1, 2)),
            created TEXT NOT NULL,
            creator TEXT NOT NULL,
            updated TEXT,
            updator TEXT,
            synced TINYINT NOT NULL DEFAULT 0
          );

          -- Insert companies from JSON
          ${pullJson('companies').map(c => `
            INSERT INTO companies (
              uid, name, status,
              created, creator, updated, updator, synced
            ) VALUES (
              '${c.uid}',
              '${c.name}',
              ${c.status},
              '${formatToSQLDateTime(new Date())}',
              'system',
              '',
              '',
              1
            );
          `).join('\n')}
        `);
        console.log('Companies table created and populated successfully');
      }
    }

    // Verify table structure
    const tableInfo = db.getAllSync<{ name: string, type: string }>(
      "PRAGMA table_info(qualifications)"
    );
    console.log('Qualifications table structure:', tableInfo);

    // Check for new columns in users table
    const usersColumns = db.getAllSync<{ name: string }>(
      "PRAGMA table_info(users)"
    );

    const userColumnNames = usersColumns.map(col => col.name);

    if (!userColumnNames.includes('status')) {
      console.log('Adding status column to users table...');
      db.execSync('ALTER TABLE users ADD COLUMN status INTEGER NOT NULL DEFAULT 0 CHECK (status IN (0, 1, 2))');
    }

    // Check for status column in quals_req table
    const qualsReqColumns = db.getAllSync<{ name: string }>(
      "PRAGMA table_info(quals_req)"
    );

    const qualsReqColumnNames = qualsReqColumns.map(col => col.name);

    if (!qualsReqColumnNames.includes('status')) {
      console.log('Adding status column to quals_req table...');
      db.execSync('ALTER TABLE quals_req ADD COLUMN status INTEGER NOT NULL DEFAULT 0 CHECK (status IN (0, 1, 2))');
    }

    if (!qualsReqColumnNames.includes('category_name')) {
      console.log('Adding category_name column to quals_req table...');
      db.execSync('ALTER TABLE quals_req ADD COLUMN category_name TEXT NOT NULL DEFAULT ""');
      
      // Repopulate the category_name from JSON
      const reqQuals = pullJson('req_quals');
      reqQuals.forEach(q => {
        db.execSync(`
          UPDATE quals_req 
          SET category_name = '${q.category_name}'
          WHERE uid = '${q.uid}'
        `);
      });
    }

    // Check for synced column in all tables
    const allTables = ['qualifications', 'users', 'quals_req', 'qual_company_req', 'companies'];
    
    for (const table of allTables) {
      const columns = db.getAllSync<{ name: string }>(
        `PRAGMA table_info(${table})`
      );
      
      const columnNames = columns.map(col => col.name);
      
      if (!columnNames.includes('synced')) {
        console.log(`Adding synced column to ${table} table...`);
        db.execSync(`ALTER TABLE ${table} ADD COLUMN synced TINYINT NOT NULL DEFAULT 0`);
      }
    }

    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error during database initialization:', error);
    throw error;
  }
};

const formatDisplayDate = (date: Date): string => {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export default function TabOneScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'achieved' | 'required'>('achieved');
  const [requiredQualifications, setRequiredQualifications] = useState<RequiredQualification[]>([]);
  const [achievedQualifications, setAchievedQualifications] = useState<SampleQualification[]>([]);
  const [filteredRequiredQualifications, setFilteredRequiredQualifications] = useState<RequiredQualification[]>([]);
  const [filteredAchievedQualifications, setFilteredAchievedQualifications] = useState<SampleQualification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isBack = useRef(false);
  const isFirstLoad = useRef(true);
  const [selectedQual, setSelectedQual] = useState<RequiredQualification | null>(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredQualifications = requiredQualifications.filter(qual => 
    qual.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    qual.accreditor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await pullAPI();
      loadRecords();
      // Add a short delay before showing the success toast
      setTimeout(() => {
        Toast.show({
          type: 'success',
          text1: 'Sync Successful',
          text2: 'All data has been pulled from the API',
          position: 'top',
          topOffset: 60,
          visibilityTime: 3000,
          text1Style: {
            fontSize: 18,
            fontFamily: 'MavenPro-Medium',
            color: Colors.blueDark,
            marginBottom: 4
          },
          text2Style: {
            fontSize: 16,
            fontFamily: 'MavenPro-Regular',
            color: Colors.blueDark,
            lineHeight: 20
          }
        });
      }, 700); // 500ms delay
    } catch (error) {
      console.error('Error pulling API data:', error);
      Toast.show({
        type: 'error',
        text1: 'Sync Failed',
        text2: 'Failed to update data from the API',
        position: 'top',
        topOffset: 60,
        visibilityTime: 3000,
        text1Style: {
          fontSize: 18,
          fontFamily: 'MavenPro-Medium',
          color: Colors.blueDark,
          marginBottom: 4
        },
        text2Style: {
          fontSize: 16,
          fontFamily: 'MavenPro-Regular',
          color: Colors.blueDark,
          lineHeight: 20
        }
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

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

  const addQualification = async (qual: RequiredQualification) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Adding qualification:', qual);
      
      // Verify table structure before insert
      const tableInfo = db.getAllSync<{ name: string, type: string }>(
        "PRAGMA table_info(qualifications)"
      );
      console.log('Qualifications table structure before insert:', tableInfo);

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
        INSERT INTO qualifications (
          uid, name, expires_months, created, creator, updated, updator, synced
        ) VALUES (
          '${uid}',
          '${qual.name}',
          ${qual.expires_months},
          '${formatToSQLDateTime(now)}',
          '${creatorUid}',
          '',
          '',
          0
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
      const db = SQLite.openDatabaseSync('skillsfile.db');
      
      // Load required qualifications
      const requiredRecords = db.getAllSync<RequiredQualification>(
        'SELECT * FROM quals_req ORDER BY created DESC'
      );
      setRequiredQualifications(requiredRecords);
      setFilteredRequiredQualifications(requiredRecords);
      
      // Load achieved qualifications
      const achievedRecords = db.getAllSync<SampleQualification>(
        'SELECT * FROM qualifications ORDER BY created DESC'
      );
      setAchievedQualifications(achievedRecords);
      setFilteredAchievedQualifications(achievedRecords);
    } catch (error) {
      console.error('Error loading records:', error);
      setError('Failed to load records');
    }
  };

  const clearRecords = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Verify table structure
      const tableInfo = db.getAllSync<{ name: string, type: string }>(
        "PRAGMA table_info(qualifications)"
      );
      console.log('Qualifications table structure:', tableInfo);
      
      db.execSync('DELETE FROM qualifications');
      console.log('Records cleared successfully');
      await loadRecords();
    } catch (err) {
      console.error('Error clearing records:', err);
      setError('Failed to clear records');
    } finally {
      setIsLoading(false);
    }
  };

  const showDrawer = (qualification: RequiredQualification | SampleQualification) => {
    if ('intro' in qualification) {
      // This is a RequiredQualification
      setSelectedQual(qualification);
    } else {
      // This is a SampleQualification
      // Convert it to RequiredQualification format
      const reqQual: RequiredQualification = {
        uid: qualification.uid,
        name: qualification.name,
        intro: '', // We don't have this info for achieved qualifications
        category_name: '', // We don't have this info for achieved qualifications
        expires_months: qualification.expires_months,
        created: qualification.created,
        creator: qualification.creator,
        updated: qualification.updated,
        updator: qualification.updator,
        status: qualification.status,
        accreditor: qualification.reference, // Use reference as accreditor
        reference: qualification.reference,
        parent_uid: qualification.parent_uid,
        synced: qualification.synced,
        comp_requests: [] // We don't have this info for achieved qualifications
      };
      setSelectedQual(reqQual);
    }
    setIsDrawerVisible(true);
  };

  const renderTabContent = () => {
    if (activeTab === 'achieved') {
      if (achievedQualifications.length === 0) {
        return (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No qualifications achieved yet</Text>
            <Text style={styles.emptyStateSubtext}>Your achieved qualifications will appear here</Text>
          </View>
        );
      }

      if (filteredAchievedQualifications.length === 0) {
        return (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No matches found</Text>
            <Text style={styles.emptyStateSubtext}>Try adjusting your search</Text>
          </View>
        );
      }
      
      return (
        <ScrollView style={styles.scrollView}>
          {filteredAchievedQualifications.map((qual, index) => (
            <AnimatedButton 
              key={index}
              style={styles.qualificationButton} 
              onPress={() => showDrawer(qual)}
            >
              <View style={styles.qualificationContent}>
                <View style={styles.qualificationRow}>
                  <Text style={[styles.qualificationName, { flex: 1 }]}>{qual.name}</Text>
                </View>
                <View style={styles.qualificationBottomRow}>
                  <Text style={styles.qualificationCompany}>
                    {qual.reference}
                  </Text>
                  <Text style={styles.achievedDate}>
                    {qual.achieved ? formatDisplayDate(new Date(qual.achieved)) : ''}
                  </Text>
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.green} />
                  </View>
                </View>
              </View>
            </AnimatedButton>
          ))}
        </ScrollView>
      );
    }

    // ... rest of the existing code ...
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
              <AnimatedButton 
                onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
                style={styles.menuButton}
              >
                <Image 
                  source={require('../../assets/images/avatar.png')}
                  style={styles.avatar}
                />
              </AnimatedButton>
            </View>
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.blueDark}
              colors={[Colors.blueDark]}
            />
          }
        >
          <View style={styles.content}>
            <View style={styles.alertItem}>
              <Image 
                source={require('../../assets/images/icons/bell.png')}
                style={{ width: 24, height: 24, tintColor: '#bf2025' }}
              />
              <Text style={styles.alertText}>1 New Job Offer</Text>
            </View>

            <View style={styles.alertItem}>
              <Image 
                source={require('../../assets/images/icons/chat.png')}
                style={{ width: 24, height: 24, tintColor: '#bf2025' }}
              />
              <Text style={styles.alertText}>3 New Messages</Text>
            </View>

            <View style={styles.section}>
              <View style={styles.iconGrid}>
                <Link href="/(tabs)/qualifications" asChild>
                  <TouchableOpacity style={styles.iconItem} activeOpacity={1}>
                    <Image 
                      source={require('../../assets/images/home-icons/qualifications.png')}
                      style={styles.icon}
                    />
                    <Text style={styles.iconText}>Qualifications</Text>
                  </TouchableOpacity>
                </Link>
                <View style={styles.iconItem}>
                  <Image 
                    source={require('../../assets/images/home-icons/cvs.png')}
                    style={styles.icon}
                  />
                  <Text style={styles.iconText}>CVs</Text>
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
                    source={require('../../assets/images/home-icons/cover-letters.png')}
                    style={styles.icon}
                  />
                  <Text style={styles.iconText}>Cover Letters</Text>
                </View>
                <View style={styles.iconItem}>
                  <Image 
                    source={require('../../assets/images/home-icons/medicals.png')}
                    style={styles.icon}
                  />
                  <Text style={styles.iconText}>Medicals</Text>
                </View>
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
    height: 132,
    position: 'relative',
    marginTop: 0,
    paddingTop: 0,
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
    position: 'relative',
    top: 20,
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
    marginEnd: 2,
  },
  content: {
    flex: 1,
    paddingTop: 0,
    paddingBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.blueDark,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 15,
    backgroundColor: Colors.white,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  alertText: {
    fontSize: 16,
    color: Colors.blueDark,
    fontFamily: 'MavenPro-SemiBold',
  },
  section: {
    flex: 1,
    padding: 20,
    paddingTop: 20,
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
    position: 'relative',
    left: 0,
    top: 0,
  },
  icon: {
    width: 100,
    height: 90,
    marginBottom: 8,
    padding: 4,
    resizeMode: 'contain',
  },
  iconText: {
    fontSize: 18,
    fontFamily: 'MavenPro-Regular',
    color: Colors.blueDark,
    letterSpacing: 0.6,
    textAlign: 'center',
    marginTop: 0,
  },
  errorText: {
    color: 'red',
    marginBottom: 20,
    fontFamily: 'MavenPro-Regular',
  },
  scrollView: {
    flex: 1,
    paddingTop: 0,
    backgroundColor: 'transparent',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.blueDark,
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: Colors.blueDark,
  },
  qualificationButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.blueDark,
    borderRadius: 5,
    marginBottom: 10,
  },
  qualificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qualificationRow: {
    flex: 1,
  },
  qualificationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.blueDark,
  },
  qualificationBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qualificationCompany: {
    fontSize: 16,
    color: Colors.blueDark,
    marginRight: 10,
  },
  achievedDate: {
    fontSize: 16,
    color: Colors.blueDark,
  },
  checkCircle: {
    marginLeft: 10,
  },
});
