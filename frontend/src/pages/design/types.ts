/** Shared types, constants, and helpers for the Design page and its modals.
 *
 * `DesignPage.tsx` is the orchestrator; the modal components and the
 * keyboard hook live in this directory and import from this file.
 */

export const SAVED_PROGRAMS_KEY = 'iCELL_savedDyePrograms_v2';

export interface DesignOutput {
  project_name: string;
  plate_id: string;
  seeding_date?: string;
  /** Backend-formatted plate type, e.g. '96_well' or '6,9' */
  plate_type: string;
  num_plates: number;
  mode: 'no_dye' | 'dye';
}

export interface DyeDefinition {
  dyeName: string;
  stockConcentration: number;
  stockUnit: string;
  finalConcentration: number;
  finalUnit: string;
}

export interface DyeProgramDef {
  name: string;
  dyes: DyeDefinition[];
}

export const BLANK_DYE: DyeDefinition = {
  dyeName: '',
  stockConcentration: 0,
  stockUnit: 'uM',
  finalConcentration: 0,
  finalUnit: 'uM',
};

/** Default dye programs — seeded on first load or when no programs exist. */
export const DEFAULT_DYE_PROGRAMS: DyeProgramDef[] = [
  {
    name: 'Revvity_Phenovue',
    dyes: [
      { dyeName: 'PhenoVue Hoechst 33342',         stockConcentration: 1,    stockUnit: 'mg_per_ml', finalConcentration: 100, finalUnit: 'ng_per_ml' },
      { dyeName: 'PhenoVue 488 live cell',         stockConcentration: 200,  stockUnit: 'X',         finalConcentration: 1,   finalUnit: 'X' },
      { dyeName: 'PhenoVue 555/647 live cell mix', stockConcentration: 1000, stockUnit: 'X',         finalConcentration: 1,   finalUnit: 'X' },
    ],
  },
  {
    name: 'CP_FULL',
    dyes: [
      { dyeName: 'Hoechst 33342',        stockConcentration: 10000, stockUnit: 'X', finalConcentration: 1, finalUnit: 'X' },
      { dyeName: 'Concanavalin A',       stockConcentration: 1000,  stockUnit: 'X', finalConcentration: 1, finalUnit: 'X' },
      { dyeName: 'SYTO 14',              stockConcentration: 1000,  stockUnit: 'X', finalConcentration: 1, finalUnit: 'X' },
      { dyeName: 'Phalloidin',           stockConcentration: 1000,  stockUnit: 'X', finalConcentration: 1, finalUnit: 'X' },
      { dyeName: 'WGA',                  stockConcentration: 1000,  stockUnit: 'X', finalConcentration: 1, finalUnit: 'X' },
      { dyeName: 'MitoTracker Deep Red', stockConcentration: 1000,  stockUnit: 'X', finalConcentration: 1, finalUnit: 'X' },
    ],
  },
];

export function parseInitialPlateType(raw: string | undefined) {
  const pt = (raw || '384').replace('_well', '');
  if (pt.includes(',')) {
    const [r, c] = pt.split(',').map(Number);
    return { typeStr: '384', custom: true, rows: r || 16, cols: c || 24 };
  }
  return { typeStr: pt, custom: false, rows: 16, cols: 24 };
}

export function getTodayDateInputValue(): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}