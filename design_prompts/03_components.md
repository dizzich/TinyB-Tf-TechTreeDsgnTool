# Components: Trainfort Map Tool

This document details the HTML structure and CSS styling for reusable UI components.

## 1. Buttons

### Standard Button
```html
<button>Button Text</button>
```
- **Styling:**
  - Background: `var(--control-bg)`
  - Border: `1px solid var(--control-border)`
  - Radius: `14px`
  - Padding: `7px 10px`
  - Font-size: `12px`
  - Color: `var(--text)`
  - Hover: `background: var(--control-bg-muted)`, `border-color: var(--control-hover-border)`
  - Active: `transform: translateY(1px)`

### Icon Button (`.icon-btn`)
```html
<button class="icon-btn" aria-label="Settings">
  <svg>...</svg>
</button>
```
- **Styling:**
  - Width/Height: `34px` (or `36px` for `.icon-btn--round`)
  - Radius: `10px` (or `999px`)
  - Background: `var(--control-bg-muted)`
  - Border-color: `var(--control-border-muted)`
  - Hover: `border-color: var(--control-hover-border)`

### Tool Button (`.tool-btn`)
```html
<button class="tool-btn" data-tool="paint">
  <svg>...</svg>
</button>
```
- **Styling:**
  - Width/Height: `44px` (`--tool-btn-size`)
  - Radius: `14px`
  - Background: Transparent (or `var(--control-bg)` if active)
  - Hover: `background: var(--control-bg-muted)`
  - Active (`.active`):
    - Background: `var(--accent)`
    - Color: `#0f141c` (Dark text on accent)
    - Shadow: `0 0 18px rgba(106, 162, 255, 0.55)`

### Danger Button (`.button-danger`)
```html
<button class="button-danger">Delete</button>
```
- **Styling:**
  - Background: `rgba(227, 111, 111, 0.15)`
  - Border-color: `rgba(227, 111, 111, 0.45)`
  - Color: `var(--danger)`
  - Hover: Darker shade of danger background.

## 2. Inputs & Controls

### Text Input / Select / Textarea
```html
<input type="text" placeholder="Value" />
<select><option>Option</option></select>
<textarea rows="3"></textarea>
```
- **Styling:**
  - Background: `var(--control-bg)`
  - Border: `1px solid var(--control-border)`
  - Radius: `14px`
  - Padding: `7px 10px`
  - Font-size: `12px`
  - Color: `var(--text)`
  - Focus: `border-color: var(--accent)`, `outline: none`

### Checkbox (`.checkbox-label`)
```html
<label class="checkbox-label">
  <input type="checkbox" /> Label Text
</label>
```
- **Styling:**
  - Input Size: `16px`
  - Radius: `6px`
  - Checked State: `box-shadow: 0 0 6px var(--accent)`
  - Label: `display: flex`, `gap: 6px`, `align-items: center`

### Range Slider (`input[type="range"]`)
- **Styling:**
  - Track: `height: 8px`, `radius: 999px`, `background: var(--range-track)`
  - Thumb: `width: 16px`, `height: 16px`, `radius: 50%`, `background: var(--range-thumb)`

## 3. Panels (`.panel`)

Collapsible containers used in the sidebar.

```html
<section class="panel" data-collapsible>
  <header class="panel__header">
    <h2>Title</h2>
    <div class="panel__actions">
      <button class="panel__toggle">
        <svg class="panel__toggle-icon--collapse">...</svg>
        <svg class="panel__toggle-icon--expand">...</svg>
      </button>
    </div>
  </header>
  <div class="panel__content">
    <!-- Content here -->
  </div>
</section>
```
- **Behavior:** Toggling adds `.is-collapsed` class which hides `.panel__content` and swaps icons.
- **Styling:** See Layout Structure.

## 4. Lists (`.event-list`, `.hex-catalog-grid`)

### Event List Item
```html
<div class="event-list__item">
  <div class="event-list__title">Event Name</div>
  <div class="event-list__meta">Category • Type</div>
  <div class="event-list__desc">Description...</div>
</div>
```
- **Styling:**
  - Background: `var(--event-item-bg)`
  - Border: `1px solid var(--event-item-border)`
  - Radius: `10px`
  - Padding: `10px`
  - Hover: `background: var(--event-item-hover-bg)`

### Hex Catalog Grid
```html
<div class="hex-catalog-grid">
  <div class="hex-catalog-item">
    <div class="hex-catalog-item__preview">...</div>
    <div class="hex-catalog-item__name">Name</div>
  </div>
</div>
```
- **Styling:**
  - Grid Layout: `repeat(auto-fill, minmax(140px, 1fr))`
  - Gap: `12px`
  - Item Background: `var(--control-bg)`
  - Item Border: `1px solid var(--control-border)`
  - Item Radius: `10px`
  - Hover: `transform: translateY(-2px)`

## 5. Tooltips (`.hex-hover-tooltip`)

Custom tooltip for canvas elements.

```html
<div class="hex-hover-tooltip">
  <span class="hex-hover-tooltip__name">Name</span>
  <span class="hex-hover-tooltip__desc">Description</span>
</div>
```
- **Styling:**
  - Position: Fixed (follows cursor)
  - Background: `rgba(0, 0, 0, 0.85)`
  - Color: `#fff`
  - Radius: `6px`
  - Padding: `8px 12px`
  - Font-size: `12px`
  - Pointer-events: `none`
