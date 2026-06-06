import { describe, it, expect } from 'vitest';
import { EMPTY_CELL_FORM, isCellFormComplete, cellFormFromGroup, toCellMeta } from './cellMeta';

describe('cellMeta helpers', () => {
  it('EMPTY_CELL_FORM is incomplete', () => {
    expect(isCellFormComplete(EMPTY_CELL_FORM)).toBe(false);
  });
  it('complete only when all four non-empty and viability in 0..100', () => {
    expect(isCellFormComplete({ cellLine: 'HeLa', modification: 'WT', passage: 'P1', viability: 95 })).toBe(true);
    expect(isCellFormComplete({ cellLine: ' ', modification: 'WT', passage: 'P1', viability: 95 })).toBe(false);
    expect(isCellFormComplete({ cellLine: 'HeLa', modification: 'WT', passage: 'P1', viability: null })).toBe(false);
    expect(isCellFormComplete({ cellLine: 'HeLa', modification: 'WT', passage: 'P1', viability: 150 })).toBe(false);
  });
  it('cellFormFromGroup pulls the four fields from a stored group', () => {
    expect(cellFormFromGroup({ name: 'A', density: 500, cellLine: 'HeLa', modification: 'WT', passage: 'P1', viability: 90 }))
      .toEqual({ cellLine: 'HeLa', modification: 'WT', passage: 'P1', viability: 90 });
  });
  it('toCellMeta trims strings and coerces viability to number', () => {
    expect(toCellMeta({ cellLine: ' HeLa ', modification: ' WT ', passage: ' P1 ', viability: 90 }))
      .toEqual({ cellLine: 'HeLa', modification: 'WT', passage: 'P1', viability: 90 });
  });
});
