// Holodeck environment setup — with theme support
import {
  World, Mesh, PlaneGeometry, BoxGeometry, SphereGeometry, TorusGeometry, CylinderGeometry,
  MeshStandardMaterial, MeshBasicMaterial, LineBasicMaterial,
  Color, Vector3, Fog, AmbientLight, PointLight, DirectionalLight,
  EdgesGeometry, LineSegments, Group, Float32BufferAttribute, BufferGeometry,
  AdditiveBlending,
} from '@iwsdk/core';
import { ThemeConfig, getThemeConfig, ThemeId } from './themes';

interface StarParticle {
  mesh: Mesh;
  twinkleSpeed: number;
  twinkleOffset: number;
  baseOpacity: number;
}

export class Environment {
  private world: World;
  private ambientParticles: { mesh: Mesh; vel: Vector3; baseY: number }[] = [];
  private decorations: { mesh: Mesh; rotSpeed: Vector3 }[] = [];
  private theme: ThemeConfig;
  private sceneObjects: any[] = []; // Track all added objects for theme switching
  private stars: StarParticle[] = [];
  private crystals: { mesh: Mesh; baseY: number; phase: number }[] = [];

  // Lights stored for theme updates
  private ambient: AmbientLight | null = null;
  private mainLight: DirectionalLight | null = null;
  private accentLight1: PointLight | null = null;
  private accentLight2: PointLight | null = null;

  constructor(world: World) {
    this.world = world;
    this.theme = getThemeConfig();
  }

  setup() {
    this.buildScene();
  }

  applyTheme(themeId: ThemeId) {
    this.theme = getThemeConfig(themeId);
    // Remove old objects
    for (const obj of this.sceneObjects) {
      this.world.scene.remove(obj);
    }
    this.sceneObjects = [];
    this.ambientParticles = [];
    this.decorations = [];
    this.stars = [];
    this.crystals = [];
    this.buildScene();
  }

  getTheme(): ThemeConfig {
    return this.theme;
  }

  private buildScene() {
    const scene = this.world.scene;
    const t = this.theme;

    // Fog
    scene.fog = new Fog(t.fogColor, t.fogNear, t.fogFar);

    // Lights
    this.ambient = new AmbientLight(t.ambientColor, t.ambientIntensity);
    scene.add(this.ambient);
    this.sceneObjects.push(this.ambient);

    this.mainLight = new DirectionalLight(t.mainLightColor, t.mainLightIntensity);
    this.mainLight.position.set(5, 10, 5);
    scene.add(this.mainLight);
    this.sceneObjects.push(this.mainLight);

    this.accentLight1 = new PointLight(t.accent1Color, 1, 30);
    this.accentLight1.position.set(-8, 5, -10);
    scene.add(this.accentLight1);
    this.sceneObjects.push(this.accentLight1);

    this.accentLight2 = new PointLight(t.accent2Color, 0.8, 25);
    this.accentLight2.position.set(8, 4, -15);
    scene.add(this.accentLight2);
    this.sceneObjects.push(this.accentLight2);

    // Grid floor
    this.createGridFloor(scene);

    // Grid ceiling
    this.createGridCeiling(scene);

    // Side walls
    this.createWalls(scene);

    // Floating decorations
    this.createDecorations(scene);

    // Ambient particles
    this.createParticles(scene);

    // Range lane markers
    this.createLaneMarkers(scene);

    // Theme-specific extras
    if (t.id === ThemeId.DEEP_VOID) {
      this.createStarfield(scene);
    }
    if (t.id === ThemeId.CRYSTAL_CAVE) {
      this.createCrystals(scene);
    }
    if (t.id === ThemeId.NEON_ARCADE) {
      this.createArcadeDecorations(scene);
    }
  }

  private createGridFloor(scene: any) {
    const t = this.theme;
    const floorMat = new MeshBasicMaterial({
      color: t.floorColor,
      transparent: true,
      opacity: 0.6,
    });
    const floor = new Mesh(new PlaneGeometry(40, 50), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);
    this.sceneObjects.push(floor);

    const lineMat = new LineBasicMaterial({ color: t.gridColor, transparent: true, opacity: t.gridOpacity });
    for (let i = -20; i <= 20; i += 2) {
      const geo = new BufferGeometry();
      geo.setAttribute('position', new Float32BufferAttribute([i, 0.01, 25, i, 0.01, -25], 3));
      const line = new LineSegments(geo, lineMat);
      scene.add(line);
      this.sceneObjects.push(line);

      const geo2 = new BufferGeometry();
      geo2.setAttribute('position', new Float32BufferAttribute([-20, 0.01, i, 20, 0.01, i], 3));
      const line2 = new LineSegments(geo2, lineMat);
      scene.add(line2);
      this.sceneObjects.push(line2);
    }
  }

  private createGridCeiling(scene: any) {
    const t = this.theme;
    const ceilMat = new MeshBasicMaterial({
      color: t.ceilingColor,
      transparent: true,
      opacity: 0.4,
    });
    const ceil = new Mesh(new PlaneGeometry(40, 50), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 8;
    scene.add(ceil);
    this.sceneObjects.push(ceil);

    const lineMat = new LineBasicMaterial({ color: t.gridColor, transparent: true, opacity: t.gridOpacity * 0.4 });
    for (let i = -20; i <= 20; i += 4) {
      const geo = new BufferGeometry();
      geo.setAttribute('position', new Float32BufferAttribute([i, 7.99, 25, i, 7.99, -25], 3));
      const line = new LineSegments(geo, lineMat);
      scene.add(line);
      this.sceneObjects.push(line);

      const geo2 = new BufferGeometry();
      geo2.setAttribute('position', new Float32BufferAttribute([-20, 7.99, i, 20, 7.99, i], 3));
      const line2 = new LineSegments(geo2, lineMat);
      scene.add(line2);
      this.sceneObjects.push(line2);
    }
  }

  private createWalls(scene: any) {
    const t = this.theme;
    const wallMat = new MeshBasicMaterial({
      color: t.wallColor,
      transparent: true,
      opacity: 0.3,
    });
    const edgeMat = new LineBasicMaterial({ color: t.gridColor, transparent: true, opacity: 0.12 });

    const leftWall = new Mesh(new PlaneGeometry(50, 8), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-20, 4, 0);
    scene.add(leftWall);
    this.sceneObjects.push(leftWall);

    const leftEdges = new LineSegments(new EdgesGeometry(leftWall.geometry), edgeMat);
    leftEdges.rotation.y = Math.PI / 2;
    leftEdges.position.set(-20, 4, 0);
    scene.add(leftEdges);
    this.sceneObjects.push(leftEdges);

    const rightWall = new Mesh(new PlaneGeometry(50, 8), wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(20, 4, 0);
    scene.add(rightWall);
    this.sceneObjects.push(rightWall);

    const backWall = new Mesh(new PlaneGeometry(40, 8), wallMat);
    backWall.position.set(0, 4, -25);
    scene.add(backWall);
    this.sceneObjects.push(backWall);

    const backEdges = new LineSegments(new EdgesGeometry(backWall.geometry), edgeMat);
    backEdges.position.copy(backWall.position);
    scene.add(backEdges);
    this.sceneObjects.push(backEdges);
  }

  private createDecorations(scene: any) {
    const t = this.theme;
    const shapes = [
      new TorusGeometry(0.4, 0.08, 8, 24),
      new BoxGeometry(0.5, 0.5, 0.5),
      new SphereGeometry(0.3, 8, 8),
      new CylinderGeometry(0, 0.35, 0.7, 6),
    ];

    for (let i = 0; i < 12; i++) {
      const shapeIdx = i % shapes.length;
      const geo = shapes[shapeIdx];
      const edgeMat = new LineBasicMaterial({
        color: t.decorColors[i % t.decorColors.length],
        transparent: true,
        opacity: 0.25,
      });
      const wireframe = new LineSegments(new EdgesGeometry(geo), edgeMat);

      const x = (Math.random() - 0.5) * 30;
      const y = 2 + Math.random() * 5;
      const z = -5 + (Math.random() - 0.5) * 35;
      wireframe.position.set(x, y, z);

      const rotSpeed = new Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.2,
      );

      scene.add(wireframe);
      this.sceneObjects.push(wireframe);
      this.decorations.push({ mesh: wireframe as any, rotSpeed });
    }
  }

  private createParticles(scene: any) {
    const t = this.theme;
    const particleMat = new MeshBasicMaterial({
      color: t.particleColor1,
      transparent: true,
      opacity: 0.3,
      blending: AdditiveBlending,
    });

    for (let i = 0; i < 40; i++) {
      const size = 0.02 + Math.random() * 0.04;
      const particle = new Mesh(new SphereGeometry(size, 4, 4), particleMat.clone());
      const x = (Math.random() - 0.5) * 30;
      const y = 0.5 + Math.random() * 7;
      const z = (Math.random() - 0.5) * 40;
      particle.position.set(x, y, z);

      const vel = new Vector3(
        (Math.random() - 0.5) * 0.1,
        0.05 + Math.random() * 0.1,
        (Math.random() - 0.5) * 0.05,
      );

      scene.add(particle);
      this.sceneObjects.push(particle);
      this.ambientParticles.push({ mesh: particle, vel, baseY: y });
    }
  }

  private createLaneMarkers(scene: any) {
    const t = this.theme;
    const distances = [5, 10, 15, 20, 25];
    const lineMat = new LineBasicMaterial({ color: t.gridColor, transparent: true, opacity: 0.3 });

    for (const d of distances) {
      const geo = new BufferGeometry();
      geo.setAttribute('position', new Float32BufferAttribute([-3, 0.02, -d, 3, 0.02, -d], 3));
      const line = new LineSegments(geo, lineMat);
      scene.add(line);
      this.sceneObjects.push(line);
    }
  }

  // Deep Void theme: starfield background
  private createStarfield(scene: any) {
    const starMat = new MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
      blending: AdditiveBlending,
    });

    for (let i = 0; i < 80; i++) {
      const size = 0.01 + Math.random() * 0.03;
      const star = new Mesh(new SphereGeometry(size, 3, 3), starMat.clone());
      const r = 20 + Math.random() * 15;
      const theta = Math.random() * Math.PI;
      const phi = Math.random() * Math.PI * 2;
      star.position.set(
        r * Math.sin(theta) * Math.cos(phi),
        Math.abs(r * Math.cos(theta)) * 0.8 + 1,
        r * Math.sin(theta) * Math.sin(phi) - 10,
      );

      scene.add(star);
      this.sceneObjects.push(star);
      this.stars.push({
        mesh: star,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinkleOffset: Math.random() * Math.PI * 2,
        baseOpacity: 0.3 + Math.random() * 0.5,
      });
    }
  }

  // Crystal Cave theme: glowing crystal formations
  private createCrystals(scene: any) {
    const colors = [0x44ccff, 0x88eeff, 0xaaffff, 0x2288cc, 0x66ddff];

    for (let i = 0; i < 20; i++) {
      const height = 0.5 + Math.random() * 2;
      const radius = 0.08 + Math.random() * 0.15;
      const crystalGeo = new CylinderGeometry(0, radius, height, 5);
      const color = colors[i % colors.length];

      const crystalMat = new MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.4,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.7,
      });

      const crystal = new Mesh(crystalGeo, crystalMat);
      const side = Math.random() > 0.5 ? 1 : -1;
      const x = side * (15 + Math.random() * 5);
      const y = height / 2;
      const z = -5 + (Math.random() - 0.5) * 40;

      // Some on ceiling too
      if (Math.random() > 0.5) {
        crystal.rotation.z = Math.PI;
        crystal.position.set(x, 8 - height / 2, z);
      } else {
        crystal.position.set(x, y, z);
      }

      // Slight random tilt
      crystal.rotation.x = (Math.random() - 0.5) * 0.3;
      crystal.rotation.z += (Math.random() - 0.5) * 0.2;

      scene.add(crystal);
      this.sceneObjects.push(crystal);
      this.crystals.push({ mesh: crystal, baseY: crystal.position.y, phase: Math.random() * Math.PI * 2 });
    }
  }

  // Neon Arcade theme: neon sign decorations
  private createArcadeDecorations(scene: any) {
    const signColors = [0xff0066, 0x00ffaa, 0xffaa00, 0xff00ff];

    // Create geometric neon signs along the walls
    for (let i = 0; i < 8; i++) {
      const side = i % 2 === 0 ? -19 : 19;
      const z = -20 + i * 5;
      const y = 3 + Math.random() * 3;

      // Simple geometric neon shape
      const shapes = [
        new TorusGeometry(0.6, 0.03, 6, 20),
        new BoxGeometry(1.2, 0.8, 0.03),
        new SphereGeometry(0.5, 6, 6),
      ];
      const shapeGeo = shapes[i % shapes.length];
      const edgeMat = new LineBasicMaterial({
        color: signColors[i % signColors.length],
        transparent: true,
        opacity: 0.6,
      });
      const wireframe = new LineSegments(new EdgesGeometry(shapeGeo), edgeMat);

      wireframe.position.set(side, y, z);
      wireframe.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;

      scene.add(wireframe);
      this.sceneObjects.push(wireframe);

      // Add glow point light near each sign
      const glow = new PointLight(signColors[i % signColors.length], 0.3, 5);
      glow.position.set(side * 0.9, y, z);
      scene.add(glow);
      this.sceneObjects.push(glow);
    }
  }

  update(dt: number) {
    const t = performance.now() * 0.001;
    const theme = this.theme;

    // Animate floating decorations
    for (const dec of this.decorations) {
      dec.mesh.rotation.x += dec.rotSpeed.x * dt;
      dec.mesh.rotation.y += dec.rotSpeed.y * dt;
      dec.mesh.rotation.z += dec.rotSpeed.z * dt;
    }

    // Animate particles
    for (const p of this.ambientParticles) {
      p.mesh.position.y = p.baseY + Math.sin(t + p.baseY * 2) * 0.3;
      p.mesh.position.x += p.vel.x * dt * 0.1;

      const shimmer = (Math.sin(t * 0.5 + p.baseY) + 1) * 0.5;
      const mat = p.mesh.material as MeshBasicMaterial;
      mat.color.setHex(shimmer > 0.5 ? theme.particleColor2 : theme.particleColor1);
      mat.opacity = 0.2 + shimmer * 0.2;

      if (p.mesh.position.x > 15) p.mesh.position.x = -15;
      if (p.mesh.position.x < -15) p.mesh.position.x = 15;
    }

    // Star twinkling for Deep Void
    for (const star of this.stars) {
      const mat = star.mesh.material as MeshBasicMaterial;
      mat.opacity = star.baseOpacity + Math.sin(t * star.twinkleSpeed + star.twinkleOffset) * 0.3;
    }

    // Crystal glow pulsing for Crystal Cave
    for (const c of this.crystals) {
      const pulse = 0.3 + Math.sin(t * 0.8 + c.phase) * 0.15;
      const mat = c.mesh.material as MeshStandardMaterial;
      mat.emissiveIntensity = pulse;
    }
  }
}
