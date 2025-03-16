import React, { useRef } from 'react';
import { TouchableOpacity, Animated, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';

interface AnimatedButtonProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  activeOpacity?: number;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  onPress,
  style,
  children,
  activeOpacity = 1
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 5
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 5
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={activeOpacity}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}; 