import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import { getColorByName } from '../src/constants/colors';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 60;
const CARD_HEIGHT = CARD_WIDTH * 0.65;

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const { data, deleteArtwork } = useApp();
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  const handleLongPress = (index: number) => {
    setDeletingIndex(index);
    Alert.alert(
      'Delete Artwork',
      'Are you sure you want to delete this artwork?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setDeletingIndex(null) },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            await deleteArtwork(index);
            setDeletingIndex(null);
          } 
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderArtworkCard = (index: number) => {
    const artwork = data.saved_artworks[index];
    
    if (!artwork) {
      return (
        <View style={styles.emptyCard} key={`empty-${index}`}>
          <View style={styles.emptyInner}>
            <Ionicons name="add" size={32} color="#ffffff30" />
            <Text style={styles.emptyText}>Empty Slot</Text>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={`artwork-${index}`}
        style={styles.artworkCard}
        onLongPress={() => handleLongPress(index)}
        delayLongPress={500}
        activeOpacity={0.9}
      >
        <View style={styles.artworkFrame}>
          <Image
            source={{ uri: artwork.image_data }}
            style={styles.artworkImage}
            resizeMode="cover"
          />
        </View>
        <View style={styles.artworkInfo}>
          <Text style={styles.artworkDate}>{formatDate(artwork.created_at)}</Text>
          <View style={styles.colorSwatches}>
            {artwork.colors_used.slice(0, 5).map((colorName, i) => {
              const color = getColorByName(colorName);
              return (
                <View
                  key={`color-${i}`}
                  style={[
                    styles.miniSwatch,
                    { backgroundColor: color?.hex || '#666' },
                  ]}
                />
              );
            })}
            {artwork.colors_used.length > 5 && (
              <Text style={styles.moreColors}>+{artwork.colors_used.length - 5}</Text>
            )}
          </View>
        </View>
        <Text style={styles.holdHint}>Hold to delete</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Blurred background */}
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={26} color="#ffffff80" />
        </TouchableOpacity>
        <Text style={styles.title}>Gallery</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Artwork cards */}
      <View style={styles.content}>
        {[0, 1, 2].map(index => renderArtworkCard(index))}
      </View>

      {/* Footer info */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <Text style={styles.footerText}>
          {data.saved_artworks.length}/3 artworks saved
        </Text>
        <Text style={styles.footerHint}>Long press to delete artwork</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '300',
    color: '#ffffff90',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  placeholder: {
    width: 42,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 10,
    gap: 25,
  },
  emptyCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ffffff15',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  emptyInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    color: '#ffffff30',
    fontSize: 12,
    fontWeight: '300',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  artworkCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    backgroundColor: '#15151f',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  artworkFrame: {
    width: '100%',
    height: CARD_HEIGHT - 60,
    backgroundColor: '#0a0a0f',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  artworkInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  artworkDate: {
    color: '#ffffff60',
    fontSize: 12,
    fontWeight: '300',
  },
  colorSwatches: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniSwatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  moreColors: {
    color: '#ffffff40',
    fontSize: 10,
    marginLeft: 4,
  },
  holdHint: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#ffffff20',
    fontSize: 10,
    fontWeight: '300',
  },
  footer: {
    paddingHorizontal: 30,
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    color: '#ffffff50',
    fontSize: 13,
    fontWeight: '300',
  },
  footerHint: {
    color: '#ffffff30',
    fontSize: 11,
    fontWeight: '300',
  },
});
