import React, { useState, useEffect, useMemo } from 'react';
import { PlateVisualization, generateDistinctColors } from '../../components/plate/PlateVisualization';
import { ProtocolSection } from '../../components/protocol/ProtocolSection';
import { ViewModeSwitch } from '../../components/inputs/ViewModeSwitch';
import {
  DetailCardHeader,
  MetricRow,
  PlateNavigationChip,
} from '../../components/primitives';
import { downloadFile } from '../../utils/export/exportUtils';
import { serializeRecordsToCsv } from '../../utils/csvExport';
import { buildDownloadFilenameFromBase } from '../../utils/export/downloadFilenames';
import { getWellRange } from '../../utils/wellRange';
import {
  buildCellWellHoverDetails,
  buildDyeWellHoverDetails,
  extractValueLabels,
} from '../../utils/wellHoverDetails';
import '../../styles/ResultsDisplay.css';

interface ResultsDisplayProps {
  instructions: string;
  seedingSummary: Record<string, unknown>[];
  dyeSummary?: Record<string, unknown>[];
  formattedSeedingSummary?: Record<string, unknown>[];
  formattedDyeSummary?: Record<string, unknown>[];
  exportBaseName?: string;
  onDownloadIMeta?: (() => void) | null;
  hasIMetaDownload?: boolean;
  onDownloadLayoutSVG?: () => void;
  onDownloadLayoutPNG?: () => void;
  onDownloadDyeSVG?: () => void;
  onDownloadDyePNG?: () => void;
  downloadingPNG?: string | null;
  plateType?: string;
  numPlates?: number;
  mode?: string;
  wells?: Record<string, string>;
  groups?: Record<string, Set<string>>;
  dyePrograms?: Record<string, string>;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  instructions,
  seedingSummary,
  dyeSummary,
  formattedSeedingSummary = [],
  formattedDyeSummary = [],
  exportBaseName = 'iCELL_plate',
  onDownloadIMeta = null,
  hasIMetaDownload = false,
  onDownloadLayoutSVG,
  onDownloadLayoutPNG,
  onDownloadDyeSVG,
  onDownloadDyePNG,
  downloadingPNG = null,
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

  const cellWellHoverDetails = buildCellWellHoverDetails({ seedingSummary, wells, numPlates, currentPlate });
  const dyeWellHoverDetails = buildDyeWellHoverDetails({ wells, dyePrograms, dyeSummary });
  const cellWellValueLabels = extractValueLabels(cellWellHoverDetails, ' cell suspension');
  const dyeWellValueLabels = extractValueLabels(dyeWellHoverDetails, ' dye mastermix');

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
          ? rawWells.map(w => w.replace(/^P\d+-/, ''))
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
                        <PlateNavigationChip currentPlate={currentPlate} numPlates={numPlates} />
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
                        ) : null}
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
                    <div className="download-panel">
                      <div className="download-panel-title">Download</div>
                      <div className="download-buttons">
                        {onDownloadLayoutSVG && <button onClick={onDownloadLayoutSVG} className="download-btn">🖼 Layout SVG</button>}
                        {onDownloadLayoutPNG && <button onClick={onDownloadLayoutPNG} disabled={downloadingPNG === 'layout'} className="download-btn">{downloadingPNG === 'layout' ? '… PNG' : '🖼 Layout PNG'}</button>}
                        <button onClick={() => downloadTable(formattedSeedingSummary.length > 0 ? formattedSeedingSummary : seedingSummary, buildDownloadFilenameFromBase(exportBaseName, 'seeding_summary', 'csv'))} className="download-btn">📄 Seeding summary CSV</button>
                      </div>
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
                              <DetailCardHeader
                                color={groupColorMap[detail.groupName]}
                                title={detail.groupName}
                                subtitle={`${detail.dispensePerWell.toFixed(1)} µL cell suspension / well`}
                                badge={numPlates > 1
                                  ? `${detail.count} selected / ${Number(detail.row.n_wells)} total wells`
                                  : `${detail.count} wells`}
                              />
                              <div className="detail-card-metrics">
                                <MetricRow label="Cells / Well" value={Number(detail.row.cells_per_well).toLocaleString()} unit="cells" />
                                <MetricRow label="Cell Suspension Volume / Well" value={detail.dispensePerWell.toFixed(1)} unit="µL" />
                                <MetricRow label="Volume for Selected Wells" value={detail.selectedNeededVolume.toFixed(1)} unit="µL" />
                                <MetricRow label={`Total Needed Volume${allPlatesSuffix}`} value={detail.totalNeededVolume.toFixed(1)} unit="µL" />
                                <MetricRow label={`Remaining Cell Suspension Volume${allPlatesSuffix}`} value={detail.remainingPreparedVolume.toFixed(1)} unit="µL" />
                                <MetricRow label={`Total Prepared Volume${allPlatesSuffix}`} value={detail.totalPreparedVolume.toFixed(1)} unit="µL" />
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
                      <PlateNavigationChip currentPlate={currentPlate} numPlates={numPlates} />
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
                    <div className="download-panel">
                      <div className="download-panel-title">Download</div>
                      <div className="download-buttons">
                        {onDownloadDyeSVG && <button onClick={onDownloadDyeSVG} className="download-btn">🖼 Dye figure SVG</button>}
                        {onDownloadDyePNG && <button onClick={onDownloadDyePNG} disabled={downloadingPNG === 'dye'} className="download-btn">{downloadingPNG === 'dye' ? '… PNG' : '🖼 Dye figure PNG'}</button>}
                        <button onClick={() => downloadTable(formattedDyeSummary.length > 0 ? formattedDyeSummary : dyeSummary, buildDownloadFilenameFromBase(exportBaseName, 'dye_program_summary', 'csv'))} className="download-btn">📄 Dye summary CSV</button>
                      </div>
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
                            <DetailCardHeader
                              color={dyeProgramColorMap[prog]}
                              title={prog}
                              subtitle={`${dispensePerWell.toFixed(1)} µL dye mastermix / well`}
                              badge={`${count} selected / ${Number(row.n_wells)} total wells`}
                            />
                            <div className="detail-card-metrics">
                              <MetricRow label="Mastermix / Well" value={dispensePerWell.toFixed(1)} unit="µL" />
                              <MetricRow label="Volume for Selected Wells" value={selectedNeededVolume.toFixed(1)} unit="µL" />
                              <MetricRow label={`Total Needed Volume${allPlatesSuffix}`} value={totalNeededVolume.toFixed(1)} unit="µL" />
                              <MetricRow label={`Remaining Dye Mastermix Volume${allPlatesSuffix}`} value={remainingPreparedVolume.toFixed(1)} unit="µL" />
                              <MetricRow label={`Total Prepared Volume${allPlatesSuffix}`} value={totalPreparedVolume.toFixed(1)} unit="µL" />
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
            </>
          );
        })()}
      </section>
    </div>
  );
};
