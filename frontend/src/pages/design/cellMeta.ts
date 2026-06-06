import type { GroupDefinition, CellMeta } from '../../store/plateStore';

/** Form-state shape: viability is null while empty so "not filled" is distinguishable from 0. */
export interface CellForm {
  cellLine: string;
  modification: string;
  passage: string;
  viability: number | null;
}

export const EMPTY_CELL_FORM: CellForm = { cellLine: '', modification: '', passage: '', viability: null };

export function isCellFormComplete(f: CellForm): boolean {
  return (
    f.cellLine.trim() !== '' &&
    f.modification.trim() !== '' &&
    f.passage.trim() !== '' &&
    f.viability !== null &&
    f.viability >= 0 &&
    f.viability <= 100
  );
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
