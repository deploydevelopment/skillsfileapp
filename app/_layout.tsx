import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { MediaPreviewProvider } from '../contexts/MediaPreviewContext';
import { MediaPreviewModal } from '../components/MediaPreviewModal';
import { useMediaPreview } from '../contexts/MediaPreviewContext';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isVisible, currentMedia, hidePreview } = useMediaPreview();
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Hide splash screen after a short delay to ensure everything is loaded
    const hideSplash = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await SplashScreen.hideAsync();
    };
    hideSplash();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
      {currentMedia && (
        <MediaPreviewModal
          visible={isVisible}
          onClose={hidePreview}
          mediaUrl={currentMedia.url}
          mediaType={currentMedia.type}
        />
      )}
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <MediaPreviewProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <RootLayoutNav />
      </ThemeProvider>
    </MediaPreviewProvider>
  );
}
