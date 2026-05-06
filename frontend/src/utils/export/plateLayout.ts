/** Shared types and helpers describing a plate's geometry and per-well
 * assignments for the export pipeline. Both the SVG and CSV exporters
 * import from here. */

export interface PlateExportData {
  plateType: string;
  wells: Record<string, string>;
  groups?: Record<string, { density: number }>;
  dyePrograms?: Record<string, string>;
}

/** Map a `plateType` string ("96", "384", "5,24", ...) to row/col counts. */
export function getPlateDimensions(plateType: string): { rows: number; cols: number } {
  const plateSizeMap: Record<string, { rows: number; cols: number }> = {
    '6': { rows: 2, cols: 3 },
    '12': { rows: 3, cols: 4 },
    '24': { rows: 4, cols: 6 },
    '48': { rows: 6, cols: 8 },
    '96': { rows: 8, cols: 12 },
    '384': { rows: 16, cols: 24 },
    '1536': { rows: 32, cols: 48 },
  };

  if (plateSizeMap[plateType]) {
    return plateSizeMap[plateType];
  }

  if (plateType.includes(',')) {
    const [r, c] = plateType.split(',').map(Number);
    return { rows: r, cols: c };
  }

  return { rows: 8, cols: 12 }; // default to 96-well
}