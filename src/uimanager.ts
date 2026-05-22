// UI Manager — creates and manages all PanelUI panels
import { World, PanelUI, PanelDocument, Follower, FollowBehavior, ScreenSpace, Vector3 } from '@iwsdk/core';
import { GameState } from './game';
import { HitZone } from './target';

type UIKitDocument = any; // Runtime type from PanelDocument

interface PanelEntry {
  entity: any;
  doc: UIKitDocument | null;
  state: GameState | 'hit_feedback';
}

export interface HUDData {
  score: number;
  combo: number;
  multiplier: number;
  arrowsLeft: number;
  round: number;
  totalRounds: number;
  timeRemaining: number;
  misses: number;
  maxMisses: number;
  mode: string;
}

export interface ResultsData {
  score: number;
  accuracy: number;
  bestCombo: number;
  bullseyes: number;
  grade: string;
  isNewBest: boolean;
}

export class UIManager {
  private world: World;
  private panels: Map<string, PanelEntry> = new Map();
  private gameRef: any = null; // Set after game init
  private hitFeedbackTimer = 0;

  constructor(world: World) {
    this.world = world;
  }

  setGameRef(game: any) {
    this.gameRef = game;
  }

  async init() {
    // Title screen — world space, facing player
    await this.createWorldPanel('title', '/ui/title.json', 0, 1.6, -3, 1.2, 1.4);

    // Mode selection
    await this.createWorldPanel('modes', '/ui/modes.json', 0, 1.6, -3, 1.2, 1.6);

    // HUD — head-following
    await this.createHUDPanel('hud', '/ui/hud.json');

    // Pause menu — world space
    await this.createWorldPanel('pause', '/ui/pause.json', 0, 1.6, -2.5, 0.8, 0.8);

    // Results — world space
    await this.createWorldPanel('results', '/ui/results.json', 0, 1.6, -3, 1.0, 1.2);

    // Leaderboard — world space
    await this.createWorldPanel('leaderboard', '/ui/leaderboard.json', 0, 1.6, -3, 1.0, 1.4);

    // Achievements — world space
    await this.createWorldPanel('achievements', '/ui/achievements.json', 0, 1.6, -3, 1.0, 1.6);

    // Settings — world space
    await this.createWorldPanel('settings', '/ui/settings.json', 0, 1.6, -3, 1.0, 1.2);

    // Wire up all button handlers after panels are created
    this.wireButtons();
  }

  private async createWorldPanel(name: string, config: string, x: number, y: number, z: number, maxW: number, maxH: number) {
    const entity = this.world.createTransformEntity(undefined, { persistent: true });
    entity.object3D.position.set(x, y, z);
    entity.addComponent(PanelUI, { config, maxWidth: maxW, maxHeight: maxH });
    entity.object3D.visible = false;

    this.panels.set(name, { entity, doc: null, state: GameState.TITLE });
  }

  private async createHUDPanel(name: string, config: string) {
    const entity = this.world.createTransformEntity(undefined, { persistent: true });
    entity.addComponent(PanelUI, { config, maxWidth: 0.45, maxHeight: 0.08 });
    entity.addComponent(Follower, {
      target: (this.world as any).player?.head,
      offsetPosition: [0, 0.12, -0.55],
      behavior: FollowBehavior.PivotY,
      speed: 6,
      tolerance: 0.2,
    });
    entity.object3D.visible = false;

    this.panels.set(name, { entity, doc: null, state: GameState.PLAYING });
  }

  private getDoc(name: string): UIKitDocument | null {
    const panel = this.panels.get(name);
    if (!panel) return null;
    if (!panel.doc) {
      panel.doc = panel.entity.getValue?.(PanelDocument, 'document') || null;
    }
    return panel.doc;
  }

  private wireButtons() {
    // We poll for docs since PanelUI might not have initialized yet
    // Wire them lazily on first show
    this.wireButtonsDeferred();
  }

  private buttonsWired = false;
  private wireButtonsDeferred() {
    if (this.buttonsWired) return;

    // Try to wire — if docs aren't ready yet, retry later
    requestAnimationFrame(() => {
      this.tryWireAll();
      if (!this.buttonsWired) {
        setTimeout(() => this.wireButtonsDeferred(), 200);
      }
    });
  }

  private tryWireAll() {
    let allWired = true;

    // Title buttons
    const titleDoc = this.getDoc('title');
    if (titleDoc) {
      this.wireBtn(titleDoc, 'btn-play', () => this.gameRef?.handleUIAction('play'));
      this.wireBtn(titleDoc, 'btn-leaderboard', () => this.gameRef?.handleUIAction('leaderboard'));
      this.wireBtn(titleDoc, 'btn-achievements', () => this.gameRef?.handleUIAction('achievements'));
      this.wireBtn(titleDoc, 'btn-settings', () => this.gameRef?.handleUIAction('settings'));
    } else allWired = false;

    // Mode buttons
    const modesDoc = this.getDoc('modes');
    if (modesDoc) {
      this.wireBtn(modesDoc, 'btn-range', () => this.gameRef?.handleUIAction('mode-range'));
      this.wireBtn(modesDoc, 'btn-skeet', () => this.gameRef?.handleUIAction('mode-skeet'));
      this.wireBtn(modesDoc, 'btn-timeattack', () => this.gameRef?.handleUIAction('mode-timeattack'));
      this.wireBtn(modesDoc, 'btn-endurance', () => this.gameRef?.handleUIAction('mode-endurance'));
      this.wireBtn(modesDoc, 'btn-modes-back', () => this.gameRef?.handleUIAction('modes-back'));
    } else allWired = false;

    // Pause buttons
    const pauseDoc = this.getDoc('pause');
    if (pauseDoc) {
      this.wireBtn(pauseDoc, 'btn-resume', () => this.gameRef?.handleUIAction('resume'));
      this.wireBtn(pauseDoc, 'btn-quit', () => this.gameRef?.handleUIAction('quit'));
    } else allWired = false;

    // Results buttons
    const resultsDoc = this.getDoc('results');
    if (resultsDoc) {
      this.wireBtn(resultsDoc, 'btn-retry', () => this.gameRef?.handleUIAction('retry'));
      this.wireBtn(resultsDoc, 'btn-results-back', () => this.gameRef?.handleUIAction('back'));
    } else allWired = false;

    // Leaderboard
    const lbDoc = this.getDoc('leaderboard');
    if (lbDoc) {
      this.wireBtn(lbDoc, 'btn-lb-back', () => this.gameRef?.handleUIAction('back'));
    } else allWired = false;

    // Achievements
    const achievDoc = this.getDoc('achievements');
    if (achievDoc) {
      this.wireBtn(achievDoc, 'btn-achiev-back', () => this.gameRef?.handleUIAction('back'));
    } else allWired = false;

    // Settings
    const settingsDoc = this.getDoc('settings');
    if (settingsDoc) {
      this.wireBtn(settingsDoc, 'btn-settings-back', () => this.gameRef?.handleUIAction('back'));
    } else allWired = false;

    this.buttonsWired = allWired;
  }

  private wireBtn(doc: any, id: string, handler: () => void) {
    const el = doc.getElementById?.(id);
    if (el) {
      el.addEventListener?.('click', handler);
    }
  }

  showPanel(state: GameState) {
    // Hide all panels
    for (const [name, panel] of this.panels) {
      panel.entity.object3D.visible = false;
    }

    // Show the appropriate panel
    const panelMap: Record<GameState, string[]> = {
      [GameState.TITLE]: ['title'],
      [GameState.MODE_SELECT]: ['modes'],
      [GameState.PLAYING]: ['hud'],
      [GameState.PAUSED]: ['pause'],
      [GameState.RESULTS]: ['results'],
      [GameState.LEADERBOARD]: ['leaderboard'],
      [GameState.ACHIEVEMENTS]: ['achievements'],
      [GameState.SETTINGS]: ['settings'],
    };

    const toShow = panelMap[state] || [];
    for (const name of toShow) {
      const panel = this.panels.get(name);
      if (panel) {
        panel.entity.object3D.visible = true;
      }
    }

    // Re-try wiring if needed
    if (!this.buttonsWired) this.wireButtonsDeferred();
  }

  updateHUD(data: HUDData) {
    const doc = this.getDoc('hud');
    if (!doc) return;

    this.setTextById(doc, 'hud-score', String(data.score));
    this.setTextById(doc, 'hud-combo', data.multiplier > 1 ? `x${data.multiplier}` : 'x1');

    if (data.mode === 'timeattack') {
      this.setTextById(doc, 'hud-arrows', `${data.timeRemaining}s`);
      this.setTextById(doc, 'hud-round', 'TIME');
    } else if (data.mode === 'endurance') {
      this.setTextById(doc, 'hud-arrows', `♥${data.maxMisses - data.misses}`);
      this.setTextById(doc, 'hud-round', 'ENDURE');
    } else {
      this.setTextById(doc, 'hud-arrows', String(data.arrowsLeft));
      this.setTextById(doc, 'hud-round', `${data.round}/${data.totalRounds}`);
    }
  }

  showHitFeedback(zone: HitZone, points: number) {
    // Visual feedback via HUD color flash — handled in scoring display
    const doc = this.getDoc('hud');
    if (!doc) return;

    const scoreEl = doc.getElementById?.('hud-score');
    if (scoreEl) {
      // Flash the score text
      this.setTextById(doc, 'hud-score', `+${points}`);
      this.hitFeedbackTimer = 0.5;
    }
  }

  showResults(data: ResultsData) {
    const doc = this.getDoc('results');
    if (!doc) return;

    this.setTextById(doc, 'results-final-score', String(data.score));
    this.setTextById(doc, 'results-grade', data.grade);
    this.setTextById(doc, 'results-accuracy', `${data.accuracy}%`);
    this.setTextById(doc, 'results-combo', `x${data.bestCombo}`);
    this.setTextById(doc, 'results-bullseyes', String(data.bullseyes));
    this.setTextById(doc, 'results-new-best', data.isNewBest ? '★ NEW BEST! ★' : '');
  }

  private setTextById(doc: any, id: string, text: string) {
    const el = doc.getElementById?.(id);
    if (el) {
      if (el.text?.value !== undefined) {
        el.text.value = text;
      } else if (el.textContent !== undefined) {
        el.textContent = text;
      }
    }
  }
}
