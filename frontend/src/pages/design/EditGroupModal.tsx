import { useMemo } from 'react';
import { NumberInput } from '../../components/inputs/NumberInput';
import { CellForm, isCellFormComplete, toCellMeta } from './cellMeta';
import type { CellMeta, GroupDefinition } from '../../store/plateStore';

interface EditGroupModalProps {
  /** The group being edited. Component is only rendered when non-null. */
  oldName: string;
  groups: Record<string, GroupDefinition>;
  name: string;
  setName: (next: string) => void;
  density: number;
  setDensity: (next: number) => void;
  /** Atomic rename action from the store. */
  renameGroup: (oldName: string, newName: string) => void;
  /** Atomic density update from the store. */
  updateGroupDensity: (name: string, density: number) => void;
  cellForm: CellForm;
  setCellForm: (n: CellForm) => void;
  updateGroupMeta: (name: string, meta: CellMeta) => void;
  onClose: () => void;
}

/** Modal for renaming a cell group and/or changing its cells/well.
 *
 * Save is disabled when the trimmed name is empty, collides with another
 * existing group, or when neither name nor density actually changed.
 */
export const EditGroupModal = ({
  oldName,
  groups,
  name,
  setName,
  density,
  setDensity,
  renameGroup,
  updateGroupDensity,
  cellForm,
  setCellForm,
  updateGroupMeta,
  onClose,
}: EditGroupModalProps) => {
  const { collision, empty, canSave, trimmed, nameChanged, densityChanged } = useMemo(() => {
    const trimmedName = name.trim();
    const isEmpty = trimmedName.length === 0;
    const isCollision = trimmedName.length > 0 && trimmedName !== oldName
      && Object.prototype.hasOwnProperty.call(groups, trimmedName);
    const isNameChanged = trimmedName !== oldName;
    const isDensityChanged = density !== groups[oldName]?.density;
    const cellChanged = JSON.stringify(toCellMeta(cellForm)) !== JSON.stringify({
      cellLine: groups[oldName]?.cellLine ?? '',
      modification: groups[oldName]?.modification ?? '',
      passage: groups[oldName]?.passage ?? '',
      viability: groups[oldName]?.viability ?? NaN,
    });
    return {
      collision: isCollision,
      empty: isEmpty,
      canSave: !isCollision && !isEmpty && isCellFormComplete(cellForm)
        && (isNameChanged || isDensityChanged || cellChanged),
      trimmed: trimmedName,
      nameChanged: isNameChanged,
      densityChanged: isDensityChanged,
    };
  }, [name, oldName, groups, density, cellForm]);

  const handleSave = () => {
    try {
      const effectiveName = nameChanged ? trimmed : oldName;
      if (nameChanged) renameGroup(oldName, trimmed);
      if (densityChanged) updateGroupDensity(effectiveName, density);
      updateGroupMeta(effectiveName, toCellMeta(cellForm));
      onClose();
    } catch (err) {
      console.error('[EditGroupModal] Save failed', err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Edit Group: {oldName}</h3>
        <div className="modal-form">
          <div className="form-group">
            <label htmlFor="edit-group-name">Group Name</label>
            <input
              id="edit-group-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onFocus={(e) => e.target.select()}
            />
            {collision && (
              <div style={{ color: '#ff6b6b', fontSize: '12px', marginTop: '4px' }}>
                A group named "{trimmed}" already exists.
              </div>
            )}
            {empty && (
              <div style={{ color: '#ff6b6b', fontSize: '12px', marginTop: '4px' }}>
                Name cannot be empty.
              </div>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="edit-group-density">Cells per Well</label>
            <NumberInput
              id="edit-group-density"
              value={density}
              onChange={(e) => setDensity(parseInt(e.target.value) || 0)}
              onFocus={(e) => e.target.select()}
            />
          </div>
          <div className="form-group" style={{ borderTop: '1px solid #3a4857', paddingTop: '12px' }}>
            <label>Cell details (all required)</label>
            <input type="text" value={cellForm.cellLine} placeholder="Cell line (e.g. HeLa)"
              onChange={(e) => setCellForm({ ...cellForm, cellLine: e.target.value })} />
            <input type="text" value={cellForm.modification} placeholder="Wildtype?"
              onChange={(e) => setCellForm({ ...cellForm, modification: e.target.value })}
              style={{ marginTop: '6px' }} />
            <input type="text" value={cellForm.passage} placeholder="Passage (e.g. P12)"
              onChange={(e) => setCellForm({ ...cellForm, passage: e.target.value })}
              style={{ marginTop: '6px' }} />
            <input type="number" min="0" max="100" value={cellForm.viability ?? ''} placeholder="Viability %"
              onChange={(e) => setCellForm({ ...cellForm, viability: e.target.value === '' ? null : Number(e.target.value) })}
              style={{ marginTop: '6px' }} />
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="modal-cancel-btn">Cancel</button>
          <button onClick={handleSave} disabled={!canSave} className="modal-confirm-btn">Save</button>
        </div>
      </div>
    </div>
  );
};