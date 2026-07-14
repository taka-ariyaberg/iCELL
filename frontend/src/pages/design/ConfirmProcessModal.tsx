import { useMemo, type CSSProperties } from 'react';
import { DyeProgramDef } from './types';
import type { GroupDefinition } from '../../store/plateStore';
import { computeConfirmWarnings, formatConcentration } from './confirmSummary';

interface ConfirmProcessModalProps {
  projectName: string;
  plateId: string;
  /** Human-friendly plate type (e.g. "96-well" or "16×24"). */
  plateTypeLabel: string;
  mode: 'no_dye' | 'dye';
  numPlates: number;
  /** Total wells on the plate (grid capacity). */
  plateSize: number;
  /** Wells that have a group assigned. */
  assignedWellCount: number;
  seedingDate: string;
  stockCellConcentration: number;
  overagePct: number;
  finalWellVolumeUl: number;
  deadVolumeCellsUl: number;
  deadVolumeDyeUl: number;
  groups: Record<string, GroupDefinition>;
  groupCounts: Record<string, number>;
  /** All saved dye programs (used to label rows). */
  savedPrograms: DyeProgramDef[];
  /** Per-well program assignments — used to count wells per program. */
  dyePrograms: Record<string, string>;
  onCancel: () => void;
  onConfirm: () => void;
}

const labelCell: CSSProperties = { color: '#6b7787', fontSize: '12px', whiteSpace: 'nowrap' };
const valueCell: CSSProperties = { color: '#dbe3ec', fontSize: '12px', fontVariantNumeric: 'tabular-nums' };
const sectionHeading: CSSProperties = {
  fontWeight: 600, fontSize: '11px', color: '#8a97a6',
  letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px',
};
const gridDivider: CSSProperties = { gridColumn: '1 / -1', height: '1px', background: '#232c3a', margin: '2px 0' };
const table: CSSProperties = { width: '100%', fontSize: '12px', borderCollapse: 'collapse' };
const th: CSSProperties = { color: '#5a6677', fontWeight: 500, paddingBottom: '6px', borderBottom: '1px solid #232c3a' };
const td: CSSProperties = { paddingTop: '6px', color: '#c9d3de' };
const num: CSSProperties = { textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

/** Pre-submit preview modal shown when the user clicks "Process".
 *
 * A focused pre-flight check: project identity, any actionable warnings, the run
 * scope and the seeding parameters being submitted, plus the Groups table (and
 * Dye Programmes table when in use) so the user can sanity-check before the
 * backend call.
 */
export const ConfirmProcessModal = ({
  projectName,
  plateId,
  plateTypeLabel,
  mode,
  numPlates,
  plateSize,
  assignedWellCount,
  seedingDate,
  stockCellConcentration,
  overagePct,
  finalWellVolumeUl,
  deadVolumeCellsUl,
  deadVolumeDyeUl,
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
  const warnings = useMemo(
    () => computeConfirmWarnings({
      groups, groupCounts, mode,
      finalWellVolumeUl, stockCellConcentration,
    }),
    [groups, groupCounts, mode, finalWellVolumeUl, stockCellConcentration],
  );

  const groupCount = groupRows.length;
  const deadVolume = mode === 'dye'
    ? `${deadVolumeCellsUl} / ${deadVolumeDyeUl} µL`
    : `${deadVolumeCellsUl} µL`;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content modal-content--confirm" onClick={(e) => e.stopPropagation()}>
        <h3>Confirm Process</h3>
        <div className="modal-form">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '13px', color: '#9aa6b4' }}>
              <span style={{ color: '#e6ecf3', fontWeight: 600 }}>{projectName}</span>
              {' · '}{plateId}{' · '}{plateTypeLabel}{' · '}{mode === 'dye' ? 'cells + dye' : 'cells only'}
            </div>
            {warnings.length > 0 && (
              <div style={{
                background: 'rgba(255, 180, 84, 0.08)', borderLeft: '2px solid #ffb454',
                borderRadius: '4px', padding: '8px 10px',
                display: 'flex', flexDirection: 'column', gap: '4px',
              }}>
                {warnings.map((w, i) => (
                  <div key={i} style={{ fontSize: '12px', color: '#f0c489', lineHeight: 1.4 }}>⚠ {w}</div>
                ))}
              </div>
            )}
            <div style={{
              display: 'grid', gridTemplateColumns: 'max-content 1fr',
              columnGap: '18px', rowGap: '7px', alignItems: 'baseline',
            }}>
              <span style={labelCell}>Plates</span><span style={valueCell}>{numPlates}</span>
              <span style={labelCell}>Wells</span><span style={valueCell}>{assignedWellCount} / {plateSize} assigned</span>
              <span style={labelCell}>Groups</span><span style={valueCell}>{groupCount}</span>
              <div style={gridDivider} />
              <span style={labelCell}>Stock conc</span><span style={valueCell}>{formatConcentration(stockCellConcentration)}</span>
              <span style={labelCell}>Overage</span><span style={valueCell}>{overagePct}%</span>
              <span style={labelCell}>Well volume</span><span style={valueCell}>{finalWellVolumeUl} µL</span>
              <span style={labelCell}>Dead volume</span><span style={valueCell}>{deadVolume}</span>
              <span style={labelCell}>Seeding date</span><span style={valueCell}>{seedingDate || '—'}</span>
            </div>
          </div>
          <div>
            <div style={sectionHeading}>Groups</div>
            {groupRows.length === 0 ? (
              <div style={{ color: '#5a6677', fontSize: '12px' }}>(none)</div>
            ) : (
              <table style={table}>
                <thead>
                  <tr>
                    <th style={{ ...th, textAlign: 'left' }}>Name</th>
                    <th style={{ ...th, ...num }}>cells/well</th>
                    <th style={{ ...th, ...num }}>wells</th>
                  </tr>
                </thead>
                <tbody>
                  {groupRows.map(([name, def]) => (
                    <tr key={name}>
                      <td style={{ ...td, textAlign: 'left' }}>{name}</td>
                      <td style={{ ...td, ...num }}>{def.density}</td>
                      <td style={{ ...td, ...num }}>{groupCounts[name] || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {dyeRows.length > 0 && (
            <div>
              <div style={sectionHeading}>Dye programmes</div>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={{ ...th, textAlign: 'left' }}>Name</th>
                    <th style={{ ...th, ...num }}>wells</th>
                  </tr>
                </thead>
                <tbody>
                  {dyeRows.map((row) => (
                    <tr key={row.name}>
                      <td style={{ ...td, textAlign: 'left' }}>{row.name}</td>
                      <td style={{ ...td, ...num }}>{row.wells}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button onClick={onCancel} className="secondary-btn">Cancel</button>
          <button onClick={onConfirm} className="action-btn">Confirm &amp; Process</button>
        </div>
      </div>
    </div>
  );
};