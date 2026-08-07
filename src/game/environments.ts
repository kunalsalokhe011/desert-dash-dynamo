/** Environment themes + weather definitions. Visual only. */

export interface Environment {
  name: string;
  sky: [string, string];
  sun: string;
  mountainFar: string;
  mountainNear: string;
  ground: string;
  groundLine: string;
  accent: string;
  night: boolean;
  weather: "clear" | "rain" | "snow" | "dust" | "fog" | "meteor";
}

export const ENVIRONMENTS: Environment[] = [
  {
    name: "Morning Desert",
    sky: ["#ffd9a0", "#ffeede"],
    sun: "#ffb347",
    mountainFar: "#e2b58d",
    mountainNear: "#c98f63",
    ground: "#f2d1a5",
    groundLine: "#c9945f",
    accent: "#ff8a3d",
    night: false,
    weather: "clear",
  },
  {
    name: "Sunny Afternoon",
    sky: ["#63c9f7", "#cdeefd"],
    sun: "#fff3b0",
    mountainFar: "#8fb8c9",
    mountainNear: "#c79a6d",
    ground: "#f6dfb3",
    groundLine: "#cba469",
    accent: "#0ea5b7",
    night: false,
    weather: "dust",
  },
  {
    name: "Sunset",
    sky: ["#ff7a59", "#ffc17a"],
    sun: "#ffe08a",
    mountainFar: "#a1567a",
    mountainNear: "#6d3457",
    ground: "#e0a370",
    groundLine: "#a3603a",
    accent: "#ff4d6d",
    night: false,
    weather: "wind" as never,
  },
  {
    name: "Night Dunes",
    sky: ["#0b1030", "#25315e"],
    sun: "#e8eeff",
    mountainFar: "#1c2450",
    mountainNear: "#141a3a",
    ground: "#2a2f55",
    groundLine: "#4b528a",
    accent: "#7dd3fc",
    night: true,
    weather: "clear",
  },
  {
    name: "Sandstorm",
    sky: ["#c98a4b", "#e8bd84"],
    sun: "#f4d9a8",
    mountainFar: "#b07c4c",
    mountainNear: "#8a5c34",
    ground: "#d7a768",
    groundLine: "#a97840",
    accent: "#ffce6a",
    night: false,
    weather: "dust",
  },
  {
    name: "Cyber City",
    sky: ["#160b2e", "#3b1d63"],
    sun: "#ff5fd2",
    mountainFar: "#2a1450",
    mountainNear: "#1b0e36",
    ground: "#20143d",
    groundLine: "#8b5cf6",
    accent: "#22d3ee",
    night: true,
    weather: "rain",
  },
  {
    name: "Frozen Waste",
    sky: ["#8fc6e8", "#e6f4ff"],
    sun: "#ffffff",
    mountainFar: "#a8c8dd",
    mountainNear: "#7fa5bf",
    ground: "#e8f4fb",
    groundLine: "#a9c6d8",
    accent: "#38bdf8",
    night: false,
    weather: "snow",
  },
  {
    name: "Orbital",
    sky: ["#05030f", "#1a0b33"],
    sun: "#c4b5fd",
    mountainFar: "#1a1140",
    mountainNear: "#0f0a28",
    ground: "#141033",
    groundLine: "#a78bfa",
    accent: "#f472b6",
    night: true,
    weather: "meteor",
  },
];

/** Linear interpolation between two hex colors. */
export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round((((pa >> 16) & 255) * (1 - t)) + ((pb >> 16) & 255) * t);
  const g = Math.round((((pa >> 8) & 255) * (1 - t)) + ((pb >> 8) & 255) * t);
  const bl = Math.round(((pa & 255) * (1 - t)) + (pb & 255) * t);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
}

export function blendEnvironments(a: Environment, b: Environment, t: number): Environment {
  return {
    ...(t < 0.5 ? a : b),
    sky: [mixHex(a.sky[0], b.sky[0], t), mixHex(a.sky[1], b.sky[1], t)],
    sun: mixHex(a.sun, b.sun, t),
    mountainFar: mixHex(a.mountainFar, b.mountainFar, t),
    mountainNear: mixHex(a.mountainNear, b.mountainNear, t),
    ground: mixHex(a.ground, b.ground, t),
    groundLine: mixHex(a.groundLine, b.groundLine, t),
    accent: mixHex(a.accent, b.accent, t),
  };
}
