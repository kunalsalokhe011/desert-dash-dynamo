/** Tiny WebAudio synth — no asset loading, all sounds generated procedurally. */

type SoundName =
  | "jump"
  | "land"
  | "coin"
  | "power"
  | "death"
  | "click"
  | "combo"
  | "countdown";

const RECIPES: Record<SoundName, { freq: number; to: number; dur: number; type: OscillatorType; gain: number }> = {
  jump: { freq: 380, to: 720, dur: 0.16, type: "triangle", gain: 0.25 },
  land: { freq: 200, to: 90, dur: 0.12, type: "sine", gain: 0.2 },
  coin: { freq: 880, to: 1450, dur: 0.12, type: "square", gain: 0.13 },
  power: { freq: 300, to: 1200, dur: 0.35, type: "sawtooth", gain: 0.14 },
  death: { freq: 420, to: 60, dur: 0.6, type: "sawtooth", gain: 0.22 },
  click: { freq: 600, to: 520, dur: 0.06, type: "square", gain: 0.1 },
  combo: { freq: 660, to: 990, dur: 0.18, type: "triangle", gain: 0.16 },
  countdown: { freq: 520, to: 520, dur: 0.1, type: "sine", gain: 0.18 },
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicTimer: number | null = null;
  muted = false;
  volume = 0.6;

  private ensure() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master) this.master.gain.value = this.muted ? 0 : v;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this.volume;
  }

  play(name: SoundName) {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.muted) return;
    const r = RECIPES[name];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = r.type;
    osc.frequency.setValueAtTime(r.freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, r.to), ctx.currentTime + r.dur);
    gain.gain.setValueAtTime(r.gain, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + r.dur);
    osc.connect(gain).connect(this.master);
    osc.start();
    osc.stop(ctx.currentTime + r.dur + 0.02);
  }

  /** Simple looping arpeggio as background music. */
  startMusic() {
    if (this.musicTimer !== null) return;
    const scale = [196, 233, 262, 294, 349, 392, 466, 523];
    let step = 0;
    this.musicTimer = window.setInterval(() => {
      const ctx = this.ensure();
      if (!ctx || !this.master || this.muted) return;
      const note = scale[step % scale.length] ?? 262;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = step % 8 === 0 ? note / 2 : note;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      osc.connect(gain).connect(this.master);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
      step++;
    }, 260);
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
