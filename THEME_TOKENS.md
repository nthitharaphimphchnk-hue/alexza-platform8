# ALEXZA AI — Theme Tokens Documentation

## Overview

ALEXZA AI uses a **Monochrome Metallic** theme system based on the new logo blob aesthetic. All colors are defined as CSS variables in `client/src/index.css` for easy customization and consistency across the application.

## Color Palette

### Background Colors
- **Base Background**: `#050607` (near black)
- **Gradient Backgrounds**: `#050607` → `#0b0e12` (subtle charcoal gradient)

### Surface Colors
- **Dark Graphite**: `#0b0e12` (cards, panels)
- **Elevated Surface**: `#11161D` (optional, for depth)

### Text Colors
- **Primary Text**: `rgba(255, 255, 255, 0.92)` (high contrast white)
- **Secondary Text**: `rgba(255, 255, 255, 0.68)` (medium contrast)
- **Muted Text**: `rgba(255, 255, 255, 0.50)` (low contrast)

### Primary Accent
- **Metallic Silver**: `#c0c0c0` (primary action buttons, highlights)
- **Hover State**: `#a8a8a8` (darker silver for hover)
- **Text on Silver**: `#000000` (black text for contrast)

### Borders & Dividers
- **Subtle Border**: `rgba(255, 255, 255, 0.06)` (light borders)
- **Hover Border**: `rgba(255, 255, 255, 0.12)` (slightly visible on hover)

### Glow Effects
- **Soft White Glow**: `rgba(192, 192, 192, 0.2-0.5)` (metallic glow)
- **Neutral Shadow**: `rgba(0, 0, 0, 0.3)` (depth)

## CSS Variables

All theme colors are defined in `client/src/index.css`:

```css
:root {
  /* Primary brand colors - Metallic Silver */
  --primary: #c0c0c0;
  --primary-foreground: #000000;
  
  /* Background */
  --background: #050607;
  --foreground: #ebebeb;
  
  /* Cards/Surfaces */
  --card: #0b0e12;
  --card-foreground: #ebebeb;
  
  /* Borders */
  --border: rgba(255, 255, 255, 0.06);
  
  /* Input Fields */
  --input: #0b0e12;
  --ring: #c0c0c0;
  
  /* Sidebar */
  --sidebar: #0b0e12;
  --sidebar-foreground: #ebebeb;
  --sidebar-accent: #c0c0c0;
  --sidebar-accent-foreground: #000000;
  --sidebar-border: rgba(255, 255, 255, 0.08);
}
```

## Component Usage

### Buttons

**Primary Button** (Metallic Silver)
```tsx
<Button className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black font-semibold">
  Action
</Button>
```

**Secondary Button** (Dark Glass)
```tsx
<Button variant="outline" className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.06)]">
  Secondary
</Button>
```

### Cards

**Glass Card**
```tsx
<div className="p-6 rounded-xl bg-gradient-to-br from-[#0b0e12] to-[#050607] border border-[rgba(255,255,255,0.06)]">
  Content
</div>
```

### Input Fields

**Dark Glass Input**
```tsx
<input
  className="w-full px-4 py-3 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] text-white placeholder-gray-600 focus:border-[rgba(255,255,255,0.12)] focus:outline-none transition"
/>
```

### Text Hierarchy

```tsx
{/* Primary Text */}
<h1 className="text-white">Heading</h1>

{/* Secondary Text */}
<p className="text-gray-300">Secondary content</p>

{/* Muted Text */}
<span className="text-gray-500">Muted text</span>
```

## Glow Effects

**Metallic Glow**
```css
box-shadow: 0 0 20px rgba(192, 192, 192, 0.2), 0 0 40px rgba(192, 192, 192, 0.1);
```

**Soft Border Glow**
```css
box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.1), 0 0 15px rgba(192, 192, 192, 0.1);
```

## Customization

To change the theme colors globally:

1. **Edit `/client/src/index.css`** - Update CSS variables in `:root` and `.dark`
2. **Update component classes** - Replace color hex values with new colors
3. **Test across pages** - Verify consistency on all pages

### Example: Change Primary Color to Gold

```css
:root {
  --primary: #ffd700;  /* Gold */
  --primary-foreground: #000000;
}
```

Then update button classes:
```tsx
<Button className="bg-[#ffd700] hover:bg-[#ffed4e] text-black">
  Action
</Button>
```

## Design Principles

1. **Monochrome First**: All UI accents use metallic silver, no colorful elements
2. **Subtle Glow**: Soft white/gray glows for premium feel, not harsh neon
3. **High Contrast**: White text on dark backgrounds for readability
4. **Glass Morphism**: Semi-transparent surfaces with backdrop blur
5. **Consistent Spacing**: Use Tailwind's spacing scale for consistency

## Accessibility

- **Color Contrast**: All text meets WCAG AA standards (4.5:1 minimum)
- **Focus States**: Clear focus rings using `--ring` color
- **Hover States**: Visual feedback on interactive elements
- **Text Opacity**: Use opacity hierarchy for visual hierarchy

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS variables supported in all modern browsers
- Fallback colors provided for older browsers

## Related Files

- `client/src/index.css` - Global theme definitions
- `client/src/pages/` - Page components using theme tokens
- `client/src/components/` - Reusable components with theme styling

---

**Last Updated**: February 2026
**Theme Version**: 1.0 (Monochrome Metallic)
