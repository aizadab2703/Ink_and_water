import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { getColorByName } from '../constants/colors';

const { width, height } = Dimensions.get('window');

interface UnlockOverlayProps {
  colors: string[];
  onDismiss: () => void;
}

export default function UnlockOverlay({ colors, onDismiss }: UnlockOverlayProps) {
  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const scaleAnim = useMemo(() => new Animated.Value(0.5), []);
  const bloomAnim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Bloom pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(bloomAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(bloomAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Auto dismiss after 3 seconds
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(onDismiss);
    }, 3000);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, bloomAnim, onDismiss]);

  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(onDismiss);
  };

  const firstColor = getColorByName(colors[0]);

  return (
    <TouchableWithoutFeedback onPress={handleDismiss}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Background bloom */}
        <Animated.View
          style={[
            styles.bloomContainer,
            {
              opacity: bloomAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.6, 0.9],
              }),
              transform: [
                { scale: scaleAnim },
                {
                  scale: bloomAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.3],
                  }),
                },
              ],
            },
          ]}
        >
          <Svg width={300} height={300}>
            <Defs>
              <RadialGradient id="unlockGrad" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={firstColor?.hex || '#ffffff'} stopOpacity="0.8" />
                <Stop offset="50%" stopColor={firstColor?.hex || '#ffffff'} stopOpacity="0.4" />
                <Stop offset="100%" stopColor={firstColor?.hex || '#ffffff'} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx={150} cy={150} r={140} fill="url(#unlockGrad)" />
          </Svg>
        </Animated.View>

        {/* Content */}
        <Animated.View style={[styles.content, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.unlockLabel}>NEW COLOR{colors.length > 1 ? 'S' : ''}</Text>
          <View style={styles.colorList}>
            {colors.map((colorName) => {
              const color = getColorByName(colorName);
              return (
                <View key={colorName} style={styles.colorItem}>
                  <View
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: color?.hex || '#fff' },
                    ]}
                  />
                  <Text style={styles.colorName}>{colorName}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.tapHint}>Tap anywhere to continue</Text>
        </Animated.View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 15, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bloomContainer: {
    position: 'absolute',
    width: 300,
    height: 300,
  },
  content: {
    alignItems: 'center',
    gap: 30,
  },
  unlockLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#ffffff50',
    letterSpacing: 6,
    textTransform: 'uppercase',
  },
  colorList: {
    alignItems: 'center',
    gap: 20,
  },
  colorItem: {
    alignItems: 'center',
    gap: 12,
  },
  colorSwatch: {
    width: 50,
    height: 50,
    borderRadius: 25,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  colorName: {
    fontSize: 24,
    fontWeight: '200',
    color: '#ffffff',
    letterSpacing: 4,
  },
  tapHint: {
    marginTop: 30,
    fontSize: 12,
    fontWeight: '300',
    color: '#ffffff40',
    letterSpacing: 2,
  },
});
