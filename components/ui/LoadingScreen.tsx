import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading...' }) => {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={{ color: Colors.onSurfaceMuted, marginTop: 16, fontSize: 14, fontFamily: 'sans-serif' }}>
        {message}
      </Text>
    </View>
  );
};
