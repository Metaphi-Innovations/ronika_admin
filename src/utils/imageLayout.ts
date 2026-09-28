/**
 * Project Image Positional Layout, Slot & Dimension Engine
 * 
 * STRICT SPECIFICATION:
 * Position 1   → 16:9 slot → EXACTLY 1600 × 900 px
 * Position 2   → 4:3 slot  → EXACTLY 400 × 300 px
 * Position 3   → 4:3 slot  → EXACTLY 400 × 300 px
 * Position 4   → 16:9 slot → EXACTLY 1600 × 900 px
 * Position 5   → 1:1 slot  → ANY SQUARE DIMENSION (width === height)
 * Position 6   → 1:1 slot  → ANY SQUARE DIMENSION (width === height)
 * Position 7   → 1:1 slot  → ANY SQUARE DIMENSION (width === height)
 * 
 * Position >= 8 repeats [16:9, 4:3, 4:3] indefinitely:
 * - (position - 8) % 3 === 0 → 16:9 slot → EXACTLY 1600 × 900 px
 * - (position - 8) % 3 === 1 → 4:3 slot  → EXACTLY 400 × 300 px
 * - (position - 8) % 3 === 2 → 4:3 slot  → EXACTLY 400 × 300 px
 */

export type ProjectImageRatio = '16:9' | '4:3' | '1:1';
export type ProjectSlotType = '16:9' | '4:3' | '1:1';

export interface ProjectImageSlotRule {
  type: ProjectSlotType;
  width: number | null;
  height: number | null;
  square: boolean;
  exactDimensions: boolean;
  label: string;
  expectedText: string;
  description: string;
}

/**
 * Returns the deterministic aspect ratio for any 1-based project image position.
 */
export function getProjectImageRatio(position: number): ProjectImageRatio {
  if (position <= 0 || position === 1) return '16:9';
  if (position === 2 || position === 3) return '4:3';
  if (position === 4) return '16:9';
  if (position >= 5 && position <= 7) return '1:1';

  const offset = (position - 8) % 3;
  if (offset === 0) return '16:9';
  return '4:3';
}

/**
 * Returns the exact slot rule for any 1-based project image position.
 * Works deterministically for unlimited positions.
 */
export function getProjectImageSlot(position: number): ProjectImageSlotRule {
  if (position <= 0 || position === 1) {
    return {
      type: '16:9',
      width: 1600,
      height: 900,
      square: false,
      exactDimensions: true,
      label: 'Full-width Slot (16:9)',
      expectedText: '1600 × 900 px',
      description: 'exactly 1600 × 900 px',
    };
  }

  if (position === 2 || position === 3) {
    return {
      type: '4:3',
      width: 400,
      height: 300,
      square: false,
      exactDimensions: true,
      label: 'Two-column Slot (4:3)',
      expectedText: '400 × 300 px',
      description: 'exactly 400 × 300 px',
    };
  }

  if (position === 4) {
    return {
      type: '16:9',
      width: 1600,
      height: 900,
      square: false,
      exactDimensions: true,
      label: 'Full-width Slot (16:9)',
      expectedText: '1600 × 900 px',
      description: 'exactly 1600 × 900 px',
    };
  }

  if (position >= 5 && position <= 7) {
    return {
      type: '1:1',
      width: null,
      height: null,
      square: true,
      exactDimensions: false,
      label: 'Three-column Slot (1:1)',
      expectedText: 'Square (any size)',
      description: 'a square image (any square size, width === height)',
    };
  }

  // Position >= 8: repeating pattern [16:9, 4:3, 4:3]
  const offset = (position - 8) % 3;
  if (offset === 0) {
    return {
      type: '16:9',
      width: 1600,
      height: 900,
      square: false,
      exactDimensions: true,
      label: 'Full-width Slot (16:9)',
      expectedText: '1600 × 900 px',
      description: 'exactly 1600 × 900 px',
    };
  }

  return {
    type: '4:3',
    width: 400,
    height: 300,
    square: false,
    exactDimensions: true,
    label: 'Two-column Slot (4:3)',
    expectedText: '400 × 300 px',
    description: 'exactly 400 × 300 px',
  };
}

/**
 * Validates provided width & height against the position's slot rule.
 */
export function validateSlotDimensions(
  width: number,
  height: number,
  slot: ProjectImageSlotRule
): { valid: boolean; error?: string } {
  if (!width || !height || width <= 0 || height <= 0) {
    return { valid: false, error: 'Invalid image dimensions (0 px)' };
  }

  if (slot.exactDimensions) {
    if (width !== slot.width || height !== slot.height) {
      return {
        valid: false,
        error: `Requires exactly ${slot.width} × ${slot.height} px. Provided image is ${width} × ${height} px.`,
      };
    }
    return { valid: true };
  }

  if (slot.square) {
    if (width !== height) {
      return {
        valid: false,
        error: `Requires a square image (width === height). Provided image is ${width} × ${height} px.`,
      };
    }
    return { valid: true };
  }

  return { valid: true };
}

/**
 * Classifies an image into its strict ProjectSlotType based on stored pixel dimensions.
 */
export function getProjectImageType(
  image: { width?: number; height?: number } | null | undefined
): ProjectSlotType | 'unknown' {
  if (!image || !image.width || !image.height) return 'unknown';
  const { width, height } = image;
  if (width === 1600 && height === 900) return '16:9';
  if (width === 400 && height === 300) return '4:3';
  if (width === height && width > 0) return '1:1';
  return 'unknown';
}

/**
 * Checks whether an image can be moved to a prospective target 1-based position.
 */
export function canMoveProjectImage(
  image: { width?: number; height?: number } | null | undefined,
  targetPosition: number
): boolean {
  if (!image) return false;
  const slot = getProjectImageSlot(targetPosition);
  return validateSlotDimensions(image.width || 0, image.height || 0, slot).valid;
}

/**
 * Reorders images strictly WITHIN their compatibility group.
 * Preserves the fixed slots of all other image types, so no cross-type boundary is ever crossed.
 */
export function reorderCompatibleImages<T extends { width?: number; height?: number }>(
  images: T[],
  sourceIndex: number,
  destIndex: number
): T[] {
  if (
    sourceIndex === destIndex ||
    sourceIndex < 0 ||
    destIndex < 0 ||
    sourceIndex >= images.length ||
    destIndex >= images.length
  ) {
    return images;
  }

  const sourceSlot = getProjectImageSlot(sourceIndex + 1);
  const targetSlot = getProjectImageSlot(destIndex + 1);

  // Cross-type moves are strictly prohibited
  if (sourceSlot.type !== targetSlot.type) {
    return images;
  }

  const groupType = sourceSlot.type;

  // Identify all slots in the project belonging to this compatibility group
  const compatibleIndices: number[] = [];
  for (let i = 0; i < images.length; i++) {
    if (getProjectImageSlot(i + 1).type === groupType) {
      compatibleIndices.push(i);
    }
  }

  const groupSourceIdx = compatibleIndices.indexOf(sourceIndex);
  const groupDestIdx = compatibleIndices.indexOf(destIndex);

  if (groupSourceIdx === -1 || groupDestIdx === -1) {
    return images;
  }

  // Extract group items, shift within group, and place back into their respective slots
  const groupItems = compatibleIndices.map((idx) => images[idx]);
  const [moved] = groupItems.splice(groupSourceIdx, 1);
  groupItems.splice(groupDestIdx, 0, moved);

  const result = [...images];
  compatibleIndices.forEach((slotIdx, i) => {
    result[slotIdx] = groupItems[i];
  });

  return result;
}

/**
 * Calculates the exact row distribution pattern for N images.
 * Positional grouping:
 * - Pos 1: row of 1 (16:9)
 * - Pos 2 & 3: row of 2 (4:3)
 * - Pos 4: row of 1 (16:9)
 * - Pos 5, 6, 7: row of 3 (1:1)
 * - Pos >= 8: alternating row of 1 (16:9) then row of 2 (4:3) indefinitely
 */
export function calculateRowPattern(N: number): number[] {
  if (N <= 0) return [];
  if (N === 1) return [1];
  if (N === 2) return [1, 1];
  if (N === 3) return [1, 2];
  if (N === 4) return [1, 2, 1];
  if (N === 5) return [1, 2, 1, 1];
  if (N === 6) return [1, 2, 1, 2];
  if (N === 7) return [1, 2, 1, 3];

  const pattern = [1, 2, 1, 3];
  let remaining = N - 7;
  let nextRowSize = 1;

  while (remaining > 0) {
    if (nextRowSize === 1) {
      pattern.push(1);
      remaining -= 1;
      nextRowSize = 2;
    } else {
      if (remaining === 1) {
        pattern.push(1);
        remaining -= 1;
      } else {
        pattern.push(2);
        remaining -= 2;
      }
      nextRowSize = 1;
    }
  }

  return pattern;
}

export interface ProjectImageItem<T = any> {
  item: T;
  position: number;
  ratio: ProjectImageRatio;
}

export function generateProjectImageRows<T>(images: T[]): ProjectImageItem<T>[][] {
  if (!images || images.length === 0) return [];

  const pattern = calculateRowPattern(images.length);
  const rows: ProjectImageItem<T>[][] = [];
  let currentIndex = 0;

  for (const count of pattern) {
    const rowItems: ProjectImageItem<T>[] = [];
    for (let i = 0; i < count && currentIndex < images.length; i++) {
      const position = currentIndex + 1;
      rowItems.push({
        item: images[currentIndex],
        position,
        ratio: getProjectImageRatio(position),
      });
      currentIndex++;
    }
    if (rowItems.length > 0) {
      rows.push(rowItems);
    }
  }

  while (currentIndex < images.length) {
    const position = currentIndex + 1;
    rows.push([{
      item: images[currentIndex],
      position,
      ratio: getProjectImageRatio(position),
    }]);
    currentIndex++;
  }

  return rows;
}
