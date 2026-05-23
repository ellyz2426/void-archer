# Void Archer VR

A cyberpunk archery arena built with [IWSDK](https://iwsdk.dev) 0.4.1 — the Immersive Web SDK for WebXR experiences.

**[Play Now](https://ellyz2426.github.io/void-archer/)** | [GitHub](https://github.com/ellyz2426/void-archer)

## Overview

Void Archer is a physics-based archery game set in a neon-lit cyberpunk arena. Draw your bow, account for gravity and wind, and hit targets across 7 distinct game modes. Play in VR with Quest controllers or in the browser with mouse and keyboard.

All UI is built with IWSDK's spatial PanelUI system — 9 `.uikitml` templates render natively in XR as interactive 3D panels.

## Features

### Core Gameplay
- **Physics-based archery** — Hold to draw, release to fire. Gravity and dynamic wind affect arrow trajectory
- **Aim trajectory preview** — Dotted line shows projected path, opacity scales with draw power
- **Bullseye scoring zones** — 4 zones (Bullseye 50pts, Inner 30pts, Outer 20pts, Edge 10pts) with distance bonus
- **Combo multiplier** — Consecutive hits build x1 through x5 multiplier with milestone rewards at 5x, 10x, 15x, 20x, 30x
- **Floating 3D score popups** — Zone-colored point numbers rise from hit targets

### 7 Game Modes
| Mode | Description |
|------|-------------|
| **Target Range** | 5 rounds of targets at increasing distance. Later rounds add moving targets. |
| **Skeet Shoot** | Moving and rising targets with wind. 3 rounds of 20 targets. |
| **Time Attack** | 90 seconds to score as many points as possible. Obstacles block your shots. |
| **Endurance** | Survive as long as you can — 3 misses and you're out. Difficulty scales over time. |
| **Challenge** | 5 escalating rounds: limited arrows, time limit, 1 miss allowed, increasing wind. Shield obstacles. |
| **Zen** | Infinite arrows, no pressure. Pure practice and relaxation. |
| **Boss Rush** | Face 5 boss targets: large multi-hit enemies with 8 HP, 3 movement phases, and damage progression. |

### 8 Target Types
| Target | Behavior | Bonus |
|--------|----------|-------|
| **Static** | Stationary | 1x |
| **Moving** | Horizontal drift | 1x |
| **Oscillating** | Figure-8 pattern | 1x |
| **Rising** | Launched upward with gravity | 1x |
| **Shrinking** | Decreases in size over time | 1.3x |
| **Phantom** | Cycles between visible and invisible | 1.5x |
| **Armored** | Requires 2 hits to destroy | 1.2x |
| **Boss** | 8 HP, 3 movement phases (slow → figure-8 → erratic), damage color progression | 2x |

### Shield Obstacles
In Challenge, Endurance, Time Attack, and Boss Rush modes, floating shield barriers appear in the arena. These semi-transparent red panels block arrows on contact, forcing you to time shots and find gaps in their movement patterns.

### 4 Environment Themes
| Theme | Vibe |
|-------|------|
| **Holodeck** | Classic neon wireframe grid with cyan accents |
| **Deep Void** | Dark space with distant starfield and purple tones |
| **Neon Arcade** | Bright pink/magenta retro arcade aesthetic |
| **Crystal Cave** | Underground cavern with crystalline blue formations |

Each theme changes the arena lighting, decorations, and arrow trail colors. Select in Settings; persists across sessions.

### Power-Up System
4 power-up types cycle through automatically. Activate with grip button (VR) when ready:
- **Slow Motion** — Slows game time for easier aiming
- **Multishot** — Fires 3 arrows in a spread pattern
- **Precision** — Score multiplier bonus on all hits
- **Explosive** — Arrows explode on impact, damaging nearby targets

### Audio
All sound is procedurally generated with the Web Audio API — zero asset files:
- Bow draw tension and twang release
- Zone-specific target impact (higher pitch for bullseyes)
- Bullseye sparkle chimes
- Combo streak chimes (pitch rises with combo)
- Combo milestone fanfares
- Shield block metallic clang
- Power-up activation chord
- Explosion boom and crackle
- Boss metallic impact and defeat fanfare
- Ambient drone with LFO modulation
- Game start/end melodies
- Arrow ground thud

### Visual Effects
- **Particle effects** — Hit sparkles, target shatter, ground impact, explosions, boss bursts, shield blocks
- **Camera shake** — Light/medium/heavy feedback on hits (disabled in XR to prevent nausea)
- **Floating score popups** — 3D billboarded text with zone-colored styling
- **Combo milestone bursts** — Spectacular ring explosions at streak milestones
- **Theme-colored arrow trails** — Arrows and trails adapt to selected environment
- **Energy orb** — Glows on bow during draw
- **Boss damage progression** — Color shifts from yellow to orange to red as HP decreases

### Progression
- **35 Achievements** — Tracked across all sessions with localStorage persistence
- **Per-mode leaderboards** — Top 10 scores for each game mode
- **Lifetime stats** — Total games, arrows fired, targets hit, bullseyes, best score, play time
- **Grade system** — S/A/B/C/D rating based on score and accuracy

## Controls

### VR (Quest 3 / WebXR)
| Action | Control |
|--------|---------|
| Aim | Point controller |
| Draw bow | Hold trigger |
| Fire | Release trigger |
| Power-up | Grip button |
| Pause | B button |
| Navigate menus | Laser pointer + trigger |

### Browser (Mouse + Keyboard)
| Action | Control |
|--------|---------|
| Aim | Move mouse |
| Draw bow | Hold left click |
| Fire | Release left click |
| Pause | Escape |

## 35 Achievements

| Achievement | Description |
|-------------|-------------|
| First Shot | Hit your first target |
| Hot Streak | 5 consecutive hits |
| Bullseye Master | 10 bullseyes in one game |
| Speed Demon | Score 5000+ in Time Attack |
| Endurance King | Survive 50 targets in Endurance |
| Perfect Round | All bullseyes in Target Range |
| Sharpshooter | 95%+ accuracy in any mode |
| Combo Master | Reach x5 combo multiplier |
| Centurion | Score 10,000 points |
| Skeet Ace | Hit 50 moving targets |
| No Miss | Complete any mode without missing |
| Triple Bullseye | 3 bullseyes in a row |
| Marathon | Play 10 games total |
| All Modes | Play every game mode |
| Wind Master | Bullseye in strong wind |
| Power Player | Use 10 power-ups total |
| Distance King | Bullseye at 20m+ range |
| Combo Legend | 20 consecutive hits |
| Score Legend | Score 20,000 points |
| Void Master | Unlock all other achievements |
| Challenge Clear | Complete a challenge round |
| Headshot Ace | 5 bullseyes in under 10 seconds |
| Long Game | Play for 5 minutes straight |
| Score Master | 50,000 total points |
| Arrow Rain | Fire 100 arrows in one game |
| Phantom Hunter | Destroy 10 phantom targets |
| Armor Breaker | Destroy 10 armored targets |
| Zen Archer | Hit 30 targets in Zen mode |
| Theme Explorer | Play in all 4 environments |
| Shrink Sniper | Bullseye a shrinking target |
| Boss Slayer | Defeat your first boss |
| Boss Master | Complete Boss Rush mode |
| Combo God | Reach a 30-hit combo |
| Score Supreme | 100,000 lifetime points |
| Golden Archer | Get S rank in any mode |

## Tech Stack

- **[IWSDK](https://iwsdk.dev) 0.4.1** — ECS runtime, PanelUI spatial UI, XR controller input
- **Vite 7 + TypeScript** — Build tooling
- **Web Audio API** — Procedural sound generation (no audio files)
- **Three.js** (via `@iwsdk/core`) — 3D rendering
- **9 PanelUI .uikitml templates** — Title, modes, HUD, pause, results, leaderboard, achievements, settings, stats
- **localStorage** — Achievements, leaderboards, stats, settings persistence

## Architecture

```
src/
  index.ts          — Entry point, World creation, ECS system registration
  game.ts           — Game state machine (8 states), mode configs, core loop
  bow.ts            — Bow draw/fire mechanics, browser mouse input, XR controller input
  arrow.ts          — Arrow pool, physics (gravity + wind), collision detection, trails
  target.ts         — Target pool, 8 target types, hit zones, movement patterns
  obstacles.ts      — Shield barrier system, collision detection, movement patterns
  scoring.ts        — Score calculation, combos, distance bonus, stats tracking
  achievements.ts   — 35 achievements with localStorage persistence
  leaderboard.ts    — Per-mode top-10 leaderboards
  powerups.ts       — 4 power-up types, wind system
  effects.ts        — Particle system, score popups, combo milestones, shield sparks
  camerashake.ts    — Camera shake feedback (disabled in XR)
  environment.ts    — Arena construction, decorations, ambient particles
  themes.ts         — 4 environment themes with color configs
  audio.ts          — Procedural Web Audio API sound engine
  uimanager.ts      — PanelUI panel lifecycle, HUD updates, menu navigation
  xrinput.ts        — XR controller state polling

ui/
  title.uikitml     — Title screen with play/settings/achievements buttons
  modes.uikitml     — Mode selection grid
  hud.uikitml       — In-game HUD (score, combo, arrows, time, wind, power-up, boss HP)
  pause.uikitml     — Pause overlay with resume/quit
  results.uikitml   — End-of-game results (grade, stats, new best)
  leaderboard.uikitml — Per-mode top scores
  achievements.uikitml — Achievement list with unlock status
  settings.uikitml  — Volume, SFX, sensitivity, trail, shake, theme picker
  stats.uikitml     — Lifetime career statistics
```

## Development

```bash
npm install
npm run dev     # Start dev server at https://localhost:8081
npm run build   # Production build to dist/
```

### Requirements
- Node.js >=20.19.0 <21 || >=22.12.0 <23 || >=24.0.0

## Version History

| Version | Highlights |
|---------|------------|
| **v1.4** | Shield obstacle system, combo milestone rewards (visual + audio), comprehensive README |
| **v1.3** | Boss Rush mode, camera shake, floating score popups, theme-colored trails |
| **v1.2** | 4 environment themes, shrinking/phantom/armored targets, Zen mode, stats panel |
| **v1.1** | Challenge mode, combo chimes, ambient particles |
| **v1.0** | Core game with 4 modes, PanelUI spatial UI, XR support, 15 achievements |

## License

Built with [Hatch AI](https://hatch.ai).
