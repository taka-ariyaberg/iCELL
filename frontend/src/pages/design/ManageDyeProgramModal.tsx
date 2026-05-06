import { AddDyeForm } from './AddDyeForm';
import { BLANK_DYE, DyeDefinition, DyeProgramDef, SAVED_PROGRAMS_KEY } from './types';

interface ManageDyeProgramModalProps {
  /** The program being edited. Component is only rendered when non-null. */
  programName: string;
  savedPrograms: DyeProgramDef[];
  setSavedPrograms: (next: DyeProgramDef[]) => void;
  draft: DyeDefinition;
  setDraft: (next: DyeDefinition) => void;
  onClose: () => void;
}

/** Modal for editing an existing dye program — list its current dyes
 *  and append new ones. Persists every change to localStorage.
 */
export const ManageDyeProgramModal = ({
  programName,
  savedPrograms,
  setSavedPrograms,
  draft,
  setDraft,
  onClose,
}: ManageDyeProgramModalProps) => {
  const prog = savedPrograms.find((p) => p.name === programName);
  if (!prog) {
    onClose();
    return null;
  }

  const canAddDye =
    draft.dyeName.trim() !== '' &&
    draft.stockConcentration > 0 &&
    draft.finalConcentration > 0;

  const addDye = () => {
    if (!canAddDye) return;
    const updated = savedPrograms.map((p) =>
      p.name === programName ? { ...p, dyes: [...p.dyes, draft] } : p,
    );
    setSavedPrograms(updated);
    localStorage.setItem(SAVED_PROGRAMS_KEY, JSON.stringify(updated));
    setDraft(BLANK_DYE);
  };

  const removeDye = (idx: number) => {
    const updated = savedPrograms.map((p) =>
      p.name === programName ? { ...p, dyes: p.dyes.filter((_, i) => i !== idx) } : p,
    );
    setSavedPrograms(updated);
    localStorage.setItem(SAVED_PROGRAMS_KEY, JSON.stringify(updated));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px', maxHeight: '85vh', overflowY: 'auto' }}
      >
        <h3>Edit Program: {programName}</h3>
        <div className="modal-form">
          {/* Current dyes */}
          {prog.dyes.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Dyes in this program
              </p>
              {prog.dyes.map((dye, idx) => (
                <div key={idx} style={{
                  display: 'grid', gridTemplateColumns: '1fr 1.3fr 1.3fr auto',
                  gap: '8px', alignItems: 'center', padding: '8px 10px',
                  background: '#252d3d', borderRadius: '4px', fontSize: '12px', border: '1px solid #3a4857',
                }}>
                  <span style={{ color: '#00d9ff', fontWeight: 600 }}>{dye.dyeName}</span>
                  <span style={{ color: '#aaa' }}><span style={{ color: '#a0aab8' }}>Stock: </span>{dye.stockConcentration} {dye.stockUnit}</span>
                  <span style={{ color: '#aaa' }}><span style={{ color: '#a0aab8' }}>Final: </span>{dye.finalConcentration} {dye.finalUnit}</span>
                  <button type="button" onClick={() => removeDye(idx)}
                    style={{ background: 'none', border: 'none', color: '#ff6b9d', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }} title="Remove">✕</button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>No dyes defined yet.</p>
          )}

          <AddDyeForm
            targetProgramName={programName}
            draft={draft}
            setDraft={setDraft}
            onAdd={addDye}
          />
        </div>
        <div className="modal-actions">
          <button type="button" onClick={onClose} className="secondary-btn">Cancel</button>
          <button type="button" onClick={onClose} className="action-btn">Done</button>
        </div>
      </div>
    </div>
  );
};