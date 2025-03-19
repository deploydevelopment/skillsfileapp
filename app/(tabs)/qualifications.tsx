import React, { useEffect, useState, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image, Modal, Animated, Dimensions, PanResponder, Easing, TextInput, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SQLite from 'expo-sqlite';
import { pullJson, RequiredQualification } from '../../api/data';
import { useMediaPreview } from '../../contexts/MediaPreviewContext';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { MediaPreviewModal } from '../../components/MediaPreviewModal';
import { router, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/styles';
import { AnimatedButton } from '../../components/AnimatedButton';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';

interface Qualification extends RequiredQualification {
  achieved?: string;
}

interface ProcessedImages {
  thumbnailUri: string;
  highResUri: string;
}

interface SelectedMedia {
  highResUri: string;
  thumbnailUri: string;
  type: 'image' | 'document';
}

interface DrawerState {
  isVisible: boolean;
  selectedQual: Qualification | null;
  reference: string;
  achievedDate: Date;
  renewsMonths: number | null;
  selectedMedia: SelectedMedia[];
  selectedDocument: string | null;
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
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('qualifications', 'users', 'quals_req', 'companies')"
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
          parent_uid TEXT,
          reference TEXT
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
          category_name TEXT NOT NULL,
          expires_months INTEGER NOT NULL,
          created TEXT NOT NULL,
          creator TEXT NOT NULL,
          updated TEXT,
          updator TEXT,
          status INTEGER NOT NULL DEFAULT 0 CHECK (status IN (0, 1, 2))
        );

        CREATE TABLE companies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uid TEXT NOT NULL,
          name TEXT NOT NULL,
          status INTEGER NOT NULL DEFAULT 0 CHECK (status IN (0, 1, 2)),
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
        ${pullJson('req_quals').map(q => `
          INSERT INTO quals_req (
            uid, name, intro, category_name, expires_months,
            created, creator, updated, updator, status
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
            ${q.status}
          );
        `).join('\n')}

        -- Insert companies from JSON
        ${pullJson('companies').map(c => `
          INSERT INTO companies (
            uid, name, status,
            created, creator, updated, updator
          ) VALUES (
            '${c.uid}',
            '${c.name}',
            ${c.status},
            '${formatToSQLDateTime(new Date())}',
            'system',
            '',
            ''
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
  const [searchText, setSearchText] = useState('');
  const [selectedQual, setSelectedQual] = useState<Qualification | null>(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isTestModalVisible, setIsTestModalVisible] = useState(false);
  const [isHelpModalVisible, setIsHelpModalVisible] = useState(false);
  const [showDebugButtons, setShowDebugButtons] = useState(false);
  const drawerAnimation = useRef(new Animated.Value(0)).current;
  const lastQualRef = useRef<DrawerState | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation();
  const isBack = useRef(false);
  const [achievedDate, setAchievedDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reference, setReference] = useState('');
  const [referenceError, setReferenceError] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [renewsMonths, setRenewsMonths] = useState<number | null>(0);
  const [isRenewsInfoVisible, setIsRenewsInfoVisible] = useState(false);
  const [achievedDateError, setAchievedDateError] = useState<string | null>(null);
  const [selectedImageThumbnail, setSelectedImageThumbnail] = useState<string | null>(null);
  const [showTitleError, setShowTitleError] = useState(false);
  const [showDateError, setShowDateError] = useState(false);
  const [showRenewsError, setShowRenewsError] = useState(false);
  const [showEvidenceError, setShowEvidenceError] = useState(false);

  const formatDisplayDate = (date: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  const validateAchievedDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    // Check if date is in the future
    if (checkDate > today) {
      setAchievedDateError('Achievement date cannot be in the future');
      return false;
    }
    
    // Check if date is valid
    if (isNaN(checkDate.getTime())) {
      setAchievedDateError('Please enter a valid date');
      return false;
    }

    setAchievedDateError(null);
    return true;
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      const isValid = validateAchievedDate(selectedDate);
      if (isValid) {
        setAchievedDate(selectedDate);
      }
    }
  };

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

      // Load data when page is focused
      const loadData = async () => {
        try {
          setIsLoading(true);
          console.log('Loading qualifications data...');
          await loadRecords();
        } catch (error) {
          console.error('Error loading qualifications:', error);
          setError('Failed to load qualifications');
        } finally {
          setIsLoading(false);
        }
      };

      loadData();

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
    lastQualRef.current = {
      isVisible: true,
      selectedQual: qual,
      reference: '',
      achievedDate: new Date(),
      renewsMonths: null,
      selectedMedia: [],
      selectedDocument: null
    };
    setIsDrawerVisible(true);
    Animated.spring(drawerAnimation, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const hideDrawer = () => {
    setIsDrawerVisible(false);
    setShowDatePicker(false);
    // Clear all validation statuses
    setReferenceError('');
    setReference('');
    setSelectedMedia([]);
    setSelectedDocument(null);
    setAchievedDate(new Date());
    setRenewsMonths(null);
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

  const processImage = async (uri: string): Promise<ProcessedImages> => {
    try {
      // Generate thumbnail (300x300 cropped)
      const thumbnail = await ImageManipulator.manipulateAsync(
        uri,
        [
          { resize: { width: 300, height: 300 } },
          { crop: { originX: 0, originY: 0, width: 300, height: 300 } }
        ],
        { 
          format: ImageManipulator.SaveFormat.JPEG,
          compress: 0.5
        }
      );

      // Generate high-res version (max 1400 width)
      const highRes = await ImageManipulator.manipulateAsync(
        uri,
        [
          { resize: { width: 1400 } }
        ],
        { 
          format: ImageManipulator.SaveFormat.JPEG,
          compress: 0.6
        }
      );

      return {
        thumbnailUri: thumbnail.uri,
        highResUri: highRes.uri
      };
    } catch (error) {
      console.error('Error processing image:', error);
      throw error;
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });

    if (!result.canceled) {
      try {
        // Process each selected image
        const processedImages = await Promise.all(
          result.assets.map(async (asset) => {
            const processed = await processImage(asset.uri);
            return {
              highResUri: processed.highResUri,
              thumbnailUri: processed.thumbnailUri,
              type: 'image' as const
            };
          })
        );
        
        // Append new images to existing ones
        setSelectedMedia(prevMedia => [...prevMedia, ...processedImages]);
        // Clear evidence error when images are added
        setShowEvidenceError(false);
      } catch (error) {
        console.error('Error processing image:', error);
        Toast.show({
          type: 'error',
          text1: 'Error processing image',
          text2: 'Please try again',
        });
      }
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({
        type: 'error',
        text1: 'Camera permission not granted',
        text2: 'Please enable camera access in your device settings.',
      });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 1,
    });

    if (!result.canceled) {
      try {
        const processedImages = await processImage(result.assets[0].uri);
        const newMedia: SelectedMedia = {
          highResUri: processedImages.highResUri,
          thumbnailUri: processedImages.thumbnailUri,
          type: 'image'
        };
        setSelectedMedia(prevMedia => [...prevMedia, newMedia]);
        // Clear evidence error when photo is taken
        setShowEvidenceError(false);
      } catch (error) {
        console.error('Error processing image:', error);
        Toast.show({
          type: 'error',
          text1: 'Error processing image',
          text2: 'Please try again',
        });
      }
    }
  };

  const pickDocument = async () => {
    try {
      Alert.alert(
        'Choose Upload Type',
        'Select how you want to upload your file',
        [
          {
            text: 'Browse Recents',
            onPress: async () => {
              const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
                copyToCacheDirectory: true
              });

              if (!result.canceled && result.assets && result.assets.length > 0) {
                const file = result.assets[0];
                
                if (file.mimeType?.startsWith('image/')) {
                  const processedImages = await processImage(file.uri);
                  setSelectedMedia(prevMedia => [...prevMedia, {
                    highResUri: processedImages.highResUri,
                    thumbnailUri: processedImages.thumbnailUri,
                    type: 'image'
                  }]);
                  // Clear evidence error when image is added
                  setShowEvidenceError(false);
                } else {
                  setSelectedDocument(file.uri);
                  // Clear evidence error when document is added
                  setShowEvidenceError(false);
                }
              }
            }
          },
          {
            text: 'Browse Photos',
            onPress: async () => {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please grant photo library permissions to browse photos');
                return;
              }

              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 1,
                presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
              });

              if (!result.canceled && result.assets && result.assets.length > 0) {
                const processedImages = await processImage(result.assets[0].uri);
                setSelectedMedia(prevMedia => [...prevMedia, {
                  highResUri: processedImages.highResUri,
                  thumbnailUri: processedImages.thumbnailUri,
                  type: 'image'
                }]);
                // Clear evidence error when image is added
                setShowEvidenceError(false);
              }
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleAddQualification = () => {
    // Reset all error states
    setReferenceError('');
    setShowTitleError(false);
    setShowDateError(false);
    setShowRenewsError(false);
    setShowEvidenceError(false);

    let hasErrors = false;

    // Validate title
    if (!selectedQual?.name) {
      setShowTitleError(true);
      hasErrors = true;
    }

    // Validate date
    if (!validateAchievedDate(achievedDate)) {
      setShowDateError(true);
      hasErrors = true;
    }

    // // Validate renews
    // if (renewsMonths === null) {
    //   setShowRenewsError(true);
    //   hasErrors = true;
    // }

    // Validate evidence
    if (selectedMedia.length === 0 && !selectedDocument) {
      setShowEvidenceError(true);
      hasErrors = true;
    }

    // Validate reference
    if (!reference.trim()) {
      setReferenceError('Reference is required');
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    // Proceed with adding qualification
    addQualification();
  };

  const addQualification = async () => {
    if (!reference.trim()) {
      setReferenceError('Reference is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const uid = Date.now().toString(36) + Math.random().toString(36).substr(2);
      const now = formatToSQLDateTime(new Date());
      
      // Get the current user's UID
      const userResult = db.getAllSync<{ uid: string }>('SELECT uid FROM users LIMIT 1');
      if (userResult.length === 0) {
        throw new Error('No users found in database');
      }
      const creatorUid = userResult[0].uid;

      // Get the name from the selected required qualification
      const qualName = selectedQual ? selectedQual.name : '';
      const parentUid = selectedQual ? selectedQual.uid : null;

      const query = `
        INSERT INTO qualifications (
          uid,
          name,
          expires_months,
          created,
          creator,
          updated,
          updator,
          reference,
          achieved,
          parent_uid
        ) VALUES (
          '${uid}',
          '${qualName}',
          ${renewsMonths || 0},
          '${now}',
          '${creatorUid}',
          '',
          '',
          '${reference}',
          '${formatToSQLDateTime(achievedDate)}',
          ${parentUid ? `'${parentUid}'` : 'NULL'}
        )
      `;

      // Execute the query
      db.execSync(query);

      // Handle file uploads if needed
      if (selectedMedia.length > 0) {
        const imageExt = 'jpg';
        const imageName = `${uid}_image.${imageExt}`;
        const thumbnailName = `${uid}_image_thumb.${imageExt}`;
        const imageDestination = `${FileSystem.documentDirectory}${imageName}`;
        const thumbnailDestination = `${FileSystem.documentDirectory}${thumbnailName}`;
        
        await Promise.all([
          FileSystem.copyAsync({
            from: selectedMedia[0].highResUri,
            to: imageDestination
          }),
          FileSystem.copyAsync({
            from: selectedMedia[0].thumbnailUri,
            to: thumbnailDestination
          })
        ]);
      }

      if (selectedDocument) {
        const docExt = selectedDocument.split('.').pop();
        const docName = `${uid}_doc.${docExt}`;
        const docDestination = `${FileSystem.documentDirectory}${docName}`;
        await FileSystem.copyAsync({
          from: selectedDocument,
          to: docDestination
        });
      }

      // Reset form
      setReference('');
      setSelectedMedia([]);
      setSelectedDocument(null);
      setAchievedDate(new Date());
      setRenewsMonths(null);
      
      // Refresh the qualifications list
      await loadRecords();
      
      // Switch to achieved tab
      setActiveTab('achieved');
      
      // Show success toast
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Qualification added successfully',
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

      // Hide drawer only on success
      hideDrawer();

    } catch (error) {
      console.error('Error adding qualification:', error);
      setError('Failed to add qualification');
      
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add qualification. Please try again.',
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
      setIsLoading(false);
    }
  };

  const loadRecords = async () => {
    try {
      const records = db.getAllSync<Qualification>(
        'SELECT * FROM qualifications ORDER BY created DESC'
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
      if (type === 'image' && selectedMedia.length > 0) {
        console.log('Debug - Previewing image:', selectedMedia[0].highResUri);
        showPreview(selectedMedia[0].highResUri, type, () => {
          // @ts-ignore - showDrawer exists on the navigation object
          navigation.showDrawer();
        });
        return;
      }

      const testMedia = {
        image: require('../../assets/test_media/img1.jpg'),
        video: require('../../assets/test_media/vid1.mp4'),
        audio: require('../../assets/test_media/test.mp3'),
        pdf: require('../../assets/test_media/test.pdf'),
      };

      const asset = Asset.fromModule(testMedia[type]);
      await asset.downloadAsync();
      
      if (!asset.localUri) {
        console.error('Failed to load media: localUri is null');
        return;
      }

      const localUri = asset.localUri;
      showPreview(localUri, type);
    } catch (error) {
      console.error('Error loading media:', error);
    }
  };

  const renderPreview = () => {
    return null;
  };

  const renderPreviewButtons = () => {
    if (!showDebugButtons) {
      return (
        <TouchableOpacity 
          style={styles.showDebugButton} 
          onPress={() => setShowDebugButtons(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="bug-outline" size={20} color={Colors.blueDark} />
          <Text style={styles.showDebugText}></Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.previewContainer}>
        <View style={styles.debugHeader}>
          <Text style={styles.debugTitle}>Debug Tools</Text>
          <TouchableOpacity 
            onPress={() => setShowDebugButtons(false)}
            style={styles.hideDebugButton}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle-outline" size={24} color={Colors.blueDark} />
          </TouchableOpacity>
        </View>
        <View style={styles.previewButtons}>
          <AnimatedButton style={styles.previewButton} onPress={() => handlePreview('image')}>
            <Text style={styles.previewButtonText}>Image</Text>
          </AnimatedButton>

          <AnimatedButton style={styles.previewButton} onPress={() => handlePreview('video')}>
            <Text style={styles.previewButtonText}>Video</Text>
          </AnimatedButton>

          <AnimatedButton style={styles.previewButton} onPress={() => handlePreview('audio')}>
            <Text style={styles.previewButtonText}>Audio</Text>
          </AnimatedButton>

          <AnimatedButton style={styles.previewButton} onPress={() => handlePreview('pdf')}>
            <Text style={styles.previewButtonText}>PDF</Text>
          </AnimatedButton>
        </View>
      </View>
    );
  };

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
          <View style={styles.helpModalTitleContainer}>
            <Ionicons name="help-circle-outline" size={24} color={Colors.blueDark} />
            <Text style={styles.helpModalTitle}>Qualifications</Text>
          </View>
          <Text style={styles.helpModalText}>
            View and manage your qualifications here. You can see both achieved and required qualifications.
            Tap on any qualification to view more details or add it to your achieved list.
          </Text>
          <AnimatedButton 
            style={styles.helpModalButton}
            onPress={() => setIsHelpModalVisible(false)}
          >
            <Text style={styles.helpModalButtonText}>Got it</Text>
          </AnimatedButton>
        </View>
      </View>
    </Modal>
  );

  const calculateExpiryDate = (achievedDate: Date, months: number | null) => {
    if (months === null) return null;
    const expiryDate = new Date(achievedDate);
    expiryDate.setMonth(expiryDate.getMonth() + months);
    return expiryDate;
  };

  useEffect(() => {
    if (selectedQual) {
      setRenewsMonths(selectedQual.expires_months);
    }
  }, [selectedQual]);

  const handleRenewsChange = (text: string) => {
    if (text === '') {
      setRenewsMonths(null);
    } else {
      const number = parseInt(text, 10);
      if (!isNaN(number) && number >= 0) {
        setRenewsMonths(number);
      }
    }
  };

  const handleReferenceChange = (text: string) => {
    setReference(text);
    if (text.trim()) {
      setReferenceError('');
    }
  };

  const renderQualificationDrawer = () => {
    if (!selectedQual) return null;

    const translateY = drawerAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [Dimensions.get('window').height, Dimensions.get('window').height * 0.15],
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
        <TouchableOpacity 
          style={[
            styles.modalOverlay,
            { opacity: overlayOpacity }
          ]}
          activeOpacity={1}
          onPress={hideDrawer}
        >
          <Animated.View 
            style={[
              styles.drawer,
              {
                transform: [{ translateY }],
                height: Dimensions.get('window').height * 0.85,
                borderTopLeftRadius: 15,
                borderTopRightRadius: 15,
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.drawerHeader}>
                <View style={styles.drawerHandle} />
              </View>
              <ScrollView style={[styles.drawerContent, { marginBottom: 80 }]}>
                <Text style={styles.drawerTitle}>{selectedQual.name}</Text>
                <Text style={styles.drawerSubtitle}>
                  {selectedQual.accreditor}
                </Text>
                <Text style={styles.drawerExpiry}>
                  {selectedQual.category_name}
                </Text>
                <Text style={styles.drawerDescription}>
                  {selectedQual.intro}
                </Text>

                <View style={styles.formSection}>
                  <View style={styles.referenceContainer}>
                    <Text style={styles.formLabel}>Reference</Text>
                    <View style={[styles.inputContainer, referenceError && styles.inputError]}>
                      <TextInput
                        style={styles.input}
                        value={reference}
                        onChangeText={handleReferenceChange}
                        placeholder="Enter reference"
                        placeholderTextColor={Colors.blueDark + '80'}
                      />
                    </View>
                    {referenceError && (
                      <Text style={styles.errorText}>{referenceError}</Text>
                    )}
                  </View>

                  <View style={styles.dateRow}>
                    <View style={[styles.dateColumn, { flex: 0.40 }]}>
                      <Text style={styles.formLabel}>Achieved Date</Text>
                      <TouchableOpacity
                        style={[styles.dateButton, showDateError && styles.dateButtonError]}
                        onPress={() => setShowDatePicker(true)}
                      >
                        <Text style={styles.dateButtonText}>
                          {formatDisplayDate(achievedDate)}
                        </Text>
                      </TouchableOpacity>
                      {achievedDateError && (
                        <Text style={styles.errorText}>{achievedDateError}</Text>
                      )}
                    </View>

                    <View style={[styles.dateColumn, { flex: 0.3 }]}>
                      <View style={styles.renewsLabelContainer}>
                        <Text style={styles.formLabel}>Renews</Text>
                        <TouchableOpacity
                          onPress={() => setIsRenewsInfoVisible(true)}
                          style={styles.helpIcon}
                        >
                          <Ionicons name="help-circle-outline" size={20} color={Colors.blueDark} />
                        </TouchableOpacity>
                      </View>
                      <View style={[styles.renewsInputContainer, showRenewsError && styles.renewsInputError]}>
                        <TextInput
                          style={styles.renewsInput}
                          value={renewsMonths === null ? '' : renewsMonths.toString()}
                          onChangeText={handleRenewsChange}
                          keyboardType="numeric"
                          placeholder="∞"
                          placeholderTextColor={Colors.blueDark + '80'}
                        />
                      </View>
                      {showRenewsError && (
                        <Text style={styles.errorText}>Required</Text>
                      )}
                    </View>

                    <View style={[styles.dateColumn, { flex: 0.40 }]}>
                      <Text style={styles.formLabel}>Expiry Date</Text>
                      <View style={[styles.dateButton, styles.expiryDate]}>
                        <Text style={styles.dateButtonText}>
                          {renewsMonths === null ? 'Never' : formatDisplayDate(calculateExpiryDate(selectedQual.achieved ? new Date(selectedQual.achieved) : new Date(), renewsMonths) || new Date())}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {showDatePicker && (
                    <View style={styles.datePickerContainer}>
                      {Platform.OS === 'ios' && (
                        <TouchableOpacity
                          style={styles.datePickerDoneButton}
                          onPress={() => setShowDatePicker(false)}
                        >
                          <Text style={styles.datePickerDoneButtonText}>Done</Text>
                        </TouchableOpacity>
                      )}
                      <DateTimePicker
                        value={achievedDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onDateChange}
                        style={Platform.OS === 'ios' ? styles.iosDatePicker : undefined}
                        maximumDate={new Date()}
                      />
                    </View>
                  )}

                  <Modal
                    visible={isRenewsInfoVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setIsRenewsInfoVisible(false)}
                  >
                    <TouchableOpacity 
                      style={styles.helpModalOverlay}
                      activeOpacity={1}
                      onPress={() => setIsRenewsInfoVisible(false)}
                    >
                      <View style={styles.helpModalContent}>
                        <View style={styles.helpModalTitleContainer}>
                          <Ionicons name="help-circle-outline" size={24} color={Colors.blueDark} />
                          <Text style={styles.helpModalTitle}>Renews Information</Text>
                        </View>
                        <Text style={styles.helpModalText}>
                          This value indicates how often this qualification needs to be renewed.
                          The expiry date is automatically calculated based on the achieved date
                          and renewal period. If you leave the renewal period blank the qualification will never expire.
                        </Text>
                        <AnimatedButton 
                          style={styles.helpModalButton}
                          onPress={() => setIsRenewsInfoVisible(false)}
                        >
                          <Text style={styles.helpModalButtonText}>Got it</Text>
                        </AnimatedButton>
                      </View>
                    </TouchableOpacity>
                  </Modal>

                  <View style={styles.mediaSection}>
                    <View style={styles.labelRow}>
                      <Text style={styles.formLabel}>Evidence</Text>
                    </View>
                    <View style={styles.evidenceContainer}>
                      <View style={styles.evidenceButtons}>
                        <TouchableOpacity 
                          style={[styles.evidenceButton, showEvidenceError && styles.evidenceButtonError]} 
                          onPress={takePhoto}
                        >
                          <View style={styles.buttonIconContainer}>
                            <Ionicons name="camera" size={24} color={Colors.blueDark} />
                          </View>
                          <Text style={styles.evidenceButtonText}>Take Photo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.evidenceButton, showEvidenceError && styles.evidenceButtonError]} 
                          onPress={pickDocument}
                        >
                          <View style={styles.buttonIconContainer}>
                            <Ionicons name="document" size={24} color={Colors.blueDark} />
                          </View>
                          <Text style={styles.evidenceButtonText}>Upload File</Text>
                        </TouchableOpacity>
                      </View>
                      {showEvidenceError && (
                        <Text style={styles.evidenceErrorText}>At least one piece of evidence is required</Text>
                      )}
                      {renderImagePreview()}
                    </View>
                  </View>
                </View>

                {renderPreviewButtons()}
              </ScrollView>
              <View style={styles.buttonRow}>
                <AnimatedButton
                  style={styles.cancelButton}
                  onPress={hideDrawer}
                >
                  <View style={styles.cancelButtonContent}>
                    <Ionicons style={styles.cancelButtonIcon} name="chevron-down" size={20} color={Colors.blueDark} />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </View>
                </AnimatedButton>
                <AnimatedButton
                  style={styles.addButton}
                  onPress={handleAddQualification}
                >
                  <Text style={styles.addButtonText}>Add Qualification</Text>
                </AnimatedButton>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderImagePreview = () => {
    if (selectedMedia.length === 0 && !selectedDocument) return null;

    return (
      <View style={styles.evidencePreviewContainer}>
        <View style={styles.evidenceItemsRow}>
          {selectedMedia.map((media, index) => (
            <View style={styles.evidenceItemWrapper} key={index}>
              <View style={styles.evidenceItem}>
                <TouchableOpacity 
                  onPress={() => {
                    console.log('Debug - Thumbnail clicked');
                    console.log('Debug - High-res image URL:', media.highResUri);
                    if (media.highResUri) {
                      // Store current drawer state
                      const currentDrawerState: DrawerState = {
                        isVisible: isDrawerVisible,
                        selectedQual,
                        reference,
                        achievedDate,
                        renewsMonths,
                        selectedMedia,
                        selectedDocument
                      };
                      // Store in ref to preserve across preview
                      lastQualRef.current = currentDrawerState;
                      
                      // Hide drawer temporarily
                      setIsDrawerVisible(false);
                      
                      showPreview(media.highResUri, 'image', () => {
                        // Restore drawer state when preview closes
                        if (lastQualRef.current) {
                          const state = lastQualRef.current;
                          setSelectedQual(state.selectedQual);
                          setReference(state.reference);
                          setAchievedDate(state.achievedDate);
                          setRenewsMonths(state.renewsMonths);
                          setSelectedMedia(state.selectedMedia);
                          setSelectedDocument(state.selectedDocument);
                          setIsDrawerVisible(true);
                          Animated.spring(drawerAnimation, {
                            toValue: 1,
                            useNativeDriver: true,
                          }).start();
                        }
                      });
                    }
                  }}
                  style={styles.evidencePreview}
                >
                  <Image
                    source={{ uri: media.thumbnailUri }}
                    style={styles.evidenceImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => {
                    setSelectedMedia(prevMedia => prevMedia.filter(m => m.highResUri !== media.highResUri));
                  }}
                >
                  <Ionicons name="close" size={16} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {selectedDocument && (
            <View style={styles.evidenceItemWrapper}>
              <View style={styles.evidenceItem}>
                <TouchableOpacity 
                  onPress={() => {
                    // Store current drawer state
                    const currentDrawerState: DrawerState = {
                      isVisible: isDrawerVisible,
                      selectedQual,
                      reference,
                      achievedDate,
                      renewsMonths,
                      selectedMedia,
                      selectedDocument
                    };
                    // Store in ref to preserve across preview
                    lastQualRef.current = currentDrawerState;
                    
                    // Hide drawer temporarily
                    setIsDrawerVisible(false);
                    
                    showPreview(selectedDocument, 'pdf', () => {
                      // Restore drawer state when preview closes
                      if (lastQualRef.current) {
                        const state = lastQualRef.current;
                        setSelectedQual(state.selectedQual);
                        setReference(state.reference);
                        setAchievedDate(state.achievedDate);
                        setRenewsMonths(state.renewsMonths);
                        setSelectedMedia(state.selectedMedia);
                        setSelectedDocument(state.selectedDocument);
                        setIsDrawerVisible(true);
                        Animated.spring(drawerAnimation, {
                          toValue: 1,
                          useNativeDriver: true,
                        }).start();
                      }
                    });
                  }}
                  style={styles.evidencePreview}
                >
                  <View style={styles.pdfPreviewContainer}>
                    <Ionicons name="document-text" size={32} color={Colors.blueDark} />
                    <Text style={styles.pdfPreviewText}>PDF</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => {
                    setSelectedDocument(null);
                  }}
                >
                  <Ionicons name="close" size={16} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderMediaSection = () => (
    <View style={styles.mediaSection}>
      <View style={styles.labelRow}>
        <Text style={styles.formLabel}>Evidence</Text>
      </View>
      <View style={styles.evidenceContainer}>
        <View style={styles.evidenceButtons}>
          <TouchableOpacity 
            style={[styles.evidenceButton, showEvidenceError && styles.evidenceButtonError]} 
            onPress={takePhoto}
          >
            <View style={styles.buttonIconContainer}>
              <Ionicons name="camera" size={24} color={Colors.blueDark} />
            </View>
            <Text style={styles.evidenceButtonText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.evidenceButton, showEvidenceError && styles.evidenceButtonError]} 
            onPress={pickDocument}
          >
            <View style={styles.buttonIconContainer}>
              <Ionicons name="document" size={24} color={Colors.blueDark} />
            </View>
            <Text style={styles.evidenceButtonText}>Upload File</Text>
          </TouchableOpacity>
        </View>
        {showEvidenceError && (
          <Text style={styles.evidenceErrorText}>At least one piece of evidence is required</Text>
        )}
        {renderImagePreview()}
      </View>
    </View>
  );

  const filteredQualifications = useMemo(() => {
    const searchLower = searchText.toLowerCase();
    if (activeTab === 'achieved') {
      return qualifications.filter(qual => 
        qual.name.toLowerCase().includes(searchLower) ||
        qual.reference?.toLowerCase().includes(searchLower) ||
        String(qual.expires_months).includes(searchLower)
      );
    } else {
      return pullJson('req_quals').filter(qual =>
        qual.name.toLowerCase().includes(searchLower) ||
        qual.intro.toLowerCase().includes(searchLower) ||
        qual.category_name.toLowerCase().includes(searchLower) ||
        String(qual.expires_months).includes(searchLower)
      ) as Qualification[];
    }
  }, [searchText, activeTab, qualifications]);

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

      if (filteredQualifications.length === 0) {
        return (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No matches found</Text>
            <Text style={styles.emptyStateSubtext}>Try adjusting your search</Text>
          </View>
        );
      }
      
      return (
        <ScrollView style={styles.scrollView}>
          {qualifications.map((qual, index) => (
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

    return (
      <ScrollView style={styles.scrollView}>
        {filteredQualifications.map((qual, index) => (
          <AnimatedButton 
            key={index}
            style={styles.qualificationButton} 
            onPress={() => showDrawer(qual)}
          >
            <View style={styles.qualificationContent}>
              <View style={styles.qualificationRow}>
                <Text style={[styles.qualificationName, { flex: 1 }]}>{qual.name}</Text>
              </View>
              <Text style={styles.qualificationCompany}>
                {qual.comp_requests?.map(req => req.creator_name).join(', ') || 'No companies requesting'}
              </Text>
            </View>
          </AnimatedButton>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/bg-light.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
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
              source={require('../../assets/images/bg-gradient.png')}
              style={styles.headerBackground}
              resizeMode="cover"
            />
            <View style={styles.headerRow}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => router.back()}
                activeOpacity={1}
              >
                <Ionicons name="chevron-back" size={20} color={Colors.white} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Qualifications</Text>
              <TouchableOpacity 
                style={styles.helpButton}
                onPress={() => setIsHelpModalVisible(true)}
                activeOpacity={1}
              >
                <Ionicons name="help-circle-outline" size={23} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color={Colors.blueDark} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search qualifications..."
                placeholderTextColor={Colors.blueDark}
                value={searchText}
                onChangeText={setSearchText}
              />
              {searchText.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={() => setSearchText('')}
                  activeOpacity={1}
                >
                  <Ionicons name="close-circle" size={20} color={Colors.blueDark} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[
                styles.tabButton,
                activeTab === 'achieved' && styles.activeTabButton
              ]}
              activeOpacity={1}
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
              activeOpacity={1}
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
      <AnimatedButton style={styles.fab}>
        <Ionicons name="add" size={24} color={Colors.white} />
      </AnimatedButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundImage: require('../../assets/images/bg-light.jpg'),
    backgroundAttachment: 'fixed',
    marginTop: -35,
  },
  backgroundImage: {
    position: 'absolute',
    top: 115,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '90%',
    opacity: 1,
    zIndex: 0,
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
    paddingTop: 5,
    paddingHorizontal: 15,
    backgroundColor: 'transparent',
    paddingBottom: 0,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    paddingHorizontal: 15,
    paddingTop: 15,
    marginTop: 0,
    marginBottom: 8,
    gap: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${Colors.blueDark}50`,
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
    color: Colors.blueDark,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: 'MavenPro-Regular',
    color: '#999999',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 5,
    paddingTop: 2,
    paddingBottom: 0,
    marginBottom: -35,
    marginHorizontal: -5,
  },
  qualificationButton: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qualificationContent: {
    flex: 1,
    gap: 6,
    // backgroundColor: 'green',
    // padding: 0,
  },
  qualificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qualificationName: {
    fontSize: 16,
    color: Colors.blueDark,
    fontFamily: 'MavenPro-Medium',
    // backgroundColor: 'red',
  },
  qualificationDate: {
    fontSize: 14,
    color: Colors.blueDark,
    fontFamily: 'MavenPro-Regular',
  },
  qualificationCompany: {
    fontSize: 14,
    color: Colors.blueDark,
    fontFamily: 'MavenPro-Regular',
    flex: 1,
    backgroundColor: 'white',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  errorText: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -8 }],
    color: Colors.red,
    fontSize: 12,
    fontFamily: 'MavenPro-Regular',
    backgroundColor: Colors.white,
    paddingHorizontal: 4,
    zIndex: 1,
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
    paddingVertical: 12,
  },
  drawerHandle: {
    width: 36,
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
    color: Colors.blueDark,
    marginBottom: 15,
  },
  drawerSubtitle: {
    fontSize: 18,
    fontFamily: 'MavenPro-Medium',
    color: Colors.blueDark,
    marginBottom: 5,
  },
  drawerExpiry: {
    fontSize: 16,
    fontFamily: 'MavenPro-Regular',
    color: Colors.blueDark,
    marginBottom: 15,
  },
  drawerDescription: {
    fontSize: 16,
    fontFamily: 'MavenPro-Regular',
    color: Colors.blueDark,
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
  helpModalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 5,
  },
  helpModalTitle: {
    fontSize: 22,
    fontFamily: 'MavenPro-Mediium',
    color: Colors.blueDark,
  },
  helpModalText: {
    fontSize: 16,
    fontFamily: 'MavenPro-Regular',
    color: Colors.blueDark,
    lineHeight: 24,
    marginBottom: 20,
  },
  helpModalButton: {
    backgroundColor: Colors.blueDark,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  helpModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'MavenPro-Medium',
  },
  previewContainer: {
    position: 'absolute',
    top: 70,
    right: 20,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
    minWidth: 200,
  },
  previewButtons: {
    gap: 10,
  },
  previewButton: {
    backgroundColor: Colors.blueDark,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  previewButtonText: {
    color: Colors.white,
    fontSize: 14,
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
  buttonRow: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    alignItems: 'center',
    width: '100%',
    paddingEnd: 10,
    backgroundColor: 'white',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 8,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.blueDark,
    minWidth: '30%',
  },
  cancelButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'center',
  },
  cancelButtonIcon: {
    marginRight: 4,
  },
  cancelButtonText: {
    color: Colors.blueDark,
    fontSize: 16,
    fontFamily: 'MavenPro-Medium',
  },
  addButton: {
    flex: 3,
    backgroundColor: Colors.blueDark,
    borderRadius: 8,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: '60%',
    position: 'relative',
    right: -17,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: 'MavenPro-Medium',
  },
  searchContainer: {
    paddingHorizontal: 15,
    paddingBottom: 0,
    marginTop: -85,
    backgroundColor: 'transparent',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 5,
    height: 45,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'MavenPro-Regular',
    color: Colors.blueDark,
    padding: 8,
    paddingLeft: 0,
  },
  clearButton: {
    padding: 5,
    marginRight: -8,
  },
  fab: {
    position: 'absolute',
    right: 30,
    bottom: 30,
    width: 50,
    height: 50,
    borderRadius: 28,
    backgroundColor: Colors.blueDark,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  qualificationBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  achievedDate: {
    position: 'absolute',
    right: 25,
    color: Colors.blueDark,
    fontSize: 14,
    fontFamily: 'MavenPro-Regular',
  },
  checkCircle: {
    marginLeft: 'auto',
  },
  showDebugButton: {
    position: 'absolute',
    top: -10,
    right: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    zIndex: 2000,
  },
  showDebugText: {
    color: Colors.blueDark,
    fontSize: 14,
    fontFamily: 'MavenPro-Medium',
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  debugTitle: {
    fontSize: 16,
    fontFamily: 'MavenPro-Medium',
    color: Colors.blueDark,
  },
  hideDebugButton: {
    padding: 4,
  },
  formSection: {
    marginTop: 0,
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontFamily: 'MavenPro-Medium',
    color: Colors.blueDark,
    marginBottom: 8,
  },
  referenceContainer: {
    marginBottom: 20,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'MavenPro-Regular',
    color: Colors.blueDark,
    borderWidth: 1,
    borderColor: Colors.blueDark + '20',
  },
  inputError: {
    borderColor: Colors.red,
    borderWidth: 1,
    borderRadius: 8,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateColumn: {
    height: 80,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.blueDark + '20',
    height: 46,
  },
  dateButtonText: {
    fontSize: 16,
    fontFamily: 'MavenPro-Regular',
    color: Colors.blueDark,
  },
  renewsLabelContainer: {
    marginBottom: 0,
  },
  helpIcon: {
    padding: 2,
    top: -2,
    right: 0,
    position: 'absolute',
  },
  expiryDate: {
    backgroundColor: Colors.blueDark + '10',
  },
  infoModalContent: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    alignSelf: 'center',
    marginTop: '40%',
  },
  infoModalTitle: {
    fontSize: 18,
    fontFamily: 'MavenPro-Medium',
    color: Colors.blueDark,
    marginBottom: 12,
  },
  infoModalText: {
    fontSize: 16,
    fontFamily: 'MavenPro-Regular',
    color: Colors.blueDark,
    lineHeight: 24,
    marginBottom: 20,
  },
  infoModalButton: {
    backgroundColor: Colors.blueDark,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  infoModalButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: 'MavenPro-Medium',
  },
  datePickerContainer: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.blueDark + '20',
  },
  datePickerDoneButton: {
    alignSelf: 'flex-end',
    padding: 12,
    position: 'absolute',
    zIndex: 1000,
  },
  datePickerDoneButtonText: {
    color: Colors.blueDark,
    fontSize: 16,
    fontFamily: 'MavenPro-Medium',
  },
  iosDatePicker: {
    height: 200,
    marginTop: -10,
  },
  mediaSection: {
    marginTop: 0,
  },
  evidenceContainer: {
    marginTop: -10,
    // backgroundColor: 'red',
  },
  evidenceButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  evidenceButton: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.blueDark + '20',
  },
  buttonIconContainer: {
    marginBottom: 0,
  },
  evidenceButtonText: {
    fontSize: 12,
    fontFamily: 'MavenPro-Medium',
    color: Colors.blueDark,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontFamily: 'MavenPro-Medium',
    color: Colors.blueDark,
    marginBottom: 8,
  },
  dateButtonError: {
    borderColor: Colors.red,
    borderWidth: 1,
  },
  renewsInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
  },
  renewsInput: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'MavenPro-Regular',
    color: Colors.blueDark,
    borderWidth: 1,
    borderColor: Colors.blueDark + '20',
  },
  evidencePreviewContainer: {
    marginTop: 0,
    width: '100%',
  },
  evidenceItemsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  evidenceItemWrapper: {
    width: 65,
    height: 65,
  },
  evidenceItem: {
    position: 'relative',
    width: '100%',
    height: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.blueDark + '20',
  },
  evidencePreview: {
    width: '100%',
    height: '100%',
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.blueDark,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  pdfPreviewContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.blueDark + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfPreviewText: {
    fontSize: 12,
    fontFamily: 'MavenPro-Medium',
    color: Colors.blueDark,
    marginTop: 4,
  },
  evidenceErrorText: {
    color: Colors.red,
    fontSize: 12,
    fontFamily: 'MavenPro-Regular',
    marginTop: 0
  },
  evidenceButtonError: {
    borderColor: Colors.red,
    borderWidth: 1,
  },
  renewsInputError: {
    borderColor: Colors.red,
    borderWidth: 1,
  },
}); 