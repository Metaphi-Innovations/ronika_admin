export function calculateRowPattern(N: number): number[] {
  if (N <= 0) return [];
  if (N === 1) return [1];
  if (N === 2) return [1, 1];
  if (N === 3) return [1, 2];
  if (N === 4) return [1, 2, 1];
  if (N === 5) return [1, 2, 1, 1];
  if (N === 6) return [1, 2, 1, 2];

  const pattern: number[] = [1, 2, 1, 3];
  let rem = N - 7;
  let nextVal = 1;

  while (rem > 0) {
    if (rem === 1) {
      pattern.push(1);
      rem -= 1;
    } else if (rem === 2) {
      if (nextVal === 2) {
        pattern.push(2);
        rem -= 2;
      } else {
        pattern.push(1);
        pattern.push(1);
        rem -= 2;
      }
    } else {
      pattern.push(nextVal);
      rem -= nextVal;
      nextVal = nextVal === 1 ? 2 : 1;
    }
  }

  return pattern;
}

export function generateProjectImageRows<T>(images: T[]): T[][] {
  if (!images || images.length === 0) return [];

  const pattern = calculateRowPattern(images.length);
  const rows: T[][] = [];
  let currentIndex = 0;

  for (const count of pattern) {
    const rowChunk = images.slice(currentIndex, currentIndex + count);
    if (rowChunk.length > 0) {
      rows.push(rowChunk);
      currentIndex += rowChunk.length;
    }
  }

  while (currentIndex < images.length) {
    rows.push([images[currentIndex]]);
    currentIndex++;
  }

  return rows;
}
