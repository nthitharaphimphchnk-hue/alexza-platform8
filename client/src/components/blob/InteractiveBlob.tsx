'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface InteractiveBlobProps {
  size?: number;
  intensity?: number;
  colorAccent?: string;
  idleSpeed?: number;
  hoverStrength?: number;
  glowStrength?: number;
}

const InteractiveBlob: React.FC<InteractiveBlobProps> = ({
  size = 420,
  intensity = 0.6,
  colorAccent = '#c0c0c0',
  idleSpeed = 0.4,
  hoverStrength = 0.8,
  glowStrength = 1.2,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const blobGroupRef = useRef<THREE.Group | null>(null);
  const spheresRef = useRef<THREE.Mesh[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const timeRef = useRef(0);
  const [isHovering, setIsHovering] = useState(false);

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
    camera.position.z = 3;
    cameraRef.current = camera;

    // Renderer setup with transparency
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      precision: 'highp',
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0); // Transparent background
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create blob group
    const blobGroup = new THREE.Group();
    scene.add(blobGroup);
    blobGroupRef.current = blobGroup;

    // Define sphere positions for multi-sphere blob
    const sphereConfigs = [
      { position: [0, 0, 0], scale: 1.2, color: 0xd0d0d0 },      // Center large sphere
      { position: [0.8, 0.6, 0.5], scale: 0.8, color: 0xe8e8e8 }, // Top right
      { position: [-0.7, 0.5, 0.4], scale: 0.75, color: 0xd8d8d8 }, // Top left
      { position: [0.5, -0.7, 0.3], scale: 0.7, color: 0xe0e0e0 }, // Bottom right
      { position: [-0.6, -0.6, 0.2], scale: 0.65, color: 0xd5d5d5 }, // Bottom left
      { position: [0, 0.8, -0.3], scale: 0.6, color: 0xe5e5e5 },  // Top center
      { position: [0, -0.8, -0.2], scale: 0.55, color: 0xd2d2d2 }, // Bottom center
    ];

    // Create metallic material
    const createMetallicMaterial = (baseColor: number) => {
      return new THREE.MeshStandardMaterial({
        color: baseColor,
        metalness: 0.85,
        roughness: 0.15,
        envMapIntensity: 1.0,
      });
    };

    // Create spheres
    sphereConfigs.forEach((config) => {
      const geometry = new THREE.SphereGeometry(1, 64, 64);
      const material = createMetallicMaterial(config.color);
      const sphere = new THREE.Mesh(geometry, material);
      
      sphere.position.set(...(config.position as [number, number, number]));
      sphere.scale.set(config.scale, config.scale, config.scale);
      
      // Store original position for animation
      (sphere as any).originalPosition = new THREE.Vector3(...(config.position as [number, number, number]));
      (sphere as any).originalScale = config.scale;
      
      blobGroup.add(sphere);
      spheresRef.current.push(sphere);
    });

    // Add environment lighting for metallic effect
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Add directional light for highlights
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Add point lights for depth
    const pointLight1 = new THREE.PointLight(0xffffff, 0.6, 100);
    pointLight1.position.set(-5, 3, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x8080ff, 0.4, 100);
    pointLight2.position.set(5, -3, 5);
    scene.add(pointLight2);

    // Mouse tracking
    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        mouseRef.current.targetX = (e.clientX - rect.left) / rect.width - 0.5;
        mouseRef.current.targetY = (e.clientY - rect.top) / rect.height - 0.5;
      }
    };

    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => {
      setIsHovering(false);
      mouseRef.current.targetX = 0;
      mouseRef.current.targetY = 0;
    };

    window.addEventListener('mousemove', handleMouseMove);
    containerRef.current.addEventListener('mouseenter', handleMouseEnter);
    containerRef.current.addEventListener('mouseleave', handleMouseLeave);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      timeRef.current += 0.016; // ~60fps

      // Smooth mouse tracking
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.1;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.1;

      // Animate each sphere
      spheresRef.current.forEach((sphere, index) => {
        const originalPos = (sphere as any).originalPosition;
        const originalScale = (sphere as any).originalScale;
        
        // Breathing animation
        const breathe = Math.sin(timeRef.current * idleSpeed) * 0.08;
        const newScale = originalScale * (1 + breathe);
        sphere.scale.set(newScale, newScale, newScale);

        // Floating animation with phase offset
        const floatOffset = Math.sin(timeRef.current * 0.3 + index) * 0.1;
        sphere.position.y = originalPos.y + floatOffset;

        // Mouse interaction - subtle attraction
        const mouseInfluence = isHovering ? hoverStrength * 0.15 : 0;
        sphere.position.x += (mouseRef.current.x * mouseInfluence - sphere.position.x * 0.02);
        sphere.position.z += (mouseRef.current.y * mouseInfluence - sphere.position.z * 0.02);

        // Gentle rotation
        sphere.rotation.x += 0.0001 + Math.sin(timeRef.current * 0.2 + index) * 0.0001;
        sphere.rotation.y += 0.0002 + Math.cos(timeRef.current * 0.15 + index) * 0.0001;
      });

      // Group rotation
      if (blobGroup) {
        blobGroup.rotation.x += 0.0001;
        blobGroup.rotation.y += 0.0002;
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
      renderer.dispose();
      spheresRef.current.forEach((sphere) => {
        sphere.geometry.dispose();
        (sphere.material as THREE.Material).dispose();
      });
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [size, intensity, colorAccent, idleSpeed, hoverStrength, glowStrength, isHovering]);

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
