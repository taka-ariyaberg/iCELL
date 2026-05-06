import { AddDyeForm } from './AddDyeForm';
import { BLANK_DYE, DyeDefinition, DyeProgramDef, SAVED_PROGRAMS_KEY } from './types';

interface DyeAssignmentModalProps {
  selectedWellCount: number;
  dyeProgramInput: string;
  /** The setter is wrapped so the caller can reset modalNewDye on change. */
  setDyeProgramInput: (next: string) => void;
  savedPrograms: DyeProgramDef[];
  setSavedPrograms: (next: DyeProgramDef[]) => void;
  savedProgramNames: string[];
  setSavedProgramNames: (next: string[]) => void;
  draft: DyeDefinition;
  setDraft: (next: DyeDefinition) => void;
  /** Close the modal AND advance to the actual assignment step. */
  onAssign: () => void;
  onClose: () => void;
}

/** "Assign N wells to Dye Program" modal, with inline composition editor.
 *
 *  The user can pick an existing program from the datalist + button row,
 *  or type a new program name and define its dyes via `AddDyeForm`.
 *  Submit advances through the unassigned-wells warning if needed.
 */
export const DyeAssignmentModal = ({
  selectedWellCount,
  dyeProgramInput,
  setDyeProgramInput,
  savedPrograms,
  setSavedPrograms,
  savedProgramNames,
  setSavedProgramNames,
  draft,
  setDraft,
  onAssign,
  onClose,
}: DyeAssignmentModalProps) => {
  const currentDyes = savedPrograms.find((p) => p.name === dyeProgramInput)?.dyes || [];

  const addDyeToProgram = () => {
    const canAdd =
      draft.dyeName.trim() !== '' &&
      draft.stockConcentration > 0 &&
      draft.finalConcentration > 0;
    if (!canAdd || !dyeProgramInput) return;
    const updated = savedPrograms.some((p) => p.name === dyeProgramInput)
      ? savedPrograms.map((p) => p.name === dyeProgramInput ? { ...p, dyes: [...p.dyes, draft] } : p)
      : [...savedPrograms, { name: dyeProgramInput, dyes: [draft] }];
    setSavedPrograms(updated);
    setSavedProgramNames(updated.map((p) => p.name));
    localStorage.setItem(SAVED_PROGRAMS_KEY, JSON.stringify(updated));
    setDraft(BLANK_DYE);
  };

  const removeDyeFromProgram = (idx: number) => {
    const updated = savedPrograms.map((p) =>
      p.name === dyeProgramInput ? { ...p, dyes: p.dyes.filter((_, i) => i !== idx) } : p,
    );
    setSavedPrograms(updated);
    localStorage.setItem(SAVED_PROGRAMS_KEY, JSON.stringify(updated));
  };

  const handleAssignDye = () => {
    // Ensure the program exists in savedPrograms (even with no dyes yet).
    if (dyeProgramInput && !savedPrograms.some((p) => p.name === dyeProgramInput)) {
      const updated = [...savedPrograms, { name: dyeProgramInput, dyes: [] }];
      setSavedPrograms(updated);
      setSavedProgramNames(updated.map((p) => p.name));
      localStorage.setItem(SAVED_PROGRAMS_KEY, JSON.stringify(updated));
    }
    onAssign();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); if (dyeProgramInput.trim()) handleAssignDye(); }}
        style={{ maxWidth: '580px', maxHeight: '85vh', overflowY: 'auto' }}
      >
        <h3>Assign {selectedWellCount} Well{selectedWellCount === 1 ? '' : 's'} to Dye Program</h3>
        <div className="modal-form">
          {/* Program name */}
          <div className="form-group">
            <label htmlFor="dye-modal-input">Program Name</label>
            <input
              id="dye-modal-input"
              type="text"
              list="saved-programs-list-modal"
              value={dyeProgramInput}
              onChange={(e) => { setDyeProgramInput(e.target.value.toUpperCase()); setDraft(BLANK_DYE); }}
              onFocus={(e) => e.target.select()}
              placeholder="e.g., CP_A, NUCLEAR, CYTO"
              autoFocus
            />
            <datalist id="saved-programs-list-modal">
              {savedProgramNames.map((n) => <option key={n} value={n} />)}
            </datalist>
          </div>

          {/* Existing program picker */}
          {savedProgramNames.length > 0 && (
            <div className="existing-groups">
              <p><small>Or select existing program:</small></p>
              <div className="group-buttons">
                {savedProgramNames.map((prog) => (
                  <button key={prog} className="group-option"
                    style={{
                      backgroundColor: dyeProgramInput === prog ? '#00b8ff' : '#2a3f4f',
                      color: '#fff', fontWeight: dyeProgramInput === prog ? 600 : 400,
                      border: dyeProgramInput === prog ? '2px solid #00d9ff' : '1px solid #3a4857',
                    }}
                    onClick={() => { setDyeProgramInput(prog); setDraft(BLANK_DYE); }}
                  >
                    {prog}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Define program dyes */}
          {dyeProgramInput.trim() && (
            <div style={{ borderTop: '1px solid #2a3847', paddingTop: '16px' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#00b8ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Define "{dyeProgramInput}" Dye Composition
              </p>

              {/* Existing dyes */}
              {currentDyes.length > 0 && (
                <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {currentDyes.map((dye, idx) => (
                    <div key={idx} style={{
                      display: 'grid', gridTemplateColumns: '1fr 1.3fr 1.3fr auto',
                      gap: '8px', alignItems: 'center', padding: '8px 10px',
                      background: '#252d3d', borderRadius: '4px', fontSize: '12px', border: '1px solid #3a4857',
                    }}>
                      <span style={{ color: '#00d9ff', fontWeight: 600 }}>{dye.dyeName}</span>
                      <span style={{ color: '#aaa' }}><span style={{ color: '#a0aab8' }}>Stock: </span>{dye.stockConcentration} {dye.stockUnit}</span>
                      <span style={{ color: '#aaa' }}><span style={{ color: '#a0aab8' }}>Final: </span>{dye.finalConcentration} {dye.finalUnit}</span>
                      <button type="button" onClick={() => removeDyeFromProgram(idx)}
                        style={{ background: 'none', border: 'none', color: '#ff6b9d', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }} title="Remove">✕</button>
                    </div>
                  ))}
                </div>
              )}

              <AddDyeForm
                targetProgramName={dyeProgramInput}
                draft={draft}
                setDraft={setDraft}
                onAdd={addDyeToProgram}
                enterToSubmit
              />
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose} className="secondary-btn">Cancel</button>
          <button type="submit" disabled={!dyeProgramInput.trim()} className="action-btn">
            Assign {selectedWellCount} well{selectedWellCount === 1 ? '' : 's'} to "{dyeProgramInput.trim() || '…'}"
          </button>
        </div>
      </form>
    </div>
  );
};