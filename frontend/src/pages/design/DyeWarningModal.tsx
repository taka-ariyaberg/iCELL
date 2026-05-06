/** Warning modal shown when the user tries to assign a dye program to a
 * selection that includes wells outside any cell group. The user can
 * either back out (Cancel) or proceed but only on the wells already
 * inside a group (Skip empty).
 */

interface DyeWarningModalProps {
  unassignedCount: number;
  totalSelectedCount: number;
  /** Cancel: close modal AND clear the current selection. */
  onCancel: () => void;
  /** Skip-empty: assign the dye to the grouped wells only. */
  onSkipEmpty: () => void;
}

export const DyeWarningModal = ({
  unassignedCount,
  totalSelectedCount,
  onCancel,
  onSkipEmpty,
}: DyeWarningModalProps) => {
  const groupedCount = totalSelectedCount - unassignedCount;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <h3 style={{ color: '#ff6b9d', marginBottom: '12px' }}>Unassigned Wells Detected</h3>
        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#3a2a2a', borderLeft: '3px solid #ff6b9d', borderRadius: '4px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
            <strong>{unassignedCount} well{unassignedCount === 1 ? '' : 's'} {unassignedCount === 1 ? 'is' : 'are'} not assigned to any group.</strong>
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: '#ccc' }}>
            Dye programs should be assigned to wells within specific groups. Unassigned wells may cause issues during processing.
          </p>
        </div>
        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#1a2a2e', borderRadius: '4px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: '#888' }}>Selected wells breakdown:</p>
          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#ccc' }}>
            <li>Total selected: {totalSelectedCount}</li>
            <li>In groups: {groupedCount}</li>
            <li>Unassigned: {unassignedCount}</li>
          </ul>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
          <button onClick={onCancel} className="secondary-btn">Cancel</button>
          <button
            onClick={onSkipEmpty}
            style={{ padding: '10px 16px', backgroundColor: '#ff6b9d', color: '#0f1419', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}
          >
            Skip empty, assign to {groupedCount} grouped well{groupedCount === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
};