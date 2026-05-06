import { useMemo } from 'react';
import { DyeProgramDef } from './types';

interface GroupDef {
  density: number;
}

interface ConfirmProcessModalProps {
  projectName: string;
  plateId: string;
  plateType: string;
  mode: 'no_dye' | 'dye';
  groups: Record<string, GroupDef>;
  groupCounts: Record<string, number>;
  /** All saved dye programs (used to label rows). */
  savedPrograms: DyeProgramDef[];
  /** Per-well program assignments — used to count wells per program. */
  dyePrograms: Record<string, string>;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Pre-submit preview modal shown when the user clicks "Process".
 *
 * Displays project metadata and a Groups table (and Dye Programmes table
 * when in use) so the user can sanity-check before the backend call.
 */
export const ConfirmProcessModal = ({
  projectName,
  plateId,
  plateType,
  mode,
  groups,
  groupCounts,
  savedPrograms,
  dyePrograms,
  onCancel,
  onConfirm,
}: ConfirmProcessModalProps) => {
  const groupRows = useMemo(
    () => Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)),
    [groups],
  );
  const dyeRows = useMemo(
    () => savedPrograms
      .map((prog) => ({
        name: prog.name,
        wells: Object.values(dyePrograms).filter((p) => p === prog.name).length,
      }))
      .filter((row) => row.wells > 0),
    [savedPrograms, dyePrograms],
  );

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Confirm Process</h3>
        <div className="modal-form">
          <div style={{ fontSize: '12px', color: '#9aa6b4', marginBottom: '12px' }}>
            {projectName} · {plateId} · {plateType} · mode: {mode === 'dye' ? 'cells + dye' : 'cells only'}
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: 600, marginBottom: '6px' }}>Groups</div>
            {groupRows.length === 0 ? (
              <div style={{ color: '#5a6677', fontSize: '12px' }}>(none)</div>
            ) : (
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#5a6677' }}>
                    <th style={{ textAlign: 'left' }}>Name</th>
                    <th style={{ textAlign: 'right' }}>cells/well</th>
                    <th style={{ textAlign: 'right' }}>wells</th>
                  </tr>
                </thead>
                <tbody>
                  {groupRows.map(([name, def]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td style={{ textAlign: 'right' }}>{def.density}</td>
                      <td style={{ textAlign: 'right' }}>{groupCounts[name] || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {dyeRows.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: '6px' }}>Dye Programmes</div>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#5a6677' }}>
                    <th style={{ textAlign: 'left' }}>Name</th>
                    <th style={{ textAlign: 'right' }}>wells</th>
                  </tr>
                </thead>
                <tbody>
                  {dyeRows.map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td style={{ textAlign: 'right' }}>{row.wells}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button onClick={onCancel} className="modal-cancel-btn">Cancel</button>
          <button onClick={onConfirm} className="modal-confirm-btn">Confirm &amp; Process</button>
        </div>
      </div>
    </div>
  );
};