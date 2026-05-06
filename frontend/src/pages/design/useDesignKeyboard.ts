import { useEffect } from 'react';
import { usePlateStore } from '../../store/plateStore';

interface DesignKeyboardOptions {
  /** When false, all shortcuts are no-ops (e.g. results page is active). */
  isActive: boolean;
  selectedWells: Set<string>;
  groups: Record<string, unknown>;
  designMode: 'cells' | 'dyes';
  mode: 'no_dye' | 'dye';
  clearSelection: () => void;
  selectAll: () => void;
  setDesignMode: (next: 'cells' | 'dyes' | ((prev: 'cells' | 'dyes') => 'cells' | 'dyes')) => void;
  openGroupModal: () => void;
  openDyeModal: () => void;
}

/** Wires up the Design page keyboard shortcuts.
 *
 * Shortcuts:
 *   ⌘/Ctrl+Z         — undo (skipped while focused in an input)
 *   ⌘/Ctrl+Shift+Z   — redo
 *   ⌘/Ctrl+G         — open Assign-to-Group modal (cells mode, with selection)
 *   ⌘/Ctrl+P         — open Assign-Dye-Program modal (dyes mode, with selection)
 *   ⌘/Ctrl+A         — select all (skipped while focused in an input)
 *   ⌘/Ctrl+D         — clear selection (skipped while focused in an input)
 *   ⌘/Ctrl+M         — toggle Cells / Dyes design mode (only when mode === 'dye')
 *
 * Undo/redo call into `usePlateStore.getState()` directly so the listener
 * doesn't need to be re-bound when those action references change.
 */
export function useDesignKeyboard({
  isActive,
  selectedWells,
  groups,
  designMode,
  mode,
  clearSelection,
  selectAll,
  setDesignMode,
  openGroupModal,
  openDyeModal,
}: DesignKeyboardOptions): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isActive) return;
      const inInput = document.activeElement instanceof HTMLInputElement ||
                      document.activeElement instanceof HTMLTextAreaElement ||
                      document.activeElement instanceof HTMLSelectElement;
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        if (inInput) return; // let the browser handle native undo in inputs
        e.preventDefault();
        usePlateStore.getState().undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        if (inInput) return;
        e.preventDefault();
        usePlateStore.getState().redo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        e.preventDefault();
        if (selectedWells.size > 0 && designMode === 'cells') {
          openGroupModal();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        if (selectedWells.size > 0 && designMode === 'dyes') {
          openDyeModal();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        if (inInput) return; // let browser select-all in the input
        e.preventDefault();
        selectAll();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        if (inInput) return;
        e.preventDefault();
        clearSelection();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
        e.preventDefault();
        if (mode === 'dye') {
          setDesignMode(prev => prev === 'cells' ? 'dyes' : 'cells');
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isActive, selectedWells, groups, designMode, mode, clearSelection, selectAll, setDesignMode, openGroupModal, openDyeModal]);
}