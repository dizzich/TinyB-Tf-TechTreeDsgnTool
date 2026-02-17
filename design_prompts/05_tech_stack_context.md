# Tech Stack Context: Trainfort Map Tool

This document outlines the technical context and constraints of the application's design implementation.

## 1. Core Stack

- **HTML5:** Semantic markup (`<header>`, `<main>`, `<footer>`, `<aside>`, `<section>`).
- **CSS3:** Custom properties (CSS Variables), Flexbox, Grid, Media Queries.
- **JavaScript (Vanilla):** ES6+ syntax, direct DOM manipulation, no framework (React/Vue/Angular).

## 2. Styling Approach

- **No Preprocessors:** Standard CSS is used without SASS/LESS.
- **Variables:** Extensive use of `:root` and `.theme-*` classes for theming.
- **BEM-ish Naming:** Block Element Modifier convention is loosely followed (e.g., `.panel__header`, `.panel__content`).
- **Scoped Styles:** Styles are generally scoped by parent class (e.g., `.sidebar .panel`).

## 3. Layout Philosophy

- **Responsive:** The layout adapts to screen size, collapsing the sidebar on smaller screens.
- **Fluid:** Uses `minmax(0, 1fr)` and percentages for fluid resizing.
- **Layering:** extensive use of `z-index` for overlays (modals, tooltips, floating panels).

## 4. Component Implementation

- **Direct DOM:** Components are created/updated via `document.createElement` or `innerHTML` injection.
- **Event Delegation:** Events are often attached to parent containers rather than individual elements.
- **State Management:** Simple global state object (`window.state`) drives UI updates.

## 5. Adaptation Guide

To replicate this design in a framework (e.g., React):

1.  **Components:** Break down `.panel`, `.modal`, `.tool-btn` into reusable React components.
2.  **Styling:** Use CSS Modules or Styled Components, but keep the CSS variable system for theming.
3.  **State:** Replace global state with Context or Redux/Zustand.
4.  **Icons:** Use `lucide-react` instead of inline SVGs.
