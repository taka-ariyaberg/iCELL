/** Barrel re-export for the export pipeline.
 *
 * The actual implementations live in five focused modules:
 *
 * - `plateLayout.ts`      — shared types and `getPlateDimensions`.
 * - `colorPalette.ts`     — `generateColors`, `generateDyeColor`.
 * - `svgExport.ts`        — `generateLayoutSVG`, `generateDyeSVG`.
 * - `pngExport.ts`        — `generateLayoutPNG`, `generateDyePNG`.
 * - `csvLayoutExport.ts`  — `generateCellLayout`, `generateDyeLayout`,
 *                           `generateMetaDye`.
 * - `downloadFile.ts`     — `downloadFile`.
 *
 * This file exists so existing imports of the form
 *   `import { downloadFile } from '../utils/exportUtils'`
 * keep working without churn. Prefer importing from the focused
 * modules directly in new code.
 */

export type { PlateExportData } from './plateLayout';
export { getPlateDimensions } from './plateLayout';

export { generateColors, generateDyeColor } from './colorPalette';

export { generateLayoutSVG, generateDyeSVG } from './svgExport';
export { generateLayoutPNG, generateDyePNG } from './pngExport';

export {
  generateCellLayout,
  generateDyeLayout,
  generateMetaDye,
} from './csvLayoutExport';

export { downloadFile } from './downloadFile';