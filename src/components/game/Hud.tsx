import { POWER_META, type HudState } from "@/game/engine";

/** In-run heads-up display: score, run stats, power-up timers, combo. */
export function Hud({ state, onPause }: { state: HudState; onPause: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="panel rounded-2xl px-4 py-3">
          <div className="font-display text-2xl leading-none tabular-nums sm:text-4xl">
            {state.score.toLocaleString()}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] uppercase tracking-widest text-muted-foreground sm:text-xs">
            <span>HI {state.highScore.toLocaleString()}</span>
            <span>{state.distance} m</span>
            <span>SPD {state.speedLevel}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="panel rounded-2xl px-3 py-2 text-sm">
            <span className="text-primary">◎</span>{" "}
            <span className="tabular-nums">{state.runCoins}</span>
            {state.multiplier > 1 && (
              <span className="ml-2 rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
                ×{state.multiplier.toFixed(2)}
              </span>
            )}
          </div>
          <button
            onClick={onPause}
            aria-label="Pause game"
            className="pointer-events-auto panel rounded-2xl px-3 py-2 text-sm transition-transform hover:scale-105"
          >
            ⏸
          </button>
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {state.powerups.map((p) => (
            <div key={p.kind} className="panel w-24 rounded-xl px-2 py-1.5">
              <div className="flex items-center gap-1 text-xs">
                <span>{POWER_META[p.kind].icon}</span>
                <span className="truncate">{POWER_META[p.kind].label}</span>
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
          <div className="animate-pop-in panel rounded-2xl px-4 py-2 font-display text-lg text-primary">
            COMBO ×{state.combo}
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
        <div key={m.id} className="rounded-xl border border-border bg-secondary/40 p-3 text-left">
          <div className="flex items-center justify-between text-xs">
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
