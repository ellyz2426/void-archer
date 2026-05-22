// Achievement system — no emojis (PanelUI font doesn't support them)
import { GameMode } from './game';
import { GameStats } from './scoring';
import { HitZone } from './target';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string; // ASCII-safe icon labels
  unlocked: boolean;
}

const ACHIEVEMENT_DEFS: Achievement[] = [
  { id: 'first_shot', name: 'First Shot', description: 'Hit your first target', icon: '[HIT]', unlocked: false },
  { id: 'hot_streak', name: 'Hot Streak', description: '5 consecutive hits', icon: '[x5]', unlocked: false },
  { id: 'bullseye_master', name: 'Bullseye Master', description: '10 bullseyes in one game', icon: '[*]', unlocked: false },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Score 5000+ in Time Attack', icon: '[>>]', unlocked: false },
  { id: 'endurance_king', name: 'Endurance King', description: 'Survive 50 targets in Endurance', icon: '[+]', unlocked: false },
  { id: 'perfect_round', name: 'Perfect Round', description: 'All bullseyes in Target Range', icon: '[S]', unlocked: false },
  { id: 'sharpshooter', name: 'Sharpshooter', description: '95%+ accuracy in any mode', icon: '[!]', unlocked: false },
  { id: 'combo_master', name: 'Combo Master', description: 'Reach x5 combo multiplier', icon: '[x5]', unlocked: false },
  { id: 'centurion', name: 'Centurion', description: 'Score 10,000 points', icon: '[10K]', unlocked: false },
  { id: 'skeet_ace', name: 'Skeet Ace', description: 'Hit 50 moving targets', icon: '[ACE]', unlocked: false },
  { id: 'no_miss', name: 'No Miss', description: 'Complete any mode without missing', icon: '[100]', unlocked: false },
  { id: 'triple_bullseye', name: 'Triple Bullseye', description: '3 bullseyes in a row', icon: '[3x]', unlocked: false },
  { id: 'marathon', name: 'Marathon', description: 'Play 10 games total', icon: '[10]', unlocked: false },
  { id: 'all_modes', name: 'All Modes', description: 'Play every game mode', icon: '[4/4]', unlocked: false },
  { id: 'wind_master', name: 'Wind Master', description: 'Bullseye in strong wind', icon: '[W]', unlocked: false },
  { id: 'power_player', name: 'Power Player', description: 'Use 10 power-ups total', icon: '[PW]', unlocked: false },
  { id: 'distance_king', name: 'Distance King', description: 'Bullseye at 20m+ range', icon: '[FAR]', unlocked: false },
  { id: 'combo_legend', name: 'Combo Legend', description: '20 consecutive hits', icon: '[x20]', unlocked: false },
  { id: 'score_legend', name: 'Score Legend', description: 'Score 20,000 points', icon: '[20K]', unlocked: false },
  { id: 'void_master', name: 'Void Master', description: 'Unlock all other achievements', icon: '[V]', unlocked: false },
  // New Round 3 achievements
  { id: 'challenge_clear', name: 'Challenge Clear', description: 'Complete a challenge round', icon: '[C]', unlocked: false },
  { id: 'headshot_ace', name: 'Headshot Ace', description: '5 bullseyes in under 10 seconds', icon: '[HS]', unlocked: false },
  { id: 'long_game', name: 'Long Game', description: 'Play for 5 minutes straight', icon: '[5M]', unlocked: false },
  { id: 'score_master', name: 'Score Master', description: 'Score 50,000 points total', icon: '[50K]', unlocked: false },
  { id: 'arrow_rain', name: 'Arrow Rain', description: 'Fire 100 arrows in one game', icon: '[100]', unlocked: false },
];

export class AchievementManager {
  private achievements: Achievement[];
  private consecutiveBullseyes = 0;
  private totalGames = 0;
  private modesPlayed = new Set<string>();
  private totalMovingHits = 0;
  private powerUpsUsed = 0;
  private fastBullseyeCount = 0;
  private fastBullseyeTimer = 0;
  private storageKey = 'void-archer-achievements';
  private statsKey = 'void-archer-achiev-stats';

  constructor() {
    this.achievements = ACHIEVEMENT_DEFS.map(a => ({ ...a }));
    this.load();
  }

  private load() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const unlocked: string[] = JSON.parse(saved);
        for (const a of this.achievements) {
          a.unlocked = unlocked.includes(a.id);
        }
      }
      const stats = localStorage.getItem(this.statsKey);
      if (stats) {
        const s = JSON.parse(stats);
        this.totalGames = s.totalGames || 0;
        this.modesPlayed = new Set(s.modesPlayed || []);
        this.totalMovingHits = s.totalMovingHits || 0;
        this.powerUpsUsed = s.powerUpsUsed || 0;
      }
    } catch {}
  }

  private save() {
    const unlocked = this.achievements.filter(a => a.unlocked).map(a => a.id);
    localStorage.setItem(this.storageKey, JSON.stringify(unlocked));
    localStorage.setItem(this.statsKey, JSON.stringify({
      totalGames: this.totalGames,
      modesPlayed: [...this.modesPlayed],
      totalMovingHits: this.totalMovingHits,
      powerUpsUsed: this.powerUpsUsed,
    }));
  }

  private unlock(id: string): boolean {
    const a = this.achievements.find(a => a.id === id);
    if (a && !a.unlocked) {
      a.unlocked = true;
      this.save();
      return true;
    }
    return false;
  }

  onPowerUpUsed() {
    this.powerUpsUsed++;
    if (this.powerUpsUsed >= 10) this.unlock('power_player');
    this.save();
  }

  checkHit(zone: HitZone, stats: any) {
    // First hit
    if (stats.totalHits >= 1) this.unlock('first_shot');

    // Bullseye tracking
    if (zone === HitZone.BULLSEYE) {
      this.consecutiveBullseyes++;
      if (this.consecutiveBullseyes >= 3) this.unlock('triple_bullseye');

      // Fast bullseye tracking
      this.fastBullseyeCount++;
    } else {
      this.consecutiveBullseyes = 0;
    }

    // Combo
    if (stats.currentCombo >= 5) this.unlock('hot_streak');
    if (stats.multiplier >= 5) this.unlock('combo_master');

    // Score
    if (stats.totalScore >= 10000) this.unlock('centurion');
    if (stats.totalScore >= 20000) this.unlock('score_legend');

    // Combo legend
    if (stats.currentCombo >= 20) this.unlock('combo_legend');
  }

  checkGameEnd(mode: GameMode, stats: GameStats) {
    this.totalGames++;
    this.modesPlayed.add(mode);

    // Bullseye master
    if (stats.bullseyes >= 10) this.unlock('bullseye_master');

    // Sharpshooter
    if (stats.accuracy >= 95 && stats.totalHits >= 10) this.unlock('sharpshooter');

    // No miss
    if (stats.totalMisses === 0 && stats.totalHits >= 10) this.unlock('no_miss');

    // Speed demon
    if (mode === GameMode.TIME_ATTACK && stats.totalScore >= 5000) this.unlock('speed_demon');

    // Endurance king
    if (mode === GameMode.ENDURANCE && stats.totalHits >= 50) this.unlock('endurance_king');

    // Perfect round (all bullseyes in range)
    if (mode === GameMode.RANGE && stats.totalHits > 0 && stats.bullseyes === stats.totalHits) {
      this.unlock('perfect_round');
    }

    // Marathon
    if (this.totalGames >= 10) this.unlock('marathon');

    // All modes
    if (this.modesPlayed.size >= 4) this.unlock('all_modes');

    // Arrow rain
    if (stats.totalHits + stats.totalMisses >= 100) this.unlock('arrow_rain');

    // Void master — all others unlocked
    const otherCount = this.achievements.filter(a => a.id !== 'void_master' && a.unlocked).length;
    if (otherCount >= this.achievements.length - 1) this.unlock('void_master');

    this.save();
  }

  getAll(): Achievement[] {
    return this.achievements;
  }

  getUnlockedCount(): number {
    return this.achievements.filter(a => a.unlocked).length;
  }
}
