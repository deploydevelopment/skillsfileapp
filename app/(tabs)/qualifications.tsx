import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image, Modal, Animated, Dimensions, PanResponder, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SQLite from 'expo-sqlite';
import requiredQualifications from '../../api/required_qualifications.json';
import { useMediaPreview } from '../../contexts/MediaPreviewContext';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { MediaPreviewModal } from '../../components/MediaPreviewModal';
import { router, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/styles';

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
  const { showPreview } = useMediaPreview();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [activeTab, setActiveTab] = useState('achieved');
  const [selectedQual, setSelectedQual] = useState<Qualification | null>(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isTestModalVisible, setIsTestModalVisible] = useState(false);
  const [isHelpModalVisible, setIsHelpModalVisible] = useState(false);
  const drawerAnimation = useRef(new Animated.Value(0)).current;
  const lastQualRef = useRef<Qualification | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [activePreview, setActivePreview] = useState<{
    type: 'image' | 'video' | 'audio' | 'pdf';
    uri: string | null;
  } | null>(null);
  const navigation = useNavigation();
  const isBack = useRef(false);

  // Add navigation listener for back button
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      isBack.current = true;
    });

    return unsubscribe;
  }, [navigation]);

  useFocusEffect(
    React.useCallback(() => {
      // Reset animation to initial value based on direction
      slideAnim.setValue(Dimensions.get('window').width);
      
      // Slide in from right
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();

      return () => {
        // If going back, slide out to right, otherwise slide out to left
        const toValue = isBack.current ? Dimensions.get('window').width : -Dimensions.get('window').width;
        
        Animated.timing(slideAnim, {
          toValue: toValue,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }).start(() => {
          isBack.current = false;
        });
      };
    }, [])
  );

  const showDrawer = (qual: Qualification) => {
    setSelectedQual(qual);
    lastQualRef.current = qual;
    setIsDrawerVisible(true);
    Animated.spring(drawerAnimation, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const hideDrawer = () => {
    setIsDrawerVisible(false);
    Animated.spring(drawerAnimation, {
      toValue: 0,
      useNativeDriver: true,
      damping: 25,
      stiffness: 300,
    }).start();
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
      
      // Add to skillsfile table
      const insertSkillsFileSQL = `
        INSERT INTO skillsfile (
          uid, name, expires_months, created, creator, updated, updator,
          parent_uid, reference
        ) VALUES (
          '${uid}',
          '${qual.name}',
          ${qual.expires_months},
          '${formatToSQLDateTime(now)}',
          '${creatorUid}',
          '',
          '',
          '${qual.uid}',
          'REF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}'
        )
      `;
      
      db.execSync(insertSkillsFileSQL);
      console.log('Successfully added qualification');
      
      // Reload records to update the UI
      await loadRecords();
      
      // Show success toast
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `${qual.name} has been added to your qualifications`,
        position: 'top',
        topOffset: 60,
        visibilityTime: 3000,
        text1Style: {
          fontSize: 18,
          fontFamily: 'MavenPro-Bold'
        },
        text2Style: {
          fontSize: 16,
          fontFamily: 'MavenPro-Regular'
        }
      });

    } catch (error) {
      console.error('Error adding qualification:', error);
      setError('Failed to add qualification');
      
      // Show error toast
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add qualification. Please try again.',
        position: 'top',
        topOffset: 60,
        visibilityTime: 3000,
        text1Style: {
          fontSize: 18,
          fontFamily: 'MavenPro-Bold'
        },
        text2Style: {
          fontSize: 16,
          fontFamily: 'MavenPro-Regular'
        }
      });
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

  const handlePreview = async (type: 'image' | 'video' | 'audio' | 'pdf') => {
    try {
      const testMedia = {
        image: require('../../assets/test_media/img1.jpg'),
        video: require('../../assets/test_media/vid1.mp4'),
        audio: require('../../assets/test_media/test.mp3'),
        pdf: require('../../assets/test_media/Example PDF.pdf'),
      };

      const asset = Asset.fromModule(testMedia[type]);
      await asset.downloadAsync();
      
      if (!asset.localUri) {
        console.error('Failed to load media: localUri is null');
        return;
      }

      const localUri = asset.localUri;
      const savedQual = selectedQual;

      if (type === 'pdf') {
        const fileName = 'Example PDF.pdf';
        const destination = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.copyAsync({
          from: localUri,
          to: destination
        });
        // Animate drawer closing first - quick close
        Animated.spring(drawerAnimation, {
          toValue: 0,
          useNativeDriver: true,
          damping: 25,
          stiffness: 300,
        }).start(() => {
          setIsDrawerVisible(false);
          setActivePreview({ type, uri: destination });
          // Show preview after drawer is closed
          showPreview(destination, type, () => {
            setActivePreview(null);
            // When preview closes, show drawer again with delay and slower animation
            if (savedQual) {
              setTimeout(() => {
                setSelectedQual(savedQual);
                setIsDrawerVisible(true);
                Animated.spring(drawerAnimation, {
                  toValue: 1,
                  useNativeDriver: true,
                  damping: 15,
                  stiffness: 60,
                }).start();
              }, 300); // 300ms delay
            }
          });
        });
      } else {
        // Animate drawer closing first - quick close
        Animated.spring(drawerAnimation, {
          toValue: 0,
          useNativeDriver: true,
          damping: 25,
          stiffness: 300,
        }).start(() => {
          setIsDrawerVisible(false);
          setActivePreview({ type, uri: localUri });
          // Show preview after drawer is closed
          showPreview(localUri, type, () => {
            setActivePreview(null);
            // When preview closes, show drawer again with delay and slower animation
            if (savedQual) {
              setTimeout(() => {
                setSelectedQual(savedQual);
                setIsDrawerVisible(true);
                Animated.spring(drawerAnimation, {
                  toValue: 1,
                  useNativeDriver: true,
                  damping: 15,
                  stiffness: 60,
                }).start();
              }, 300); // 300ms delay
            }
          });
        });
      }
    } catch (error) {
      console.error('Error loading media:', error);
    }
  };

  const renderPreview = () => {
    if (!activePreview?.uri) return null;

    switch (activePreview.type) {
      case 'image':
        return (
          <View style={styles.fullscreenPreview}>
            <TouchableOpacity 
              style={styles.previewCloseButton}
              onPress={() => setActivePreview(null)}
            >
              <Text style={styles.previewCloseButtonText}>✕</Text>
            </TouchableOpacity>
            <Image
              source={{ uri: activePreview.uri }}
              style={styles.fullscreenPreviewImage}
              resizeMode="contain"
            />
          </View>
        );
      // Add other preview types here as needed
      default:
        return null;
    }
  };

  const renderPreviewButtons = () => (
    <View style={styles.previewButtons}>
      <TouchableOpacity
        style={styles.previewButton}
        onPress={() => handlePreview('image')}
      >
        <Text style={styles.previewButtonText}>Image</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.previewButton}
        onPress={() => handlePreview('video')}
      >
        <Text style={styles.previewButtonText}>Video</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.previewButton}
        onPress={() => handlePreview('audio')}
      >
        <Text style={styles.previewButtonText}>Audio</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.previewButton}
        onPress={() => handlePreview('pdf')}
      >
        <Text style={styles.previewButtonText}>PDF</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTestModal = () => (
    <Modal
      visible={isTestModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setIsTestModalVisible(false)}
    >
      <View style={styles.testModalContainer}>
        <View style={styles.testModalContent}>
          <Text style={styles.testModalText}>Hello, World!</Text>
          <TouchableOpacity 
            style={styles.testModalButton}
            onPress={() => setIsTestModalVisible(false)}
          >
            <Text style={styles.testModalButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderHelpModal = () => (
    <Modal
      visible={isHelpModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setIsHelpModalVisible(false)}
    >
      <View style={styles.helpModalOverlay}>
        <View style={styles.helpModalContent}>
          <Text style={styles.helpModalTitle}>Help</Text>
          <Text style={styles.helpModalText}>
            View and manage your qualifications here. You can see both achieved and required qualifications.
            Tap on any qualification to view more details or add it to your achieved list.
          </Text>
          <TouchableOpacity 
            style={styles.helpModalButton}
            onPress={() => setIsHelpModalVisible(false)}
          >
            <Text style={styles.helpModalButtonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderQualificationDrawer = () => {
    if (!selectedQual) return null;

    const translateY = drawerAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [Dimensions.get('window').height, Dimensions.get('window').height * 0.33],
    });

    const overlayOpacity = drawerAnimation.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 1, 1],
    });

    return (
      <Modal
        visible={isDrawerVisible}
        transparent
        animationType="none"
        onRequestClose={hideDrawer}
        statusBarTranslucent
      >
        <Animated.View 
          style={[
            styles.modalOverlay,
            {
              opacity: overlayOpacity,
            }
          ]}
        >
          <TouchableOpacity 
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={hideDrawer}
          >
            <Animated.View 
              style={[
                styles.drawer,
                {
                  transform: [{ translateY }],
                  zIndex: 2,
                  height: Dimensions.get('window').height * 0.67,
                  borderTopLeftRadius: 15,
                  borderTopRightRadius: 15,
                },
              ]}
            >
              <View style={styles.drawerHeader}>
                <View style={styles.drawerHandle} />
              </View>
              <TouchableOpacity 
                activeOpacity={1} 
                style={{ flex: 1 }}
                onPress={() => {}}
              >
                <ScrollView style={styles.drawerContent}>
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
                  <View style={styles.previewContainer}>
                    {renderPreviewButtons()}
                  </View>
                  <TouchableOpacity 
                    style={styles.addButton}
                    onPress={() => {
                      addQualification(selectedQual);
                      hideDrawer();
                    }}
                  >
                    <Text style={styles.addButtonText}>Add Qualification</Text>
                  </TouchableOpacity>
                </ScrollView>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    );
  };

  const renderTabContent = () => {
    if (activeTab === 'achieved') {
      if (qualifications.length === 0) {
        return (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No qualifications achieved yet</Text>
            <Text style={styles.emptyStateSubtext}>Your achieved qualifications will appear here</Text>
          </View>
        );
      }

      return (
        <ScrollView style={styles.qualificationList}>
          {qualifications.map((qual, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.qualificationButton,
                isLoading && styles.buttonDisabled
              ]}
              disabled={isLoading}
            >
              <Text style={styles.qualificationButtonText}>
                {qual.name}
              </Text>
              <Text style={styles.qualificationSubtext}>
                Expires in {qual.expires_months} months
              </Text>
              <Text style={styles.qualificationReference}>
                Reference: {qual.reference}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
    <View style={styles.container}>
      <Animated.View 
        style={[
          { flex: 1 }, 
          { 
            transform: [{ translateX: slideAnim }]
          }
        ]}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.headerContainer}>
            <Image
              source={require('../../assets/images/bg-light.jpg')}
              style={styles.headerBackground}
              resizeMode="cover"
            />
            <View style={styles.headerRow}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Ionicons name="chevron-back" size={20} color={Colors.white} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Qualifications</Text>
              <TouchableOpacity 
                style={styles.helpButton}
                onPress={() => setIsHelpModalVisible(true)}
              >
                <Ionicons name="help-circle-outline" size={23} color={Colors.white} />
              </TouchableOpacity>
            </View>
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
        </SafeAreaView>
      </Animated.View>
      {renderQualificationDrawer()}
      {renderTestModal()}
      {renderHelpModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.blueLight,
    marginTop: -35,
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
    backgroundColor: 'transparent',
    position: 'relative', 
    paddingTop: 100,
    paddingBottom: 0,
    marginTop: 5,
    height: 220,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    marginTop: -30,
  },
  backButton: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'MavenPro-Medium',
    color: Colors.white,
    flex: 1,
    textAlign: 'center',
  },
  helpButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
    backgroundColor: 'transparent',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: -100,
    gap: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.blueDark,
  },
  activeTabButton: {
    backgroundColor: Colors.blueDark,
    borderWidth: 0,
  },
  tabButtonText: {
    fontSize: 16,
    fontFamily: 'MavenPro-Medium',
    color: Colors.blueDark,
  },
  activeTabButtonText: {
    color: Colors.white,
    fontFamily: 'MavenPro-Medium',
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
    backgroundColor: 'transparent',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 5,
  },
  qualificationButton: {
    padding: 15,
    backgroundColor: Colors.white,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  qualificationButtonText: {
    fontSize: 16,
    color: Colors.blueDark,
    marginBottom: 4,
    fontFamily: 'MavenPro-SemiBold',
  },
  qualificationSubtext: {
    fontSize: 14,
    color: Colors.blueDark,
    marginBottom: 4,
    fontFamily: 'MavenPro-Regular',
  },
  qualificationIntro: {
    fontSize: 12,
    color: Colors.charcoal,
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
  },
  drawer: {
    backgroundColor: 'white',
    height: '100%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  drawerHeader: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  drawerHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
  },
  drawerContent: {
    padding: 20,
  },
  drawerTitle: {
    fontSize: 24,
    fontFamily: 'MavenPro-Medium',
    color: '#0A1929',
    marginBottom: 15,
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
  fullscreenPreview: {
    flex: 1,
    backgroundColor: 'black',
    position: 'relative',
  },
  fullscreenPreviewImage: {
    width: '100%',
    height: '100%',
  },
  previewCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  previewCloseButtonText: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'MavenPro-Medium',
  },
  helpModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  helpModalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  helpModalTitle: {
    fontSize: 24,
    fontFamily: 'MavenPro-Bold',
    color: '#0A1929',
    marginBottom: 15,
  },
  helpModalText: {
    fontSize: 16,
    fontFamily: 'MavenPro-Regular',
    color: '#666666',
    lineHeight: 24,
    marginBottom: 20,
  },
  helpModalButton: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  helpModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'MavenPro-Medium',
  },
  previewContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 18,
    fontFamily: 'MavenPro-Medium',
    color: '#0A1929',
    marginBottom: 15,
  },
  previewWrapper: {
    width: '100%',
    height: 300,
    backgroundColor: '#f5f5f5',
    marginBottom: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  previewButton: {
    flex: 1,
    backgroundColor: '#0A1929',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  previewButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'MavenPro-Medium',
  },
  testButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'MavenPro-Medium',
  },
  testModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  testModalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  testModalText: {
    fontSize: 20,
    marginBottom: 20,
    fontFamily: 'MavenPro-Medium',
  },
  testModalButton: {
    backgroundColor: '#0A1929',
    padding: 10,
    borderRadius: 5,
    minWidth: 100,
    alignItems: 'center',
  },
  testModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'MavenPro-Medium',
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
  qualificationReference: {
    fontSize: 12,
    color: Colors.blueDark,
    fontFamily: 'MavenPro-Regular',
    marginTop: 4,
  },
}); 