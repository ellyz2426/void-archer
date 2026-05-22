// Target management — types, spawning, hit detection, scoring zones
import {
  World, Mesh, Group, RingGeometry, CircleGeometry, SphereGeometry, TorusGeometry,
  MeshStandardMaterial, MeshBasicMaterial, LineBasicMaterial,
  Color, Vector3, EdgesGeometry, LineSegments, AdditiveBlending, DoubleSide,
} from '@iwsdk/core';
import { EffectsManager } from './effects';
import { AudioManager } from './audio';

export enum TargetType {
  STATIC = 'static',
  MOVING = 'moving',
  OSCILLATING = 'oscillating',
  RISING = 'rising',
}

export enum HitZone {
  BULLSEYE = 'bullseye',
  INNER = 'inner',
  OUTER = 'outer',
  EDGE = 'edge',
}

export interface HitResult {
  zone: HitZone;
  distance: number;
  position: Vector3;
  points: number;
}

interface ActiveTarget {
  id: number;
  type: TargetType;
  group: Group;
  position: Vector3;
  basePosition: Vector3;
  velocity: Vector3;
  radius: number;
  age: number;
  maxAge: number;
  active: boolean;
  oscillatePhase: number;
  oscillateAmplitude: number;
}

const ZONE_POINTS: Record<HitZone, number> = {
  [HitZone.BULLSEYE]: 50,
  [HitZone.INNER]: 30,
  [HitZone.OUTER]: 20,
  [HitZone.EDGE]: 10,
};

export class TargetManager {
  private world: World;
  private effects: EffectsManager;
  private audio: AudioManager;
  private targets: ActiveTarget[] = [];
  private targetPool: ActiveTarget[] = [];
  private nextId = 1;

  onTargetExpired: (() => void) | null = null;

  constructor(world: World, effects: EffectsManager, audio: AudioManager) {
    this.world = world;
    this.effects = effects;
    this.audio = audio;
    this.initPool(15);
  }

  private initPool(size: number) {
    for (let i = 0; i < size; i++) {
      this.targetPool.push(this.createTarget());
    }
  }

  private createTarget(): ActiveTarget {
    const group = new Group();
    const targetRadius = 0.5;

    // Outer ring (edge zone)
    const outerRingMat = new MeshBasicMaterial({
      color: 0x0066ff,
      transparent: true,
      opacity: 0.6,
      side: DoubleSide,
    });
    const outerRing = new Mesh(new RingGeometry(0.35, 0.5, 32), outerRingMat);
    group.add(outerRing);

    // Outer zone
    const outerMat = new MeshBasicMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.5,
      side: DoubleSide,
    });
    const outer = new Mesh(new RingGeometry(0.2, 0.35, 32), outerMat);
    group.add(outer);

    // Inner zone
    const innerMat = new MeshBasicMaterial({
      color: 0x00ccff,
      transparent: true,
      opacity: 0.6,
      side: DoubleSide,
    });
    const inner = new Mesh(new RingGeometry(0.08, 0.2, 32), innerMat);
    group.add(inner);

    // Bullseye
    const bullseyeMat = new MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.8,
      side: DoubleSide,
      blending: AdditiveBlending,
    });
    const bullseye = new Mesh(new CircleGeometry(0.08, 16), bullseyeMat);
    bullseye.position.z = 0.001;
    group.add(bullseye);

    // Wireframe ring border
    const borderMat = new LineBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.8 });
    const borderGeo = new EdgesGeometry(new TorusGeometry(0.5, 0.01, 4, 32));
    const border = new LineSegments(borderGeo, borderMat);
    group.add(border);

    // Glow effect ring
    const glowMat = new MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.15,
      side: DoubleSide,
      blending: AdditiveBlending,
    });
    const glow = new Mesh(new RingGeometry(0.48, 0.55, 32), glowMat);
    glow.position.z = -0.01;
    group.add(glow);

    group.visible = false;
    this.world.scene.add(group);

    return {
      id: 0,
      type: TargetType.STATIC,
      group,
      position: new Vector3(),
      basePosition: new Vector3(),
      velocity: new Vector3(),
      radius: targetRadius,
      age: 0,
      maxAge: 10,
      active: false,
      oscillatePhase: 0,
      oscillateAmplitude: 1.5,
    };
  }

  spawnTarget(type: TargetType, x: number, y: number, z: number) {
    let target = this.targetPool.find(t => !t.active);
    if (!target) {
      target = this.createTarget();
      this.targetPool.push(target);
    }

    target.id = this.nextId++;
    target.type = type;
    target.position.set(x, y, z);
    target.basePosition.set(x, y, z);
    target.age = 0;
    target.active = true;
    target.oscillatePhase = Math.random() * Math.PI * 2;

    // Type-specific setup
    switch (type) {
      case TargetType.STATIC:
        target.velocity.set(0, 0, 0);
        target.maxAge = 15;
        break;
      case TargetType.MOVING:
        target.velocity.set((Math.random() - 0.5) * 3, 0, 0);
        target.maxAge = 8;
        break;
      case TargetType.OSCILLATING:
        target.velocity.set(0, 0, 0);
        target.oscillateAmplitude = 1 + Math.random() * 2;
        target.maxAge = 10;
        break;
      case TargetType.RISING:
        target.velocity.set((Math.random() - 0.5) * 2, 2 + Math.random() * 3, 0);
        target.maxAge = 5;
        break;
    }

    target.group.visible = true;
    target.group.position.copy(target.position);

    // Face toward player
    target.group.lookAt(new Vector3(0, target.position.y, 0));

    if (!this.targets.includes(target)) {
      this.targets.push(target);
    }

    return target.id;
  }

  processHit(targetId: number, hitPos: Vector3): HitResult | null {
    const target = this.targets.find(t => t.id === targetId && t.active);
    if (!target) return null;

    // Calculate distance from target center
    const localHit = hitPos.clone().sub(target.position);
    const distance = Math.sqrt(localHit.x * localHit.x + localHit.y * localHit.y);

    // Determine zone
    let zone: HitZone;
    if (distance < 0.08) zone = HitZone.BULLSEYE;
    else if (distance < 0.2) zone = HitZone.INNER;
    else if (distance < 0.35) zone = HitZone.OUTER;
    else zone = HitZone.EDGE;

    const points = ZONE_POINTS[zone];

    // Deactivate target
    target.active = false;
    target.group.visible = false;
    this.effects.spawnTargetShatter(target.position, zone);

    return { zone, distance, position: target.position.clone(), points };
  }

  // Called by ArrowManager to check collision
  checkCollision(arrowPos: Vector3, arrowRadius: number): { targetId: number; hitPos: Vector3 } | null {
    for (const target of this.targets) {
      if (!target.active) continue;

      const dist = arrowPos.distanceTo(target.position);
      if (dist < target.radius + arrowRadius) {
        return { targetId: target.id, hitPos: arrowPos.clone() };
      }
    }
    return null;
  }

  // Explosive power-up — destroy targets within radius
  explosiveRadius(center: Vector3, radius: number) {
    for (const target of this.targets) {
      if (!target.active) continue;
      const dist = center.distanceTo(target.position);
      if (dist < radius) {
        target.active = false;
        target.group.visible = false;
        this.effects.spawnTargetShatter(target.position, HitZone.OUTER);
      }
    }
  }

  update(dt: number) {
    for (const target of this.targets) {
      if (!target.active) continue;

      target.age += dt;

      // Type-specific movement
      switch (target.type) {
        case TargetType.MOVING:
          target.position.add(target.velocity.clone().multiplyScalar(dt));
          // Bounce off walls
          if (Math.abs(target.position.x) > 8) {
            target.velocity.x *= -1;
            target.position.x = Math.sign(target.position.x) * 8;
          }
          break;

        case TargetType.OSCILLATING:
          target.position.x = target.basePosition.x +
            Math.sin(target.age * 2 + target.oscillatePhase) * target.oscillateAmplitude;
          target.position.y = target.basePosition.y +
            Math.cos(target.age * 1.5 + target.oscillatePhase) * target.oscillateAmplitude * 0.5;
          break;

        case TargetType.RISING:
          target.position.add(target.velocity.clone().multiplyScalar(dt));
          target.velocity.y -= 4 * dt; // slower gravity for arc
          break;
      }

      target.group.position.copy(target.position);
      target.group.lookAt(new Vector3(0, target.position.y, 0));

      // Pulsing glow
      const pulse = 0.8 + Math.sin(target.age * 4) * 0.2;
      target.group.scale.setScalar(pulse);

      // Expire check
      if (target.age > target.maxAge || target.position.y < -1) {
        target.active = false;
        target.group.visible = false;
        if (this.onTargetExpired) this.onTargetExpired();
      }
    }
  }

  clearAll() {
    for (const target of this.targets) {
      target.active = false;
      target.group.visible = false;
    }
  }

  get activeCount(): number {
    return this.targets.filter(t => t.active).length;
  }
}
