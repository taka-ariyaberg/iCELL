/** Generate the iCELL input CSVs (cell_layout.csv, dye_layout.csv,
 *  meta_dye.csv) from in-memory plate state.
 *
 *  These produce the exact same shape the engine consumes when read
 *  from `data/input/`. See `data/templates/` for the empty-template
 *  versions.
 */

import { PlateExportData, getPlateDimensions } from './plateLayout';

export function generateCellLayout(data: PlateExportData): string {
  const { plateType, wells, groups = {} } = data;
  const { rows, cols } = getPlateDimensions(plateType);

  const letters = Array.from({ length: rows }, (_, i) => String.fromCharCode(65 + i));
  const header = ['row_name', ...Array.from({ length: cols }, (_, i) => String(i + 1))];
  const lines = [header.join(',')];

  for (const letter of letters) {
    const rowValues = [letter];
    for (let col = 1; col <= cols; col++) {
      const well = `${letter}${col}`;
      const group = wells[well];
      const density = group && groups[group] ? groups[group].density : '';
      rowValues.push(String(density));
    }
    lines.push(rowValues.join(','));
  }

  return lines.join('\n') + '\n';
}

export function generateDyeLayout(data: PlateExportData): string {
  const { plateType, dyePrograms = {} } = data;
  const { rows, cols } = getPlateDimensions(plateType);

  const letters = Array.from({ length: rows }, (_, i) => String.fromCharCode(65 + i));
  const header = ['row_name', ...Array.from({ length: cols }, (_, i) => String(i + 1))];
  const lines = [header.join(',')];

  for (const letter of letters) {
    const rowValues = [letter];
    for (let col = 1; col <= cols; col++) {
      const well = `${letter}${col}`;
      const dye = dyePrograms[well];
      rowValues.push(dye || '');
    }
    lines.push(rowValues.join(','));
  }

  return lines.join('\n') + '\n';
}

/** Accepts the camelCase DyeProgram shape stored in sessionStorage by
 *  ConfigPage; the engine expects snake_case column names in the CSV. */
export function generateMetaDye(
  dyePrograms: Array<{
    name: string;
    dyes: Array<{
      dyeName: string;
      stockConcentration: number;
      stockUnit: string;
      finalConcentration: number;
      finalUnit: string;
    }>;
  }>,
): string {
  let csv =
    'dye_program,dye_name,stock_concentration,stock_concentration_unit,final_concentration,final_concentration_unit\n';

  dyePrograms.forEach((program) => {
    if (program && program.dyes && Array.isArray(program.dyes)) {
      program.dyes.forEach((dye) => {
        csv += `${program.name},${dye.dyeName},${dye.stockConcentration},${dye.stockUnit},${dye.finalConcentration},${dye.finalUnit}\n`;
      });
    }
  });

  return csv;
}