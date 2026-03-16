import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop, Rect, Ellipse } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import { ALL_COLORS, getColorByName, getMixedColor, ColorConfig } from '../src/constants/colors';
import UnlockOverlay from '../src/components/UnlockOverlay';

const { width, height } = Dimensions.get('window');
const FADE_DURATION = 180000; // 3 minutes in ms
const CURRENT_SHIFT_INTERVAL = 8000; // 8 seconds - faster shifts

// Ink size options
const INK_SIZES = {
  small: { size: 40, label: 'S' },
  medium: { size: 70, label: 'M' },
  large: { size: 110, label: 'L' },
};

// Water color options
const WATER_COLORS = [
  { name: 'Black', bg: '#0a0a0f', shimmer: '#0f1a2a' },
  { name: 'Blue', bg: '#0a1020', shimmer: '#1a3050' },
];

interface InkDrop {
  id: string;
  x: number;
  y: number;
  color: ColorConfig;
  scale: Animated.Value;
  opacity: Animated.Value;
  size: number;
  createdAt: number;
}

interface Particle {
  id: string;
  x: Animated.Value;
  y: Animated.Value;
  opacity: number;
  speed: number;
}

export default function CanvasScreen() {
  const insets = useSafeAreaInsets();
  const { data, addColorMix, newlyUnlocked, clearNewlyUnlocked } = useApp();
  
  const [selectedColor, setSelectedColor] = useState<ColorConfig>(ALL_COLORS[0]);
  const [inkDrops, setInkDrops] = useState<InkDrop[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [currentDirection, setCurrentDirection] = useState({ x: 1, y: 0.5 });
  const [showColorName, setShowColorName] = useState(false);
  const colorNameFade = useMemo(() => new Animated.Value(0), []);
  const [colorsUsedInSession, setColorsUsedInSession] = useState<Set<string>>(new Set());
  const [showUnlock, setShowUnlock] = useState(false);
  const [selectedSize, setSelectedSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [waterColor, setWaterColor] = useState(WATER_COLORS[0]);
  const inkDropsRef = useRef<InkDrop[]>([]);
  const selectedColorRef = useRef<ColorConfig>(ALL_COLORS[0]);
  const currentDirectionRef = useRef({ x: 1, y: 0.5 });
  const selectedSizeRef = useRef<'small' | 'medium' | 'large'>('medium');

  // Keep refs in sync with state
  useEffect(() => {
    inkDropsRef.current = inkDrops;
  }, [inkDrops]);

  useEffect(() => {
    selectedColorRef.current = selectedColor;
  }, [selectedColor]);

  useEffect(() => {
    currentDirectionRef.current = currentDirection;
  }, [currentDirection]);

  useEffect(() => {
    selectedSizeRef.current = selectedSize;
  }, [selectedSize]);

  // Initialize particles
  useEffect(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 25; i++) {
      newParticles.push({
        id: `particle-${i}`,
        x: new Animated.Value(Math.random() * width),
        y: new Animated.Value(Math.random() * height),
        opacity: 0.08 + Math.random() * 0.1,
        speed: 0.5 + Math.random() * 1.5,
      });
    }
    setParticles(newParticles);

    // Animate particles with water-like flow
    newParticles.forEach(particle => {
      const animateParticle = () => {
        const duration = 8000 / particle.speed;
        Animated.parallel([
          Animated.timing(particle.x, {
            toValue: particle.speed > 1 ? width + 50 : Math.random() * width,
            duration: duration,
            useNativeDriver: false,
          }),
          Animated.timing(particle.y, {
            toValue: Math.random() * height,
            duration: duration * 1.5,
            useNativeDriver: false,
          }),
        ]).start(() => {
          // Reset position and animate again
          particle.x.setValue(particle.speed > 1 ? -50 : Math.random() * width);
          particle.y.setValue(Math.random() * height);
          animateParticle();
        });
      };
      animateParticle();
    });
  }, []);

  // Shift water current direction periodically - faster and more dynamic
  useEffect(() => {
    const interval = setInterval(() => {
      const newDir = {
        x: 0.5 + Math.random() * 1.5, // Always flowing right-ish
        y: -0.5 + Math.random() * 1,
      };
      setCurrentDirection(newDir);
    }, CURRENT_SHIFT_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Move ink drops with current - faster movement
  useEffect(() => {
    const moveInterval = setInterval(() => {
      setInkDrops(drops => 
        drops.map(drop => ({
          ...drop,
          x: drop.x + currentDirection.x * 1.2, // Faster horizontal flow
          y: drop.y + currentDirection.y * 0.8 + Math.sin(Date.now() / 500) * 0.3, // Wave motion
        })).filter(drop => Date.now() - drop.createdAt < FADE_DURATION)
      );
    }, 30); // Faster updates

    return () => clearInterval(moveInterval);
  }, [currentDirection]);

  // Show unlock overlay when new colors are unlocked
  useEffect(() => {
    if (newlyUnlocked.length > 0) {
      setShowUnlock(true);
    }
  }, [newlyUnlocked]);

  const checkColorMixing = useCallback(async (newDrop: InkDrop) => {
    const nearbyDrops = inkDropsRef.current.filter(drop => {
      const distance = Math.sqrt(
        Math.pow(drop.x - newDrop.x, 2) + Math.pow(drop.y - newDrop.y, 2)
      );
      return distance < 100 && drop.color.name !== newDrop.color.name;
    });

    if (nearbyDrops.length > 0) {
      const otherColor = nearbyDrops[0].color.name;
      const mixedColorName = getMixedColor(newDrop.color.name, otherColor);
      
      if (mixedColorName) {
        const mixedColor = getColorByName(mixedColorName);
        if (mixedColor) {
          setTimeout(() => {
            const midX = (newDrop.x + nearbyDrops[0].x) / 2;
            const midY = (newDrop.y + nearbyDrops[0].y) / 2;
            
            const id = `ink-mixed-${Date.now()}`;
            const scale = new Animated.Value(0.1);
            const opacity = new Animated.Value(0.5);

            const mixedDrop: InkDrop = {
              id,
              x: midX,
              y: midY,
              color: mixedColor,
              scale,
              opacity,
              size: 90,
              createdAt: Date.now(),
            };

            setInkDrops(prev => [...prev, mixedDrop]);
            setColorsUsedInSession(prev => new Set([...prev, mixedColor.name]));

            Animated.parallel([
              Animated.spring(scale, {
                toValue: 1.2,
                friction: 6,
                tension: 30,
                useNativeDriver: false,
              }),
              Animated.timing(opacity, {
                toValue: 0.9,
                duration: 800,
                useNativeDriver: false,
              }),
            ]).start();

            Animated.timing(opacity, {
              toValue: 0,
              duration: FADE_DURATION,
              delay: 2000,
              useNativeDriver: false,
            }).start();

            addColorMix();
          }, 1500);
        }
      }
    }
  }, [addColorMix]);

  const createInkDrop = useCallback((x: number, y: number, customSize?: number) => {
    const baseSize = customSize || INK_SIZES[selectedSizeRef.current].size;
    const id = `ink-${Date.now()}-${Math.random()}`;
    const scale = new Animated.Value(0.1);
    const opacity = new Animated.Value(0.5);

    const newDrop: InkDrop = {
      id,
      x,
      y,
      color: selectedColorRef.current,
      scale,
      opacity,
      size: baseSize + Math.random() * (baseSize * 0.3),
      createdAt: Date.now(),
    };

    setColorsUsedInSession(prev => new Set([...prev, selectedColorRef.current.name]));
    setInkDrops(prev => [...prev, newDrop]);

    // Bloom animation
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: false,
      }),
      Animated.timing(opacity, {
        toValue: 0.9,
        duration: 400,
        useNativeDriver: false,
      }),
    ]).start();

    // Fade out over time
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_DURATION,
      delay: 2000,
      useNativeDriver: false,
    }).start();

    // Check for color mixing
    checkColorMixing(newDrop);
  }, [checkColorMixing]);

  // Handle touch on canvas
  const handleTouch = useCallback((event: any) => {
    const nativeEvent = event.nativeEvent || event;
    let x = 0, y = 0;
    
    if (nativeEvent.locationX !== undefined && nativeEvent.locationY !== undefined) {
      x = nativeEvent.locationX;
      y = nativeEvent.locationY;
    } else if (nativeEvent.offsetX !== undefined && nativeEvent.offsetY !== undefined) {
      x = nativeEvent.offsetX;
      y = nativeEvent.offsetY;
    } else if (nativeEvent.clientX !== undefined) {
      const rect = event.target?.getBoundingClientRect?.();
      if (rect) {
        x = nativeEvent.clientX - rect.left;
        y = nativeEvent.clientY - rect.top;
      }
    }
    
    if (x > 0 && y > 0) {
      createInkDrop(x, y);
    }
  }, [createInkDrop]);

  const handleTouchMove = useCallback((event: any) => {
    const nativeEvent = event.nativeEvent || event;
    let x = 0, y = 0;
    
    if (nativeEvent.locationX !== undefined && nativeEvent.locationY !== undefined) {
      x = nativeEvent.locationX;
      y = nativeEvent.locationY;
    } else if (nativeEvent.offsetX !== undefined && nativeEvent.offsetY !== undefined) {
      x = nativeEvent.offsetX;
      y = nativeEvent.offsetY;
    } else if (nativeEvent.clientX !== undefined) {
      const rect = event.target?.getBoundingClientRect?.();
      if (rect) {
        x = nativeEvent.clientX - rect.left;
        y = nativeEvent.clientY - rect.top;
      }
    }
    
    if (x > 0 && y > 0) {
      createInkDrop(x, y, INK_SIZES[selectedSizeRef.current].size * 0.5);
    }
  }, [createInkDrop]);

  // Web-specific click handler
  const handleWebClick = useCallback((event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement)?.getBoundingClientRect?.();
    if (rect) {
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x > 0 && y > 0) {
        createInkDrop(x, y);
      }
    }
  }, [createInkDrop]);

  const handleWebMove = useCallback((event: React.MouseEvent) => {
    if (event.buttons === 1) {
      const rect = (event.target as HTMLElement)?.getBoundingClientRect?.();
      if (rect) {
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        if (x > 0 && y > 0) {
          createInkDrop(x, y, INK_SIZES[selectedSizeRef.current].size * 0.5);
        }
      }
    }
  }, [createInkDrop]);

  const selectColor = (color: ColorConfig) => {
    if (data.unlocked_colors.includes(color.name)) {
      setSelectedColor(color);
      setShowColorName(true);
      Animated.sequence([
        Animated.timing(colorNameFade, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.delay(1500),
        Animated.timing(colorNameFade, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }),
      ]).start(() => setShowColorName(false));
    }
  };

  // Reset canvas
  const handleReset = () => {
    setInkDrops([]);
    setColorsUsedInSession(new Set());
  };

  const dismissUnlock = () => {
    setShowUnlock(false);
    clearNewlyUnlocked();
  };

  const isColorUnlocked = (colorName: string) => data.unlocked_colors.includes(colorName);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: waterColor.bg }]}>
      {/* Canvas area */}
      <View 
        style={styles.canvas}
        onTouchStart={handleTouch}
        onTouchMove={handleTouchMove}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouch}
        onResponderMove={handleTouchMove}
        // @ts-ignore - Web events
        onClick={handleWebClick}
        onMouseMove={handleWebMove}
      >
        {/* Water background with caustic effect */}
        <View style={styles.waterBg}>
          <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="waterShimmer" cx="30%" cy="40%" r="70%">
                <Stop offset="0%" stopColor={waterColor.shimmer} stopOpacity="0.25" />
                <Stop offset="100%" stopColor={waterColor.bg} stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id="waterShimmer2" cx="70%" cy="60%" r="60%">
                <Stop offset="0%" stopColor={waterColor.shimmer} stopOpacity="0.15" />
                <Stop offset="100%" stopColor={waterColor.bg} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect width={width} height={height} fill={waterColor.bg} />
            <Ellipse 
              cx={width * 0.3 + currentDirection.x * 30} 
              cy={height * 0.4 + currentDirection.y * 20} 
              rx={width * 0.5} 
              ry={height * 0.3} 
              fill="url(#waterShimmer)" 
            />
            <Ellipse 
              cx={width * 0.7 + currentDirection.x * 20} 
              cy={height * 0.6 + currentDirection.y * 15} 
              rx={width * 0.4} 
              ry={height * 0.25} 
              fill="url(#waterShimmer2)" 
            />
          </Svg>
        </View>

        {/* Particles */}
        {particles.map(particle => (
          <Animated.View
            key={particle.id}
            style={[
              styles.particle,
              {
                opacity: particle.opacity,
                left: particle.x,
                top: particle.y,
              },
            ]}
          />
        ))}

        {/* Ink drops */}
        {inkDrops.map(drop => (
          <Animated.View
            key={drop.id}
            style={[
              styles.inkDrop,
              {
                left: drop.x - drop.size / 2,
                top: drop.y - drop.size / 2,
                width: drop.size,
                height: drop.size,
                opacity: drop.opacity,
                transform: [{ scale: drop.scale }],
                backgroundColor: drop.color.hex,
                borderRadius: drop.size / 2,
                // @ts-ignore - Web box shadow
                boxShadow: `0 0 ${drop.size * 0.5}px ${drop.color.glow}, 0 0 ${drop.size}px ${drop.color.hex}`,
              },
            ]}
          />
        ))}
      </View>

      {/* Header */}
      <View style={[styles.header, { top: insets.top + 10 }]}>
        <Text style={styles.title}>Ink & Water</Text>
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={handleReset}
        >
          <Ionicons name="refresh" size={24} color="#ffffff80" />
        </TouchableOpacity>
      </View>

      {/* Color name display */}
      {showColorName && (
        <Animated.Text style={[styles.colorName, { opacity: colorNameFade }]}>
          {selectedColor.name}
        </Animated.Text>
      )}

      {/* Size selector */}
      <View style={styles.sizeSelector}>
        {(Object.keys(INK_SIZES) as Array<keyof typeof INK_SIZES>).map(size => (
          <TouchableOpacity
            key={size}
            style={[
              styles.sizeButton,
              selectedSize === size && styles.sizeButtonSelected,
            ]}
            onPress={() => setSelectedSize(size)}
          >
            <Text style={[
              styles.sizeButtonText,
              selectedSize === size && styles.sizeButtonTextSelected,
            ]}>
              {INK_SIZES[size].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Water color selector */}
      <View style={styles.waterColorSelector}>
        {WATER_COLORS.map(wc => (
          <TouchableOpacity
            key={wc.name}
            style={[
              styles.waterColorButton,
              { backgroundColor: wc.bg, borderColor: wc.shimmer },
              waterColor.name === wc.name && styles.waterColorSelected,
            ]}
            onPress={() => setWaterColor(wc)}
          />
        ))}
      </View>

      {/* Color swatches */}
      <View style={[styles.swatchContainer, { paddingBottom: insets.bottom + 10 }]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.swatchScroll}
        >
          {ALL_COLORS.map(color => {
            const isUnlocked = isColorUnlocked(color.name);
            const isSelected = selectedColor.name === color.name;
            
            return (
              <TouchableOpacity
                key={color.name}
                style={[
                  styles.swatch,
                  isSelected && styles.swatchSelected,
                  !isUnlocked && styles.swatchLocked,
                ]}
                onPress={() => selectColor(color)}
                disabled={!isUnlocked}
              >
                <View style={[
                  styles.swatchInner,
                  { backgroundColor: isUnlocked ? color.hex : '#333' },
                  isSelected && styles.swatchSelectedInner,
                ]}>
                  {!isUnlocked && (
                    <Ionicons name="lock-closed" size={14} color="#666" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Unlock overlay */}
      {showUnlock && (
        <UnlockOverlay 
          colors={newlyUnlocked} 
          onDismiss={dismissUnlock} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvas: {
    ...StyleSheet.absoluteFillObject,
  },
  waterBg: {
    ...StyleSheet.absoluteFillObject,
    // @ts-ignore - Web pointer events
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#ffffff',
  },
  inkDrop: {
    position: 'absolute',
    zIndex: 10,
  },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '200',
    color: '#ffffff80',
    letterSpacing: 2,
  },
  resetButton: {
    padding: 8,
    backgroundColor: '#ffffff10',
    borderRadius: 20,
  },
  colorName: {
    position: 'absolute',
    bottom: 130,
    alignSelf: 'center',
    color: '#ffffff90',
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  sizeSelector: {
    position: 'absolute',
    right: 15,
    top: '40%',
    backgroundColor: '#ffffff10',
    borderRadius: 20,
    padding: 6,
    gap: 6,
  },
  sizeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff05',
  },
  sizeButtonSelected: {
    backgroundColor: '#ffffff30',
  },
  sizeButtonText: {
    color: '#ffffff60',
    fontSize: 14,
    fontWeight: '600',
  },
  sizeButtonTextSelected: {
    color: '#ffffff',
  },
  waterColorSelector: {
    position: 'absolute',
    left: 15,
    top: '40%',
    backgroundColor: '#ffffff10',
    borderRadius: 20,
    padding: 6,
    gap: 6,
  },
  waterColorButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  waterColorSelected: {
    borderWidth: 3,
    borderColor: '#ffffff60',
  },
  swatchContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#00000080',
    paddingTop: 15,
  },
  swatchScroll: {
    paddingHorizontal: 15,
    gap: 12,
  },
  swatch: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swatchSelected: {
    transform: [{ scale: 1.15 }],
  },
  swatchLocked: {
    opacity: 0.5,
  },
  swatchInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swatchSelectedInner: {
    borderWidth: 2,
    borderColor: '#ffffff60',
  },
});
