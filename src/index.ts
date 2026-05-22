// Void Archer VR — Entry Point
import { World, createSystem } from '@iwsdk/core';
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

// ECS System for per-frame game loop — the correct IWSDK pattern
class GameLoopSystem extends createSystem() {
  private game!: GameManager;
  private bow!: BowController;
  private arrows!: ArrowManager;
  private targets!: TargetManager;
  private effects!: EffectsManager;
  private environment!: Environment;
  private xrInput!: XRInputHandler;
  private lastTime = 0;

  init() {
    this.lastTime = performance.now();
  }

  setRefs(refs: {
    game: GameManager;
    bow: BowController;
    arrows: ArrowManager;
    targets: TargetManager;
    effects: EffectsManager;
    environment: Environment;
    xrInput: XRInputHandler;
  }) {
    this.game = refs.game;
    this.bow = refs.bow;
    this.arrows = refs.arrows;
    this.targets = refs.targets;
    this.effects = refs.effects;
    this.environment = refs.environment;
    this.xrInput = refs.xrInput;
  }

  update(_delta: number, _time: number) {
    if (!this.game) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    // Handle pause toggle
    if (this.xrInput.consumeEscape() || this.xrInput.bDown) {
      if (this.game.state === GameState.PLAYING) {
        this.game.handleUIAction('pause');
      } else if (this.game.state === GameState.PAUSED) {
        this.game.handleUIAction('resume');
      }
    }

    // Grip button → activate power-up
    if (this.xrInput.gripDown && this.game.state === GameState.PLAYING) {
      this.game.handleUIAction('powerup');
    }

    this.game.update(dt);
    this.bow.update(dt);
    this.arrows.update(dt);
    this.targets.update(dt);
    this.effects.update(dt);
    this.environment.update(dt);
    this.xrInput.update(dt);
  }
}

async function main() {
  const container = document.getElementById('scene-container') as HTMLDivElement;

  // Runtime options include camera and browserControls accepted by IWSDK 0.4.1
  // but not yet in the strict TypeScript definitions
  const world = await World.create(container, {
    xr: { offer: 'once' },
    render: {
      near: 0.01,
      far: 200,
    },
    features: {
      grabbing: true,
      locomotion: true,
      physics: true,
      spatialUI: true,
    },
  } as any);

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

  // Register the game loop as a proper ECS system
  world.registerSystem(GameLoopSystem);
  const gameLoop = world.getSystem(GameLoopSystem) as GameLoopSystem;
  gameLoop.setRefs({ game, bow, arrows, targets, effects, environment, xrInput });

  // Set camera starting look direction (aim down range)
  if (world.camera) {
    world.camera.lookAt(0, 1.65, -5);
  }
}

main().catch(console.error);
