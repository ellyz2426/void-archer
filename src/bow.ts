// Bow controller — handles aiming, drawing, and firing arrows
import {
  World, Mesh, Group, CylinderGeometry, SphereGeometry,
  MeshStandardMaterial, MeshBasicMaterial, LineBasicMaterial,
  Color, Vector3, Quaternion, BufferGeometry, Float32BufferAttribute,
  LineSegments, AdditiveBlending,
} from '@iwsdk/core';
import { AudioManager } from './audio';

export class BowController {
  private world: World;
  private audio: AudioManager;
  private bowGroup: Group;
  private bowEntity: any;
  private aimLine: LineSegments;
  private drawIndicator: Mesh;

  private isActive = false;
  private isDrawing = false;
  private drawPower = 0;
  private maxDrawTime = 1.5; // seconds to full power
  private aimDirection = new Vector3(0, 0, -1);
  private aimOrigin = new Vector3(0, 1.5, 0);

  // Browser input state
  private mouseDown = false;
  private mouseX = 0;
  private mouseY = 0;
  private canvasRect: DOMRect | null = null;

  onFire: ((origin: Vector3, direction: Vector3, power: number) => void) | null = null;

  constructor(world: World, audio: AudioManager) {
    this.world = world;
    this.audio = audio;

    // Create bow mesh group
    this.bowGroup = new Group();
    this.createBowMesh();

    // Aim trajectory line
    const aimGeo = new BufferGeometry();
    aimGeo.setAttribute('position', new Float32BufferAttribute(new Float32Array(60 * 3), 3));
    const aimMat = new LineBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.4,
      blending: AdditiveBlending,
    });
    this.aimLine = new LineSegments(aimGeo, aimMat);
    this.aimLine.visible = false;
    world.scene.add(this.aimLine);

    // Draw power indicator (small sphere near bow)
    const drawMat = new MeshBasicMaterial({
      color: 0x00ff66,
      transparent: true,
      opacity: 0.6,
      blending: AdditiveBlending,
    });
    this.drawIndicator = new Mesh(new SphereGeometry(0.02, 8, 8), drawMat);
    this.drawIndicator.visible = false;
    world.scene.add(this.drawIndicator);

    // Setup browser input
    this.setupBrowserInput();
  }

  private createBowMesh() {
    const scene = this.world.scene;

    // Bow limbs (curved cylinders)
    const limbMat = new MeshStandardMaterial({
      color: 0x00ffcc,
      emissive: 0x004433,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2,
    });

    // Upper limb
    const upperLimb = new Mesh(new CylinderGeometry(0.015, 0.01, 0.4, 8), limbMat);
    upperLimb.position.set(0, 0.2, 0);
    upperLimb.rotation.z = 0.2;
    this.bowGroup.add(upperLimb);

    // Lower limb
    const lowerLimb = new Mesh(new CylinderGeometry(0.01, 0.015, 0.4, 8), limbMat);
    lowerLimb.position.set(0, -0.2, 0);
    lowerLimb.rotation.z = -0.2;
    this.bowGroup.add(lowerLimb);

    // Grip
    const gripMat = new MeshStandardMaterial({ color: 0x004433, metalness: 0.6, roughness: 0.4 });
    const grip = new Mesh(new CylinderGeometry(0.02, 0.02, 0.08, 8), gripMat);
    this.bowGroup.add(grip);

    // Bowstring (line)
    const stringGeo = new BufferGeometry();
    stringGeo.setAttribute('position', new Float32BufferAttribute([
      0, 0.38, 0,
      0, 0, 0.05,
      0, 0, 0.05,
      0, -0.38, 0,
    ], 3));
    const stringMat = new LineBasicMaterial({ color: 0x66ffcc, transparent: true, opacity: 0.6 });
    const bowstring = new LineSegments(stringGeo, stringMat);
    this.bowGroup.add(bowstring);

    this.bowGroup.visible = false;
    this.bowGroup.position.set(-0.3, 1.3, -0.3);
    scene.add(this.bowGroup);
  }

  private setupBrowserInput() {
    const canvas = document.getElementById('scene-container');
    if (!canvas) return;

    canvas.addEventListener('mousedown', (e: MouseEvent) => {
      if (!this.isActive) return;
      this.mouseDown = true;
      this.isDrawing = true;
      this.drawPower = 0;
      this.audio.playBowDraw();
    });

    canvas.addEventListener('mouseup', (e: MouseEvent) => {
      if (!this.isActive || !this.mouseDown) return;
      this.mouseDown = false;
      if (this.isDrawing && this.drawPower > 0.1) {
        this.fire();
      }
      this.isDrawing = false;
      this.drawPower = 0;
    });

    canvas.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isActive) return;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.canvasRect = canvas.getBoundingClientRect();
    });

    // Prevent context menu
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setActive(active: boolean) {
    this.isActive = active;
    this.bowGroup.visible = active;
    this.aimLine.visible = false;
    this.drawIndicator.visible = false;
    if (!active) {
      this.isDrawing = false;
      this.drawPower = 0;
    }
  }

  private updateAimFromMouse() {
    if (!this.canvasRect) return;

    // Convert mouse to normalized coordinates
    const nx = ((this.mouseX - this.canvasRect.left) / this.canvasRect.width) * 2 - 1;
    const ny = -((this.mouseY - this.canvasRect.top) / this.canvasRect.height) * 2 + 1;

    // Simple raycasting from camera
    const camera = (this.world as any).camera || (this.world as any).renderer?.xr?.getCamera?.();
    if (!camera) {
      // Fallback: aim based on mouse offset
      this.aimDirection.set(nx * 0.5, ny * 0.3 + 0.05, -1).normalize();
      return;
    }

    // Use camera projection
    this.aimDirection.set(nx * 0.5, ny * 0.3 + 0.05, -1).normalize();
  }

  private updateAimFromXR() {
    const xr = (this.world.input as any).xr;
    if (!xr) return;

    const rightController = xr.gamepads?.right;
    if (!rightController) return;

    // Get controller position and direction from player space
    const spaces = (this.world as any).playerSpaceEntities;
    if (spaces?.raySpaces?.right) {
      const raySpace = spaces.raySpaces.right;
      const pos = raySpace.object3D.getWorldPosition(new Vector3());
      const dir = new Vector3(0, 0, -1).applyQuaternion(raySpace.object3D.getWorldQuaternion(new Quaternion()));
      this.aimOrigin.copy(pos);
      this.aimDirection.copy(dir);

      // Update bow position to match controller
      this.bowGroup.position.copy(pos);
      this.bowGroup.quaternion.copy(raySpace.object3D.getWorldQuaternion(new Quaternion()));
    }
  }

  private updateAimLine() {
    if (!this.isDrawing || this.drawPower < 0.1) {
      this.aimLine.visible = false;
      return;
    }

    this.aimLine.visible = true;
    const positions: number[] = [];
    const gravity = 9.81;
    const speed = 15 + this.drawPower * 25;
    const step = 0.05;

    const pos = this.aimOrigin.clone();
    const vel = this.aimDirection.clone().multiplyScalar(speed);

    for (let t = 0; t < 30; t++) {
      const x1 = pos.x, y1 = pos.y, z1 = pos.z;
      pos.x += vel.x * step;
      pos.y += vel.y * step;
      pos.z += vel.z * step;
      vel.y -= gravity * step;

      positions.push(x1, y1, z1, pos.x, pos.y, pos.z);

      if (pos.y < 0) break;
    }

    const geo = this.aimLine.geometry;
    const attr = geo.getAttribute('position');
    const arr = (attr as any).array as Float32Array;
    arr.fill(0);
    for (let i = 0; i < Math.min(positions.length, arr.length); i++) {
      arr[i] = positions[i];
    }
    (attr as any).needsUpdate = true;
    geo.setDrawRange(0, Math.floor(positions.length / 3));
  }

  private fire() {
    if (!this.onFire) return;

    const power = Math.min(this.drawPower, 1);
    const origin = this.aimOrigin.clone();
    const direction = this.aimDirection.clone();

    this.onFire(origin, direction, power);

    // Reset draw
    this.isDrawing = false;
    this.drawPower = 0;
    this.aimLine.visible = false;
    this.drawIndicator.visible = false;
  }

  update(dt: number) {
    if (!this.isActive) return;

    // Check for XR controller input
    const xr = (this.world.input as any).xr;
    const isXR = xr?.gamepads?.right;

    if (isXR) {
      this.updateAimFromXR();

      // XR trigger for draw/fire
      const rightGP = xr.gamepads.right;
      const triggerPressed = rightGP?.getButtonPressed?.(0); // trigger
      const triggerDown = rightGP?.getButtonDown?.(0);
      const triggerUp = rightGP?.getButtonUp?.(0);

      if (triggerDown && !this.isDrawing) {
        this.isDrawing = true;
        this.drawPower = 0;
        this.audio.playBowDraw();
      }
      if (triggerUp && this.isDrawing && this.drawPower > 0.1) {
        this.fire();
      }
      if (!triggerPressed) {
        this.isDrawing = false;
        this.drawPower = 0;
      }
    } else {
      // Browser aim
      this.updateAimFromMouse();
    }

    // Increase draw power while holding
    if (this.isDrawing) {
      this.drawPower = Math.min(this.drawPower + dt / this.maxDrawTime, 1);

      // Update draw indicator
      this.drawIndicator.visible = true;
      this.drawIndicator.position.copy(this.aimOrigin).add(this.aimDirection.clone().multiplyScalar(0.5));
      const scale = 0.02 + this.drawPower * 0.04;
      this.drawIndicator.scale.setScalar(scale / 0.02);

      // Color shift: green → yellow → red based on power
      const mat = this.drawIndicator.material as MeshBasicMaterial;
      if (this.drawPower < 0.5) {
        mat.color.setHex(0x00ff66);
      } else if (this.drawPower < 0.8) {
        mat.color.setHex(0xffcc00);
      } else {
        mat.color.setHex(0xff4400);
      }
    } else {
      this.drawIndicator.visible = false;
    }

    // Update aim trajectory
    this.updateAimLine();

    // Update bow visual
    if (!isXR) {
      // In browser mode, position bow in view
      this.bowGroup.visible = this.isActive;
    }
  }
}
