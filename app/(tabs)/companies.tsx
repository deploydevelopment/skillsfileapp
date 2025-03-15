import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/styles';

export default function CompaniesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Companies Coming Soon</Text>
    </View>
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