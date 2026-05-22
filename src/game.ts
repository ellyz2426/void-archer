// Game state machine and core game logic
import { World } from '@iwsdk/core';
import { AudioManager } from './audio';
import { EffectsManager } from './effects';
import { ScoringSystem } from './scoring';
import { AchievementManager } from './achievements';
import { LeaderboardManager } from './leaderboard';
import { Environment } from './environment';
import { BowController } from './bow';
import { ArrowManager } from './arrow';
import { TargetManager, TargetType } from './target';
import { UIManager } from './uimanager';
import { XRInputHandler } from './xrinput';

export enum GameState {
  TITLE = 'title',
  MODE_SELECT = 'mode_select',
  PLAYING = 'playing',
  PAUSED = 'paused',
  RESULTS = 'results',
  LEADERBOARD = 'leaderboard',
  ACHIEVEMENTS = 'achievements',
  SETTINGS = 'settings',
}

export enum GameMode {
  RANGE = 'range',
  SKEET = 'skeet',
  TIME_ATTACK = 'timeattack',
  ENDURANCE = 'endurance',
}

export interface GameContext {
  world: World;
  audio: AudioManager;
  effects: EffectsManager;
  scoring: ScoringSystem;
  achievements: AchievementManager;
  leaderboard: LeaderboardManager;
  environment: Environment;
  bow: BowController;
  arrows: ArrowManager;
  targets: TargetManager;
  ui: UIManager;
  xrInput: XRInputHandler;
}

// Mode-specific config
interface ModeConfig {
  totalRounds: number;
  arrowsPerRound: number;
  timeLimitSec: number;
  maxMisses: number;
  targetTypes: TargetType[];
  spawnInterval: number;
  maxActiveTargets: number;
}

const MODE_CONFIGS: Record<GameMode, ModeConfig> = {
  [GameMode.RANGE]: {
    totalRounds: 5,
    arrowsPerRound: 10,
    timeLimitSec: 0, // no time limit
    maxMisses: Infinity,
    targetTypes: [TargetType.STATIC],
    spawnInterval: 0, // targets pre-placed
    maxActiveTargets: 3,
  },
  [GameMode.SKEET]: {
    totalRounds: 3,
    arrowsPerRound: 20,
    timeLimitSec: 0,
    maxMisses: Infinity,
    targetTypes: [TargetType.MOVING, TargetType.RISING],
    spawnInterval: 2.5,
    maxActiveTargets: 3,
  },
  [GameMode.TIME_ATTACK]: {
    totalRounds: 1,
    arrowsPerRound: 999,
    timeLimitSec: 90,
    maxMisses: Infinity,
    targetTypes: [TargetType.STATIC, TargetType.MOVING, TargetType.OSCILLATING],
    spawnInterval: 1.5,
    maxActiveTargets: 5,
  },
  [GameMode.ENDURANCE]: {
    totalRounds: 1,
    arrowsPerRound: 999,
    timeLimitSec: 0,
    maxMisses: 3,
    targetTypes: [TargetType.STATIC, TargetType.MOVING, TargetType.OSCILLATING, TargetType.RISING],
    spawnInterval: 3.0,
    maxActiveTargets: 4,
  },
};

export class GameManager {
  private ctx: GameContext;
  state: GameState = GameState.TITLE;
  mode: GameMode = GameMode.RANGE;
  private modeConfig: ModeConfig = MODE_CONFIGS[GameMode.RANGE];

  // Game state
  currentRound = 0;
  arrowsLeft = 0;
  timeRemaining = 0;
  misses = 0;
  isGameOver = false;
  private spawnTimer = 0;
  private roundStarted = false;
  private preRoundTimer = 0;
  private roundTargetsSpawned = 0;

  constructor(ctx: GameContext) {
    this.ctx = ctx;
    this.setupInputCallbacks();
  }

  private setupInputCallbacks() {
    // Bow fire callback — when player releases an arrow
    this.ctx.bow.onFire = (origin, direction, power) => {
      if (this.state !== GameState.PLAYING) return;
      if (this.arrowsLeft <= 0 && this.modeConfig.arrowsPerRound < 999) return;

      this.arrowsLeft--;
      this.ctx.arrows.spawnArrow(origin, direction, power);
      this.ctx.audio.playBowRelease(power);
      this.ctx.ui.updateHUD(this.getHUDData());
    };

    // Arrow hit callback
    this.ctx.arrows.onHit = (arrowPos, targetId) => {
      const hitResult = this.ctx.targets.processHit(targetId, arrowPos);
      if (hitResult) {
        const points = this.ctx.scoring.addHit(hitResult.zone, hitResult.distance);
        this.ctx.audio.playTargetHit(hitResult.zone);
        this.ctx.effects.spawnHitEffect(hitResult.position, hitResult.zone);
        this.ctx.ui.showHitFeedback(hitResult.zone, points);
        this.ctx.ui.updateHUD(this.getHUDData());
        this.ctx.achievements.checkHit(hitResult.zone, this.ctx.scoring);
      }
    };

    // Arrow miss callback
    this.ctx.arrows.onMiss = () => {
      this.ctx.scoring.addMiss();
      if (this.mode === GameMode.ENDURANCE) {
        this.misses++;
        if (this.misses >= this.modeConfig.maxMisses) {
          this.endGame();
        }
      }
      this.ctx.ui.updateHUD(this.getHUDData());
    };

    // Target expired (wasn't hit in time)
    this.ctx.targets.onTargetExpired = () => {
      if (this.mode === GameMode.ENDURANCE) {
        this.misses++;
        this.ctx.audio.playMiss();
        if (this.misses >= this.modeConfig.maxMisses) {
          this.endGame();
        }
        this.ctx.ui.updateHUD(this.getHUDData());
      }
    };
  }

  setState(newState: GameState) {
    const oldState = this.state;
    this.state = newState;
    this.ctx.ui.showPanel(newState);

    if (newState === GameState.TITLE) {
      this.ctx.bow.setActive(false);
      this.ctx.targets.clearAll();
      this.ctx.arrows.clearAll();
    } else if (newState === GameState.PLAYING) {
      this.ctx.bow.setActive(true);
    } else if (newState === GameState.PAUSED) {
      this.ctx.bow.setActive(false);
    }
  }

  startGame(mode: GameMode) {
    this.mode = mode;
    this.modeConfig = MODE_CONFIGS[mode];
    this.ctx.scoring.reset();
    this.currentRound = 1;
    this.arrowsLeft = this.modeConfig.arrowsPerRound;
    this.timeRemaining = this.modeConfig.timeLimitSec;
    this.misses = 0;
    this.isGameOver = false;
    this.spawnTimer = 0;
    this.roundStarted = false;
    this.preRoundTimer = 1.5; // 1.5s countdown before round starts
    this.roundTargetsSpawned = 0;

    this.ctx.targets.clearAll();
    this.ctx.arrows.clearAll();
    this.ctx.audio.playGameStart();

    this.setState(GameState.PLAYING);
    this.ctx.ui.updateHUD(this.getHUDData());

    // Pre-place targets for range mode
    if (mode === GameMode.RANGE) {
      this.spawnRangeTargets();
    }
  }

  private spawnRangeTargets() {
    const distances = [5, 8, 12, 16, 20];
    const roundDist = distances[Math.min(this.currentRound - 1, distances.length - 1)];
    const spread = 2 + this.currentRound * 0.5;

    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * spread;
      const y = 1.2 + Math.random() * 1.5;
      this.ctx.targets.spawnTarget(TargetType.STATIC, x, y, -roundDist);
    }
    this.roundTargetsSpawned = 3;
  }

  private endGame() {
    this.isGameOver = true;
    const stats = this.ctx.scoring.getStats();

    // Check achievements
    this.ctx.achievements.checkGameEnd(this.mode, stats);

    // Save to leaderboard
    const isNewBest = this.ctx.leaderboard.addScore(this.mode, stats.totalScore);

    // Show results
    this.ctx.ui.showResults({
      score: stats.totalScore,
      accuracy: stats.accuracy,
      bestCombo: stats.bestCombo,
      bullseyes: stats.bullseyes,
      grade: this.calculateGrade(stats.totalScore, stats.accuracy),
      isNewBest,
    });

    this.ctx.audio.playGameEnd();
    this.setState(GameState.RESULTS);
  }

  private calculateGrade(score: number, accuracy: number): string {
    if (accuracy >= 95 && score >= 5000) return 'S';
    if (accuracy >= 85 && score >= 3000) return 'A';
    if (accuracy >= 70 && score >= 2000) return 'B';
    if (accuracy >= 50 && score >= 1000) return 'C';
    return 'D';
  }

  update(dt: number) {
    if (this.state !== GameState.PLAYING || this.isGameOver) return;

    // Pre-round countdown
    if (!this.roundStarted) {
      this.preRoundTimer -= dt;
      if (this.preRoundTimer <= 0) {
        this.roundStarted = true;
      }
      return;
    }

    // Time attack timer
    if (this.modeConfig.timeLimitSec > 0) {
      this.timeRemaining -= dt;
      this.ctx.ui.updateHUD(this.getHUDData());
      if (this.timeRemaining <= 0) {
        this.timeRemaining = 0;
        this.endGame();
        return;
      }
    }

    // Dynamic target spawning for non-range modes
    if (this.mode !== GameMode.RANGE) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.ctx.targets.activeCount < this.modeConfig.maxActiveTargets) {
        const typeIdx = Math.floor(Math.random() * this.modeConfig.targetTypes.length);
        const type = this.modeConfig.targetTypes[typeIdx];
        const x = (Math.random() - 0.5) * 8;
        const y = 1 + Math.random() * 3;
        const z = -(5 + Math.random() * 15);
        this.ctx.targets.spawnTarget(type, x, y, z);
        this.roundTargetsSpawned++;

        // Speed up spawning over time in endurance
        const speedup = this.mode === GameMode.ENDURANCE
          ? Math.max(0.5, this.modeConfig.spawnInterval - this.roundTargetsSpawned * 0.02)
          : this.modeConfig.spawnInterval;
        this.spawnTimer = speedup;
      }
    }

    // Range mode: check if round targets are all gone
    if (this.mode === GameMode.RANGE && this.ctx.targets.activeCount === 0 && this.roundStarted) {
      if (this.arrowsLeft <= 0 || this.roundTargetsSpawned >= 3) {
        // Advance round
        if (this.currentRound >= this.modeConfig.totalRounds) {
          this.endGame();
        } else {
          this.currentRound++;
          this.arrowsLeft = this.modeConfig.arrowsPerRound;
          this.roundTargetsSpawned = 0;
          this.preRoundTimer = 1.5;
          this.roundStarted = false;
          this.spawnRangeTargets();
          this.ctx.audio.playRoundAdvance();
          this.ctx.ui.updateHUD(this.getHUDData());
        }
      }
    }

    // Skeet: advance rounds based on targets spawned
    if (this.mode === GameMode.SKEET) {
      if (this.roundTargetsSpawned >= this.modeConfig.arrowsPerRound && this.ctx.targets.activeCount === 0) {
        if (this.currentRound >= this.modeConfig.totalRounds) {
          this.endGame();
        } else {
          this.currentRound++;
          this.roundTargetsSpawned = 0;
          this.arrowsLeft = this.modeConfig.arrowsPerRound;
          this.preRoundTimer = 2;
          this.roundStarted = false;
          this.ctx.audio.playRoundAdvance();
          this.ctx.ui.updateHUD(this.getHUDData());
        }
      }
    }
  }

  getHUDData() {
    const stats = this.ctx.scoring.getStats();
    return {
      score: stats.totalScore,
      combo: stats.currentCombo,
      multiplier: stats.multiplier,
      arrowsLeft: this.arrowsLeft,
      round: this.currentRound,
      totalRounds: this.modeConfig.totalRounds,
      timeRemaining: Math.ceil(this.timeRemaining),
      misses: this.misses,
      maxMisses: this.modeConfig.maxMisses,
      mode: this.mode,
    };
  }

  // Called by UI/input handlers
  handleUIAction(action: string) {
    switch (action) {
      case 'play': this.setState(GameState.MODE_SELECT); break;
      case 'mode-range': this.startGame(GameMode.RANGE); break;
      case 'mode-skeet': this.startGame(GameMode.SKEET); break;
      case 'mode-timeattack': this.startGame(GameMode.TIME_ATTACK); break;
      case 'mode-endurance': this.startGame(GameMode.ENDURANCE); break;
      case 'pause':
        if (this.state === GameState.PLAYING) this.setState(GameState.PAUSED);
        break;
      case 'resume':
        if (this.state === GameState.PAUSED) this.setState(GameState.PLAYING);
        break;
      case 'quit':
        this.setState(GameState.TITLE);
        break;
      case 'retry':
        this.startGame(this.mode);
        break;
      case 'leaderboard':
        this.setState(GameState.LEADERBOARD);
        break;
      case 'achievements':
        this.setState(GameState.ACHIEVEMENTS);
        break;
      case 'settings':
        this.setState(GameState.SETTINGS);
        break;
      case 'back':
        this.setState(GameState.TITLE);
        break;
      case 'modes-back':
        this.setState(GameState.TITLE);
        break;
    }
  }
}
