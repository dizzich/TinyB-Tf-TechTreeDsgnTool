# UI/UX Migration Guide — TechTree Studio

**Полная самостоятельная инструкция** для переноса UI/UX системы проекта TechTree Studio в новый проект с аналогичным стеком. Все файлы и код включены полностью — можно использовать без доступа к исходному проекту.

## Структура референсных файлов

Этот документ предназначен для использования вместе с папкой `.ref/`, которая содержит:
- `.ref/src/` — полная копия папки `src` с компонентами, хуками и утилитами
- `.ref/package.json` — зависимости проекта
- `.ref/tailwind.config.js` — конфигурация Tailwind
- `.ref/postcss.config.js` — конфигурация PostCSS
- `.ref/tsconfig.json` — конфигурация TypeScript
- `.ref/vite.config.ts` — конфигурация Vite
- `.ref/index.html` — точка входа HTML

Все ссылки на файлы в этом документе указывают на файлы в папке `.ref/`. Скопируйте папку `.ref/` вместе с этим документом в новый проект для использования.

---

## Содержание

1. [Стек и зависимости](#1-стек-и-зависимости)
2. [Конфигурации проекта](#2-конфигурации-проекта)
3. [Дизайн-система (CSS Variables)](#3-дизайн-система-css-variables)
4. [Глобальные стили](#4-глобальные-стили)
5. [Архитектура лейаута](#5-архитектура-лейаута)
6. [Компонентная архитектура](#6-компонентная-архитектура)
7. [Нодовая система (ReactFlow)](#7-нодовая-система-reactflow)
8. [Паттерны форм и контролов](#8-паттерны-форм-и-контролов)
9. [State Management (Zustand)](#9-state-management-zustand)
10. [UX-паттерны](#10-ux-паттерны)
11. [Hooks](#11-hooks)
12. [Утилиты](#12-утилиты)
13. [Полные файлы компонентов](#13-полные-файлы-компонентов)
14. [Полные файлы утилит](#14-полные-файлы-утилит)
15. [Пошаговая инструкция переноса](#15-пошаговая-инструкция-переноса)

---

## 1. Стек и зависимости

### Runtime-зависимости

```json
{
  "@xyflow/react": "^12.0.0",
  "clsx": "^2.1.1",
  "dagre": "^0.8.5",
  "file-saver": "^2.0.5",
  "html-to-image": "^1.11.11",
  "jszip": "^3.10.1",
  "lucide-react": "^0.400.0",
  "papaparse": "^5.4.1",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "tailwind-merge": "^2.3.0",
  "zustand": "^4.5.4"
}
```

### Dev-зависимости

```json
{
  "@eslint/js": "^9.9.0",
  "@types/dagre": "^0.7.52",
  "@types/file-saver": "^2.0.7",
  "@types/node": "^22.0.0",
  "@types/papaparse": "^5.3.14",
  "@types/react": "^18.3.3",
  "@types/react-dom": "^18.3.0",
  "@vitejs/plugin-react": "^4.3.1",
  "autoprefixer": "^10.4.19",
  "eslint": "^9.9.0",
  "postcss": "^8.4.39",
  "tailwindcss": "^3.4.4",
  "typescript": "^5.5.3",
  "vite": "^5.4.1"
}
```

### Назначение каждой зависимости

| Пакет | Назначение |
|-------|------------|
| `@xyflow/react` | Граф-визуализация (ноды, рёбра, зум, пан, минимапа) |
| `zustand` | Глобальный стейт (единый store) |
| `clsx` | Условное объединение CSS-классов |
| `tailwind-merge` | Мердж Tailwind-классов без конфликтов |
| `lucide-react` | Иконки (SVG React-компоненты) |
| `dagre` | Алгоритм DAG-лейаута для авто-расположения нод |
| `file-saver` | Фолбэк для скачивания файлов (когда нет File System API) |
| `html-to-image` | Экспорт графа в PNG/SVG |
| `jszip` | Создание ZIP-архивов при экспорте |
| `papaparse` | Парсинг CSV при импорте |

---

## 2. Конфигурации проекта

### vite.config.ts

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/YourProject/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}))
```

### tailwind.config.js

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./.ref/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        'panel-2': 'var(--panel-2)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        danger: 'var(--danger)',
        'panel-border': 'var(--panel-border)',
        divider: 'var(--divider)',
        'control-bg': 'var(--control-bg)',
        'control-border': 'var(--control-border)',
        'control-bg-muted': 'var(--control-bg-muted)',
        'control-border-muted': 'var(--control-border-muted)',
        'control-hover-border': 'var(--control-hover-border)',
        'control-hover-bg': 'var(--control-hover-bg)',
        'workspace-bg': 'var(--workspace-bg)',
        'status-bg': 'var(--status-bg)',
        'status-border': 'var(--status-border)',
        'status-text': 'var(--status-text)',
        'modal-bg': 'var(--modal-bg)',
        'modal-border': 'var(--modal-border)',
        'event-item-bg': 'var(--event-item-bg)',
        'event-item-border': 'var(--event-item-border)',
        'event-item-hover-bg': 'var(--event-item-hover-bg)',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        base: ['12px', { lineHeight: '1.5' }],
      },
      boxShadow: {
        panel: 'var(--panel-shadow)',
        floating: 'var(--shadow-floating)',
        modal: 'var(--shadow-modal)',
      },
      borderRadius: {
        control: '14px',
        panel: '12px',
        small: '6px',
      },
      width: {
        sidebar: 'var(--sidebar-width)',
      },
    },
  },
  plugins: [],
}
```

### postcss.config.js

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### tsconfig.json (ключевые настройки)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "jsx": "react-jsx",
    "strict": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "paths": {
      "@/*": ["./.ref/src/*"]
    }
  },
  "include": [".ref/src"]
}
```

---

## 3. Дизайн-система (CSS Variables)

### Шрифт

- **Основной**: Plus Jakarta Sans (Google Fonts), weights: 400, 500, 600, 700
- **Fallback**: Inter → Segoe UI → sans-serif
- **Базовый размер**: 12px
- **Подключение**: `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap')`

### Типография

| Элемент | Размер | Вес | Доп |
|---------|--------|-----|-----|
| `body` | 12px | 400 | line-height: 1.5 |
| `h1` | 18px | 600 | — |
| `h2` | 14px | 600 | uppercase, letter-spacing: 0.08em |
| `h3` | 14px | 600 | uppercase |

### Dark Theme (по умолчанию) — `:root`

```css
:root {
  color-scheme: dark;

  /* Фоны */
  --bg: #15171c;
  --panel: #1f2229;
  --panel-2: #242832;
  --workspace-bg: #0d0f14;

  /* Текст */
  --text: #e6e9ef;
  --muted: #9aa3b2;

  /* Акцент */
  --accent: #6aa2ff;
  --accent-hover: #5a8fef;
  --danger: #e36f6f;

  /* Границы и разделители */
  --panel-border: #2c3340;
  --edge-stroke: #4a5568;
  --divider: #323845;

  /* Контролы (inputs, selects, buttons) */
  --control-bg: #151920;
  --control-border: #303748;
  --control-bg-muted: #171b24;
  --control-border-muted: #2a3344;
  --control-hover-border: #3a465c;
  --control-hover-bg: #252d3a;

  /* Статус-бар */
  --status-bg: #11131a;
  --status-border: #2b303b;
  --status-text: #9aa3b2;

  /* Модалки */
  --tooltip-bg: rgba(18, 22, 30, 0.95);
  --modal-overlay: rgba(7, 10, 16, 0.7);
  --modal-bg: #1b202a;
  --modal-border: #2c3340;

  /* Тени */
  --panel-shadow: 0 8px 18px rgba(5, 8, 14, 0.35);
  --shadow-floating: 0 10px 24px rgba(6, 8, 14, 0.45);
  --shadow-modal: 0 20px 40px rgba(5, 8, 14, 0.6);

  /* Размеры */
  --ui-scale: 1;
  --tool-btn-size: 44px;
  --sidebar-width: 320px;

  /* Элементы списка */
  --event-item-bg: #1a1e26;
  --event-item-border: #2c3340;
  --event-item-hover-bg: #252d3a;

  /* Range input */
  --range-track: #2a3344;
  --range-thumb: #6aa2ff;
}
```

### Light Theme — `body.theme-light`

```css
body.theme-light {
  color-scheme: light;

  --bg: #f5f7fb;
  --panel: #ffffff;
  --panel-2: #f0f2f7;
  --workspace-bg: #e3e8f2;

  --text: #1c232f;
  --muted: #5a6575;

  --accent: #3867d6;
  --accent-hover: #2d55b5;
  --danger: #d63031;

  --panel-border: #d7dee8;
  --edge-stroke: #8b95a6;
  --divider: #e1e6ed;

  --control-bg: #ffffff;
  --control-border: #cfd6e2;
  --control-bg-muted: #f0f2f7;
  --control-border-muted: #d7dee8;
  --control-hover-border: #b0b8c6;
  --control-hover-bg: #e3e8f2;

  --status-bg: #ffffff;
  --status-border: #d7dee8;
  --status-text: #5a6575;

  --tooltip-bg: rgba(255, 255, 255, 0.95);
  --modal-overlay: rgba(28, 35, 47, 0.5);
  --modal-bg: #ffffff;
  --modal-border: #d7dee8;

  --panel-shadow: 0 8px 18px rgba(148, 163, 184, 0.25);
  --shadow-floating: 0 10px 24px rgba(148, 163, 184, 0.35);
  --shadow-modal: 0 20px 40px rgba(148, 163, 184, 0.4);

  --event-item-bg: #ffffff;
  --event-item-border: #d7dee8;
  --event-item-hover-bg: #f0f2f7;

  --range-track: #d7dee8;
  --range-thumb: #3867d6;
}
```

### Механизм переключения тем

```tsx
// В store:
ui: { theme: 'dark' | 'light' }
setTheme(theme) → сохранить в localStorage('techtree_theme')

// В App.tsx:
useEffect(() => {
  if (theme === 'light') {
    document.body.classList.add('theme-light');
  } else {
    document.body.classList.remove('theme-light');
  }
}, [theme]);
```

---

## 4. Глобальные стили

### Базовые элементы

```css
html, body, #root {
  height: 100%;
  margin: 0;
  overflow: hidden;
  font-family: 'Plus Jakarta Sans', 'Inter', 'Segoe UI', sans-serif;
  font-size: 12px;
  background: var(--bg);
  color: var(--text);
}
```

### Скроллбары

```css
.sidebar__scroll::-webkit-scrollbar,
.panel__content::-webkit-scrollbar,
.modal__content::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

/* track: transparent */
/* thumb: var(--panel-border), border-radius: 999px */
/* thumb:hover: var(--muted) */
```

### Стилизация select

```css
select {
  appearance: none;
  background-image: url("data:image/svg+xml,...chevron-svg...");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 28px;
}
```

### Стилизация checkbox

```css
input[type="checkbox"] {
  accent-color: var(--accent);
  border-radius: 6px;
}
input[type="checkbox"]:checked {
  box-shadow: 0 0 6px var(--accent);
}
```

### Выделение текста

```css
::selection {
  background: var(--accent);
  color: #0f141c;
}
```

### Кнопка — нажатие

```css
.icon-btn:active {
  transform: translateY(1px);
}
```

### ReactFlow — стилизация под дизайн-систему

```css
/* Controls */
.react-flow__controls {
  background: var(--panel) !important;
  border: 1px solid var(--panel-border) !important;
  border-radius: 14px;
  box-shadow: var(--shadow-floating);
}
.react-flow__controls-button {
  background: var(--control-bg-muted) !important;
  border-color: var(--control-border-muted) !important;
  color: var(--text) !important;
  fill: var(--text) !important;
}
.react-flow__controls-button:hover {
  background: var(--control-hover-bg) !important;
  border-color: var(--control-hover-border) !important;
}

/* Minimap */
.react-flow__minimap {
  background: var(--panel) !important;
  border: 1px solid var(--panel-border) !important;
  border-radius: 12px;
  box-shadow: var(--panel-shadow);
  width: 240px !important;
  height: 180px !important;
}

/* Edges */
.react-flow__edge-path {
  stroke: var(--edge-stroke);
  stroke-width: 2;
}
.react-flow__edge.selected .react-flow__edge-path {
  stroke: var(--accent);
  filter: drop-shadow(0 0 4px var(--accent));
}
```

### Canvas-фильтр (dim/match)

```css
/* Совпавшие ноды */
.react-flow__node.canvas-filter-match {
  filter: brightness(1.15);
  transition: filter 0.3s ease, opacity 0.3s ease;
}

/* Не совпавшие — затемнение */
.react-flow__node.canvas-filter-dim {
  opacity: 0.25;
  filter: brightness(0.6);
  transition: filter 0.3s ease, opacity 0.3s ease;
  pointer-events: none;
}

/* Рёбра к затемнённым нодам */
.react-flow__edge.canvas-filter-dim-edge .react-flow__edge-path {
  opacity: 0.12;
}
```

### Edge-click highlight (подсветка подграфа)

```css
/* Не в подграфе — затемнение */
.react-flow__node.edge-highlight-dim {
  opacity: 0.25;
  filter: brightness(0.6);
  pointer-events: none;
}

/* Выделенное ребро — свечение */
.react-flow__edge.edge-highlight-match-edge .react-flow__edge-path {
  stroke: var(--accent);
  filter: drop-shadow(0 0 8px var(--accent));
}

/* Рёбра вне подграфа */
.react-flow__edge.edge-highlight-dim-edge .react-flow__edge-path {
  opacity: 0.15;
}
```

### Waypoints (ручное редактирование рёбер)

```css
.editable-edge-waypoint {
  width: 12px; height: 12px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid var(--panel);
  box-shadow: 0 0 6px rgba(106, 162, 255, 0.5);
  cursor: grab;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.editable-edge-waypoint:hover {
  transform: translate(-50%, -50%) scale(1.3);
  box-shadow: 0 0 12px rgba(106, 162, 255, 0.7);
}
.editable-edge-waypoint[data-dragging] {
  cursor: grabbing;
  background: var(--accent-hover);
}

/* Кнопка добавления waypoint */
.editable-edge-add-wp {
  width: 18px; height: 18px;
  border-radius: 50%;
  background: var(--control-bg-muted);
  border: 1.5px solid var(--control-border);
  opacity: 0; /* Показывается при hover/select на edge */
}
.editable-edge-add-wp:hover {
  opacity: 1 !important;
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
```

### Анимированные рёбра

```css
/* Animated edge (manual mode) — бегущие штрихи */
.react-flow__edge .editable-edge-animated .react-flow__edge-path {
  stroke-dasharray: 5;
  animation: dashdraw 0.5s linear infinite;
}

@keyframes dashdraw {
  to { stroke-dashoffset: -10; }
}
```

### Edge context menu

```css
.edge-context-menu {
  min-width: 160px;
  padding: 4px 0;
  border-radius: 8px;
  border: 1px solid var(--panel-border);
  background: var(--panel);
  box-shadow: var(--shadow-floating);
}
.edge-ctx-item {
  padding: 7px 14px;
  font-size: 12px;
  color: var(--text);
  background: none;
  border: none;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.edge-ctx-item:hover {
  background: var(--control-hover-bg);
  color: var(--accent);
}
```

### Minimap кнопки

```css
/* Zoom +/- */
.minimap-zoom-btn {
  width: 12px; height: 12px;
  border-radius: 3px;
  border: 1px solid var(--control-border-muted);
  background: var(--control-bg-muted);
  color: var(--text);
  font-size: 10px;
  transition: background 0.2s ease, border-color 0.2s ease;
}

/* Center button */
.minimap-center-btn {
  width: 28px; height: 28px;
  border-radius: 8px;
  /* active state: bg & border = var(--accent), color: white */
}

/* Hide button */
.minimap-hide-btn {
  width: 26px; height: 26px;
  border-radius: 8px;
  /* top: 8px; left: 8px */
}

/* Show button (when minimap hidden) */
.minimap-show-btn {
  width: 40px; height: 40px;
  border-radius: 12px;
  border: 1px solid var(--panel-border);
  background: var(--panel);
  box-shadow: var(--shadow-floating);
}
```

---

## 5. Архитектура лейаута

### Диаграмма

```
+------------------------------------------------------------------+
|                         App (flex h-screen)                       |
|  +--------+ +----------------------------------------------+ +-+ |
|  |        | |                                              | | | |
|  |Sidebar | |            Workspace (flex-1)                | |I | |
|  | z-20   | |  +--------------------------------------+   | |n | |
|  | 320px  | |  |                                      |   | |s | |
|  |        | |  |           Graph (ReactFlow)           |   | |p | |
|  | glass  | |  |                                      |   | |e | |
|  | effect | |  +--------------------------------------+   | |c | |
|  |        | |  +--------------------------------------+   | |t | |
|  |        | |  | StatusBar (bottom, shrink-0)         |   | |o | |
|  |        | |  +--------------------------------------+   | |r | |
|  |        | |                                              | | | |
|  +--------+ +----------------------------------------------+ |z | |
|  |resizer|                                                   |30| |
|  +--------+  +------------------------------------------+    |  | |
|              | Toolbar (absolute top, z-30)              |    |  | |
|              +------------------------------------------+    |  | |
|                                                        +-----+-+ |
|                                      [MiniMap overlay, z-40]     |
+------------------------------------------------------------------+
   Modals: z-50 (fixed, backdrop-blur, overlay)
```

### Z-index слои

| Слой | Z-index | Элемент |
|------|---------|---------|
| Workspace | 0 | Graph, StatusBar |
| Minimap | 10 | react-flow__minimap |
| Sidebar | 20 | Sidebar panel |
| Toolbar / Inspector | 30 | Toolbar, Inspector overlay |
| MiniMap overlay | 40 | FlowMiniMap wrapper |
| Collapse buttons | 50 | Sidebar/Inspector toggle |
| Modals | 50 | Все модальные окна |

### Основной лейаут (App.tsx)

```tsx
<ReactFlowProvider>
  <div className="relative flex h-screen w-screen overflow-hidden text-text bg-bg transition-all duration-300 ease-in-out">
    {/* Main row */}
    <div className="flex flex-1 min-w-0 min-h-0 relative">
      {/* Workspace — always full width */}
      <div className="workspace flex-1 min-w-0 flex flex-col bg-workspace-bg relative z-0">
        {/* Collapse buttons for hidden panels */}
        {!sidebarOpen && <CollapseButton side="left" />}
        {!inspectorOpen && <CollapseButton side="right" />}
        <div className="flex-1 min-h-0 min-w-0 relative">
          <Graph />
        </div>
        <StatusBar />
      </div>

      {/* Inspector — absolute overlay, right side */}
      {inspectorOpen && (
        <div className="absolute right-0 top-0 bottom-0 w-80 z-30 flex flex-col min-h-0 shadow-panel"
             style={{ backgroundColor: 'transparent' }}>
          <Inspector />
        </div>
      )}
    </div>

    {/* Sidebar — absolute, left side */}
    {sidebarOpen && (
      <>
        <div className="sidebar-resizer absolute top-0 bottom-0 z-30 w-2 cursor-col-resize bg-panel-border hover:bg-accent/30"
             style={{ left: 'var(--sidebar-width)' }} />
        <div className="absolute left-0 top-0 bottom-0 z-20"
             style={{ width: 'var(--sidebar-width)' }}>
          <Sidebar />
        </div>
      </>
    )}

    {/* Toolbar — absolute top, between sidebar and inspector */}
    <div className="absolute top-0 z-30 transition-[left,right] duration-300 ease-in-out"
         style={{
           left: sidebarOpen ? 'var(--sidebar-width)' : 0,
           right: inspectorOpen ? '20rem' : 0,
         }}>
      <Toolbar />
    </div>

    {/* MiniMap — absolute bottom-right */}
    <div className="minimap-overlay"
         style={{
           right: inspectorOpen ? 'calc(20rem + 16px)' : '16px',
           bottom: '32px',
         }}>
      <FlowMiniMap /> {/* или кнопка показать, если скрыта */}
    </div>
  </div>

  {/* Все модалки рендерятся здесь */}
  <ImportModal />
  <ExportModal />
  <SettingsModal />
  ...
</ReactFlowProvider>
```

### Glass-эффект (Sidebar, Inspector)

```tsx
const BASE_GLASS_BLUR = 20;
const glassEnabled = settings.glassEffectEnabled !== false;
const modifier = Math.max(0.5, Math.min(2.5, settings.glassEffectModifier ?? 1.2));
const blurPx = Math.round(BASE_GLASS_BLUR * (3 - modifier));

const glassStyle = glassEnabled
  ? {
      backdropFilter: `blur(${blurPx}px)`,
      WebkitBackdropFilter: `blur(${blurPx}px)`,
      transform: 'translateZ(0)',
      isolation: 'isolate' as const,
    }
  : { backdropFilter: 'none', WebkitBackdropFilter: 'none' };

// backgroundColor:
// с glass: 'color-mix(in srgb, var(--panel) 48%, transparent)'
// без glass: 'color-mix(in srgb, var(--panel) 65%, transparent)'
```

### Collapse/Expand панелей

Кнопки скрытых панелей:
```tsx
<button className="absolute left-0 top-1/2 -translate-y-1/2 z-50
  flex items-center justify-center w-6 h-12
  bg-panel border-y border-r border-panel-border rounded-r-lg shadow-md
  text-muted hover:text-text hover:bg-panel-2 transition-all">
  <ChevronRight size={16} />
</button>
```

---

## 6. Компонентная архитектура

### Список компонентов

| Компонент | Файл | Назначение |
|-----------|------|------------|
| **Sidebar** | `.ref/src/components/Sidebar.tsx` | Левая панель: список нод, поиск, фильтрация, сортировка. Glass-эффект. |
| **Inspector** | `.ref/src/components/Inspector.tsx` | Правая панель: свойства выбранной ноды, чипы, форм-поля. Glass-эффект. |
| **Toolbar** | `.ref/src/components/Toolbar.tsx` | Верхняя панель: файлы, add node, undo/redo, layout, alignment, edge type, snap, filter, settings. |
| **StatusBar** | `.ref/src/components/StatusBar.tsx` | Нижняя полоса: кол-во нод/рёбер, selected, zoom %. |
| **Graph** | `.ref/src/graph/Graph.tsx` | Обёртка ReactFlow: nodeTypes, edgeTypes, event handlers, background pattern. |
| **TechNode** | `.ref/src/graph/TechNode.tsx` | Кастомная нода: template rendering, color presets, handles. |
| **EditableEdge** | `.ref/src/graph/EditableEdge.tsx` | Кастомное ребро: waypoints, orthogonal routing, context menu. |
| **FlowMiniMap** | `.ref/src/graph/FlowMiniMap.tsx` | Минимапа с зумом, центрированием, pan, hide. |
| **AxisLockGuide** | `.ref/src/graph/AxisLockGuide.tsx` | Визуальная линия при axis-lock drag (Shift). |
| **SettingsModal** | `.ref/src/components/SettingsModal.tsx` | Настройки: 4 вкладки (General, Visuals, Template, Performance). |
| **ColorMappingModal** | `.ref/src/components/ColorMappingModal.tsx` | Настройка цветового маппинга нод. |
| **ImportModal** | `.ref/src/components/ImportModal.tsx` | Импорт CSV: выбор файла → маппинг колонок → применение. |
| **ExportModal** | `.ref/src/components/ExportModal.tsx` | Экспорт: PNG, SVG, CSV, XML (Draw.io). |
| **StartupModal** | `.ref/src/components/StartupModal.tsx` | Стартовый визард при первом запуске. |
| **SaveConfirmModal** | `.ref/src/components/SaveConfirmModal.tsx` | Подтверждение сохранения. |
| **UnsavedChangesModal** | `.ref/src/components/UnsavedChangesModal.tsx` | Предупреждение о несохранённых изменениях. |
| **FilterBuilder** | `.ref/src/components/FilterBuilder.tsx` | Конструктор фильтров (property + condition + values). |
| **NodePreview** | `.ref/src/components/NodePreview.tsx` | Превью ноды с применённым шаблоном (для Settings). |
| **ErrorBoundary** | `.ref/src/components/ErrorBoundary.tsx` | React error boundary с кнопкой перезагрузки. |

### Паттерн модального окна

```tsx
export const MyModal = () => {
  const isOpen = useStore(s => s.modals.myModal);
  const setModalOpen = useStore(s => s.setModalOpen);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'var(--modal-overlay)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={() => setModalOpen('myModal', false)}
    >
      <div
        className="bg-modal-bg border border-modal-border rounded-panel shadow-modal
                   w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-divider shrink-0">
          <h2>Заголовок</h2>
          <button onClick={() => setModalOpen('myModal', false)}
                  className="text-muted hover:text-text transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="modal__content flex-1 overflow-y-auto px-6 py-4">
          {/* ... */}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-divider shrink-0">
          <button className={btnSecondary} onClick={handleCancel}>Отмена</button>
          <button className={btnPrimary} onClick={handleSave}>Сохранить</button>
        </div>
      </div>
    </div>
  );
};
```

### SettingsModal — 4 вкладки (полная реализация)

Модалка: `max-w-2xl max-h-[80vh] rounded-[16px]`. Паттерн: локальный стейт `localSettings` + `localTheme`, sync при открытии, Save/Cancel в footer.

Табы: `px-6 py-3 font-medium text-sm`, активный: `border-b-2 border-accent text-accent`.

#### Tab 1: Основные (General)

| Настройка | Тип | Диапазон | Default | UI |
|-----------|-----|----------|---------|-----|
| `layoutDirection` | `'LR'` \| `'TB'` | — | `'LR'` | Radio buttons |
| `hideUnconnectedNodes` | `boolean` | — | `false` | Checkbox |

- **layoutDirection**: "Слева направо (LR)" / "Сверху вниз (TB)"
- **hideUnconnectedNodes**: "Не показывать в списке и на полотне узлы без входящих и исходящих связей"

#### Tab 2: Визуал (Visuals)

**Тема (Dark/Light):**
- Два preview-бокса с цветными прямоугольниками (имитация UI)
- Выбранный: `bg-panel border-accent shadow-[0_0_10px_rgba(106,162,255,0.2)]`

**Glass-эффект:**

| Настройка | Тип | Диапазон | Default | UI |
|-----------|-----|----------|---------|-----|
| `glassEffectEnabled` | `boolean` | — | `true` | Checkbox |
| `glassEffectModifier` | `number` | 0.5–2.5 (50%–250%) | 1.2 (120%) | Range slider, step 10% |

Описание: "Включить эффект стекла на панелях Узлы и Инспектор". Slider disabled при выключенном glass.

**Фон полотна (Background Pattern):**

| Настройка | Тип | Диапазон | Default | UI |
|-----------|-----|----------|---------|-----|
| `bgPatternVariant` | `'dots'` \| `'lines'` \| `'cross'` | — | `'dots'` | Select: "Точки", "Линии (сетка)", "Крестики" |
| `bgPatternLinkedToSnap` | `boolean` | — | `true` | Checkbox: "Привязать шаг к сетке привязки" |
| `bgPatternGap` | `number` (int) | 10–100 px | 20 | Range slider, step 1. Disabled при linked=true |
| `bgPatternSize` | `number` (float) | 0.5–4 px | 1 | Range slider, step 0.5: "Толщина точек/линий" |

#### Tab 3: Шаблон (Template)

**Шаблон ноды:**

| Настройка | Тип | Default | UI |
|-----------|-----|---------|-----|
| `nodeTemplate` | `string` | `"%label%\n%act% %stage% \| %category%"` | Textarea `h-32 resize-none font-mono` |

**Визуальный пресет ноды:**

| Настройка | Тип | Default | UI |
|-----------|-----|---------|-----|
| `nodeVisualPreset` | `NodeVisualPreset` | `'default'` | 5 Radio buttons |

Опции:
- `default`: "Обычный — нейтральная обводка, полоска цвета слева"
- `bold`: "Жирная обводка — обводка и тёмный фон цветом категории"
- `outline`: "Только обводка — обводка цветом, фон обычный"
- `minimal`: "Минимальный — нейтральная обводка, без полоски"
- `striped`: "Полосатая заливка — диагональные полосы в стиле draw.io"

**Размеры ноды:**

| Настройка | Тип | Диапазон | Default | UI |
|-----------|-----|----------|---------|-----|
| `nodeMinWidth` | `number` | 120–500 px | 200 | Number input |
| `nodeMaxWidth` | `number` | 120–500 px | 320 | Number input |
| `nodeMinHeight` | `number` | 32–120 px | 48 | Number input |
| `nodeBorderWidth` | `number` | 1–6 px | 2 | Number input |
| `nodeLeftStripWidth` | `number` | 2–12 px | 3 | Number input, "Только для пресета «Обычный»" |

**Выравнивание текста:**

| Настройка | Тип | Default | UI |
|-----------|-----|---------|-----|
| `nodeTextAlignH` | `'left'` \| `'center'` \| `'right'` | `'left'` | Select: "Слева", "По центру", "Справа" |
| `nodeTextAlignV` | `'top'` \| `'center'` \| `'bottom'` | `'center'` | Select: "К верху", "По центру", "К низу" |
| `nodeTextFit` | `boolean` | `true` | Checkbox: "Вписывать текст в ноду" |

**NodePreview**: Live preview с текущими настройками, показывается после визуальных настроек.

**32 плейсхолдера** для шаблона (отображаются в 2-3 колонки):
`%label%`, `%act%`, `%stage%`, `%category%`, `%description%`, `%tags%`, `%techCraftId%`, `%outputItem%`, `%formulaIngridients%`, `%ingredients%`, `%recipeDetail%`, `%outputDetail%`, `%usedStation%`, `%usedCraftStation%`, `%usedCraftStationRefs%`, `%outputItemRef%`, `%powerType%`, `%gameStatus%`, `%designStatus%`, `%notionSyncStatus%`, `%techGameStatus%`, `%techForAct%`, `%openCondition%`, `%openConditionRefs%`, `%itemLootingInAct%`, `%electricCost%`, `%researchTime%`, `%notes%`, `%itemCodeName%`, `%createdAt%`, `%updatedAt%`, `%notionPageId%`

#### Tab 4: Производительность (Performance)

| Настройка | Тип | Default | UI |
|-----------|-----|---------|-----|
| `renderSimplification` | `boolean` | `false` | Checkbox: "Включить упрощение отрисовки" |

Описание: "Автоматически упрощает отрисовку узлов в зависимости от уровня масштаба и сложности"

---

### Toolbar — полная реализация

Позиционирование: `absolute top-3 left-3 right-3 z-10`. Стилизация: `rounded-[14px] border border-panel-border shadow-floating px-2 py-1.5`. Background: `color-mix(in srgb, var(--panel) 75%, transparent)` + `backdrop-filter: blur(8px)`.

Layout: `flex justify-between` (левая группа + правая группа).

#### Icon Button Base Class

```tsx
const iconBtnClass = 'icon-btn w-9 h-9 flex items-center justify-center rounded-control ' +
  'bg-control-bg-muted border border-control-border-muted text-text ' +
  'hover:border-accent hover:bg-control-hover-bg hover:text-accent ' +
  'hover:shadow-[0_0_10px_rgba(106,162,255,0.3)] active:translate-y-px ' +
  'transition-all duration-200';

// Active/On state (для toggle-кнопок):
'!text-accent !border-accent bg-accent/15 shadow-[0_0_8px_rgba(106,162,255,0.4)] ring-1 ring-accent/40'

// Disabled state:
'disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed'
```

#### Menu Item Class

```tsx
'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-control-hover-bg'
// + disabled: 'opacity-50 pointer-events-none'
```

#### Левая группа

**1. Project Menu** (dropdown):
- Кнопка: имя проекта + ChevronDown, `max-w-[280px]` с truncate
- Dropdown: "Открыть проект" (FolderOpen icon)

**2. Файловые операции:**
- **Open** (FolderOpen) — проверяет unsaved changes, если есть → UnsavedChangesModal
- **Save** (Save) — создаёт ProjectFile: `{ version, meta, settings, nodes, edges }`, сохраняет через useFileSystem
- **Add Node** (Plus) — создаёт ноду: `id: 'node-${Date.now()}'`, position: `{x:250, y:250}`, data: `{label:'Новый узел', act:'', stage:'', category:''}`, type: `'techNode'`
- **Import CSV** (Upload) — открывает ImportModal
- **Export** (Download) — открывает ExportModal

**3. Layout Menu** (dropdown с ChevronDown):

a) **Auto-Layout (Full Graph)** — 4 направления:
   - LR: "Дерево слева направо"
   - RL: "Дерево справа налево"
   - TB: "Дерево сверху вниз"
   - BT: "Дерево снизу вверх"
   - Handler: `getLayoutedElements(nodes, edges, direction)` + pushSnapshot для undo

b) **Auto-Layout (Selected Nodes)** — 2 направления:
   - LR: "Дерево LR по выделенным"
   - TB: "Дерево TB по выделенным"
   - Handler: `layoutSubgraph(nodes, edges, selectedIds, direction)`
   - Disabled если нет выделения

c) **Alignment** (6 функций, disabled без выделения):
   - `alignLeft()`, `alignRight()`, `alignTop()`, `alignBottom()`
   - `alignCenterHorizontal()`, `alignCenterVertical()`

d) **Distribution** (2 функции):
   - `distributeHorizontally()` — ArrowLeftRight icon
   - `distributeVertically()` — ArrowUpDown icon

e) **Stacking** (2 функции):
   - `stackHorizontally()` — "В ряд по горизонтали"
   - `stackVertically()` — "В ряд по вертикали"

**4. Snap Control** (toggle button + dropdown):
- Toggle: Grid3X3 icon, вкл/выкл `snapEnabled`
- Dropdown:
  - **snapGridSize**: Number input `w-16`, range 0–64, step 1, default 10. "0 = выкл"
  - **snapToObjects**: Checkbox, default false. "Привязка к соседним объектам — выравнивание по краям и центрам. Shift+drag — фиксация по оси"

**5. Edge Type Switcher** (dropdown):
- Текущий тип показан иконкой на кнопке

a) **4 типа рёбер:**
   - `default`: "Изогнутые" (Spline icon)
   - `straight`: "Прямые" (Minus icon)
   - `step`: "Прямоугольные" (CornerDownRight icon)
   - `smoothstep`: "Сглаженные" (Spline icon)
   - Selected: `text-accent bg-accent/10`

b) **Edge Thickness**: Range 1–5, step 0.5, default 2px

c) **Edge Animation**: Checkbox, default false. "Анимация (бегущие точки)"

d) **Connected Subgraph Highlight**: Checkbox, default true. "Подсветка связанных при клике"

e) **Manual Edge Mode**: Checkbox, default false. "Ручные линии (вейпоинты)" + инструкция: "Кликайте на линию, чтобы добавить точки изгиба. Перетаскивайте для настройки. Двойной клик — удалить точку."

**6. Connector Traversal Toggle** (Link icon):
- Toggle: `connectorTraversalHighlightEnabled`
- "Рекурсивная подсветка цепочек от коннектора: вкл/выкл"
- Рекурсивный = BFS полная цепочка, нерекурсивный = только прямые соседи

**7. Canvas Filter** (Eye icon + badge):
- Badge: количество правил, `bg-accent text-[#0f141c] rounded-full px-1.5 py-0.5 text-[10px] font-bold`
- Dropdown содержит:
  - **FilterBuilder** component (см. ниже)
  - **hideMode toggle**: Checkbox "Скрывать ноды (вместо затемнения)", default 'dim'

#### Правая группа

- **Undo** (Undo icon) — disabled при `!canUndo`
- **Redo** (Redo icon) — disabled при `!canRedo`
- **Settings** (Settings icon) — открывает SettingsModal

#### Dropdown behaviour
Все dropdown используют refs + `useEffect` для click-outside закрытия. Все `onClick={(e) => e.stopPropagation()}` внутри.

---

### ColorMappingModal — полная реализация

Модалка: `max-w-xl max-h-[85vh] rounded-[16px]`.

#### Color-By Selection

Dropdown с 9 опциями:

| Value | Label |
|-------|-------|
| `category` | Категория |
| `stage` | Стадия |
| `act` | Акт |
| `powerType` | Тип питания |
| `gameStatus` | Статус в игре |
| `openCondition` | OpenCondition (условие открытия) |
| `ingredients` | Из чего крафтится (Ingridients) |
| `usedCraftStation` | На чём крафтится (UsedCraftStation) |
| `usedStation` | Станция крафта (UsedStation) |

Описание: "Левая полоска на нодах окрашивается по выбранному атрибуту"

#### Value → Color Mapping

- Заголовок: "Цвет для каждого значения «{label}»"
- **"Авто-раскрасить"** — cycles через palette для каждого уникального значения
- **"Сбросить свои"** — очищает colorMap, возвращает к Notion defaults
- Scrollable list: `max-h-64 overflow-y-auto`

Каждый элемент:
```
[Color picker w-8 h-8] [Value name (truncated)] [Count badge]
```
- Color picker: hidden `<input type="color">` в label-обёртке
- Count badge с русским склонением

#### Color Resolution Order
```
1. localColorMap[value]  — пользовательский override
2. notionDefaults[value] — цвета из Notion
3. resolveNodeColor()    — hash в palette
```

#### Palette Editor (collapsible)

`<details>` element, по умолчанию свёрнут:
- Summary: "Палитра по умолчанию (для новых значений)"
- Grid: `flex flex-wrap gap-2`, каждый цвет `w-9 h-9 rounded-control`
- "Сбросить палитру" кнопка
- Описание: "Используется для значений без явного сопоставления и при «Авто-раскрасить»"

---

### Inspector — полная реализация

Правая панель `w-80` с glass-эффектом. Два режима: пустой (нет выделения) и с нодой.

#### Пустой режим
```
Инспектор (h2)
"Выберите узел для редактирования"
```

#### С выбранной нодой

**Header:**
- Node ID (font-mono, truncated)
- TechCraftId badge: `bg-control-bg-muted text-muted font-mono rounded-[8px]`
- Notion link badge (если есть notionPageId)
- Background: `color-mix(in srgb, var(--panel-2) 50%, transparent)`

**Секция "Основное":**
- **Название**: text input (editable)
- **ItemCodeName**: readonly input + Copy button
- **Акт (TechForAct)** + **Стадия**: grid-cols-2, оба ChipSelect
- **Категория**: ChipSelect (full width)

**Секция "Статусы":**
- **Тип питания** (powerType): ChipSelect
- **Статус в игре** (gameStatus): ChipSelect
- **Статус дизайна** (designStatus): ChipSelect
- **Статус Notion** (notionSyncStatus): ChipSelect

Все ChipSelect получают цвет через `getChipColor()`:
```tsx
const getChipColor = (key, value) => {
  if (settings.nodeColorMap?.[v]) return settings.nodeColorMap[v];
  if (notionFieldColors[key]?.[v]) return notionFieldColors[key][v];
  if (STATUS_VARIANTS[v]) return STATUS_VARIANTS[v];
  return resolveNodeColor(v, undefined, palette, notionFieldColors[key]);
};
```

STATUS_VARIANTS: `implemented/done/Synchronized → #34d399`, `to remove/Canceled → #e36f6f`, `to update → #f59e42`, `proposal → #6aa2ff`, `to_do → #a78bfa`

**Секция "Связи":**
- **Входящие** (incoming edges): список с кнопками:
  - Jump to source node (click → fitView)
  - Highlight edge (Link icon → setConnectedSubgraphHighlight)
  - Delete edge (Trash2 icon → onEdgesChange remove)
- **Исходящие** (outgoing edges): аналогично

**Секция "Крафт и условия":**
- **OpenCondition**: список refs с:
  - Colored chip (backgroundColor `${color}20`, borderLeft 3px, boxShadow `${color}40`)
  - Notion link (если есть pageId)
  - **Search button** (лупа) → `highlightNodesByParameter('openCondition', [ref.name])`
- **Ingredients**: список refs с количеством (`×qty`), Notion links, Search buttons
- **UsedStation**: список refs, Notion links, Search buttons

#### highlightNodesByParameter

```tsx
const highlightNodesByParameter = (paramKey, paramValues) => {
  // Находит все ноды с совпадающим значением параметра
  // paramKey: 'openCondition' | 'ingredients' | 'usedStations'
  // Для каждой ноды проверяет refs или string values
  // Собирает matchingNodeIds
  // Находит edges между matching nodes → connectingEdgeIds
  // setConnectedSubgraphHighlight({ nodeIds, edgeIds })
};
```

**Секция "Raw data"**: collapsible `<details>`, JSON всех данных ноды.

**Footer:**
- Copy JSON (Copy icon)
- Delete node (Trash2 icon → confirmation dialog)

---

### FilterBuilder — полная реализация

Компонент для построения правил фильтрации (используется в Sidebar и Toolbar canvas filter).

#### Доступные свойства (18):

| Property | Label |
|----------|-------|
| `act` | Акт |
| `stage` | Стадия |
| `category` | Категория |
| `powerType` | Тип питания |
| `gameStatus` | Статус в игре |
| `designStatus` | Статус дизайна |
| `notionSyncStatus` | Статус Notion |
| `techGameStatus` | Tech Game Status |
| `techForAct` | TechForAct |
| `openCondition` | OpenCondition |
| `openConditionRefs` | OpenCondition (refs) |
| `ingredients` | Ингредиенты |
| `outputItem` | Output Item |
| `usedCraftStation` | UsedCraftStation |
| `usedStation` | UsedStation |
| `itemLootingInAct` | Item Looting in Act |
| `electricCost` | Electric Cost |
| `researchTime` | Research Time |

#### Условия (4):

| Condition | Label | Требует значений |
|-----------|-------|-----------------|
| `is` | содержит | Да (multi-select) |
| `isNot` | не содержит | Да (multi-select) |
| `isEmpty` | пусто | Нет |
| `isNotEmpty` | заполнено | Нет |

#### UI каждого правила:
```
[Property Select] [Condition Select] [Values multi-select] [X remove]
```

- Values: toggle buttons, выбранные первыми
- Searchable properties (`openConditionRefs`, `ingredients`, `usedCraftStation`, `usedStation`): показывают Search input
- **AND logic**: все правила должны выполниться одновременно
- Add rule: кнопка "+ Добавить правило"
- Clear all: "Очистить" (если есть правила)

---

### ImportModal — полная реализация

**2-step процесс:**

**Step 1: Upload**
- Drag-and-drop zone + file input (accept=".csv")
- Парсинг через PapaParse

**Step 2: Column Mapping**
- Auto-detect: Notion Crafts format (проверка наличия TechCraftID, PrevTechs)
- Fuzzy matching: id, name/label, act, stage, category/type, prereq/dependency, NextTechs

```tsx
interface ImportMapping {
  idColumn: string;       // ID / TechCraftID
  labelColumn: string;    // Name / WorkingName
  actColumn: string;      // Act / ActAndStage
  stageColumn: string;    // Stage / ActStage
  categoryColumn: string; // Category / CategoryFromItem
  dependencyColumn: string; // Dependencies / PrevTechs
  nextTechsColumn: string;  // NextTechs
}
```

- 7 select'ов для маппинга колонок
- Кнопка "Импортировать" → `generateGraphFromCSV` → `getLayoutedElements` → store update

---

### ExportModal — полная реализация

5 форматов экспорта (2x2 grid + 1):

| Формат | Функция | Описание |
|--------|---------|----------|
| PNG | `exportToPng()` | Растровое изображение графа |
| SVG | `exportToSvg()` | Векторное изображение |
| CSV | `exportToCsv()` | Таблица нод + рёбер |
| CSV (Notion) | `exportToNotionCsv()` | Формат Notion Crafts |
| Draw.io XML | `exportToDrawIo()` | XML для draw.io |

Каждый формат — карточка-кнопка с иконкой + label + hover animation (`translate-y`, shadow).

---

## 7. Нодовая система (ReactFlow)

### TechNode — кастомная нода

Регистрация:
```tsx
const nodeTypes = useMemo(() => ({ techNode: TechNode }), []);
<ReactFlow nodeTypes={nodeTypes} ... />
```

Каждая нода имеет тип `'techNode'`.

### Визуальные пресеты нод

5 пресетов (файл `.ref/src/utils/nodePresetStyles.ts`):

| Пресет | Описание | border | background | left strip |
|--------|----------|--------|------------|------------|
| `default` | Нейтральная обводка, цветная полоска слева | `panel-border` | `panel-2` | Да (accentColor) |
| `bold` | Жирная обводка + тёмный фон | accentColor | darkenHex(accentColor, 0.28) | Нет |
| `outline` | Только обводка цветом | accentColor | `panel-2` | Нет |
| `minimal` | Нейтральная обводка, без полоски | `panel-border` | `panel-2` | Нет |
| `striped` | Диагональные полосы | accentColor | repeating-linear-gradient | Нет |

```tsx
function getNodePresetStyles(preset, accentColor, borderWidth = 2) {
  // Возвращает { style: CSSProperties, className: string, showLeftStrip: boolean }
  switch (preset) {
    case 'bold':
      return {
        style: { borderWidth, borderStyle: 'solid', borderColor: accentColor,
                 backgroundColor: darkenHex(accentColor, 0.28) },
        className: '',
        showLeftStrip: false,
      };
    case 'outline':
      return {
        style: { borderWidth, borderStyle: 'solid', borderColor: accentColor },
        className: 'bg-panel-2',
        showLeftStrip: false,
      };
    case 'minimal':
      return {
        style: { borderWidth, borderStyle: 'solid' },
        className: 'border-panel-border bg-panel-2',
        showLeftStrip: false,
      };
    case 'striped':
      const darkBg = darkenHex(accentColor, 0.15);
      const darkerStripe = darkenHex(accentColor, 0.28);
      return {
        style: { borderWidth, borderStyle: 'solid', borderColor: accentColor,
                 backgroundImage: `repeating-linear-gradient(-45deg, ${darkBg}, ${darkBg} 4px, ${darkerStripe} 4px, ${darkerStripe} 8px)` },
        className: '',
        showLeftStrip: false,
      };
    case 'default':
    default:
      return {
        style: { borderWidth, borderStyle: 'solid' },
        className: 'bg-panel-2 border-panel-border hover:border-control-hover-border hover:shadow-panel',
        showLeftStrip: true,
      };
  }
}
```

### Цветовой маппинг

```tsx
// 8 вариантов colorBy:
type NodeColorBy = 'category' | 'stage' | 'act' | 'powerType'
  | 'gameStatus' | 'openCondition' | 'ingredients' | 'usedCraftStation';

// Дефолтная палитра:
const DEFAULT_NODE_COLOR_PALETTE = [
  '#6aa2ff', '#a78bfa', '#f59e42', '#34d399',
  '#f472b6', '#fbbf24', '#38bdf8', '#e36f6f',
];

// Логика resolveNodeColor:
// 1. Проверить nodeColorMap[value] — если есть, вернуть
// 2. Проверить notionFieldColors[colorBy][value] — если есть, вернуть
// 3. Захешировать value → индекс в palette
```

### Размеры нод (настраиваемые)

| Параметр | По умолчанию | Описание |
|----------|--------------|----------|
| `nodeMinWidth` | 200px | Минимальная ширина |
| `nodeMaxWidth` | 320px | Максимальная ширина |
| `nodeMinHeight` | 48px | Минимальная высота |
| `nodeBorderWidth` | 2px | Толщина обводки |
| `nodeLeftStripWidth` | 3px | Ширина цветной полоски (default preset) |

### TechNode структура JSX

```tsx
<div className="rounded-[10px] transition-all text-text overflow-hidden flex flex-col"
     style={{ minWidth, maxWidth, minHeight, ...presetStyle }}>
  <Handle type="target" position={Position.Left}
          className="!w-3.5 !h-3.5 !bg-control-border hover:!bg-accent !border-0 !rounded-full" />
  <div className="flex flex-1 min-h-0">
    {showLeftStrip && <div style={{ width: stripWidth, backgroundColor: accentColor }} />}
    <div className="px-4 py-3 min-w-0 flex-1 flex flex-col {alignClasses}">
      {/* Template или label + metadata */}
    </div>
  </div>
  <Handle type="source" position={Position.Right}
          className="!w-3.5 !h-3.5 !bg-control-border hover:!bg-accent !border-0 !rounded-full" />
</div>
```

### Highlight при выделении

```tsx
// Выделенная/подсвеченная нода:
isHighlighted && 'shadow-[0_0_18px_rgba(106,162,255,0.35)]'
isHighlighted && preset === 'default' && '!border-accent'
```

### Template Engine

```tsx
// Шаблон: '%label%\n%act% %stage% | %category%'
// renderTemplate(template, nodeData) → заменяет %key% на nodeData[key]
// Если результат пустой (нет букв/цифр) → показать displayLabel

// Special cases:
// %act% → fallback to techForAct if available
// %ingredients% → format as "name ×qty, name ×qty"
// %recipeDetail% → format ingredients with quantities
// %usedStation%, %usedCraftStationRefs%, %outputItemRef% → format Notion refs
// %tags% → join array with ", "
// Arrays → join(', '), Objects → JSON.stringify
// undefined/null → ''
```

---

### EditableEdge — полная реализация ручных рёбер

Файл: `.ref/src/graph/EditableEdge.tsx`. Используется когда `settings.manualEdgeMode === true`.

#### 4 типа путей (pathType)

| Тип | Описание | Алгоритм |
|-----|----------|----------|
| `bezier` | Кривые Безье | Cubic Bezier с control points = 25% горизонтального offset от соседних точек |
| `straight` | Прямые линии | Линейные сегменты `L x y` между всеми точками |
| `orthogonal` | Прямоугольные | H-first routing (сначала horizontal, потом vertical), нормализация < 0.5px |
| `smoothstep` | Сглажённые прямоугольные | Orthogonal с закруглёнными углами radius = 5, quadratic curves `Q` |

#### Waypoint CRUD

**Добавление:**
- Drag на линии ребра → `handleLineDragStart` → insert waypoint at nearest segment
- Click кнопки "+" (`.editable-edge-add-wp`) → `handleAddWaypoint` → insert at segment midpoint
- Right-click context menu → `ctxAddWaypoint` → insert at nearest segment

**Перемещение:**
- Drag waypoint handle → `handleWpPointerDown`:
  - Smart snapping к source/target handles (threshold = effectiveGridSize)
  - Real-time updates через `updateEdgeWaypoints(id, next, true)`
  - Final update при pointer up: `updateEdgeWaypoints(id, next, false)`

**Удаление:**
- Double-click waypoint → `handleWpDoubleClick` → `removeEdgeWaypoint(id, idx)`
- Right-click waypoint → context menu → `ctxRemoveWaypoint`
- Context menu on edge → `ctxClearWaypoints` (удалить все)

#### Context Menu

На линии ребра:
- "Добавить точку" (add waypoint)
- "Очистить все точки" (disabled если нет waypoints)

На waypoint:
- "Удалить точку" (remove waypoint)

Стилизация: `.edge-context-menu` (см. секцию 4)

#### Визуальные элементы

- Waypoint handles: `.editable-edge-waypoint` (12px circle, accent color, glow)
- Bend handles (orthogonal): `.editable-edge-bend` (10px square, radius 3px)
- Add buttons: `.editable-edge-add-wp` (18px circle, hidden, opacity при hover/select)
- Animated: `.editable-edge-animated` + `stroke-dasharray: 5` + `dashdraw` animation
- Selected glow: `filter: drop-shadow(0 0 4px var(--accent))`

---

### Graph.tsx — canvas конфигурация

#### ReactFlow props

```tsx
<ReactFlow
  nodeTypes={{ techNode: TechNode }}
  edgeTypes={{ editableEdge: EditableEdge }}
  minZoom={0.05}
  maxZoom={2.5}
  elementsSelectable={true}
  snapToGrid={snapEnabled && snapGridSize > 0}
  snapGrid={[snapGridSize, snapGridSize]}
  defaultEdgeOptions={{ type: edgeType, animated: edgeAnimated, style: { strokeWidth } }}
/>
```

#### Background Pattern

```tsx
// Variant mapping: 'dots' → BackgroundVariant.Dots, 'lines' → Lines, 'cross' → Cross
// Pattern color: dark = '#1a1e26', light = '#d7dee8'
// Gap: linked to snap → snapGridSize * 2, or separate bgPatternGap
// Size: bgPatternSize (default 1)
```

#### Canvas Filter Application (processedNodes memo)

```tsx
const processedNodes = useMemo(() => {
  if (!canvasFilter.enabled || !canvasFilter.rules?.length) return nodes;

  if (canvasFilter.hideMode === 'hide') {
    // Полностью убрать несовпавшие ноды
    return nodes.filter(n => nodeMatchesRules(n, canvasFilter.rules));
  }

  // Dim mode: добавить CSS-классы
  return nodes.map(n => ({
    ...n,
    className: nodeMatchesRules(n, canvasFilter.rules)
      ? 'canvas-filter-match'    // brightness(1.15)
      : 'canvas-filter-dim',     // opacity 0.25, brightness 0.6, pointer-events: none
  }));
}, [nodes, canvasFilter]);

// Edges в dim mode:
const processedEdges = useMemo(() => {
  // Если endpoint dim → edge получает 'canvas-filter-dim-edge' (opacity 0.12)
}, [edges, canvasFilter, processedNodes]);
```

#### Edge Highlight Application

```tsx
// При connectedSubgraphHighlight !== null:
// Nodes:
//   - в highlight → data.edgeHighlighted = true (для TechNode shadow)
//   - не в highlight → className: 'edge-highlight-dim'
// Edges:
//   - в highlight → className: 'edge-highlight-match-edge' (accent stroke + glow)
//   - не в highlight → className: 'edge-highlight-dim-edge' (opacity 0.15)
```

#### Key Handlers

```tsx
// Delete/Backspace:
// 1. Если есть selected edges → delete edges
// 2. Иначе если есть selected nodes → delete nodes
// 3. Prevent default
// Не работает когда фокус в input/textarea
```

#### Edge Click

```tsx
// В manual edge mode: select edge для редактирования
// Иначе если highlightConnectedSubgraph:
//   → находит source/target → setConnectedSubgraphHighlight({ nodeIds, edgeIds })
```

---

### FlowMiniMap — полная реализация

Файл: `.ref/src/graph/FlowMiniMap.tsx`

#### Конфигурация

| Параметр | Значение |
|----------|----------|
| Base size | 240 × 180 px |
| Zoom range | 1 – 4 |
| Zoom factor | 1.25 (×/÷ per step) |
| OFFSET_SCALE | 5 |

#### Features

1. **Native MiniMap** (ReactFlow):
   - Pannable, zoomable
   - Цвета нод: `resolveNodeColor()` по nodeColorBy setting
   - Selected: dark `#8cc8ff`, light `#2f5dd0`
   - Mask: dark `rgba(6,10,16,0.45)`, light `rgba(245,247,251,0.6)`
   - Background: dark `#0d1117`, light `#f5f7fb`

2. **Custom Panning** (MMB — средняя кнопка мыши):
   - `handlePanStart` (button === 1) → track delta → `handlePanMove` → `handlePanEnd`
   - State: `pan: {x,y}`, `isPanning`, `panStart`

3. **Center Lock** (Crosshair icon):
   - Кнопка toggle → `centerLocked` state
   - `computeCenteredPan()`: рассчитывает pan для viewport-centered view
   - Автоматически устанавливает miniZoom = 2

4. **Zoom Controls** (+/−):
   - `.minimap-zoom-btn` buttons

5. **Hide/Show**:
   - `.minimap-hide-btn` в углу minimapы
   - `.minimap-show-btn` когда скрыта (40x40, Map icon)

#### CSS custom properties

```css
--minimap-zoom: miniZoom;
--minimap-pan-x: panX px;
--minimap-pan-y: panY px;
```

---

### AxisLockGuide — визуализация axis-lock

Файл: `.ref/src/graph/AxisLockGuide.tsx`

SVG overlay: `position: absolute, pointer-events: none`

```tsx
// Для каждой заблокированной ноды в _dragAxisLock Map:
// lockX → вертикальная линия (x=lockX, y ± 3000)
// lockY → горизонтальная линия (y=lockY, x ± 3000)

// Стилизация линий:
// stroke: var(--accent)
// strokeWidth: 1.5
// strokeDasharray: "6 4"
// opacity: 0.8
```

Рендерится только когда `lines.length > 0`. ViewBox рассчитывается динамически с padding 100px.

---

## 8. Паттерны форм и контролов

### CSS-классы для форм (используются во всех модалках)

```tsx
const inputClass =
  'w-full border border-control-border rounded-control px-2.5 py-1.5 text-sm bg-control-bg text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors';

const labelClass =
  'block text-sm font-medium text-muted mb-2';

const btnPrimary =
  'px-4 py-2 bg-accent text-[#0f141c] rounded-control font-medium hover:bg-accent-hover transition-colors';

const btnSecondary =
  'px-4 py-2 bg-control-bg border border-control-border rounded-control text-text font-medium hover:bg-control-hover-bg hover:border-control-hover-border transition-colors';

const btnDanger =
  'px-4 py-2 bg-danger text-white rounded-control font-medium hover:opacity-90 transition-colors';
```

### Search input

```tsx
<div className="relative">
  <Search size={16}
    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
  <input
    type="text"
    placeholder="Поиск..."
    className="w-full pl-8 pr-2.5 py-1.5 text-sm bg-control-bg border border-control-border
               rounded-control text-text placeholder:text-muted
               focus:outline-none focus:border-accent transition-colors"
    value={searchTerm}
    onChange={e => setSearchTerm(e.target.value)}
  />
</div>
```

### Chip-компонент (Inspector)

```tsx
<div className="flex flex-wrap gap-1.5">
  {items.map(item => (
    <span key={item}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[10px] text-xs
                 border-l-2 border-transparent"
      style={{
        backgroundColor: `${color}30`, // 30% opacity
        borderLeftColor: color,
      }}>
      {item}
    </span>
  ))}
</div>
```

### Toggle switch (checkbox как переключатель)

```tsx
<label className="flex items-center gap-2 cursor-pointer">
  <input type="checkbox" checked={value} onChange={...}
    className="sr-only peer" />
  <div className="w-9 h-5 rounded-full bg-control-border peer-checked:bg-accent
                  relative transition-colors after:content-[''] after:absolute
                  after:top-0.5 after:left-0.5 after:bg-white after:rounded-full
                  after:h-4 after:w-4 after:transition-transform
                  peer-checked:after:translate-x-4" />
  <span className="text-sm text-text">Описание</span>
</label>
```

### Toolbar кнопка

```tsx
<button
  onClick={handler}
  className="icon-btn flex items-center justify-center rounded-control
             text-muted hover:text-text hover:bg-control-hover-bg
             transition-colors border border-transparent
             hover:border-control-hover-border"
  style={{ width: 'var(--tool-btn-size)', height: 'var(--tool-btn-size)' }}
  title="Подсказка"
  aria-label="Описание">
  <Icon size={18} />
</button>
```

### Элемент списка в Sidebar

```tsx
<div
  key={node.id}
  onClick={() => handleNodeClick(node.id)}
  className={clsx(
    'px-3 py-2 rounded-small border cursor-pointer transition-all text-sm',
    node.selected
      ? 'bg-accent/10 border-accent text-text shadow-[0_0_12px_rgba(106,162,255,0.15)]'
      : 'bg-event-item-bg border-event-item-border text-text hover:bg-event-item-hover-bg'
  )}>
  <div className="font-medium truncate">{node.data.label}</div>
  <div className="text-xs text-muted truncate">{subtitle}</div>
</div>
```

---

## 9. State Management (Zustand)

### Создание store

```tsx
import { create } from 'zustand';

export const useStore = create<AppState>((set, get) => ({
  // ... initial state and actions
}));
```

### Структура стейта

```tsx
interface AppState {
  // === Данные графа ===
  nodes: TechNode[];
  edges: TechEdge[];
  meta: ProjectMeta;      // { name, updatedAt, version }
  settings: ProjectSettings;

  // === Файловая система ===
  currentFileName: string | null;
  offlineDirty: boolean;

  // === Canvas filter ===
  canvasFilter: CanvasFilter; // { enabled, rules, hideMode }
  connectorTraversalHighlightEnabled: boolean;
  connectedSubgraphHighlight: { nodeIds: Set<string>; edgeIds: Set<string> } | null;

  // === Drag ===
  _shiftKeyPressed: boolean;
  _dragAxisLock: Map<string, { lockX?: number; lockY?: number }>;
  _nodeDragStartPos: { id: string; x: number; y: number } | null;

  // === UI State ===
  ui: {
    sidebarOpen: boolean;
    inspectorOpen: boolean;
    theme: 'dark' | 'light';
  };

  // === Модалки ===
  modals: {
    import: boolean;
    settings: boolean;
    export: boolean;
    colorMapping: boolean;
    unsavedChanges: boolean;
    saveConfirm: boolean;
  };

  // === History (Undo/Redo) ===
  _history: { past: HistorySnapshot[]; future: HistorySnapshot[] };
  _pushSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // === Actions ===
  setNodes: (nodes) => void;
  setEdges: (edges) => void;
  addNode: (node) => void;
  updateNodeData: (id, data) => void;
  removeNodes: (ids) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  loadProject: (file) => void;
  updateSettings: (settings) => void;
  setTheme: (theme) => void;
  toggleSidebar: () => void;
  toggleInspector: () => void;
  setModalOpen: (modal, isOpen) => void;
  setOfflineDirty: (dirty) => void;
  setShiftKeyPressed: (pressed) => void;
  setCanvasFilter: (filter) => void;
  setConnectedSubgraphHighlight: (highlight) => void;
  ...
}
```

### Undo/Redo

```tsx
const HISTORY_LIMIT = 50;

function cloneSnapshot(nodes, edges): HistorySnapshot {
  return { nodes: structuredClone(nodes), edges: structuredClone(edges) };
}

// _pushSnapshot: перед мутирующим действием сохраняет текущее состояние в past
// undo: pop past → restore → push current to future
// redo: pop future → restore → push current to past
// Флаг _restoringHistory предотвращает дублирование snapshot при onNodesChange/onEdgesChange
```

### Resolver pattern (для async модалок)

```tsx
// Для UnsavedChangesModal:
unsavedChangesResolve: ((proceed: boolean, suppress?: boolean) => void) | null;

// Использование:
state.setUnsavedChangesResolve((proceed, suppress) => {
  if (proceed) {
    // пользователь нажал "Продолжить"
    doAction();
  }
});
state.setModalOpen('unsavedChanges', true);

// В модалке:
const handleProceed = () => {
  unsavedChangesResolve?.(true, suppressChecked);
  setModalOpen('unsavedChanges', false);
};
```

### localStorage keys

| Ключ | Данные |
|------|--------|
| `techtree_theme` | `'dark'` или `'light'` |

---

## 10. UX-паттерны

### Keyboard Shortcuts

| Комбинация | Действие | Условия |
|------------|----------|---------|
| `Ctrl/Cmd + S` | Сохранить проект | Не в модалке, не в инпуте |
| `Ctrl/Cmd + O` | Открыть проект | Проверка unsaved changes |
| `Ctrl/Cmd + Z` | Undo | — |
| `Ctrl/Cmd + Y` или `Ctrl/Cmd + Shift + Z` | Redo | — |
| `Ctrl/Cmd + A` | Выбрать все ноды | С canvas filter — только совпавшие |
| `Escape` | Снять выделение | Ноды и рёбра |
| `Shift` (удержание) | Axis-lock drag mode | Ограничивает перетаскивание по одной оси |

Реализация:
```tsx
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    // 1. Shift tracking
    if (event.key === 'Shift') setShiftKeyPressed(true);

    // 2. Skip if modal open or in input
    const isModalOpen = Object.values(modals).some(v => v);
    const isInInput = event.target instanceof HTMLInputElement
      || event.target instanceof HTMLTextAreaElement
      || event.target instanceof HTMLSelectElement;
    if (isModalOpen || isInInput) return;

    // 3. Layout-independent: use event.code ("KeyS") not event.key ("s")
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? event.metaKey : event.ctrlKey;
    const code = event.code;

    // 4. Handle shortcuts...
  };
  // + handleKeyUp for Shift release
}, [deps]);
```

### Drag & Drop

**Snap to Grid:**
```tsx
// settings.snapEnabled (default true)
// settings.snapGridSize (default 10px)
// При перетаскивании: x = round(x / grid) * grid
```

**Snap to Objects:**
```tsx
// settings.snapToObjects (default false)
// snapPositionToObjects(node, allNodes) → align edges/centers с ближайшими нодами
```

**Axis-Lock (Shift + drag):**
```tsx
// При Shift: drag ограничивается по одной оси (X или Y)
// Определяется по направлению первых 8px движения
// _dragAxisLock Map хранит per-node { lockX?, lockY? }
```

### Canvas Filtering

```tsx
interface CanvasFilter {
  enabled: boolean;
  rules: FilterRule[];
  hideMode: 'dim' | 'hide';
}

// FilterRule: { property, condition, values }
// condition: 'is' | 'isNot' | 'isEmpty' | 'isNotEmpty'

// Применение CSS-классов к нодам:
// match → 'canvas-filter-match' (brightness 1.15)
// no match → 'canvas-filter-dim' (opacity 0.25, brightness 0.6, pointer-events: none)
// или hideMode='hide' → нода не рендерится
```

### Edge Click Highlight (Connected Subgraph)

При клике на коннектор (Handle) ноды:
1. Собирается подграф связанных нод по направлению (source → successors, target → predecessors)
2. Несвязанные ноды получают класс `edge-highlight-dim`
3. Связанные рёбра — `edge-highlight-match-edge`
4. Несвязанные рёбра — `edge-highlight-dim-edge`
5. Настройка `connectorTraversalHighlightEnabled` — рекурсивный обход или только прямые связи

### Theme Switching

```
Dark (default): :root CSS variables
Light: body.theme-light overrides
Toggle: useStore → setTheme → localStorage + body class
```

### Canvas Filter — полный flow

```
FilterBuilder (UI)
  ↓ rules: FilterRule[]
canvasFilter store (Zustand)
  { enabled, rules, hideMode: 'dim' | 'hide' }
  ↓
Graph.tsx → processedNodes (useMemo)
  ↓
hideMode = 'hide':
  nodes.filter(n => nodeMatchesRules(n, rules))   // несовпавшие полностью удаляются
  ↓
hideMode = 'dim':
  nodes.map(n => ({
    ...n,
    className: nodeMatchesRules(n, rules)
      ? 'canvas-filter-match'   → brightness(1.15), transition 0.3s
      : 'canvas-filter-dim'     → opacity 0.25, brightness 0.6, pointer-events: none
  }))
  ↓
processedEdges:
  edges с dim endpoints → 'canvas-filter-dim-edge' (opacity 0.12)
```

nodeMatchesRules: **AND logic** — все правила должны пройти.

Для multi-value properties (openConditionRefs, ingredients):
- Значения извлекаются как массив имён
- `is`: хотя бы одно значение из rule.values совпадает с хотя бы одним из node values
- `isNot`: ни одно не совпадает

### Connected Subgraph Highlight — полный flow

**Trigger 1: Click на Handle (connector) ноды**

```
TechNode.handleConnectorPointerDown(type: 'source' | 'target')
  ↓ (click detection: < 400ms, < 8px movement)
collectConnectorHighlight(startNodeId, type)
  ↓
connectorTraversalHighlightEnabled = false:
  → только прямые соседи (1 level)
  → edgesByTraversalNode.get(startNodeId)
  ↓
connectorTraversalHighlightEnabled = true:
  → BFS/DFS через весь граф по direction
  → Stack-based traversal: visited Set + stack
  ↓
{ nodeIds: Set<string>, edgeIds: Set<string> }
  ↓
setConnectedSubgraphHighlight(ids)
  ↓
Graph.tsx применяет:
  Nodes в highlight:    data.edgeHighlighted = true → shadow-[0_0_18px_rgba(106,162,255,0.35)]
  Nodes вне highlight:  className: 'edge-highlight-dim' → opacity 0.25, brightness 0.6
  Edges в highlight:    className: 'edge-highlight-match-edge' → stroke accent + glow
  Edges вне highlight:  className: 'edge-highlight-dim-edge' → opacity 0.15
```

**Trigger 2: Click на ребро (edge click)**

```
Graph.handleEdgeClick
  → если highlightConnectedSubgraph && !manualEdgeMode:
    → setConnectedSubgraphHighlight({ nodeIds: {source, target}, edgeIds: {edgeId} })
  → если manualEdgeMode:
    → select edge для редактирования waypoints
```

**Trigger 3: Click на связь в Inspector**

```
Inspector → handleSelectEdge(edge)
  → setConnectedSubgraphHighlight({ nodeIds: {source, target}, edgeIds: {edgeId} })
  → fitView на source + target
```

**Сброс highlight:**
- Click на ноду (не на connector) → `clearHighlight()`
- Click на пустое место canvas
- Escape

### Parameter Highlight из Inspector

```
Inspector → chip с Search icon (лупа) рядом с OpenCondition/Ingredients/UsedStation
  ↓
highlightNodesByParameter(paramKey, paramValues)
  ↓
Поиск по всем нодам:
  'openCondition' → проверка openConditionRefs[].name или openCondition.split(',')
  'ingredients'   → проверка ingredients[].name
  'usedStations'  → проверка usedStations[].name
  ↓
matchingNodeIds: Set<string>
  ↓
Рёбра между matching nodes → connectingEdgeIds
  ↓
setConnectedSubgraphHighlight({ nodeIds: matchingNodeIds, edgeIds: connectingEdgeIds })
```

Результат: все ноды с таким же значением параметра подсвечиваются, остальные затемняются.

### Sidebar — поиск, фильтрация, сортировка

```
Sidebar flow:
  searchTerm → filter by label.includes(searchTerm)
  filterRules → FilterBuilder → nodeMatchesRules()
  sortBy: 'name' | 'act' | 'stage' | 'order'
  hideUnconnectedNodes → filter by connectedNodeIds
  ↓
filteredNodes → list render
  ↓
Click на ноду: select + fitView с padding 0.5, duration 300ms
```

### Node Drag — snap, axis-lock, объектное выравнивание

```
onNodeDragStart:
  → pushSnapshot (для undo)
  → записать _nodeDragStartPos

onNodeDrag:
  1. snapToGrid(position, gridSize) — если snapEnabled && gridSize > 0
  2. snapPositionToObjects(node, allNodes, threshold=12) — если snapToObjects
  3. Axis-lock (если Shift pressed):
     → определить ось по первым 8px движения
     → _dragAxisLock.set(nodeId, { lockX or lockY })
     → AxisLockGuide рендерит dashed линию

onNodeDragStop:
  → setOfflineDirty(true)
  → clear _nodeDragStartPos
```

---

## 11. Hooks

### useKeyboardShortcuts

Файл: `.ref/src/hooks/useKeyboardShortcuts.ts`

Регистрирует глобальные `keydown`/`keyup` listener'ы. Обрабатывает:
- Save/Open/Undo/Redo/SelectAll/Escape
- Shift tracking для axis-lock
- Игнорирует ввод при открытых модалках или фокусе в инпуте
- Использует `event.code` (layout-independent)

### useFileSystem

Файл: `.ref/src/hooks/useFileSystem.ts`

Два метода:
- `saveProject(data, forceNew?)` — File System API (`showSaveFilePicker`) → fallback to `file-saver`
- `openProject()` — File System API (`showOpenFilePicker`) → fallback to `<input type="file">`

Хранит `fileHandle` в state для re-save в тот же файл.

---

## 12. Утилиты

### autoLayout.ts — Dagre layout engine

```tsx
import dagre from 'dagre';

// Конфигурация dagre:
// nodesep: 80 (px между нодами по горизонтали)
// ranksep: 120 (px между уровнями)
// Node defaults: width 200, height 70

function getLayoutedElements(nodes, edges, direction: 'LR' | 'RL' | 'TB' | 'BT') {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 80, ranksep: 120 });
  // add nodes with measured or default width/height
  // add edges
  dagre.layout(g);
  // return nodes with new positions + handle positions based on direction
}

// Direction → Handle positions:
// LR: target=Left, source=Right
// RL: target=Right, source=Left
// TB: target=Top, source=Bottom
// BT: target=Bottom, source=Top

function layoutSubgraph(nodes, edges, selectedIds: Set<string>, direction) {
  // 1. Filter nodes & edges to selected subset
  // 2. Call getLayoutedElements on subset
  // 3. Merge new positions back into full node list
  // 4. Return full array
}
```

### orthogonalRouter.ts

L-shaped/orthogonal edge routing для manual edge mode.

```tsx
// Строит path через waypoints с прямыми углами
// H-first routing: сначала horizontal, потом vertical
// Нормализация: если сегмент < 0.5px от оси — выравнивается точно
// Smoothstep: добавляет quadratic curves (Q) на углах с radius = 5
```

### snapToGrid.ts — полный алгоритм

```tsx
function snapToGrid(position, gridSize) {
  if (gridSize <= 0) return { x: Math.round(x), y: Math.round(y) };
  return { x: Math.round(x / gridSize) * gridSize, y: Math.round(y / gridSize) * gridSize };
}

function snapPositionToObjects(node, allNodes, threshold = 12): SnapToObjectsResult {
  // Returns: { x, y, snappedX, snappedY, minDx, minDy }

  // 1. Собрать alignment targets от соседних нод:
  //    X targets: leftEdge, rightEdge, centerX каждой ноды
  //    Y targets: topEdge, bottomEdge, centerY каждой ноды

  // 2. Для текущей ноды создать candidates:
  //    - Direct target (для center alignment)
  //    - target - width (для left-to-right alignment)
  //    - target - width/2 (для center-to-center)

  // 3. Найти closest candidate per axis
  // 4. Snap если distance <= threshold (12px)
}
```

### colorMapping.ts — цветовые алгоритмы

```tsx
function getColorValue(nodeData, colorBy: NodeColorBy): string {
  // Извлекает значение для цветового маппинга:
  // 'category' → data.category
  // 'stage' → String(data.stage)
  // 'act' → String(data.techForAct ?? data.act)
  // 'powerType' → data.powerType
  // 'gameStatus' → data.gameStatus
  // 'openCondition' → data.openCondition
  // 'ingredients' → data.ingredients[0]?.name
  // 'usedCraftStation' → complex fallback: refs → string → joined
  // 'usedStation' → refs → joined
}

function resolveNodeColor(value, colorMap, palette, notionDefaults): string {
  // Приоритет:
  // 1. colorMap[value] — пользовательский override
  // 2. notionDefaults[value] — цвета из Notion API
  // 3. hash(value) → palette[index]
}

// Hash algorithm (Jenkins one-at-a-time variant):
function hashToColor(value: string, colors: string[]): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function darkenHex(hex: string, factor: number): string {
  // Parse hex (#abc or #aabbcc) → RGB
  // Multiply each channel by factor (0-1)
  // Clamp to 0 minimum
  // Return as hex
}

function lightenHex(hex: string, factor: number): string {
  // Blend toward white: rgb + (255 - rgb) * factor
  // factor 0 = unchanged, factor 1 = white
}

function collectUniqueValues(nodes, colorBy): Array<{value, displayLabel, count}> {
  // Собирает уникальные значения, сортирует по частоте (descending)
}

const EMPTY_VALUE_KEY = ''; // для нод без значения
```

### filterUtils.ts — алгоритмы фильтрации

```tsx
function nodeMatchesRules(node, rules: FilterRule[]): boolean {
  if (rules.length === 0) return true;  // no filters = match all
  return rules.every(rule => {          // AND logic
    // Для multi-value properties (openConditionRefs, ingredients):
    //   → matchesAnyValueRule(nodeValues, rule)
    // Для single-value:
    //   → direct comparison
  });
}

function matchesAnyValueRule(nodeValues: string[], rule: FilterRule): boolean {
  // isEmpty: return !hasValues
  // isNotEmpty: return hasValues
  // is: rule.values.some(v => nodeValues.includes(v))
  // isNot: !rule.values.every(v => nodeValues.includes(v))
}

function getPropertyValue(node, property: FilterProperty): string {
  // Special handling:
  // act → techForAct ?? act
  // openConditionRefs → join names with \x00 separator
  // ingredients → join names with \x00
  // usedCraftStation → refs chain
}

function buildUniqueValuesMap(nodes): Record<FilterProperty, string[]> {
  // Для каждого из 18 свойств собирает уникальные значения
}

function getConnectedNodeIds(edges): Set<string> {
  // Все nodeIds которые имеют хотя бы одно ребро
  edges.forEach(e => { set.add(e.source); set.add(e.target); });
}
```

### template.ts — шаблонизатор нод

```tsx
function renderTemplate(template: string, data: Record<string, any>): string {
  // Regex: /%([a-zA-Z0-9_]+)%/g
  // Замена по ключу с special cases:

  // %act% → data.techForAct ?? data.act
  // %usedStation% → formatNotionRefs(data.usedStations)
  // %tags% → data.tags.join(', ')
  // %ingredients% → formatIngredientEntries(data.ingredients) // "name ×qty"
  // %recipeDetail% → formatIngredientEntries(data.recipeDetail)
  // %outputItemRef% → data.outputItemRef?.name
  // %openConditionRefs% → formatNotionRefs(data.openConditionRefs)
  // %usedCraftStationRefs% → formatNotionRefs(data.usedCraftStationRefs)
  // %prevTechRefs%, %nextTechRefs% → formatNotionRefs
  // Default: String(value) or ''
}

function formatNotionRefs(refs: NotionRef[]): string {
  return refs?.map(r => r.name).join(', ') ?? '';
}

function formatIngredientEntries(entries: IngredientEntry[]): string {
  return entries?.map(e => e.qty ? `${e.name} ×${e.qty}` : e.name).join(', ') ?? '';
}
```

### layoutHelpers.ts — 10 функций выравнивания

```tsx
// Все функции принимают (nodes: TechNode[]) → TechNode[]
// Работают только с selected nodes
// Используют getNodeSize(node) для bounds

// === Alignment (6) ===
alignLeft(nodes)              // Все selected → min x
alignRight(nodes)             // Все selected → max x (с учётом width)
alignTop(nodes)               // Все selected → min y
alignBottom(nodes)            // Все selected → max y (с учётом height)
alignCenterHorizontal(nodes)  // Центрирует по x
alignCenterVertical(nodes)    // Центрирует по y

// === Distribution (2) — требует ≥ 3 нод ===
distributeHorizontally(nodes) // Равномерное распределение по x
distributeVertically(nodes)   // Равномерное распределение по y
// Алгоритм: sort by center → step = span / (count - 1) → assign

// === Stacking (2) ===
stackHorizontally(nodes, gap = 40)  // В ряд по горизонтали
stackVertically(nodes, gap = 40)    // В ряд по вертикали
// Sort by center → place adjacent with gap
```

### export.ts — экспорт

```tsx
// PNG: html-to-image → toBlob() → file-saver saveAs
// SVG: html-to-image → toSvg() → Blob → saveAs
// CSV: papaparse.unparse(nodes data) → Blob → saveAs
// CSV (Notion): специальный формат с Notion column names
// Draw.io XML: генерация mxGraphModel XML → Blob → saveAs
// JSON: JSON.stringify(ProjectFile) → Blob → saveAs
```

### csvImport.ts — импорт

```tsx
// Step 1: PapaParse.parse(csvText, { header: true })
// Step 2: Auto-detect Notion Crafts format
//   → проверка наличия TechCraftID, PrevTechs, WorkingName
// Step 3: Fuzzy column matching (fallback):
//   id → contains 'id', label → contains 'name'/'label',
//   act → contains 'act', stage → contains 'stage', etc.
// Step 4: generateGraphFromCSV(data, mapping) → { nodes, edges }
// Step 5: getLayoutedElements → auto-layout
```

### shapeBounds.ts

```tsx
function getNodeBounds(node): { x, y, width, height }
// Использует measured dimensions или fallback:
// width = settings.nodeMinWidth ?? 200
// height = settings.nodeMinHeight ?? 48
// Учитывает min/max width constraints
```

### edgeHitTest.ts

```tsx
// Определяет ближайший сегмент ребра к точке клика
// Используется для вставки waypoint при drag на линии
// Возвращает индекс сегмента и позицию проекции
```

### connectedSubgraph.ts

```tsx
// BFS/DFS обход графа от начальной ноды
// По direction: 'source' (successors) или 'target' (predecessors)
// Сбор всех связанных nodeIds и edgeIds
// Используется в TechNode.collectConnectorHighlight
```

---

## 13. Полные файлы компонентов

### App.tsx — основной лейаут

```tsx
import React, { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useStore } from './store/useStore';
import ErrorBoundary from './components/ErrorBoundary';
import Graph from './graph/Graph';
import Sidebar from './components/Sidebar';
import Inspector from './components/Inspector';
import Toolbar from './components/Toolbar';
import StatusBar from './components/StatusBar';
import FlowMiniMap from './graph/FlowMiniMap';
import SettingsModal from './components/SettingsModal';
import ImportModal from './components/ImportModal';
import ExportModal from './components/ExportModal';
import ColorMappingModal from './components/ColorMappingModal';
import UnsavedChangesModal from './components/UnsavedChangesModal';
import SaveConfirmModal from './components/SaveConfirmModal';
import StartupModal from './components/StartupModal';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';

const CollapseButton: React.FC<{ side: 'left' | 'right' }> = ({ side }) => {
  const { toggleSidebar, toggleInspector } = useStore();
  const isLeft = side === 'left';
  
  return (
    <button
      onClick={isLeft ? toggleSidebar : toggleInspector}
      className={`absolute ${isLeft ? 'left-0' : 'right-0'} top-1/2 -translate-y-1/2 z-50
        flex items-center justify-center w-6 h-12
        bg-panel border-y ${isLeft ? 'border-r' : 'border-l'} border-panel-border rounded-${isLeft ? 'r' : 'l'}-lg shadow-md
        text-muted hover:text-text hover:bg-panel-2 transition-all`}
    >
      {isLeft ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
    </button>
  );
};

const App: React.FC = () => {
  const {
    theme,
    sidebarOpen,
    inspectorOpen,
    setTheme,
  } = useStore();

  useKeyboardShortcuts();

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
    }
  }, [theme]);

  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <div className="relative flex h-screen w-screen overflow-hidden text-text bg-bg transition-all duration-300 ease-in-out">
          {/* Main row */}
          <div className="flex flex-1 min-w-0 min-h-0 relative">
            {/* Workspace — always full width */}
            <div className="workspace flex-1 min-w-0 flex flex-col bg-workspace-bg relative z-0">
              {/* Collapse buttons for hidden panels */}
              {!sidebarOpen && <CollapseButton side="left" />}
              {!inspectorOpen && <CollapseButton side="right" />}
              
              <div className="flex-1 min-h-0 min-w-0 relative">
                <Graph />
              </div>
              
              <StatusBar />
            </div>

            {/* Inspector — absolute overlay, right side */}
            {inspectorOpen && (
              <div className="absolute right-0 top-0 bottom-0 w-80 z-30 flex flex-col min-h-0 shadow-panel"
                   style={{ backgroundColor: 'transparent' }}>
                <Inspector />
              </div>
            )}
          </div>

          {/* Sidebar — absolute, left side */}
          {sidebarOpen && (
            <>
              <div className="sidebar-resizer absolute top-0 bottom-0 z-30 w-2 cursor-col-resize bg-panel-border hover:bg-accent/30"
                   style={{ left: 'var(--sidebar-width)' }} />
              <div className="absolute left-0 top-0 bottom-0 z-20"
                   style={{ width: 'var(--sidebar-width)' }}>
                <Sidebar />
              </div>
            </>
          )}

          {/* Toolbar — absolute top, between sidebar and inspector */}
          <div className="absolute top-0 z-30 transition-[left,right] duration-300 ease-in-out"
               style={{
                 left: sidebarOpen ? 'var(--sidebar-width)' : 0,
                 right: inspectorOpen ? '20rem' : 0,
               }}>
            <Toolbar />
          </div>

          {/* MiniMap — absolute bottom-right */}
          <div className="minimap-overlay"
               style={{
                 right: inspectorOpen ? 'calc(20rem + 16px)' : '16px',
                 bottom: '32px',
               }}>
            <FlowMiniMap />
          </div>
        </div>

        {/* All modals */}
        <SettingsModal />
        <ImportModal />
        <ExportModal />
        <ColorMappingModal />
        <UnsavedChangesModal />
        <SaveConfirmModal />
        <StartupModal />
      </ReactFlowProvider>
    </ErrorBoundary>
  );
};

export default App;
```

### types/index.ts — все типы данных

```tsx
import { Node as ReactFlowNode, Edge as ReactFlowEdge, Position } from '@xyflow/react';

// Базовые типы нод и рёбер
export interface TechNode extends ReactFlowNode<NodeData> {
  id: string;
  type: 'techNode';
  position: { x: number; y: number };
  data: NodeData;
}

export interface TechEdge extends ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  style?: React.CSSProperties;
  data?: EdgeData;
}

export interface EdgeData {
  waypoints?: EdgeWaypoint[];
  pathType?: EdgePathType;
}

export interface EdgeWaypoint {
  x: number;
  y: number;
  id?: string;
}

export type EdgePathType = 'bezier' | 'straight' | 'orthogonal' | 'smoothstep';

// Данные ноды
export interface NodeData {
  label: string;
  act?: string;
  stage?: string;
  category?: string;
  techForAct?: string;
  powerType?: string;
  gameStatus?: string;
  designStatus?: string;
  notionSyncStatus?: string;
  openCondition?: string;
  openConditionRefs?: NotionRef[];
  ingredients?: IngredientEntry[];
  outputItem?: string;
  outputItemRef?: NotionRef;
  usedCraftStation?: string;
  usedCraftStationRefs?: NotionRef[];
  usedStation?: string;
  usedStations?: NotionRef[];
  itemLootingInAct?: string;
  electricCost?: number;
  researchTime?: number;
  formulaIngridients?: string;
  recipeDetail?: IngredientEntry[];
  outputDetail?: string;
  usedStationRefs?: NotionRef[];
  powerType?: string;
  gameStatus?: string;
  designStatus?: string;
  notionSyncStatus?: string;
  techGameStatus?: string;
  techForAct?: string;
  openCondition?: string;
  tags?: string[];
  notes?: string;
  itemCodeName?: string;
  createdAt?: string;
  updatedAt?: string;
  notionPageId?: string;
  techCraftId?: string;
  description?: string;
  // Runtime properties
  edgeHighlighted?: boolean;
}

export interface NotionRef {
  id: string;
  name: string;
  pageId?: string;
}

export interface IngredientEntry {
  name: string;
  qty?: number;
  ref?: NotionRef;
}

// Настройки проекта
export interface ProjectSettings {
  layoutDirection: 'LR' | 'TB';
  hideUnconnectedNodes: boolean;
  theme: 'dark' | 'light';
  glassEffectEnabled: boolean;
  glassEffectModifier: number;
  bgPatternVariant: 'dots' | 'lines' | 'cross';
  bgPatternLinkedToSnap: boolean;
  bgPatternGap: number;
  bgPatternSize: number;
  nodeTemplate: string;
  nodeVisualPreset: NodeVisualPreset;
  nodeMinWidth: number;
  nodeMaxWidth: number;
  nodeMinHeight: number;
  nodeBorderWidth: number;
  nodeLeftStripWidth: number;
  nodeTextAlignH: 'left' | 'center' | 'right';
  nodeTextAlignV: 'top' | 'center' | 'bottom';
  nodeTextFit: boolean;
  nodeColorBy: NodeColorBy;
  nodeColorMap: Record<string, string>;
  edgeType: EdgeType;
  edgeThickness: number;
  edgeAnimated: boolean;
  highlightConnectedSubgraph: boolean;
  manualEdgeMode: boolean;
  snapEnabled: boolean;
  snapGridSize: number;
  snapToObjects: boolean;
  connectorTraversalHighlightEnabled: boolean;
  renderSimplification: boolean;
}

export type NodeVisualPreset = 'default' | 'bold' | 'outline' | 'minimal' | 'striped';
export type NodeColorBy = 'category' | 'stage' | 'act' | 'powerType' | 'gameStatus' | 'openCondition' | 'ingredients' | 'usedCraftStation';
export type EdgeType = 'default' | 'straight' | 'step' | 'smoothstep';

// Фильтрация
export interface CanvasFilter {
  enabled: boolean;
  rules: FilterRule[];
  hideMode: 'dim' | 'hide';
}

export interface FilterRule {
  property: FilterProperty;
  condition: FilterCondition;
  values: string[];
}

export type FilterCondition = 'is' | 'isNot' | 'isEmpty' | 'isNotEmpty';
export type FilterProperty = 
  | 'act' | 'stage' | 'category' | 'powerType' | 'gameStatus' | 'designStatus' 
  | 'notionSyncStatus' | 'techGameStatus' | 'techForAct' | 'openCondition' 
  | 'openConditionRefs' | 'ingredients' | 'outputItem' | 'usedCraftStation' 
  | 'usedStation' | 'itemLootingInAct' | 'electricCost' | 'researchTime';

// Проект
export interface ProjectMeta {
  name: string;
  version: string;
  updatedAt: string;
  createdAt?: string;
}

export interface ProjectFile {
  version: string;
  meta: ProjectMeta;
  settings: ProjectSettings;
  nodes: TechNode[];
  edges: TechEdge[];
}

// Store
export interface HistorySnapshot {
  nodes: TechNode[];
  edges: TechEdge[];
}

// Constants
export const DEFAULT_NODE_COLOR_PALETTE = [
  '#6aa2ff', '#a78bfa', '#f59e42', '#34d399',
  '#f472b6', '#fbbf24', '#38bdf8', '#e36f6f',
];

// Status variants
export const STATUS_VARIANTS: Record<string, string> = {
  'implemented': '#34d399',
  'done': '#34d399',
  'Synchronized': '#34d399',
  'to remove': '#e36f6f',
  'Canceled': '#e36f6f',
  'to update': '#f59e42',
  'proposal': '#6aa2ff',
  'to_do': '#a78bfa',
};
```

### store/useStore.ts — Zustand store

```tsx
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  TechNode, TechEdge, ProjectSettings, ProjectMeta, CanvasFilter, 
  HistorySnapshot, FilterRule, EdgeWaypoint 
} from '../types';
import { 
  OnNodesChange, OnEdgesChange, OnConnect, 
  NodeChange, EdgeChange, Connection 
} from '@xyflow/react';

interface AppState {
  // === Данные графа ===
  nodes: TechNode[];
  edges: TechEdge[];
  meta: ProjectMeta;
  settings: ProjectSettings;

  // === Файловая система ===
  currentFileName: string | null;
  offlineDirty: boolean;

  // === Canvas filter ===
  canvasFilter: CanvasFilter;
  connectorTraversalHighlightEnabled: boolean;
  connectedSubgraphHighlight: { nodeIds: Set<string>; edgeIds: Set<string> } | null;

  // === Drag ===
  _shiftKeyPressed: boolean;
  _dragAxisLock: Map<string, { lockX?: number; lockY?: number }>;
  _nodeDragStartPos: { id: string; x: number; y: number } | null;

  // === UI State ===
  ui: {
    sidebarOpen: boolean;
    inspectorOpen: boolean;
    theme: 'dark' | 'light';
  };

  // === Модалки ===
  modals: {
    import: boolean;
    settings: boolean;
    export: boolean;
    colorMapping: boolean;
    unsavedChanges: boolean;
    saveConfirm: boolean;
    startup: boolean;
  };

  // === History (Undo/Redo) ===
  _history: { past: HistorySnapshot[]; future: HistorySnapshot[] };
  _restoringHistory: boolean;
  _pushSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // === Actions ===
  setNodes: (nodes: TechNode[]) => void;
  setEdges: (edges: TechEdge[]) => void;
  addNode: (node: TechNode) => void;
  updateNodeData: (id: string, data: Partial<TechNode['data']>) => void;
  removeNodes: (ids: string[]) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  
  loadProject: (project: any) => void;
  updateSettings: (settings: Partial<ProjectSettings>) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleSidebar: () => void;
  toggleInspector: () => void;
  setModalOpen: (modal: keyof AppState['modals'], isOpen: boolean) => void;
  setOfflineDirty: (dirty: boolean) => void;
  setShiftKeyPressed: (pressed: boolean) => void;
  setCanvasFilter: (filter: CanvasFilter) => void;
  setConnectedSubgraphHighlight: (highlight: { nodeIds: Set<string>; edgeIds: Set<string> } | null) => void;
  
  // Edge waypoints
  updateEdgeWaypoints: (edgeId: string, waypoints: EdgeWaypoint[], isDragging?: boolean) => void;
  removeEdgeWaypoint: (edgeId: string, index: number) => void;
  
  // Resolver patterns
  unsavedChangesResolve: ((proceed: boolean, suppress?: boolean) => void) | null;
  setUnsavedChangesResolve: (resolve: ((proceed: boolean, suppress?: boolean) => void) | null) => void;
}

const HISTORY_LIMIT = 50;

function cloneSnapshot(nodes: TechNode[], edges: TechEdge[]): HistorySnapshot {
  return { 
    nodes: structuredClone(nodes), 
    edges: structuredClone(edges) 
  };
}

export const useStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    nodes: [],
    edges: [],
    meta: { name: 'Новый проект', version: '1.0.0', updatedAt: new Date().toISOString() },
    settings: {
      layoutDirection: 'LR',
      hideUnconnectedNodes: false,
      theme: 'dark',
      glassEffectEnabled: true,
      glassEffectModifier: 1.2,
      bgPatternVariant: 'dots',
      bgPatternLinkedToSnap: true,
      bgPatternGap: 20,
      bgPatternSize: 1,
      nodeTemplate: '%label%\n%act% %stage% | %category%',
      nodeVisualPreset: 'default',
      nodeMinWidth: 200,
      nodeMaxWidth: 320,
      nodeMinHeight: 48,
      nodeBorderWidth: 2,
      nodeLeftStripWidth: 3,
      nodeTextAlignH: 'left',
      nodeTextAlignV: 'center',
      nodeTextFit: true,
      nodeColorBy: 'category',
      nodeColorMap: {},
      edgeType: 'default',
      edgeThickness: 2,
      edgeAnimated: false,
      highlightConnectedSubgraph: true,
      manualEdgeMode: false,
      snapEnabled: true,
      snapGridSize: 10,
      snapToObjects: false,
      connectorTraversalHighlightEnabled: true,
      renderSimplification: false,
    },
    currentFileName: null,
    offlineDirty: false,
    canvasFilter: { enabled: false, rules: [], hideMode: 'dim' },
    connectorTraversalHighlightEnabled: true,
    connectedSubgraphHighlight: null,
    _shiftKeyPressed: false,
    _dragAxisLock: new Map(),
    _nodeDragStartPos: null,
    ui: {
      sidebarOpen: true,
      inspectorOpen: true,
      theme: 'dark',
    },
    modals: {
      import: false,
      settings: false,
      export: false,
      colorMapping: false,
      unsavedChanges: false,
      saveConfirm: false,
      startup: false,
    },
    _history: { past: [], future: [] },
    _restoringHistory: false,
    unsavedChangesResolve: null,

    // History actions
    _pushSnapshot: () => {
      const { nodes, edges, _history, _restoringHistory } = get();
      if (_restoringHistory) return;
      
      const snapshot = cloneSnapshot(nodes, edges);
      const newPast = [..._history.past.slice(-HISTORY_LIMIT + 1), snapshot];
      
      set(state => ({
        _history: { past: newPast, future: [] }
      }));
    },

    undo: () => {
      const { _history, nodes, edges } = get();
      if (_history.past.length === 0) return;
      
      const previous = _history.past[_history.past.length - 1];
      const newPast = _history.past.slice(0, -1);
      const newFuture = [..._history.future, cloneSnapshot(nodes, edges)];
      
      set(state => ({
        _history: { past: newPast, future: newFuture },
        nodes: previous.nodes,
        edges: previous.edges,
        _restoringHistory: true,
        offlineDirty: true,
      }));
      
      setTimeout(() => set({ _restoringHistory: false }), 0);
    },

    redo: () => {
      const { _history, nodes, edges } = get();
      if (_history.future.length === 0) return;
      
      const next = _history.future[_history.future.length - 1];
      const newFuture = _history.future.slice(0, -1);
      const newPast = [..._history.past, cloneSnapshot(nodes, edges)];
      
      set(state => ({
        _history: { past: newPast, future: newFuture },
        nodes: next.nodes,
        edges: next.edges,
        _restoringHistory: true,
        offlineDirty: true,
      }));
      
      setTimeout(() => set({ _restoringHistory: false }), 0);
    },

    clearHistory: () => set({ _history: { past: [], future: [] } }),

    canUndo: () => get()._history.past.length > 0,
    canRedo: () => get()._history.future.length > 0,

    // Graph actions
    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),

    addNode: (node) => set(state => {
      get()._pushSnapshot();
      return { nodes: [...state.nodes, node], offlineDirty: true };
    }),

    updateNodeData: (id, data) => set(state => {
      get()._pushSnapshot();
      return {
        nodes: state.nodes.map(node =>
          node.id === id ? { ...node, data: { ...node.data, ...data } } : node
        ),
        offlineDirty: true,
      };
    }),

    removeNodes: (ids) => set(state => {
      get()._pushSnapshot();
      const nodeIds = new Set(ids);
      return {
        nodes: state.nodes.filter(n => !nodeIds.has(n.id)),
        edges: state.edges.filter(e => !nodeIds.has(e.source) && !nodeIds.has(e.target)),
        offlineDirty: true,
      };
    }),

    onNodesChange: (changes: NodeChange[]) => {
      const { nodes, onNodesChange } = get();
      get()._pushSnapshot();
      set({ nodes: applyNodeChanges(changes, nodes), offlineDirty: true });
    },

    onEdgesChange: (changes: EdgeChange[]) => {
      const { edges } = get();
      get()._pushSnapshot();
      set({ edges: applyEdgeChanges(changes, edges), offlineDirty: true });
    },

    onConnect: (connection: Connection) => set(state => {
      get()._pushSnapshot();
      const newEdge: TechEdge = {
        id: `edge-${Date.now()}`,
        source: connection.source!,
        target: connection.target!,
        type: state.settings.edgeType,
        animated: state.settings.edgeAnimated,
        style: { strokeWidth: state.settings.edgeThickness },
      };
      return {
        edges: [...state.edges, newEdge],
        offlineDirty: true,
      };
    }),

    loadProject: (project) => set({
      nodes: project.nodes || [],
      edges: project.edges || [],
      meta: project.meta || { name: 'Новый проект', version: '1.0.0', updatedAt: new Date().toISOString() },
      settings: { ...get().settings, ...project.settings },
      offlineDirty: false,
      _history: { past: [], future: [] },
    }),

    updateSettings: (newSettings) => set(state => ({
      settings: { ...state.settings, ...newSettings },
      offlineDirty: true,
    })),

    setTheme: (theme) => {
      localStorage.setItem('techtree_theme', theme);
      set(state => ({
        ui: { ...state.ui, theme },
        settings: { ...state.settings, theme },
      }));
    },

    toggleSidebar: () => set(state => ({
      ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen },
    })),

    toggleInspector: () => set(state => ({
      ui: { ...state.ui, inspectorOpen: !state.ui.inspectorOpen },
    })),

    setModalOpen: (modal, isOpen) => set(state => ({
      modals: { ...state.modals, [modal]: isOpen },
    })),

    setOfflineDirty: (dirty) => set({ offlineDirty: dirty }),

    setShiftKeyPressed: (pressed) => set({ _shiftKeyPressed: pressed }),

    setCanvasFilter: (filter) => set({ canvasFilter: filter }),

    setConnectedSubgraphHighlight: (highlight) => set({ connectedSubgraphHighlight: highlight }),

    updateEdgeWaypoints: (edgeId, waypoints, isDragging = false) => set(state => ({
      edges: state.edges.map(edge =>
        edge.id === edgeId
          ? { ...edge, data: { ...edge.data, waypoints } }
          : edge
      ),
      offlineDirty: !isDragging,
    })),

    removeEdgeWaypoint: (edgeId, index) => set(state => {
      get()._pushSnapshot();
      return {
        edges: state.edges.map(edge => {
          if (edge.id === edgeId && edge.data?.waypoints) {
            const newWaypoints = edge.data.waypoints.filter((_, i) => i !== index);
            return { ...edge, data: { ...edge.data, waypoints: newWaypoints } };
          }
          return edge;
        }),
        offlineDirty: true,
      };
    }),

    setUnsavedChangesResolve: (resolve) => set({ unsavedChangesResolve: resolve }),
  }))
);
```

---

## 14. Полные файлы утилит

### utils/colorMapping.ts

```tsx
import { NodeColorBy, DEFAULT_NODE_COLOR_PALETTE } from '../types';

export function getColorValue(nodeData: any, colorBy: NodeColorBy): string {
  switch (colorBy) {
    case 'category':
      return nodeData.category || '';
    case 'stage':
      return String(nodeData.stage || '');
    case 'act':
      return String(nodeData.techForAct || nodeData.act || '');
    case 'powerType':
      return nodeData.powerType || '';
    case 'gameStatus':
      return nodeData.gameStatus || '';
    case 'openCondition':
      return nodeData.openCondition || '';
    case 'ingredients':
      return nodeData.ingredients?.[0]?.name || '';
    case 'usedCraftStation':
      if (nodeData.usedCraftStationRefs?.length) {
        return nodeData.usedCraftStationRefs.map((r: any) => r.name).join(', ');
      }
      return nodeData.usedCraftStation || '';
    default:
      return '';
  }
}

export function resolveNodeColor(
  value: string,
  colorMap: Record<string, string>,
  palette: string[],
  notionDefaults?: Record<string, string>
): string {
  // 1. Пользовательский override
  if (colorMap[value]) {
    return colorMap[value];
  }
  
  // 2. Notion defaults
  if (notionDefaults?.[value]) {
    return notionDefaults[value];
  }
  
  // 3. Hash в palette
  return hashToColor(value || 'empty', palette);
}

export function hashToColor(value: string, colors: string[]): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function darkenHex(hex: string, factor: number): string {
  // Parse #RGB or #RRGGBB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  const darken = (c: number) => Math.max(0, Math.floor(c * factor));
  
  return `#${darken(r).toString(16).padStart(2, '0')}${darken(g).toString(16).padStart(2, '0')}${darken(b).toString(16).padStart(2, '0')}`;
}

export function lightenHex(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  const lighten = (c: number) => Math.min(255, Math.floor(c + (255 - c) * factor));
  
  return `#${lighten(r).toString(16).padStart(2, '0')}${lighten(g).toString(16).padStart(2, '0')}${lighten(b).toString(16).padStart(2, '0')}`;
}

export function collectUniqueValues(
  nodes: any[],
  colorBy: NodeColorBy
): Array<{ value: string; displayLabel: string; count: number }> {
  const valueCount = new Map<string, number>();
  
  nodes.forEach(node => {
    const value = getColorValue(node.data, colorBy);
    if (value) {
      valueCount.set(value, (valueCount.get(value) || 0) + 1);
    }
  });
  
  return Array.from(valueCount.entries())
    .map(([value, count]) => ({
      value,
      displayLabel: value,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}
```

### utils/template.ts

```tsx
export function renderTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/%([a-zA-Z0-9_]+)%/g, (match, key) => {
    const value = getTemplateValue(data, key);
    return String(value || '');
  });
}

function getTemplateValue(data: Record<string, any>, key: string): any {
  switch (key) {
    case 'act':
      return data.techForAct || data.act || '';
    case 'ingredients':
      return formatIngredientEntries(data.ingredients);
    case 'recipeDetail':
      return formatIngredientEntries(data.recipeDetail);
    case 'usedStation':
    case 'usedCraftStation':
      return formatNotionRefs(data.usedStations || data.usedCraftStationRefs);
    case 'outputItemRef':
      return data.outputItemRef?.name || '';
    case 'openConditionRefs':
      return formatNotionRefs(data.openConditionRefs);
    case 'usedCraftStationRefs':
      return formatNotionRefs(data.usedCraftStationRefs);
    case 'prevTechRefs':
    case 'nextTechRefs':
      return formatNotionRefs(data[key]);
    case 'tags':
      return data.tags?.join(', ') || '';
    default:
      const value = data[key];
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      return value || '';
  }
}

export function formatNotionRefs(refs?: Array<{ name: string }>): string {
  return refs?.map(r => r.name).join(', ') ?? '';
}

export function formatIngredientEntries(entries?: Array<{ name: string; qty?: number }>): string {
  return entries?.map(e => e.qty ? `${e.name} ×${e.qty}` : e.name).join(', ') ?? '';
}
```

### utils/filterUtils.ts

```tsx
import { FilterRule, FilterCondition, FilterProperty } from '../types';

export function nodeMatchesRules(node: any, rules: FilterRule[]): boolean {
  if (rules.length === 0) return true;
  
  return rules.every(rule => {
    const value = getPropertyValue(node, rule.property);
    
    if (rule.condition === 'isEmpty') {
      return !value || (Array.isArray(value) && value.length === 0);
    }
    
    if (rule.condition === 'isNotEmpty') {
      return value && (!Array.isArray(value) || value.length > 0);
    }
    
    if (rule.property === 'openConditionRefs' || 
        rule.property === 'ingredients' || 
        rule.property === 'usedCraftStationRefs') {
      const nodeValues = getNodeValuesArray(node, rule.property);
      return matchesAnyValueRule(nodeValues, rule);
    }
    
    const nodeValue = String(value || '');
    
    if (rule.condition === 'is') {
      return rule.values.includes(nodeValue);
    }
    
    if (rule.condition === 'isNot') {
      return !rule.values.includes(nodeValue);
    }
    
    return true;
  });
}

function matchesAnyValueRule(nodeValues: string[], rule: FilterRule): boolean {
  if (rule.condition === 'isEmpty') {
    return nodeValues.length === 0;
  }
  
  if (rule.condition === 'isNotEmpty') {
    return nodeValues.length > 0;
  }
  
  if (rule.condition === 'is') {
    return rule.values.some(v => nodeValues.includes(v));
  }
  
  if (rule.condition === 'isNot') {
    return !rule.values.every(v => nodeValues.includes(v));
  }
  
  return false;
}

function getPropertyValue(node: any, property: FilterProperty): string {
  switch (property) {
    case 'act':
      return node.techForAct || node.act || '';
    case 'openConditionRefs':
      return node.openConditionRefs?.map((r: any) => r.name).join('\x00') || '';
    case 'ingredients':
      return node.ingredients?.map((r: any) => r.name).join('\x00') || '';
    case 'usedCraftStation':
      if (node.usedCraftStationRefs?.length) {
        return node.usedCraftStationRefs.map((r: any) => r.name).join(', ');
      }
      return node.usedCraftStation || '';
    default:
      return String(node[property] || '');
  }
}

function getNodeValuesArray(node: any, property: FilterProperty): string[] {
  switch (property) {
    case 'openConditionRefs':
      return node.openConditionRefs?.map((r: any) => r.name) || [];
    case 'ingredients':
      return node.ingredients?.map((r: any) => r.name) || [];
    case 'usedCraftStationRefs':
      return node.usedCraftStationRefs?.map((r: any) => r.name) || [];
    default:
      return [];
  }
}

export function buildUniqueValuesMap(nodes: any[]): Record<FilterProperty, string[]> {
  const map: Record<string, Set<string>> = {};
  
  const properties: FilterProperty[] = [
    'act', 'stage', 'category', 'powerType', 'gameStatus', 'designStatus',
    'notionSyncStatus', 'techGameStatus', 'techForAct', 'openCondition',
    'openConditionRefs', 'ingredients', 'outputItem', 'usedCraftStation',
    'usedStation', 'itemLootingInAct', 'electricCost', 'researchTime'
  ];
  
  properties.forEach(prop => {
    map[prop] = new Set();
  });
  
  nodes.forEach(node => {
    properties.forEach(prop => {
      const value = getPropertyValue(node, prop);
      if (prop === 'openConditionRefs' || prop === 'ingredients' || prop === 'usedCraftStationRefs') {
        const values = getNodeValuesArray(node, prop);
        values.forEach(v => map[prop].add(v));
      } else if (value) {
        map[prop].add(value);
      }
    });
  });
  
  const result: Record<FilterProperty, string[]> = {} as any;
  properties.forEach(prop => {
    result[prop] = Array.from(map[prop]).sort();
  });
  
  return result;
}

export function getConnectedNodeIds(edges: any[]): Set<string> {
  const connectedIds = new Set<string>();
  edges.forEach(edge => {
    connectedIds.add(edge.source);
    connectedIds.add(edge.target);
  });
  return connectedIds;
}
```

### utils/autoLayout.ts

```tsx
import dagre from 'dagre';
import { TechNode, TechEdge } from '../types';
import { Position } from '@xyflow/react';

export function getLayoutedElements(
  nodes: TechNode[],
  edges: TechEdge[],
  direction: 'LR' | 'RL' | 'TB' | 'BT'
): { nodes: TechNode[]; edges: TechEdge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ 
    rankdir: direction, 
    nodesep: 80, 
    ranksep: 120,
    marginx: 50,
    marginy: 50,
  });

  // Add nodes
  nodes.forEach(node => {
    g.setNode(node.id, {
      width: node.width || 200,
      height: node.height || 70,
    });
  });

  // Add edges
  edges.forEach(edge => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  // Update node positions
  const layoutedNodes = nodes.map(node => {
    const nodeWithPosition = g.node(node.id);
    const newNode = {
      ...node,
      position: {
        x: nodeWithPosition.x - (node.width || 200) / 2,
        y: nodeWithPosition.y - (node.height || 70) / 2,
      },
    };

    // Update handle positions based on direction
    switch (direction) {
      case 'LR':
        newNode.targetPosition = Position.Left;
        newNode.sourcePosition = Position.Right;
        break;
      case 'RL':
        newNode.targetPosition = Position.Right;
        newNode.sourcePosition = Position.Left;
        break;
      case 'TB':
        newNode.targetPosition = Position.Top;
        newNode.sourcePosition = Position.Bottom;
        break;
      case 'BT':
        newNode.targetPosition = Position.Bottom;
        newNode.sourcePosition = Position.Top;
        break;
    }

    return newNode;
  });

  return { nodes: layoutedNodes, edges };
}

export function layoutSubgraph(
  nodes: TechNode[],
  edges: TechEdge[],
  selectedIds: Set<string>,
  direction: 'LR' | 'TB'
): TechNode[] {
  const selectedNodeIds = new Set(selectedIds);
  
  // Filter to selected subset
  const selectedNodes = nodes.filter(n => selectedNodeIds.has(n.id));
  const selectedEdges = edges.filter(e => 
    selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
  );

  if (selectedNodes.length === 0) return nodes;

  // Layout the subset
  const { nodes: layoutedSubset } = getLayoutedElements(selectedNodes, selectedEdges, direction);

  // Create position map
  const positionMap = new Map<string, { x: number; y: number }>();
  layoutedSubset.forEach(node => {
    positionMap.set(node.id, node.position);
  });

  // Apply new positions to original nodes
  return nodes.map(node => {
    if (positionMap.has(node.id)) {
      return {
        ...node,
        position: positionMap.get(node.id)!,
      };
    }
    return node;
  });
}
```

### utils/snapToGrid.ts

```tsx
export function snapToGrid(position: { x: number; y: number }, gridSize: number): { x: number; y: number } {
  if (gridSize <= 0) {
    return { x: Math.round(position.x), y: Math.round(position.y) };
  }
  
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize,
  };
}

export interface SnapToObjectsResult {
  x: number;
  y: number;
  snappedX: boolean;
  snappedY: boolean;
  minDx: number;
  minDy: number;
}

export function snapPositionToObjects(
  node: any,
  allNodes: any[],
  threshold: number = 12
): SnapToObjectsResult {
  const nodeWidth = node.width || 200;
  const nodeHeight = node.height || 70;
  const nodeCenterX = node.position.x + nodeWidth / 2;
  const nodeCenterY = node.position.y + nodeHeight / 2;

  // Collect alignment targets from other nodes
  const targets = {
    x: [] as number[],
    y: [] as number[],
  };

  allNodes.forEach(otherNode => {
    if (otherNode.id === node.id) return;
    
    const otherWidth = otherNode.width || 200;
    const otherHeight = otherNode.height || 70;
    const otherX = otherNode.position.x;
    const otherY = otherNode.position.y;
    const otherCenterX = otherX + otherWidth / 2;
    const otherCenterY = otherY + otherHeight / 2;

    // X targets: left edge, right edge, center
    targets.x.push(otherX, otherX + otherWidth, otherCenterX);
    
    // Y targets: top edge, bottom edge, center
    targets.y.push(otherY, otherY + otherHeight, otherCenterY);
  });

  // Generate candidates for current node
  const candidates = {
    x: [
      ...targets.x,
      ...targets.x.map(t => t - nodeWidth), // left-to-right alignment
      ...targets.x.map(t => t - nodeWidth / 2), // center-to-center alignment
    ],
    y: [
      ...targets.y,
      ...targets.y.map(t => t - nodeHeight), // top-to-bottom alignment
      ...targets.y.map(t => t - nodeHeight / 2), // center-to-center alignment
    ],
  };

  // Find closest candidates
  let minDx = Infinity;
  let minDy = Infinity;
  let snappedX = false;
  let snappedY = false;
  let finalX = node.position.x;
  let finalY = node.position.y;

  candidates.x.forEach(candidateX => {
    const dx = Math.abs(candidateX - node.position.x);
    if (dx < minDx && dx <= threshold) {
      minDx = dx;
      finalX = candidateX;
      snappedX = true;
    }
  });

  candidates.y.forEach(candidateY => {
    const dy = Math.abs(candidateY - node.position.y);
    if (dy < minDy && dy <= threshold) {
      minDy = dy;
      finalY = candidateY;
      snappedY = true;
    }
  });

  return {
    x: finalX,
    y: finalY,
    snappedX,
    snappedY,
    minDx: minDx === Infinity ? 0 : minDx,
    minDy: minDy === Infinity ? 0 : minDy,
  };
}
```

---

## 15. Пошаговая инструкция переноса

### Шаг 1: Создать проект

```bash
npm create vite@latest my-project -- --template react-ts
cd my-project
```

### Шаг 2: Установить зависимости

```bash
npm install @xyflow/react zustand clsx tailwind-merge lucide-react dagre file-saver html-to-image jszip papaparse
npm install -D tailwindcss postcss autoprefixer @types/dagre @types/file-saver @types/papaparse
npx tailwindcss init -p
```

### Шаг 3: Скопировать конфигурации

1. Заменить `tailwind.config.js` содержимым из секции 2
2. Заменить `postcss.config.js` содержимым из секции 2
3. Обновить `tsconfig.json` — добавить paths alias `@/*`
4. Обновить `vite.config.ts` — добавить `resolve.alias`

### Шаг 4: Перенести дизайн-систему

1. Заменить содержимое `src/index.css` (см. `.ref/src/index.css`):
   - `@tailwind` директивы
   - Google Fonts import
   - `:root` CSS variables (Dark theme)
   - `body.theme-light` CSS variables (Light theme)
   - Базовые стили (html/body, h1-h3)

2. Добавить глобальные стили (секция 4):
   - Scrollbar стилизация
   - ReactFlow overrides
   - Checkbox/select/button стили
   - Canvas filter/highlight классы
   - Waypoint/edge стили
   - Context menu стили

### Шаг 5: Создать типы

Файл `src/types/index.ts` (см. `.ref/src/types/index.ts`):
- `Position`, `TechNode`, `TechEdge`, `EdgeWaypoint`
- `NodeData` (свойства нод — адаптировать под ваш домен)
- `ProjectSettings` (все настраиваемые параметры)
- `ProjectMeta`, `ProjectFile`
- `CanvasFilter`, `FilterRule`, `FilterCondition`, `FilterProperty`
- `NodeColorBy`, `NodeVisualPreset`, `EdgeType`
- `DEFAULT_NODE_COLOR_PALETTE`

### Шаг 6: Создать Zustand store

Файл `src/store/useStore.ts` (см. `.ref/src/store/useStore.ts`):
1. Определить `AppState` interface (секция 9)
2. Реализовать `create<AppState>()` с:
   - Данные графа (nodes, edges, meta, settings)
   - UI state (sidebar, inspector, theme)
   - Modal state
   - History (undo/redo, limit 50)
   - ReactFlow handlers (onNodesChange, onEdgesChange, onConnect)
   - Actions (add/remove/update nodes, loadProject, etc.)

### Шаг 7: Создать лейаут

Файл `src/App.tsx` (см. `.ref/src/App.tsx`):
1. `ReactFlowProvider` wrapper
2. Flex layout: Sidebar (absolute left) → Workspace (flex-1) → Inspector (absolute right)
3. Toolbar (absolute top)
4. StatusBar (bottom of workspace)
5. MiniMap overlay (absolute bottom-right)
6. Collapse/expand кнопки
7. Theme effect
8. Модалки рендерятся на верхнем уровне

### Шаг 8: Перенести компоненты

Порядок переноса (от базовых к зависимым):

1. **ErrorBoundary** — оборачивает всё
2. **Graph** + **TechNode** + **EditableEdge** — ядро визуализации
3. **FlowMiniMap** + **AxisLockGuide** — навигация
4. **Sidebar** — список нод с glass-эффектом
5. **Inspector** — свойства нод с glass-эффектом
6. **Toolbar** — инструменты
7. **StatusBar** — статус
8. **FilterBuilder** — фильтры
9. **NodePreview** — превью нод
10. Модалки: Settings → ColorMapping → Import → Export → SaveConfirm → UnsavedChanges → Startup

### Шаг 9: Перенести hooks и утилиты

Hooks:
1. `useKeyboardShortcuts` — горячие клавиши
2. `useFileSystem` — File System API + fallback

Утилиты (порядок по зависимостям):
1. `colorMapping.ts` — цвета
2. `nodePresetStyles.ts` — пресеты нод
3. `template.ts` — шаблонизатор
4. `filterUtils.ts` — фильтрация
5. `snapToGrid.ts` — snap
6. `autoLayout.ts` — dagre layout
7. `orthogonalRouter.ts` + `orthogonalNormalize.ts` — routing
8. `shapeBounds.ts` — bounds
9. `edgeHitTest.ts` — hit test
10. `connectedSubgraph.ts` — обход графа
11. `csvImport.ts` — импорт
12. `export.ts` — экспорт
13. `layoutHelpers.ts` — align/distribute

### Шаг 10: Проверка

1. **Тема**: переключить Dark/Light — все цвета должны измениться
2. **Glass-эффект**: Sidebar и Inspector должны иметь blur
3. **Ноды**: проверить все 5 пресетов
4. **Цвета нод**: проверить colorBy + палитру
5. **Shortcuts**: Ctrl+S, Ctrl+Z, Ctrl+A, Escape
6. **Snap**: drag ноды с snap to grid и snap to objects
7. **Axis-lock**: Shift + drag
8. **Canvas filter**: включить фильтр → dim/match классы
9. **Edge highlight**: клик на коннектор → подсветка подграфа
10. **Модалки**: открыть каждую → проверить стили
11. **Minimap**: зум, pan, center, hide/show
12. **Undo/Redo**: несколько действий → Ctrl+Z → Ctrl+Y
13. **Import CSV**: загрузить CSV → маппинг → применить
14. **Export**: PNG, SVG, CSV — проверить
15. **File System**: Save/Open через File System API

---

## Приложение: Иконки (lucide-react)

Используемые иконки в проекте:

| Иконка | Компонент | Использование |
|--------|-----------|---------------|
| `ChevronLeft` / `ChevronRight` | App, Sidebar | Collapse/expand панелей |
| `Search` | Sidebar | Поиск нод |
| `Filter` | Sidebar, Toolbar | Фильтры |
| `Plus` / `Minus` | Toolbar | Добавить ноду, зум |
| `Save` | Toolbar | Сохранить |
| `FolderOpen` | Toolbar | Открыть |
| `Upload` / `Download` | Toolbar | Импорт/Экспорт |
| `Layout` | Toolbar | Auto-layout |
| `Undo` / `Redo` | Toolbar | История |
| `Settings` | Toolbar | Настройки |
| `Palette` | Toolbar | Цветовой маппинг |
| `Spline` | Toolbar | Тип рёбер |
| `PenTool` | Toolbar | Manual edge mode |
| `Grid3X3` | Toolbar | Snap settings |
| `Eye` | Toolbar | Visibility |
| `AlignLeft` / `AlignRight` | Toolbar | Выравнивание |
| `AlignStartVertical` / `AlignEndVertical` | Toolbar | Выравнивание |
| `AlignCenterHorizontal` / `AlignCenterVertical` | Toolbar | Выравнивание |
| `ArrowLeftRight` / `ArrowUpDown` | Toolbar | Распределение |
| `RefreshCw` | Toolbar | Sync |
| `AlertCircle` | Toolbar | Ошибка |
| `Pause` | Toolbar | Пауза sync |
| `X` | Модалки | Закрыть |
| `Map` | App | Показать минимапу |
| `FileJson` | Toolbar | JSON |
| `Link` | Toolbar | Связи |
| `CornerDownRight` | Toolbar | Edge direction |
| `ChevronDown` | Toolbar | Dropdown |

---

## 16. Адаптация под другой домен

### 16.1. Изменение типов данных (NodeData)

**Файл:** `.ref/src/types/index.ts`

Текущая структура `NodeData` специфична для TechTree (крафты, технологии). Для адаптации под другой домен:

#### Пример 1: Адаптация для Task Management системы

```typescript
export interface NodeData {
  // Базовые поля (оставить)
  id: string;
  label: string;
  
  // Заменить domain-specific поля:
  // Было: category, stage, act, powerType, gameStatus
  // Стало:
  status: 'todo' | 'in-progress' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  dueDate?: string;
  tags?: string[];
  estimatedHours?: number;
  actualHours?: number;
  
  // Удалить TechTree-специфичные поля:
  // ingredients, recipeDetail, outputItemRef, usedCraftStation, etc.
}
```

#### Пример 2: Адаптация для Knowledge Graph

```typescript
export interface NodeData {
  id: string;
  label: string;
  
  // Knowledge Graph поля:
  type: 'concept' | 'person' | 'event' | 'document' | 'organization';
  description?: string;
  url?: string;
  createdDate?: string;
  lastModified?: string;
  author?: string;
  references?: Array<{ id: string; name: string }>;
  keywords?: string[];
  confidence?: number; // 0-1
}
```

#### Пример 3: Адаптация для Process Flow

```typescript
export interface NodeData {
  id: string;
  label: string;
  
  // Process Flow поля:
  processType: 'start' | 'task' | 'decision' | 'end' | 'subprocess';
  department?: string;
  role?: string;
  duration?: number; // minutes
  cost?: number;
  automationLevel?: 'manual' | 'semi-auto' | 'automated';
  sla?: number; // hours
  riskLevel?: 'low' | 'medium' | 'high';
}
```

### 16.2. Обновление шаблонов (template.ts)

**Файл:** `.ref/src/utils/template.ts`

После изменения `NodeData`, обновите функцию `renderTemplate`:

```typescript
// Удалить TechTree-специфичные обработчики:
// - %act%, %usedStation%, %ingredients%, %recipeDetail%
// - %outputItemRef%, %openConditionRefs%, %usedCraftStationRefs%

// Добавить новые для вашего домена:
function renderTemplate(template: string, data: NodeData): string {
  return template.replace(/%([a-zA-Z0-9_]+)%/g, (match, key) => {
    // Пример для Task Management:
    if (key === 'assignee') return data.assignee || 'Unassigned';
    if (key === 'dueDate') return data.dueDate ? formatDate(data.dueDate) : 'No deadline';
    if (key === 'tags') return data.tags?.join(', ') || '';
    if (key === 'estimatedHours') return data.estimatedHours ? `${data.estimatedHours}h` : '';
    
    // Пример для Knowledge Graph:
    if (key === 'references') {
      return data.references?.map(r => r.name).join(', ') || '';
    }
    if (key === 'keywords') return data.keywords?.join(', ') || '';
    
    // Базовая обработка
    const value = data[key as keyof NodeData];
    if (value === undefined || value === null) return '';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  });
}
```

### 16.3. Настройка цветового маппинга (colorMapping.ts)

**Файл:** `.ref/src/utils/colorMapping.ts`

Обновите `getColorValue` для новых свойств:

```typescript
function getColorValue(nodeData: NodeData, colorBy: NodeColorBy): string {
  // Удалить TechTree-специфичные case'ы
  
  // Task Management:
  if (colorBy === 'status') return nodeData.status || '';
  if (colorBy === 'priority') return nodeData.priority || '';
  if (colorBy === 'assignee') return nodeData.assignee || '';
  
  // Knowledge Graph:
  if (colorBy === 'type') return nodeData.type || '';
  if (colorBy === 'author') return nodeData.author || '';
  
  // Process Flow:
  if (colorBy === 'processType') return nodeData.processType || '';
  if (colorBy === 'department') return nodeData.department || '';
  if (colorBy === 'riskLevel') return nodeData.riskLevel || '';
  
  return '';
}

// Обновите тип NodeColorBy в types/index.ts:
export type NodeColorBy = 
  | 'none'
  | 'status'      // Task Management
  | 'priority'    // Task Management
  | 'assignee'    // Task Management
  | 'type'        // Knowledge Graph
  | 'department'  // Process Flow
  | 'riskLevel';  // Process Flow
```

### 16.4. Адаптация фильтров (filterUtils.ts)

**Файл:** `.ref/src/utils/filterUtils.ts`

Обновите `FilterProperty` и `getPropertyValue`:

```typescript
// В types/index.ts:
export type FilterProperty = 
  | 'label'
  | 'status'      // Task Management
  | 'priority'    // Task Management
  | 'assignee'    // Task Management
  | 'tags'        // Task Management / Knowledge Graph
  | 'type'        // Knowledge Graph / Process Flow
  | 'department'  // Process Flow
  | 'riskLevel';  // Process Flow

// В filterUtils.ts:
function getPropertyValue(node: TechNode, property: FilterProperty): string | string[] {
  const data = node.data;
  
  // Multi-value properties (для массивов):
  if (property === 'tags') return data.tags || [];
  if (property === 'references') return data.references?.map(r => r.name) || [];
  
  // Single-value properties:
  if (property === 'status') return data.status || '';
  if (property === 'priority') return data.priority || '';
  if (property === 'assignee') return data.assignee || '';
  if (property === 'type') return data.type || '';
  if (property === 'department') return data.department || '';
  
  return '';
}
```

### 16.5. Обновление CSV импорта (csvImport.ts)

**Файл:** `.ref/src/utils/csvImport.ts`

Измените автоматическое определение колонок:

```typescript
function detectColumnMapping(headers: string[]): Partial<CSVColumnMapping> {
  const mapping: Partial<CSVColumnMapping> = {};
  
  headers.forEach((header, index) => {
    const lower = header.toLowerCase();
    
    // Базовые поля (универсальные):
    if (lower.includes('id')) mapping.id = index;
    if (lower.includes('name') || lower.includes('label') || lower.includes('title')) {
      mapping.label = index;
    }
    
    // Task Management:
    if (lower.includes('status')) mapping.status = index;
    if (lower.includes('priority')) mapping.priority = index;
    if (lower.includes('assignee') || lower.includes('owner')) mapping.assignee = index;
    if (lower.includes('due') || lower.includes('deadline')) mapping.dueDate = index;
    if (lower.includes('tag')) mapping.tags = index;
    
    // Knowledge Graph:
    if (lower.includes('type') || lower.includes('category')) mapping.type = index;
    if (lower.includes('author') || lower.includes('creator')) mapping.author = index;
    if (lower.includes('keyword')) mapping.keywords = index;
    
    // Process Flow:
    if (lower.includes('department') || lower.includes('dept')) mapping.department = index;
    if (lower.includes('role')) mapping.role = index;
    if (lower.includes('duration')) mapping.duration = index;
  });
  
  return mapping;
}
```

### 16.6. Настройка дефолтных шаблонов

**Файл:** `.ref/src/store/useStore.ts`

Обновите дефолтный шаблон в `ProjectSettings`:

```typescript
// Task Management шаблон:
const defaultTemplate = `%label%
Status: %status%
Priority: %priority%
Assignee: %assignee%`;

// Knowledge Graph шаблон:
const defaultTemplate = `%label%
Type: %type%
Keywords: %keywords%`;

// Process Flow шаблон:
const defaultTemplate = `%label%
Type: %processType%
Duration: %duration%min
Department: %department%`;
```

### 16.7. Обновление Inspector панели

**Файл:** `.ref/src/components/Inspector.tsx`

Замените форм-поля на релевантные для вашего домена:

```typescript
// Удалить TechTree-специфичные поля:
// - Category, Stage, Act, Power Type, Game Status
// - Ingredients, Recipe Detail, Output Item
// - Used Craft Station, Open Conditions

// Добавить новые поля (пример для Task Management):
<div className="form-group">
  <label>Status</label>
  <select value={selectedNode.data.status} onChange={handleStatusChange}>
    <option value="todo">To Do</option>
    <option value="in-progress">In Progress</option>
    <option value="done">Done</option>
    <option value="blocked">Blocked</option>
  </select>
</div>

<div className="form-group">
  <label>Priority</label>
  <select value={selectedNode.data.priority} onChange={handlePriorityChange}>
    <option value="low">Low</option>
    <option value="medium">Medium</option>
    <option value="high">High</option>
    <option value="critical">Critical</option>
  </select>
</div>

<div className="form-group">
  <label>Assignee</label>
  <input 
    type="text" 
    value={selectedNode.data.assignee || ''} 
    onChange={handleAssigneeChange}
    placeholder="Enter assignee name"
  />
</div>

<div className="form-group">
  <label>Due Date</label>
  <input 
    type="date" 
    value={selectedNode.data.dueDate || ''} 
    onChange={handleDueDateChange}
  />
</div>

<div className="form-group">
  <label>Tags</label>
  <input 
    type="text" 
    value={selectedNode.data.tags?.join(', ') || ''} 
    onChange={handleTagsChange}
    placeholder="Comma-separated tags"
  />
</div>
```

### 16.8. Обновление Settings Modal

**Файл:** `.ref/src/components/SettingsModal.tsx`

В вкладке "Visuals" обновите опции для `colorBy`:

```typescript
<select value={settings.colorBy} onChange={handleColorByChange}>
  <option value="none">None</option>
  {/* Task Management */}
  <option value="status">Status</option>
  <option value="priority">Priority</option>
  <option value="assignee">Assignee</option>
  {/* Knowledge Graph */}
  <option value="type">Type</option>
  <option value="author">Author</option>
  {/* Process Flow */}
  <option value="department">Department</option>
  <option value="riskLevel">Risk Level</option>
</select>
```

### 16.9. Обновление FilterBuilder

**Файл:** `.ref/src/components/FilterBuilder.tsx`

Обновите список доступных свойств для фильтрации:

```typescript
const FILTER_PROPERTIES: Array<{ value: FilterProperty; label: string }> = [
  { value: 'label', label: 'Label' },
  // Task Management:
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'tags', label: 'Tags' },
  // Knowledge Graph:
  { value: 'type', label: 'Type' },
  { value: 'author', label: 'Author' },
  { value: 'keywords', label: 'Keywords' },
  // Process Flow:
  { value: 'department', label: 'Department' },
  { value: 'processType', label: 'Process Type' },
  { value: 'riskLevel', label: 'Risk Level' },
];
```

---

## 17. Частые проблемы и решения (Troubleshooting)

### 17.1. Проблемы с зависимостями

#### Ошибка: "Module not found: @xyflow/react"

**Причина:** Не установлены зависимости или неправильная версия.

**Решение:**
```bash
# Удалить node_modules и package-lock.json
rm -rf node_modules package-lock.json

# Переустановить зависимости
npm install

# Проверить версию
npm list @xyflow/react
```

#### Ошибка: "Cannot find module 'dagre'"

**Причина:** Отсутствует пакет dagre или его типы.

**Решение:**
```bash
npm install dagre @types/dagre
```

### 17.2. Проблемы с TypeScript

#### Ошибка: "Cannot find name 'TechNode'"

**Причина:** Не импортирован тип или неправильный путь.

**Решение:**
```typescript
// Проверить импорт в начале файла:
import type { TechNode, TechEdge, NodeData } from '@/types';

// Проверить alias в tsconfig.json:
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./.ref/src/*"]  // или ["./src/*"] в новом проекте
    }
  }
}

// Проверить alias в vite.config.ts:
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

#### Ошибка: "Property 'X' does not exist on type 'NodeData'"

**Причина:** Добавили новое поле в NodeData, но TypeScript не видит его.

**Решение:**
```typescript
// 1. Обновить интерфейс в types/index.ts:
export interface NodeData {
  // ... существующие поля
  newField?: string;  // добавить новое поле
}

// 2. Перезапустить TypeScript server в VSCode:
// Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

### 17.3. Проблемы с ReactFlow

#### Ноды не отображаются

**Причина:** Не зарегистрированы nodeTypes или неправильный тип ноды.

**Решение:**
```typescript
// В Graph.tsx проверить:
const nodeTypes = useMemo(() => ({ techNode: TechNode }), []);

// В ReactFlow:
<ReactFlow nodeTypes={nodeTypes} ... />

// Проверить что все ноды имеют type: 'techNode':
const nodes = useStore(s => s.nodes);
console.log(nodes.map(n => ({ id: n.id, type: n.type })));
```

#### Рёбра не соединяются

**Причина:** Неправильные source/target handles или отсутствуют handles.

**Решение:**
```typescript
// В TechNode.tsx проверить наличие Handle компонентов:
<Handle type="target" position={Position.Left} id="target" />
<Handle type="source" position={Position.Right} id="source" />

// Проверить что edges имеют правильные source/target:
console.log(edges.map(e => ({ 
  id: e.id, 
  source: e.source, 
  target: e.target 
})));
```

#### Minimap не показывает ноды

**Причина:** Ноды находятся за пределами viewport или неправильный zoom.

**Решение:**
```typescript
// В FlowMiniMap.tsx проверить nodeColor:
<MiniMap 
  nodeColor={(node) => {
    const color = getNodeAccentColor(node);
    return color || 'var(--accent)';
  }}
/>

// Попробовать fitView при загрузке:
useEffect(() => {
  if (nodes.length > 0) {
    reactFlowInstance?.fitView({ padding: 0.2 });
  }
}, [nodes, reactFlowInstance]);
```

### 17.4. Проблемы со стилями

#### Glass-эффект не работает

**Причина:** Отсутствует backdrop-filter или неправильный CSS.

**Решение:**
```css
/* Проверить в index.css: */
.sidebar, .inspector {
  background: var(--panel-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px); /* для Safari */
}

/* Проверить CSS-переменную: */
:root {
  --panel-glass: rgba(30, 33, 42, 0.85);
}
```

#### Темная/светлая тема не переключается

**Причина:** Не применяется класс к body или неправильные CSS-переменные.

**Решение:**
```typescript
// В App.tsx проверить useEffect:
useEffect(() => {
  document.body.className = theme === 'light' ? 'theme-light' : '';
}, [theme]);

// Проверить CSS в index.css:
body.theme-light {
  --bg: #f5f7fa;
  --panel: #ffffff;
  --text: #1a1d24;
  /* ... остальные переменные */
}
```

#### Кастомные цвета нод не применяются

**Причина:** Неправильный порядок приоритета в colorMapping или отсутствует палитра.

**Решение:**
```typescript
// Проверить в colorMapping.ts:
function resolveNodeColor(value, colorMap, palette, notionDefaults) {
  // 1. Пользовательский override (высший приоритет)
  if (colorMap[value]) return colorMap[value];
  
  // 2. Notion defaults (если есть)
  if (notionDefaults?.[value]) return notionDefaults[value];
  
  // 3. Hash в палитру (fallback)
  return hashToColor(value, palette);
}

// Проверить что палитра не пустая:
console.log(settings.nodeColorPalette);
```

### 17.5. Проблемы с производительностью

#### Лаги при большом количестве нод (>500)

**Решение:**
```typescript
// 1. Включить оптимизации ReactFlow в Graph.tsx:
<ReactFlow
  nodes={nodes}
  edges={edges}
  // Оптимизации:
  elevateNodesOnSelect={false}
  nodesDraggable={true}
  nodesConnectable={true}
  elementsSelectable={true}
  minZoom={0.1}
  maxZoom={4}
  defaultViewport={{ x: 0, y: 0, zoom: 1 }}
/>

// 2. Мемоизировать тяжелые вычисления:
const filteredNodes = useMemo(() => {
  return applyCanvasFilter(nodes, canvasFilter);
}, [nodes, canvasFilter]);

// 3. Использовать виртуализацию для Sidebar:
// Установить react-window:
npm install react-window @types/react-window
```

#### Медленный рендеринг шаблонов

**Решение:**
```typescript
// Кешировать результаты renderTemplate:
const templateCache = new Map<string, string>();

function renderTemplateCached(template: string, data: NodeData): string {
  const cacheKey = `${template}:${data.id}:${data.label}`;
  
  if (templateCache.has(cacheKey)) {
    return templateCache.get(cacheKey)!;
  }
  
  const result = renderTemplate(template, data);
  templateCache.set(cacheKey, result);
  return result;
}
```

### 17.6. Проблемы с File System API

#### File System API не работает

**Причина:** Браузер не поддерживает или требуется HTTPS.

**Решение:**
```typescript
// В useFileSystem.ts уже есть fallback на file-saver:
async function saveProject(data: ProjectFile, forceNew = false) {
  try {
    // Попытка использовать File System API
    if ('showSaveFilePicker' in window) {
      // ... File System API код
    } else {
      throw new Error('File System API not supported');
    }
  } catch (err) {
    // Fallback на file-saver
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    saveAs(blob, `${data.meta.name || 'project'}.json`);
  }
}
```

#### Файлы сохраняются с неправильным расширением

**Решение:**
```typescript
// Проверить suggestedName в showSaveFilePicker:
const handle = await window.showSaveFilePicker({
  suggestedName: `${projectName}.json`,
  types: [{
    description: 'JSON Files',
    accept: { 'application/json': ['.json'] },
  }],
});
```

---

## 18. Расширенные чеклисты

### 18.1. Чеклист перед началом переноса

- [ ] Создан новый Vite + React + TypeScript проект
- [ ] Установлены все зависимости из `package.json`
- [ ] Настроен Tailwind CSS (config + postcss)
- [ ] Настроен path alias `@/*` в `tsconfig.json` и `vite.config.ts`
- [ ] Скопирована папка `.ref/` в проект
- [ ] Прочитан весь `UI_UX_MIGRATION_GUIDE.md`

### 18.2. Чеклист переноса типов и store

- [ ] Скопирован `types/index.ts` из `.ref/src/types/`
- [ ] Адаптированы типы под ваш домен (NodeData, FilterProperty, NodeColorBy)
- [ ] Удалены Notion-специфичные типы (если не нужны)
- [ ] Скопирован `store/useStore.ts` из `.ref/src/store/`
- [ ] Удалены Notion-специфичные поля из store
- [ ] Проверена компиляция TypeScript: `npm run build`

### 18.3. Чеклист переноса стилей

- [ ] Скопирован `index.css` из `.ref/src/`
- [ ] Проверены CSS-переменные для темной темы (`:root`)
- [ ] Проверены CSS-переменные для светлой темы (`body.theme-light`)
- [ ] Добавлены глобальные стили (scrollbar, ReactFlow overrides)
- [ ] Добавлены стили для glass-эффекта
- [ ] Добавлены стили для waypoints и edges
- [ ] Добавлены стили для context menu
- [ ] Проверена работа обеих тем (dark/light)

### 18.4. Чеклист переноса компонентов

#### Базовые компоненты:
- [ ] `ErrorBoundary.tsx` — скопирован и работает
- [ ] `App.tsx` — скопирован, адаптирован layout
- [ ] `main.tsx` — настроена точка входа

#### Graph компоненты:
- [ ] `Graph.tsx` — скопирован, настроены nodeTypes/edgeTypes
- [ ] `TechNode.tsx` — скопирован, адаптирован под новый NodeData
- [ ] `EditableEdge.tsx` — скопирован, работают waypoints
- [ ] `FlowMiniMap.tsx` — скопирован, работает zoom/pan
- [ ] `AxisLockGuide.tsx` — скопирован, работает Shift+drag

#### UI компоненты:
- [ ] `Sidebar.tsx` — скопирован, работает поиск/фильтр/сортировка
- [ ] `Inspector.tsx` — скопирован, адаптированы поля под новый домен
- [ ] `Toolbar.tsx` — скопирован, удалены Notion-кнопки
- [ ] `StatusBar.tsx` — скопирован, удален Notion-статус
- [ ] `FilterBuilder.tsx` — скопирован, обновлены FilterProperty
- [ ] `NodePreview.tsx` — скопирован, работает превью

#### Модальные окна:
- [ ] `SettingsModal.tsx` — скопирован, адаптированы опции
- [ ] `ColorMappingModal.tsx` — скопирован, обновлен colorBy
- [ ] `ImportModal.tsx` — скопирован, адаптирован CSV mapping
- [ ] `ExportModal.tsx` — скопирован, работает экспорт
- [ ] `SaveConfirmModal.tsx` — скопирован
- [ ] `UnsavedChangesModal.tsx` — скопирован
- [ ] `StartupModal.tsx` — скопирован, удалены Notion-опции

### 18.5. Чеклист переноса hooks и утилит

#### Hooks:
- [ ] `useKeyboardShortcuts.ts` — скопирован, удалены Notion-shortcuts
- [ ] `useFileSystem.ts` — скопирован, работает save/open

#### Утилиты:
- [ ] `colorMapping.ts` — скопирован, адаптирован getColorValue
- [ ] `nodePresetStyles.ts` — скопирован
- [ ] `template.ts` — скопирован, адаптирован renderTemplate
- [ ] `filterUtils.ts` — скопирован, адаптирован getPropertyValue
- [ ] `snapToGrid.ts` — скопирован
- [ ] `autoLayout.ts` — скопирован
- [ ] `orthogonalRouter.ts` — скопирован
- [ ] `orthogonalNormalize.ts` — скопирован
- [ ] `shapeBounds.ts` — скопирован
- [ ] `edgeHitTest.ts` — скопирован
- [ ] `connectedSubgraph.ts` — скопирован
- [ ] `csvImport.ts` — скопирован, адаптирован detectColumnMapping
- [ ] `export.ts` — скопирован, удалены Notion-специфичные экспорты
- [ ] `layoutHelpers.ts` — скопирован

### 18.6. Чеклист функциональности

#### Базовая функциональность:
- [ ] Приложение запускается без ошибок
- [ ] Можно добавить ноду
- [ ] Можно удалить ноду
- [ ] Можно соединить две ноды
- [ ] Можно перетаскивать ноды
- [ ] Работает Undo (Ctrl+Z)
- [ ] Работает Redo (Ctrl+Y)
- [ ] Работает Select All (Ctrl+A)
- [ ] Работает Escape (снять выделение)

#### Визуализация:
- [ ] Ноды отображаются с правильными стилями
- [ ] Работают все 5 пресетов нод
- [ ] Рёбра отображаются корректно
- [ ] Работает переключение типов рёбер (bezier/straight/step/smoothstep)
- [ ] Работает manual edge mode с waypoints
- [ ] Работает minimap (zoom, pan, center)
- [ ] Работает axis-lock (Shift + drag)

#### Темы и цвета:
- [ ] Работает переключение Dark/Light темы
- [ ] Glass-эффект на Sidebar и Inspector
- [ ] Работает colorBy для нод
- [ ] Работает кастомная палитра цветов
- [ ] Работает ColorMappingModal

#### Фильтрация и поиск:
- [ ] Работает поиск в Sidebar
- [ ] Работает сортировка в Sidebar
- [ ] Работает FilterBuilder
- [ ] Фильтры применяются к канвасу (dim/hide)
- [ ] Работает highlight connected subgraph

#### Snap и alignment:
- [ ] Работает snap to grid
- [ ] Работает snap to objects
- [ ] Работают все 6 функций alignment
- [ ] Работают 2 функции distribution
- [ ] Работают 2 функции stacking

#### Auto-layout:
- [ ] Работает Dagre auto-layout
- [ ] Работают все 4 направления (LR, RL, TB, BT)
- [ ] Работает layout selected subgraph

#### Импорт/Экспорт:
- [ ] Работает импорт CSV
- [ ] Работает экспорт PNG
- [ ] Работает экспорт SVG
- [ ] Работает экспорт CSV
- [ ] Работает экспорт JSON

#### File System:
- [ ] Работает Save (Ctrl+S)
- [ ] Работает Open (Ctrl+O)
- [ ] Работает Save As
- [ ] Отслеживаются unsaved changes
- [ ] Работает UnsavedChangesModal

#### Настройки:
- [ ] Работает SettingsModal (все 4 вкладки)
- [ ] Настройки сохраняются в проект
- [ ] Работает редактирование шаблона
- [ ] Работает NodePreview для шаблона

### 18.7. Чеклист производительности

- [ ] Приложение работает плавно с 100 нодами
- [ ] Приложение работает плавно с 500 нодами
- [ ] Drag & drop без лагов
- [ ] Zoom/pan без лагов
- [ ] Фильтрация работает быстро
- [ ] Auto-layout завершается за <2 секунды
- [ ] Экспорт PNG завершается за <5 секунд

### 18.8. Чеклист кроссбраузерности

- [ ] Работает в Chrome/Edge
- [ ] Работает в Firefox
- [ ] Работает в Safari
- [ ] Glass-эффект работает во всех браузерах
- [ ] File System API работает или fallback срабатывает

---

## 19. Примеры готовых конфигураций для разных доменов

### 19.1. Task Management System

**Полная конфигурация NodeData:**

```typescript
export interface NodeData {
  id: string;
  label: string;
  description?: string;
  
  // Task fields
  status: 'backlog' | 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  reporter?: string;
  dueDate?: string;
  createdDate?: string;
  completedDate?: string;
  
  // Estimation
  estimatedHours?: number;
  actualHours?: number;
  storyPoints?: number;
  
  // Organization
  tags?: string[];
  sprint?: string;
  epic?: string;
  
  // Dependencies
  blockedBy?: Array<{ id: string; name: string }>;
  blocks?: Array<{ id: string; name: string }>;
}
```

**Дефолтный шаблон:**
```
%label%
[%status%] Priority: %priority%
Assignee: %assignee%
Due: %dueDate%
```

**ColorBy опции:**
- `status` — цвет по статусу задачи
- `priority` — цвет по приоритету
- `assignee` — цвет по исполнителю
- `sprint` — цвет по спринту

**FilterProperty опции:**
- `status`, `priority`, `assignee`, `reporter`, `tags`, `sprint`, `epic`

### 19.2. Knowledge Graph / Wiki

**Полная конфигурация NodeData:**

```typescript
export interface NodeData {
  id: string;
  label: string;
  description?: string;
  
  // Content
  type: 'concept' | 'person' | 'event' | 'document' | 'organization' | 'location';
  content?: string;
  url?: string;
  
  // Metadata
  author?: string;
  createdDate?: string;
  lastModified?: string;
  version?: number;
  
  // Classification
  category?: string;
  keywords?: string[];
  tags?: string[];
  
  // Relations
  references?: Array<{ id: string; name: string; type: string }>;
  citedBy?: Array<{ id: string; name: string }>;
  
  // Quality
  confidence?: number; // 0-1
  verified?: boolean;
  sources?: string[];
}
```

**Дефолтный шаблон:**
```
%label%
Type: %type%
Category: %category%
Keywords: %keywords%
```

**ColorBy опции:**
- `type` — цвет по типу сущности
- `category` — цвет по категории
- `author` — цвет по автору
- `verified` — цвет по статусу верификации

### 19.3. Business Process Flow

**Полная конфигурация NodeData:**

```typescript
export interface NodeData {
  id: string;
  label: string;
  description?: string;
  
  // Process
  processType: 'start' | 'task' | 'decision' | 'subprocess' | 'end' | 'gateway';
  department?: string;
  role?: string;
  system?: string;
  
  // Metrics
  duration?: number; // minutes
  cost?: number;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'on-demand';
  
  // Automation
  automationLevel?: 'manual' | 'semi-automated' | 'automated';
  toolsUsed?: string[];
  
  // Compliance
  sla?: number; // hours
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  complianceRequired?: boolean;
  regulations?: string[];
  
  // Documentation
  instructions?: string;
  attachments?: Array<{ name: string; url: string }>;
}
```

**Дефолтный шаблон:**
```
%label%
Type: %processType%
Duration: %duration%min
Department: %department%
Role: %role%
```

**ColorBy опции:**
- `processType` — цвет по типу процесса
- `department` — цвет по отделу
- `riskLevel` — цвет по уровню риска
- `automationLevel` — цвет по уровню автоматизации

---

## 20. Дополнительные рекомендации

### 20.1. Организация кода

**Структура папок (рекомендуемая):**
```
src/
├── components/          # UI компоненты
│   ├── modals/         # Модальные окна
│   ├── panels/         # Sidebar, Inspector, Toolbar
│   └── common/         # Переиспользуемые компоненты
├── graph/              # ReactFlow компоненты
│   ├── nodes/          # Кастомные ноды
│   ├── edges/          # Кастомные рёбра
│   └── controls/       # MiniMap, AxisLockGuide
├── hooks/              # Кастомные хуки
├── store/              # Zustand store
├── types/              # TypeScript типы
├── utils/              # Утилиты
│   ├── graph/          # Graph-специфичные утилиты
│   ├── export/         # Экспорт/импорт
│   └── ui/             # UI утилиты
└── styles/             # CSS файлы
    ├── index.css       # Главный файл
    ├── components/     # Стили компонентов
    └── themes/         # Темы
```

### 20.2. Лучшие практики

1. **Используйте TypeScript строго:**
   - Избегайте `any`
   - Используйте `strict: true` в `tsconfig.json`
   - Определяйте типы для всех props и state

2. **Мемоизация:**
   - Используйте `useMemo` для тяжелых вычислений
   - Используйте `useCallback` для функций в deps
   - Мемоизируйте nodeTypes и edgeTypes

3. **Производительность:**
   - Избегайте inline функций в JSX
   - Используйте виртуализацию для длинных списков
   - Дебаунсите поиск и фильтрацию

4. **Доступность:**
   - Добавьте `aria-label` для кнопок с иконками
   - Поддерживайте keyboard navigation
   - Обеспечьте достаточный контраст цветов

5. **Тестирование:**
   - Пишите unit-тесты для утилит
   - Тестируйте критичные компоненты
   - Используйте Vitest (уже в зависимостях)

### 20.3. Git workflow

**Рекомендуемая структура коммитов:**
```
feat: add Task Management domain types
feat: adapt Inspector for Task Management fields
feat: update colorMapping for status/priority
fix: correct CSV import column detection
refactor: remove Notion-specific code from store
style: update theme colors for better contrast
docs: update README with Task Management examples
```

### 20.4. Документация проекта

**Создайте README.md в новом проекте:**
```markdown
# Your Project Name

## Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`

## Features

- Interactive node-based editor
- Drag & drop interface
- Auto-layout with Dagre
- CSV import/export
- Dark/Light themes
- Undo/Redo support
- Keyboard shortcuts

## Keyboard Shortcuts

- `Ctrl+S` — Save
- `Ctrl+O` — Open
- `Ctrl+Z` — Undo
- `Ctrl+Y` — Redo
- `Ctrl+A` — Select All
- `Escape` — Deselect
- `Shift+Drag` — Axis Lock

## Tech Stack

- React 18
- TypeScript
- Vite
- ReactFlow
- Zustand
- Tailwind CSS

## License

MIT
\`\`\`

### 20.5. Deployment

**Для production build:**
```bash
# Build
npm run build

# Preview locally
npm run preview

# Deploy to Netlify/Vercel/GitHub Pages
# Убедитесь что base в vite.config.ts настроен правильно
```

**vite.config.ts для GitHub Pages:**
```typescript
export default defineConfig({
  base: '/your-repo-name/',  // Для GitHub Pages
  // base: '/',              // Для собственного домена
});
```
