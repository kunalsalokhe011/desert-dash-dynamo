/** Missions, achievements and shop catalogue. */

export interface Mission {
  id: string;
  label: string;
  metric: "coins" | "jumps" | "seconds" | "score";
  target: number;
  reward: number;
  progress: number;
  done: boolean;
}

export const MISSION_POOL: Mission[] = [
  { id: "coins-50", label: "Collect 50 coins", metric: "coins", target: 50, reward: 40, progress: 0, done: false },
  { id: "coins-100", label: "Collect 100 coins", metric: "coins", target: 100, reward: 90, progress: 0, done: false },
  { id: "jumps-50", label: "Jump 50 times", metric: "jumps", target: 50, reward: 50, progress: 0, done: false },
  { id: "survive-120", label: "Survive 2 minutes", metric: "seconds", target: 120, reward: 80, progress: 0, done: false },
  { id: "survive-300", label: "Survive 5 minutes", metric: "seconds", target: 300, reward: 200, progress: 0, done: false },
  { id: "score-5000", label: "Reach 5,000 score", metric: "score", target: 5000, reward: 120, progress: 0, done: false },
  { id: "score-10000", label: "Reach 10,000 score", metric: "score", target: 10000, reward: 250, progress: 0, done: false },
];

export interface AchievementContext {
  score: number;
  coins: number;
  jumps: number;
  seconds: number;
  noShield: boolean;
  distance: number;
}

export interface Achievement {
  id: string;
  label: string;
  description: string;
  test: (c: AchievementContext) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-jump", label: "First Jump", description: "Take your first leap", test: (c) => c.jumps >= 1 },
  { id: "coins-100", label: "100 Coins", description: "Collect 100 coins in total", test: (c) => c.coins >= 100 },
  { id: "coins-1000", label: "1000 Coins", description: "Collect 1,000 coins in total", test: (c) => c.coins >= 1000 },
  { id: "score-5000", label: "5,000 Score", description: "Finish a run above 5,000", test: (c) => c.score >= 5000 },
  { id: "score-10000", label: "10,000 Score", description: "Finish a run above 10,000", test: (c) => c.score >= 10000 },
  { id: "survive-600", label: "Survive 10 Minutes", description: "One run, ten minutes", test: (c) => c.seconds >= 600 },
  { id: "perfect-run", label: "Perfect Run", description: "Score 3,000+ without breaking a shield", test: (c) => c.noShield && c.score >= 3000 },
  { id: "collector", label: "Collector", description: "500 coins collected", test: (c) => c.coins >= 500 },
  { id: "speed-demon", label: "Speed Demon", description: "Survive 4 minutes in one run", test: (c) => c.seconds >= 240 },
  { id: "explorer", label: "Explorer", description: "Travel 10,000m total", test: (c) => c.distance >= 10000 },
];

export interface ShopItem {
  id: string;
  name: string;
  kind: "Character" | "Theme" | "Trail" | "Music";
  price: number;
  emoji: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: "runner", name: "Dash Runner", kind: "Character", price: 0, emoji: "🏃" },
  { id: "nomad", name: "Desert Nomad", kind: "Character", price: 250, emoji: "🐪" },
  { id: "android", name: "Neon Android", kind: "Character", price: 600, emoji: "🤖" },
  { id: "ghost", name: "Sand Ghost", kind: "Character", price: 900, emoji: "👻" },
  { id: "trail-fire", name: "Ember Trail", kind: "Trail", price: 300, emoji: "🔥" },
  { id: "trail-ice", name: "Frost Trail", kind: "Trail", price: 300, emoji: "❄️" },
  { id: "theme-cyber", name: "Cyber Skyline", kind: "Theme", price: 450, emoji: "🌃" },
  { id: "music-synth", name: "Synth Pack", kind: "Music", price: 200, emoji: "🎧" },
];
