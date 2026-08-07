import { POWER_META, type HudState } from "@/game/engine";

/** In-run heads-up display: score, run stats, power-up timers, combo. */
export function Hud({ state, onPause }: { state: HudState; onPause: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2 sm:p-5">
      {/* Top row: score panel + coins + pause */}
      <div className="flex items-start justify-between gap-2">
        <div className="panel rounded-xl sm:rounded-2xl px-2.5 py-2 sm:px-4 sm:py-3">
          <div className="font-display text-lg leading-none tabular-nums sm:text-4xl">
            {state.score.toLocaleString()}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0 text-[8px] sm:text-xs uppercase tracking-widest text-muted-foreground">
            <span>HI {state.highScore.toLocaleString()}</span>
            <span>{state.distance}m</span>
            <span className="hidden sm:inline">SPD {state.speedLevel}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="panel rounded-xl sm:rounded-2xl px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm">
            <span className="text-primary">◎</span>{" "}
            <span className="tabular-nums">{state.runCoins}</span>
            {state.multiplier > 1 && (
              <span className="ml-1.5 rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] sm:text-xs text-primary">
                ×{state.multiplier.toFixed(2)}
              </span>
            )}
          </div>
          {/* Pause button hidden on mobile — on-screen controls handle it */}
          <button
            onClick={onPause}
            aria-label="Pause game"
            className="pointer-events-auto panel hidden sm:flex rounded-2xl px-3 py-2 text-sm transition-transform hover:scale-105"
          >
            ⏸
          </button>
        </div>
      </div>

      {/* Bottom row: power-up timers + combo */}
      <div className="flex items-end justify-between gap-2">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {state.powerups.map((p) => (
            <div key={p.kind} className="panel w-16 sm:w-24 rounded-lg sm:rounded-xl px-1.5 sm:px-2 py-1 sm:py-1.5">
              <div className="flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-xs">
                <span>{POWER_META[p.kind].icon}</span>
                <span className="truncate hidden sm:inline">{POWER_META[p.kind].label}</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-150"
                  style={{ width: `${(p.remaining / p.total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {state.combo > 1 && (
          <div className="animate-pop-in panel rounded-xl sm:rounded-2xl px-2.5 sm:px-4 py-1.5 sm:py-2 font-display text-sm sm:text-lg text-primary">
            ×{state.combo}
          </div>
        )}
      </div>
    </div>
  );
}

/** Missions strip shown on the menu and game-over screens. */
export function MissionList({ missions }: { missions: HudState["missions"] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {missions.map((m) => (
        <div key={m.id} className="rounded-xl border border-border bg-secondary/40 p-2.5 sm:p-3 text-left">
          <div className="flex items-center justify-between text-[11px] sm:text-xs">
            <span className={m.done ? "text-accent" : "text-foreground"}>{m.label}</span>
            <span className="text-muted-foreground">+{m.reward}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${Math.min(100, (m.progress / m.target) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
