// Visual effects — particles, hit effects, trails
import {
  World, Mesh, SphereGeometry, MeshBasicMaterial,
  Color, Vector3, AdditiveBlending, Group,
} from '@iwsdk/core';
import { HitZone } from './target';

interface Particle {
  mesh: Mesh;
  velocity: Vector3;
  life: number;
  maxLife: number;
  active: boolean;
}

const ZONE_COLORS: Record<HitZone, number> = {
  [HitZone.BULLSEYE]: 0xff4444,
  [HitZone.INNER]: 0x00ccff,
  [HitZone.OUTER]: 0x0088ff,
  [HitZone.EDGE]: 0x0066ff,
};

export class EffectsManager {
  private world: World;
  private particles: Particle[] = [];
  private particlePool: Particle[] = [];

  constructor(world: World) {
    this.world = world;
    this.initPool(100);
  }

  private initPool(size: number) {
    for (let i = 0; i < size; i++) {
      const mat = new MeshBasicMaterial({
        color: 0x00ffcc,
        transparent: true,
        opacity: 0.8,
        blending: AdditiveBlending,
      });
      const mesh = new Mesh(new SphereGeometry(0.02, 4, 4), mat);
      mesh.visible = false;
      this.world.scene.add(mesh);

      this.particlePool.push({
        mesh,
        velocity: new Vector3(),
        life: 0,
        maxLife: 1,
        active: false,
      });
    }
  }

  private getParticle(): Particle | null {
    const p = this.particlePool.find(p => !p.active);
    return p || null;
  }

  spawnHitEffect(position: Vector3, zone: HitZone) {
    const color = ZONE_COLORS[zone] || 0x00ffcc;
    const count = zone === HitZone.BULLSEYE ? 25 : 15;
    const speed = zone === HitZone.BULLSEYE ? 4 : 2.5;

    for (let i = 0; i < count; i++) {
      const p = this.getParticle();
      if (!p) break;

      p.active = true;
      p.life = 0;
      p.maxLife = 0.4 + Math.random() * 0.6;
      p.mesh.position.copy(position);
      p.mesh.visible = true;

      const dir = new Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
      ).normalize();
      p.velocity.copy(dir.multiplyScalar(speed * (0.5 + Math.random() * 0.5)));

      (p.mesh.material as MeshBasicMaterial).color.setHex(color);
      const scale = zone === HitZone.BULLSEYE ? 0.03 : 0.02;
      p.mesh.scale.setScalar(scale / 0.02);

      if (!this.particles.includes(p)) this.particles.push(p);
    }
  }

  spawnTargetShatter(position: Vector3, zone: HitZone) {
    const color = ZONE_COLORS[zone];
    const shardCount = 12;

    for (let i = 0; i < shardCount; i++) {
      const p = this.getParticle();
      if (!p) break;

      p.active = true;
      p.life = 0;
      p.maxLife = 0.8 + Math.random() * 0.5;
      p.mesh.position.copy(position);
      p.mesh.position.x += (Math.random() - 0.5) * 0.3;
      p.mesh.position.y += (Math.random() - 0.5) * 0.3;
      p.mesh.visible = true;

      const dir = new Vector3(
        (Math.random() - 0.5),
        Math.random() * 0.5 + 0.2,
        (Math.random() - 0.5),
      ).normalize();
      p.velocity.copy(dir.multiplyScalar(2 + Math.random() * 2));

      (p.mesh.material as MeshBasicMaterial).color.setHex(color);
      p.mesh.scale.setScalar(1.5 + Math.random());

      if (!this.particles.includes(p)) this.particles.push(p);
    }
  }

  spawnGroundHit(position: Vector3) {
    for (let i = 0; i < 8; i++) {
      const p = this.getParticle();
      if (!p) break;

      p.active = true;
      p.life = 0;
      p.maxLife = 0.3 + Math.random() * 0.2;
      p.mesh.position.set(position.x, 0.05, position.z);
      p.mesh.visible = true;

      const angle = (i / 8) * Math.PI * 2;
      p.velocity.set(Math.cos(angle) * 1.5, Math.random() * 2, Math.sin(angle) * 1.5);

      (p.mesh.material as MeshBasicMaterial).color.setHex(0x445544);
      p.mesh.scale.setScalar(1);

      if (!this.particles.includes(p)) this.particles.push(p);
    }
  }

  spawnExplosion(position: Vector3) {
    // Big explosion burst
    for (let i = 0; i < 40; i++) {
      const p = this.getParticle();
      if (!p) break;

      p.active = true;
      p.life = 0;
      p.maxLife = 0.6 + Math.random() * 0.8;
      p.mesh.position.copy(position);
      p.mesh.visible = true;

      const dir = new Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
      ).normalize();
      p.velocity.copy(dir.multiplyScalar(4 + Math.random() * 6));

      // Fire colors: orange, yellow, red
      const colors = [0xff4400, 0xffaa00, 0xff6600, 0xffcc00, 0xff2200];
      const color = colors[Math.floor(Math.random() * colors.length)];
      (p.mesh.material as MeshBasicMaterial).color.setHex(color);
      p.mesh.scale.setScalar(2 + Math.random() * 2);

      if (!this.particles.includes(p)) this.particles.push(p);
    }
  }

  update(dt: number) {
    for (const p of this.particles) {
      if (!p.active) continue;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }

      // Move particle
      p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));
      p.velocity.y -= 5 * dt; // gravity

      // Fade out
      const alpha = 1 - (p.life / p.maxLife);
      (p.mesh.material as MeshBasicMaterial).opacity = alpha * 0.8;

      // Shrink
      const scale = alpha * (p.mesh.scale.x);
      if (scale > 0.01) {
        p.mesh.scale.setScalar(scale);
      }
    }
  }
}
