'use client';

import React, { useMemo } from 'react';
import InteractiveBlob from './InteractiveBlob';
import InteractiveBlobFallback from './InteractiveBlobFallback';
import {
  BlobConfig,
  getOptimalBlobConfig,
  isWebGLSupported,
} from './blob.utils';

export interface MorphingBlobProps extends Partial<BlobConfig> {
  /**
   * Force use of fallback component (useful for testing)
   */
  useFallback?: boolean;
  /**
   * Callback when blob is clicked
   */
  onBlobClick?: () => void;
}

/**
 * Interactive Morphing Liquid Blob Component
 *
 * A premium AI SaaS blob visualization with two rendering modes:
 * - WebGL (Three.js) for advanced graphics
 * - SVG/CSS fallback for compatibility
 *
 * @example
 * ```tsx
 * <MorphingBlob
 *   size={420}
 *   intensity={0.6}
 *   colorAccent="#c0c0c0"
 *   idleSpeed={0.4}
 * />
 * ```
 */
const MorphingBlob: React.FC<MorphingBlobProps> = ({
  size,
  intensity,
  colorAccent,
  idleSpeed,
  hoverStrength,
  glowStrength,
  useFallback = false,
  onBlobClick,
}) => {
  const config = useMemo(
    () =>
      getOptimalBlobConfig({
        size,
        intensity,
        colorAccent,
        idleSpeed,
        hoverStrength,
        glowStrength,
      }),
    [size, intensity, colorAccent, idleSpeed, hoverStrength, glowStrength]
  );

  // Determine which component to use
  const shouldUseFallback =
    useFallback || !config.enableWebGL || !isWebGLSupported();

  const BlobComponent = shouldUseFallback ? InteractiveBlobFallback : InteractiveBlob;

  return (
    <div
      onClick={onBlobClick}
      className="cursor-pointer select-none"
      role="img"
      aria-label="Interactive morphing liquid blob"
    >
      <BlobComponent
        size={config.size}
        intensity={config.intensity}
        colorAccent={config.colorAccent}
        idleSpeed={config.idleSpeed}
        hoverStrength={config.hoverStrength}
        glowStrength={config.glowStrength}
      />
    </div>
  );
};

export default MorphingBlob;
export { InteractiveBlob, InteractiveBlobFallback };
export * from './blob.utils';
