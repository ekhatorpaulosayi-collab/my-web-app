# Storehouse App Icons

Modern, minimal icons designed with Apple-level clarity and polish while preserving the Storehouse color palette.

## 📦 What's Included

- **Settings Icon** (`settings-icon.svg`) - Clean 8-tooth gear with rounded container
- **Calculator Icon** (`calculator-icon.svg`) - Apple-inspired calculator with custom colors
- **Preview Page** (`icon-preview.html`) - Interactive preview at multiple sizes
- **PNG Generator** (`../scripts/generate-icon-pngs.js`) - Script to create PNG exports

## 🎨 Design System

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| **Primary Teal** | `#2F8A8D` | Main icon elements, primary accents |
| **Accent Blue** | `#1770B5` | Highlights, contrast elements |
| **Blue-Gray** | `#7785A8` | Secondary elements, subtle highlights |
| **Dark Gray** | `#626769` | Strokes, structure, body outlines |
| **Light BG** | `#C3CED3` | Preview background only (not in icons) |

### Design Specifications

- **Container**: Rounded square with 56px radius (≈11% of 512px)
- **Stroke Widths**: 8px outer, 6px inner (consistent across both icons)
- **Format**: Vector SVG with transparent background
- **Optimized For**: 24px–32px display sizes
- **Style**: Flat, minimal, high contrast
- **Geometry**: Centered, balanced negative space

## 🚀 Usage

### In React/JSX

```jsx
// Import as component
import SettingsIcon from '/icons/settings-icon.svg?react';
import CalculatorIcon from '/icons/calculator-icon.svg?react';

function MyComponent() {
  return (
    <div>
      <SettingsIcon width={32} height={32} />
      <CalculatorIcon width={32} height={32} />
    </div>
  );
}
```

### As Image Tag

```html
<!-- Settings Icon -->
<img src="/icons/settings-icon.svg" width="32" height="32" alt="Settings" />

<!-- Calculator Icon -->
<img src="/icons/calculator-icon.svg" width="32" height="32" alt="Calculator" />
```

### As Background Image (CSS)

```css
.settings-btn {
  background-image: url('/icons/settings-icon.svg');
  background-size: 24px 24px;
  background-repeat: no-repeat;
  background-position: center;
}

.calculator-btn {
  background-image: url('/icons/calculator-icon.svg');
  background-size: 24px 24px;
  background-repeat: no-repeat;
  background-position: center;
}
```

### In Your App.jsx

Replace the existing SVG icons:

```jsx
// Before (inline SVG)
<button className="settings-btn">
  <svg width="20" height="20" viewBox="0 0 24 24">
    {/* ... lots of code ... */}
  </svg>
</button>

// After (using icon file)
<button className="settings-btn">
  <img src="/icons/settings-icon.svg" width="20" height="20" alt="Settings" />
</button>
```

## 📐 Generating PNGs

If you need PNG versions:

### Option 1: Using the Script (Recommended)

```bash
# Install sharp package
npm install --save-dev sharp

# Run the generator
node scripts/generate-icon-pngs.js
```

This will create PNG files in multiple sizes:
- `settings-icon-512.png`
- `settings-icon-256.png`
- `settings-icon-128.png`
- `settings-icon-64.png`
- `settings-icon-32.png`
- _(same for calculator-icon)_

### Option 2: Online Converter

Upload the SVG files to:
- [CloudConvert](https://cloudconvert.com/svg-to-png)
- [Convertio](https://convertio.co/svg-png/)
- [Zamzar](https://www.zamzar.com/convert/svg-to-png/)

Set output size to **512×512** for best quality.

### Option 3: Using Figma/Sketch

1. Import the SVG file
2. Export as PNG at 512×512 (or desired size)
3. Use 2× or 3× for retina displays

## 🎯 Recommended Sizes

| Context | Size | File to Use |
|---------|------|-------------|
| **Toolbar buttons** | 20–24px | SVG (scales perfectly) |
| **Mobile nav** | 28–32px | SVG or 64px PNG |
| **Desktop nav** | 24–32px | SVG or 64px PNG |
| **App icon** | 512px+ | SVG or 512px PNG |
| **Favicon** | 32px | 32px PNG |
| **Touch icon** | 180px | 256px PNG |

## 🔍 Preview

Open `icon-preview.html` in your browser to see:
- Both icons at multiple sizes (512px, 64px, 32px, 24px)
- Preview on different backgrounds (light, white, dark)
- Color palette reference
- Design specifications

```bash
# Open in default browser
open public/icons/icon-preview.html

# Or navigate to:
http://localhost:4000/icons/icon-preview.html
```

## ✅ Quality Checklist

- ✓ Consistent stroke widths (8px outer, 6px inner)
- ✓ Same corner radius (56px on 512px canvas)
- ✓ Aligned to pixel grid
- ✓ Transparent backgrounds
- ✓ Optimized SVG code (no unnecessary groups)
- ✓ Accessible at 24px minimum size
- ✓ Recognizable shapes at small sizes
- ✓ Color palette matches app design
- ✓ Apple-level clarity and polish

## 🎨 Design Rationale

### Settings Icon
- **8-tooth gear** for instant recognition
- **Alternating colors** (teal/blue) for visual interest
- **Central hub** with subtle inner circle for depth
- **Rounded teeth** for modern, friendly feel

### Calculator Icon
- **Apple-inspired** layout with custom colors
- **4×4 button grid** mimicking classic calculators
- **Display area** at top in blue-gray
- **Color-coded buttons**: Teal for primary, blue for operations, gray for numbers
- **Wide zero button** (bottom left) following Apple's design pattern

## 📝 Notes

- **SVG is recommended** for web apps (infinite scalability, small file size)
- **PNG is useful** for native apps, email, or contexts where SVG isn't supported
- **Transparent backgrounds** allow flexible placement
- **Icons are production-ready** and optimized for performance
- **Retina-ready** by default (vector graphics)

## 🔄 Updating Icons

To modify the icons:

1. Edit the SVG files directly in `public/icons/`
2. Maintain the same:
   - Canvas size (512×512)
   - Corner radius (56px)
   - Stroke widths (8px outer, 6px inner)
   - Color palette
3. Regenerate PNGs if needed
4. Test at 24px size for legibility

## 📄 License

These icons are part of the Storehouse project.
Custom designed for exclusive use in the Storehouse application.

---

**Created**: October 2025
**Version**: 1.0
**Designer**: Claude Code
**Style**: Modern Minimal with Apple-inspired clarity
