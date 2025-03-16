import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Dimensions, Linking, Text } from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode, Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import ImageViewer from 'react-native-image-zoom-viewer';
import * as ScreenOrientation from 'expo-screen-orientation';
import Slider from '@react-native-community/slider';
import { Colors } from '../constants/styles';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

type MediaType = 'image' | 'video' | 'audio' | 'pdf';

interface MediaPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: MediaType;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  visible,
  onClose,
  mediaUrl,
  mediaType,
}) => {
  const [sound, setSound] = React.useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [position, setPosition] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [isSeeking, setIsSeeking] = React.useState(false);
  const [orientation, setOrientation] = React.useState<ScreenOrientation.Orientation>(ScreenOrientation.Orientation.PORTRAIT_UP);

  // Update position while playing
  React.useEffect(() => {
    if (sound && isPlaying && !isSeeking) {
      const interval = setInterval(async () => {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          setPosition(status.positionMillis);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [sound, isPlaying, isSeeking]);

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = async (value: number) => {
    if (sound) {
      await sound.setPositionAsync(value);
      setPosition(value);
    }
  };

  const handleClose = async () => {
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
      } catch (error) {
        console.error('Error stopping audio:', error);
      }
    }
    onClose();
  };

  // Handle screen orientation changes
  React.useEffect(() => {
    if (visible && mediaType === 'video') {
      const handleOrientation = async () => {
        const currentOrientation = await ScreenOrientation.getOrientationAsync();
        setOrientation(currentOrientation);
      };

      const subscription = ScreenOrientation.addOrientationChangeListener(() => {
        handleOrientation();
      });

      // Get initial orientation
      handleOrientation();

      // Unlock screen orientation for videos
      ScreenOrientation.unlockAsync();

      return () => {
        subscription.remove();
        // Reset orientation state
        setOrientation(ScreenOrientation.Orientation.PORTRAIT_UP);
        // Lock back to portrait when modal closes
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      };
    } else {
      // Reset orientation when modal is not visible or not showing video
      setOrientation(ScreenOrientation.Orientation.PORTRAIT_UP);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
  }, [visible, mediaType]);

  // Initialize audio when modal opens
  React.useEffect(() => {
    if (visible && mediaType === 'audio') {
      loadAudio();
    }
  }, [visible, mediaType]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
      }
    };
  }, [sound]);

  const loadAudio = async () => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: mediaUrl },
        { shouldPlay: true }
      );
      
      const status = await newSound.getStatusAsync();
      if (status.isLoaded) {
        setDuration(status.durationMillis || 0);
      }
      
      setSound(newSound);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error loading audio:', error);
    }
  };

  const handlePlayPause = async () => {
    try {
      if (!sound) {
        await loadAudio();
      }

      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
        } else {
          await sound.playAsync();
        }
        setIsPlaying(!isPlaying);
      }
    } catch (error) {
      console.error('Error playing/pausing audio:', error);
    }
  };

  const handlePDFOpen = async () => {
    try {
      await Linking.openURL(mediaUrl);
    } catch (error) {
      console.error('Error opening PDF:', error);
    }
  };

  const getOrientationStyle = () => {
    switch (orientation) {
      case ScreenOrientation.Orientation.LANDSCAPE_LEFT:
        return {
          width: height,
          height: width,
          transform: [{ rotate: '0deg' }],
        };
      case ScreenOrientation.Orientation.LANDSCAPE_RIGHT:
        return {
          width: height,
          height: width,
          transform: [{ rotate: '0deg' }],
        };
      default:
        return {
          width: width,
          height: height,
        };
    }
  };
  

  const renderAudioPlayer = () => (
    <View style={styles.audioContainer}>
      <TouchableOpacity onPress={handlePlayPause} style={styles.playButton} activeOpacity={1}>
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={50}
          color={Colors.blueDark}
        />
      </TouchableOpacity>
      <View style={styles.playheadContainer}>
        <Text style={styles.timeText}>{formatTime(position)}</Text>
        <Slider
          style={styles.slider}
          value={position}
          minimumValue={0}
          maximumValue={duration}
          minimumTrackTintColor={Colors.blueDark}
          maximumTrackTintColor={Colors.blueLight}
          thumbTintColor={Colors.blueDark}
          onSlidingStart={() => setIsSeeking(true)}
          onSlidingComplete={(value: number) => {
            setIsSeeking(false);
            handleSeek(value);
          }}
        />
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>
    </View>
  );

  const renderMediaContent = () => {
    switch (mediaType) {
      case 'image':
        return (
          <View style={[styles.mediaContent, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }]}>
            <ImageViewer
              imageUrls={[{ url: mediaUrl }]}
              enableSwipeDown={true}
              onSwipeDown={handleClose}
              backgroundColor="transparent"
              renderIndicator={() => <View />}
              enableImageZoom={true}
              saveToLocalByLongPress={false}
              style={{ width: '100%', height: '100%' }}
              renderImage={(props) => (
                <Image
                  {...props}
                  style={[props.style, { width: '100%', height: '100%', resizeMode: 'contain' }]}
                  contentFit="contain"
                />
              )}
            />
          </View>
        );
      case 'video':
        return (
          <View style={[styles.mediaContent, getOrientationStyle()]}>
            <View style={styles.videoContainer}>
              <Video
                source={{ uri: mediaUrl }}
                style={styles.video}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                isLooping
                shouldPlay
                isMuted={false}
                onError={(error) => console.error('Video error:', error)}
              />
            </View>
          </View>
        );
      case 'audio':
        return renderAudioPlayer();
      case 'pdf':
        return (
          <View style={styles.pdfContainer}>
            <WebView
              source={{ uri: mediaUrl }}
              style={styles.webview}
              originWhitelist={['file://*']}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('WebView error: ', nativeEvent);
              }}
            />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      <View style={[styles.modalContainer, { zIndex: 999 }]}>
        <TouchableOpacity 
          style={[
            styles.closeButton,
            { zIndex: 1000 }
          ]}
          onPress={handleClose}
          activeOpacity={0.8}
        >
          <View style={styles.closeButtonInner}>
            <Ionicons name="close" size={24} color="#fff" />
          </View>
        </TouchableOpacity>
        {renderMediaContent()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1000,
  },
  closeButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaContent: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.black,
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.black,
  },
  audioContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  playButton: {
    marginBottom: 20,
  },
  playheadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  slider: {
    flex: 1,
    marginHorizontal: 10,
  },
  timeText: {
    color: Colors.blueDark,
    fontFamily: 'MavenPro-Regular',
    fontSize: 12,
  },
  pdfContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
  },
  webview: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
}); 