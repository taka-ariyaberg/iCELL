import React, { useState, useEffect, useMemo } from 'react';
import { PlateVisualization, generateDistinctColors } from './PlateVisualization';
import { ProtocolSection } from './ProtocolSection';
import { ViewModeSwitch } from './ViewModeSwitch';
import { downloadFile } from '../utils/exportUtils';
import { serializeRecordsToCsv } from '../utils/csvExport';
import '../styles/ResultsDisplay.css';

interface ResultsDisplayProps {
  instructions: string;
  seedingSummary: Record<string, unknown>[];
  dyeSummary?: Record<string, unknown>[];
  formattedSeedingSummary?: Record<string, unknown>[];
  formattedDyeSummary?: Record<string, unknown>[];
  exportBaseName?: string;
  onDownloadIMeta?: (() => void) | null;
  hasIMetaDownload?: boolean;
  plateType?: string;
  numPlates?: number;
  mode?: string;
  wells?: Record<string, string>;
  groups?: Record<string, Set<string>>;
  dyePrograms?: Record<string, string>;
}

// Compute a rectangular range of wells between two well IDs for any plate type
function getWellRange(start: string, end: string, plateType: string): Set<string> {
  const plateMeta: Record<string, { rows: number; cols: number }> = {
    '6': { rows: 2, cols: 3 }, '12': { rows: 3, cols: 4 },
    '24': { rows: 4, cols: 6 }, '48': { rows: 6, cols: 8 },
    '96': { rows: 8, cols: 12 }, '384': { rows: 16, cols: 24 },
  };
  let meta = plateMeta[plateType];
  if (!meta && plateType.includes(',')) {
    const [r, c] = plateType.split(',').map(Number);
    meta = { rows: r, cols: c };
  }
  if (!meta) meta = { rows: 8, cols: 12 };

  const startRow = start.charCodeAt(0) - 65;
  const startCol = parseInt(start.slice(1)) - 1;
  const endRow = end.charCodeAt(0) - 65;
  const endCol = parseInt(end.slice(1)) - 1;

  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);
  const minCol = Math.min(startCol, endCol);
  const maxCol = Math.max(startCol, endCol);

  const result = new Set<string>();
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      if (r < meta.rows && c < meta.cols) {
        result.add(`${String.fromCharCode(65 + r)}${c + 1}`);
      }
    }
  }
  return result;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  instructions,
  seedingSummary,
  dyeSummary,
  formattedSeedingSummary = [],
  formattedDyeSummary = [],
  exportBaseName = 'iCELL__plate__date',
  onDownloadIMeta = null,
  hasIMetaDownload = false,
  plateType = '96',
  numPlates = 1,
  mode = 'no_dye',
  wells = {},
  groups = {},
  dyePrograms = {},
}) => {
  const [selectedWells, setSelectedWells] = useState<Set<string>>(new Set());
  const currentPlate = 1;
  const [summaryMode, setSummaryMode] = useState<'cells' | 'dyes'>('cells');
  const allPlatesSuffix = numPlates > 1 ? ' (all plates)' : '';
  const groupColorMap = useMemo(() => generateDistinctColors(Object.keys(groups)), [groups]);
  const dyeProgramColorMap = useMemo(() => {
    const programNames = Array.from(new Set(Object.values(dyePrograms))).filter(Boolean);
    return generateDistinctColors(programNames);
  }, [dyePrograms]);

  const stripPlatePrefix = (well: string) => well.replace(/^P\d+-/, '');
  const currentPlatePrefix = `P${currentPlate}-`;

  const buildCellWellHoverDetails = () => {
    const hoverDetails: Record<string, string[]> = {};

    seedingSummary.forEach(row => {
      const rawWells = String(row.wells ?? '').split(',').map(w => w.trim()).filter(Boolean);
      const dispensePerWell = Number(row.cell_suspension_dispense_ul_per_well);

      rawWells.forEach(rawWell => {
        if (numPlates > 1 && !rawWell.startsWith(currentPlatePrefix)) {
          return;
        }

        const well = stripPlatePrefix(rawWell);
        const groupName = wells[well] ?? `${Number(row.cells_per_well).toLocaleString()} cells/well`;
        hoverDetails[well] = [
          well,
          groupName,
          `Dispense: ${dispensePerWell.toFixed(1)} µL cell suspension`,
        ];
      });
    });

    return hoverDetails;
  };

  const buildDyeWellHoverDetails = () => {
    const hoverDetails: Record<string, string[]> = {};
    const dyeDispenseByProgram = new Map<string, number>();

    (dyeSummary ?? []).forEach(row => {
      const program = String(row.dye_program ?? '');
      if (!program) return;
      dyeDispenseByProgram.set(program, Number(row.mastermix_dispense_ul_per_well));
    });

    Object.entries(wells).forEach(([well, groupName]) => {
      const dyeProgram = dyePrograms[well];
      const lines = [well, groupName];
      if (dyeProgram) {
        lines.push(dyeProgram);
        const dispense = dyeDispenseByProgram.get(dyeProgram);
        if (dispense !== undefined) {
          lines.push(`Dispense: ${dispense.toFixed(1)} µL dye mastermix`);
        }
      } else {
        lines.push('No dye');
      }
      hoverDetails[well] = lines;
    });

    return hoverDetails;
  };

  const cellWellHoverDetails = buildCellWellHoverDetails();
  const dyeWellHoverDetails = buildDyeWellHoverDetails();
  const cellWellValueLabels = Object.fromEntries(
    Object.entries(cellWellHoverDetails).map(([well, lines]) => {
      const dispenseLine = lines.find(line => line.startsWith('Dispense: '));
      return [well, dispenseLine ? dispenseLine.replace('Dispense: ', '').replace(' cell suspension', '') : ''];
    })
  );
  const dyeWellValueLabels = Object.fromEntries(
    Object.entries(dyeWellHoverDetails).map(([well, lines]) => {
      const dispenseLine = lines.find(line => line.startsWith('Dispense: '));
      return [well, dispenseLine ? dispenseLine.replace('Dispense: ', '').replace(' dye mastermix', '') : ''];
    })
  );

  const toggleSummaryMode = () => {
    setSummaryMode((prev) => prev === 'cells' ? 'dyes' : 'cells');
    setSelectedWells(new Set());
  };

  // Keyboard shortcuts: Cmd/Ctrl+A = select all assigned wells, Cmd/Ctrl+D = deselect all
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const inInput = document.activeElement instanceof HTMLInputElement ||
                      document.activeElement instanceof HTMLTextAreaElement ||
                      document.activeElement instanceof HTMLSelectElement;
      if (e.key === 'a') {
        if (inInput) return;
        e.preventDefault();
        const activeWells = summaryMode === 'dyes'
          ? Object.keys(dyePrograms).filter(w => dyePrograms[w])
          : Object.keys(wells);
        setSelectedWells(new Set(activeWells));
      }
      if (e.key === 'd') {
        if (inInput) return;
        e.preventDefault();
        setSelectedWells(new Set());
      }
      if (e.key.toLowerCase() === 'm' && mode === 'dye') {
        e.preventDefault();
        toggleSummaryMode();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [wells, dyePrograms, mode]);

  // ── Viewer mode interaction handlers ───────────────────────────────────────
  const handleViewerToggle = (well: string) => {
    setSelectedWells(prev => {
      const next = new Set(prev);
      if (next.has(well)) next.delete(well);
      else next.add(well);
      return next;
    });
  };

  const handleViewerRangeSelect = (start: string, end: string) => {
    const range = getWellRange(start, end, plateType);
    setSelectedWells(prev => {
      const next = new Set(prev);
      range.forEach(w => next.add(w));
      return next;
    });
  };

  const handleViewerRangeDeselect = (start: string, end: string) => {
    const range = getWellRange(start, end, plateType);
    setSelectedWells(prev => {
      const next = new Set(prev);
      range.forEach(w => next.delete(w));
      return next;
    });
  };

  // ── Right-panel data ────────────────────────────────────────────────────────
  // For each seeding summary row, check how many selected wells it covers
  // Strip multi-plate prefix (e.g. 'P1-A1' → 'A1') so single-plate viewer wells match
  // For multi-plate runs, only count wells belonging to the currently viewed plate
  const getMatchCount = (rowWellsList: string[]) => {
    if (numPlates <= 1) {
      return Array.from(selectedWells).filter(w => rowWellsList.includes(w)).length;
    }
    // rowWellsList has full prefixed wells like ['P1-A1','P2-A1',...]
    // selectedWells are bare ('A1'). Count matches on current plate only.
    const platePrefix = `P${currentPlate}-`;
    return Array.from(selectedWells).filter(w =>
      rowWellsList.some(rw => rw === `${platePrefix}${w}`)
    ).length;
  };

  const getSelectedDetails = () => {
    if (selectedWells.size === 0) return [];
    const raw = seedingSummary
      .map(row => {
        const rawWells = String(row.wells ?? '').split(',').map(w => w.trim()).filter(Boolean);
        const rowWellsList = numPlates <= 1
          ? rawWells.map(stripPlatePrefix)
          : rawWells; // keep prefixes for per-plate counting
        const count = numPlates <= 1
          ? Array.from(selectedWells).filter(w => rowWellsList.includes(w)).length
          : getMatchCount(rawWells);
        if (count === 0) return null;
        // Find a well to resolve the group name
        const sampleWell = numPlates <= 1
          ? Array.from(selectedWells).find(w => rowWellsList.includes(w))!
          : Array.from(selectedWells).find(w =>
              rawWells.some(rw => rw === `P${currentPlate}-${w}`)
            )!;
        const groupName = wells[sampleWell] ?? `${Number(row.cells_per_well).toLocaleString()} cells/well`;
        const dispensePerWell = Number(row.cell_suspension_dispense_ul_per_well);
        const detailKey = `${groupName}|${dispensePerWell}`;
        const totalPreparedVolume = Number(row.total_cell_suspension_volume_ul);
        const totalNeededVolume = Number(row.base_cell_suspension_volume_ul);
        const selectedNeededVolume = dispensePerWell * count;
        const remainingPreparedVolume = Math.max(totalPreparedVolume - selectedNeededVolume, 0);
        return {
          groupName,
          row,
          count,
          detailKey,
          dispensePerWell,
          totalPreparedVolume,
          totalNeededVolume,
          selectedNeededVolume,
          remainingPreparedVolume,
        };
      })
      .filter(Boolean) as Array<{
        groupName: string;
        row: Record<string, unknown>;
        count: number;
        detailKey: string;
        dispensePerWell: number;
        totalPreparedVolume: number;
        totalNeededVolume: number;
        selectedNeededVolume: number;
        remainingPreparedVolume: number;
      }>;

    const seen = new Map<string, {
      groupName: string;
      row: Record<string, unknown>;
      count: number;
      detailKey: string;
      dispensePerWell: number;
      totalPreparedVolume: number;
      totalNeededVolume: number;
      selectedNeededVolume: number;
      remainingPreparedVolume: number;
    }>();
    for (const entry of raw) {
      if (!seen.has(entry.detailKey)) {
        seen.set(entry.detailKey, entry);
      }
    }
    return Array.from(seen.values());
  };

  const downloadTable = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) return;
    downloadFile(serializeRecordsToCsv(data), filename, 'text/csv');
  };

  return (
    <div className="results-display">
      <ProtocolSection
        instructions={instructions}
        exportBaseName={exportBaseName}
        onDownloadIMeta={onDownloadIMeta}
        hasIMetaDownload={hasIMetaDownload}
        seedingSummary={seedingSummary}
        dyeSummary={dyeSummary}
        plateType={plateType}
        numPlates={numPlates}
        mode={mode}
        wells={wells}
      />

      {/* Summary toggle + unified section */}
      <section className="results-section">
        <div className="summary-toolbar">
          <h3 className="summary-toolbar-title">
            {summaryMode === 'cells' ? '🧪 Seeding Summary' : '🎨 Dye Program Summary'}
          </h3>
        </div>

        {mode === 'dye' && dyeSummary && dyeSummary.length > 0 && (
          <ViewModeSwitch
            mode={summaryMode}
            onToggle={toggleSummaryMode}
            className="summary-mode-switch"
            shortcutHint="⌘/Ctrl+M"
          />
        )}

        {/* ── Cells view ── */}
        {summaryMode === 'cells' && (
          <>
            {seedingSummary.length > 0 && Object.keys(wells).length > 0 ? (
              <>
                <div className="seeding-summary-container">
                  {/* Left: Plate Visualization */}
                  <div className="plate-column">
                    <div className="plate-viewer-container">
                      <div className="plate-header-info">
                        {numPlates > 1 && (
                          <div className="plate-nav">
                            <div className="plate-nav-chip">
                              <span className="plate-nav-eyebrow">Viewing</span>
                              <span className="plate-nav-value">Plate {currentPlate}</span>
                              <span className="plate-nav-divider">/</span>
                              <span className="plate-nav-total">{numPlates}</span>
                            </div>
                          </div>
                        )}
                        {selectedWells.size > 0 ? (
                          <div className="selected-info">
                            <span className="info-label">Selected:</span>
                            <span className="info-value">{selectedWells.size} wells</span>
                            {Array.from(new Set(Array.from(selectedWells).map(w => wells[w]).filter(Boolean))).length > 0 && (
                              <>
                                <span className="info-label">Groups:</span>
                                <span className="info-value">{Array.from(new Set(Array.from(selectedWells).map(w => wells[w]).filter(Boolean))).join(', ')}</span>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="placeholder-info">Click wells to select</div>
                        )}
                      </div>
                      <PlateVisualization
                        plateType={plateType}
                        wells={wells}
                        selectedWells={selectedWells}
                        wellValueLabels={cellWellValueLabels}
                        wellHoverDetails={cellWellHoverDetails}
                        showWellValueLabels={false}
                        showNativeTooltip={false}
                        groups={groups}
                        designMode="cells"
                        onExternalToggle={handleViewerToggle}
                        onExternalRangeSelect={handleViewerRangeSelect}
                        onExternalRangeDeselect={handleViewerRangeDeselect}
                      />
                    </div>
                  </div>

                  {/* Right: Details Panel */}
                  <div className="details-column">
                    {selectedWells.size > 0 ? (() => {
                      const detailsByGroup = getSelectedDetails();
                      if (detailsByGroup.length === 0) {
                        return <div className="details-empty"><p>No seeding data found for selected wells</p></div>;
                      }
                      return (
                        <div className="details-cards-container">
                          {detailsByGroup.map((detail) => (
                            <div key={detail.detailKey} className="detail-card" style={{ borderColor: groupColorMap[detail.groupName] }}>
                              <div className="detail-card-header" style={{ borderBottomColor: `${groupColorMap[detail.groupName]}44` }}>
                                <div className="detail-card-title-block">
                                  <h4 className="detail-card-title" style={{ color: groupColorMap[detail.groupName] }}>{detail.groupName}</h4>
                                  <div className="detail-card-subtitle">{detail.dispensePerWell.toFixed(1)} µL cell suspension / well</div>
                                </div>
                                <span className="detail-card-badge" style={{ background: `${groupColorMap[detail.groupName]}22`, color: groupColorMap[detail.groupName], borderColor: `${groupColorMap[detail.groupName]}66` }}>
                                  {numPlates > 1
                                    ? `${detail.count} selected / ${Number(detail.row.n_wells)} total wells`
                                    : `${detail.count} wells`}
                                </span>
                              </div>
                              <div className="detail-card-metrics">
                                <div className="metric">
                                  <span className="metric-label">Cells / Well</span>
                                  <span className="metric-value">{Number(detail.row.cells_per_well).toLocaleString()}</span>
                                  <span className="metric-unit">cells</span>
                                </div>
                                <div className="metric">
                                  <span className="metric-label">Cell Suspension Volume / Well</span>
                                  <span className="metric-value">{detail.dispensePerWell.toFixed(1)}</span>
                                  <span className="metric-unit">µL</span>
                                </div>
                                <div className="metric">
                                  <span className="metric-label">Volume for Selected Wells</span>
                                  <span className="metric-value">{detail.selectedNeededVolume.toFixed(1)}</span>
                                  <span className="metric-unit">µL</span>
                                </div>
                                <div className="metric">
                                  <span className="metric-label">Total Needed Volume{allPlatesSuffix}</span>
                                  <span className="metric-value">{detail.totalNeededVolume.toFixed(1)}</span>
                                  <span className="metric-unit">µL</span>
                                </div>
                                <div className="metric">
                                  <span className="metric-label">Remaining Cell Suspension Volume{allPlatesSuffix}</span>
                                  <span className="metric-value">{detail.remainingPreparedVolume.toFixed(1)}</span>
                                  <span className="metric-unit">µL</span>
                                </div>
                                <div className="metric">
                                  <span className="metric-label">Total Prepared Volume{allPlatesSuffix}</span>
                                  <span className="metric-value">{detail.totalPreparedVolume.toFixed(1)}</span>
                                  <span className="metric-unit">µL</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })() : (
                      <div className="details-empty"><p>Select wells from the plate to view seeding details</p></div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => downloadTable(
                    formattedSeedingSummary.length > 0 ? formattedSeedingSummary : seedingSummary,
                    `${exportBaseName}__seeding_summary.csv`
                  )}
                  className="download-btn secondary"
                >
                  📥 Download as CSV
                </button>
              </>
            ) : (
              <p className="empty-state">No seeding summary available</p>
            )}
          </>
        )}

        {/* ── Dyes view ── */}
        {summaryMode === 'dyes' && dyeSummary && dyeSummary.length > 0 && (() => {
          // Build a wells→dyeProgram map for the plate visualization
          // dyePrograms is well→programName; colour by program name
          // Build a fake "groups" map where each group = dye program, for PlateVisualization
          const dyeGroups: Record<string, Set<string>> = {};
          Object.entries(dyePrograms).forEach(([well, prog]) => {
            if (prog) {
              if (!dyeGroups[prog]) dyeGroups[prog] = new Set();
              dyeGroups[prog].add(well);
            }
          });

          // wells map for the dyes view: well→programName (so PlateVisualization colours by program)
          const dyeWells: Record<string, string> = {};
          Object.entries(dyePrograms).forEach(([well, prog]) => { if (prog) dyeWells[well] = prog; });

          // Selected well → which dye programs are selected
          const selectedPrograms = new Set(Array.from(selectedWells).map(w => dyeWells[w]).filter(Boolean));

          // Details from dyeSummary for selected programs
          const getDyeDetails = () => {
            if (selectedWells.size === 0) return [];
            return dyeSummary
              .map(row => {
                const prog = String(row.dye_program ?? '');
                if (!prog) return null;
                // Count selected wells assigned to this dye program
                const count = Array.from(selectedWells).filter(w => dyePrograms[w] === prog).length;
                if (count === 0) return null;
                const dispensePerWell = Number(row.mastermix_dispense_ul_per_well);
                const totalNeededVolume = Number(row.base_mastermix_volume_ul);
                const totalPreparedVolume = Number(row.total_mastermix_volume_ul);
                const selectedNeededVolume = dispensePerWell * count;
                const remainingPreparedVolume = Math.max(totalPreparedVolume - selectedNeededVolume, 0);
                return {
                  prog,
                  row,
                  count,
                  dispensePerWell,
                  totalNeededVolume,
                  totalPreparedVolume,
                  selectedNeededVolume,
                  remainingPreparedVolume,
                };
              })
              .filter(Boolean) as Array<{
                prog: string;
                row: Record<string, unknown>;
                count: number;
                dispensePerWell: number;
                totalNeededVolume: number;
                totalPreparedVolume: number;
                selectedNeededVolume: number;
                remainingPreparedVolume: number;
              }>;
          };

          const dyeDetails = getDyeDetails();

          return (
            <>
              <div className="seeding-summary-container">
                {/* Left: Plate */}
                <div className="plate-column">
                  <div className="plate-viewer-container">
                    <div className="plate-header-info">
                      {numPlates > 1 && (
                        <div className="plate-nav">
                          <div className="plate-nav-chip">
                            <span className="plate-nav-eyebrow">Viewing</span>
                            <span className="plate-nav-value">Plate {currentPlate}</span>
                            <span className="plate-nav-divider">/</span>
                            <span className="plate-nav-total">{numPlates}</span>
                          </div>
                        </div>
                      )}
                      {selectedWells.size > 0 ? (
                        <div className="selected-info">
                          <span className="info-label">Selected:</span>
                          <span className="info-value">{selectedWells.size} wells</span>
                          {selectedPrograms.size > 0 && (
                            <>
                              <span className="info-label">Programs:</span>
                              <span className="info-value">{Array.from(selectedPrograms).join(', ')}</span>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="placeholder-info">Click wells to select</div>
                      )}
                    </div>
                    <PlateVisualization
                      plateType={plateType}
                      wells={wells}
                      selectedWells={selectedWells}
                      wellValueLabels={dyeWellValueLabels}
                      wellHoverDetails={dyeWellHoverDetails}
                      showWellValueLabels={false}
                      showNativeTooltip={false}
                      groups={groups}
                      designMode="dyes"
                      dyePrograms={dyePrograms}
                      onExternalToggle={handleViewerToggle}
                      onExternalRangeSelect={handleViewerRangeSelect}
                      onExternalRangeDeselect={handleViewerRangeDeselect}
                    />
                  </div>
                </div>

                {/* Right: Dye details */}
                <div className="details-column">
                  {selectedWells.size > 0 ? (
                    dyeDetails.length === 0 ? (
                      <div className="details-empty"><p>No dye data found for selected wells</p></div>
                    ) : (
                      <div className="details-cards-container">
                        {dyeDetails.map(({ prog, row, count, dispensePerWell, totalNeededVolume, totalPreparedVolume, selectedNeededVolume, remainingPreparedVolume }) => (
                          <div key={prog} className="detail-card" style={{ borderColor: dyeProgramColorMap[prog] }}>
                            <div className="detail-card-header" style={{ borderBottomColor: `${dyeProgramColorMap[prog]}44` }}>
                              <div className="detail-card-title-block">
                                <h4 className="detail-card-title" style={{ color: dyeProgramColorMap[prog] }}>{prog}</h4>
                                <div className="detail-card-subtitle">{dispensePerWell.toFixed(1)} µL dye mastermix / well</div>
                              </div>
                              <span className="detail-card-badge" style={{ background: `${dyeProgramColorMap[prog]}22`, color: dyeProgramColorMap[prog], borderColor: `${dyeProgramColorMap[prog]}66` }}>{count} selected / {Number(row.n_wells)} total wells</span>
                            </div>
                            <div className="detail-card-metrics">
                              <div className="metric">
                                <span className="metric-label">Mastermix / Well</span>
                                <span className="metric-value">{dispensePerWell.toFixed(1)}</span>
                                <span className="metric-unit">µL</span>
                              </div>
                              <div className="metric">
                                <span className="metric-label">Volume for Selected Wells</span>
                                <span className="metric-value">{selectedNeededVolume.toFixed(1)}</span>
                                <span className="metric-unit">µL</span>
                              </div>
                              <div className="metric">
                                <span className="metric-label">Total Needed Volume{allPlatesSuffix}</span>
                                <span className="metric-value">{totalNeededVolume.toFixed(1)}</span>
                                <span className="metric-unit">µL</span>
                              </div>
                              <div className="metric">
                                <span className="metric-label">Remaining Dye Mastermix Volume{allPlatesSuffix}</span>
                                <span className="metric-value">{remainingPreparedVolume.toFixed(1)}</span>
                                <span className="metric-unit">µL</span>
                              </div>
                              <div className="metric">
                                <span className="metric-label">Total Prepared Volume{allPlatesSuffix}</span>
                                <span className="metric-value">{totalPreparedVolume.toFixed(1)}</span>
                                <span className="metric-unit">µL</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="details-empty"><p>Select wells from the plate to view dye details</p></div>
                  )}
                </div>
              </div>
              <button
                onClick={() => downloadTable(
                  formattedDyeSummary.length > 0 ? formattedDyeSummary : dyeSummary,
                  `${exportBaseName}__dye_program_summary.csv`
                )}
                className="download-btn secondary"
              >
                📥 Download as CSV
              </button>
            </>
          );
        })()}
      </section>
    </div>
  );
};
