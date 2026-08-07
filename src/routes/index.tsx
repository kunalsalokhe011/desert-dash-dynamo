import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Game, type HudState } from "@/game/engine";
import { defaultSave, loadSave, persistSave, type SaveData } from "@/game/storage";
import { Hud } from "@/components/game/Hud";
import { GameOver, MainMenu, PauseMenu } from "@/components/game/Menus";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Endless Dash — Futuristic Desert Endless Runner" },
      {
        name: "description",
        content:
          "Endless Dash is a fast, polished HTML5 endless runner: double jumps, dashes, power-ups, shifting deserts, missions and achievements. Play free in your browser.",
      },
      { property: "og:title", content: "Endless Dash — Futuristic Desert Endless Runner" },
      {
        property: "og:description",
        content:
          "Dodge cacti, drones and barrels across shifting desert environments. Collect coins, chain combos and beat your high score.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EndlessDash,
});

const initialHud: HudState = {
  phase: "menu",
  score: 0,
  highScore: 0,
  distance: 0,
  coins: 0,
  runCoins: 0,
  multiplier: 1,
  speedLevel: 1,
  combo: 0,
  countdown: 3,
  environment: "Morning Desert",
  powerups: [],
  missions: [],
  unlockedAchievement: null,
};

/** On-screen control buttons — shown only on touch devices during an active run. */
function MobileControls({
  phase,
  onJump,
  onDuckStart,
  onDuckEnd,
  onDash,
  onPause,
}: {
  phase: HudState["phase"];
  onJump: () => void;
  onDuckStart: () => void;
  onDuckEnd: () => void;
  onDash: () => void;
  onPause: () => void;
}) {
  if (phase === "menu" || phase === "dead" || phase === "countdown") return null;

  const btn =
    "pointer-events-auto select-none touch-none rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm active:scale-90 active:bg-white/25 transition-transform duration-75 flex items-center justify-center text-white/90 text-2xl";

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between px-4"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      {/* Left: Dash + Duck */}
      <div className="flex gap-3">
        <button aria-label="Dash" className={`${btn} w-14 h-14`}
          onPointerDown={(e) => { e.preventDefault(); onDash(); }}>⚡</button>
        <button aria-label="Duck" className={`${btn} w-14 h-14`}
          onPointerDown={(e) => { e.preventDefault(); onDuckStart(); }}
          onPointerUp={(e) => { e.preventDefault(); onDuckEnd(); }}
          onPointerCancel={(e) => { e.preventDefault(); onDuckEnd(); }}>↓</button>
      </div>

      {/* Right: Pause + Jump */}
      <div className="flex gap-3">
        <button aria-label="Pause" className={`${btn} w-14 h-14 text-lg`}
          onPointerDown={(e) => { e.preventDefault(); onPause(); }}>⏸</button>
        <button aria-label="Jump" className={`${btn} w-16 h-16 text-3xl`}
          onPointerDown={(e) => { e.preventDefault(); onJump(); }}>↑</button>
      </div>
    </div>
  );
}

/** Shown in portrait mode — tells the user to rotate. */
function RotatePrompt() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background gap-4 landscape:hidden">
      <div className="text-5xl animate-bounce">📱</div>
      <p className="font-display text-xl text-foreground">Rotate to play</p>
      <p className="text-sm text-muted-foreground">This game plays best in landscape</p>
    </div>
  );
}

function EndlessDash() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const saveRef = useRef<SaveData>(defaultSave);
  const [save, setSave] = useState<SaveData>(defaultSave);
  const [hud, setHud] = useState<HudState>(initialHud);
  const [toast, setToast] = useState<string | null>(null);

  const applySave = useCallback((next: SaveData) => {
    saveRef.current = next;
    setSave(next);
    persistSave(next);
    gameRef.current?.syncSave(next);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const loaded = loadSave();
    saveRef.current = loaded;
    setSave(loaded);

    const game = new Game(
      canvas,
      loaded,
      (s) => {
        setHud(s);
        if (s.unlockedAchievement) setToast(`🏅 ${s.unlockedAchievement}`);
      },
      (s) => {
        saveRef.current = s;
        setSave(s);
        persistSave(s);
      },
    );
    gameRef.current = game;
    game.refresh();
    game.start();

    const onResize = () => game.resize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Keyboard controls
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const game = gameRef.current;
      if (!game) return;
      switch (e.code) {
        case "Space":
        case "ArrowUp":
        case "KeyW":
          e.preventDefault();
          if (game.phase === "menu" || game.phase === "dead") game.beginRun();
          else game.jump();
          break;
        case "ArrowDown":
        case "KeyS":
          e.preventDefault();
          game.setDuck(true);
          break;
        case "ShiftLeft":
        case "ShiftRight":
          game.dash();
          break;
        case "KeyP":
        case "Escape":
          game.togglePause();
          break;
        case "KeyH":
          game.debugHitboxes = !game.debugHitboxes;
          break;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "ArrowDown" || e.code === "KeyS") gameRef.current?.setDuck(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Swipe fallback for areas not covered by buttons
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const game = gameRef.current;
    const start = touchStart.current;
    const t = e.changedTouches[0];
    if (!game || !start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;

    // Only handle swipe/tap gestures during an active run — never on menu or dead screens
    // (those screens have their own buttons)
    if (game.phase === "menu" || game.phase === "dead") return;

    game.setDuck(false);
    if (dy > 50 && Math.abs(dy) > Math.abs(dx)) {
      game.setDuck(true);
      window.setTimeout(() => game.setDuck(false), 550);
      return;
    }
    if (dx > 70 && Math.abs(dx) > Math.abs(dy)) {
      game.dash();
      return;
    }
    game.jump();
  };

  const startRun = () => {
    gameRef.current?.audio.play("click");
    gameRef.current?.beginRun();
  };

  return (
    <>
      {/* Portrait overlay — prompts rotation on phones */}
      <RotatePrompt />

      <main
        className={`relative w-full bg-background ${save.settings.highContrast ? "contrast-boost" : ""}`}
        style={{
          height: "100dvh",
          touchAction: "none",
        }}
      >
        <h1 className="sr-only">Endless Dash — futuristic desert endless runner</h1>

        {/*
          Full-screen game wrapper.
          On desktop: centred with max-width + padding, preserving the 960/420 ratio.
          On mobile landscape: fills the entire screen edge-to-edge with no padding,
          safe-area insets handle notches/home bars.
        */}
        <div
          className="relative mx-auto flex h-full w-full items-center justify-center sm:p-4 sm:max-w-[1400px]"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/*
            Canvas container:
            - Mobile landscape: fills full width & height (edge-to-edge), no border-radius on edges
            - Desktop: constrained by aspect ratio, rounded corners, max width
          */}
          <div
            className="relative overflow-hidden border border-border shadow-[var(--shadow-panel)]
                        w-full h-full
                        sm:h-auto sm:aspect-[960/420] sm:rounded-3xl"
          >

            <canvas ref={canvasRef} className="block h-full w-full touch-none" />

            {hud.phase !== "menu" && (
              <Hud state={hud} onPause={() => gameRef.current?.togglePause()} />
            )}

            {hud.phase === "countdown" && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div key={hud.countdown} className="animate-pop-in text-gradient font-display text-6xl sm:text-8xl">
                  {hud.countdown || "GO"}
                </div>
              </div>
            )}

            <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-background/50 px-2.5 py-0.5 text-[9px] uppercase tracking-[0.3em] text-muted-foreground backdrop-blur">
              {hud.environment}
            </div>

            {hud.phase === "menu" && (
              <MainMenu state={hud} save={save} onPlay={startRun} onSave={applySave} />
            )}
            {hud.phase === "paused" && (
              <PauseMenu
                onResume={() => gameRef.current?.togglePause()}
                onMenu={() => gameRef.current?.toMenu()}
              />
            )}
            {hud.phase === "dead" && (
              <GameOver state={hud} onRestart={startRun} onMenu={() => gameRef.current?.toMenu()} />
            )}

            <MobileControls
              phase={hud.phase}
              onJump={() => gameRef.current?.jump()}
              onDuckStart={() => gameRef.current?.setDuck(true)}
              onDuckEnd={() => gameRef.current?.setDuck(false)}
              onDash={() => gameRef.current?.dash()}
              onPause={() => gameRef.current?.togglePause()}
            />

            {toast && (
              <div className="animate-pop-in absolute bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground shadow-[var(--shadow-glow)] whitespace-nowrap">
                {toast}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
