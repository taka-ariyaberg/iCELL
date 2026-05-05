import { create } from 'zustand';

export interface GroupDefinition {
  name: string; // e.g. "Group 1", "Control", etc
  density: number; // cells per well
}

interface Snapshot {
  wells: Record<string, string>;
  groups: Record<string, GroupDefinition>;
  dyePrograms: Record<string, string>;
}

export class GroupNameCollisionError extends Error {
  constructor(collidingName: string) {
    super(`A group named "${collidingName}" already exists`);
    this.name = 'GroupNameCollisionError';
  }
}

export interface PlateState {
  plateType: string; // '96', '384', '1536', or custom 'rows,cols'
  wells: Record<string, string>; // { "A1": "Group 1", "A2": "Group 2", ... }
  selectedWells: Set<string>;
  groups: Record<string, GroupDefinition>; // { "Group 1": { name: "Group 1", density: 500 }, ... }
  dyePrograms: Record<string, string>; // { "A1": "CP_A", ... }
  history: Snapshot[];
  future: Snapshot[];

  setPlateType: (type: string) => void;
  setWellGroup: (well: string, group: string) => void;
  setMultipleWells: (wells: Record<string, string>) => void;
  clearWells: () => void;
  cleanupEmptyGroups: () => void; // Remove empty groups and renumber

  toggleWell: (well: string) => void; // Click: if assigned, remove from group; else toggle selection
  selectWell: (well: string) => void; // Add to selection
  deselectWell: (well: string) => void; // Remove from selection
  selectWellRange: (start: string, end: string) => void; // Add range to selection
  selectWellRangeNoHistory: (start: string, end: string) => void;
  deselectWellRange: (start: string, end: string) => void; // Remove range from selection AND unassign from groups
  deselectWellRangeNoHistory: (start: string, end: string) => void;
  deselectRangeSelectionOnly: (start: string, end: string) => void; // Remove range from selection only (no group/dye mutation)
  deselectRangeSelectionOnlyNoHistory: (start: string, end: string) => void;
  selectAll: () => void; // Select all wells in the plate
  clearSelection: () => void;
  captureSnapshot: () => void; // Push current state to history without any other change

  createOrUpdateGroup: (groupName: string, density: number) => void; // Create group with seeding density
  getActiveGroups: () => string[]; // Get groups that have wells assigned
  /** Atomic: assign wells to a group in one undo step, restoring previous selection on undo */
  assignWellsToGroup: (groupName: string, density: number, wellsToAssign: Record<string, string>) => void;
  /** Atomic rename: re-keys the group, updates GroupDefinition.name, rewrites referencing wells. */
  renameGroup: (oldName: string, newName: string) => void;
  /** Update the density of an existing group. No-op + console.error if the group is missing. */
  updateGroupDensity: (name: string, density: number) => void;

  setDyeProgram: (well: string, program: string) => void;
  setMultipleDyePrograms: (programs: Record<string, string>) => void;
  clearDyeProgram: (well: string) => void;
  clearDyeProgramRange: (start: string, end: string) => void;
  clearDyeProgramRangeNoHistory: (start: string, end: string) => void;
  /** Atomic: assign dye programs to multiple wells in one undo step */
  assignDyePrograms: (programs: Record<string, string>) => void;

  undo: () => void;
  redo: () => void;
}

const MAX_HISTORY = 50;

/** Call this at the top of any set() callback that mutates wells/groups/dyePrograms */
function pushHistory(state: PlateState): Pick<PlateState, 'history' | 'future'> {
  const snap: Snapshot = { wells: state.wells, groups: state.groups, dyePrograms: state.dyePrograms };
  return {
    history: [...state.history.slice(-(MAX_HISTORY - 1)), snap],
    future: [],
  };
}

/**
 * Defensive guard: every value in `wells` must be a key in `groups`.
 *
 * The pre-existing `App.tsx:64` fallback (`groups[g]?.density || 500`) intentionally
 * substitutes 500 when a group is missing — that is a designed safety net for a default
 * cell density. This guard exists so the safety net is never silently triggered by a bug.
 * Violations log only; they do not throw or block the UI.
 */
export function assertGroupsWellsInvariant(state: Pick<PlateState, 'wells' | 'groups'>): void {
  const groupKeys = new Set(Object.keys(state.groups));
  const orphans: Array<{ well: string; missingGroup: string }> = [];
  for (const [well, groupName] of Object.entries(state.wells)) {
    if (!groupKeys.has(groupName)) {
      orphans.push({ well, missingGroup: groupName });
    }
  }
  if (orphans.length > 0) {
    console.error('[plateStore] invariant violated: orphan well→group references', orphans);
  }
}

export const usePlateStore = create<PlateState>((set, get) => ({
  plateType: '96',
  wells: {},
  selectedWells: new Set(),
  groups: {},
  dyePrograms: {},
  history: [],
  future: [],

  setPlateType: (type) =>
    set((state) => {
      assertGroupsWellsInvariant({ groups: {}, wells: {} });
      return {
        ...pushHistory(state),
        plateType: type,
        wells: {},
        selectedWells: new Set(),
        groups: {},
        dyePrograms: {},
      };
    }),
  
  setWellGroup: (well, group) =>
    set((state) => {
      const nextWells = { ...state.wells, [well]: group };
      assertGroupsWellsInvariant({ groups: state.groups, wells: nextWells });
      return {
        ...pushHistory(state),
        wells: nextWells,
      };
    }),
  
  setMultipleWells: (wells) =>
    set((state) => {
      const nextWells = { ...state.wells, ...wells };
      assertGroupsWellsInvariant({ groups: state.groups, wells: nextWells });
      return {
        ...pushHistory(state),
        wells: nextWells,
      };
    }),
  
  clearWells: () =>
    set((state) => {
      assertGroupsWellsInvariant({ groups: {}, wells: {} });
      return {
        ...pushHistory(state),
        wells: {},
        selectedWells: new Set(),
        groups: {},
        dyePrograms: {},
      };
    }),

  /**
   * Helper: Remove empty groups and renumber remaining groups
   */
  cleanupEmptyGroups: () =>
    set((state) => {
      const assignedGroups = new Set(Object.values(state.wells));
      const cleanedGroups = { ...state.groups };
      Object.keys(cleanedGroups).forEach((groupName) => {
        if (!assignedGroups.has(groupName)) delete cleanedGroups[groupName];
      });
      assertGroupsWellsInvariant({ groups: cleanedGroups, wells: state.wells });
      return { ...pushHistory(state), groups: cleanedGroups };
    }),
  
  toggleWell: (well) =>
    set((state) => {
      const wellGroup = state.wells[well];
      
      if (wellGroup) {
        const newWells = { ...state.wells };
        const newDyePrograms = { ...state.dyePrograms };
        delete newWells[well];
        delete newDyePrograms[well];
        const newSelection = new Set(state.selectedWells);
        newSelection.delete(well);
        const remainingWells = Object.values(newWells).filter(g => g === wellGroup);
        const cleanedGroups = { ...state.groups };
        if (remainingWells.length === 0) delete cleanedGroups[wellGroup];
        assertGroupsWellsInvariant({ groups: cleanedGroups, wells: newWells });
        return {
          ...pushHistory(state),
          wells: newWells,
          dyePrograms: newDyePrograms,
          selectedWells: newSelection,
          groups: cleanedGroups,
        };
      }
      
      // If well is not assigned, toggle selection
      const newSelection = new Set(state.selectedWells);
      if (newSelection.has(well)) {
        newSelection.delete(well);
      } else {
        newSelection.add(well);
      }
      return { selectedWells: newSelection };
    }),
  
  selectWell: (well) =>
    set((state) => {
      const newSelection = new Set(state.selectedWells);
      newSelection.add(well);
      return { selectedWells: newSelection };
    }),
  
  deselectWell: (well) =>
    set((state) => {
      const newSelection = new Set(state.selectedWells);
      newSelection.delete(well);
      return { selectedWells: newSelection };
    }),
  
  selectWellRange: (start, end) =>
    set((state) => {
      const newRange = getWellRange(start, end, state.plateType);
      const mergedSelection = new Set(state.selectedWells);
      newRange.forEach(well => mergedSelection.add(well));
      return { selectedWells: mergedSelection };
    }),
  
  deselectWellRange: (start, end) =>
    set((state) => {
      const rangeToRemove = getWellRange(start, end, state.plateType);
      const newSelection = new Set(state.selectedWells);
      const newWells = { ...state.wells };
      const newDyePrograms = { ...state.dyePrograms };
      const cleanedGroups = { ...state.groups };
      
      rangeToRemove.forEach(well => {
        newSelection.delete(well);
        const wellGroup = newWells[well];
        delete newWells[well];
        delete newDyePrograms[well];
        if (wellGroup) {
          const remainingWells = Object.values(newWells).filter(g => g === wellGroup);
          if (remainingWells.length === 0) delete cleanedGroups[wellGroup];
        }
      });
      
      assertGroupsWellsInvariant({ groups: cleanedGroups, wells: newWells });
      return {
        ...pushHistory(state),
        selectedWells: newSelection,
        wells: newWells,
        dyePrograms: newDyePrograms,
        groups: cleanedGroups,
      };
    }),

  selectAll: () =>
    set((state) => {
      const allWells = getWellRange(
        `A1`,
        (() => {
          const meta: Record<string, { rows: number; cols: number }> = {
            '6': { rows: 2, cols: 3 }, '12': { rows: 3, cols: 4 },
            '24': { rows: 4, cols: 6 }, '48': { rows: 6, cols: 8 },
            '96': { rows: 8, cols: 12 }, '384': { rows: 16, cols: 24 },
            '1536': { rows: 32, cols: 48 },
          };
          let m = meta[state.plateType];
          if (!m && state.plateType.includes(',')) {
            const [r, c] = state.plateType.split(',').map(Number);
            m = { rows: r, cols: c };
          }
          if (!m) m = { rows: 8, cols: 12 };
          return `${String.fromCharCode(65 + m.rows - 1)}${m.cols}`;
        })(),
        state.plateType
      );
      return { selectedWells: allWells };
    }),

  deselectRangeSelectionOnly: (start, end) =>
    set((state) => {
      const rangeToRemove = getWellRange(start, end, state.plateType);
      const newSelection = new Set(state.selectedWells);
      rangeToRemove.forEach(well => newSelection.delete(well));
      return { selectedWells: newSelection };
    }),

  selectWellRangeNoHistory: (start, end) =>
    set((state) => {
      const newRange = getWellRange(start, end, state.plateType);
      const merged = new Set(state.selectedWells);
      newRange.forEach(w => merged.add(w));
      return { selectedWells: merged };
    }),

  deselectWellRangeNoHistory: (start, end) =>
    set((state) => {
      const range = getWellRange(start, end, state.plateType);
      const newSelection = new Set(state.selectedWells);
      const newWells = { ...state.wells };
      const newDyePrograms = { ...state.dyePrograms };
      const cleanedGroups = { ...state.groups };
      range.forEach(well => {
        newSelection.delete(well);
        const wellGroup = newWells[well];
        delete newWells[well];
        delete newDyePrograms[well];
        if (wellGroup) {
          const remaining = Object.values(newWells).filter(g => g === wellGroup);
          if (remaining.length === 0) delete cleanedGroups[wellGroup];
        }
      });
      assertGroupsWellsInvariant({ groups: cleanedGroups, wells: newWells });
      return { selectedWells: newSelection, wells: newWells, dyePrograms: newDyePrograms, groups: cleanedGroups };
    }),

  deselectRangeSelectionOnlyNoHistory: (start, end) =>
    set((state) => {
      const range = getWellRange(start, end, state.plateType);
      const newSelection = new Set(state.selectedWells);
      range.forEach(w => newSelection.delete(w));
      return { selectedWells: newSelection };
    }),

  clearDyeProgramRangeNoHistory: (start, end) =>
    set((state) => {
      const range = getWellRange(start, end, state.plateType);
      const newDyePrograms = { ...state.dyePrograms };
      range.forEach(w => delete newDyePrograms[w]);
      return { dyePrograms: newDyePrograms };
    }),

  captureSnapshot: () =>
    set((state) => ({ ...pushHistory(state) })),

  clearSelection: () =>
    set({
      selectedWells: new Set(),
    }),
  
  createOrUpdateGroup: (groupName, density) =>
    set((state) => {
      const nextGroups = { ...state.groups, [groupName]: { name: groupName, density } };
      assertGroupsWellsInvariant({ groups: nextGroups, wells: state.wells });
      return {
        ...pushHistory(state),
        groups: nextGroups,
      };
    }),

  assignWellsToGroup: (groupName, density, wellsToAssign) =>
    set((state) => {
      const nextGroups = { ...state.groups, [groupName]: { name: groupName, density } };
      const nextWells = { ...state.wells, ...wellsToAssign };
      assertGroupsWellsInvariant({ groups: nextGroups, wells: nextWells });
      return {
        ...pushHistory(state),
        groups: nextGroups,
        wells: nextWells,
        selectedWells: new Set(),
      };
    }),

  renameGroup: (oldName, newName) => {
    if (newName === oldName) return;
    const trimmed = newName.trim();
    if (!trimmed) {
      throw new Error('Group name cannot be empty');
    }
    const state = get();
    if (!state.groups[oldName]) {
      console.error('[plateStore] renameGroup: source group not found', oldName);
      return;
    }
    if (state.groups[trimmed] && trimmed !== oldName) {
      throw new GroupNameCollisionError(trimmed);
    }
    set((s) => {
      const nextGroups: Record<string, GroupDefinition> = {};
      for (const [key, def] of Object.entries(s.groups)) {
        if (key === oldName) {
          nextGroups[trimmed] = { ...def, name: trimmed };
        } else {
          nextGroups[key] = def;
        }
      }
      const nextWells: Record<string, string> = {};
      for (const [well, group] of Object.entries(s.wells)) {
        nextWells[well] = group === oldName ? trimmed : group;
      }
      const next = {
        ...pushHistory(s),
        groups: nextGroups,
        wells: nextWells,
      };
      assertGroupsWellsInvariant({ groups: nextGroups, wells: nextWells });
      return next;
    });
  },

  updateGroupDensity: (name, density) => {
    const state = get();
    if (!state.groups[name]) {
      console.error('[plateStore] updateGroupDensity: group not found', name);
      return;
    }
    set((s) => {
      const nextGroups = {
        ...s.groups,
        [name]: { ...s.groups[name], density },
      };
      const next = {
        ...pushHistory(s),
        groups: nextGroups,
      };
      assertGroupsWellsInvariant({ groups: nextGroups, wells: s.wells });
      return next;
    });
  },

  getActiveGroups: () => {
    const state = get();
    const assignedGroups = new Set(Object.values(state.wells));
    return Array.from(assignedGroups)
      .filter(group => group !== 'Unassigned')
      .sort();
  },
  
  setDyeProgram: (well, program) =>
    set((state) => ({
      ...pushHistory(state),
      dyePrograms: { ...state.dyePrograms, [well]: program },
    })),
  
  setMultipleDyePrograms: (programs) =>
    set((state) => ({
      ...pushHistory(state),
      dyePrograms: { ...state.dyePrograms, ...programs },
    })),

  clearDyeProgram: (well) =>
    set((state) => {
      const newDyePrograms = { ...state.dyePrograms };
      delete newDyePrograms[well];
      return { ...pushHistory(state), dyePrograms: newDyePrograms };
    }),

  clearDyeProgramRange: (start, end) =>
    set((state) => {
      const range = getWellRange(start, end, state.plateType);
      const newDyePrograms = { ...state.dyePrograms };
      range.forEach(well => delete newDyePrograms[well]);
      return { ...pushHistory(state), dyePrograms: newDyePrograms };
    }),

  assignDyePrograms: (programs) =>
    set((state) => ({
      ...pushHistory(state),
      dyePrograms: { ...state.dyePrograms, ...programs },
      selectedWells: new Set(),
    })),

  undo: () =>
    set((state) => {
      if (state.history.length === 0) return state;
      const prev = state.history[state.history.length - 1];
      const snap: Snapshot = { wells: state.wells, groups: state.groups, dyePrograms: state.dyePrograms };
      return {
        ...prev,
        selectedWells: new Set(),
        history: state.history.slice(0, -1),
        future: [snap, ...state.future.slice(0, MAX_HISTORY - 1)],
      };
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const snap: Snapshot = { wells: state.wells, groups: state.groups, dyePrograms: state.dyePrograms };
      return {
        ...next,
        selectedWells: new Set(),
        history: [...state.history.slice(-(MAX_HISTORY - 1)), snap],
        future: state.future.slice(1),
      };
    }),
}));

// Helper to calculate well range
function getWellRange(start: string, end: string, plateType: string): Set<string> {
  const plateMeta: Record<string, { rows: number; cols: number }> = {
    '6': { rows: 2, cols: 3 },
    '12': { rows: 3, cols: 4 },
    '24': { rows: 4, cols: 6 },
    '48': { rows: 6, cols: 8 },
    '96': { rows: 8, cols: 12 },
    '384': { rows: 16, cols: 24 },
    '1536': { rows: 32, cols: 48 },
  };

  let meta = plateMeta[plateType];
  
  // Handle custom plate format like "rows,cols"
  if (!meta && plateType.includes(',')) {
    const [rows, cols] = plateType.split(',').map(Number);
    meta = { rows, cols };
  }
  
  if (!meta) {
    meta = { rows: 8, cols: 12 }; // Default to 96-well
  }

  const { rows, cols } = meta;

  const startRow = start.charCodeAt(0) - 65;
  const startCol = parseInt(start.slice(1)) - 1;
  const endRow = end.charCodeAt(0) - 65;
  const endCol = parseInt(end.slice(1)) - 1;

  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);
  const minCol = Math.min(startCol, endCol);
  const maxCol = Math.max(startCol, endCol);

  const wells = new Set<string>();
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      if (r < rows && c < cols) {
        wells.add(`${String.fromCharCode(65 + r)}${c + 1}`);
      }
    }
  }

  return wells;
}
