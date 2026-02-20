'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface InteractiveBlobProps {
  size?: number;
  intensity?: number;
  colorAccent?: string;
  idleSpeed?: number;
  hoverStrength?: number;
  glowStrength?: number;
  /** Green glow from below (e.g. #22c55e) - for Integrate section */
  glowColor?: string;
  /** 0-1: หมุนเร็ว เคลื่อนตัวแรง เหมือนปีศาจกำลังแตกตัว */
  chaosLevel?: number;
  /** เต็ม box หลายตัว เคลื่อนไหวเหมือนอยากออกจากกรอบ */
  burstMode?: boolean;
  /** คูณความเร็วหมุนรอบตัวเอง (เห็น 360°) */
  spinSpeed?: number;
  /** 0-1: ยิ่งน้อย spheres ยิ่งติดกัน (default 1) */
  tightness?: number;
  /** จำนวน spheres เพิ่มเติม (default 0) */
  extraSpheres?: number;
}

const InteractiveBlob: React.FC<InteractiveBlobProps> = ({
  size = 420,
  intensity = 0.6,
  colorAccent = '#c0c0c0',
  idleSpeed = 0.4,
  hoverStrength = 0.8,
  glowStrength = 1.2,
  glowColor,
  chaosLevel = 0,
  burstMode = false,
  spinSpeed = 1,
  tightness = 1,
  extraSpheres: extraCount = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const blobGroupRef = useRef<THREE.Group | null>(null);
  const spheresRef = useRef<THREE.Mesh[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const timeRef = useRef(0);
  const isHoveringRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      size / size,
      0.1,
      1000
    );
    camera.position.z = 4.8;
    cameraRef.current = camera;

    // Renderer setup with transparency
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      precision: 'highp',
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // Transparent background
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Environment - dark gradient for metallic reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    const layerColors = [0x353540, 0x282830, 0x1a1a22, 0x0f0f14];
    layerColors.forEach((color, i) => {
      const r = 60 + i * 15;
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(r, 32, 32),
        new THREE.MeshBasicMaterial({ color, side: THREE.BackSide })
      );
      envScene.add(sphere);
    });
    const envMap = pmremGenerator.fromScene(envScene).texture;
    scene.environment = envMap;
    envScene.children.forEach((child) => {
      const m = child as THREE.Mesh;
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
    pmremGenerator.dispose();

    // Create blob group
    const blobGroup = new THREE.Group();
    scene.add(blobGroup);
    blobGroupRef.current = blobGroup;

    // burstMode: เต็ม box หลายตัว | default: ติดกันแน่น
    const sizeMult = burstMode ? 1.95 : 1.78;
    const posScale = Math.max(0.5, Math.min(1, tightness));
    const baseConfigs = [
      { position: [0, 0, 0], scale: 0.75 * sizeMult },
      { position: [0.5, 0.4, 0.35], scale: 0.5 * sizeMult },
      { position: [-0.45, 0.35, 0.3], scale: 0.48 * sizeMult },
      { position: [0.35, -0.5, 0.22], scale: 0.45 * sizeMult },
      { position: [-0.4, -0.45, 0.18], scale: 0.42 * sizeMult },
      { position: [0, 0.55, -0.22], scale: 0.38 * sizeMult },
      { position: [0, -0.55, -0.18], scale: 0.35 * sizeMult },
      { position: [0.7, 0.15, 0.42], scale: 0.32 * sizeMult },
      { position: [-0.65, 0.12, 0.38], scale: 0.3 * sizeMult },
      { position: [0.5, -0.6, 0.3], scale: 0.28 * sizeMult },
      { position: [-0.55, -0.58, 0.26], scale: 0.26 * sizeMult },
      { position: [0.6, 0.6, -0.08], scale: 0.24 * sizeMult },
      { position: [-0.6, 0.58, -0.1], scale: 0.22 * sizeMult },
      { position: [0.22, 0.75, -0.3], scale: 0.2 * sizeMult },
      { position: [-0.25, -0.72, -0.26], scale: 0.19 * sizeMult },
      { position: [0.8, -0.28, -0.15], scale: 0.18 * sizeMult },
      { position: [-0.78, -0.25, -0.18], scale: 0.17 * sizeMult },
      { position: [0.35, 0.35, -0.5], scale: 0.16 * sizeMult },
      { position: [-0.38, 0.32, -0.48], scale: 0.15 * sizeMult },
      { position: [0, 0.2, -0.62], scale: 0.14 * sizeMult },
      // extra lumps - กึ่มเพิ่ม
      ...(extraCount >= 1 ? [{ position: [0.42, 0.1, 0.5], scale: 0.13 * sizeMult }] : []),
      ...(extraCount >= 2 ? [{ position: [-0.38, -0.15, 0.48], scale: 0.12 * sizeMult }] : []),
      ...(extraCount >= 3 ? [{ position: [0.15, 0.5, 0.4], scale: 0.12 * sizeMult }] : []),
      ...(extraCount >= 4 ? [{ position: [-0.2, -0.48, 0.35], scale: 0.11 * sizeMult }] : []),
      ...(extraCount >= 5 ? [{ position: [0.55, -0.2, 0.25], scale: 0.11 * sizeMult }] : []),
      ...(extraCount >= 6 ? [{ position: [-0.5, 0.25, 0.28], scale: 0.1 * sizeMult }] : []),
    ].map((c) => ({
      position: [(c.position as number[])[0] * posScale, (c.position as number[])[1] * posScale, (c.position as number[])[2] * posScale],
      scale: c.scale,
    }));
    const burstConfigs = burstMode ? [
      { position: [0.85, 0.85, 0.2], scale: 0.2 * sizeMult },
      { position: [-0.85, 0.85, 0.2], scale: 0.19 * sizeMult },
      { position: [0.85, -0.85, 0.2], scale: 0.19 * sizeMult },
      { position: [-0.85, -0.85, 0.2], scale: 0.18 * sizeMult },
      { position: [0.9, 0, 0.3], scale: 0.17 * sizeMult },
      { position: [-0.9, 0, 0.3], scale: 0.17 * sizeMult },
      { position: [0, 0.9, 0.1], scale: 0.16 * sizeMult },
      { position: [0, -0.9, 0.1], scale: 0.16 * sizeMult },
      { position: [0.75, 0.5, -0.35], scale: 0.15 * sizeMult },
      { position: [-0.75, 0.5, -0.35], scale: 0.15 * sizeMult },
      { position: [0.5, -0.75, -0.3], scale: 0.14 * sizeMult },
      { position: [-0.5, -0.75, -0.3], scale: 0.14 * sizeMult },
    ].map((c) => ({
      position: [(c.position as number[])[0] * posScale, (c.position as number[])[1] * posScale, (c.position as number[])[2] * posScale],
      scale: c.scale,
    })) : [];
    const sphereConfigs = [...baseConfigs, ...burstConfigs];

    // Dark metallic - ดำเทาเข้ม มีแสงและเงา
    const chromeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1a1a22,
      metalness: 1,
      roughness: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      envMapIntensity: 4,
    });

    // Shared geometry for all spheres (reduces memory)
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
    sphereConfigs.forEach((config) => {
      const material = chromeMaterial.clone();
      const sphere = new THREE.Mesh(sphereGeometry, material);
      
      sphere.position.set(...(config.position as [number, number, number]));
      sphere.scale.set(config.scale, config.scale, config.scale);
      sphere.castShadow = true;
      sphere.receiveShadow = true;
      
      // Store original position for animation
      (sphere as any).originalPosition = new THREE.Vector3(...(config.position as [number, number, number]));
      (sphere as any).originalScale = config.scale;
      
      blobGroup.add(sphere);
      spheresRef.current.push(sphere);
    });

    // Lighting - แสงและเงาชัด (key + fill + rim)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.06);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 4);
    keyLight.position.set(5, 7, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 20;
    keyLight.shadow.camera.left = -6;
    keyLight.shadow.camera.right = 6;
    keyLight.shadow.camera.top = 6;
    keyLight.shadow.camera.bottom = -6;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-4, 2, 3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
    rimLight.position.set(-2, 3, -4);
    scene.add(rimLight);

    // Green glow from below (Integrate section)
    if (glowColor) {
      const greenHex = parseInt(glowColor.replace('#', ''), 16);
      const bottomLight = new THREE.PointLight(greenHex, 3, 8);
      bottomLight.position.set(0, -3, 2);
      scene.add(bottomLight);
      const bottomLight2 = new THREE.PointLight(greenHex, 1.5, 6);
      bottomLight2.position.set(0, -2.5, 1);
      scene.add(bottomLight2);
    }

    // Mouse tracking
    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        mouseRef.current.targetX = (e.clientX - rect.left) / rect.width - 0.5;
        mouseRef.current.targetY = (e.clientY - rect.top) / rect.height - 0.5;
      }
    };

    const handleMouseEnter = () => { isHoveringRef.current = true; };
    const handleMouseLeave = () => {
      isHoveringRef.current = false;
      mouseRef.current.targetX = 0;
      mouseRef.current.targetY = 0;
    };

    window.addEventListener('mousemove', handleMouseMove);
    containerRef.current.addEventListener('mouseenter', handleMouseEnter);
    containerRef.current.addEventListener('mouseleave', handleMouseLeave);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      if (document.hidden) return;
      timeRef.current += 0.016; // ~60fps

      // Smooth mouse tracking
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.1;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.1;

      // Chaos multiplier - หมุนเร็ว เคลื่อนแรง เหมือนปีศาจแตกตัว
      const c = 1 + chaosLevel * 3;
      const speedMult = 1 + chaosLevel * 2.5;

      // Hatching / incubating cycle - ช่วงฟักไข่ AI
      const hatchCycle = timeRef.current * (0.25 * speedMult);
      const hatchPulse = Math.sin(hatchCycle) * (0.12 * c) + Math.sin(hatchCycle * 2) * (0.06 * c);

      // Animate each sphere - AI hatching movement
      spheresRef.current.forEach((sphere, index) => {
        const originalPos = (sphere as any).originalPosition;
        const originalScale = (sphere as any).originalScale;
        const phase = index * 0.4;

        // Hatching breathing - ขยายหด (chaos: หนักขึ้น)
        const breathe = Math.sin(timeRef.current * idleSpeed * (0.5 * speedMult) + phase) * (0.04 * c);
        const newScale = originalScale * (1 + hatchPulse + breathe);
        sphere.scale.set(newScale, newScale, newScale);

        // Formation wave - เคลื่อนตัว radial (burstMode: ดันออกเหมือนอยากออกจาก box)
        const formWaveBase = Math.sin(hatchCycle + phase) * (0.08 + chaosLevel * 0.22);
        const formWave = formWaveBase + (burstMode ? 0.28 : 0);
        const radialX = originalPos.x * formWave;
        const radialY = originalPos.y * formWave;
        const radialZ = originalPos.z * formWave;

        // Floating animation - ลอย (chaos: ขยับแรงเหมือนเต้น)
        const floatMult = 1 + chaosLevel * 2.5;
        const floatY = Math.sin(timeRef.current * (0.35 * speedMult) + index) * (0.12 * floatMult);
        const floatX = Math.cos(timeRef.current * (0.3 * speedMult) + index * 0.7) * (0.09 * floatMult);
        const floatZ = Math.sin(timeRef.current * (0.28 * speedMult) + index * 0.5) * (0.09 * floatMult);

        sphere.position.y = originalPos.y + floatY + radialY;
        sphere.position.x = originalPos.x + floatX + radialX;
        sphere.position.z = originalPos.z + floatZ + radialZ;

        // Mouse interaction
        const mouseInfluence = isHoveringRef.current ? hoverStrength * 0.25 : 0;
        sphere.position.x += (mouseRef.current.x * mouseInfluence - (sphere.position.x - originalPos.x - floatX - radialX) * 0.03);
        sphere.position.z += (mouseRef.current.y * mouseInfluence - (sphere.position.z - originalPos.z - floatZ - radialZ) * 0.03);

        // Rotation - chaos: หมุนเร็วขึ้น
        const rotMult = 1 + chaosLevel * 5;
        const rotRamp = (0.0003 + Math.min(timeRef.current * 0.000015, 0.0008)) * rotMult;
        sphere.rotation.x += rotRamp * (0.4 + Math.sin(timeRef.current * 0.2 + index) * 0.2);
        sphere.rotation.y += rotRamp * (0.8 + Math.cos(timeRef.current * 0.15 + index) * 0.2);
      });

      // Group rotation - spinSpeed: หมุนรอบตัวเองเห็น 360°
      if (blobGroup) {
        const groupRotMult = (1 + chaosLevel * 5) * spinSpeed;
        const groupRotRamp = (0.00015 + Math.min(timeRef.current * 0.000008, 0.0005)) * groupRotMult;
        blobGroup.rotation.x += groupRotRamp;
        blobGroup.rotation.y += groupRotRamp * 1.5;

        // Whole blob pulse - chaos: ขยายหดแรง
        const wholePulse = Math.sin(hatchCycle * 0.5) * (0.02 * c);
        blobGroup.scale.set(1 + wholePulse, 1 + wholePulse, 1 + wholePulse);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (containerRef.current) {
        const newSize = Math.min(containerRef.current.clientWidth, size);
        renderer.setSize(newSize, newSize);
        camera.aspect = 1;
        camera.updateProjectionMatrix();
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      containerRef.current?.removeEventListener('mouseenter', handleMouseEnter);
      containerRef.current?.removeEventListener('mouseleave', handleMouseLeave);
      envMap.dispose();
      chromeMaterial.dispose();
      sphereGeometry.dispose();
      renderer.dispose();
      spheresRef.current.forEach((sphere) => {
        (sphere.material as THREE.Material).dispose();
      });
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [size, intensity, colorAccent, idleSpeed, hoverStrength, glowStrength, glowColor, chaosLevel, burstMode, spinSpeed, tightness, extraCount]);

  return (
    <div
      ref={containerRef}
      className="relative cursor-pointer"
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    />
  );
};

export default InteractiveBlob;
