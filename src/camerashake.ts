// Camera shake system — visual feedback on impacts
import { World, Vector3 } from '@iwsdk/core';

interface ShakeEvent {
  intensity: number;
  duration: number;
  elapsed: number;
  frequency: number;
}

export class CameraShake {
  private world: World;
  private activeShakes: ShakeEvent[] = [];
  private baseOffset = new Vector3();
  private enabled = true;

  constructor(world: World) {
    this.world = world;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.activeShakes = [];
      this.resetCamera();
    }
  }

  // Light shake — normal hits
  shakeLight() {
    if (!this.enabled) return;
    this.activeShakes.push({
      intensity: 0.008,
      duration: 0.15,
      elapsed: 0,
      frequency: 30,
    });
  }

  // Medium shake — bullseyes
  shakeMedium() {
    if (!this.enabled) return;
    this.activeShakes.push({
      intensity: 0.018,
      duration: 0.25,
      elapsed: 0,
      frequency: 25,
    });
  }

  // Heavy shake — explosions, boss hits
  shakeHeavy() {
    if (!this.enabled) return;
    this.activeShakes.push({
      intensity: 0.035,
      duration: 0.4,
      elapsed: 0,
      frequency: 20,
    });
  }

  // Custom shake
  shake(intensity: number, duration: number) {
    if (!this.enabled) return;
    this.activeShakes.push({
      intensity,
      duration,
      elapsed: 0,
      frequency: 25,
    });
  }

  private resetCamera() {
    // In XR we don't shake the camera — shake is only for browser mode
    const cam = this.world.camera;
    if (cam) {
      cam.position.x -= this.baseOffset.x;
      cam.position.y -= this.baseOffset.y;
    }
    this.baseOffset.set(0, 0, 0);
  }

  update(dt: number) {
    if (!this.enabled) return;

    // Don't shake in XR (nauseating) — check for active XR session
    const xr = (this.world.input as any).xr;
    if (xr?.gamepads?.right) return;

    // Remove old offset
    const cam = this.world.camera;
    if (!cam) return;
    cam.position.x -= this.baseOffset.x;
    cam.position.y -= this.baseOffset.y;

    // Accumulate all active shakes
    let totalX = 0;
    let totalY = 0;

    const toRemove: number[] = [];
    for (let i = 0; i < this.activeShakes.length; i++) {
      const s = this.activeShakes[i];
      s.elapsed += dt;

      if (s.elapsed >= s.duration) {
        toRemove.push(i);
        continue;
      }

      const progress = s.elapsed / s.duration;
      const decay = 1 - progress; // linear falloff
      const t = s.elapsed * s.frequency;
      const currentIntensity = s.intensity * decay;

      totalX += Math.sin(t * 6.28) * currentIntensity * (0.5 + Math.random() * 0.5);
      totalY += Math.cos(t * 4.71) * currentIntensity * (0.5 + Math.random() * 0.5);
    }

    // Remove expired
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.activeShakes.splice(toRemove[i], 1);
    }

    this.baseOffset.set(totalX, totalY, 0);
    cam.position.x += totalX;
    cam.position.y += totalY;
  }
}
