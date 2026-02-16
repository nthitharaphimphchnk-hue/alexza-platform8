/**
 * Interactive Blob Component Utilities
 * Provides configuration, detection, and helper functions
 */

export interface BlobConfig {
  size: number;
  intensity: number;
  colorAccent: string;
  idleSpeed: number;
  hoverStrength: number;
  glowStrength: number;
  enableWebGL: boolean;
}

export const DEFAULT_BLOB_CONFIG: BlobConfig = {
  size: 420,
  intensity: 0.6,
  colorAccent: '#0080ff',
  idleSpeed: 0.4,
  hoverStrength: 0.8,
  glowStrength: 1.2,
  enableWebGL: true,
};

/**
 * Detect WebGL support in the browser
 */
export function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext);
    return !!gl;
  } catch (e) {
    return false;
  }
}

/**
 * Detect if device is mobile
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Get optimal blob configuration based on device
 */
export function getOptimalBlobConfig(
  userConfig?: Partial<BlobConfig>
): BlobConfig {
  const config = { ...DEFAULT_BLOB_CONFIG, ...userConfig };

  // Reduce quality on mobile for better performance
  if (isMobileDevice()) {
    config.size = Math.min(config.size, 300);
    config.glowStrength *= 0.8;
    config.intensity *= 0.7;
  }

  // Use fallback on low-end devices
  if (!isWebGLSupported()) {
    config.enableWebGL = false;
  }

  return config;
}

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Interpolate between two colors
 */
export function interpolateColor(
  color1: string,
  color2: string,
  factor: number
): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return color1;

  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor);
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor);
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor);

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Performance monitoring for blob animations
 */
export class BlobPerformanceMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 60;

  update(): void {
    this.frameCount++;
    const currentTime = performance.now();
    const elapsed = currentTime - this.lastTime;

    if (elapsed >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = currentTime;
    }
  }

  getFPS(): number {
    return this.fps;
  }

  isPerformanceGood(): boolean {
    return this.fps >= 50;
  }

  shouldReduceQuality(): boolean {
    return this.fps < 40;
  }
}

/**
 * Blob animation state manager
 */
export class BlobAnimationState {
  private isHovering = false;
  private mouseX = 0;
  private mouseY = 0;
  private time = 0;

  setHovering(hovering: boolean): void {
    this.isHovering = hovering;
  }

  setMousePosition(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
  }

  updateTime(delta: number): void {
    this.time += delta;
  }

  getState() {
    return {
      isHovering: this.isHovering,
      mouseX: this.mouseX,
      mouseY: this.mouseY,
      time: this.time,
    };
  }

  reset(): void {
    this.isHovering = false;
    this.mouseX = 0;
    this.mouseY = 0;
    this.time = 0;
  }
}
