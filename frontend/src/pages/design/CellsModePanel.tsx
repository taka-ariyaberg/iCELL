interface GroupDef {
  density: number;
}

interface CellsModePanelProps {
  selectedWellCount: number;
  groups: Record<string, GroupDef>;
  groupCounts: Record<string, number>;
  groupColors: Record<string, string>;
  unassignedCount: number;
  isLoading: boolean;
  onAssignToGroup: () => void;
  onEditGroup: (name: string, currentDensity: number) => void;
}

/** Cells-mode side panel of the Design page: assign-to-group action,
 *  defined-groups list (each row has an Edit button), and the
 *  unassigned-wells summary.
 */
export const CellsModePanel = ({
  selectedWellCount,
  groups,
  groupCounts,
  groupColors,
  unassignedCount,
  isLoading,
  onAssignToGroup,
  onEditGroup,
}: CellsModePanelProps) => (
  <>
    {selectedWellCount > 0 && (
      <div className="control-group">
        <button
          onClick={onAssignToGroup}
          disabled={isLoading}
          className="action-btn large"
        >
          Assign to Group (⌘/Ctrl+G)
        </button>
      </div>
    )}
    {Object.keys(groups).length > 0 && (
      <div className="control-group">
        <label>Defined Groups</label>
        <div className="group-list">
          {Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([name, def]) => (
            <div key={name} className="group-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="group-label" style={{ backgroundColor: `${groupColors[name]}33`, color: groupColors[name] }}>{name}</span>
              <span className="group-density" style={{ flex: 1 }}>{groupCounts[name] || 0} wells • {def.density} cells/well</span>
              <button
                className="dye-edit-btn"
                onClick={() => onEditGroup(name, def.density)}
                style={{
                  background: 'rgba(0,184,255,0.12)',
                  border: '1px solid rgba(0,184,255,0.35)',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '2px 6px',
                  lineHeight: 1,
                  color: '#00b8ff',
                  fontWeight: 600,
                }}
                title="Edit group"
              >Edit</button>
            </div>
          ))}
        </div>
      </div>
    )}
    {unassignedCount > 0 && (
      <div className="group-summary">
        <div className="group-row">
          <span className="group-label unassigned">Unassigned</span>
          <span className="group-count">{unassignedCount} wells</span>
        </div>
      </div>
    )}
  </>
);