import React, { useEffect } from 'react';
import { Drawer } from 'expo-router/drawer';
import { useColorScheme } from '@/hooks/useColorScheme';
import { MediaPreviewProvider } from '../contexts/MediaPreviewContext';
import { MediaPreviewModal } from '../components/MediaPreviewModal';
import { useMediaPreview } from '../contexts/MediaPreviewContext';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { 
  useFonts,
  MavenPro_400Regular,
  MavenPro_500Medium,
  MavenPro_700Bold,
} from '@expo-google-fonts/maven-pro';
import Toast from 'react-native-toast-message';
import { CustomDrawerContent } from '../components/CustomDrawerContent';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isVisible, currentMedia, hidePreview } = useMediaPreview();
  
  const [fontsLoaded, fontError] = useFonts({
    'MavenPro-Regular': MavenPro_400Regular,
    'MavenPro-Medium': MavenPro_500Medium,
    'MavenPro-Bold': MavenPro_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Hide splash screen once fonts are loaded or if there's an error
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <Drawer
        screenOptions={{
          headerShown: false,
          drawerStyle: {
            backgroundColor: '#fff',
            width: 280,
          },
        }}
        drawerContent={(props) => <CustomDrawerContent {...props} />}
      >
        <Drawer.Screen 
          name="(tabs)"
          options={{
            drawerLabel: 'Home',
            headerShown: false,
          }}
        />
      </Drawer>
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
  return (
    <MediaPreviewProvider>
      <RootLayoutNav />
      <Toast />
    </MediaPreviewProvider>
  );
}
