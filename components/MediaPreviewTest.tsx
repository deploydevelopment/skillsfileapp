import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useMediaPreview } from '../contexts/MediaPreviewContext';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import * as Progress from 'react-native-progress';
import { Colors, Typography } from '../constants/styles';

// Dynamic imports for test media
const testMedia = {
  image: require('../assets/test_media/img1.jpg'),
  video: require('../assets/test_media/vid1.mp4'),
  audio: require('../assets/test_media/test.mp3'),
  pdf: require('../assets/test_media/Example PDF.pdf'),
};

export const MediaPreviewTest: React.FC = () => {
  const { showPreview } = useMediaPreview();

  const handlePreview = async (type: 'image' | 'video' | 'audio' | 'pdf') => {
    try {
      if (type === 'pdf') {
        // For PDFs, we need to copy the file to the cache directory
        const asset = Asset.fromModule(testMedia[type]);
        await asset.downloadAsync();
        if (asset.localUri) {
          const fileName = 'Example PDF.pdf';
          const destination = `${FileSystem.cacheDirectory}${fileName}`;
          await FileSystem.copyAsync({
            from: asset.localUri,
            to: destination
          });
          showPreview(destination, type);
        }
      } else {
        // For other media types, use the asset directly
        const asset = Asset.fromModule(testMedia[type]);
        await asset.downloadAsync();
        if (asset.localUri) {
          showPreview(asset.localUri, type);
        }
      }
    } catch (error) {
      console.error('Error loading media:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => handlePreview('image')}
        >
          <Text style={styles.buttonText}>Image</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => handlePreview('video')}
        >
          <Text style={styles.buttonText}>Video</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => handlePreview('audio')}
        >
          <Text style={styles.buttonText}>Audio</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => handlePreview('pdf')}
        >
          <Text style={styles.buttonText}>PDF</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>Nothing to upload</Text>
        <Progress.Bar 
          progress={0} 
          width={null} 
          height={8}
          color={Colors.blueMid}
          unfilledColor={Colors.grayLight}
          borderWidth={0}
          borderRadius={4}
          style={styles.progressBar}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    backgroundColor: Colors.blueDark,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: 'MavenPro-Medium',
  },
  progressContainer: {
    width: '100%',
  },
  progressText: {
    fontSize: 14,
    color: Colors.charcoal,
    fontFamily: 'MavenPro-Regular',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
  },
}); 