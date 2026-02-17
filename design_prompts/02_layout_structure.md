# Layout Structure: Trainfort Map Tool

This document describes the high-level layout and structure of the application. The layout is designed to maximize the workspace area while keeping tools accessible.

## 1. Main Container (`#app`)

The application uses a CSS Grid layout for the main container.

```css
#app {
  --sidebar-width: 320px;
  display: grid;
  grid-template-columns: var(--sidebar-width) 8px minmax(0, 1fr);
  height: 100vh;
  overflow: hidden;
}
```

- **Sidebar:** Fixed width (`320px`), collapsible.
- **Resizer:** `8px` draggable handle (`.sidebar-resizer`).
- **Workspace:** Remaining space (`minmax(0, 1fr)`).

## 2. Sidebar (`.sidebar`)

Located on the left. Contains project info, settings, and collapsible panels.

- **Structure:**
  - Header (`.sidebar__header`): Title, file info, settings button.
  - Scroll Area (`.sidebar__scroll`): Contains `.panel` elements.
- **Styling:**
  - Background: `var(--panel)`
  - Padding: `16px`
  - Gap: `12px`
  - Scrollbar: Custom styled (thin, transparent track).

## 3. Panels (`.panel`)

Collapsible sections within the sidebar.

- **Structure:**
  - Header (`.panel__header`): Title (`h2`), Actions (Pin, Toggle).
  - Content (`.panel__content`): Form controls, lists.
- **Styling:**
  - Background: `var(--panel-2)`
  - Border: `1px solid var(--panel-border)`
  - Radius: `12px`
  - Shadow: `var(--panel-shadow)`

## 4. Workspace (`.workspace`)

The main canvas area.

- **Structure:**
  - Canvas Wrapper (`.canvas-wrap`): Contains multiple `<canvas>` layers stacked absolutely.
  - Tool Rail (`.tool-rail`): Floating toolbar.
  - Canvas Actions (`.canvas-actions`): Floating buttons (top-left, bottom-left).
  - Status Bar (`.status-bar`): Footer info.
- **Styling:**
  - Background: `var(--workspace-bg)`
  - Position: `relative` (for absolute positioning of children).

## 5. Tool Rail (`.tool-rail`)

A floating vertical toolbar for main tools (Pan, Paint, Select, etc.).

- **Position:** Fixed, top-left (offset from sidebar).
- **Styling:**
  - Glassmorphism effect (`backdrop-filter: blur(8px)`).
  - Background: `color-mix(in srgb, var(--panel) 75%, transparent)`.
  - Border: `1px solid var(--panel-border)`.
  - Radius: `14px`.
  - Shadow: `var(--shadow-floating)`.

## 6. Modals (`.modal`)

Centered overlays for heavy interactions (Settings, Catalogs).

- **Structure:**
  - Overlay (`.modal`): Fixed `inset: 0`, `backdrop-filter: blur(4px)`.
  - Dialog (`.modal__dialog`): Centered box.
    - Header (`.modal__header`): Title, Close button.
    - Content (`.modal__content`): Scrollable area.
- **Styling:**
  - Background: `var(--modal-bg)`
  - Shadow: `var(--shadow-modal)`
  - Radius: `16px`
  - Border: `1px solid var(--modal-border)`

## 7. Status Bar (`.status-bar`)

Footer strip for context info.

- **Styling:**
  - Height: Auto (padding `8px 12px`).
  - Background: `var(--status-bg)`.
  - Border-top: `1px solid var(--status-border)`.
  - Font-size: `12px`.
  - Color: `var(--status-text)`.
