import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { Colors } from '../../constants/styles';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

export default function ShareScreen() {
  const navigation = useNavigation();
  const slideAnim = useRef(new Animated.Value(0)).current;
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

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          transform: [{ translateX: slideAnim }]
        }
      ]}
    >
      <Text style={styles.text}>Share Coming Soon</Text>
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