// Scoring system — tracks score, combos, accuracy, wind, power-ups, stats
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
  longestStreak: number;
  perfectRounds: number;
}

export interface LifetimeStats {
  totalGamesPlayed: number;
  totalArrowsFired: number;
  totalTargetsHit: number;
  totalBullseyes: number;
  allTimeBestScore: number;
  allTimeBestCombo: number;
  totalPlayTimeSec: number;
}

const LIFETIME_KEY = 'void-archer-lifetime-stats';

export class ScoringSystem {
  private totalScore = 0;
  private currentCombo = 0;
  private bestCombo = 0;
  private totalHits = 0;
  private totalMisses = 0;
  private bullseyes = 0;
  private longestStreak = 0;
  private perfectRounds = 0;
  private roundHits = 0;
  private roundBullseyes = 0;
  private zoneBreakdown: Record<HitZone, number> = {
    [HitZone.BULLSEYE]: 0,
    [HitZone.INNER]: 0,
    [HitZone.OUTER]: 0,
    [HitZone.EDGE]: 0,
  };

  // Lifetime stats
  private lifetime: LifetimeStats;

  constructor() {
    this.lifetime = this.loadLifetimeStats();
  }

  private loadLifetimeStats(): LifetimeStats {
    try {
      const saved = localStorage.getItem(LIFETIME_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      totalGamesPlayed: 0,
      totalArrowsFired: 0,
      totalTargetsHit: 0,
      totalBullseyes: 0,
      allTimeBestScore: 0,
      allTimeBestCombo: 0,
      totalPlayTimeSec: 0,
    };
  }

  private saveLifetimeStats() {
    try {
      localStorage.setItem(LIFETIME_KEY, JSON.stringify(this.lifetime));
    } catch {}
  }

  reset() {
    this.totalScore = 0;
    this.currentCombo = 0;
    this.bestCombo = 0;
    this.totalHits = 0;
    this.totalMisses = 0;
    this.bullseyes = 0;
    this.longestStreak = 0;
    this.perfectRounds = 0;
    this.roundHits = 0;
    this.roundBullseyes = 0;
    this.zoneBreakdown = {
      [HitZone.BULLSEYE]: 0,
      [HitZone.INNER]: 0,
      [HitZone.OUTER]: 0,
      [HitZone.EDGE]: 0,
    };
  }

  addHit(zone: HitZone, distance: number): number {
    this.totalHits++;
    this.roundHits++;
    this.currentCombo++;
    if (this.currentCombo > this.bestCombo) this.bestCombo = this.currentCombo;
    if (this.currentCombo > this.longestStreak) this.longestStreak = this.currentCombo;
    this.zoneBreakdown[zone]++;

    if (zone === HitZone.BULLSEYE) {
      this.bullseyes++;
      this.roundBullseyes++;
    }

    // Calculate multiplier from combo
    const multiplier = this.getMultiplier();
    const basePoints = ZONE_POINTS[zone];

    // Distance bonus: further targets worth more (1.0 to 2.0x at max distance)
    const distBonus = 1 + Math.min(distance / 20, 1);
    const points = Math.round(basePoints * multiplier * distBonus);
    this.totalScore += points;

    // Update lifetime
    this.lifetime.totalTargetsHit++;
    if (zone === HitZone.BULLSEYE) this.lifetime.totalBullseyes++;

    return points;
  }

  addMiss() {
    this.totalMisses++;
    this.currentCombo = 0; // reset combo on miss
  }

  addArrowFired() {
    this.lifetime.totalArrowsFired++;
  }

  onRoundComplete() {
    // Check if it was a perfect round (all hits were bullseyes)
    if (this.roundHits > 0 && this.roundBullseyes === this.roundHits) {
      this.perfectRounds++;
    }
    this.roundHits = 0;
    this.roundBullseyes = 0;
  }

  onGameEnd(playTimeSec: number) {
    this.lifetime.totalGamesPlayed++;
    this.lifetime.totalPlayTimeSec += playTimeSec;
    if (this.totalScore > this.lifetime.allTimeBestScore) {
      this.lifetime.allTimeBestScore = this.totalScore;
    }
    if (this.bestCombo > this.lifetime.allTimeBestCombo) {
      this.lifetime.allTimeBestCombo = this.bestCombo;
    }
    this.saveLifetimeStats();
  }

  getMultiplier(): number {
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
      longestStreak: this.longestStreak,
      perfectRounds: this.perfectRounds,
    };
  }

  getLifetimeStats(): LifetimeStats {
    return { ...this.lifetime };
  }
}
