/**
 * Endless Dash — core game engine.
 * Owns physics, spawning, rendering and the requestAnimationFrame loop.
 * All UI state is pushed out through the `onState` callback so React never
 * touches the render loop.
 */
import { AudioEngine } from "./audio";
import { ParticleSystem } from "./particles";
import { ENVIRONMENTS, blendEnvironments, type Environment } from "./environments";
import { ACHIEVEMENTS, MISSION_POOL, type Mission } from "./progression";
import type { SaveData } from "./storage";

export type Phase = "menu" | "countdown" | "running" | "paused" | "dead";

export interface HudState {
  phase: Phase;
  score: number;
  highScore: number;
  distance: number;
  coins: number;
  runCoins: number;
  multiplier: number;
  speedLevel: number;
  combo: number;
  countdown: number;
  environment: string;
  powerups: { kind: PowerKind; remaining: number; total: number }[];
  missions: Mission[];
  unlockedAchievement: string | null;
}

export type PowerKind = "magnet" | "shield" | "slowmo" | "double" | "jetpack" | "boost";

export const POWER_META: Record<PowerKind, { label: string; icon: string; color: string; duration: number }> = {
  magnet: { label: "Magnet", icon: "🧲", color: "#f97316", duration: 8 },
  shield: { label: "Shield", icon: "🛡️", color: "#38bdf8", duration: 10 },
  slowmo: { label: "Slow-Mo", icon: "🐢", color: "#a78bfa", duration: 6 },
  double: { label: "2× Score", icon: "✨", color: "#facc15", duration: 10 },
  jetpack: { label: "Jetpack", icon: "🚀", color: "#f472b6", duration: 6 },
  boost: { label: "Boost", icon: "⚡", color: "#22d3ee", duration: 5 },
};

const GROUND_Y = 330;
const VIEW_W = 960;
const VIEW_H = 420;
const GRAVITY = 2400;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

type ObstacleKind =
  | "cactus-small"
  | "cactus-large"
  | "rock"
  | "drone"
  | "bird"
  | "barrel"
  | "walker";

interface Obstacle extends Box {
  active: boolean;
  kind: ObstacleKind;
  vy: number;
  phase: number;
  passed: boolean;
}

type PickupKind = "coin" | "gem" | "crystal" | "mystery" | PowerKind;

interface Pickup extends Box {
  active: boolean;
  kind: PickupKind;
  phase: number;
  baseY: number;
}

interface Popup {
  active: boolean;
  x: number;
  y: number;
  life: number;
  text: string;
  color: string;
}

/** Simple ease helper used across animations. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)] as T;

export class Game {
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private last = 0;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;

  readonly audio = new AudioEngine();
  private particles = new ParticleSystem(500);

  private obstacles: Obstacle[] = [];
  private pickups: Pickup[] = [];
  private popups: Popup[] = [];
  private weatherBits: { x: number; y: number; v: number; s: number }[] = [];
  private clouds: { x: number; y: number; s: number; v: number }[] = [];

  // Player state
  private px = 140;
  private py = GROUND_Y;
  private vy = 0;
  private jumps = 0;
  private ducking = false;
  private dashTime = 0;
  private dashCooldown = 0;
  private runTime = 0;
  private dead = false;
  private deathTime = 0;
  private invincible = 0;

  // Run state
  phase: Phase = "menu";
  private score = 0;
  private distance = 0;
  private runCoins = 0;
  private speed = 340;
  private combo = 0;
  private comboTimer = 0;
  private countdown = 3;
  private spawnTimer = 1.2;
  private pickupTimer = 1.6;
  private shake = 0;
  private elapsed = 0;
  private powerups = new Map<PowerKind, number>();
  private envIndex = 0;
  private envT = 0;
  private scrolls = [0, 0, 0, 0, 0];
  private missions: Mission[] = [];
  private newAchievement: string | null = null;
  private jumpsThisRun = 0;
  private noShieldRun = true;

  debugHitboxes = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private save: SaveData,
    private onState: (s: HudState) => void,
    private onSave: (s: SaveData) => void,
  ) {
    const c = canvas.getContext("2d");
    if (!c) throw new Error("Canvas 2D context unavailable");
    this.ctx = c;
    this.audio.setMuted(save.settings.muted);
    this.audio.setVolume(save.settings.volume);
    for (let i = 0; i < 8; i++) {
      this.clouds.push({ x: rand(0, VIEW_W), y: rand(30, 150), s: rand(0.6, 1.6), v: rand(8, 22) });
    }
    for (let i = 0; i < 160; i++) {
      this.weatherBits.push({ x: rand(0, VIEW_W), y: rand(0, VIEW_H), v: rand(0.5, 1.5), s: rand(1, 3) });
    }
    this.rollMissions();
    this.resize();
  }

  // ---------------------------------------------------------------- lifecycle

  start() {
    this.last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.update(dt);
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.audio.stopMusic();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    const s = Math.min(rect.width / VIEW_W, rect.height / VIEW_H);
    this.scale = s * dpr;
    this.offsetX = ((rect.width - VIEW_W * s) / 2) * dpr;
    this.offsetY = ((rect.height - VIEW_H * s) / 2) * dpr;
  }

  private rollMissions() {
    const shuffled = [...MISSION_POOL].sort(() => Math.random() - 0.5).slice(0, 3);
    this.missions = shuffled.map((m) => ({ ...m, progress: 0, done: false }));
  }

  // ------------------------------------------------------------------- input

  beginRun() {
    this.obstacles.forEach((o) => (o.active = false));
    this.pickups.forEach((p) => (p.active = false));
    this.particles.clear();
    this.popups.forEach((p) => (p.active = false));
    this.powerups.clear();
    this.score = 0;
    this.distance = 0;
    this.runCoins = 0;
    this.speed = 340;
    this.combo = 0;
    this.comboTimer = 0;
    this.elapsed = 0;
    this.spawnTimer = 1.2;
    this.pickupTimer = 1.6;
    this.py = GROUND_Y;
    this.vy = 0;
    this.jumps = 0;
    this.dead = false;
    this.deathTime = 0;
    this.ducking = false;
    this.dashTime = 0;
    this.invincible = 0;
    this.jumpsThisRun = 0;
    this.noShieldRun = true;
    this.countdown = 3;
    this.phase = "countdown";
    this.audio.play("countdown");
    this.audio.startMusic();
    this.emitState();
  }

  jump() {
    if (this.phase === "menu" || this.phase === "dead") return;
    if (this.phase === "countdown") return;
    if (this.powerups.has("jetpack")) {
      this.vy = -520;
      this.particles.emit(4, { x: this.px, y: this.py, vx: -60, vy: 120, color: "#f472b6", size: 4, maxLife: 0.4 });
      return;
    }
    if (this.jumps >= 2) return;
    this.vy = this.jumps === 0 ? -880 : -760;
    this.jumps++;
    this.jumpsThisRun++;
    this.ducking = false;
    this.save.stats.totalJumps++;
    this.audio.play("jump");
    this.particles.emit(10, {
      x: this.px,
      y: this.py,
      color: this.jumps === 2 ? "#7dd3fc" : "#ffffff",
      size: 3,
      maxLife: 0.4,
      speed: 90,
      gravity: 320,
    });
  }

  setDuck(on: boolean) {
    if (this.phase !== "running") return;
    this.ducking = on && this.py >= GROUND_Y - 0.5;
    if (on && this.py < GROUND_Y) this.vy += 600; // fast-fall
  }

  dash() {
    if (this.phase !== "running" || this.dashCooldown > 0) return;
    this.dashTime = 0.28;
    this.dashCooldown = 1.6;
    this.audio.play("power");
    this.particles.emit(18, {
      x: this.px,
      y: this.py - 20,
      color: "#22d3ee",
      size: 4,
      maxLife: 0.45,
      speed: 140,
      gravity: 0,
      shape: "spark",
    });
  }

  togglePause() {
    if (this.phase === "running") this.phase = "paused";
    else if (this.phase === "paused") this.phase = "running";
    this.emitState();
  }

  toMenu() {
    this.phase = "menu";
    this.audio.stopMusic();
    this.emitState();
  }

  // ------------------------------------------------------------------ update

  private update(dt: number) {
    if (this.phase === "paused") return;

    if (this.phase === "countdown") {
      this.countdown -= dt;
      if (Math.ceil(this.countdown) !== Math.ceil(this.countdown + dt)) this.audio.play("countdown");
      if (this.countdown <= 0) {
        this.phase = "running";
      }
      this.emitState();
    }

    const slow = this.powerups.has("slowmo") ? 0.55 : 1;
    const boost = this.powerups.has("boost") ? 1.45 : 1;
    const scaledDt = dt * slow;

    // Environment cycling
    this.envT += dt / 26;
    if (this.envT >= 1) {
      this.envT = 0;
      this.envIndex = (this.envIndex + 1) % ENVIRONMENTS.length;
    }

    // Ambient scroll even in menu so the world feels alive
    const worldSpeed = this.phase === "running" ? this.speed * boost * (this.dashTime > 0 ? 1.8 : 1) : 120;
    for (let i = 0; i < this.scrolls.length; i++) {
      this.scrolls[i] = ((this.scrolls[i] ?? 0) + worldSpeed * scaledDt * (0.08 + i * 0.24)) % 2000;
    }
    for (const c of this.clouds) {
      c.x -= (c.v + worldSpeed * 0.02) * scaledDt;
      if (c.x < -120) {
        c.x = VIEW_W + 60;
        c.y = rand(30, 150);
      }
    }
    this.updateWeather(scaledDt, worldSpeed);
    this.particles.update(scaledDt);
    for (const p of this.popups) {
      if (!p.active) continue;
      p.life -= dt;
      p.y -= 40 * dt;
      if (p.life <= 0) p.active = false;
    }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3);
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.dashTime > 0) {
      this.dashTime -= dt;
      this.particles.emit(2, {
        x: this.px - 10,
        y: this.py - 24,
        color: "#22d3ee",
        size: 5,
        maxLife: 0.3,
        speed: 30,
        gravity: 0,
      });
    }
    if (this.invincible > 0) this.invincible -= dt;

    if (this.phase === "dead") {
      this.deathTime += dt;
      this.py = Math.min(GROUND_Y, this.py + this.vy * dt);
      this.vy += GRAVITY * dt;
      return;
    }

    if (this.phase !== "running") {
      this.runTime += dt;
      return;
    }

    this.runTime += scaledDt;
    this.elapsed += dt;

    // Difficulty curve
    this.speed = Math.min(900, 340 + this.elapsed * 9);

    // Physics
    const wasAir = this.py < GROUND_Y;
    if (this.powerups.has("jetpack")) {
      this.vy += GRAVITY * 0.25 * scaledDt;
      this.py = Math.max(120, this.py + this.vy * scaledDt);
    } else {
      this.vy += GRAVITY * scaledDt;
      this.py += this.vy * scaledDt;
    }
    if (this.py >= GROUND_Y) {
      this.py = GROUND_Y;
      if (wasAir) {
        this.audio.play("land");
        this.particles.emit(12, {
          x: this.px,
          y: GROUND_Y,
          color: "#ffffff",
          size: 3,
          maxLife: 0.35,
          speed: 110,
          gravity: 500,
        });
      }
      this.vy = 0;
      this.jumps = 0;
    }

    // Scoring
    const mult = (this.powerups.has("double") ? 2 : 1) * (1 + Math.floor(this.combo / 5) * 0.25);
    this.distance += (this.speed * boost * scaledDt) / 12;
    this.score += this.speed * boost * scaledDt * 0.06 * mult;

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // Power-up timers
    for (const [k, v] of this.powerups) {
      const left = v - dt;
      if (left <= 0) this.powerups.delete(k);
      else this.powerups.set(k, left);
    }

    this.spawnLogic(scaledDt);
    this.moveEntities(scaledDt, worldSpeed);
    this.collisions();
    this.updateMissions();
    this.emitState();
  }

  private updateWeather(dt: number, worldSpeed: number) {
    const env = this.currentEnv();
    if (env.weather === "clear") return;
    for (const b of this.weatherBits) {
      if (env.weather === "rain") {
        b.y += 900 * b.v * dt;
        b.x -= worldSpeed * 0.3 * dt;
      } else if (env.weather === "snow") {
        b.y += 90 * b.v * dt;
        b.x += Math.sin(b.y * 0.02) * 20 * dt - worldSpeed * 0.05 * dt;
      } else if (env.weather === "dust") {
        b.x -= (260 + worldSpeed * 0.4) * b.v * dt;
      } else if (env.weather === "meteor") {
        b.x -= 500 * b.v * dt;
        b.y += 320 * b.v * dt;
      }
      if (b.y > VIEW_H) b.y = -10;
      if (b.x < -20) {
        b.x = VIEW_W + 20;
        b.y = rand(-20, VIEW_H);
      }
    }
  }

  // ----------------------------------------------------------------- spawning

  private acquireObstacle(): Obstacle {
    let o = this.obstacles.find((x) => !x.active);
    if (!o) {
      o = { active: false, kind: "rock", x: 0, y: 0, w: 0, h: 0, vy: 0, phase: 0, passed: false };
      this.obstacles.push(o);
    }
    return o;
  }

  private acquirePickup(): Pickup {
    let p = this.pickups.find((x) => !x.active);
    if (!p) {
      p = { active: false, kind: "coin", x: 0, y: 0, w: 0, h: 0, phase: 0, baseY: 0 };
      this.pickups.push(p);
    }
    return p;
  }

  private spawnObstacle(kind: ObstacleKind, x: number) {
    const o = this.acquireObstacle();
    o.active = true;
    o.kind = kind;
    o.x = x;
    o.passed = false;
    o.phase = Math.random() * Math.PI * 2;
    o.vy = 0;
    switch (kind) {
      case "cactus-small":
        o.w = 22;
        o.h = 42;
        break;
      case "cactus-large":
        o.w = 34;
        o.h = 68;
        break;
      case "rock":
        o.w = 44;
        o.h = 30;
        break;
      case "barrel":
        o.w = 34;
        o.h = 34;
        break;
      case "walker":
        o.w = 28;
        o.h = 46;
        break;
      case "drone":
        o.w = 42;
        o.h = 26;
        break;
      case "bird":
        o.w = 36;
        o.h = 24;
        break;
    }
    const flying = kind === "drone" || kind === "bird";
    o.y = flying ? GROUND_Y - pick([60, 96, 128]) : GROUND_Y - o.h;
  }

  private spawnLogic(dt: number) {
    this.spawnTimer -= dt;
    this.pickupTimer -= dt;

    if (this.spawnTimer <= 0) {
      const difficulty = Math.min(1, this.elapsed / 120);
      const ground: ObstacleKind[] = ["cactus-small", "cactus-large", "rock", "barrel"];
      if (difficulty > 0.25) ground.push("walker");
      const air: ObstacleKind[] = ["bird", "drone"];
      const useAir = Math.random() < 0.25 + difficulty * 0.15;
      const kind = useAir ? pick(air) : pick(ground);
      const x = VIEW_W + 60;
      this.spawnObstacle(kind, x);
      // Procedural clusters at higher difficulty, always leaving a fair gap.
      if (!useAir && Math.random() < difficulty * 0.6) {
        this.spawnObstacle(pick(ground), x + rand(46, 70));
      }
      const gapSeconds = Math.max(0.62, rand(1.5, 2.3) - difficulty * 0.75) * (340 / this.speed) * 1.25;
      this.spawnTimer = gapSeconds;
    }

    if (this.pickupTimer <= 0) {
      const roll = Math.random();
      if (roll < 0.62) {
        // Coin arc
        const n = Math.floor(rand(4, 8));
        const baseY = GROUND_Y - rand(50, 150);
        for (let i = 0; i < n; i++) {
          const p = this.acquirePickup();
          p.active = true;
          p.kind = "coin";
          p.w = 20;
          p.h = 20;
          p.x = VIEW_W + 40 + i * 36;
          p.baseY = baseY - Math.sin((i / (n - 1)) * Math.PI) * 40;
          p.y = p.baseY;
          p.phase = i * 0.4;
        }
      } else if (roll < 0.78) {
        this.spawnSingle(pick(["gem", "crystal", "mystery"] as const));
      } else {
        this.spawnSingle(pick(Object.keys(POWER_META) as PowerKind[]));
      }
      this.pickupTimer = rand(2.4, 4.6);
    }
  }

  private spawnSingle(kind: PickupKind) {
    const p = this.acquirePickup();
    p.active = true;
    p.kind = kind;
    p.w = 28;
    p.h = 28;
    p.x = VIEW_W + 60;
    p.baseY = GROUND_Y - rand(60, 160);
    p.y = p.baseY;
    p.phase = Math.random() * 6;
  }

  private moveEntities(dt: number, worldSpeed: number) {
    for (const o of this.obstacles) {
      if (!o.active) continue;
      let vx = worldSpeed;
      if (o.kind === "drone") vx *= 1.25;
      if (o.kind === "bird") vx *= 1.12;
      if (o.kind === "walker") vx *= 1.15;
      if (o.kind === "barrel") o.phase += dt * 8;
      if (o.kind === "bird" || o.kind === "drone") o.phase += dt * 6;
      o.x -= vx * dt;
      if (!o.passed && o.x + o.w < this.px) {
        o.passed = true;
        this.addCombo(1, "Clean!");
        this.save.stats.obstaclesAvoided++;
      }
      if (o.x + o.w < -80) o.active = false;
    }

    const magnet = this.powerups.has("magnet");
    for (const p of this.pickups) {
      if (!p.active) continue;
      p.phase += dt * 4;
      p.x -= worldSpeed * dt;
      p.y = p.baseY + Math.sin(p.phase) * 6;
      if (magnet) {
        const dx = this.px - p.x;
        const dy = this.py - 28 - p.y;
        const d = Math.hypot(dx, dy);
        if (d < 260) {
          p.x += (dx / d) * 420 * dt;
          p.baseY += (dy / d) * 420 * dt;
        }
      }
      if (p.x + p.w < -60) p.active = false;
    }
  }

  // --------------------------------------------------------------- collisions

  private playerBox(): Box {
    const h = this.ducking ? 30 : 54;
    return { x: this.px - 16, y: this.py - h, w: 32, h };
  }

  private static hit(a: Box, b: Box) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  private collisions() {
    const box = this.playerBox();

    for (const p of this.pickups) {
      if (!p.active) continue;
      if (!Game.hit(box, p)) continue;
      p.active = false;
      this.collect(p.kind, p.x, p.y);
    }

    if (this.invincible > 0) return;

    for (const o of this.obstacles) {
      if (!o.active) continue;
      // Slightly forgiving hitbox for fairness.
      const shrunk: Box = { x: o.x + 4, y: o.y + 4, w: o.w - 8, h: o.h - 8 };
      if (!Game.hit(box, shrunk)) continue;
      if (this.powerups.has("shield")) {
        this.powerups.delete("shield");
        this.noShieldRun = false;
        this.invincible = 1.4;
        o.active = false;
        this.shake = 0.6;
        this.audio.play("power");
        this.popup("Shield broke!", o.x, o.y, "#38bdf8");
        this.particles.emit(26, { x: o.x, y: o.y, color: "#38bdf8", size: 4, maxLife: 0.6, speed: 200, gravity: 120 });
        return;
      }
      this.die();
      return;
    }
  }

  private collect(kind: PickupKind, x: number, y: number) {
    if (kind === "coin" || kind === "gem" || kind === "crystal" || kind === "mystery") {
      const values: Record<string, number> = { coin: 1, gem: 5, crystal: 12, mystery: 0 };
      let amount = values[kind] ?? 1;
      if (kind === "mystery") amount = Math.floor(rand(3, 25));
      this.runCoins += amount;
      this.save.stats.coinsCollected += amount;
      this.score += amount * 10;
      this.addCombo(1, `+${amount}`);
      this.audio.play("coin");
      this.particles.emit(12, {
        x,
        y,
        color: kind === "coin" ? "#facc15" : kind === "gem" ? "#f472b6" : "#22d3ee",
        size: 3,
        maxLife: 0.5,
        speed: 130,
        gravity: 60,
        shape: "spark",
      });
      this.popup(`+${amount}`, x, y, "#facc15");
      return;
    }
    const meta = POWER_META[kind];
    this.powerups.set(kind, meta.duration);
    this.audio.play("power");
    this.popup(meta.label, x, y, meta.color);
    this.particles.emit(24, { x, y, color: meta.color, size: 4, maxLife: 0.7, speed: 180, gravity: 0 });
  }

  private addCombo(n: number, label: string) {
    this.combo += n;
    this.comboTimer = 2.6;
    if (this.combo > 0 && this.combo % 5 === 0) {
      this.audio.play("combo");
      this.score += this.combo * 12;
      this.popup(`COMBO ×${this.combo}`, this.px + 60, this.py - 90, "#f97316");
    } else if (label !== "Clean!") {
      /* coin popups already handled */
    }
  }

  private popup(text: string, x: number, y: number, color: string) {
    let p = this.popups.find((q) => !q.active);
    if (!p) {
      p = { active: false, x: 0, y: 0, life: 0, text: "", color: "#fff" };
      this.popups.push(p);
    }
    p.active = true;
    p.x = x;
    p.y = y;
    p.life = 0.9;
    p.text = text;
    p.color = color;
  }

  private die() {
    this.phase = "dead";
    this.dead = true;
    this.vy = -420;
    this.shake = 1;
    this.audio.play("death");
    this.audio.stopMusic();
    this.particles.emit(60, {
      x: this.px,
      y: this.py - 26,
      color: "#ff5f5f",
      size: 5,
      maxLife: 0.9,
      speed: 260,
      gravity: 400,
    });

    const finalScore = Math.floor(this.score);
    const s = this.save;
    s.coins += this.runCoins;
    s.stats.gamesPlayed++;
    s.stats.distance += Math.floor(this.distance);
    s.stats.totalScore += finalScore;
    s.stats.bestRun = Math.max(s.stats.bestRun, finalScore);
    s.stats.longestSurvival = Math.max(s.stats.longestSurvival, Math.floor(this.elapsed));
    s.highScore = Math.max(s.highScore, finalScore);
    this.checkAchievements(finalScore);
    this.onSave({ ...s });
    this.emitState();
  }

  private checkAchievements(finalScore: number) {
    const s = this.save;
    for (const a of ACHIEVEMENTS) {
      if (s.achievements.includes(a.id)) continue;
      const ok = a.test({
        score: finalScore,
        coins: s.stats.coinsCollected,
        jumps: s.stats.totalJumps,
        seconds: Math.floor(this.elapsed),
        noShield: this.noShieldRun,
        distance: s.stats.distance,
      });
      if (ok) {
        s.achievements.push(a.id);
        this.newAchievement = a.label;
      }
    }
  }

  private updateMissions() {
    for (const m of this.missions) {
      if (m.done) continue;
      const value =
        m.metric === "coins"
          ? this.runCoins
          : m.metric === "jumps"
            ? this.jumpsThisRun
            : m.metric === "seconds"
              ? Math.floor(this.elapsed)
              : Math.floor(this.score);
      m.progress = Math.min(m.target, value);
      if (m.progress >= m.target) {
        m.done = true;
        this.save.coins += m.reward;
        this.onSave({ ...this.save });
        this.popup(`Mission! +${m.reward}`, this.px + 90, this.py - 120, "#4ade80");
        this.audio.play("combo");
      }
    }
  }

  // ------------------------------------------------------------------ render

  private currentEnv(): Environment {
    const a = ENVIRONMENTS[this.envIndex] as Environment;
    const b = ENVIRONMENTS[(this.envIndex + 1) % ENVIRONMENTS.length] as Environment;
    const t = this.envT > 0.8 ? (this.envT - 0.8) / 0.2 : 0;
    return t > 0 ? blendEnvironments(a, b, t) : a;
  }

  private render() {
    const ctx = this.ctx;
    const env = this.currentEnv();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const reduce = this.save.settings.reducedMotion;
    const shakeX = reduce ? 0 : (Math.random() - 0.5) * 18 * this.shake;
    const shakeY = reduce ? 0 : (Math.random() - 0.5) * 18 * this.shake;
    ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX + shakeX, this.offsetY + shakeY);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, VIEW_W, VIEW_H);
    ctx.clip();

    this.drawSky(env);
    this.drawMountains(env);
    this.drawGround(env);
    this.drawPickups();
    this.drawObstacles(env);
    this.drawPlayer(env);
    this.particles.draw(ctx);
    this.drawWeather(env);
    this.drawPopups();

    ctx.restore();
  }

  private drawSky(env: Environment) {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0, env.sky[0]);
    g.addColorStop(1, env.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    if (env.night) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      for (let i = 0; i < 60; i++) {
        const x = (i * 137.5) % VIEW_W;
        const y = (i * 61.3) % 220;
        const tw = 0.5 + Math.abs(Math.sin(this.runTime * 1.5 + i)) * 1.4;
        ctx.globalAlpha = 0.35 + Math.abs(Math.sin(this.runTime + i)) * 0.5;
        ctx.fillRect(x, y, tw, tw);
      }
      ctx.globalAlpha = 1;
    }

    // Sun / moon with soft glow
    const cx = 760;
    const cy = 92;
    const glow = ctx.createRadialGradient(cx, cy, 6, cx, cy, 90);
    glow.addColorStop(0, env.sun);
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = env.sun;
    ctx.beginPath();
    ctx.arc(cx, cy, env.night ? 22 : 30, 0, Math.PI * 2);
    ctx.fill();

    // Clouds
    ctx.fillStyle = env.night ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.55)";
    for (const c of this.clouds) {
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 44 * c.s, 16 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(c.x + 30 * c.s, c.y + 6 * c.s, 30 * c.s, 12 * c.s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawMountains(env: Environment) {
    const ctx = this.ctx;
    const layers = [
      { color: env.mountainFar, h: 120, w: 320, y: GROUND_Y, scroll: this.scrolls[1] ?? 0 },
      { color: env.mountainNear, h: 80, w: 220, y: GROUND_Y, scroll: this.scrolls[2] ?? 0 },
    ];
    for (const l of layers) {
      ctx.fillStyle = l.color;
      ctx.beginPath();
      ctx.moveTo(-100, l.y);
      const start = -((l.scroll % l.w) + l.w);
      for (let x = start; x < VIEW_W + l.w; x += l.w) {
        ctx.lineTo(x + l.w * 0.5, l.y - l.h);
        ctx.lineTo(x + l.w, l.y);
      }
      ctx.lineTo(VIEW_W + 200, l.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawGround(env: Environment) {
    const ctx = this.ctx;
    ctx.fillStyle = env.ground;
    ctx.fillRect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y);
    ctx.strokeStyle = env.groundLine;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(VIEW_W, GROUND_Y);
    ctx.stroke();

    // Foreground dashes for speed feel
    ctx.fillStyle = env.groundLine;
    const s = this.scrolls[4] ?? 0;
    for (let i = -1; i < 22; i++) {
      const x = ((i * 60 - (s % 60)) + VIEW_W) % (VIEW_W + 60) - 30;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(x, GROUND_Y + 22 + ((i * 13) % 40), 26, 3);
    }
    ctx.globalAlpha = 1;
  }

  private drawObstacles(env: Environment) {
    const ctx = this.ctx;
    for (const o of this.obstacles) {
      if (!o.active) continue;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.25)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 6;
      switch (o.kind) {
        case "cactus-small":
        case "cactus-large": {
          ctx.fillStyle = env.night ? "#2f6b52" : "#3f8f68";
          this.roundRect(o.x + o.w * 0.3, o.y, o.w * 0.4, o.h, 8);
          this.roundRect(o.x, o.y + o.h * 0.35, o.w * 0.28, o.h * 0.3, 6);
          this.roundRect(o.x + o.w * 0.72, o.y + o.h * 0.22, o.w * 0.28, o.h * 0.34, 6);
          break;
        }
        case "rock": {
          ctx.fillStyle = "#7c6f66";
          ctx.beginPath();
          ctx.moveTo(o.x, o.y + o.h);
          ctx.lineTo(o.x + o.w * 0.25, o.y);
          ctx.lineTo(o.x + o.w * 0.7, o.y + o.h * 0.15);
          ctx.lineTo(o.x + o.w, o.y + o.h);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case "barrel": {
          ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
          ctx.rotate(-o.phase);
          ctx.fillStyle = "#c2703b";
          this.roundRect(-o.w / 2, -o.h / 2, o.w, o.h, 8);
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          ctx.fillRect(-o.w / 2, -3, o.w, 6);
          break;
        }
        case "walker": {
          ctx.fillStyle = "#8b5cf6";
          this.roundRect(o.x, o.y, o.w, o.h * 0.7, 8);
          ctx.fillStyle = "#312e81";
          const legSwing = Math.sin(this.runTime * 14) * 6;
          ctx.fillRect(o.x + 4, o.y + o.h * 0.7, 7, o.h * 0.3 + legSwing * 0.2);
          ctx.fillRect(o.x + o.w - 11, o.y + o.h * 0.7, 7, o.h * 0.3 - legSwing * 0.2);
          ctx.fillStyle = "#f0abfc";
          ctx.fillRect(o.x + 6, o.y + 10, o.w - 12, 5);
          break;
        }
        case "drone": {
          const bob = Math.sin(o.phase) * 5;
          ctx.fillStyle = "#334155";
          this.roundRect(o.x, o.y + bob, o.w, o.h * 0.7, 8);
          ctx.fillStyle = env.accent;
          ctx.fillRect(o.x - 6, o.y + bob - 4, o.w + 12, 3);
          ctx.beginPath();
          ctx.arc(o.x + o.w / 2, o.y + bob + o.h * 0.4, 4, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "bird": {
          const flap = Math.sin(o.phase * 2) * 12;
          ctx.fillStyle = env.night ? "#cbd5e1" : "#475569";
          ctx.beginPath();
          ctx.ellipse(o.x + o.w / 2, o.y + o.h / 2, o.w * 0.4, o.h * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(o.x + o.w / 2, o.y + o.h / 2);
          ctx.lineTo(o.x + o.w * 0.1, o.y + o.h / 2 - flap);
          ctx.lineTo(o.x + o.w * 0.55, o.y + o.h / 2 + 4);
          ctx.closePath();
          ctx.fill();
          break;
        }
      }
      ctx.restore();
      if (this.debugHitboxes) {
        ctx.strokeStyle = "#ff0055";
        ctx.lineWidth = 1;
        ctx.strokeRect(o.x + 4, o.y + 4, o.w - 8, o.h - 8);
      }
    }
  }

  private drawPickups() {
    const ctx = this.ctx;
    for (const p of this.pickups) {
      if (!p.active) continue;
      const spark = 0.6 + Math.abs(Math.sin(p.phase)) * 0.4;
      ctx.save();
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      if (p.kind === "coin") {
        ctx.scale(Math.cos(p.phase) * 0.6 + 0.5 || 0.1, 1);
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fde68a";
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "gem" || p.kind === "crystal") {
        ctx.rotate(p.phase * 0.4);
        ctx.fillStyle = p.kind === "gem" ? "#f472b6" : "#22d3ee";
        ctx.globalAlpha = spark;
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(12, 0);
        ctx.lineTo(0, 14);
        ctx.lineTo(-12, 0);
        ctx.closePath();
        ctx.fill();
      } else if (p.kind === "mystery") {
        ctx.fillStyle = "#4ade80";
        this.roundRect(-14, -14, 28, 28, 8);
        ctx.fillStyle = "#052e16";
        ctx.font = "bold 18px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("?", 0, 6);
      } else {
        const meta = POWER_META[p.kind];
        ctx.globalAlpha = spark;
        ctx.fillStyle = meta.color;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.font = "16px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(meta.icon, 0, 6);
      }
      ctx.restore();
    }
  }

  private drawPlayer(env: Environment) {
    const ctx = this.ctx;
    const h = this.ducking ? 30 : 54;
    const y = this.py - h;
    const airborne = this.py < GROUND_Y - 1;
    const bounce = airborne ? 0 : Math.sin(this.runTime * 18) * 2;

    ctx.save();
    if (this.dead) {
      ctx.translate(this.px, this.py);
      ctx.rotate(Math.min(Math.PI / 2, this.deathTime * 4));
      ctx.translate(-this.px, -this.py);
    }
    if (this.invincible > 0 && Math.floor(this.invincible * 12) % 2 === 0) ctx.globalAlpha = 0.4;

    // Shield bubble
    if (this.powerups.has("shield")) {
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(this.px, this.py - 26, 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = env.accent;
    this.roundRect(this.px - 16, y + bounce, 32, h, 10);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Visor
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    this.roundRect(this.px - 6, y + bounce + 8, 18, 10, 4);

    // Legs
    if (!this.ducking) {
      ctx.fillStyle = env.night ? "#e2e8f0" : "#1f2937";
      const swing = airborne ? 8 : Math.sin(this.runTime * 18) * 9;
      ctx.fillRect(this.px - 12, this.py - 10, 8, 10 + swing * 0.4);
      ctx.fillRect(this.px + 4, this.py - 10, 8, 10 - swing * 0.4);
    }

    if (this.powerups.has("jetpack")) {
      ctx.fillStyle = "#f472b6";
      ctx.beginPath();
      ctx.moveTo(this.px - 18, this.py - 20);
      ctx.lineTo(this.px - 26, this.py - 4 + Math.random() * 8);
      ctx.lineTo(this.px - 10, this.py - 8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    if (this.debugHitboxes) {
      const b = this.playerBox();
      ctx.strokeStyle = "#00ff88";
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    }
  }

  private drawWeather(env: Environment) {
    const ctx = this.ctx;
    if (env.weather === "fog") {
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      return;
    }
    if (env.weather === "clear") return;
    for (const b of this.weatherBits) {
      if (env.weather === "rain") {
        ctx.strokeStyle = "rgba(180,220,255,0.55)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - 5, b.y + 14);
        ctx.stroke();
      } else if (env.weather === "snow") {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.s * 0.9, 0, Math.PI * 2);
        ctx.fill();
      } else if (env.weather === "dust") {
        ctx.fillStyle = "rgba(220,180,120,0.35)";
        ctx.fillRect(b.x, b.y, b.s * 6, 1.6);
      } else if (env.weather === "meteor") {
        ctx.strokeStyle = "rgba(255,200,150,0.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x + 26, b.y - 16);
        ctx.stroke();
      }
    }
  }

  private drawPopups() {
    const ctx = this.ctx;
    ctx.textAlign = "center";
    for (const p of this.popups) {
      if (!p.active) continue;
      ctx.globalAlpha = easeOut(Math.min(1, p.life / 0.9));
      ctx.fillStyle = p.color;
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  }

  // ------------------------------------------------------------------- state

  private emitState() {
    const powerups = [...this.powerups.entries()].map(([kind, remaining]) => ({
      kind,
      remaining,
      total: POWER_META[kind].duration,
    }));
    const ach = this.newAchievement;
    this.newAchievement = null;
    this.onState({
      phase: this.phase,
      score: Math.floor(this.score),
      highScore: this.save.highScore,
      distance: Math.floor(this.distance),
      coins: this.save.coins,
      runCoins: this.runCoins,
      multiplier: (this.powerups.has("double") ? 2 : 1) * (1 + Math.floor(this.combo / 5) * 0.25),
      speedLevel: Math.floor((this.speed - 340) / 60) + 1,
      combo: this.combo,
      countdown: Math.max(0, Math.ceil(this.countdown)),
      environment: this.currentEnv().name,
      powerups,
      missions: this.missions.map((m) => ({ ...m })),
      unlockedAchievement: ach,
    });
  }

  /** Push a fresh snapshot on demand (used after external save changes). */
  syncSave(save: SaveData) {
    this.save = save;
    this.audio.setMuted(save.settings.muted);
    this.audio.setVolume(save.settings.volume);
    this.emitState();
  }

  refresh() {
    this.emitState();
  }
}

export { VIEW_W, VIEW_H };
