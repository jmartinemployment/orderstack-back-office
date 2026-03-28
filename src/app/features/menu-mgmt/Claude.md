# Menu Management

## Purpose
Full menu CRUD — categories, items, modifiers, combos, and menu schedules (dayparting).

## Routes
- `/menu` — Main menu management (tabbed)
- `/combos` — Combo management (standalone route)

## Components
- **MenuManagement** (`os-menu-management`) — Tab container routing to child managers
- **CategoryManagement** (`os-category-management`) — Category CRUD with drag-and-drop ordering
- **ItemManagement** (`os-item-management`) — Menu item CRUD with pricing, photos, allergens, modifiers
- **ModifierManagement** (`os-modifier-management`) — Modifier groups and individual modifiers
- **ComboManagement** (`os-combo-management`) — Combo meal builder with component items
- **ScheduleManagement** (`os-schedule-management`) — Daypart scheduling (breakfast, lunch, dinner menus)

## Services
- `MenuService` — Categories, items CRUD
- `ModifierService` — Modifier groups/items CRUD
- `ComboService` — Combo CRUD

## Models
- `menu.model` — Category, MenuItem, MenuItemModifier
- `combo.model` — Combo, ComboGroup, ComboItem

## Key Patterns
- Has Vitest specs for CategoryManagement, ItemManagement, ModifierManagement, ComboManagement, ScheduleManagement, and MenuManagement
