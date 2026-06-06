import React from 'react';
import { NumberInput } from '../../components/inputs/NumberInput';

const S = {
  label: { fontSize: '10px', color: '#888', marginBottom: '3px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' } as React.CSSProperties,
  input: { minHeight: '44px', padding: '10px 12px', background: '#1a1f2e', border: '1px solid #3a4857', borderRadius: '4px', color: '#fff', fontSize: '13px' } as React.CSSProperties,
  sep: { width: '1px', height: '36px', background: '#2a3847', alignSelf: 'center' } as React.CSSProperties,
};

interface ConfigBarProps {
  projectName: string;
  setProjectName: (next: string) => void;
  plateId: string;
  setPlateId: (next: string) => void;
  seedingDate: string;
  setSeedingDate: (next: string) => void;
  setSeedingDateTouched: (next: boolean) => void;
  plateType: string;
  setPlateTypeState: (next: string) => void;
  customPlate: boolean;
  setCustomPlate: (next: boolean) => void;
  customRows: number;
  setCustomRows: (next: number) => void;
  customCols: number;
  setCustomCols: (next: number) => void;
  numPlates: number;
  setNumPlates: (next: number) => void;
  mode: 'no_dye' | 'dye';
  setMode: (next: 'no_dye' | 'dye') => void;
  setDesignMode: (next: 'cells' | 'dyes') => void;
  isLoading: boolean;
  onViewResults?: () => void;
}

/** Top compact config bar of the Design page: project metadata,
 *  plate setup, mode toggle, and the Results-page link.
 */
export const ConfigBar = ({
  projectName, setProjectName,
  plateId, setPlateId,
  seedingDate, setSeedingDate, setSeedingDateTouched,
  plateType, setPlateTypeState,
  customPlate, setCustomPlate,
  customRows, setCustomRows,
  customCols, setCustomCols,
  numPlates, setNumPlates,
  mode, setMode, setDesignMode,
  isLoading,
  onViewResults,
}: ConfigBarProps) => {
  const modeBtn = (m: 'no_dye' | 'dye'): React.CSSProperties => ({
    minHeight: '44px',
    boxSizing: 'border-box',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 14px',
    background: mode === m ? '#00b8ff' : '#1a1f2e',
    color: mode === m ? '#0f1419' : '#aaa',
    border: `1px solid ${mode === m ? '#00b8ff' : '#3a4857'}`,
    borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
    fontWeight: mode === m ? 700 : 400,
  });

  return (
    <div style={{ background: '#0f1419', borderBottom: '1px solid #2a3847', padding: '12px 20px' }}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        {/* Project info */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div>
            <div style={S.label}>Project</div>
            <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)}
              onFocus={(e) => e.target.select()} disabled={isLoading} style={{ ...S.input, width: '150px' }} />
          </div>
          <div>
            <div style={S.label}>Plate ID</div>
            <input type="text" value={plateId} onChange={(e) => setPlateId(e.target.value)}
              onFocus={(e) => e.target.select()} disabled={isLoading} style={{ ...S.input, width: '110px' }} />
          </div>
          <div>
            <div style={S.label}>Seeding Date</div>
            <input
              type="date"
              className="config-date-input"
              value={seedingDate}
              onChange={(e) => {
                setSeedingDate(e.target.value);
                setSeedingDateTouched(true);
              }}
              disabled={isLoading}
              style={{ ...S.input, width: '145px' }}
            />
          </div>
        </div>

        <div style={S.sep} />

        {/* Plate setup */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <div>
            <div style={S.label}>Plate Type</div>
            <select
              value={customPlate ? 'custom' : plateType}
              onChange={(e) => {
                if (e.target.value === 'custom') { setCustomPlate(true); }
                else { setCustomPlate(false); setPlateTypeState(e.target.value); }
              }}
              disabled={isLoading}
              style={{ ...S.input, cursor: 'pointer' }}
            >
              <option value="6">6-well</option>
              <option value="12">12-well</option>
              <option value="24">24-well</option>
              <option value="48">48-well</option>
              <option value="96">96-well</option>
              <option value="384">384-well</option>
              <option value="custom">Custom…</option>
            </select>
          </div>
          {customPlate && (
            <>
              <div>
                <div style={S.label}>Rows</div>
                <NumberInput min={1} max={32} value={customRows}
                  onChange={(e) => setCustomRows(parseInt(e.target.value) || 1)} disabled={isLoading}
                  onFocus={(e) => e.target.select()} style={{ ...S.input, width: '78px' }} />
              </div>
              <div>
                <div style={S.label}>Cols</div>
                <NumberInput min={1} max={48} value={customCols}
                  onChange={(e) => setCustomCols(parseInt(e.target.value) || 1)} disabled={isLoading}
                  onFocus={(e) => e.target.select()} style={{ ...S.input, width: '78px' }} />
              </div>
            </>
          )}
          <div>
            <div style={S.label}># Plates</div>
            <NumberInput min={1} value={numPlates}
              onChange={(e) => setNumPlates(parseInt(e.target.value) || 1)} disabled={isLoading}
              onFocus={(e) => e.target.select()} style={{ ...S.input, width: '84px' }} />
          </div>
        </div>

        <div style={S.sep} />

        {/* Mode */}
        <div>
          <div style={S.label}>Mode</div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button type="button" onClick={() => setMode('no_dye')} disabled={isLoading} style={modeBtn('no_dye')}>
              Cells only
            </button>
            <button type="button" onClick={() => { setMode('dye'); setDesignMode('cells'); }} disabled={isLoading} style={modeBtn('dye')}>
              With Dye
            </button>
          </div>
        </div>

        {/* Spacer + Results */}
        <div style={{ flex: 1 }} />
        {onViewResults && (
          <button
            onClick={onViewResults}
            disabled={isLoading}
            style={{
              padding: '8px 22px',
              background: '#1a2e3a',
              color: '#00b8ff',
              border: '1px solid #00b8ff',
              borderRadius: '6px', fontWeight: 700, fontSize: '14px',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            Results →
          </button>
        )}
      </div>
    </div>
  );
};