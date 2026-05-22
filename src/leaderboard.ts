// Leaderboard system — localStorage-based per-mode top scores
import { GameMode } from './game';

interface LeaderboardEntry {
  score: number;
  date: string;
}

const STORAGE_KEY = 'void-archer-leaderboard';
const MAX_ENTRIES = 10;

export class LeaderboardManager {
  private boards: Record<string, LeaderboardEntry[]> = {};

  constructor() {
    this.load();
  }

  private load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.boards = JSON.parse(saved);
      }
    } catch {}

    // Ensure all modes have arrays
    for (const mode of Object.values(GameMode)) {
      if (!this.boards[mode]) this.boards[mode] = [];
    }
  }

  private save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.boards));
  }

  addScore(mode: GameMode, score: number): boolean {
    if (!this.boards[mode]) this.boards[mode] = [];

    const entries = this.boards[mode];
    const entry: LeaderboardEntry = {
      score,
      date: new Date().toLocaleDateString(),
    };

    entries.push(entry);
    entries.sort((a, b) => b.score - a.score);
    if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;

    const isNewBest = entries[0]?.score === score;
    this.save();
    return isNewBest;
  }

  getScores(mode: GameMode): LeaderboardEntry[] {
    return this.boards[mode] || [];
  }

  getBestScore(mode: GameMode): number {
    const entries = this.boards[mode];
    return entries && entries.length > 0 ? entries[0].score : 0;
  }
}
