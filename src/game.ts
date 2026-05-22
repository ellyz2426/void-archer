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
import { WindSystem, PowerUpSystem } from './powerups';

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
  CHALLENGE = 'challenge',
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
  windEnabled: boolean;
}

const MODE_CONFIGS: Record<GameMode, ModeConfig> = {
  [GameMode.RANGE]: {
    totalRounds: 5,
    arrowsPerRound: 10,
    timeLimitSec: 0,
    maxMisses: Infinity,
    targetTypes: [TargetType.STATIC],
    spawnInterval: 0,
    maxActiveTargets: 3,
    windEnabled: false,
  },
  [GameMode.SKEET]: {
    totalRounds: 3,
    arrowsPerRound: 20,
    timeLimitSec: 0,
    maxMisses: Infinity,
    targetTypes: [TargetType.MOVING, TargetType.RISING],
    spawnInterval: 2.5,
    maxActiveTargets: 3,
    windEnabled: true,
  },
  [GameMode.TIME_ATTACK]: {
    totalRounds: 1,
    arrowsPerRound: 999,
    timeLimitSec: 90,
    maxMisses: Infinity,
    targetTypes: [TargetType.STATIC, TargetType.MOVING, TargetType.OSCILLATING],
    spawnInterval: 1.5,
    maxActiveTargets: 5,
    windEnabled: true,
  },
  [GameMode.ENDURANCE]: {
    totalRounds: 1,
    arrowsPerRound: 999,
    timeLimitSec: 0,
    maxMisses: 3,
    targetTypes: [TargetType.STATIC, TargetType.MOVING, TargetType.OSCILLATING, TargetType.RISING],
    spawnInterval: 3.0,
    maxActiveTargets: 4,
    windEnabled: true,
  },
  [GameMode.CHALLENGE]: {
    totalRounds: 5,
    arrowsPerRound: 5,
    timeLimitSec: 30,
    maxMisses: 1,
    targetTypes: [TargetType.MOVING, TargetType.OSCILLATING, TargetType.RISING],
    spawnInterval: 1.0,
    maxActiveTargets: 6,
    windEnabled: true,
  },
};

export class GameManager {
  private ctx: GameContext;
  state: GameState = GameState.TITLE;
  mode: GameMode = GameMode.RANGE;
  private modeConfig: ModeConfig = MODE_CONFIGS[GameMode.RANGE];

  // Sub-systems
  wind: WindSystem;
  powerUps: PowerUpSystem;

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
  private gameStartTime = 0;

  // Difficulty scaling
  private difficultyLevel = 1;

  constructor(ctx: GameContext) {
    this.ctx = ctx;
    this.wind = new WindSystem(ctx.world);
    this.powerUps = new PowerUpSystem();
    this.setupInputCallbacks();
  }

  private setupInputCallbacks() {
    // Bow fire callback — when player releases an arrow
    this.ctx.bow.onFire = (origin, direction, power) => {
      if (this.state !== GameState.PLAYING) return;
      if (this.arrowsLeft <= 0 && this.modeConfig.arrowsPerRound < 999) return;

      this.arrowsLeft--;
      this.ctx.scoring.addArrowFired();

      // Multi-shot power-up
      const shotCount = this.powerUps.getMultishotCount();
      if (shotCount > 1) {
        this.powerUps.consumeMultishotCharge();
        // Spread pattern
        const spreadAngle = 0.05;
        for (let i = 0; i < shotCount; i++) {
          const offset = (i - Math.floor(shotCount / 2)) * spreadAngle;
          const spreadDir = direction.clone();
          spreadDir.x += offset;
          spreadDir.normalize();
          this.ctx.arrows.spawnArrow(origin.clone(), spreadDir, power, this.wind.getWindForce());
        }
      } else {
        this.ctx.arrows.spawnArrow(origin, direction, power, this.wind.getWindForce());
      }

      this.ctx.audio.playBowRelease(power);
      this.ctx.ui.updateHUD(this.getHUDData());
    };

    // Arrow hit callback
    this.ctx.arrows.onHit = (arrowPos, targetId) => {
      const hitResult = this.ctx.targets.processHit(targetId, arrowPos);
      if (hitResult) {
        const precisionBonus = this.powerUps.getPrecisionBonus();
        const points = Math.round(this.ctx.scoring.addHit(hitResult.zone, hitResult.distance) * precisionBonus);
        this.ctx.audio.playTargetHit(hitResult.zone);
        this.ctx.effects.spawnHitEffect(hitResult.position, hitResult.zone);

        // Combo chime for growing combos
        const stats = this.ctx.scoring.getStats();
        if (stats.currentCombo >= 3 && stats.currentCombo % 2 === 1) {
          this.ctx.audio.playComboChime(Math.min(stats.currentCombo, 20));
        }

        // Explosive power-up — nearby targets also take damage
        if (this.powerUps.isExplosive()) {
          this.ctx.targets.explosiveRadius(hitResult.position, 3);
          this.ctx.effects.spawnExplosion(hitResult.position);
          this.ctx.audio.playExplosion();
        }

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
    this.state = newState;
    this.ctx.ui.showPanel(newState);

    if (newState === GameState.TITLE) {
      this.ctx.bow.setActive(false);
      this.ctx.targets.clearAll();
      this.ctx.arrows.clearAll();
      this.wind.setEnabled(false);
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
    this.preRoundTimer = 1.5;
    this.roundTargetsSpawned = 0;
    this.difficultyLevel = 1;
    this.gameStartTime = performance.now();

    // Wind setup
    this.wind.setEnabled(this.modeConfig.windEnabled);
    this.wind.setMaxStrength(mode === GameMode.ENDURANCE ? 4 : 2);

    // Reset power-ups
    this.powerUps.reset();

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

    // Later rounds add moving targets
    const useMoving = this.currentRound >= 4;
    const targetCount = Math.min(3 + Math.floor(this.currentRound / 2), 5);

    for (let i = 0; i < targetCount; i++) {
      const x = (i - Math.floor(targetCount / 2)) * spread;
      const y = 1.2 + Math.random() * 1.5;
      const type = useMoving && i > 0 ? TargetType.MOVING : TargetType.STATIC;
      this.ctx.targets.spawnTarget(type, x, y, -roundDist);
    }
    this.roundTargetsSpawned = targetCount;
  }

  private getDifficultyMultiplier(): number {
    // Scales with time and performance
    return 1 + (this.difficultyLevel - 1) * 0.15;
  }

  private endGame() {
    this.isGameOver = true;
    const stats = this.ctx.scoring.getStats();
    const playTime = (performance.now() - this.gameStartTime) / 1000;
    this.ctx.scoring.onGameEnd(playTime);

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
      longestStreak: stats.longestStreak,
      perfectRounds: stats.perfectRounds,
    });

    this.ctx.audio.playGameEnd();
    this.wind.setEnabled(false);
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
    // Update wind and power-ups regardless of game state
    this.wind.update(dt);
    this.powerUps.update(dt);

    if (this.state !== GameState.PLAYING || this.isGameOver) return;

    // Power-up time scale
    const timeScale = this.powerUps.getTimeScale();
    const scaledDt = dt * timeScale;

    // Pre-round countdown
    if (!this.roundStarted) {
      this.preRoundTimer -= dt; // countdown isn't slowed
      if (this.preRoundTimer <= 0) {
        this.roundStarted = true;
      }
      return;
    }

    // Time attack timer
    if (this.modeConfig.timeLimitSec > 0) {
      this.timeRemaining -= scaledDt;
      this.ctx.ui.updateHUD(this.getHUDData());
      if (this.timeRemaining <= 0) {
        this.timeRemaining = 0;
        this.endGame();
        return;
      }
    }

    // Difficulty scaling — increases over time
    const elapsed = (performance.now() - this.gameStartTime) / 1000;
    this.difficultyLevel = 1 + elapsed / 60; // +1 level per minute

    // Dynamic target spawning for non-range modes
    if (this.mode !== GameMode.RANGE) {
      this.spawnTimer -= scaledDt;
      const diffMult = this.getDifficultyMultiplier();
      const spawnInterval = this.modeConfig.spawnInterval / diffMult;
      const maxTargets = Math.min(
        Math.floor(this.modeConfig.maxActiveTargets * diffMult),
        8,
      );

      if (this.spawnTimer <= 0 && this.ctx.targets.activeCount < maxTargets) {
        const typeIdx = Math.floor(Math.random() * this.modeConfig.targetTypes.length);
        const type = this.modeConfig.targetTypes[typeIdx];
        const x = (Math.random() - 0.5) * 8;
        const y = 1 + Math.random() * 3;
        const z = -(5 + Math.random() * 15);
        this.ctx.targets.spawnTarget(type, x, y, z);
        this.roundTargetsSpawned++;

        // Speed up spawning in endurance
        const speedup = this.mode === GameMode.ENDURANCE
          ? Math.max(0.5, spawnInterval - this.roundTargetsSpawned * 0.01)
          : spawnInterval;
        this.spawnTimer = speedup;
      }
    }

    // Range mode: check if round targets are all gone
    if (this.mode === GameMode.RANGE && this.ctx.targets.activeCount === 0 && this.roundStarted) {
      if (this.arrowsLeft <= 0 || this.roundTargetsSpawned >= 3) {
        this.ctx.scoring.onRoundComplete();
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

    // Skeet: advance rounds
    if (this.mode === GameMode.SKEET) {
      if (this.roundTargetsSpawned >= this.modeConfig.arrowsPerRound && this.ctx.targets.activeCount === 0) {
        this.ctx.scoring.onRoundComplete();
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

    // Challenge: advance rounds by time or clearing all targets
    if (this.mode === GameMode.CHALLENGE) {
      if ((this.timeRemaining <= 0 || (this.arrowsLeft <= 0 && this.ctx.arrows.activeCount === 0)) && this.roundStarted) {
        this.ctx.scoring.onRoundComplete();
        if (this.currentRound >= this.modeConfig.totalRounds) {
          this.endGame();
        } else {
          this.currentRound++;
          this.arrowsLeft = this.modeConfig.arrowsPerRound;
          this.timeRemaining = this.modeConfig.timeLimitSec;
          this.roundTargetsSpawned = 0;
          this.preRoundTimer = 2;
          this.roundStarted = false;
          this.ctx.targets.clearAll();
          this.wind.setMaxStrength(2 + this.currentRound);
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
      windLabel: this.wind.getWindLabel(),
      windArrow: this.wind.getWindArrow(),
      powerUpLabel: this.powerUps.getLabel(),
      powerUpActive: this.powerUps.isActive(),
      powerUpReady: this.powerUps.isReady(),
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
      case 'mode-challenge': this.startGame(GameMode.CHALLENGE); break;
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
      case 'powerup':
        if (this.state === GameState.PLAYING) {
          if (this.powerUps.activate()) {
            this.ctx.audio.playPowerUp();
            this.ctx.achievements.onPowerUpUsed();
          }
        }
        break;
    }
  }
}
