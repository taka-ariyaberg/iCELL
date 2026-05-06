import React from 'react';

const dlBtn: React.CSSProperties = {
  padding: '8px 10px',
  background: '#2a3f4f',
  color: '#ccc',
  border: '1px solid #3a4857',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 600,
};

interface DownloadActionsProps {
  mode: 'no_dye' | 'dye';
  hasWells: boolean;
  /** True when at least one well has a dye program assigned. Drives whether
   *  the dye export row is shown. */
  hasAnyDyeAssignment: boolean;
  isLoading: boolean;
  /** Which PNG export is in progress; null if none. */
  downloadingPNG: string | null;
  onDownloadLayoutCSV: () => void;
  onDownloadLayoutSVG: () => void;
  onDownloadLayoutPNG: () => void;
  onDownloadDyeCSV: () => void;
  onDownloadDyeSVG: () => void;
  onDownloadDyePNG: () => void;
}

/** Bottom-of-controls download grid: 3 layout exports always when wells
 *  are assigned, plus 3 dye exports when in dye mode and any well has
 *  a program assigned.
 */
export const DownloadActions = ({
  mode,
  hasWells,
  hasAnyDyeAssignment,
  isLoading,
  downloadingPNG,
  onDownloadLayoutCSV,
  onDownloadLayoutSVG,
  onDownloadLayoutPNG,
  onDownloadDyeCSV,
  onDownloadDyeSVG,
  onDownloadDyePNG,
}: DownloadActionsProps) => {
  if (!hasWells) return null;
  return (
    <div className="control-group" style={{ borderTop: '1px solid #3a4857', paddingTop: '12px', marginTop: '16px' }}>
      <label style={{ marginBottom: '12px' }}>Download</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '12px' }}>
        <button onClick={onDownloadLayoutCSV} disabled={isLoading} style={dlBtn}>Layout CSV</button>
        <button onClick={onDownloadLayoutSVG} disabled={isLoading} style={dlBtn}>Layout SVG</button>
        <button onClick={onDownloadLayoutPNG} disabled={isLoading || downloadingPNG === 'layout'}
          style={{ ...dlBtn, opacity: downloadingPNG === 'layout' ? 0.6 : 1 }}>
          {downloadingPNG === 'layout' ? 'Generating…' : 'Layout PNG'}
        </button>
      </div>
      {mode === 'dye' && hasAnyDyeAssignment && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
          <button onClick={onDownloadDyeCSV} disabled={isLoading} style={dlBtn}>Dye CSV</button>
          <button onClick={onDownloadDyeSVG} disabled={isLoading} style={dlBtn}>Dye SVG</button>
          <button onClick={onDownloadDyePNG} disabled={isLoading || downloadingPNG === 'dye'}
            style={{ ...dlBtn, opacity: downloadingPNG === 'dye' ? 0.6 : 1 }}>
            {downloadingPNG === 'dye' ? 'Generating…' : 'Dye PNG'}
          </button>
        </div>
      )}
    </div>
  );
};