// Holodeck environment setup
import {
  World, Mesh, PlaneGeometry, BoxGeometry, SphereGeometry, TorusGeometry, CylinderGeometry,
  MeshStandardMaterial, MeshBasicMaterial, LineBasicMaterial,
  Color, Vector3, Fog, AmbientLight, PointLight, DirectionalLight,
  EdgesGeometry, LineSegments, Group, Float32BufferAttribute, BufferGeometry,
  AdditiveBlending,
} from '@iwsdk/core';

export class Environment {
  private world: World;
  private ambientParticles: { mesh: Mesh; vel: Vector3; baseY: number }[] = [];
  private decorations: { mesh: Mesh; rotSpeed: Vector3 }[] = [];

  constructor(world: World) {
    this.world = world;
  }

  setup() {
    const scene = this.world.scene;

    // Fog for depth
    scene.fog = new Fog(0x000808, 5, 60);

    // Lights
    const ambient = new AmbientLight(0x112233, 0.4);
    scene.add(ambient);

    const mainLight = new DirectionalLight(0x00ffcc, 0.6);
    mainLight.position.set(5, 10, 5);
    scene.add(mainLight);

    const accentLight1 = new PointLight(0x00ffcc, 1, 30);
    accentLight1.position.set(-8, 5, -10);
    scene.add(accentLight1);

    const accentLight2 = new PointLight(0x6644ff, 0.8, 25);
    accentLight2.position.set(8, 4, -15);
    scene.add(accentLight2);

    // Grid floor
    this.createGridFloor(scene);

    // Grid ceiling
    this.createGridCeiling(scene);

    // Side walls (wireframe)
    this.createWalls(scene);

    // Floating decorations
    this.createDecorations(scene);

    // Ambient particles
    this.createParticles(scene);

    // Range lane markers
    this.createLaneMarkers(scene);
  }

  private createGridFloor(scene: any) {
    const floorMat = new MeshBasicMaterial({
      color: 0x001a1a,
      transparent: true,
      opacity: 0.6,
    });
    const floor = new Mesh(new PlaneGeometry(40, 50), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    // Grid lines
    const lineMat = new LineBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.15 });
    for (let i = -20; i <= 20; i += 2) {
      const geo = new BufferGeometry();
      geo.setAttribute('position', new Float32BufferAttribute([i, 0.01, 25, i, 0.01, -25], 3));
      scene.add(new LineSegments(geo, lineMat));

      const geo2 = new BufferGeometry();
      geo2.setAttribute('position', new Float32BufferAttribute([-20, 0.01, i, 20, 0.01, i], 3));
      scene.add(new LineSegments(geo2, lineMat));
    }
  }

  private createGridCeiling(scene: any) {
    const ceilMat = new MeshBasicMaterial({
      color: 0x000a0a,
      transparent: true,
      opacity: 0.4,
    });
    const ceil = new Mesh(new PlaneGeometry(40, 50), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 8;
    scene.add(ceil);

    const lineMat = new LineBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.06 });
    for (let i = -20; i <= 20; i += 4) {
      const geo = new BufferGeometry();
      geo.setAttribute('position', new Float32BufferAttribute([i, 7.99, 25, i, 7.99, -25], 3));
      scene.add(new LineSegments(geo, lineMat));

      const geo2 = new BufferGeometry();
      geo2.setAttribute('position', new Float32BufferAttribute([-20, 7.99, i, 20, 7.99, i], 3));
      scene.add(new LineSegments(geo2, lineMat));
    }
  }

  private createWalls(scene: any) {
    const wallMat = new MeshBasicMaterial({
      color: 0x001515,
      transparent: true,
      opacity: 0.3,
    });
    const edgeMat = new LineBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.12 });

    // Left wall
    const leftWall = new Mesh(new PlaneGeometry(50, 8), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-20, 4, 0);
    scene.add(leftWall);
    scene.add(new LineSegments(new EdgesGeometry(leftWall.geometry), edgeMat));

    // Right wall
    const rightWall = new Mesh(new PlaneGeometry(50, 8), wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(20, 4, 0);
    scene.add(rightWall);

    // Back wall (far end)
    const backWall = new Mesh(new PlaneGeometry(40, 8), wallMat);
    backWall.position.set(0, 4, -25);
    scene.add(backWall);
    const backEdges = new LineSegments(new EdgesGeometry(backWall.geometry), edgeMat);
    backEdges.position.copy(backWall.position);
    scene.add(backEdges);
  }

  private createDecorations(scene: any) {
    const shapes = [
      new TorusGeometry(0.4, 0.08, 8, 24),
      new BoxGeometry(0.5, 0.5, 0.5),
      new SphereGeometry(0.3, 8, 8),
      new CylinderGeometry(0, 0.35, 0.7, 6),
    ];
    const colors = [0x00ffcc, 0x6644ff, 0x00aaff, 0xff6644];

    for (let i = 0; i < 12; i++) {
      const shapeIdx = i % shapes.length;
      const geo = shapes[shapeIdx];
      const edgeMat = new LineBasicMaterial({
        color: colors[i % colors.length],
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
      this.decorations.push({ mesh: wireframe as any, rotSpeed });
    }
  }

  private createParticles(scene: any) {
    const particleMat = new MeshBasicMaterial({
      color: 0x00ffcc,
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
      this.ambientParticles.push({ mesh: particle, vel, baseY: y });
    }
  }

  private createLaneMarkers(scene: any) {
    // Distance markers on the floor
    const markerMat = new MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.2 });
    const distances = [5, 10, 15, 20, 25];

    for (const d of distances) {
      // Cross-line marker
      const geo = new BufferGeometry();
      const lineMat = new LineBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.3 });
      geo.setAttribute('position', new Float32BufferAttribute([-3, 0.02, -d, 3, 0.02, -d], 3));
      scene.add(new LineSegments(geo, lineMat));
    }
  }

  update(dt: number) {
    // Animate floating decorations
    for (const dec of this.decorations) {
      dec.mesh.rotation.x += dec.rotSpeed.x * dt;
      dec.mesh.rotation.y += dec.rotSpeed.y * dt;
      dec.mesh.rotation.z += dec.rotSpeed.z * dt;
    }

    // Animate particles (gentle vertical bob with color shimmer)
    const t = performance.now() * 0.001;
    for (const p of this.ambientParticles) {
      p.mesh.position.y = p.baseY + Math.sin(t + p.baseY * 2) * 0.3;
      p.mesh.position.x += p.vel.x * dt * 0.1;

      // Color shimmer between cyan and purple
      const shimmer = (Math.sin(t * 0.5 + p.baseY) + 1) * 0.5;
      const mat = p.mesh.material as MeshBasicMaterial;
      mat.color.setHex(shimmer > 0.5 ? 0x6644ff : 0x00ffcc);
      mat.opacity = 0.2 + shimmer * 0.2;

      // Wrap around
      if (p.mesh.position.x > 15) p.mesh.position.x = -15;
      if (p.mesh.position.x < -15) p.mesh.position.x = 15;
    }
  }
}
