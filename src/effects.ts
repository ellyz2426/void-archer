// Visual effects — particles, hit effects, trails, score popups
import {
  World, Mesh, SphereGeometry, MeshBasicMaterial, PlaneGeometry,
  Color, Vector3, AdditiveBlending, Group, CanvasTexture,
  Texture, DoubleSide,
} from '@iwsdk/core';
import { HitZone } from './target';

interface Particle {
  mesh: Mesh;
  velocity: Vector3;
  life: number;
  maxLife: number;
  active: boolean;
}

interface ScorePopup {
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
  private scorePopups: ScorePopup[] = [];
  private scorePopupPool: ScorePopup[] = [];
  private textCanvas: HTMLCanvasElement;
  private textCtx: CanvasRenderingContext2D;

  constructor(world: World) {
    this.world = world;
    this.initPool(100);
    this.initPopupPool(15);
    // Offscreen canvas for score text textures
    this.textCanvas = document.createElement('canvas');
    this.textCanvas.width = 128;
    this.textCanvas.height = 64;
    this.textCtx = this.textCanvas.getContext('2d')!;
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

  // --- Score Popup System ---
  private initPopupPool(size: number) {
    for (let i = 0; i < size; i++) {
      const mat = new MeshBasicMaterial({
        transparent: true,
        opacity: 1,
        side: DoubleSide,
        depthWrite: false,
      });
      const mesh = new Mesh(new PlaneGeometry(0.4, 0.2), mat);
      mesh.visible = false;
      this.world.scene.add(mesh);
      this.scorePopupPool.push({
        mesh,
        velocity: new Vector3(),
        life: 0,
        maxLife: 1.2,
        active: false,
      });
    }
  }

  private getPopup(): ScorePopup | null {
    return this.scorePopupPool.find(p => !p.active) || null;
  }

  private createScoreTexture(text: string, color: string): Texture {
    const ctx = this.textCtx;
    const canvas = this.textCanvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw text
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Outline for readability
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2);

    // Fill
    ctx.fillStyle = color;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const tex = new CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  spawnScorePopup(position: Vector3, points: number, zone: HitZone) {
    const popup = this.getPopup();
    if (!popup) return;

    const colorMap: Record<HitZone, string> = {
      [HitZone.BULLSEYE]: '#ff4444',
      [HitZone.INNER]: '#00ccff',
      [HitZone.OUTER]: '#0088ff',
      [HitZone.EDGE]: '#6688aa',
    };

    const text = `+${points}`;
    const color = colorMap[zone] || '#00ffcc';
    const tex = this.createScoreTexture(text, color);

    const mat = popup.mesh.material as MeshBasicMaterial;
    if (mat.map) mat.map.dispose();
    mat.map = tex;
    mat.opacity = 1;
    mat.needsUpdate = true;

    popup.active = true;
    popup.life = 0;
    popup.maxLife = zone === HitZone.BULLSEYE ? 1.5 : 1.0;
    popup.mesh.position.copy(position);
    popup.mesh.position.y += 0.3;
    popup.velocity.set(
      (Math.random() - 0.5) * 0.3,
      1.5 + Math.random() * 0.5,
      0,
    );
    popup.mesh.visible = true;

    // Scale based on points
    const scale = points >= 50 ? 1.5 : points >= 30 ? 1.2 : 1.0;
    popup.mesh.scale.setScalar(scale);

    // Billboard: face the camera
    if (this.world.camera) {
      popup.mesh.lookAt(this.world.camera.position);
    }

    if (!this.scorePopups.includes(popup)) {
      this.scorePopups.push(popup);
    }
  }

  spawnBossHitEffect(position: Vector3) {
    // Extra flashy effect for boss hits
    const colors = [0xff4400, 0xff8800, 0xffcc00, 0xffffff];
    for (let i = 0; i < 30; i++) {
      const p = this.getParticle();
      if (!p) break;

      p.active = true;
      p.life = 0;
      p.maxLife = 0.5 + Math.random() * 0.8;
      p.mesh.position.copy(position);
      p.mesh.visible = true;

      const dir = new Vector3(
        (Math.random() - 0.5) * 2,
        Math.random(),
        (Math.random() - 0.5) * 2,
      ).normalize();
      p.velocity.copy(dir.multiplyScalar(3 + Math.random() * 5));

      const color = colors[Math.floor(Math.random() * colors.length)];
      (p.mesh.material as MeshBasicMaterial).color.setHex(color);
      p.mesh.scale.setScalar(1.5 + Math.random() * 2);

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

    // Update score popups
    for (const popup of this.scorePopups) {
      if (!popup.active) continue;

      popup.life += dt;
      if (popup.life >= popup.maxLife) {
        popup.active = false;
        popup.mesh.visible = false;
        continue;
      }

      // Float upward
      popup.mesh.position.add(popup.velocity.clone().multiplyScalar(dt));
      popup.velocity.y -= 0.5 * dt; // gentle gravity slowdown

      // Fade out in last 40%
      const progress = popup.life / popup.maxLife;
      const fadeStart = 0.6;
      const alpha = progress > fadeStart ? 1 - (progress - fadeStart) / (1 - fadeStart) : 1;
      (popup.mesh.material as MeshBasicMaterial).opacity = alpha;

      // Slight scale pulse
      const pulse = 1 + Math.sin(popup.life * 10) * 0.05;
      const baseScale = popup.mesh.scale.x / pulse; // approximate
      popup.mesh.scale.setScalar(popup.mesh.scale.x * (pulse / (1 + Math.sin((popup.life - dt) * 10) * 0.05)) || popup.mesh.scale.x);

      // Billboard toward camera
      if (this.world.camera) {
        popup.mesh.lookAt(this.world.camera.position);
      }
    }
  }
}
