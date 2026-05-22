// XR Controller input handler — uses IWSDK InputComponent API
import { World, Vector3, Quaternion, InputComponent } from '@iwsdk/core';

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

  // Left controller state (for two-handed bow)
  leftGripPressed = false;

  // Keyboard state (browser fallback)
  escapeDown = false;
  spaceDown = false;
  private escapeJustPressed = false;
  private keys = new Set<string>();

  constructor(world: World) {
    this.world = world;
    this.setupKeyboard();
  }

  private setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      this.keys.add(e.key);
      if (e.key === 'Escape' && !this.escapeDown) {
        this.escapeDown = true;
        this.escapeJustPressed = true;
      }
      if (e.key === ' ') this.spaceDown = true;
    });
    document.addEventListener('keyup', (e) => {
      this.keys.delete(e.key);
      if (e.key === 'Escape') this.escapeDown = false;
      if (e.key === ' ') this.spaceDown = false;
    });
  }

  isKeyPressed(key: string): boolean {
    return this.keys.has(key);
  }

  consumeEscape(): boolean {
    if (this.escapeJustPressed) {
      this.escapeJustPressed = false;
      return true;
    }
    return false;
  }

  update(_dt: number) {
    const xr = (this.world.input as any).xr;
    if (!xr?.gamepads?.right) {
      this.triggerDown = false;
      this.triggerPressed = false;
      this.triggerUp = false;
      this.gripDown = false;
      this.gripPressed = false;
      this.aDown = false;
      this.bDown = false;
      this.leftGripPressed = false;
      this.thumbstick = { x: 0, y: 0 };
      return;
    }

    const rightGP = xr.gamepads.right;

    // Use InputComponent enum for correct button mapping
    this.triggerDown = rightGP.getButtonDown?.(InputComponent.Trigger) ?? false;
    this.triggerPressed = rightGP.getButtonPressed?.(InputComponent.Trigger) ?? false;
    this.triggerUp = rightGP.getButtonUp?.(InputComponent.Trigger) ?? false;

    this.gripDown = rightGP.getButtonDown?.(InputComponent.Squeeze) ?? false;
    this.gripPressed = rightGP.getButtonPressed?.(InputComponent.Squeeze) ?? false;

    this.aDown = rightGP.getButtonDown?.(InputComponent.A_Button) ?? false;
    this.bDown = rightGP.getButtonDown?.(InputComponent.B_Button) ?? false;

    const axes = rightGP.getAxesValues?.(InputComponent.Thumbstick);
    this.thumbstick = axes ? { x: axes.x || 0, y: axes.y || 0 } : { x: 0, y: 0 };

    // Left controller grip for two-handed bow mechanic
    const leftGP = xr.gamepads?.left;
    if (leftGP) {
      this.leftGripPressed = leftGP.getButtonPressed?.(InputComponent.Squeeze) ?? false;
    }
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

  getLeftControllerPosition(): Vector3 | null {
    const spaces = (this.world as any).playerSpaceEntities;
    if (!spaces?.gripSpaces?.left) return null;
    return spaces.gripSpaces.left.object3D.getWorldPosition(new Vector3());
  }
}
