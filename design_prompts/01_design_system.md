# Design System: Trainfort Map Tool Style

This document defines the core design values (colors, typography, spacing) used in the project. Use these variables to maintain visual consistency.

## 1. Color Palette (CSS Variables)

The design uses CSS variables for theming. There are three main themes: **Dark (Default)**, **Light**, and **Darker (Neutral)**.

### Base Colors (Dark Theme - Default)
```css
:root {
  color-scheme: dark;
  --bg: #15171c;              /* Main background */
  --panel: #1f2229;           /* Sidebar/Panel background */
  --panel-2: #242832;         /* Secondary panel background (e.g., inside modals) */
  --text: #e6e9ef;            /* Primary text color */
  --muted: #9aa3b2;           /* Secondary/Muted text color */
  --accent: #6aa2ff;          /* Primary accent color (Blue) */
  --accent-hover: #5a8fef;    /* Hover state for accent */
  --danger: #e36f6f;          /* Error/Destructive action color */
  
  /* Borders & Dividers */
  --panel-border: #2c3340;
  --divider: #323845;
  
  /* Controls (Inputs, Buttons) */
  --control-bg: #151920;
  --control-border: #303748;
  --control-bg-muted: #171b24;
  --control-border-muted: #2a3344;
  --control-hover-border: #3a465c;
  --control-hover-bg: #252d3a;
  
  /* Special UI Elements */
  --workspace-bg: #0d0f14;    /* Canvas background */
  --status-bg: #11131a;       /* Status bar background */
  --status-border: #2b303b;
  --tooltip-bg: rgba(18, 22, 30, 0.95);
  --modal-overlay: rgba(7, 10, 16, 0.7);
  --modal-bg: #1b202a;
}
```

### Light Theme Overrides
```css
body.theme-light {
  color-scheme: light;
  --bg: #f5f7fb;
  --panel: #ffffff;
  --panel-2: #f0f2f7;
  --text: #1c232f;
  --muted: #5a6575;
  --accent: #3867d6;
  --panel-border: #d7dee8;
  --control-bg: #ffffff;
  --control-border: #cfd6e2;
  --workspace-bg: #e3e8f2;
}
```

## 2. Typography

- **Font Family:** "Plus Jakarta Sans", "Inter", "Segoe UI", sans-serif.
- **Base Size:** 12px (Dense UI).
- **Headings:**
  - `h1` (Sidebar Title): 18px
  - `h2` (Panel Headers): 14px, Uppercase, Letter-spacing 0.08em
  - `h3` (Modal Titles): 14px, Uppercase
- **Monospace:** Used for IDs and Hex coordinates.

## 3. Spacing & Sizing

- **UI Scale:** Controlled via `--ui-scale` variable (default 1).
- **Tool Button Size:** `--tool-btn-size: 44px`.
- **Border Radius:**
  - Small elements (checkboxes, tags): `6px`
  - Standard elements (buttons, inputs): `10px` to `14px`
  - Panels/Modals: `12px` to `16px`
  - Round buttons: `50%` or `999px`

## 4. Shadows & Effects

- **Panel Shadow:** `0 8px 18px rgba(5, 8, 14, 0.35)`
- **Floating Element Shadow:** `0 10px 24px rgba(6, 8, 14, 0.45)`
- **Modal Shadow:** `0 20px 40px rgba(5, 8, 14, 0.6)`
- **Glassmorphism:** Used on `sidebar--transparent`, `tool-rail`, and `event-popup`.
  - `backdrop-filter: blur(8px)`
  - Backgrounds often use `color-mix(in srgb, var(--panel) 75%, transparent)`

## 5. Iconography

- **Style:** Lucide Icons (Stroke-based, rounded caps/joins).
- **Stroke Width:** 1.75px to 2px.
- **Sizes:**
  - Standard UI icons: 18px - 20px.
  - Small actions: 14px - 16px.
