import { describe, it, expect } from 'vitest';
import { formatConcentration, cellDispenseUl, computeConfirmWarnings } from './confirmSummary';
import type { GroupDefinition } from '../../store/plateStore';

const group = (over: Partial<GroupDefinition> = {}): GroupDefinition => ({
  name: 'G', density: 500, cellLine: 'HeLa', modification: 'WT', passage: 'P1', viability: 95, ...over,
});

describe('formatConcentration', () => {
  it('renders large values in ×10ⁿ form', () => {
    expect(formatConcentration(5_000_000)).toBe('5.0×10⁶/mL');
    expect(formatConcentration(12_500)).toBe('1.3×10⁴/mL');
    expect(formatConcentration(1_000)).toBe('1.0×10³/mL');
  });
  it('renders small values plainly', () => {
    expect(formatConcentration(500)).toBe('500/mL');
  });
  it('is defensive on non-positive / non-finite input', () => {
    expect(formatConcentration(0)).toBe('0/mL');
    expect(formatConcentration(NaN)).toBe('NaN/mL');
  });
});

describe('cellDispenseUl', () => {
  it('is the full well volume without dye', () => {
    expect(cellDispenseUl(40, 'no_dye')).toBe(40);
  });
  it('is half the well volume in dye mode', () => {
    expect(cellDispenseUl(40, 'dye')).toBe(20);
  });
});

describe('computeConfirmWarnings', () => {
  const base = {
    groupCounts: { A: 12 },
    mode: 'no_dye' as const,
    finalWellVolumeUl: 40,
    stockCellConcentration: 5_000_000,
  };

  it('returns nothing when the run is clean', () => {
    expect(computeConfirmWarnings({ ...base, groups: { A: group() } })).toEqual([]);
  });

  it('warns when required concentration exceeds stock', () => {
    // density 500, dispense 40µL -> required 12,500/mL; stock 10,000/mL is too low
    const out = computeConfirmWarnings({
      ...base, stockCellConcentration: 10_000, groups: { A: group() },
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toContain('exceeds stock');
  });

  it('accounts for the dye-mode 50/50 split when checking feasibility', () => {
    // dye mode halves dispense (20µL) -> required doubles to 25,000/mL
    const clean = computeConfirmWarnings({ ...base, stockCellConcentration: 20_000, groups: { A: group() } });
    const overDye = computeConfirmWarnings({
      ...base, mode: 'dye', stockCellConcentration: 20_000, groups: { A: group() },
    });
    expect(clean).toEqual([]);
    expect(overDye.some((w) => w.includes('exceeds stock'))).toBe(true);
  });

  it('warns when viability is unset', () => {
    const out = computeConfirmWarnings({ ...base, groups: { A: group({ viability: undefined }) } });
    expect(out).toEqual(['"A" viability not set (recorded as 0 in iMETA)']);
  });

  it('treats a genuine 0% viability as set (no warning)', () => {
    expect(computeConfirmWarnings({ ...base, groups: { A: group({ viability: 0 }) } })).toEqual([]);
  });

  it('ignores groups with no wells assigned', () => {
    const out = computeConfirmWarnings({
      ...base,
      groupCounts: { A: 0 },
      stockCellConcentration: 10_000, // would warn if the group counted
      groups: { A: group({ viability: undefined }) },
    });
    expect(out).toEqual([]);
  });

  it('reports warnings in group-name order', () => {
    const out = computeConfirmWarnings({
      ...base,
      groupCounts: { Zeta: 4, Alpha: 4 },
      groups: { Zeta: group({ viability: undefined }), Alpha: group({ viability: undefined }) },
    });
    expect(out).toEqual([
      '"Alpha" viability not set (recorded as 0 in iMETA)',
      '"Zeta" viability not set (recorded as 0 in iMETA)',
    ]);
  });
});
