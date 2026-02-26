'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { safeRemove } from '@/lib/dom';

interface MetallicSphereProps {
  size?: number;
  /** Green glow from below (e.g. #22c55e) */
  glowColor?: string;
}

/**
 * ทรงกลมโลหะเงา หมุนช้าๆ เหมือนโลก
 */
const MetallicSphere: React.FC<MetallicSphereProps> = ({
  size = 140,
  glowColor = '#22c55e',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.z = 3.2;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      precision: 'highp',
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);

    // Environment map - เหมือนตัวใหญ่ (hero blob)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    [0x353540, 0x282830, 0x1a1a22, 0x0f0f14].forEach((color, i) => {
      const r = 60 + i * 15;
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(r, 32, 32),
        new THREE.MeshBasicMaterial({ color, side: THREE.BackSide })
      );
      envScene.add(sphere);
    });
    const envMap = pmremGenerator.fromScene(envScene).texture;
    scene.environment = envMap;
    envScene.children.forEach((c) => {
      const m = c as THREE.Mesh;
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
    pmremGenerator.dispose();

    // Dark metallic - สีเหมือนตัวใหญ่ (hero blob)
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x1a1a22,
      metalness: 1,
      roughness: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      envMapIntensity: 4,
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.rotation.x = 0.41; // axial tilt ~23.5° เหมือนโลก
    scene.add(sphere);

    // Lighting - เหมือนตัวใหญ่ (key + fill + rim)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.06);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 4);
    keyLight.position.set(5, 7, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-4, 2, 3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
    rimLight.position.set(-2, 3, -4);
    scene.add(rimLight);

    // Green glow from below
    if (glowColor) {
      const greenHex = parseInt(glowColor.replace('#', ''), 16);
      const bottomLight = new THREE.PointLight(greenHex, 3, 8);
      bottomLight.position.set(0, -3, 2);
      scene.add(bottomLight);
    }

    // หมุนรอบตัวเองเหมือนโลก - แกน Y (spin)
    const rotSpeed = 0.015;

    const animate = () => {
      requestAnimationFrame(animate);
      if (document.hidden) return;
      sphere.rotation.y += rotSpeed;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (containerRef.current) {
        const w = Math.min(containerRef.current.clientWidth, size);
        renderer.setSize(w, w);
        camera.aspect = 1;
        camera.updateProjectionMatrix();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      try {
        envMap.dispose();
        geometry.dispose();
        material.dispose();
        renderer.dispose();
      } catch {
        /* ignore dispose errors */
      }
      safeRemove(renderer.domElement);
    };
  }, [size, glowColor]);

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ width: size, height: size }}
    />
  );
};

export default MetallicSphere;
