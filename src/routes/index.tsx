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

  // Boot the engine once on the client.
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

  // Touch controls: tap = jump, swipe down = duck, swipe forward = dash
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const game = gameRef.current;
    const start = touchStart.current;
    const t = e.changedTouches[0];
    if (!game || !start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
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
    if (game.phase === "menu" || game.phase === "dead") game.beginRun();
    else game.jump();
  };

  const startRun = () => {
    gameRef.current?.audio.play("click");
    gameRef.current?.beginRun();
  };

  return (
    <main
      className={`relative min-h-[100dvh] w-full overflow-hidden bg-background ${save.settings.highContrast ? "contrast-boost" : ""}`}
    >
      <h1 className="sr-only">Endless Dash — futuristic desert endless runner</h1>

      <div
        className="relative mx-auto flex h-[100dvh] w-full max-w-[1400px] items-center justify-center p-2 sm:p-4"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="relative aspect-[960/420] w-full max-h-full overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-panel)]">
          <canvas ref={canvasRef} className="block h-full w-full touch-none" />

          {hud.phase !== "menu" && <Hud state={hud} onPause={() => gameRef.current?.togglePause()} />}

          {hud.phase === "countdown" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div key={hud.countdown} className="animate-pop-in text-gradient font-display text-8xl">
                {hud.countdown || "GO"}
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-background/50 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground backdrop-blur">
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

          {toast && (
            <div className="animate-pop-in absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground shadow-[var(--shadow-glow)]">
              {toast}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
