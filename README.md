# TechTree Studio

A specialized node graph editor for game tech/crafting trees, built with offline-first workflows in mind. Create, edit, and visualize complex dependency trees with ease.

## ✨ Features

- **🔒 Offline-First**: Full File System Access API support with fallback for all browsers
- **📊 CSV Import**: Smart import with customizable column mapping and auto-linking
- **🎨 Auto-Layout**: Dagre-powered DAG layout (Left-to-Right or Top-to-Bottom)
- **🏷️ Node Templates**: Flexible template engine with custom placeholders
- **📤 Multi-Format Export**: PNG, SVG, CSV, and Draw.io XML
- **⚡ Performance**: Optimized for 200+ nodes with render simplification
- **⌨️ Keyboard Shortcuts**: Full keyboard navigation and shortcuts
- **🔍 Advanced Filtering**: Filter and sort by Act, Stage, Category
- **🔗 Connection Explorer**: View and navigate incoming/outgoing edges
- **↩️ Undo/Redo**: Full history support for all operations

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Modern browser (Chrome recommended for File System Access API)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser to `http://localhost:5173`

### First Steps

1. **Startup Modal**: Choose between Offline mode (local files) or Online mode (coming soon)
2. **Import CSV**: Click Upload button to import your tech tree data
3. **Auto-Layout**: Arrange nodes automatically with the Layout button
4. **Edit Nodes**: Click any node to edit in the Inspector panel
5. **Save Project**: Save as JSON file for later editing

## 📖 User Guide

### Working with Nodes

#### Creating Nodes
- **Manual**: Click the ➕ Plus button in the toolbar
- **CSV Import**: Import from spreadsheet (recommended for bulk)

#### Editing Nodes
1. Click a node to select it
2. Use the Inspector panel (right side) to edit:
   - Label, Act, Stage, Category
   - View position
   - See incoming/outgoing connections
   - View/copy raw JSON data

#### Deleting Nodes
- **Keyboard**: Select node(s) and press `Delete` or `Backspace`
- **UI**: Use the "Delete Node" button in Inspector panel

#### Navigating
- **Jump to Connection**: Click connected node names in Inspector
- **Sidebar Click**: Click node in sidebar to center in viewport
- **Select All**: `Ctrl/Cmd + A`
- **Clear Selection**: `Escape`

### CSV Import

#### CSV Format
See `examples/sample-import.csv` for a complete example. Required columns:
- **ID**: Unique identifier for each node
- **Label**: Display name
- **Dependencies**: Comma or semicolon-separated IDs of prerequisite nodes

Optional columns:
- **Act**, **Stage**, **Category**: For filtering and organization
- **Any custom fields**: All columns become available as template placeholders

#### Import Process
1. Click Upload button → Select CSV file
2. **Step 1 - Column Mapping**: Map CSV columns to node properties
   - Auto-detection suggests mappings
   - ID column is required
   - Dependencies create edges
3. **Step 2 - Confirm**: Review and import
4. Auto-layout automatically arranges nodes

#### Dependency Format
Dependencies should reference node IDs or Labels:
```csv
ID,Label,Dependencies
1,Wood,
2,Stone,
3,Axe,"1,2"
4,Pickaxe,1;2
```

### Templates

Templates customize how node labels display. Use placeholders wrapped in `%`:

#### Example Template
```
%RuName%
Act %Act% Stage %Stage% | %Category%
Craft: %formulaResultInCraft%
```

#### Available Placeholders
- `%RuName%` - Russian name
- `%Act%` - Act number
- `%Stage%` - Stage number
- `%Category%` - Category
- `%ItemInGameStatus%` - Game status
- `%formulaIngridients%` - Ingredients
- And any custom column from your CSV!

See `examples/template-examples.md` for more examples.

### Filtering & Searching

#### Sidebar Filters
1. Click "Filter" button
2. Select filters:
   - **Act**: Filter by act number
   - **Stage**: Filter by stage number
   - **Category**: Filter by category
3. Clear filters with "Clear" button

#### Sorting
- Name (alphabetical)
- Act (numeric)
- Stage (numeric)
- Order (original)

#### Search
Type in search box to filter by node label.

### Exporting

Click Download button to choose format:

#### PNG
- High-resolution image of current viewport
- 2x scaling for quality
- White background

#### SVG
- Vector format (scalable)
- Current viewport
- Ideal for presentations

#### CSV
- Export nodes as spreadsheet
- Includes all node data
- Dependencies column lists prerequisites

#### Draw.io
- Import into Draw.io/diagrams.net
- Preserves node positions
- Editable diagram format

### Settings

Access via Settings button (⚙️):

#### General
- **Layout Direction**: LR (Left-to-Right) or TB (Top-to-Bottom)

#### Template
- **Node Label Template**: Customize display format
- **Placeholder Reference**: List of available placeholders
- **Preview**: See template example

#### Performance
- **Render Simplification**: Enable for large graphs (200+ nodes)
- Future: LOD, edge filtering, neighborhood view

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + S` | Save project |
| `Ctrl/Cmd + O` | Open project |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Y` | Redo |
| `Ctrl/Cmd + Shift + Z` | Redo (alternative) |
| `Ctrl/Cmd + A` | Select all nodes |
| `Delete` / `Backspace` | Delete selected nodes |
| `Escape` | Clear selection |

## 🗂️ Project File Format

Projects are saved as JSON:

```json
{
  "version": "1.0",
  "meta": {
    "name": "My Tech Tree",
    "updatedAt": "2024-01-15T10:00:00Z",
    "version": "1.0"
  },
  "settings": {
    "layoutDirection": "LR",
    "nodeTemplate": "%RuName%\n%Act% %Stage%",
    "renderSimplification": false
  },
  "nodes": [
    {
      "id": "node-1",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "Tech Name",
        "act": "1",
        "stage": "1",
        "category": "Weapons"
      },
      "type": "techNode"
    }
  ],
  "edges": [
    {
      "id": "e-1-2",
      "source": "node-1",
      "target": "node-2",
      "animated": true
    }
  ]
}
```

### File Compatibility
- **Version**: Always "1.0" currently
- **Forward compatible**: Unknown fields are preserved
- **Editable**: Valid JSON, can be manually edited

## 🏗️ Architecture

### Tech Stack
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Zustand** - State management
- **Zundo** - Undo/redo middleware
- **React Flow (@xyflow/react)** - Graph visualization
- **Dagre** - Auto-layout algorithm
- **Tailwind CSS** - Styling
- **Vite** - Build tool

### Key Files
```
src/
├── components/       # UI components
│   ├── Toolbar.tsx
│   ├── Sidebar.tsx
│   ├── Inspector.tsx
│   ├── ImportModal.tsx
│   ├── ExportModal.tsx
│   ├── SettingsModal.tsx
│   └── StartupModal.tsx
├── graph/           # Graph components
│   ├── Graph.tsx
│   └── TechNode.tsx
├── store/           # State management
│   └── useStore.ts
├── hooks/           # Custom hooks
│   ├── useFileSystem.ts
│   └── useKeyboardShortcuts.ts
├── utils/           # Utilities
│   ├── autoLayout.ts
│   ├── csvImport.ts
│   ├── export.ts
│   └── template.ts
└── types/           # TypeScript types
    └── index.ts
```

## 🔮 Future Features

### Planned
- **Notion Integration**: Sync with Notion databases
- **WebWorker Layout**: Offload layout to background thread
- **Advanced Performance**: LOD, edge filtering, viewport culling
- **Collaboration**: Real-time multi-user editing
- **Version History**: Built-in version control
- **Custom Node Styles**: Per-category colors and icons
- **Dark Mode**: Theme support

### Under Consideration
- **Minimap Enhancements**: Better navigation
- **Node Grouping**: Hierarchical organization
- **Advanced Exports**: PowerPoint, Visio, Miro
- **API Integrations**: Beyond Notion
- **Localization**: Multi-language support

## 🧪 QA Checklist

### Core Functionality
- [x] App loads without errors
- [x] CSV import creates nodes correctly
- [x] Dependencies convert to edges
- [x] Auto-layout arranges nodes
- [x] Manual node creation works
- [x] Node editing updates immediately
- [x] Node deletion removes edges
- [x] Save/load preserves all data

### File Operations
- [x] File System Access API (Chrome)
- [x] Fallback file picker works
- [x] Project files are valid JSON
- [x] Settings persist in project file
- [x] Multiple save/load cycles work

### UI/UX
- [x] Sidebar search filters nodes
- [x] Filters by Act/Stage/Category work
- [x] Sorting options work
- [x] Click sidebar item jumps to node
- [x] Inspector shows edges
- [x] Jump to connected nodes works
- [x] Settings modal saves changes
- [x] Startup modal shows once

### Keyboard Shortcuts
- [x] Ctrl+S saves project
- [x] Ctrl+O opens project
- [x] Ctrl+Z/Y undo/redo
- [x] Delete removes nodes
- [x] Escape clears selection
- [x] Ctrl+A selects all

### Export
- [x] PNG export generates image
- [x] SVG export generates vector
- [x] CSV export creates spreadsheet
- [x] Draw.io export opens correctly

### Performance
- [x] 200 nodes render smoothly
- [x] No lag during editing
- [x] Auto-layout completes quickly
- [x] Undo/redo is instant

## 🐛 Troubleshooting

### CSV Import Issues
- **Problem**: Columns not detected
  - **Solution**: Ensure CSV has headers in first row

- **Problem**: Dependencies not creating edges
  - **Solution**: Check IDs match exactly (case-sensitive)

- **Problem**: Import fails silently
  - **Solution**: Check browser console for errors

### File System Issues
- **Problem**: Can't save files
  - **Solution**: Chrome/Edge recommended for File System Access API

- **Problem**: "AbortError" when saving
  - **Solution**: This means you clicked Cancel - it's normal

### Performance Issues
- **Problem**: Lag with many nodes
  - **Solution**: Enable "Render Simplification" in Settings

- **Problem**: Auto-layout takes long time
  - **Solution**: Normal for complex graphs, wait for completion

## 📄 License

This project is private and proprietary.

## 🤝 Contributing

Not currently accepting contributions.

## 📧 Support

For issues or questions, please file an issue in the project repository.
