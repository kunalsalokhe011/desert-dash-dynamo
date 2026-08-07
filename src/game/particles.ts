/** Pooled particle system — zero allocation during steady-state play. */

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  shape: "circle" | "square" | "spark";
}

export class ParticleSystem {
  private pool: Particle[] = [];

  constructor(capacity = 400) {
    for (let i = 0; i < capacity; i++) {
      this.pool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 2,
        color: "#fff",
        gravity: 0,
        shape: "circle",
      });
    }
  }

  private acquire(): Particle | null {
    for (const p of this.pool) if (!p.active) return p;
    return null;
  }

  emit(count: number, opts: Partial<Omit<Particle, "active">> & { spread?: number; speed?: number }) {
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) return;
      const angle = Math.random() * Math.PI * 2;
      const speed = (opts.speed ?? 60) * (0.4 + Math.random() * 0.8);
      p.active = true;
      p.x = opts.x ?? 0;
      p.y = opts.y ?? 0;
      p.vx = opts.vx !== undefined ? opts.vx * (0.5 + Math.random()) : Math.cos(angle) * speed;
      p.vy = opts.vy !== undefined ? opts.vy * (0.5 + Math.random()) : Math.sin(angle) * speed;
      p.maxLife = opts.maxLife ?? 0.6;
      p.life = p.maxLife;
      p.size = opts.size ?? 3;
      p.color = opts.color ?? "#ffffff";
      p.gravity = opts.gravity ?? 240;
      p.shape = opts.shape ?? "circle";
    }
  }

  update(dt: number) {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.pool) {
      if (!p.active) continue;
      const t = p.life / p.maxLife;
      ctx.globalAlpha = Math.max(0, t);
      ctx.fillStyle = p.color;
      const s = p.size * (p.shape === "spark" ? t : 1);
      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s * (p.shape === "spark" ? 0.5 : 1));
      }
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    for (const p of this.pool) p.active = false;
  }
}
