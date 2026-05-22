// Wind system — adds environmental challenge
import { World, Vector3 } from '@iwsdk/core';

export class WindSystem {
  private world: World;
  private windDir = new Vector3(0, 0, 0);
  private windStrength = 0;
  private targetWindDir = new Vector3(0, 0, 0);
  private targetWindStrength = 0;
  private changeTimer = 0;
  private changeInterval = 8; // seconds between wind changes
  private enabled = false;
  private maxStrength = 3; // max m/s

  constructor(world: World) {
    this.world = world;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.windDir.set(0, 0, 0);
      this.windStrength = 0;
    }
  }

  setMaxStrength(strength: number) {
    this.maxStrength = strength;
  }

  getWindForce(): Vector3 {
    if (!this.enabled) return new Vector3(0, 0, 0);
    return this.windDir.clone().multiplyScalar(this.windStrength);
  }

  getWindStrength(): number {
    return this.enabled ? this.windStrength : 0;
  }

  getWindDirection(): Vector3 {
    return this.windDir.clone();
  }

  getWindLabel(): string {
    if (!this.enabled || this.windStrength < 0.3) return 'CALM';
    const s = this.windStrength;
    if (s < 1) return 'LIGHT';
    if (s < 2) return 'MODERATE';
    if (s < 3) return 'STRONG';
    return 'GALE';
  }

  getWindArrow(): string {
    if (!this.enabled || this.windStrength < 0.3) return '-';
    const angle = Math.atan2(this.windDir.x, -this.windDir.z);
    const deg = ((angle * 180 / Math.PI) + 360) % 360;
    // Map angle to arrow (8 directions)
    const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
    const idx = Math.round(deg / 45) % 8;
    return arrows[idx];
  }

  update(dt: number) {
    if (!this.enabled) return;

    this.changeTimer -= dt;
    if (this.changeTimer <= 0) {
      // Pick new wind target
      const angle = Math.random() * Math.PI * 2;
      this.targetWindDir.set(Math.cos(angle), 0, Math.sin(angle));
      this.targetWindStrength = Math.random() * this.maxStrength;
      this.changeTimer = this.changeInterval + Math.random() * 4;
    }

    // Smoothly interpolate toward target
    const lerp = Math.min(dt * 0.5, 1);
    this.windDir.lerp(this.targetWindDir, lerp);
    this.windStrength += (this.targetWindStrength - this.windStrength) * lerp;
  }
}

// Power-up system — grip activates special abilities
export enum PowerUpType {
  SLOW_MOTION = 'slow_motion',
  MULTISHOT = 'multishot',
  PRECISION = 'precision',
  EXPLOSIVE = 'explosive',
}

export interface PowerUpState {
  type: PowerUpType;
  remaining: number;
  maxDuration: number;
  charges: number;
}

export class PowerUpSystem {
  private activePowerUp: PowerUpState | null = null;
  private cooldown = 0;
  private cooldownDuration = 15; // seconds between power-up uses
  private cycleIndex = 0;
  private powerUpCycle: PowerUpType[] = [
    PowerUpType.SLOW_MOTION,
    PowerUpType.MULTISHOT,
    PowerUpType.PRECISION,
    PowerUpType.EXPLOSIVE,
  ];

  isActive(): boolean {
    return this.activePowerUp !== null && this.activePowerUp.remaining > 0;
  }

  getActive(): PowerUpState | null {
    return this.activePowerUp;
  }

  getCooldown(): number {
    return this.cooldown;
  }

  getCooldownMax(): number {
    return this.cooldownDuration;
  }

  isReady(): boolean {
    return this.cooldown <= 0 && !this.isActive();
  }

  getNextType(): PowerUpType {
    return this.powerUpCycle[this.cycleIndex % this.powerUpCycle.length];
  }

  activate(): boolean {
    if (!this.isReady()) return false;

    const type = this.powerUpCycle[this.cycleIndex % this.powerUpCycle.length];
    this.cycleIndex++;

    const durations: Record<PowerUpType, number> = {
      [PowerUpType.SLOW_MOTION]: 5,
      [PowerUpType.MULTISHOT]: 8,
      [PowerUpType.PRECISION]: 6,
      [PowerUpType.EXPLOSIVE]: 4,
    };

    this.activePowerUp = {
      type,
      remaining: durations[type],
      maxDuration: durations[type],
      charges: type === PowerUpType.MULTISHOT ? 5 : 0,
    };

    return true;
  }

  getTimeScale(): number {
    if (this.activePowerUp?.type === PowerUpType.SLOW_MOTION && this.activePowerUp.remaining > 0) {
      return 0.4; // 40% speed
    }
    return 1;
  }

  getMultishotCount(): number {
    if (this.activePowerUp?.type === PowerUpType.MULTISHOT && this.activePowerUp.charges > 0) {
      return 3; // 3 arrows per shot
    }
    return 1;
  }

  isExplosive(): boolean {
    return this.activePowerUp?.type === PowerUpType.EXPLOSIVE && this.activePowerUp.remaining > 0;
  }

  getPrecisionBonus(): number {
    if (this.activePowerUp?.type === PowerUpType.PRECISION && this.activePowerUp.remaining > 0) {
      return 2; // double score from precision
    }
    return 1;
  }

  consumeMultishotCharge() {
    if (this.activePowerUp?.type === PowerUpType.MULTISHOT) {
      this.activePowerUp.charges--;
      if (this.activePowerUp.charges <= 0) {
        this.activePowerUp.remaining = 0;
      }
    }
  }

  update(dt: number) {
    if (this.activePowerUp) {
      this.activePowerUp.remaining -= dt;
      if (this.activePowerUp.remaining <= 0) {
        this.activePowerUp = null;
        this.cooldown = this.cooldownDuration;
      }
    }

    if (this.cooldown > 0) {
      this.cooldown -= dt;
      if (this.cooldown < 0) this.cooldown = 0;
    }
  }

  reset() {
    this.activePowerUp = null;
    this.cooldown = 0;
    this.cycleIndex = 0;
  }

  getLabel(): string {
    if (this.isActive()) {
      const labels: Record<PowerUpType, string> = {
        [PowerUpType.SLOW_MOTION]: '<< SLOW MO',
        [PowerUpType.MULTISHOT]: '||| MULTI',
        [PowerUpType.PRECISION]: '(!) PRECISE',
        [PowerUpType.EXPLOSIVE]: '* EXPLOSIVE',
      };
      return labels[this.activePowerUp!.type];
    }
    if (this.cooldown > 0) {
      return `CD: ${Math.ceil(this.cooldown)}s`;
    }
    const nextLabels: Record<PowerUpType, string> = {
      [PowerUpType.SLOW_MOTION]: '[GRIP] <<',
      [PowerUpType.MULTISHOT]: '[GRIP] |||',
      [PowerUpType.PRECISION]: '[GRIP] (!)',
      [PowerUpType.EXPLOSIVE]: '[GRIP] *',
    };
    return nextLabels[this.getNextType()];
  }
}
