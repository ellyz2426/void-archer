// Environment theme system — selectable visual themes
import { Color } from '@iwsdk/core';

export enum ThemeId {
  HOLODECK = 'holodeck',
  DEEP_VOID = 'deep_void',
  NEON_ARCADE = 'neon_arcade',
  CRYSTAL_CAVE = 'crystal_cave',
}

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  ambientColor: number;
  ambientIntensity: number;
  mainLightColor: number;
  mainLightIntensity: number;
  accent1Color: number;
  accent2Color: number;
  floorColor: number;
  gridColor: number;
  gridOpacity: number;
  ceilingColor: number;
  wallColor: number;
  particleColor1: number;
  particleColor2: number;
  decorColors: number[];
  targetBorderColor: number;
  targetGlowColor: number;
  bowColor: number;
  arrowColor: number;
  trailColor: number;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  [ThemeId.HOLODECK]: {
    id: ThemeId.HOLODECK,
    name: 'Holodeck',
    description: 'Classic neon wireframe training ground',
    fogColor: 0x000808,
    fogNear: 5,
    fogFar: 60,
    ambientColor: 0x112233,
    ambientIntensity: 0.4,
    mainLightColor: 0x00ffcc,
    mainLightIntensity: 0.6,
    accent1Color: 0x00ffcc,
    accent2Color: 0x6644ff,
    floorColor: 0x001a1a,
    gridColor: 0x00ffcc,
    gridOpacity: 0.15,
    ceilingColor: 0x000a0a,
    wallColor: 0x001515,
    particleColor1: 0x00ffcc,
    particleColor2: 0x6644ff,
    decorColors: [0x00ffcc, 0x6644ff, 0x00aaff, 0xff6644],
    targetBorderColor: 0x00ffcc,
    targetGlowColor: 0x00ffcc,
    bowColor: 0x00ffcc,
    arrowColor: 0x00ffcc,
    trailColor: 0x00ffcc,
  },

  [ThemeId.DEEP_VOID]: {
    id: ThemeId.DEEP_VOID,
    name: 'Deep Void',
    description: 'Dark cosmic abyss with distant stars',
    fogColor: 0x020008,
    fogNear: 8,
    fogFar: 80,
    ambientColor: 0x080020,
    ambientIntensity: 0.25,
    mainLightColor: 0x4400cc,
    mainLightIntensity: 0.4,
    accent1Color: 0x8844ff,
    accent2Color: 0xff44aa,
    floorColor: 0x050010,
    gridColor: 0x4400cc,
    gridOpacity: 0.08,
    ceilingColor: 0x020005,
    wallColor: 0x0a0020,
    particleColor1: 0xffffff,
    particleColor2: 0x8844ff,
    decorColors: [0x8844ff, 0xff44aa, 0x4400cc, 0xffffff],
    targetBorderColor: 0x8844ff,
    targetGlowColor: 0xff44aa,
    bowColor: 0x8844ff,
    arrowColor: 0xcc66ff,
    trailColor: 0x8844ff,
  },

  [ThemeId.NEON_ARCADE]: {
    id: ThemeId.NEON_ARCADE,
    name: 'Neon Arcade',
    description: 'Retro-futuristic arcade with hot neons',
    fogColor: 0x100008,
    fogNear: 5,
    fogFar: 50,
    ambientColor: 0x201010,
    ambientIntensity: 0.35,
    mainLightColor: 0xff00aa,
    mainLightIntensity: 0.6,
    accent1Color: 0xff0066,
    accent2Color: 0x00ffaa,
    floorColor: 0x120008,
    gridColor: 0xff0066,
    gridOpacity: 0.2,
    ceilingColor: 0x0a0005,
    wallColor: 0x150010,
    particleColor1: 0xff0066,
    particleColor2: 0x00ffaa,
    decorColors: [0xff0066, 0x00ffaa, 0xffaa00, 0xff00ff],
    targetBorderColor: 0xff0066,
    targetGlowColor: 0x00ffaa,
    bowColor: 0xff0066,
    arrowColor: 0xff3388,
    trailColor: 0xff0066,
  },

  [ThemeId.CRYSTAL_CAVE]: {
    id: ThemeId.CRYSTAL_CAVE,
    name: 'Crystal Cave',
    description: 'Icy cavern with glowing crystals',
    fogColor: 0x001020,
    fogNear: 4,
    fogFar: 45,
    ambientColor: 0x102040,
    ambientIntensity: 0.5,
    mainLightColor: 0x44ccff,
    mainLightIntensity: 0.7,
    accent1Color: 0x44ccff,
    accent2Color: 0x88eeff,
    floorColor: 0x001530,
    gridColor: 0x44ccff,
    gridOpacity: 0.12,
    ceilingColor: 0x000818,
    wallColor: 0x001828,
    particleColor1: 0x44ccff,
    particleColor2: 0x88eeff,
    decorColors: [0x44ccff, 0x88eeff, 0xaaffff, 0x2288cc],
    targetBorderColor: 0x44ccff,
    targetGlowColor: 0x88eeff,
    bowColor: 0x44ccff,
    arrowColor: 0x66ddff,
    trailColor: 0x44ccff,
  },
};

const THEME_STORAGE_KEY = 'void-archer-theme';

export function getSelectedTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && saved in THEMES) return saved as ThemeId;
  } catch {}
  return ThemeId.HOLODECK;
}

export function saveSelectedTheme(id: ThemeId) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {}
}

export function getThemeConfig(id?: ThemeId): ThemeConfig {
  return THEMES[id || getSelectedTheme()];
}

export function getAllThemes(): ThemeConfig[] {
  return Object.values(THEMES);
}
