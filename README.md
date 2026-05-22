# Void Archer VR

A cyberpunk archery arena built with [IWSDK](https://iwsdk.dev) 0.4.1.

**[Play Now](https://ellyz2426.github.io/void-archer/)** | [Repo](https://github.com/ellyz2426/void-archer)

## Features

- **Physics-based archery** — Hold to draw, release to fire. Gravity + wind affect trajectory.
- **5 Game Modes** — Target Range, Skeet Shoot, Time Attack, Endurance, Challenge
- **XR Ready** — Full VR controller support (trigger to fire, grip for power-ups, B to pause)
- **Browser Fallback** — Mouse/keyboard controls for desktop play
- **Spatial UI** — All menus and HUD built with IWSDK PanelUI (.uikitml) for native XR rendering
- **Power-Up System** — Slow Motion, Multishot, Precision, Explosive (grip-activated, cooldown cycle)
- **Dynamic Wind** — Environmental wind that shifts during gameplay
- **25 Achievements** — Track progress across all modes
- **Per-Mode Leaderboards** — Top 10 scores saved locally
- **Procedural Audio** — All sounds generated with Web Audio API (no asset files)
- **Holodeck Environment** — Neon wireframe arena with floating decorations

## Controls

### VR (Quest 3)
| Action | Control |
|--------|---------|
| Aim | Point controller |
| Draw/Fire | Hold/release trigger |
| Power-up | Grip button |
| Pause | B button |

### Browser
| Action | Control |
|--------|---------|
| Aim | Move mouse |
| Draw/Fire | Hold/release left click |
| Power-up | (grip in XR only) |
| Pause | Escape |

## Game Modes

- **Target Range** — 5 rounds of static targets at increasing distance. Later rounds add moving targets.
- **Skeet Shoot** — Moving and rising targets with wind. 3 rounds of 20 targets.
- **Time Attack** — 90 seconds to hit as many targets as possible.
- **Endurance** — Survive as long as you can. 3 misses and it's over.
- **Challenge** — 5 escalating rounds with limited arrows, time limit, and only 1 miss allowed. Wind increases each round.

## Tech Stack

- IWSDK 0.4.1 (ECS, PanelUI, XR)
- Vite 7 + TypeScript
- Web Audio API (procedural)
- Three.js (via @iwsdk/core)

## Development

```bash
npm install
npm run dev     # Start dev server at https://localhost:8081
npm run build   # Production build to dist/
```

Built with Hatch AI.
