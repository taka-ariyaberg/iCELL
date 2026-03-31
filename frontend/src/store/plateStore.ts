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

export const usePlateStore = create<PlateState>((set, get) => ({
  plateType: '96',
  wells: {},
  selectedWells: new Set(),
  groups: {},
  dyePrograms: {},
  history: [],
  future: [],

  setPlateType: (type) =>
    set((state) => ({
      ...pushHistory(state),
      plateType: type,
      wells: {},
      selectedWells: new Set(),
      groups: {},
      dyePrograms: {},
    })),
  
  setWellGroup: (well, group) =>
    set((state) => ({
      ...pushHistory(state),
      wells: { ...state.wells, [well]: group },
    })),
  
  setMultipleWells: (wells) =>
    set((state) => ({
      ...pushHistory(state),
      wells: { ...state.wells, ...wells },
    })),
  
  clearWells: () =>
    set((state) => ({
      ...pushHistory(state),
      wells: {},
      selectedWells: new Set(),
      groups: {},
      dyePrograms: {},
    })),

  /**
   * Helper: Remove empty groups and renumber remaining groups
   */
  cleanupEmptyGroups: () =>
    set((state) => {
      const assignedGroups = new Set(Object.values(state.wells));
      const cleanedGroups = { ...state.groups };
      Object.keys(cleanedGroups).forEach(groupName => {
        if (!assignedGroups.has(groupName)) delete cleanedGroups[groupName];
      });
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
    set((state) => ({
      ...pushHistory(state),
      groups: { ...state.groups, [groupName]: { name: groupName, density } },
    })),

  assignWellsToGroup: (groupName, density, wellsToAssign) =>
    set((state) => ({
      ...pushHistory(state),
      groups: { ...state.groups, [groupName]: { name: groupName, density } },
      wells: { ...state.wells, ...wellsToAssign },
      selectedWells: new Set(),
    })),
  
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
