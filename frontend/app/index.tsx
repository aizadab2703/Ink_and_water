import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const inkScale = useMemo(() => new Animated.Value(0), []);
  const inkOpacity = useMemo(() => new Animated.Value(0), []);
  const insets = useSafeAreaInsets();
  const [showInk, setShowInk] = useState(false);

  useEffect(() => {
    // Fade in the title
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start(() => {
      // Show ink drop after title appears
      setShowInk(true);
      
      // Animate ink drop
      Animated.parallel([
        Animated.timing(inkScale, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(inkOpacity, {
            toValue: 0.8,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(inkOpacity, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });

    // Navigate to canvas after 2 seconds
    const timer = setTimeout(() => {
      router.replace('/canvas');
    }, 2500);

    return () => clearTimeout(timer);
  }, [fadeAnim, inkScale, inkOpacity]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Animated water shimmer background */}
      <View style={styles.waterBg}>
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="waterGrad" cx="50%" cy="50%" r="80%">
              <Stop offset="0%" stopColor="#0f1a2a" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#0a0a0f" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx={width / 2} cy={height / 2} rx={width * 0.8} ry={height * 0.5} fill="url(#waterGrad)" />
        </Svg>
      </View>

      {/* Ink drop animation */}
      {showInk && (
        <Animated.View
          style={[
            styles.inkDrop,
            {
              opacity: inkOpacity,
              transform: [{ scale: inkScale }],
            },
          ]}
        >
          <Svg width={200} height={200}>
            <Defs>
              <RadialGradient id="inkGrad" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#4361ee" stopOpacity="0.9" />
                <Stop offset="50%" stopColor="#4361ee" stopOpacity="0.5" />
                <Stop offset="100%" stopColor="#4361ee" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx={100} cy={100} r={90} fill="url(#inkGrad)" />
          </Svg>
        </Animated.View>
      )}

      {/* App title */}
      <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>
        Ink & Water
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  title: {
    fontSize: 42,
    fontWeight: '200',
    color: '#ffffff',
    letterSpacing: 4,
  },
  inkDrop: {
    position: 'absolute',
    width: 200,
    height: 200,
  },
});
