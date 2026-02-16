# Interactive Morphing Liquid Blob Component

A premium, production-ready blob visualization component for AI SaaS platforms. Features two rendering modes: advanced WebGL (Three.js) and lightweight CSS/SVG fallback.

## Features

✨ **Interactive Animations**
- Breathing morph animation
- Liquid surface motion
- Mouse hover reactions
- Smooth floating motion
- Energy lighting effects

🎨 **Visual Style**
- Premium metallic nano polymer appearance
- Soft blue/purple gradient
- Enterprise futuristic mood
- Transparent background support
- Customizable colors and intensity

⚡ **Performance**
- 60 FPS smooth animation
- GPU accelerated (WebGL mode)
- Mobile optimized
- Graceful fallback support
- SSR safe (Next.js compatible)

## Installation

The blob component is located in `/client/src/components/blob/` and is ready to use.

### File Structure

```
client/src/components/blob/
├── index.tsx                    # Main wrapper component
├── InteractiveBlob.tsx          # Three.js WebGL version
├── InteractiveBlobFallback.tsx  # CSS/SVG fallback version
├── blob.utils.ts               # Utilities and configuration
└── blob.css                     # Styling
```

## Usage

### Basic Usage

```tsx
import MorphingBlob from '@/components/blob';

export default function MyComponent() {
  return (
    <MorphingBlob
      size={420}
      intensity={0.6}
      colorAccent="#0080ff"
      idleSpeed={0.4}
    />
  );
}
```

### Advanced Configuration

```tsx
import MorphingBlob from '@/components/blob';

export default function HeroSection() {
  return (
    <MorphingBlob
      size={500}
      intensity={0.8}
      colorAccent="#0080ff"
      idleSpeed={0.5}
      hoverStrength={1.0}
      glowStrength={1.5}
      useFallback={false}
      onBlobClick={() => console.log('Blob clicked!')}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | number | 420 | Blob size in pixels |
| `intensity` | number | 0.6 | Animation intensity (0-1) |
| `colorAccent` | string | '#0080ff' | Primary glow color (hex) |
| `idleSpeed` | number | 0.4 | Breathing animation speed (0-1) |
| `hoverStrength` | number | 0.8 | Hover reaction intensity (0-1) |
| `glowStrength` | number | 1.2 | Glow effect intensity (0-2) |
| `useFallback` | boolean | false | Force CSS/SVG fallback |
| `onBlobClick` | function | - | Click handler callback |

## Rendering Modes

### WebGL Mode (Default)

Uses Three.js for advanced shader-based morphing with:
- Perlin noise deformation
- Fresnel edge glow
- Real-time mouse tracking
- Smooth vertex morphing

**Requirements:**
- WebGL support in browser
- Three.js library (already installed)

**Performance:**
- 60 FPS on modern devices
- GPU accelerated
- Lightweight shader processing

### CSS/SVG Fallback Mode

Lightweight alternative using:
- SVG blob shapes
- CSS animations
- CSS filters for glow
- No external dependencies

**Use when:**
- WebGL not supported
- Mobile device detected
- Performance optimization needed
- SSR rendering

**Performance:**
- 30-60 FPS
- CPU based
- Smaller bundle size

## Customization

### Color Customization

```tsx
// Blue accent (default)
<MorphingBlob colorAccent="#0080ff" />

// Purple accent
<MorphingBlob colorAccent="#8b5cf6" />

// Custom color
<MorphingBlob colorAccent="#ff0080" />
```

### Size Variants

```tsx
// Small (mobile)
<MorphingBlob size={280} intensity={0.5} />

// Medium (tablet)
<MorphingBlob size={350} intensity={0.6} />

// Large (desktop)
<MorphingBlob size={500} intensity={0.8} />
```

### Animation Speed

```tsx
// Slow breathing
<MorphingBlob idleSpeed={0.2} />

// Normal breathing
<MorphingBlob idleSpeed={0.4} />

// Fast breathing
<MorphingBlob idleSpeed={0.8} />
```

## Browser Support

| Browser | WebGL | Fallback |
|---------|-------|----------|
| Chrome 90+ | ✅ | ✅ |
| Firefox 88+ | ✅ | ✅ |
| Safari 14+ | ✅ | ✅ |
| Edge 90+ | ✅ | ✅ |
| Mobile Safari | ⚠️ | ✅ |
| Chrome Mobile | ✅ | ✅ |

## Performance Optimization

### Automatic Detection

The component automatically:
- Detects WebGL support
- Detects mobile devices
- Reduces quality on low-end devices
- Switches to fallback when needed

### Manual Optimization

```tsx
// Force fallback for better performance
<MorphingBlob useFallback={true} />

// Reduce size on mobile
<MorphingBlob size={isMobile ? 280 : 420} />

// Lower intensity for better performance
<MorphingBlob intensity={0.4} glowStrength={0.8} />
```

## Integration Examples

### Landing Page Hero

```tsx
import MorphingBlob from '@/components/blob';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <MorphingBlob size={500} intensity={0.8} />
      </div>
      <div className="relative z-10 text-center">
        <h1>AI Orchestration Platform</h1>
        <p>Build, deploy, and optimize AI systems</p>
      </div>
    </section>
  );
}
```

### Dashboard Widget

```tsx
import MorphingBlob from '@/components/blob';

export default function DashboardWidget() {
  return (
    <div className="rounded-lg border border-blue-500/20 p-8 bg-blue-500/5">
      <div className="flex items-center gap-4">
        <MorphingBlob size={200} intensity={0.5} />
        <div>
          <h3>AI Core Status</h3>
          <p>System running normally</p>
        </div>
      </div>
    </div>
  );
}
```

### Avatar Component

```tsx
import MorphingBlob from '@/components/blob';

export default function AIAvatar() {
  return (
    <div className="relative w-32 h-32">
      <MorphingBlob
        size={128}
        intensity={0.4}
        colorAccent="#8b5cf6"
        idleSpeed={0.3}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl">🤖</span>
      </div>
    </div>
  );
}
```

## Utilities

### Device Detection

```tsx
import { isWebGLSupported, isMobileDevice } from '@/components/blob';

if (isWebGLSupported()) {
  // Use WebGL blob
}

if (isMobileDevice()) {
  // Use optimized settings
}
```

### Configuration Management

```tsx
import { getOptimalBlobConfig } from '@/components/blob';

const config = getOptimalBlobConfig({
  size: 420,
  intensity: 0.6,
});
// Returns optimized config based on device
```

### Performance Monitoring

```tsx
import { BlobPerformanceMonitor } from '@/components/blob';

const monitor = new BlobPerformanceMonitor();
// Use in animation loop to track FPS
```

## Troubleshooting

### Blob not showing

1. Check if WebGL is supported: `isWebGLSupported()`
2. Verify Three.js is loaded
3. Check browser console for errors
4. Try fallback mode: `useFallback={true}`

### Poor performance

1. Reduce blob size: `size={280}`
2. Lower intensity: `intensity={0.4}`
3. Use fallback mode: `useFallback={true}`
4. Check device performance metrics

### Color not applying

1. Use valid hex color: `#0080ff`
2. Ensure color has contrast with background
3. Check CSS filter effects

## Best Practices

1. **Responsive Sizing**: Adjust blob size based on viewport
2. **Color Contrast**: Ensure glow color contrasts with background
3. **Performance**: Monitor FPS on target devices
4. **Accessibility**: Provide fallback text/content
5. **Mobile**: Test on actual mobile devices

## License

Part of ALEXZA AI platform. All rights reserved.

## Support

For issues or feature requests, please contact the development team.
