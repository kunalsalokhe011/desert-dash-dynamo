/** Persistent save data backed by Local Storage. */

export interface SaveData {
  highScore: number;
  coins: number;
  settings: {
    muted: boolean;
    volume: number;
    reducedMotion: boolean;
    highContrast: boolean;
  };
  stats: {
    gamesPlayed: number;
    totalJumps: number;
    distance: number;
    coinsCollected: number;
    bestRun: number;
    totalScore: number;
    obstaclesAvoided: number;
    longestSurvival: number;
  };
  achievements: string[];
  unlocked: string[];
  character: string;
}

const KEY = "endless-dash-save-v1";

export const defaultSave: SaveData = {
  highScore: 0,
  coins: 0,
  settings: { muted: false, volume: 0.6, reducedMotion: false, highContrast: false },
  stats: {
    gamesPlayed: 0,
    totalJumps: 0,
    distance: 0,
    coinsCollected: 0,
    bestRun: 0,
    totalScore: 0,
    obstaclesAvoided: 0,
    longestSurvival: 0,
  },
  achievements: [],
  unlocked: ["runner"],
  character: "runner",
};

export function loadSave(): SaveData {
  if (typeof window === "undefined") return structuredClone(defaultSave);
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return structuredClone(defaultSave);
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      ...structuredClone(defaultSave),
      ...parsed,
      settings: { ...defaultSave.settings, ...(parsed.settings ?? {}) },
      stats: { ...defaultSave.stats, ...(parsed.stats ?? {}) },
    };
  } catch {
    return structuredClone(defaultSave);
  }
}

export function persistSave(data: SaveData) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable — play on without saving */
  }
}
