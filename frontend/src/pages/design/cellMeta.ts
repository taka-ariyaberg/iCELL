import type { GroupDefinition, CellMeta } from '../../store/plateStore';

/** Form-state shape: viability is null while empty so "not filled" is distinguishable from 0. */
export interface CellForm {
  cellLine: string;
  modification: string;
  passage: string;
  viability: number | null;
}

export const EMPTY_CELL_FORM: CellForm = { cellLine: '', modification: '', passage: '', viability: null };

export interface CellFormErrors {
  cellLine?: string;
  modification?: string;
  passage?: string;
  viability?: string;
}

export function cellFormErrors(f: CellForm): CellFormErrors {
  const e: CellFormErrors = {};
  if (!f.cellLine.trim()) e.cellLine = 'Required';
  if (!f.modification.trim()) e.modification = 'Required';
  if (!f.passage.trim()) e.passage = 'Required';
  if (f.viability === null) e.viability = 'Required';
  else if (f.viability < 0 || f.viability > 100) e.viability = 'Must be 0–100';
  return e;
}

export function densityError(density: number): string | null {
  return Number.isInteger(density) && density >= 1 ? null : 'Must be ≥ 1';
}

/** Keep digits only — for integer inputs (density). Strips letters, e, +, -, dots. */
export function sanitizeInteger(raw: string): string {
  return raw.replace(/[^0-9]/g, '');
}

/** Keep digits and at most one decimal point — for viability. */
export function sanitizeDecimal(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  return parts.length <= 1 ? cleaned : parts[0] + '.' + parts.slice(1).join('');
}

export function isCellFormComplete(f: CellForm): boolean {
  return Object.keys(cellFormErrors(f)).length === 0;
}

export function cellFormFromGroup(def: GroupDefinition): CellForm {
  return {
    cellLine: def.cellLine ?? '',
    modification: def.modification ?? '',
    passage: def.passage ?? '',
    viability: def.viability ?? null,
  };
}

export function toCellMeta(f: CellForm): CellMeta {
  return {
    cellLine: f.cellLine.trim(),
    modification: f.modification.trim(),
    passage: f.passage.trim(),
    viability: Number(f.viability),
  };
}
