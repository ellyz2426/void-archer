// Scoring system — tracks score, combos, accuracy
import { HitZone } from './target';

const ZONE_POINTS: Record<HitZone, number> = {
  [HitZone.BULLSEYE]: 50,
  [HitZone.INNER]: 30,
  [HitZone.OUTER]: 20,
  [HitZone.EDGE]: 10,
};

export interface GameStats {
  totalScore: number;
  currentCombo: number;
  bestCombo: number;
  multiplier: number;
  totalHits: number;
  totalMisses: number;
  bullseyes: number;
  accuracy: number;
  zoneBreakdown: Record<HitZone, number>;
}

export class ScoringSystem {
  private totalScore = 0;
  private currentCombo = 0;
  private bestCombo = 0;
  private totalHits = 0;
  private totalMisses = 0;
  private bullseyes = 0;
  private zoneBreakdown: Record<HitZone, number> = {
    [HitZone.BULLSEYE]: 0,
    [HitZone.INNER]: 0,
    [HitZone.OUTER]: 0,
    [HitZone.EDGE]: 0,
  };

  reset() {
    this.totalScore = 0;
    this.currentCombo = 0;
    this.bestCombo = 0;
    this.totalHits = 0;
    this.totalMisses = 0;
    this.bullseyes = 0;
    this.zoneBreakdown = {
      [HitZone.BULLSEYE]: 0,
      [HitZone.INNER]: 0,
      [HitZone.OUTER]: 0,
      [HitZone.EDGE]: 0,
    };
  }

  addHit(zone: HitZone, distance: number): number {
    this.totalHits++;
    this.currentCombo++;
    if (this.currentCombo > this.bestCombo) this.bestCombo = this.currentCombo;
    this.zoneBreakdown[zone]++;

    if (zone === HitZone.BULLSEYE) this.bullseyes++;

    // Calculate multiplier from combo
    const multiplier = this.getMultiplier();
    const basePoints = ZONE_POINTS[zone];
    const points = Math.round(basePoints * multiplier);
    this.totalScore += points;

    return points;
  }

  addMiss() {
    this.totalMisses++;
    this.currentCombo = 0; // reset combo on miss
  }

  private getMultiplier(): number {
    if (this.currentCombo >= 20) return 5;
    if (this.currentCombo >= 15) return 4;
    if (this.currentCombo >= 10) return 3;
    if (this.currentCombo >= 5) return 2;
    if (this.currentCombo >= 3) return 1.5;
    return 1;
  }

  getStats(): GameStats {
    const total = this.totalHits + this.totalMisses;
    return {
      totalScore: this.totalScore,
      currentCombo: this.currentCombo,
      bestCombo: this.bestCombo,
      multiplier: this.getMultiplier(),
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
      bullseyes: this.bullseyes,
      accuracy: total > 0 ? Math.round((this.totalHits / total) * 100) : 0,
      zoneBreakdown: { ...this.zoneBreakdown },
    };
  }
}
