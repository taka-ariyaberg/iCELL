import { useMemo } from 'react';
import { NumberInput } from '../../components/inputs/NumberInput';

interface GroupDef {
  density: number;
}

interface EditGroupModalProps {
  /** The group being edited. Component is only rendered when non-null. */
  oldName: string;
  groups: Record<string, GroupDef>;
  name: string;
  setName: (next: string) => void;
  density: number;
  setDensity: (next: number) => void;
  /** Atomic rename action from the store. */
  renameGroup: (oldName: string, newName: string) => void;
  /** Atomic density update from the store. */
  updateGroupDensity: (name: string, density: number) => void;
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
  onClose,
}: EditGroupModalProps) => {
  const { collision, empty, canSave, trimmed, nameChanged, densityChanged } = useMemo(() => {
    const trimmedName = name.trim();
    const isEmpty = trimmedName.length === 0;
    const isCollision = trimmedName.length > 0 && trimmedName !== oldName
      && Object.prototype.hasOwnProperty.call(groups, trimmedName);
    const isNameChanged = trimmedName !== oldName;
    const isDensityChanged = density !== groups[oldName]?.density;
    return {
      collision: isCollision,
      empty: isEmpty,
      canSave: !isCollision && !isEmpty && (isNameChanged || isDensityChanged),
      trimmed: trimmedName,
      nameChanged: isNameChanged,
      densityChanged: isDensityChanged,
    };
  }, [name, oldName, groups, density]);

  const handleSave = () => {
    try {
      const effectiveName = nameChanged ? trimmed : oldName;
      if (nameChanged) renameGroup(oldName, trimmed);
      if (densityChanged) updateGroupDensity(effectiveName, density);
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
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="modal-cancel-btn">Cancel</button>
          <button onClick={handleSave} disabled={!canSave} className="modal-confirm-btn">Save</button>
        </div>
      </div>
    </div>
  );
};