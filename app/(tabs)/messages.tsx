import React, { useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { Colors } from '../../constants/styles';
import { useFocusEffect } from '@react-navigation/native';

export default function MessagesScreen() {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    React.useCallback(() => {
      // Reset animation to initial value
      slideAnim.setValue(Dimensions.get('window').width);
      
      // Slide in from right
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();

      return () => {
        // Slide out to left
        Animated.timing(slideAnim, {
          toValue: -Dimensions.get('window').width,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }).start();
      };
    }, [])
  );

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          transform: [{ translateX: slideAnim }]
        }
      ]}
    >
      <Text style={styles.text}>Messages Coming Soon</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  text: {
    fontFamily: 'MavenPro-Medium',
    fontSize: 18,
    color: Colors.charcoal,
  },
}); 