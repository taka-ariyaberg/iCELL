import { describe, it, expect } from 'vitest';
import { EMPTY_CELL_FORM, isCellFormComplete, cellFormFromGroup, toCellMeta } from './cellMeta';
import { cellFormErrors, densityError, sanitizeInteger, sanitizeDecimal } from './cellMeta';

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

describe('cellFormErrors', () => {
  it('flags each empty/invalid field with a message', () => {
    const e = cellFormErrors({ cellLine: '', modification: ' ', passage: '', viability: null });
    expect(e.cellLine).toBe('Required');
    expect(e.modification).toBe('Required');
    expect(e.passage).toBe('Required');
    expect(e.viability).toBe('Required');
  });
  it('flags out-of-range viability', () => {
    expect(cellFormErrors({ cellLine: 'H', modification: 'WT', passage: 'P1', viability: 150 }).viability).toBe('Must be 0–100');
    expect(cellFormErrors({ cellLine: 'H', modification: 'WT', passage: 'P1', viability: -1 }).viability).toBe('Must be 0–100');
  });
  it('returns no errors for a fully valid form', () => {
    expect(cellFormErrors({ cellLine: 'HeLa', modification: 'WT', passage: 'P1', viability: 95 })).toEqual({});
  });
});

describe('densityError', () => {
  it('requires an integer >= 1', () => {
    expect(densityError(0)).toBe('Must be ≥ 1');
    expect(densityError(-5)).toBe('Must be ≥ 1');
    expect(densityError(NaN)).toBe('Must be ≥ 1');
    expect(densityError(500)).toBeNull();
  });
});

describe('sanitizeInteger', () => {
  it('keeps digits only', () => {
    expect(sanitizeInteger('12a3')).toBe('123');
    expect(sanitizeInteger('1e5')).toBe('15');
    expect(sanitizeInteger('-4.2')).toBe('42');
    expect(sanitizeInteger('abc')).toBe('');
  });
});

describe('sanitizeDecimal', () => {
  it('keeps digits and a single decimal point', () => {
    expect(sanitizeDecimal('9a5')).toBe('95');
    expect(sanitizeDecimal('95.5')).toBe('95.5');
    expect(sanitizeDecimal('9.5.5')).toBe('9.55');
    expect(sanitizeDecimal('1e2')).toBe('12');
    expect(sanitizeDecimal('-3')).toBe('3');
  });
});
