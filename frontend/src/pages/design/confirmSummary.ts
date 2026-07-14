import type { GroupDefinition } from '../../store/plateStore';

const SUPERSCRIPT: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻',
};

const toSuperscript = (n: number): string =>
  String(n).split('').map((c) => SUPERSCRIPT[c] ?? c).join('');

/** Compact cells/mL for display: "5.0×10⁶/mL" for large values, plain otherwise. */
export function formatConcentration(cellsPerMl: number): string {
  if (!Number.isFinite(cellsPerMl) || cellsPerMl <= 0) return `${cellsPerMl}/mL`;
  const exp = Math.floor(Math.log10(cellsPerMl));
  if (exp < 3) return `${Math.round(cellsPerMl).toLocaleString()}/mL`;
  const mantissa = cellsPerMl / 10 ** exp;
  return `${mantissa.toFixed(1)}×10${toSuperscript(exp)}/mL`;
}

/** Per-well cell-suspension dispense volume (µL); dye mode splits the well 50/50. */
export function cellDispenseUl(finalWellVolumeUl: number, mode: 'no_dye' | 'dye'): number {
  return mode === 'dye' ? finalWellVolumeUl / 2 : finalWellVolumeUl;
}

export interface ConfirmWarningInput {
  groups: Record<string, GroupDefinition>;
  groupCounts: Record<string, number>;
  mode: 'no_dye' | 'dye';
  finalWellVolumeUl: number;
  stockCellConcentration: number;
}

/**
 * Pre-flight checks for the Confirm Process modal.
 *
 * Returns one message per actionable problem; an empty array means the run looks
 * clean (so the modal shows no warning lines in the normal case). Only groups
 * that actually have wells assigned are considered — unused groups are not sent
 * to the backend and would be noise here.
 */
export function computeConfirmWarnings({
  groups,
  groupCounts,
  mode,
  finalWellVolumeUl,
  stockCellConcentration,
}: ConfirmWarningInput): string[] {
  const warnings: string[] = [];
  const dispense = cellDispenseUl(finalWellVolumeUl, mode);

  for (const name of Object.keys(groups).sort((a, b) => a.localeCompare(b))) {
    if ((groupCounts[name] || 0) === 0) continue;
    const def = groups[name];

    // Feasibility: required suspension concentration must not exceed stock,
    // else the engine hard-errors ("Target concentration cannot be greater than stock").
    if (dispense > 0 && stockCellConcentration > 0) {
      const required = (def.density * 1000) / dispense; // cells/mL
      if (required > stockCellConcentration) {
        warnings.push(
          `"${name}" needs ${formatConcentration(required)} — exceeds stock ${formatConcentration(stockCellConcentration)}`,
        );
      }
    }

    // iMETA data quality: an unset viability is recorded as 0.
    if (def.viability === undefined || def.viability === null || Number.isNaN(def.viability)) {
      warnings.push(`"${name}" viability not set (recorded as 0 in iMETA)`);
    }
  }

  return warnings;
}
