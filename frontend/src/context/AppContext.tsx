import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Artwork {
  image_data: string;
  colors_used: string[];
  created_at: string;
}

interface AppData {
  sessions_count: number;
  unlocked_colors: string[];
  saved_artworks: Artwork[];
  color_mixes: number;
}

interface AppContextType {
  data: AppData;
  updateData: (newData: Partial<AppData>) => Promise<void>;
  addColorMix: () => Promise<string[]>;
  saveArtwork: (imageData: string, colorsUsed: string[]) => Promise<boolean>;
  deleteArtwork: (index: number) => Promise<void>;
  checkUnlocks: () => Promise<string[]>;
  newlyUnlocked: string[];
  clearNewlyUnlocked: () => void;
}

const defaultData: AppData = {
  sessions_count: 0,
  unlocked_colors: ['Red', 'Blue', 'Yellow'],
  saved_artworks: [],
  color_mixes: 0,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AppData>(defaultData);
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const stored = await AsyncStorage.getItem('ink_water_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        setData(parsed);
        // Check for unlocks based on current state
        checkUnlocksInternal(parsed);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const saveData = async (newData: AppData) => {
    try {
      await AsyncStorage.setItem('ink_water_data', JSON.stringify(newData));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const updateData = async (newDataPartial: Partial<AppData>) => {
    const newData = { ...data, ...newDataPartial };
    setData(newData);
    await saveData(newData);
  };

  const checkUnlocksInternal = (currentData: AppData): string[] => {
    const unlocked: string[] = [];
    const current = new Set(currentData.unlocked_colors);

    // After 3 color mixes: Orange, Green, Purple
    if (currentData.color_mixes >= 3) {
      if (!current.has('Orange')) unlocked.push('Orange');
      if (!current.has('Green')) unlocked.push('Green');
      if (!current.has('Purple')) unlocked.push('Purple');
    }

    // After 10 sessions: Gold, Silver, Copper
    if (currentData.sessions_count >= 10) {
      if (!current.has('Gold')) unlocked.push('Gold');
      if (!current.has('Silver')) unlocked.push('Silver');
      if (!current.has('Copper')) unlocked.push('Copper');
    }

    // After saving 3 artworks: Galaxy, Aurora, Void
    if (currentData.saved_artworks.length >= 3) {
      if (!current.has('Galaxy')) unlocked.push('Galaxy');
      if (!current.has('Aurora')) unlocked.push('Aurora');
      if (!current.has('Void')) unlocked.push('Void');
    }

    // After 20 sessions: Neon Pink, Neon Cyan, Neon Lime
    if (currentData.sessions_count >= 20) {
      if (!current.has('Neon Pink')) unlocked.push('Neon Pink');
      if (!current.has('Neon Cyan')) unlocked.push('Neon Cyan');
      if (!current.has('Neon Lime')) unlocked.push('Neon Lime');
    }

    return unlocked;
  };

  const checkUnlocks = async (): Promise<string[]> => {
    const unlocked = checkUnlocksInternal(data);
    if (unlocked.length > 0) {
      const newColors = [...data.unlocked_colors, ...unlocked];
      const newData = { ...data, unlocked_colors: newColors };
      setData(newData);
      await saveData(newData);
      setNewlyUnlocked(unlocked);
    }
    return unlocked;
  };

  const addColorMix = async (): Promise<string[]> => {
    const newMixes = data.color_mixes + 1;
    const newData = { ...data, color_mixes: newMixes };
    setData(newData);
    await saveData(newData);
    
    // Check for unlocks after color mix
    const unlocked = checkUnlocksInternal(newData);
    if (unlocked.length > 0) {
      const newColors = [...newData.unlocked_colors, ...unlocked];
      const updatedData = { ...newData, unlocked_colors: newColors };
      setData(updatedData);
      await saveData(updatedData);
      setNewlyUnlocked(unlocked);
    }
    return unlocked;
  };

  const saveArtwork = async (imageData: string, colorsUsed: string[]): Promise<boolean> => {
    if (data.saved_artworks.length >= 3) {
      return false;
    }
    const newArtwork: Artwork = {
      image_data: imageData,
      colors_used: colorsUsed,
      created_at: new Date().toISOString(),
    };
    const newArtworks = [...data.saved_artworks, newArtwork];
    const newData = { ...data, saved_artworks: newArtworks };
    setData(newData);
    await saveData(newData);

    // Check for unlocks after saving
    const unlocked = checkUnlocksInternal(newData);
    if (unlocked.length > 0) {
      const newColors = [...newData.unlocked_colors, ...unlocked];
      const updatedData = { ...newData, unlocked_colors: newColors };
      setData(updatedData);
      await saveData(updatedData);
      setNewlyUnlocked(unlocked);
    }
    return true;
  };

  const deleteArtwork = async (index: number) => {
    const newArtworks = data.saved_artworks.filter((_, i) => i !== index);
    const newData = { ...data, saved_artworks: newArtworks };
    setData(newData);
    await saveData(newData);
  };

  const clearNewlyUnlocked = () => {
    setNewlyUnlocked([]);
  };

  return (
    <AppContext.Provider value={{
      data,
      updateData,
      addColorMix,
      saveArtwork,
      deleteArtwork,
      checkUnlocks,
      newlyUnlocked,
      clearNewlyUnlocked,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
