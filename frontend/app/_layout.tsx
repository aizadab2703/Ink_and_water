import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppProvider } from '../src/context/AppContext';

// Initialize storage with default values
const initializeStorage = async () => {
  try {
    const existingData = await AsyncStorage.getItem('ink_water_data');
    if (!existingData) {
      const defaultData = {
        sessions_count: 0,
        unlocked_colors: ['Red', 'Blue', 'Yellow'],
        saved_artworks: [],
        color_mixes: 0,
      };
      await AsyncStorage.setItem('ink_water_data', JSON.stringify(defaultData));
    }
    // Increment session count on each app open
    const data = JSON.parse(await AsyncStorage.getItem('ink_water_data') || '{}');
    data.sessions_count = (data.sessions_count || 0) + 1;
    await AsyncStorage.setItem('ink_water_data', JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('Error initializing storage:', error);
    return null;
  }
};

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initializeStorage().then(() => setIsReady(true));
  }, []);

  if (!isReady) {
    return <View style={styles.loading} />;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <AppProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            animationDuration: 500,
            contentStyle: { backgroundColor: '#0a0a0f' },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="canvas" />
          <Stack.Screen 
            name="gallery" 
            options={{ 
              animation: 'slide_from_right',
              animationDuration: 400,
            }} 
          />
        </Stack>
      </AppProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  loading: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
});
