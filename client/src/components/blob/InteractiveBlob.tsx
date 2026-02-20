'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Environment map for chrome reflections (RoomEnvironment - neutral, no background)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envScene = new RoomEnvironment();
    const envMap = pmremGenerator.fromScene(envScene).texture;
    scene.environment = envMap;
    pmremGenerator.dispose();

    // Create blob group
    const blobGroup = new THREE.Group();
    scene.add(blobGroup);
    blobGroupRef.current = blobGroup;

    // Define sphere positions for multi-sphere blob (all use same chrome material)
    const sphereConfigs = [
      { position: [0, 0, 0], scale: 1.2 },
      { position: [0.8, 0.6, 0.5], scale: 0.8 },
      { position: [-0.7, 0.5, 0.4], scale: 0.75 },
      { position: [0.5, -0.7, 0.3], scale: 0.7 },
      { position: [-0.6, -0.6, 0.2], scale: 0.65 },
      { position: [0, 0.8, -0.3], scale: 0.6 },
      { position: [0, -0.8, -0.2], scale: 0.55 },
    ];

    // Chrome metallic material - polished chrome per reference
    // metalness:1, roughness:0.06, clearcoat:1, envMapIntensity:1.8, base:#d7d9dc
    const chromeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xd7d9dc,
      metalness: 1,
      roughness: 0.06,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.8,
    });

    // Create spheres (all use same chrome material)
    sphereConfigs.forEach((config) => {
      const geometry = new THREE.SphereGeometry(1, 64, 64);
      const material = chromeMaterial.clone();
      const sphere = new THREE.Mesh(geometry, material);
      
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

    // Add ground plane to receive shadows (subtle, adds dimensionality)
    const planeGeometry = new THREE.CircleGeometry(4, 32);
    const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
    const shadowPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -2.5;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // Lighting: match reference - low ambient, hot highlight from top/front, rim lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambientLight);

    // SpotLight from top/front - bright "hot highlight" (intensity ~2)
    const spotLight = new THREE.SpotLight(0xffffff, 2, 20, Math.PI / 6, 0.5, 1);
    spotLight.position.set(0, 8, 4);
    spotLight.target.position.set(0, 0, 0);
    scene.add(spotLight);
    scene.add(spotLight.target);

    // Rim lights - define edges, monochrome
    const rimLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
    rimLight1.position.set(-5, 2, 5);
    scene.add(rimLight1);

    const rimLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    rimLight2.position.set(5, -1, 4);
    scene.add(rimLight2);

    // Shadow-casting key light (directional)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 6, 3);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 20;
    directionalLight.shadow.camera.left = -5;
    directionalLight.shadow.camera.right = 5;
    directionalLight.shadow.camera.top = 5;
    directionalLight.shadow.camera.bottom = -5;
    directionalLight.shadow.bias = -0.0001;
    scene.add(directionalLight);

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
      envMap.dispose();
      chromeMaterial.dispose();
      renderer.dispose();
      spheresRef.current.forEach((sphere) => {
        sphere.geometry.dispose();
        (sphere.material as THREE.Material).dispose();
      });
      planeGeometry.dispose();
      planeMaterial.dispose();
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
        boxShadow: '0 0 40px rgba(215, 217, 220, 0.12)',
      }}
    />
  );
};

export default InteractiveBlob;
