// Obstacle system — floating barriers that block arrows
import {
  World, Mesh, Group, BoxGeometry, PlaneGeometry,
  MeshBasicMaterial, MeshStandardMaterial, LineBasicMaterial,
  Color, Vector3, EdgesGeometry, LineSegments, AdditiveBlending, DoubleSide,
} from '@iwsdk/core';
import { AudioManager } from './audio';
import { getThemeConfig } from './themes';

export interface ObstacleConfig {
  /** Number of obstacles to spawn */
  count: number;
  /** Whether obstacles move */
  moving: boolean;
  /** Speed multiplier */
  speed: number;
  /** Whether obstacles rotate */
  rotating: boolean;
}

interface ActiveObstacle {
  group: Group;
  position: Vector3;
  basePosition: Vector3;
  velocity: Vector3;
  size: Vector3; // width, height, depth for collision
  age: number;
  active: boolean;
  rotSpeed: number;
  movePattern: 'horizontal' | 'vertical' | 'circular';
  movePhase: number;
  moveAmplitude: number;
}

// Mode-specific obstacle configs
export const OBSTACLE_CONFIGS: Record<string, ObstacleConfig> = {
  challenge: { count: 2, moving: true, speed: 1, rotating: false },
  endurance: { count: 1, moving: true, speed: 0.8, rotating: false },
  boss_rush: { count: 3, moving: true, speed: 1.2, rotating: true },
  timeattack: { count: 1, moving: false, speed: 0, rotating: false },
};

export class ObstacleManager {
  private world: World;
  private audio: AudioManager;
  private obstacles: ActiveObstacle[] = [];
  private obstaclePool: ActiveObstacle[] = [];

  constructor(world: World, audio: AudioManager) {
    this.world = world;
    this.audio = audio;
    this.initPool(6);
  }

  private initPool(size: number) {
    for (let i = 0; i < size; i++) {
      this.obstaclePool.push(this.createObstacle());
    }
  }

  private createObstacle(): ActiveObstacle {
    const group = new Group();

    // Semi-transparent shield panel
    const panelMat = new MeshBasicMaterial({
      color: 0xff2244,
      transparent: true,
      opacity: 0.15,
      side: DoubleSide,
      blending: AdditiveBlending,
    });
    const panel = new Mesh(new PlaneGeometry(1.6, 1.2), panelMat);
    panel.name = 'shield-panel';
    group.add(panel);

    // Border frame — wireframe edges
    const frameMat = new LineBasicMaterial({
      color: 0xff4466,
      transparent: true,
      opacity: 0.7,
    });
    const frameGeo = new EdgesGeometry(new BoxGeometry(1.6, 1.2, 0.02));
    const frame = new LineSegments(frameGeo, frameMat);
    frame.name = 'shield-frame';
    group.add(frame);

    // Corner accent dots
    const cornerMat = new MeshBasicMaterial({
      color: 0xff4466,
      transparent: true,
      opacity: 0.9,
      blending: AdditiveBlending,
    });
    const corners = [
      [-0.78, 0.58], [0.78, 0.58], [-0.78, -0.58], [0.78, -0.58],
    ];
    for (const [cx, cy] of corners) {
      const dot = new Mesh(new BoxGeometry(0.04, 0.04, 0.04), cornerMat);
      dot.position.set(cx, cy, 0);
      group.add(dot);
    }

    // Hazard stripes — diagonal lines on the panel
    const stripeMat = new LineBasicMaterial({
      color: 0xff2244,
      transparent: true,
      opacity: 0.3,
    });
    const stripeGeo = new EdgesGeometry(new PlaneGeometry(0.02, 1.1));
    for (let i = -3; i <= 3; i++) {
      const stripe = new LineSegments(stripeGeo.clone(), stripeMat);
      stripe.position.x = i * 0.2;
      stripe.rotation.z = Math.PI / 6;
      group.add(stripe);
    }

    group.visible = false;
    this.world.scene.add(group);

    return {
      group,
      position: new Vector3(),
      basePosition: new Vector3(),
      velocity: new Vector3(),
      size: new Vector3(1.6, 1.2, 0.15),
      age: 0,
      active: false,
      rotSpeed: 0,
      movePattern: 'horizontal',
      movePhase: 0,
      moveAmplitude: 2,
    };
  }

  spawn(config: ObstacleConfig) {
    this.clearAll();

    const theme = getThemeConfig();
    const patterns: Array<'horizontal' | 'vertical' | 'circular'> = [
      'horizontal', 'vertical', 'circular',
    ];

    for (let i = 0; i < config.count; i++) {
      let obstacle = this.obstaclePool.find(o => !o.active);
      if (!obstacle) {
        obstacle = this.createObstacle();
        this.obstaclePool.push(obstacle);
      }

      // Position obstacles in the shooting lane
      const x = (i - (config.count - 1) / 2) * 4 + (Math.random() - 0.5) * 2;
      const y = 1.5 + Math.random() * 2;
      const z = -(4 + Math.random() * 10);

      obstacle.position.set(x, y, z);
      obstacle.basePosition.set(x, y, z);
      obstacle.age = 0;
      obstacle.active = true;
      obstacle.movePhase = Math.random() * Math.PI * 2;
      obstacle.movePattern = patterns[i % patterns.length];
      obstacle.moveAmplitude = 1.5 + Math.random() * 2;
      obstacle.rotSpeed = config.rotating ? (0.3 + Math.random() * 0.5) : 0;

      if (config.moving) {
        obstacle.velocity.set(
          (Math.random() - 0.5) * config.speed * 2,
          0,
          0,
        );
      } else {
        obstacle.velocity.set(0, 0, 0);
      }

      // Apply theme-tinted coloring
      obstacle.group.traverse((child: any) => {
        if (child.material && child.name === 'shield-frame') {
          child.material.color.setHex(0xff4466);
        }
      });

      obstacle.group.visible = true;
      obstacle.group.position.copy(obstacle.position);
      // Face toward player
      obstacle.group.lookAt(new Vector3(0, obstacle.position.y, 0));

      if (!this.obstacles.includes(obstacle)) {
        this.obstacles.push(obstacle);
      }
    }
  }

  /** Check if an arrow position intersects any obstacle. Returns true if blocked. */
  checkCollision(arrowPos: Vector3): boolean {
    for (const obs of this.obstacles) {
      if (!obs.active) continue;

      // AABB collision with some tolerance
      const dx = Math.abs(arrowPos.x - obs.position.x);
      const dy = Math.abs(arrowPos.y - obs.position.y);
      const dz = Math.abs(arrowPos.z - obs.position.z);

      const hw = obs.size.x / 2 + 0.1;
      const hh = obs.size.y / 2 + 0.1;
      const hd = obs.size.z / 2 + 0.3; // wider in depth for easier blocking

      if (dx < hw && dy < hh && dz < hd) {
        return true;
      }
    }
    return false;
  }

  update(dt: number) {
    for (const obs of this.obstacles) {
      if (!obs.active) continue;

      obs.age += dt;

      // Movement patterns
      switch (obs.movePattern) {
        case 'horizontal':
          obs.position.x = obs.basePosition.x +
            Math.sin(obs.age * 0.8 + obs.movePhase) * obs.moveAmplitude;
          break;
        case 'vertical':
          obs.position.y = obs.basePosition.y +
            Math.sin(obs.age * 0.6 + obs.movePhase) * obs.moveAmplitude * 0.7;
          break;
        case 'circular':
          obs.position.x = obs.basePosition.x +
            Math.cos(obs.age * 0.5 + obs.movePhase) * obs.moveAmplitude;
          obs.position.y = obs.basePosition.y +
            Math.sin(obs.age * 0.5 + obs.movePhase) * obs.moveAmplitude * 0.6;
          break;
      }

      obs.group.position.copy(obs.position);

      // Rotation
      if (obs.rotSpeed > 0) {
        obs.group.rotation.y += obs.rotSpeed * dt;
      } else {
        // Face player
        obs.group.lookAt(new Vector3(0, obs.position.y, 0));
      }

      // Pulsing glow effect
      const pulse = 0.12 + Math.sin(obs.age * 3) * 0.05;
      const panel = obs.group.getObjectByName('shield-panel') as Mesh;
      if (panel) {
        (panel.material as MeshBasicMaterial).opacity = pulse;
      }
    }
  }

  clearAll() {
    for (const obs of this.obstacles) {
      obs.active = false;
      obs.group.visible = false;
    }
  }

  get activeCount(): number {
    return this.obstacles.filter(o => o.active).length;
  }
}
