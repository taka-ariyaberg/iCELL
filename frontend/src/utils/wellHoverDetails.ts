/** Build the per-well hover-detail line lists shown on the results-page
 *  plate viewers, plus the compact value-label strings rendered inline
 *  on each well.
 *
 *  Pure transformations over the engine's seeding/dye summaries — no
 *  React state. Lives in utils/ rather than the component file so the
 *  data pipeline can be tested independently of the JSX.
 */

const stripPlatePrefix = (well: string) => well.replace(/^P\d+-/, '');

interface BuildCellHoverDetailsInput {
  seedingSummary: Record<string, unknown>[];
  wells: Record<string, string>;
  numPlates: number;
  currentPlate: number;
}

export function buildCellWellHoverDetails({
  seedingSummary,
  wells,
  numPlates,
  currentPlate,
}: BuildCellHoverDetailsInput): Record<string, string[]> {
  const hoverDetails: Record<string, string[]> = {};
  const currentPlatePrefix = `P${currentPlate}-`;

  seedingSummary.forEach((row) => {
    const rawWells = String(row.wells ?? '').split(',').map((w) => w.trim()).filter(Boolean);
    const dispensePerWell = Number(row.cell_suspension_dispense_ul_per_well);

    rawWells.forEach((rawWell) => {
      if (numPlates > 1 && !rawWell.startsWith(currentPlatePrefix)) return;
      const well = stripPlatePrefix(rawWell);
      const groupName = wells[well] ?? `${Number(row.cells_per_well).toLocaleString()} cells/well`;
      hoverDetails[well] = [
        well,
        groupName,
        `Dispense: ${dispensePerWell.toFixed(1)} µL cell suspension`,
      ];
    });
  });

  return hoverDetails;
}

interface BuildDyeHoverDetailsInput {
  wells: Record<string, string>;
  dyePrograms: Record<string, string>;
  dyeSummary?: Record<string, unknown>[];
}

export function buildDyeWellHoverDetails({
  wells,
  dyePrograms,
  dyeSummary,
}: BuildDyeHoverDetailsInput): Record<string, string[]> {
  const hoverDetails: Record<string, string[]> = {};
  const dyeDispenseByProgram = new Map<string, number>();

  (dyeSummary ?? []).forEach((row) => {
    const program = String(row.dye_program ?? '');
    if (!program) return;
    dyeDispenseByProgram.set(program, Number(row.mastermix_dispense_ul_per_well));
  });

  Object.entries(wells).forEach(([well, groupName]) => {
    const dyeProgram = dyePrograms[well];
    const lines = [well, groupName];
    if (dyeProgram) {
      lines.push(dyeProgram);
      const dispense = dyeDispenseByProgram.get(dyeProgram);
      if (dispense !== undefined) {
        lines.push(`Dispense: ${dispense.toFixed(1)} µL dye mastermix`);
      }
    } else {
      lines.push('No dye');
    }
    hoverDetails[well] = lines;
  });

  return hoverDetails;
}

/** Extract the compact "{value}" labels for inline rendering on wells from
 *  the longer hover-detail line lists. */
export function extractValueLabels(
  hoverDetails: Record<string, string[]>,
  unitSuffix: string,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(hoverDetails).map(([well, lines]) => {
      const dispenseLine = lines.find((line) => line.startsWith('Dispense: '));
      return [well, dispenseLine ? dispenseLine.replace('Dispense: ', '').replace(unitSuffix, '') : ''];
    }),
  );
}