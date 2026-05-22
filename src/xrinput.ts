// XR Controller input handler
import { World, Vector3, Quaternion } from '@iwsdk/core';

export class XRInputHandler {
  private world: World;

  // Input state
  triggerDown = false;
  triggerPressed = false;
  triggerUp = false;
  gripDown = false;
  gripPressed = false;
  aDown = false;
  bDown = false;
  thumbstick = { x: 0, y: 0 };

  // Keyboard state (browser fallback)
  escapeDown = false;
  spaceDown = false;
  private escapeJustPressed = false;

  constructor(world: World) {
    this.world = world;
    this.setupKeyboard();
  }

  private setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.escapeDown) {
        this.escapeDown = true;
        this.escapeJustPressed = true;
      }
      if (e.key === ' ') this.spaceDown = true;
    });
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Escape') this.escapeDown = false;
      if (e.key === ' ') this.spaceDown = false;
    });
  }

  consumeEscape(): boolean {
    if (this.escapeJustPressed) {
      this.escapeJustPressed = false;
      return true;
    }
    return false;
  }

  update(dt: number) {
    const xr = (this.world.input as any).xr;
    if (!xr?.gamepads?.right) {
      this.triggerDown = false;
      this.triggerPressed = false;
      this.triggerUp = false;
      this.gripDown = false;
      this.gripPressed = false;
      this.aDown = false;
      this.bDown = false;
      this.thumbstick = { x: 0, y: 0 };
      return;
    }

    const gp = xr.gamepads.right;

    this.triggerDown = gp.getButtonDown?.(0) ?? false;
    this.triggerPressed = gp.getButtonPressed?.(0) ?? false;
    this.triggerUp = gp.getButtonUp?.(0) ?? false;

    this.gripDown = gp.getButtonDown?.(1) ?? false;
    this.gripPressed = gp.getButtonPressed?.(1) ?? false;

    this.aDown = gp.getButtonDown?.(3) ?? false;
    this.bDown = gp.getButtonDown?.(4) ?? false;

    const axes = gp.getAxesValues?.(2);
    this.thumbstick = axes ? { x: axes.x || 0, y: axes.y || 0 } : { x: 0, y: 0 };
  }

  isXRActive(): boolean {
    const xr = (this.world.input as any).xr;
    return !!(xr?.gamepads?.right);
  }

  getControllerPosition(): Vector3 | null {
    const spaces = (this.world as any).playerSpaceEntities;
    if (!spaces?.raySpaces?.right) return null;
    return spaces.raySpaces.right.object3D.getWorldPosition(new Vector3());
  }

  getControllerDirection(): Vector3 | null {
    const spaces = (this.world as any).playerSpaceEntities;
    if (!spaces?.raySpaces?.right) return null;
    const q = spaces.raySpaces.right.object3D.getWorldQuaternion(new Quaternion());
    return new Vector3(0, 0, -1).applyQuaternion(q);
  }
}
