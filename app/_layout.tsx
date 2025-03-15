import React, { useEffect } from 'react';
import { Drawer } from 'expo-router/drawer';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { MediaPreviewProvider } from '../contexts/MediaPreviewContext';
import { MediaPreviewModal } from '../components/MediaPreviewModal';
import { useMediaPreview } from '../contexts/MediaPreviewContext';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View, Image, TouchableOpacity, Text } from 'react-native';
import { Colors } from '../constants/styles';
import { 
  useFonts,
  MavenPro_400Regular,
  MavenPro_500Medium,
  MavenPro_700Bold,
} from '@expo-google-fonts/maven-pro';
import { Ionicons } from '@expo/vector-icons';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import Toast from 'react-native-toast-message';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function CustomDrawerContent(props: DrawerContentComponentProps) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.blueDark, paddingTop: 60, paddingHorizontal: 20 }}>
      <TouchableOpacity 
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 15,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255, 255, 255, 0.1)',
          opacity: 0.5, // Indicate inactive state
        }}
        onPress={() => {}}
      >
        <Ionicons name="id-card-outline" size={24} color="#FFFFFF" style={{ marginRight: 15 }} />
        <Text style={{ fontSize: 16, fontFamily: 'MavenPro-Regular', color: '#FFFFFF' }}>My Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 15,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255, 255, 255, 0.1)',
          opacity: 0.5, // Indicate inactive state
        }}
        onPress={() => {}}
      >
        <Ionicons name="people-circle-outline" size={24} color="#FFFFFF" style={{ marginRight: 15 }} />
        <Text style={{ fontSize: 16, fontFamily: 'MavenPro-Regular', color: '#FFFFFF' }}>Invite a Friend</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 15,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255, 255, 255, 0.1)',
          opacity: 0.5, // Indicate inactive state
        }}
        onPress={() => {}}
      >
        <Ionicons name="rocket-outline" size={24} color="#FFFFFF" style={{ marginRight: 15 }} />
        <Text style={{ fontSize: 16, fontFamily: 'MavenPro-Regular', color: '#FFFFFF' }}>Find Training</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 15,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255, 255, 255, 0.1)',
          opacity: 0.5, // Indicate inactive state
        }}
        onPress={() => {}}
      >
        <Ionicons name="alert-circle-outline" size={24} color="#FFFFFF" style={{ marginRight: 15 }} />
        <Text style={{ fontSize: 16, fontFamily: 'MavenPro-Regular', color: '#FFFFFF' }}>About SkillsFile</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 15,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        }}
        onPress={() => {
          props.navigation.navigate('(tabs)', {
            screen: 'table'
          });
          props.navigation.closeDrawer();
        }}
      >
        <Ionicons name="bug" size={24} color="#FFFFFF" style={{ marginRight: 15 }} />
        <Text style={{ fontSize: 16, fontFamily: 'MavenPro-Regular', color: '#FFFFFF' }}>View Storage</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 15,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255, 255, 255, 0.1)',
          opacity: 0.5, // Indicate inactive state
        }}
        onPress={() => {}}
      >
        <Ionicons name="log-out-outline" size={24} color="#FFFFFF" style={{ marginRight: 15 }} />
        <Text style={{ fontSize: 16, fontFamily: 'MavenPro-Regular', color: '#FFFFFF' }}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

function RootLayoutNav() {
  const { isVisible, currentMedia, hidePreview } = useMediaPreview();
  const colorScheme = useColorScheme();
  
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
          drawerPosition: 'right',
          drawerStyle: {
            backgroundColor: Colors.blueDark,
            width: 280,
          }
        }}
        drawerContent={(props: DrawerContentComponentProps) => <CustomDrawerContent {...props} />}
      >
        <Drawer.Screen name="(tabs)" options={{ headerShown: false }} />
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
  const colorScheme = useColorScheme();

  return (
    <MediaPreviewProvider>
      <RootLayoutNav />
      <Toast />
    </MediaPreviewProvider>
  );
}
