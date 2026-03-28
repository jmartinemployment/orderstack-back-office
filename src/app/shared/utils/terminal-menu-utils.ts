import { MenuCategory, MenuItem, isItemAvailable } from '../../models/index';
import { MenuService } from '../../services/menu';

export const QSR_PALETTE = [
  '#dc3545', // red
  '#0d6efd', // blue
  '#198754', // green
  '#fd7e14', // orange
  '#6f42c1', // purple
  '#20c997', // teal
  '#795548', // brown
  '#e91e8f', // pink
];

/** Collect all items from a category tree (handles nested subcategories). */
export function collectMenuItems(cats: MenuCategory[]): MenuItem[] {
  const items: MenuItem[] = [];
  for (const cat of cats) {
    if (cat.items) items.push(...cat.items);
    if (cat.subcategories) items.push(...collectMenuItems(cat.subcategories));
  }
  return items;
}

/** Filter items to those visible and available on the POS terminal. */
export function filterTerminalItems(items: MenuItem[], menuService: MenuService): MenuItem[] {
  return items.filter(
    i =>
      i.isActive !== false &&
      !i.eightySixed &&
      i.channelVisibility?.pos !== false &&
      isItemAvailable(i) &&
      menuService.isItemInActiveDaypart(i),
  );
}

/** Filter items to a selected category (no-op when catId is null). */
export function filterItemsByCategory(
  items: MenuItem[],
  catId: string | null,
  categories: MenuCategory[],
): MenuItem[] {
  if (!catId) return items;
  const cat = categories.find(c => c.id === catId);
  if (!cat) return items;
  const catItemIds = new Set(collectMenuItems([cat]).map(i => i.id));
  return items.filter(i => catItemIds.has(i.id));
}

/**
 * Compute the grid items for the standard 4-tab terminal layout
 * (keypad | library | favorites | menu).
 */
export function computeTerminalGridItems(
  tab: string,
  allItems: MenuItem[],
  catId: string | null,
  categories: MenuCategory[],
): MenuItem[] {
  if (tab === 'favorites') {
    const popular = allItems.filter(i => i.popular || i.isPopular);
    const base = popular.length > 0 ? popular : allItems;
    return filterItemsByCategory(base, catId, categories);
  }
  if (tab === 'menu' || tab === 'library') {
    return filterItemsByCategory(allItems, catId, categories);
  }
  // Keypad tab shows nothing (keypad input mode)
  return [];
}

/** Build a category → color map for category-colored item grids. */
export function buildCategoryColorMap(
  cats: MenuCategory[],
  palette: string[] = QSR_PALETTE,
): Map<string, string> {
  const map = new Map<string, string>();

  const mapSubcategories = (children: MenuCategory[], color: string): void => {
    for (const child of children) {
      map.set(child.id, child.color ?? color);
      if (child.subcategories) mapSubcategories(child.subcategories, child.color ?? color);
    }
  };

  cats.forEach((cat, index) => {
    const color = cat.color ?? palette[index % palette.length];
    map.set(cat.id, color);
    if (cat.subcategories) mapSubcategories(cat.subcategories, color);
  });

  return map;
}

/** Handle a keypad button press, returning the updated value string. */
export function handleKeypadPress(current: string, key: string): string {
  if (key === 'clear') return '';
  if (key === 'backspace') return current.slice(0, -1);
  return current + key;
}

/** Parse a price that may arrive as a string or number. */
export function parseItemPrice(price: number | string): number {
  return typeof price === 'string' ? Number.parseFloat(price) : price;
}
