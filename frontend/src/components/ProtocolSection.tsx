import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PlateVisualization,
  generateDistinctColors,
  generateDyeColor,
} from './PlateVisualization';
import { ViewModeSwitch } from './ViewModeSwitch';
import { downloadFile } from '../utils/exportUtils';
import { buildDownloadFilenameFromBase } from '../utils/downloadFilenames';
import {
  mergeProtocolDetails,
  normalizeProtocolInstructions,
  parseProtocolSections,
  parseProtocolSteps,
  parseProtocolSummary,
  parseWellList,
  splitProtocolDetail,
} from '../utils/protocolInstructions';
import '../styles/ProtocolSection.css';

interface ProtocolSectionProps {
  instructions: string;
  exportBaseName?: string;
  onDownloadIMeta?: (() => void) | null;
  hasIMetaDownload?: boolean;
  seedingSummary: Record<string, unknown>[];
  dyeSummary?: Record<string, unknown>[];
  plateType?: string;
  numPlates?: number;
  mode?: string;
  wells?: Record<string, string>;
}

type ProtocolMode = 'cells' | 'dyes';

type ProtocolEntry = {
  id: string;
  plateKey: string;
  title: string;
  subtitle: string;
  wells: string[];
  totalWellCount: number;
  details: string[];
};

type ProtocolRow = {
  label: string;
  value: string;
};

type DyeComponentSection = {
  name: string;
  concentrationRows: ProtocolRow[];
  lines: string[];
};

const formatUl = (value: unknown): string => `${Number(value ?? 0).toFixed(1)} uL`;

const uniqueStrings = (values: Array<string | undefined>): string[] => (
  Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim()))))
);

const buildUniqueLabels = (labels: string[]): string[] => {
  const totals = new Map<string, number>();
  const counts = new Map<string, number>();

  labels.forEach((label) => {
    totals.set(label, (totals.get(label) ?? 0) + 1);
  });

  return labels.map((label) => {
    if ((totals.get(label) ?? 0) <= 1) return label;
    const nextCount = (counts.get(label) ?? 0) + 1;
    counts.set(label, nextCount);
    return `${label} batch ${nextCount}`;
  });
};

export const ProtocolSection: React.FC<ProtocolSectionProps> = ({
  instructions,
  exportBaseName = 'iCELL_plate',
  onDownloadIMeta = null,
  hasIMetaDownload = false,
  seedingSummary,
  dyeSummary = [],
  plateType = '96',
  numPlates = 1,
  mode = 'no_dye',
  wells = {},
}) => {
  const [protocolMode, setProtocolMode] = useState<ProtocolMode>('cells');
  const [activeCellEntryId, setActiveCellEntryId] = useState<string | null>(null);
  const [activeDyeEntryId, setActiveDyeEntryId] = useState<string | null>(null);
  const [protocolColumnHeight, setProtocolColumnHeight] = useState<number | null>(null);
  const plateColumnRef = useRef<HTMLDivElement | null>(null);

  const toggleProtocolMode = () => {
    setProtocolMode((prev) => prev === 'cells' ? 'dyes' : 'cells');
  };

  const displayInstructions = useMemo(
    () => normalizeProtocolInstructions(instructions, numPlates),
    [instructions, numPlates],
  );

  const instructionSections = useMemo(
    () => parseProtocolSections(displayInstructions),
    [displayInstructions],
  );

  const runSummaryEntries = useMemo(() => {
    const section = instructionSections.find((entry) => entry.title === 'RUN SUMMARY');
    if (!section) return [];
    return parseProtocolSummary(section.lines)
      .filter((entry) => entry.label !== 'Wells');
  }, [instructionSections]);

  const cellSteps = useMemo(() => {
    const section = instructionSections.find((entry) => entry.title === 'CELL SUSPENSION PREPARATION');
    if (!section) return [];
    return parseProtocolSteps(section.lines).steps;
  }, [instructionSections]);

  const dyeSteps = useMemo(() => {
    const section = instructionSections.find((entry) => entry.title === 'DYE MASTERMIX PREPARATION');
    if (!section) return [];
    return parseProtocolSteps(section.lines).steps;
  }, [instructionSections]);

  const cellEntries = useMemo<ProtocolEntry[]>(() => {
    const rawEntries = seedingSummary.map((row, index) => {
      const patternWells = parseWellList(row.wells);
      const regionNames = uniqueStrings(patternWells.map((well) => wells[well]));
      const step = cellSteps[index];
      const cellsPerWell = Number(row.cells_per_well ?? 0);
      const totalWellCount = Number(row.n_wells ?? patternWells.length);
      const displayName = regionNames.length === 1 ? regionNames[0] : `Cell Prep ${index + 1}`;

      return {
        id: `protocol-cell-${index + 1}`,
        plateKey: displayName,
        title: displayName,
        subtitle: `${cellsPerWell.toLocaleString()} cells/well`,
        wells: patternWells,
        totalWellCount,
        details: mergeProtocolDetails(step?.details ?? []),
      };
    });

    const uniqueLabels = buildUniqueLabels(rawEntries.map((entry) => entry.title));
    return rawEntries.map((entry, index) => ({
      ...entry,
      plateKey: uniqueLabels[index],
      title: uniqueLabels[index],
    }));
  }, [cellSteps, seedingSummary, wells]);

  const dyeEntries = useMemo<ProtocolEntry[]>(() => {
    const rawEntries = (dyeSummary ?? []).map((row, index) => {
      const patternWells = parseWellList(row.wells);
      const dyeProgram = String(row.dye_program ?? `Dye Program ${index + 1}`);
      const step = dyeSteps[index];
      const totalWellCount = Number(row.n_wells ?? patternWells.length);

      return {
        id: `protocol-dye-${index + 1}`,
        plateKey: dyeProgram,
        title: dyeProgram,
        subtitle: `${formatUl(row.mastermix_dispense_ul_per_well)} dye mastermix / well`,
        wells: patternWells,
        totalWellCount,
        details: mergeProtocolDetails(step?.details ?? []),
      };
    });

    const uniqueLabels = buildUniqueLabels(rawEntries.map((entry) => entry.title));
    return rawEntries.map((entry, index) => ({
      ...entry,
      plateKey: uniqueLabels[index],
      title: uniqueLabels[index],
    }));
  }, [dyeSteps, dyeSummary]);

  const cellEntryByWell = useMemo(() => {
    const entryMap = new Map<string, ProtocolEntry>();
    cellEntries.forEach((entry) => {
      entry.wells.forEach((well) => entryMap.set(well, entry));
    });
    return entryMap;
  }, [cellEntries]);

  const dyeEntryByWell = useMemo(() => {
    const entryMap = new Map<string, ProtocolEntry>();
    dyeEntries.forEach((entry) => {
      entry.wells.forEach((well) => entryMap.set(well, entry));
    });
    return entryMap;
  }, [dyeEntries]);

  useEffect(() => {
    if (!cellEntries.some((entry) => entry.id === activeCellEntryId)) {
      setActiveCellEntryId(cellEntries[0]?.id ?? null);
    }
  }, [activeCellEntryId, cellEntries]);

  useEffect(() => {
    if (!dyeEntries.some((entry) => entry.id === activeDyeEntryId)) {
      setActiveDyeEntryId(dyeEntries[0]?.id ?? null);
    }
  }, [activeDyeEntryId, dyeEntries]);

  useEffect(() => {
    if (protocolMode === 'dyes' && (mode !== 'dye' || dyeEntries.length === 0)) {
      setProtocolMode('cells');
    }
  }, [dyeEntries.length, mode, protocolMode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() !== 'm') return;
      if (mode !== 'dye' || dyeEntries.length === 0) return;

      const inInput = document.activeElement instanceof HTMLInputElement
        || document.activeElement instanceof HTMLTextAreaElement
        || document.activeElement instanceof HTMLSelectElement;
      if (inInput) return;

      e.preventDefault();
      toggleProtocolMode();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dyeEntries.length, mode]);

  useEffect(() => {
    const plateColumn = plateColumnRef.current;
    if (!plateColumn || typeof ResizeObserver === 'undefined') return;

    const updateHeight = () => {
      setProtocolColumnHeight(Math.round(plateColumn.getBoundingClientRect().height));
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(plateColumn);
    window.addEventListener('resize', updateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  const cellColors = useMemo(
    () => generateDistinctColors(cellEntries.map((entry) => entry.plateKey)),
    [cellEntries],
  );

  const dyeColors = useMemo(() => (
    Object.fromEntries(dyeEntries.map((entry) => [entry.plateKey, generateDyeColor(entry.plateKey)]))
  ), [dyeEntries]);

  const cellPlateWells = useMemo(() => (
    Object.fromEntries(
      cellEntries.flatMap((entry) => entry.wells.map((well) => [well, entry.plateKey])),
    )
  ), [cellEntries]);

  const cellPlateGroups = useMemo(() => (
    Object.fromEntries(
      cellEntries.map((entry) => [entry.plateKey, new Set(entry.wells)]),
    )
  ), [cellEntries]);

  const dyePlatePrograms = useMemo(() => (
    Object.fromEntries(
      dyeEntries.flatMap((entry) => entry.wells.map((well) => [well, entry.plateKey])),
    )
  ), [dyeEntries]);

  const cellHoverDetails = useMemo(() => (
    Object.fromEntries(
      cellEntries.flatMap((entry) => entry.wells.map((well) => [
        well,
        [
          well,
          entry.title,
          entry.subtitle,
          `Dispense: ${formatUl(seedingSummary.find((row) => parseWellList(row.wells).includes(well))?.cell_suspension_dispense_ul_per_well)}`,
        ],
      ])),
    )
  ), [cellEntries, seedingSummary]);

  const dyeHoverDetails = useMemo(() => {
    const details: Record<string, string[]> = {};

    Object.keys(wells).forEach((well) => {
      const dyeEntry = dyeEntryByWell.get(well);
      if (dyeEntry) {
        const dyeRow = dyeSummary.find((row) => String(row.dye_program ?? '') === dyeEntry.plateKey);
        details[well] = [
          well,
          dyeEntry.title,
          `Dispense: ${formatUl(dyeRow?.mastermix_dispense_ul_per_well)}`,
        ];
        return;
      }

      if (wells[well]) {
        details[well] = [
          well,
          wells[well],
          'No dye program assigned',
        ];
      }
    });

    return details;
  }, [dyeEntryByWell, dyeSummary, wells]);

  const activeCellEntry = cellEntries.find((entry) => entry.id === activeCellEntryId) ?? null;
  const activeDyeEntry = dyeEntries.find((entry) => entry.id === activeDyeEntryId) ?? null;
  const activeEntry = protocolMode === 'cells' ? activeCellEntry : activeDyeEntry;
  const activeEntries = protocolMode === 'cells' ? cellEntries : dyeEntries;
  const activeColor = activeEntry
    ? (protocolMode === 'cells'
      ? cellColors[activeEntry.plateKey]
      : dyeColors[activeEntry.plateKey])
    : 'var(--icell-accent)';

  const selectedWells = useMemo(
    () => new Set(activeEntry?.wells ?? []),
    [activeEntry],
  );

  const summaryCards = useMemo(() => {
    const summaryMap = new Map(runSummaryEntries.map((entry) => [entry.label, entry.value]));
    const cards = [
      { label: 'Plate ID', value: summaryMap.get('Plate ID') ?? '' },
      { label: 'Seeded Wells', value: summaryMap.get('Seeded wells') ?? '' },
      { label: 'Final Well Volume', value: summaryMap.get('Final well volume') ?? '' },
      { label: 'Cell Prep Batches', value: `${cellEntries.length}` },
    ];

    if (mode === 'dye' && dyeEntries.length > 0) {
      cards.push({ label: 'Dye Programs', value: `${dyeEntries.length}` });
    }

    return cards.filter((entry) => entry.value);
  }, [cellEntries.length, dyeEntries.length, mode, runSummaryEntries]);

  const noDyeWellCount = useMemo(() => (
    Object.keys(wells).filter((well) => wells[well] && !dyePlatePrograms[well]).length
  ), [dyePlatePrograms, wells]);

  const handleDownloadInstructions = () => {
    downloadFile(
      instructions,
      buildDownloadFilenameFromBase(exportBaseName, 'instructions', 'txt'),
      'text/plain',
    );
  };

  const handleCellWellSelect = (well: string) => {
    const entry = cellEntryByWell.get(well);
    if (entry) {
      setActiveCellEntryId(entry.id);
    }
  };

  const handleDyeWellSelect = (well: string) => {
    const entry = dyeEntryByWell.get(well);
    setActiveDyeEntryId(entry?.id ?? null);
  };

  const renderInstructionLine = (detail: string, key: string) => {
    const normalizedDetail = detail.trim();
    const splitDetail = splitProtocolDetail(normalizedDetail);

    if (splitDetail) {
      return (
        <div key={key} className="protocol-detail-row">
          <span className="protocol-detail-row-label">{splitDetail.label}</span>
          <span className="protocol-detail-row-value">{splitDetail.value}</span>
        </div>
      );
    }

    return (
      <div key={key} className="protocol-detail-note">
        {normalizedDetail}
      </div>
    );
  };

  const parseDyeConcentrationRows = (value: string): ProtocolRow[] => (
    value
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        if (/^mastermix target concentration\b/i.test(part)) {
          return {
            label: 'Mastermix Target Concentration',
            value: part.replace(/^mastermix target concentration\b/i, '').trim(),
          };
        }
        if (/^target final concentration\b/i.test(part)) {
          return {
            label: 'Target Final Concentration',
            value: part.replace(/^target final concentration\b/i, '').trim(),
          };
        }
        if (/^mastermix target\b/i.test(part)) {
          return {
            label: 'Mastermix Target',
            value: part.replace(/^mastermix target\b/i, '').trim(),
          };
        }
        return { label: 'Concentration', value: part };
      })
  );

  const parseDyeDetails = (details: string[]) => {
    const overview: string[] = [];
    const finish: string[] = [];
    const components: DyeComponentSection[] = [];
    let currentComponent: DyeComponentSection | null = null;

    const pushCurrent = () => {
      if (currentComponent) {
        components.push(currentComponent);
        currentComponent = null;
      }
    };

    details.forEach((detail) => {
      const normalizedDetail = detail.trim();
      if (!normalizedDetail) return;

      const splitDetail = splitProtocolDetail(normalizedDetail);
      const isDiluentHeader = /^Diluent$/i.test(normalizedDetail);
      const isComponentHeader = (
        isDiluentHeader
        || (
        splitDetail
        && /(?:mastermix target concentration|target final concentration)/i.test(splitDetail.value)
        )
      );
      const isFinishLine = /^Mix well and dispense/i.test(normalizedDetail);

      if (isComponentHeader) {
        pushCurrent();
        currentComponent = {
          name: isDiluentHeader ? "Diluent" : splitDetail!.label,
          concentrationRows: isDiluentHeader ? [] : parseDyeConcentrationRows(splitDetail!.value),
          lines: [],
        };
        return;
      }

      if (isFinishLine) {
        pushCurrent();
        finish.push(normalizedDetail);
        return;
      }

      if (currentComponent) {
        currentComponent.lines.push(normalizedDetail);
      } else {
        overview.push(normalizedDetail);
      }
    });

    pushCurrent();
    return { overview, components, finish };
  };

  const renderDyeDetailBlocks = (details: string[], entryId: string) => {
    const structured = parseDyeDetails(details);

    return (
      <div className="protocol-detail-stack">
        {structured.overview.length > 0 && (
          <div className="protocol-detail-instructions">
            {structured.overview.map((detail, index) => (
              renderInstructionLine(detail, `${entryId}-overview-${index}`)
            ))}
          </div>
        )}

        {structured.components.map((component, index) => (
          <section key={`${entryId}-component-${index}`} className="protocol-detail-subsection">
            <h5 className="protocol-detail-subsection-title">{component.name}</h5>
            <div className="protocol-detail-instructions">
              {component.concentrationRows.map((row, rowIndex) => (
                <div key={`${entryId}-component-${index}-row-${rowIndex}`} className="protocol-detail-row">
                  <span className="protocol-detail-row-label">{row.label}</span>
                  <span className="protocol-detail-row-value">{row.value}</span>
                </div>
              ))}
              {component.lines.map((detail, detailIndex) => (
                renderInstructionLine(detail, `${entryId}-component-${index}-detail-${detailIndex}`)
              ))}
            </div>
          </section>
        ))}

        {structured.finish.length > 0 && (
          <section className="protocol-detail-subsection">
            <h5 className="protocol-detail-subsection-title">Finish Mastermix</h5>
            <div className="protocol-detail-instructions">
              {structured.finish.map((detail, index) => (
                renderInstructionLine(detail, `${entryId}-finish-${index}`)
              ))}
            </div>
          </section>
        )}
      </div>
    );
  };

  const renderProtocolDetails = (entry: ProtocolEntry | null) => {
    if (!entry) {
      return (
        <div className="protocol-empty-card">
          <h4>{protocolMode === 'cells' ? 'Select a Cell Prep Region' : 'Select a Dye Region'}</h4>
          <p>
            {protocolMode === 'cells'
              ? 'Click a colored region on the plate to load its preparation instructions.'
              : 'Click a colored dye region on the plate to load its mastermix instructions.'}
          </p>
        </div>
      );
    }

    return (
      <div className="protocol-detail-card" style={{ borderColor: activeColor }}>
        <div className="protocol-detail-header">
          <h4>{entry.title}</h4>
          <p className="protocol-detail-subtitle">{entry.subtitle}</p>
        </div>

        {entry.details.length > 0 ? (
          protocolMode === 'dyes'
            ? renderDyeDetailBlocks(entry.details, entry.id)
            : (
              <div className="protocol-detail-instructions">
                {entry.details.map((detail, index) => renderInstructionLine(detail, `${entry.id}-${index}`))}
              </div>
            )
        ) : (
          <div className="protocol-detail-note">
            This preparation group has no additional detail lines in the generated protocol text.
          </div>
        )}
      </div>
    );
  };

  const protocolLayoutStyle = (
    protocolColumnHeight
      ? { '--protocol-column-height': `${protocolColumnHeight}px` }
      : {}
  ) as React.CSSProperties;

  return (
    <section className="results-section protocol-section">
      <div className="protocol-header">
        <div className="protocol-header-copy">
          <h3>🧭 Protocol Navigator</h3>
        </div>
        <div className="protocol-actions">
          <button onClick={handleDownloadInstructions} className="download-btn secondary protocol-action-btn">
            📥 Download Instructions
          </button>
          {hasIMetaDownload && onDownloadIMeta && (
            <button onClick={onDownloadIMeta} className="download-btn secondary protocol-action-btn">
              🧾 Download iMETA.csv
            </button>
          )}
        </div>
      </div>

      {summaryCards.length > 0 && (
        <div className="protocol-summary-grid">
          {summaryCards.map((entry) => (
            <div key={entry.label} className="protocol-summary-card">
              <span className="protocol-summary-label">{entry.label}</span>
              <span className="protocol-summary-value">{entry.value}</span>
            </div>
          ))}
        </div>
      )}

      {mode === 'dye' && dyeEntries.length > 0 && (
        <ViewModeSwitch
          mode={protocolMode}
          onToggle={toggleProtocolMode}
          className="protocol-mode-switch"
          shortcutHint="⌘/Ctrl+M"
        />
      )}

      <div className="protocol-layout" style={protocolLayoutStyle}>
        <div className="protocol-plate-column" ref={plateColumnRef}>
          {protocolMode === 'cells' ? (
            <PlateVisualization
              plateType={plateType}
              wells={cellPlateWells}
              selectedWells={selectedWells}
              wellHoverDetails={cellHoverDetails}
              showWellValueLabels={false}
              showNativeTooltip={false}
              groups={cellPlateGroups}
              designMode="cells"
              hideLegend
              onExternalToggle={handleCellWellSelect}
            />
          ) : (
            <PlateVisualization
              plateType={plateType}
              wells={cellPlateWells}
              selectedWells={selectedWells}
              wellHoverDetails={dyeHoverDetails}
              showWellValueLabels={false}
              showNativeTooltip={false}
              groups={cellPlateGroups}
              dyePrograms={dyePlatePrograms}
              designMode="dyes"
              hideLegend
              onExternalToggle={handleDyeWellSelect}
            />
          )}

          <div className="plate-legend protocol-shared-legend">
            <div className="legend-section">
              <h4>{protocolMode === 'cells' ? 'Batch Groups' : 'Dye Programs'}</h4>
              <div className="legend-items protocol-legend-items">
                {activeEntries.map((entry) => {
                  const swatchColor = protocolMode === 'cells'
                    ? cellColors[entry.plateKey]
                    : dyeColors[entry.plateKey];
                  const isActive = activeEntry?.id === entry.id;

                  return (
                    <button
                      key={entry.id}
                      type="button"
                      className={`legend-item protocol-legend-button${isActive ? ' active' : ''}`}
                      onClick={() => {
                        if (protocolMode === 'cells') setActiveCellEntryId(entry.id);
                        else setActiveDyeEntryId(entry.id);
                      }}
                    >
                      <div
                        className="protocol-legend-swatch-box"
                        style={{ backgroundColor: swatchColor }}
                      />
                      <span>{entry.title}</span>
                      <span className="protocol-legend-count">({entry.totalWellCount}w)</span>
                    </button>
                  );
                })}
                {protocolMode === 'dyes' && noDyeWellCount > 0 && (
                  <div className="legend-item protocol-legend-static">
                    <div className="protocol-legend-swatch-box protocol-legend-empty" />
                    <span>No dye</span>
                    <span className="protocol-legend-count">({noDyeWellCount}w)</span>
                  </div>
                )}
              </div>
            </div>
            <div className="legend-section">
              <h4>Interactions</h4>
              <p className="legend-text">
                {protocolMode === 'cells'
                  ? '• Click a colored region to open its cell preparation card.'
                  : '• Click a colored dye region to open its mastermix card.'}
                <br />
                {mode === 'dye'
                  ? '• Use Cells / Dyes to switch between the two protocol maps.'
                  : '• The plate view matches the same layout and scale as the design workbench.'}
              </p>
            </div>
          </div>
        </div>

        <div className="protocol-detail-column">
          {renderProtocolDetails(activeEntry)}
        </div>
      </div>
    </section>
  );
};
