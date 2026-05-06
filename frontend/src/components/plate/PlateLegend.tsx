/** Legend block rendered below the plate grid in `PlateVisualization`.
 *
 * Three visual modes:
 *   - Read-only viewer with `onGroupSelect`: shows just an interaction hint.
 *   - Cells design mode: groups + unassigned summary.
 *   - Dyes design mode: nested groups → dyes summary, plus "empty" footer.
 *
 * In every mode the right-hand "Interactions" card lists the active
 * keyboard/mouse shortcuts, which depend on whether we're in viewer mode.
 */

interface PlateLegendProps {
  rows: number;
  cols: number;
  wells: Record<string, string>;
  dyePrograms: Record<string, string>;
  groups: Record<string, unknown>;
  groupColors: Record<string, string>;
  dyeProgramColors: Record<string, string>;
  designMode: 'cells' | 'dyes';
  /** When true, all interactions go through external callbacks. Affects
   *  the Interactions help text. */
  isViewerMode: boolean;
  /** Legacy read-only viewer surface (different help text + minimal legend). */
  readOnly: boolean;
  onGroupSelect?: (well: string, isShiftClick: boolean) => void;
}

export const PlateLegend = ({
  rows,
  cols,
  wells,
  dyePrograms,
  groups,
  groupColors,
  dyeProgramColors,
  designMode,
  isViewerMode,
  readOnly,
  onGroupSelect,
}: PlateLegendProps) => {
  if (readOnly && onGroupSelect) {
    return (
      <div className="plate-legend">
        <div className="legend-section">
          <h4>Interactions</h4>
          <p className="legend-text">
            • Click: Toggle well<br />
            • Shift+Click: Add to selection
          </p>
        </div>
      </div>
    );
  }

  const definedGroupNames = groups ? Object.keys(groups) : [];
  const totalWells = rows * cols;

  return (
    <div className="plate-legend">
      {designMode === 'cells' ? (
        <div className="legend-section">
          <h4>Groups</h4>
          <div className="legend-items">
            {definedGroupNames.map((group) => {
              const wellCount = Object.values(wells).filter((g) => g === group).length;
              return (
                <div key={group} className="legend-item">
                  <div style={{ backgroundColor: groupColors[group], borderRadius: '4px', width: '24px', height: '20px' }} />
                  <span>{group}</span>
                  <span style={{ color: '#5a6677', fontSize: '11px', marginLeft: '2px' }}>({wellCount}w)</span>
                </div>
              );
            })}
            {(() => {
              const assignedCount = Object.keys(wells).length;
              const unassignedCount = totalWells - assignedCount;
              if (unassignedCount <= 0) return null;
              return (
                <div className="legend-item">
                  <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', width: '24px', height: '20px' }} />
                  <span>Unassigned</span>
                  <span style={{ color: '#5a6677', fontSize: '11px', marginLeft: '2px' }}>({unassignedCount}w)</span>
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        <div className="legend-section">
          <h4>Groups & Dye Programs</h4>
          <div className="legend-items">
            {definedGroupNames.length === 0 ? (
              <p style={{ color: '#888', margin: '8px 0', fontSize: '12px' }}>No groups defined</p>
            ) : (
              definedGroupNames.map((group) => {
                const wellsInGroup = Object.entries(wells).filter(([, g]) => g === group);
                const dyesForGroup = new Set(wellsInGroup.map(([well]) => dyePrograms[well]).filter((d) => d));
                const unassignedDye = wellsInGroup.filter(([well]) => !dyePrograms[well]).length;

                return (
                  <div key={group} style={{ marginBottom: '6px', fontSize: '11px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <div style={{ backgroundColor: groupColors[group], borderRadius: '3px', width: '14px', height: '14px' }} />
                      <strong>{group}</strong>
                      <span style={{ color: '#666' }}>({wellsInGroup.length}w)</span>
                    </div>
                    <div style={{ marginLeft: '20px', paddingTop: '2px', borderLeft: '1px solid #3a4857', paddingLeft: '6px' }}>
                      {Array.from(dyesForGroup).map((dye) => {
                        const dyeWellCount = wellsInGroup.filter(([well]) => dyePrograms[well] === dye).length;
                        return (
                          <div key={dye} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#ccc', marginBottom: '2px' }}>
                            <div style={{ backgroundColor: dyeProgramColors[dye], borderRadius: '2px', width: '10px', height: '8px', flexShrink: 0 }} />
                            <span>{dye}</span>
                            <span style={{ color: '#5a6677' }}>({dyeWellCount}w)</span>
                          </div>
                        );
                      })}
                      {unassignedDye > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#5a6677', marginBottom: '2px' }}>
                          <div style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: '2px', width: '10px', height: '8px', flexShrink: 0 }} />
                          <span>No dye</span>
                          <span>({unassignedDye}w)</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            {(() => {
              const assignedToGroupCount = Object.keys(wells).length;
              const emptyWells = totalWells - assignedToGroupCount;
              if (emptyWells <= 0) return null;
              return (
                <div style={{ marginBottom: '6px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '3px', width: '14px', height: '14px' }} />
                    <strong style={{ color: '#5a6677' }}>Empty (no cells)</strong>
                    <span style={{ color: '#5a6677' }}>({emptyWells}w)</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
      <div className="legend-section">
        <h4>Interactions</h4>
        <p className="legend-text">
          {designMode === 'dyes' && !isViewerMode
            ? <>• Click: Select (unassigned) / Deassign (assigned)<br /></>
            : <>• Click: Toggle well<br /></>}
          • Shift+Drag: Select region<br />
          • Opt/Alt+Drag: Deselect region<br />
          • ⌘/Ctrl+A: Select all wells<br />
          • ⌘/Ctrl+D: Deselect all wells<br />
          {!isViewerMode && <>• ⌘/Ctrl+Z: Undo<br /></>}
          {!isViewerMode && <>• ⌘/Ctrl+Shift+Z: Redo<br /></>}
          {!isViewerMode && <>• ⌘/Ctrl+G: Assign group<br /></>}
          {!isViewerMode && <>• ⌘/Ctrl+P: Assign dye program<br /></>}
          • ⌘/Ctrl+M: Toggle cells / dyes {isViewerMode ? 'view' : 'mode'}
        </p>
      </div>
    </div>
  );
};