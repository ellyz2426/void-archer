# Void Archer VR

A holodeck-themed VR archery arena built with [IWSDK](https://iwsdk.dev) 0.4.1. Draw your energy bow, aim through the void, and hit holographic targets with physics-based arrows.

🎯 **[Play Now](https://ellyz2426.github.io/void-archer/)** | 📦 [GitHub](https://github.com/ellyz2426/void-archer)

## Features

### Core Gameplay
- **Physics-based arrow flight** — arrows follow realistic trajectories with gravity
- **Bow draw mechanic** — hold to draw, release to fire; draw time = power
- **Aim trajectory preview** — see your arrow's projected path while drawing
- **Bullseye scoring zones** — 50 (bullseye), 30 (inner), 20 (outer), 10 (edge) points

### Game Modes
- **Target Range** — 5 rounds of stationary targets at increasing distances
- **Skeet Shoot** — moving targets fly through the arena; lead your shots
- **Time Attack** — 90 seconds, unlimited arrows, score as much as possible
- **Endurance** — miss 3 targets and it's game over; survive the void

### Target Types
- **Static** — stationary bullseye targets
- **Moving** — targets that slide left/right
- **Oscillating** — figure-8 motion patterns
- **Rising** — launched upward in an arc (skeet)

### Scoring System
- Combo multiplier: consecutive hits increase your multiplier (x1 → x1.5 → x2 → x3 → x5)
- Miss resets your combo
- Per-mode leaderboards (top 10, localStorage)

### XR Controls (VR)
| Input | Action |
|-------|--------|
| Right trigger | Draw bow / release arrow |
| Right thumbstick | Navigate menus |
| A button | Select / confirm |
| B button | Pause / back |
| Controller aim | Aim direction |

### Browser Controls
| Input | Action |
|-------|--------|
| Mouse position | Aim |
| Click + hold | Draw bow |
| Release click | Fire arrow |
| ESC | Pause |

### Technical
- **All UI via PanelUI** — `.uikitml` spatial panels, zero HTML DOM overlays
- **Head-following HUD** via `Follower` component
- **World-space menus** — title, mode select, results, leaderboard, achievements, settings
- **Procedural audio** — Web Audio API for all sounds (bow draw, twang, target hits, ambient drone)
- **Particle effects** — hit sparkles, target shatter, ground impact
- **15 achievements** — unlocked through gameplay milestones
- **Holodeck aesthetic** — neon wireframe grid, floating geometric decorations, fog depth

## Project Structure

```
void-archer/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── ui/                        # PanelUI templates
│   ├── title.uikitml
│   ├── modes.uikitml
│   ├── hud.uikitml
│   ├── pause.uikitml
│   ├── results.uikitml
│   ├── leaderboard.uikitml
│   ├── achievements.uikitml
│   └── settings.uikitml
└── src/
    ├── index.ts               # Entry point, world creation
    ├── game.ts                # Game state machine, mode logic
    ├── bow.ts                 # Bow controller (XR + browser)
    ├── arrow.ts               # Arrow pool, physics, trails
    ├── target.ts              # Target types, hit detection
    ├── scoring.ts             # Score, combos, multipliers
    ├── audio.ts               # Procedural Web Audio
    ├── environment.ts         # Holodeck environment
    ├── xrinput.ts             # XR controller handler
    ├── uimanager.ts           # PanelUI panel management
    ├── effects.ts             # Particle effects
    ├── achievements.ts        # Achievement system
    └── leaderboard.ts         # Local leaderboard
```

## Development

```bash
npm install
npm run dev    # Start dev server with XR emulation
npm run build  # Production build
```

Requires Node.js ≥20.19.0 and IWSDK 0.4.1.

## Build Info

- **IWSDK:** 0.4.1
- **Source files:** 13
- **UI templates:** 8 `.uikitml` files
- **Lines:** ~6,000+
- Built as part of the daily IWSDK build pipeline
