import { NumberInput } from '../../components/inputs/NumberInput';
import { CellDetailsFields } from './CellDetailsFields';
import { CellForm, cellFormFromGroup, EMPTY_CELL_FORM, densityError, sanitizeInteger } from './cellMeta';
import type { GroupDefinition } from '../../store/plateStore';

interface GroupModalProps {
  selectedWellCount: number;
  groupNameInput: string;
  setGroupNameInput: (next: string) => void;
  densityInput: number;
  setDensityInput: (next: number) => void;
  groups: Record<string, GroupDefinition>;
  groupCounts: Record<string, number>;
  selectedExistingGroup: string | null;
  setSelectedExistingGroup: (next: string | null) => void;
  cellForm: CellForm;
  setCellForm: (next: CellForm) => void;
  canAssign: boolean;
  /** Close the modal AND reset all input state. */
  onClose: () => void;
  /** Apply the assignment. Caller is responsible for closing afterwards. */
  onAssign: () => void;
}

/** "Assign N wells to Group" modal — opened from the Cells-mode panel and
 *  via the ⌘/Ctrl+G keyboard shortcut.
 */
export const GroupModal = ({
  selectedWellCount,
  groupNameInput,
  setGroupNameInput,
  densityInput,
  setDensityInput,
  groups,
  groupCounts,
  selectedExistingGroup,
  setSelectedExistingGroup,
  cellForm,
  setCellForm,
  canAssign,
  onClose,
  onAssign,
}: GroupModalProps) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content modal-content--wide" onClick={(e) => e.stopPropagation()}>
      <h3>Assign {selectedWellCount} Well{selectedWellCount === 1 ? '' : 's'} to Group</h3>
      <div className="modal-form">
        <div className="form-group">
          <label htmlFor="group-name">Group Name</label>
          <input
            id="group-name" type="text" value={groupNameInput}
            onChange={(e) => setGroupNameInput(e.target.value)}
            placeholder="e.g., Group 1, Control, Treatment-A"
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => { if (e.key === 'Enter' && canAssign) onAssign(); }}
            autoFocus
          />
        </div>
        <div className="form-group">
          <label htmlFor="density-input">Seeding Density (cells per well)</label>
          <NumberInput
            id="density-input" value={densityInput}
            onChange={(e) => setDensityInput(Number(sanitizeInteger(e.target.value)))}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => {
              if (['e', 'E', '+', '-', '.'].includes(e.key)) { e.preventDefault(); return; }
              if (e.key === 'Enter' && canAssign) onAssign();
            }}
            min="0" step="100"
          />
          {densityError(densityInput) && <div className="field-error">{densityError(densityInput)}</div>}
        </div>
        <CellDetailsFields form={cellForm} setForm={setCellForm} />
        <button type="button" className="secondary-btn" style={{ marginTop: '-8px', alignSelf: 'flex-start' }}
          onClick={() => setCellForm(EMPTY_CELL_FORM)}>
          Clear cell details
        </button>
        {Object.keys(groups).length > 0 && (
          <div className="existing-groups">
            <p><small>Or select existing group:</small></p>
            <div className="group-buttons">
              {Object.entries(groups).map(([gName, gDef]) => (
                <button key={gName} className="group-option"
                  style={{
                    backgroundColor: selectedExistingGroup === gName ? '#00b8ff' : '#2a3f4f',
                    color: '#fff',
                    fontWeight: selectedExistingGroup === gName ? 600 : 400,
                    border: selectedExistingGroup === gName ? '2px solid #00d9ff' : '1px solid #3a4857',
                  }}
                  onClick={() => {
                    setGroupNameInput(gName);
                    setDensityInput(gDef.density || 500);
                    setSelectedExistingGroup(gName);
                    setCellForm(cellFormFromGroup(gDef));
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAssign(); } }}
                >
                  {gName} <small>({groupCounts[gName] || 0}w • {gDef.density}c/w)</small>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="modal-actions">
        <button onClick={onClose} className="secondary-btn">Cancel</button>
        <button onClick={onAssign} disabled={!canAssign} className="action-btn">
          Assign to {groupNameInput.trim() ? `"${groupNameInput.trim()}"` : 'Group'}
        </button>
      </div>
    </div>
  </div>
);