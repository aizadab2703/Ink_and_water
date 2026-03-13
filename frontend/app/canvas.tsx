import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  ScrollView,
  Alert,
  TouchableWithoutFeedback,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop, Rect, Ellipse } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import { useApp } from '../src/context/AppContext';
import { ALL_COLORS, getColorByName, getMixedColor, ColorConfig } from '../src/constants/colors';
import UnlockOverlay from '../src/components/UnlockOverlay';

const { width, height } = Dimensions.get('window');
const FADE_DURATION = 180000; // 3 minutes in ms
const CURRENT_SHIFT_INTERVAL = 45000; // 45 seconds

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
  const { data, addColorMix, saveArtwork, newlyUnlocked, clearNewlyUnlocked } = useApp();
  const viewShotRef = useRef<ViewShot>(null);
  const canvasRef = useRef<View>(null);
  
  const [selectedColor, setSelectedColor] = useState<ColorConfig>(ALL_COLORS[0]);
  const [inkDrops, setInkDrops] = useState<InkDrop[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [currentDirection, setCurrentDirection] = useState({ x: 0.5, y: 0.3 });
  const [showColorName, setShowColorName] = useState(false);
  const colorNameFade = useMemo(() => new Animated.Value(0), []);
  const saveAnimation = useMemo(() => new Animated.Value(0), []);
  const [colorsUsedInSession, setColorsUsedInSession] = useState<Set<string>>(new Set());
  const [showUnlock, setShowUnlock] = useState(false);
  const inkDropsRef = useRef<InkDrop[]>([]);
  const selectedColorRef = useRef<ColorConfig>(ALL_COLORS[0]);
  const currentDirectionRef = useRef({ x: 0.5, y: 0.3 });

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

  // Initialize particles
  useEffect(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 18; i++) {
      newParticles.push({
        id: `particle-${i}`,
        x: new Animated.Value(Math.random() * width),
        y: new Animated.Value(Math.random() * height),
        opacity: 0.1 + Math.random() * 0.08,
        speed: 0.2 + Math.random() * 0.5,
      });
    }
    setParticles(newParticles);

    // Animate particles continuously
    newParticles.forEach(particle => {
      const duration = 20000 / particle.speed;
      Animated.loop(
        Animated.sequence([
          Animated.timing(particle.x, {
            toValue: Math.random() * width,
            duration: duration,
            useNativeDriver: false,
          }),
          Animated.timing(particle.x, {
            toValue: Math.random() * width,
            duration: duration,
            useNativeDriver: false,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(particle.y, {
            toValue: Math.random() * height,
            duration: duration * 1.2,
            useNativeDriver: false,
          }),
          Animated.timing(particle.y, {
            toValue: Math.random() * height,
            duration: duration * 1.2,
            useNativeDriver: false,
          }),
        ])
      ).start();
    });
  }, []);

  // Shift water current direction periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const newDir = {
        x: -1 + Math.random() * 2,
        y: -1 + Math.random() * 2,
      };
      setCurrentDirection(newDir);
    }, CURRENT_SHIFT_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Move ink drops with current
  useEffect(() => {
    const moveInterval = setInterval(() => {
      setInkDrops(drops => 
        drops.map(drop => ({
          ...drop,
          x: drop.x + currentDirection.x * 0.3,
          y: drop.y + currentDirection.y * 0.3,
        })).filter(drop => Date.now() - drop.createdAt < FADE_DURATION)
      );
    }, 50);

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
            const scale = new Animated.Value(0);
            const opacity = new Animated.Value(0);

            const mixedDrop: InkDrop = {
              id,
              x: midX,
              y: midY,
              color: mixedColor,
              scale,
              opacity,
              size: 80,
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

  const createInkDrop = useCallback((x: number, y: number, size: number = 80) => {
    console.log('Creating ink drop at:', x, y, 'color:', selectedColorRef.current.name);
    const id = `ink-${Date.now()}-${Math.random()}`;
    const scale = new Animated.Value(0.1); // Start with small visible size
    const opacity = new Animated.Value(0.5); // Start semi-visible

    const newDrop: InkDrop = {
      id,
      x,
      y,
      color: selectedColorRef.current,
      scale,
      opacity,
      size: size + Math.random() * 30,
      createdAt: Date.now(),
    };

    setColorsUsedInSession(prev => new Set([...prev, selectedColorRef.current.name]));
    setInkDrops(prev => {
      console.log('Ink drops count:', prev.length + 1);
      return [...prev, newDrop];
    });

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

  // Handle touch on canvas - works for both native and web
  const handleTouch = useCallback((event: any) => {
    // Try multiple ways to get coordinates
    const nativeEvent = event.nativeEvent || event;
    let x = 0, y = 0;
    
    // For React Native native touch events
    if (nativeEvent.locationX !== undefined && nativeEvent.locationY !== undefined) {
      x = nativeEvent.locationX;
      y = nativeEvent.locationY;
    }
    // For web mouse/touch events
    else if (nativeEvent.offsetX !== undefined && nativeEvent.offsetY !== undefined) {
      x = nativeEvent.offsetX;
      y = nativeEvent.offsetY;
    }
    // For web using clientX/Y relative to bounding rect
    else if (nativeEvent.clientX !== undefined) {
      const rect = event.target?.getBoundingClientRect?.();
      if (rect) {
        x = nativeEvent.clientX - rect.left;
        y = nativeEvent.clientY - rect.top;
      }
    }
    
    console.log('Touch coordinates:', x, y);
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
      createInkDrop(x, y, 30);
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

  const handleSave = async () => {
    if (data.saved_artworks.length >= 3) {
      Alert.alert(
        'Gallery Full',
        'You have 3 saved artworks. Please delete one to save a new piece.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    try {
      if (viewShotRef.current?.capture) {
        const uri = await viewShotRef.current.capture();
        const colorsUsed = Array.from(colorsUsedInSession);
        const success = await saveArtwork(uri, colorsUsed);
        
        if (success) {
          Animated.sequence([
            Animated.timing(saveAnimation, {
              toValue: 1,
              duration: 200,
              useNativeDriver: false,
            }),
            Animated.delay(1000),
            Animated.timing(saveAnimation, {
              toValue: 0,
              duration: 300,
              useNativeDriver: false,
            }),
          ]).start();
        }
      }
    } catch (error) {
      console.error('Error saving artwork:', error);
    }
  };

  const dismissUnlock = () => {
    setShowUnlock(false);
    clearNewlyUnlocked();
  };

  const isColorUnlocked = (colorName: string) => data.unlocked_colors.includes(colorName);

  // Web-specific click handler
  const handleWebClick = useCallback((event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement)?.getBoundingClientRect?.();
    if (rect) {
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      console.log('Web click at:', x, y);
      if (x > 0 && y > 0) {
        createInkDrop(x, y);
      }
    }
  }, [createInkDrop]);

  const handleWebMove = useCallback((event: React.MouseEvent) => {
    if (event.buttons === 1) { // Left mouse button is pressed
      const rect = (event.target as HTMLElement)?.getBoundingClientRect?.();
      if (rect) {
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        if (x > 0 && y > 0) {
          createInkDrop(x, y, 30);
        }
      }
    }
  }, [createInkDrop]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Canvas area */}
      <ViewShot ref={viewShotRef} style={styles.canvas} options={{ format: 'jpg', quality: 0.8 }}>
        <View 
          ref={canvasRef}
          style={styles.canvasInner}
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
                <RadialGradient id="waterShimmer" cx="50%" cy="50%" r="60%">
                  <Stop offset="0%" stopColor="#0f1a2a" stopOpacity="0.15" />
                  <Stop offset="100%" stopColor="#0a0a0f" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect width={width} height={height} fill="#0a0a0f" />
              <Ellipse 
                cx={width / 2 + currentDirection.x * 50} 
                cy={height / 2 + currentDirection.y * 50} 
                rx={width * 0.6} 
                ry={height * 0.4} 
                fill="url(#waterShimmer)" 
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
      </ViewShot>

      {/* Header */}
      <View style={[styles.header, { top: insets.top + 10 }]}>
        <Text style={styles.title}>Ink & Water</Text>
        <TouchableOpacity 
          style={styles.galleryButton}
          onPress={() => router.push('/gallery')}
        >
          <Ionicons name="images-outline" size={26} color="#ffffff80" />
        </TouchableOpacity>
      </View>

      {/* Color name display */}
      {showColorName && (
        <Animated.Text style={[styles.colorName, { opacity: colorNameFade }]}>
          {selectedColor.name}
        </Animated.Text>
      )}

      {/* Save button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Ionicons name="bookmark-outline" size={28} color="#ffffff70" />
      </TouchableOpacity>

      {/* Saved confirmation */}
      <Animated.View style={[styles.savedConfirm, { opacity: saveAnimation }]}>
        <Text style={styles.savedText}>Saved</Text>
      </Animated.View>

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
    backgroundColor: '#0a0a0f',
  },
  canvas: {
    ...StyleSheet.absoluteFillObject,
  },
  canvasInner: {
    flex: 1,
  },
  particle: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#ffffff',
  },
  waterBg: {
    ...StyleSheet.absoluteFillObject,
    // @ts-ignore - Web pointer events
    pointerEvents: 'none',
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
  galleryButton: {
    padding: 8,
  },
  colorName: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    color: '#ffffff90',
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  saveButton: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savedConfirm: {
    position: 'absolute',
    bottom: 180,
    alignSelf: 'center',
    backgroundColor: '#ffffff15',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  savedText: {
    color: '#ffffff90',
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 2,
  },
  swatchContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0a0a0f90',
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
