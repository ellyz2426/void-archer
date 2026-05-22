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
  SHRINKING = 'shrinking',
  PHANTOM = 'phantom',
  ARMORED = 'armored',
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
  targetType: TargetType;
}

interface ActiveTarget {
  id: number;
  type: TargetType;
  group: Group;
  position: Vector3;
  basePosition: Vector3;
  velocity: Vector3;
  radius: number;
  baseRadius: number;
  age: number;
  maxAge: number;
  active: boolean;
  oscillatePhase: number;
  oscillateAmplitude: number;
  // Phantom: visibility cycling
  phantomVisible: boolean;
  phantomCycleTimer: number;
  // Armored: needs 2 hits
  armorHitsLeft: number;
  armorFlashTimer: number;
  // Shrinking: radius decreases over time
  shrinkRate: number;
}

const ZONE_POINTS: Record<HitZone, number> = {
  [HitZone.BULLSEYE]: 50,
  [HitZone.INNER]: 30,
  [HitZone.OUTER]: 20,
  [HitZone.EDGE]: 10,
};

// Bonus multiplier for hitting advanced target types
const TARGET_TYPE_BONUS: Partial<Record<TargetType, number>> = {
  [TargetType.SHRINKING]: 1.3,
  [TargetType.PHANTOM]: 1.5,
  [TargetType.ARMORED]: 1.2,
};

export class TargetManager {
  private world: World;
  private effects: EffectsManager;
  private audio: AudioManager;
  private targets: ActiveTarget[] = [];
  private targetPool: ActiveTarget[] = [];
  private nextId = 1;

  onTargetExpired: (() => void) | null = null;
  onTargetDestroyed: ((type: TargetType) => void) | null = null;

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

    // Armor indicator ring (only visible for armored targets)
    const armorMat = new MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0,
      side: DoubleSide,
    });
    const armorRing = new Mesh(new RingGeometry(0.52, 0.58, 32), armorMat);
    armorRing.name = 'armor-ring';
    armorRing.position.z = -0.02;
    group.add(armorRing);

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
      baseRadius: targetRadius,
      age: 0,
      maxAge: 10,
      active: false,
      oscillatePhase: 0,
      oscillateAmplitude: 1.5,
      phantomVisible: true,
      phantomCycleTimer: 0,
      armorHitsLeft: 0,
      armorFlashTimer: 0,
      shrinkRate: 0,
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
    target.radius = 0.5;
    target.baseRadius = 0.5;
    target.phantomVisible = true;
    target.phantomCycleTimer = 0;
    target.armorHitsLeft = 0;
    target.armorFlashTimer = 0;
    target.shrinkRate = 0;

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
      case TargetType.SHRINKING:
        target.velocity.set((Math.random() - 0.5) * 1.5, 0, 0);
        target.maxAge = 8;
        target.shrinkRate = 0.06; // shrinks to ~50% over lifetime
        break;
      case TargetType.PHANTOM:
        target.velocity.set((Math.random() - 0.5) * 2, 0, 0);
        target.maxAge = 10;
        target.phantomVisible = true;
        target.phantomCycleTimer = 1.5 + Math.random();
        break;
      case TargetType.ARMORED:
        target.velocity.set((Math.random() - 0.5) * 1, 0, 0);
        target.maxAge = 12;
        target.armorHitsLeft = 2;
        break;
    }

    target.group.visible = true;
    target.group.position.copy(target.position);
    target.group.scale.setScalar(1);

    // Face toward player
    target.group.lookAt(new Vector3(0, target.position.y, 0));

    // Update armor ring visibility
    const armorRing = target.group.getObjectByName('armor-ring') as Mesh;
    if (armorRing) {
      const armorMat = armorRing.material as MeshBasicMaterial;
      armorMat.opacity = type === TargetType.ARMORED ? 0.6 : 0;
    }

    if (!this.targets.includes(target)) {
      this.targets.push(target);
    }

    return target.id;
  }

  processHit(targetId: number, hitPos: Vector3): HitResult | null {
    const target = this.targets.find(t => t.id === targetId && t.active);
    if (!target) return null;

    // Phantom: can only be hit when visible
    if (target.type === TargetType.PHANTOM && !target.phantomVisible) {
      return null;
    }

    // Armored: first hit strips armor
    if (target.type === TargetType.ARMORED && target.armorHitsLeft > 1) {
      target.armorHitsLeft--;
      target.armorFlashTimer = 0.3;
      // Flash armor ring
      const armorRing = target.group.getObjectByName('armor-ring') as Mesh;
      if (armorRing) {
        (armorRing.material as MeshBasicMaterial).color.setHex(0xff4400);
      }
      this.audio.playTargetHit('edge'); // lighter hit sound for armor
      this.effects.spawnHitEffect(target.position, HitZone.EDGE);
      return {
        zone: HitZone.EDGE,
        distance: hitPos.distanceTo(new Vector3(0, 1.5, 0)),
        position: target.position.clone(),
        points: 5, // small points for armor break
        targetType: target.type,
      };
    }

    // Calculate distance from target center
    const localHit = hitPos.clone().sub(target.position);
    const distance = Math.sqrt(localHit.x * localHit.x + localHit.y * localHit.y);

    // Scale zones by current radius for shrinking targets
    const scale = target.radius / target.baseRadius;
    let zone: HitZone;
    if (distance < 0.08 * scale) zone = HitZone.BULLSEYE;
    else if (distance < 0.2 * scale) zone = HitZone.INNER;
    else if (distance < 0.35 * scale) zone = HitZone.OUTER;
    else zone = HitZone.EDGE;

    const basePoints = ZONE_POINTS[zone];
    const typeBonus = TARGET_TYPE_BONUS[target.type] || 1;
    const points = Math.round(basePoints * typeBonus);

    // Deactivate target
    target.active = false;
    target.group.visible = false;
    this.effects.spawnTargetShatter(target.position, zone);

    if (this.onTargetDestroyed) {
      this.onTargetDestroyed(target.type);
    }

    return {
      zone,
      distance: hitPos.distanceTo(new Vector3(0, 1.5, 0)),
      position: target.position.clone(),
      points,
      targetType: target.type,
    };
  }

  checkCollision(arrowPos: Vector3, arrowRadius: number): { targetId: number; hitPos: Vector3 } | null {
    for (const target of this.targets) {
      if (!target.active) continue;
      // Phantom: ignore collision when invisible
      if (target.type === TargetType.PHANTOM && !target.phantomVisible) continue;

      const dist = arrowPos.distanceTo(target.position);
      if (dist < target.radius + arrowRadius) {
        return { targetId: target.id, hitPos: arrowPos.clone() };
      }
    }
    return null;
  }

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
          target.velocity.y -= 4 * dt;
          break;

        case TargetType.SHRINKING:
          target.position.add(target.velocity.clone().multiplyScalar(dt));
          if (Math.abs(target.position.x) > 8) {
            target.velocity.x *= -1;
            target.position.x = Math.sign(target.position.x) * 8;
          }
          // Shrink over time
          target.radius = Math.max(0.15, target.baseRadius - target.shrinkRate * target.age);
          const shrinkScale = target.radius / target.baseRadius;
          target.group.scale.setScalar(shrinkScale);
          break;

        case TargetType.PHANTOM:
          target.position.add(target.velocity.clone().multiplyScalar(dt));
          if (Math.abs(target.position.x) > 8) {
            target.velocity.x *= -1;
            target.position.x = Math.sign(target.position.x) * 8;
          }
          // Visibility cycling
          target.phantomCycleTimer -= dt;
          if (target.phantomCycleTimer <= 0) {
            target.phantomVisible = !target.phantomVisible;
            target.phantomCycleTimer = target.phantomVisible
              ? 1.5 + Math.random() * 1
              : 0.8 + Math.random() * 0.5;
          }
          // Fade in/out
          const phantomOpacity = target.phantomVisible ? 1 : 0.08;
          target.group.traverse((child) => {
            if ((child as any).material) {
              const mat = (child as any).material;
              if (mat.opacity !== undefined && mat.name !== 'armor-ring') {
                mat.opacity = mat.opacity > 0 ? phantomOpacity * (mat.userData?.baseOpacity || mat.opacity) : 0;
              }
            }
          });
          // Scale to hint visibility
          if (!target.phantomVisible) {
            target.group.scale.setScalar(0.85 + Math.sin(target.age * 8) * 0.05);
          }
          break;

        case TargetType.ARMORED:
          target.position.add(target.velocity.clone().multiplyScalar(dt));
          if (Math.abs(target.position.x) > 8) {
            target.velocity.x *= -1;
            target.position.x = Math.sign(target.position.x) * 8;
          }
          // Armor flash recovery
          if (target.armorFlashTimer > 0) {
            target.armorFlashTimer -= dt;
            if (target.armorFlashTimer <= 0) {
              const armorRing = target.group.getObjectByName('armor-ring') as Mesh;
              if (armorRing) {
                (armorRing.material as MeshBasicMaterial).color.setHex(0xffaa00);
              }
            }
          }
          break;
      }

      target.group.position.copy(target.position);
      target.group.lookAt(new Vector3(0, target.position.y, 0));

      // Pulsing glow (skip for phantom when invisible)
      if (target.type !== TargetType.PHANTOM || target.phantomVisible) {
        const pulse = 0.8 + Math.sin(target.age * 4) * 0.2;
        if (target.type !== TargetType.SHRINKING) {
          target.group.scale.setScalar(pulse);
        }
      }

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
