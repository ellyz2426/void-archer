// Arrow management — physics simulation, collision, trails
import {
  World, Mesh, Group, CylinderGeometry, ConeGeometry, SphereGeometry,
  MeshStandardMaterial, MeshBasicMaterial, LineBasicMaterial,
  Color, Vector3, BufferGeometry, Float32BufferAttribute,
  LineSegments, AdditiveBlending,
} from '@iwsdk/core';
import { EffectsManager } from './effects';
import { AudioManager } from './audio';

interface ActiveArrow {
  group: Group;
  velocity: Vector3;
  position: Vector3;
  trail: Vector3[];
  trailMesh: LineSegments;
  age: number;
  maxAge: number;
  active: boolean;
  windForce: Vector3;
}

export class ArrowManager {
  private world: World;
  private effects: EffectsManager;
  private audio: AudioManager;
  private arrows: ActiveArrow[] = [];
  private arrowPool: ActiveArrow[] = [];
  private gravity = 9.81;

  onHit: ((arrowPos: Vector3, targetId: number) => void) | null = null;
  onMiss: (() => void) | null = null;

  // External collision check (set by TargetManager)
  checkTargetCollision: ((pos: Vector3, radius: number) => { targetId: number; hitPos: Vector3 } | null) | null = null;

  constructor(world: World, effects: EffectsManager, audio: AudioManager) {
    this.world = world;
    this.effects = effects;
    this.audio = audio;
    this.initPool(20);
  }

  private initPool(size: number) {
    for (let i = 0; i < size; i++) {
      this.arrowPool.push(this.createArrow());
    }
  }

  private createArrow(): ActiveArrow {
    const group = new Group();

    // Arrow shaft
    const shaftMat = new MeshStandardMaterial({
      color: 0x00ffcc,
      emissive: 0x005544,
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.1,
    });
    const shaft = new Mesh(new CylinderGeometry(0.008, 0.008, 0.5, 6), shaftMat);
    shaft.rotation.x = Math.PI / 2;
    group.add(shaft);

    // Arrow tip
    const tipMat = new MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x00ffcc,
      emissiveIntensity: 1,
      metalness: 1,
      roughness: 0,
    });
    const tip = new Mesh(new ConeGeometry(0.015, 0.06, 6), tipMat);
    tip.rotation.x = -Math.PI / 2;
    tip.position.z = -0.28;
    group.add(tip);

    // Glow around tip
    const glowMat = new MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.3,
      blending: AdditiveBlending,
    });
    const glow = new Mesh(new SphereGeometry(0.03, 8, 8), glowMat);
    glow.position.z = -0.28;
    group.add(glow);

    // Fletching (back feathers — thin triangles)
    const fletchMat = new MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.5,
      blending: AdditiveBlending,
    });
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const fletch = new Mesh(new ConeGeometry(0.01, 0.06, 3), fletchMat);
      fletch.rotation.x = Math.PI / 2;
      fletch.position.z = 0.22;
      fletch.position.x = Math.cos(angle) * 0.015;
      fletch.position.y = Math.sin(angle) * 0.015;
      group.add(fletch);
    }

    group.visible = false;
    this.world.scene.add(group);

    // Trail
    const trailGeo = new BufferGeometry();
    trailGeo.setAttribute('position', new Float32BufferAttribute(new Float32Array(100 * 3), 3));
    const trailMat = new LineBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.5,
      blending: AdditiveBlending,
    });
    const trailMesh = new LineSegments(trailGeo, trailMat);
    trailMesh.visible = false;
    this.world.scene.add(trailMesh);

    return {
      group,
      velocity: new Vector3(),
      position: new Vector3(),
      trail: [],
      trailMesh,
      age: 0,
      maxAge: 5,
      active: false,
      windForce: new Vector3(),
    };
  }

  spawnArrow(origin: Vector3, direction: Vector3, power: number, windForce?: Vector3) {
    let arrow = this.arrowPool.find(a => !a.active);
    if (!arrow) {
      arrow = this.createArrow();
      this.arrowPool.push(arrow);
    }

    const speed = 15 + power * 25; // 15-40 m/s based on draw power
    arrow.position.copy(origin);
    arrow.velocity.copy(direction).multiplyScalar(speed);
    arrow.age = 0;
    arrow.maxAge = 5;
    arrow.active = true;
    arrow.trail = [origin.clone()];
    arrow.group.visible = true;
    arrow.group.position.copy(origin);
    arrow.trailMesh.visible = true;
    arrow.windForce.copy(windForce || new Vector3());

    // Orient arrow along velocity
    this.orientArrow(arrow);

    if (!this.arrows.includes(arrow)) {
      this.arrows.push(arrow);
    }
  }

  private orientArrow(arrow: ActiveArrow) {
    const dir = arrow.velocity.clone().normalize();
    arrow.group.lookAt(arrow.position.clone().add(dir));
  }

  private updateTrail(arrow: ActiveArrow) {
    arrow.trail.push(arrow.position.clone());
    if (arrow.trail.length > 50) arrow.trail.shift();

    const positions: number[] = [];
    for (let i = 0; i < arrow.trail.length - 1; i++) {
      const a = arrow.trail[i];
      const b = arrow.trail[i + 1];
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }

    const geo = arrow.trailMesh.geometry;
    const attr = geo.getAttribute('position');
    const arr = (attr as any).array as Float32Array;
    arr.fill(0);
    for (let i = 0; i < Math.min(positions.length, arr.length); i++) {
      arr[i] = positions[i];
    }
    (attr as any).needsUpdate = true;
    geo.setDrawRange(0, Math.floor(positions.length / 3));
  }

  update(dt: number) {
    for (const arrow of this.arrows) {
      if (!arrow.active) continue;

      arrow.age += dt;

      // Apply gravity
      arrow.velocity.y -= this.gravity * dt;

      // Apply wind force (wind affects trajectory over time)
      arrow.velocity.add(arrow.windForce.clone().multiplyScalar(dt));

      // Move arrow
      arrow.position.add(arrow.velocity.clone().multiplyScalar(dt));
      arrow.group.position.copy(arrow.position);

      // Orient along velocity
      this.orientArrow(arrow);

      // Update trail
      this.updateTrail(arrow);

      // Check collision with targets
      if (this.checkTargetCollision) {
        const hit = this.checkTargetCollision(arrow.position, 0.15);
        if (hit) {
          arrow.active = false;
          arrow.group.visible = false;
          arrow.trailMesh.visible = false;
          if (this.onHit) this.onHit(arrow.position, hit.targetId);
          continue;
        }
      }

      // Check ground collision
      if (arrow.position.y <= 0) {
        arrow.active = false;
        arrow.group.visible = false;
        arrow.trailMesh.visible = false;
        this.effects.spawnGroundHit(arrow.position);
        this.audio.playArrowGround();
        if (this.onMiss) this.onMiss();
        continue;
      }

      // Check out of bounds
      if (arrow.age > arrow.maxAge ||
        Math.abs(arrow.position.x) > 25 ||
        arrow.position.z < -30 ||
        arrow.position.z > 5 ||
        arrow.position.y > 15) {
        arrow.active = false;
        arrow.group.visible = false;
        arrow.trailMesh.visible = false;
        if (this.onMiss) this.onMiss();
      }
    }
  }

  clearAll() {
    for (const arrow of this.arrows) {
      arrow.active = false;
      arrow.group.visible = false;
      arrow.trailMesh.visible = false;
      arrow.trail = [];
    }
  }

  get activeCount(): number {
    return this.arrows.filter(a => a.active).length;
  }
}
