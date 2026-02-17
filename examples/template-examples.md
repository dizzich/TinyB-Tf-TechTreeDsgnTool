# Template Examples

TechTree Studio uses a simple template engine with placeholders to customize node labels. Placeholders are wrapped in `%` symbols.

## Available Placeholders

| Placeholder | Description | Example |
|------------|-------------|---------|
| `%RuName%` | Russian name of the item | Деревянная дубинка |
| `%Act%` | Act number | 1, 2, 3 |
| `%Stage%` | Stage number | 1, 2, 3 |
| `%Category%` | Item category | Оружие, Инструмент |
| `%formulaResultInCraft%` | Crafting result | Дубинка |
| `%ItemInGameStatus%` | In-game status | В игре, В разработке |
| `%ItemDesignStatus%` | Design status | Готов, Концепт |
| `%formulaIngridients%` | Required ingredients | Дерево x3 |
| `%formulaCraftStation%` | Crafting station | Верстак, Наковальня |

## Template Examples

### Simple Template
```
%RuName%
```
**Output:**
```
Деревянная дубинка
```

### Basic Info Template
```
%RuName%
Акт %Act% | Стадия %Stage%
```
**Output:**
```
Деревянная дубинка
Акт 1 | Стадия 1
```

### Detailed Template
```
%RuName%
Акт %Act% Стадия %Stage% | %Category%
Craft: %formulaResultInCraft%
Game: %ItemInGameStatus% | Design: %ItemDesignStatus%
Ing: %formulaIngridients%
Station: %formulaCraftStation%
```
**Output:**
```
Железный меч
Акт 2 Стадия 1 | Оружие
Craft: Меч
Game: В игре | Design: Готов
Ing: Железо x2|Палка x1
Station: Наковальня
```

### Compact Template
```
%RuName% (%Act%.%Stage%)
%Category% - %ItemInGameStatus%
```
**Output:**
```
Железный меч (2.1)
Оружие - В игре
```

## Usage Tips

1. **Unknown placeholders** render as empty strings
2. **Line breaks** use `\n` in the template
3. **Custom fields** from your CSV are also available as placeholders
4. **Preview** your template in Settings → Template tab
5. **Default template** is used when creating new nodes

## Customizing for Your Project

If your CSV has different column names, you can use them as placeholders:
- `%YourCustomColumn%`
- `%AnyFieldName%`
- `%nested_field_name%`

All fields from your imported CSV become available as template placeholders!
