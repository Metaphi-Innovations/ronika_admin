/**
 * Shared RGL Layout Constants & Normalization Utility
 * Used across Admin (Project & Gallery editors) and Public Portfolio (MediaGridRenderer)
 */

export const RGL_COLS = 12;
export const RGL_ROW_HEIGHT = 150;
export const RGL_MARGIN: [number, number] = [10, 10];
export const DEFAULT_ITEM_W = 2;
export const DEFAULT_ITEM_H = 1;

export interface NormalizedLayoutItem {
  x: number;
  y: number;
  w: number;
  h: number;
  v?: number;
}

/**
 * Normalizes a layout item, handling legacy 96-column coordinates safely
 */
export function normalizeLayoutItem(raw: any): NormalizedLayoutItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const w = Number(raw.w);
  const h = Number(raw.h);
  if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return null;

  const isLegacy96 = w > RGL_COLS || h > 8;
  const safeW = isLegacy96 ? Math.max(1, Math.min(RGL_COLS, Math.round(w / 8))) : Math.min(RGL_COLS, Math.max(1, w));
  const safeH = isLegacy96 ? Math.max(1, Math.round(h / 16)) : Math.min(20, Math.max(1, h));
  const safeX = isLegacy96 ? Math.round((Number(raw.x) || 0) / 8) % RGL_COLS : Math.max(0, Math.min(RGL_COLS - safeW, Number(raw.x) || 0));
  const safeY = isLegacy96 ? Math.round((Number(raw.y) || 0) / 16) : Math.max(0, Number(raw.y) || 0);

  return {
    x: safeX,
    y: safeY,
    w: safeW,
    h: safeH,
    v: 2
  };
}

/**
 * Finds the earliest available non-colliding (x, y) slot in a 12-column grid
 */
export function findNextAvailableSlot(
  existingItems: { x: number; y: number; w: number; h: number }[],
  itemW: number = DEFAULT_ITEM_W,
  itemH: number = DEFAULT_ITEM_H,
  cols: number = RGL_COLS
): { x: number; y: number } {
  const validItems = existingItems.filter(item => 
    typeof item.x === 'number' && typeof item.y === 'number' && 
    typeof item.w === 'number' && typeof item.h === 'number' &&
    !isNaN(item.x) && !isNaN(item.y) && !isNaN(item.w) && !isNaN(item.h)
  );

  let y = 0;
  while (true) {
    for (let x = 0; x <= cols - itemW; x++) {
      const collides = validItems.some(item => {
        const overlapX = x < (item.x + item.w) && (x + itemW) > item.x;
        const overlapY = y < (item.y + item.h) && (y + itemH) > item.y;
        return overlapX && overlapY;
      });

      if (!collides) {
        return { x, y };
      }
    }
    y++;
  }
}

/**
 * Standard vertical compaction algorithm matching React Grid Layout compactType="vertical"
 */
export function compactLayout<T extends { i: string; x: number; y: number; w: number; h: number }>(
  items: T[],
  cols: number = RGL_COLS
): T[] {
  // Sort items top-to-bottom, left-to-right
  const sorted = [...items].sort((a, b) => {
    if (a.y === b.y) return a.x - b.x;
    return a.y - b.y;
  });

  const compacted: T[] = [];

  for (const item of sorted) {
    let bestY = item.y;

    // Pull upwards towards y = 0 until colliding with any placed item
    while (bestY > 0) {
      const testY = bestY - 1;
      const collides = compacted.some(other => {
        const overlapX = item.x < (other.x + other.w) && (item.x + item.w) > other.x;
        const overlapY = testY < (other.y + other.h) && (testY + item.h) > other.y;
        return overlapX && overlapY;
      });

      if (collides) break;
      bestY = testY;
    }

    compacted.push({
      ...item,
      y: bestY
    });
  }

  // Restore original ordering
  return items.map(original => compacted.find(c => c.i === original.i) || original);
}

/**
 * Synchronously computes the canonical compacted layout for an array of items.
 * Normalizes existing valid coordinates or assigns non-colliding default slots.
 */
export function computeCanonicalLayout(items: { id: string | number; layouts?: any }[]): any[] {
  const existingRects: { x: number; y: number; w: number; h: number }[] = [];
  const initialElements: any[] = [];

  items.forEach((item) => {
    const norm = normalizeLayoutItem(item.layouts?.lg);
    const itemId = String(item.id);

    if (norm) {
      existingRects.push(norm);
      initialElements.push({
        i: itemId,
        x: norm.x,
        y: norm.y,
        w: norm.w,
        h: norm.h,
        minW: 1,
        minH: 1,
      });
    } else {
      const slot = findNextAvailableSlot(existingRects, DEFAULT_ITEM_W, DEFAULT_ITEM_H, RGL_COLS);
      const newLayout = {
        x: slot.x,
        y: slot.y,
        w: DEFAULT_ITEM_W,
        h: DEFAULT_ITEM_H,
      };
      existingRects.push(newLayout);
      initialElements.push({
        i: itemId,
        ...newLayout,
        minW: 1,
        minH: 1,
      });
    }
  });

  return compactLayout(initialElements, RGL_COLS);
}
