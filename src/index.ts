// Void Archer VR — Entry Point
import { World } from '@iwsdk/core';
import { GameManager, GameState } from './game';
import { Environment } from './environment';
import { BowController } from './bow';
import { ArrowManager } from './arrow';
import { TargetManager } from './target';
import { ScoringSystem } from './scoring';
import { AudioManager } from './audio';
import { XRInputHandler } from './xrinput';
import { UIManager } from './uimanager';
import { EffectsManager } from './effects';
import { AchievementManager } from './achievements';
import { LeaderboardManager } from './leaderboard';

async function main() {
  const container = document.getElementById('scene-container')!;

  const world = await World.create(container, {
    xr: { offer: 'once' },
    input: { canvasPointerEvents: true },
    render: {
      near: 0.01,
      far: 200,
      camera: { position: [0, 1.7, 0], lookAt: [0, 1.65, -5] },
    },
    features: {
      grabbing: true,
      locomotion: { browserControls: true },
      physics: true,
      spatialUI: true,
    },
  });

  // Initialize managers
  const audio = new AudioManager();
  const effects = new EffectsManager(world);
  const scoring = new ScoringSystem();
  const achievements = new AchievementManager();
  const leaderboard = new LeaderboardManager();
  const environment = new Environment(world);
  const bow = new BowController(world, audio);
  const arrows = new ArrowManager(world, effects, audio);
  const targets = new TargetManager(world, effects, audio);
  const ui = new UIManager(world);
  const xrInput = new XRInputHandler(world);

  const game = new GameManager({
    world, audio, effects, scoring, achievements,
    leaderboard, environment, bow, arrows, targets, ui, xrInput,
  });

  // Wire cross-references
  ui.setGameRef(game);
  arrows.checkTargetCollision = (pos, radius) => targets.checkCollision(pos, radius);

  environment.setup();
  await ui.init();
  game.setState(GameState.TITLE);
  audio.playAmbient();

  // Main game loop
  let lastTime = performance.now();
  world.onUpdate(() => {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    // Handle pause toggle
    if (xrInput.consumeEscape() || xrInput.bDown) {
      if (game.state === GameState.PLAYING) {
        game.handleUIAction('pause');
      } else if (game.state === GameState.PAUSED) {
        game.handleUIAction('resume');
      }
    }

    game.update(dt);
    bow.update(dt);
    arrows.update(dt);
    targets.update(dt);
    effects.update(dt);
    environment.update(dt);
    xrInput.update(dt);
  });
}

main().catch(console.error);
