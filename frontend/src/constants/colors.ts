// All available colors with their properties
export interface ColorConfig {
  name: string;
  hex: string;
  glow: string;
  type: 'basic' | 'mixed' | 'metallic' | 'cosmic' | 'neon';
}

export const ALL_COLORS: ColorConfig[] = [
  // Basic colors (unlocked at start)
  { name: 'Red', hex: '#e63946', glow: '#ff4d5a', type: 'basic' },
  { name: 'Blue', hex: '#4361ee', glow: '#5a7aff', type: 'basic' },
  { name: 'Yellow', hex: '#ffd700', glow: '#ffeb3b', type: 'basic' },
  
  // Mixed colors (unlocked after 3 mixes)
  { name: 'Orange', hex: '#ff8c00', glow: '#ffa726', type: 'mixed' },
  { name: 'Green', hex: '#2e7d32', glow: '#4caf50', type: 'mixed' },
  { name: 'Purple', hex: '#7b1fa2', glow: '#9c27b0', type: 'mixed' },
  
  // Metallic colors (unlocked after 10 sessions)
  { name: 'Gold', hex: '#ffd700', glow: '#ffe066', type: 'metallic' },
  { name: 'Silver', hex: '#c0c0c0', glow: '#e0e0e0', type: 'metallic' },
  { name: 'Copper', hex: '#b87333', glow: '#d4915a', type: 'metallic' },
  
  // Cosmic colors (unlocked after saving 3 artworks)
  { name: 'Galaxy', hex: '#1a0533', glow: '#6b238e', type: 'cosmic' },
  { name: 'Aurora', hex: '#00ff87', glow: '#7dffb8', type: 'cosmic' },
  { name: 'Void', hex: '#0d0221', glow: '#2d1f4e', type: 'cosmic' },
  
  // Neon colors (unlocked after 20 sessions)
  { name: 'Neon Pink', hex: '#ff1493', glow: '#ff6eb4', type: 'neon' },
  { name: 'Neon Cyan', hex: '#00ffff', glow: '#66ffff', type: 'neon' },
  { name: 'Neon Lime', hex: '#00ff00', glow: '#66ff66', type: 'neon' },
];

// Color mixing rules
export const COLOR_MIX_RULES: Record<string, string> = {
  'Red+Blue': 'Purple',
  'Blue+Red': 'Purple',
  'Red+Yellow': 'Orange',
  'Yellow+Red': 'Orange',
  'Blue+Yellow': 'Green',
  'Yellow+Blue': 'Green',
};

export const getColorByName = (name: string): ColorConfig | undefined => {
  return ALL_COLORS.find(c => c.name === name);
};

export const getMixedColor = (color1: string, color2: string): string | null => {
  const key1 = `${color1}+${color2}`;
  const key2 = `${color2}+${color1}`;
  return COLOR_MIX_RULES[key1] || COLOR_MIX_RULES[key2] || null;
};
