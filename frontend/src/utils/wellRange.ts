/** Compute the rectangular range of wells between two well IDs.
 *
 *  Used by the results-page viewer for shift-drag range select/deselect.
 *  Plate type is the bare digit string ("96", "384", ...) or "rows,cols"
 *  for custom plates. Falls back to 96-well dimensions on unknown input.
 */
export function getWellRange(start: string, end: string, plateType: string): Set<string> {
  const plateMeta: Record<string, { rows: number; cols: number }> = {
    '6': { rows: 2, cols: 3 },
    '12': { rows: 3, cols: 4 },
    '24': { rows: 4, cols: 6 },
    '48': { rows: 6, cols: 8 },
    '96': { rows: 8, cols: 12 },
    '384': { rows: 16, cols: 24 },
  };
  let meta = plateMeta[plateType];
  if (!meta && plateType.includes(',')) {
    const [r, c] = plateType.split(',').map(Number);
    meta = { rows: r, cols: c };
  }
  if (!meta) meta = { rows: 8, cols: 12 };

  const startRow = start.charCodeAt(0) - 65;
  const startCol = parseInt(start.slice(1)) - 1;
  const endRow = end.charCodeAt(0) - 65;
  const endCol = parseInt(end.slice(1)) - 1;

  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);
  const minCol = Math.min(startCol, endCol);
  const maxCol = Math.max(startCol, endCol);

  const result = new Set<string>();
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      if (r < meta.rows && c < meta.cols) {
        result.add(`${String.fromCharCode(65 + r)}${c + 1}`);
      }
    }
  }
  return result;
}