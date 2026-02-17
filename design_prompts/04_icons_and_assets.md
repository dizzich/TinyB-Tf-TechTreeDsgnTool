# Icons and Assets: Trainfort Map Tool

This document describes the iconography and asset usage in the application.

## 1. Icon Style

The application uses **Lucide Icons** (or a similar stroke-based icon set).

- **Style:** Clean, outlined, rounded caps/joins.
- **Stroke Width:** `1.75px` to `2px`.
- **Size:** `18px` to `24px`.
- **Color:** `currentColor` (inherits from parent text color).

## 2. Usage

Icons are embedded directly as SVG elements within buttons or containers.

```html
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings">
  <path d="..." />
  <circle cx="..." cy="..." r="..." />
</svg>
```

### Common Icons
- **Settings:** `lucide-settings`
- **Sidebar Toggle:** `lucide-arrow-left-to-line`
- **Pin:** `lucide-pin`
- **Collapse/Expand:** `lucide-chevron-down` / `lucide-chevron-up`
- **Tools:** `lucide-hand`, `lucide-brush`, `lucide-pipette`, `lucide-eraser`
- **Layers:** `lucide-layers`
- **Map:** `lucide-map`, `lucide-map-pinned`

## 3. Asset Management

- **SVGs:** Inline SVG is preferred for UI icons to allow CSS styling (color, stroke).
- **Images:** Used for textures or specific hex previews.
- **Favicon:** Standard ICO/PNG.

## 4. CSS Classes

- `.lucide`: Base class for Lucide icons.
- `.icon-btn svg`: Specific styling for icon buttons (`width: 18px`, `height: 18px`).
- `.tool-btn svg`: Specific styling for tool buttons (`width: 20px`, `height: 20px`).
