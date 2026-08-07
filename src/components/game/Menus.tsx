import { useState } from "react";
import { ACHIEVEMENTS, SHOP_ITEMS } from "@/game/progression";
import type { SaveData } from "@/game/storage";
import { MissionList } from "./Hud";
import type { HudState } from "@/game/engine";

type Tab = "shop" | "achievements" | "stats" | "settings";

function Button({
  children,
  onClick,
  variant = "ghost",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "hero" | "ghost" | "soft";
  className?: string;
}) {
  const base =
    "rounded-xl px-4 py-2 sm:px-5 sm:py-2.5 font-display text-sm transition-transform duration-150 hover:scale-[1.03] active:scale-95 disabled:opacity-40";
  const styles = {
    hero: "btn-hero",
    ghost: "border border-border bg-secondary/50 text-foreground hover:bg-secondary",
    soft: "bg-muted text-foreground hover:bg-secondary",
  }[variant];
  return (
    <button onClick={onClick} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-2.5 sm:p-3">
      <div className="font-display text-lg sm:text-xl tabular-nums">{value}</div>
      <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}

/** Main menu with tabbed panels for shop, achievements, stats and settings. */
export function MainMenu({
  state,
  save,
  onPlay,
  onSave,
}: {
  state: HudState;
  save: SaveData;
  onPlay: () => void;
  onSave: (s: SaveData) => void;
}) {
  const [tab, setTab] = useState<Tab | null>(null);

  const buy = (id: string, price: number) => {
    if (save.unlocked.includes(id) || save.coins < price) return;
    onSave({ ...save, coins: save.coins - price, unlocked: [...save.unlocked, id] });
  };

  return (
    <div
      className="absolute inset-0 flex items-start sm:items-center justify-center overflow-y-auto bg-background/70 backdrop-blur-sm"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))", paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))", paddingLeft: "0.75rem", paddingRight: "0.75rem" }}
    >
      <div className="animate-pop-in panel w-full max-w-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-center my-auto">
        <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">Futuristic desert run</p>
        <h1 className="text-gradient mt-1 sm:mt-2 font-display text-4xl sm:text-6xl">Endless Dash</h1>

        <div className="mt-3 sm:mt-5 grid grid-cols-3 gap-2">
          <Stat label="High score" value={save.highScore.toLocaleString()} />
          <Stat label="Coins" value={save.coins.toLocaleString()} />
          <Stat label="Runs" value={save.stats.gamesPlayed} />
        </div>

        <div className="mt-3 sm:mt-5">
          <Button variant="hero" onClick={onPlay} className="w-full py-3 sm:py-4 text-base sm:text-lg">
            ▶ Play
          </Button>
        </div>

        {/* Tab buttons — scrollable row on mobile so they never wrap awkwardly */}
        <div className="mt-2 sm:mt-3 flex gap-2 overflow-x-auto pb-1 justify-start sm:justify-center no-scrollbar">
          {(["shop", "achievements", "stats", "settings"] as Tab[]).map((t) => (
            <Button
              key={t}
              onClick={() => setTab(tab === t ? null : t)}
              className={`capitalize shrink-0 ${tab === t ? "bg-primary/20 border-primary/40 text-primary" : ""}`}
            >
              {t}
            </Button>
          ))}
        </div>

        {tab === "shop" && (
          <div className="mt-3 sm:mt-4 grid gap-2 text-left sm:grid-cols-2">
            {SHOP_ITEMS.map((item) => {
              const owned = save.unlocked.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => buy(item.id, item.price)}
                  disabled={owned || save.coins < item.price}
                  className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-2.5 sm:p-3 text-left transition-colors hover:bg-secondary disabled:opacity-60"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <span className="text-xl">{item.emoji}</span>
                    <span>
                      {item.name}
                      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">
                        {item.kind}
                      </span>
                    </span>
                  </span>
                  <span className="text-xs text-primary shrink-0 ml-2">{owned ? "Owned" : `◎ ${item.price}`}</span>
                </button>
              );
            })}
          </div>
        )}

        {tab === "achievements" && (
          <div className="mt-3 sm:mt-4 grid gap-2 text-left sm:grid-cols-2">
            {ACHIEVEMENTS.map((a) => {
              const got = save.achievements.includes(a.id);
              return (
                <div
                  key={a.id}
                  className={`rounded-xl border p-2.5 sm:p-3 ${got ? "border-accent/60 bg-accent/10" : "border-border bg-secondary/30 opacity-70"}`}
                >
                  <div className="text-sm">{got ? "🏅" : "🔒"} {a.label}</div>
                  <div className="text-[11px] text-muted-foreground">{a.description}</div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "stats" && (
          <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Best run" value={save.stats.bestRun.toLocaleString()} />
            <Stat label="Distance" value={`${save.stats.distance}m`} />
            <Stat label="Jumps" value={save.stats.totalJumps} />
            <Stat label="Coins" value={save.stats.coinsCollected} />
            <Stat
              label="Avg score"
              value={
                save.stats.gamesPlayed ? Math.round(save.stats.totalScore / save.stats.gamesPlayed) : 0
              }
            />
            <Stat label="Longest" value={`${save.stats.longestSurvival}s`} />
            <Stat label="Obstacles" value={save.stats.obstaclesAvoided} />
            <Stat label="Games" value={save.stats.gamesPlayed} />
          </div>
        )}

        {tab === "settings" && (
          <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 text-left">
            <label className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-3 text-sm">
              Mute audio
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={save.settings.muted}
                onChange={(e) => onSave({ ...save, settings: { ...save.settings, muted: e.target.checked } })}
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 p-3 text-sm">
              Volume
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={save.settings.volume}
                onChange={(e) =>
                  onSave({ ...save, settings: { ...save.settings, volume: Number(e.target.value) } })
                }
                className="flex-1 max-w-[140px] accent-[var(--color-primary)]"
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-3 text-sm">
              Reduced motion
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={save.settings.reducedMotion}
                onChange={(e) =>
                  onSave({ ...save, settings: { ...save.settings, reducedMotion: e.target.checked } })
                }
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-3 text-sm">
              High contrast
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={save.settings.highContrast}
                onChange={(e) =>
                  onSave({ ...save, settings: { ...save.settings, highContrast: e.target.checked } })
                }
              />
            </label>
          </div>
        )}

        {!tab && (
          <>
            <div className="mt-3 sm:mt-5">
              <MissionList missions={state.missions} />
            </div>
            <p className="mt-3 text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
              <span className="hidden sm:inline">Space / ↑ jump · ↓ duck · Shift dash · P pause · </span>
              <span className="sm:hidden">Tap anywhere to start · Swipe down to duck · Swipe right to dash</span>
              <span className="hidden sm:inline">Tap to jump · Swipe down to duck · Swipe right to dash</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/** Game-over card with run summary and instant restart. */
export function GameOver({
  state,
  onRestart,
  onMenu,
}: {
  state: HudState;
  onRestart: () => void;
  onMenu: () => void;
}) {
  const share = () => {
    const text = `I scored ${state.score.toLocaleString()} in Endless Dash!`;
    if (navigator.share) void navigator.share({ title: "Endless Dash", text }).catch(() => {});
    else void navigator.clipboard?.writeText(text);
  };
  const best = state.score >= state.highScore && state.score > 0;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-background/70 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto"
    >
      <div className="animate-pop-in panel w-full max-w-md rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-center my-auto">
        <h2 className="font-display text-2xl sm:text-3xl">{best ? "New Best!" : "Run Over"}</h2>
        <div className="text-gradient mt-1 sm:mt-2 font-display text-5xl sm:text-6xl tabular-nums">
          {state.score.toLocaleString()}
        </div>
        <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-2">
          <Stat label="Distance" value={`${state.distance}m`} />
          <Stat label="Coins" value={state.runCoins} />
          <Stat label="Best" value={state.highScore.toLocaleString()} />
        </div>
        <div className="mt-3 sm:mt-5">
          <MissionList missions={state.missions} />
        </div>
        <div className="mt-4 sm:mt-5 flex justify-center gap-2 flex-wrap">
          <Button variant="hero" onClick={onRestart}>
            ↻ Restart
          </Button>
          <Button onClick={share}>Share</Button>
          <Button onClick={onMenu}>Menu</Button>
        </div>
      </div>
    </div>
  );
}

/** Pause overlay. */
export function PauseMenu({ onResume, onMenu }: { onResume: () => void; onMenu: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="animate-pop-in panel w-full max-w-xs rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-center">
        <h2 className="font-display text-2xl">Paused</h2>
        <div className="mt-4 sm:mt-5 flex flex-col gap-2">
          <Button variant="hero" onClick={onResume}>
            Resume
          </Button>
          <Button onClick={onMenu}>Main menu</Button>
        </div>
      </div>
    </div>
  );
}
