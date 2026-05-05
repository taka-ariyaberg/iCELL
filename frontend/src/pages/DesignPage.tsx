import React, { useState, useMemo, useEffect } from 'react';
import { NumberInput } from '../components/NumberInput';
import { PlateVisualization, generateDistinctColors, generateDyeColor } from '../components/PlateVisualization';
import { usePlateStore } from '../store/plateStore';
import { ConfigInput, DyeProgramInput } from '../services/apiClient';
import {
  generateCellLayout, generateDyeLayout,
  generateLayoutSVG, generateDyeSVG,
  generateLayoutPNG, generateDyePNG,
  downloadFile,
} from '../utils/exportUtils';
import { buildDownloadFilename } from '../utils/downloadFilenames';
import '../styles/DesignerPage.css';

export const SAVED_PROGRAMS_KEY = 'iCELL_savedDyePrograms_v2';

export interface DesignOutput {
  project_name: string;
  plate_id: string;
  seeding_date?: string;
  /** Backend-formatted plate type, e.g. '96_well' or '6,9' */
  plate_type: string;
  num_plates: number;
  mode: 'no_dye' | 'dye';
}

interface DesignPageProps {
  onProcess: (config: ConfigInput, metaDyePrograms?: DyeProgramInput[]) => void;
  onViewResults?: () => void;
  /** Pre-populate form fields when navigating back */
  initialDesign?: DesignOutput | null;
  isLoading?: boolean;
  /** When false (e.g. results page is active), disable keyboard shortcuts */
  isActive?: boolean;
}

// ─── Dye program types (also used by ParametersPage) ────────────────────────
export interface DyeDefinition {
  dyeName: string;
  stockConcentration: number;
  stockUnit: string;
  finalConcentration: number;
  finalUnit: string;
}
export interface DyeProgramDef {
  name: string;
  dyes: DyeDefinition[];
}
const BLANK_DYE: DyeDefinition = { dyeName: '', stockConcentration: 0, stockUnit: 'uM', finalConcentration: 0, finalUnit: 'uM' };

// Default dye programs — seeded on first load or when no programs exist
const DEFAULT_DYE_PROGRAMS: DyeProgramDef[] = [
  {
    name: 'Revvity_Phenovue',
    dyes: [
      { dyeName: 'PhenoVue Hoechst 33342',      stockConcentration: 1,   stockUnit: 'mg_per_ml', finalConcentration: 100, finalUnit: 'ng_per_ml' },
      { dyeName: 'PhenoVue 488 live cell',       stockConcentration: 200, stockUnit: 'X',         finalConcentration: 1,   finalUnit: 'X' },
      { dyeName: 'PhenoVue 555/647 live cell mix', stockConcentration: 1000, stockUnit: 'X',      finalConcentration: 1,   finalUnit: 'X' },
    ],
  },
  {
    name: 'CP_FULL',
    dyes: [
      { dyeName: 'Hoechst 33342',        stockConcentration: 10000, stockUnit: 'X', finalConcentration: 1, finalUnit: 'X' },
      { dyeName: 'Concanavalin A',        stockConcentration: 1000,  stockUnit: 'X', finalConcentration: 1, finalUnit: 'X' },
      { dyeName: 'SYTO 14',              stockConcentration: 1000,  stockUnit: 'X', finalConcentration: 1, finalUnit: 'X' },
      { dyeName: 'Phalloidin',           stockConcentration: 1000,  stockUnit: 'X', finalConcentration: 1, finalUnit: 'X' },
      { dyeName: 'WGA',                  stockConcentration: 1000,  stockUnit: 'X', finalConcentration: 1, finalUnit: 'X' },
      { dyeName: 'MitoTracker Deep Red', stockConcentration: 1000,  stockUnit: 'X', finalConcentration: 1, finalUnit: 'X' },
    ],
  },
];
const UNIT_OPTIONS = (
  <>
    <option value="nM">nM</option>
    <option value="uM">µM</option>
    <option value="mM">mM</option>
    <option value="ng_per_ml">ng/mL</option>
    <option value="ug_per_ml">µg/mL</option>
    <option value="mg_per_ml">mg/mL</option>
    <option value="units_per_ml">units/mL</option>
    <option value="X">X (fold)</option>
  </>
);

// ─── helpers ─────────────────────────────────────────────────────────────────
function parseInitialPlateType(raw: string | undefined) {
  const pt = (raw || '384').replace('_well', '');
  if (pt.includes(',')) {
    const [r, c] = pt.split(',').map(Number);
    return { typeStr: '384', custom: true, rows: r || 16, cols: c || 24 };
  }
  return { typeStr: pt, custom: false, rows: 16, cols: 24 };
}

function getTodayDateInputValue(): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const DesignPage: React.FC<DesignPageProps> = ({
  onProcess,
  onViewResults,
  initialDesign,
  isLoading = false,
  isActive = true,
}) => {
  const init = parseInitialPlateType(initialDesign?.plate_type);

  // Config-bar state
  const [projectName, setProjectName] = useState(() => initialDesign?.project_name || 'My Project');
  const [plateId, setPlateId] = useState(() => initialDesign?.plate_id || 'Plate 1');
  const [seedingDate, setSeedingDate] = useState(() => initialDesign?.seeding_date || getTodayDateInputValue());
  const [seedingDateTouched, setSeedingDateTouched] = useState(() => Boolean(initialDesign?.seeding_date));
  const [plateType, setPlateTypeState] = useState(() => init.typeStr);
  const [numPlates, setNumPlates] = useState(() => initialDesign?.num_plates || 1);
  const [mode, setMode] = useState<'no_dye' | 'dye'>(() => initialDesign?.mode || 'no_dye');
  const [customPlate, setCustomPlate] = useState(() => init.custom);
  const [customRows, setCustomRows] = useState(() => init.rows);
  const [customCols, setCustomCols] = useState(() => init.cols);

  // Designer state
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [densityInput, setDensityInput] = useState(500);
  // Edit Group modal state (modal block added in Task 6)
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [showConfirmProcess, setShowConfirmProcess] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDensity, setEditGroupDensity] = useState(500);
  const [selectedExistingGroup, setSelectedExistingGroup] = useState<string | null>(null);
  const [designMode, setDesignMode] = useState<'cells' | 'dyes'>('cells');
  const [dyeProgramInput, setDyeProgramInput] = useState('');
  const [showProgramDropdown, setShowProgramDropdown] = useState(false);
  const [showDyeWarning, setShowDyeWarning] = useState(false);
  const [showDyeModal, setShowDyeModal] = useState(false);
  const [unassignedInSel, setUnassignedInSel] = useState(0);
  const [downloadingPNG, setDownloadingPNG] = useState<string | null>(null);
  const [savedProgramNames, setSavedProgramNames] = useState<string[]>([]);
  const [savedPrograms, setSavedPrograms] = useState<DyeProgramDef[]>([]);
  const [modalNewDye, setModalNewDye] = useState<DyeDefinition>(BLANK_DYE);
  const [manageProg, setManageProg] = useState<string | null>(null);  // program being edited

  // Seeding parameters state
  const [stockCellConc, setStockCellConc] = useState(5_000_000);
  const [overagePct, setOveragePct] = useState(30);
  const [finalWellVolume, setFinalWellVolume] = useState(40);
  const [deadVolumeCells, setDeadVolumeCells] = useState(2000);
  const [deadVolumeDye, setDeadVolumeDye] = useState(500);

  // Plate store
  const {
    wells, selectedWells, groups, dyePrograms,
    clearWells,
    setPlateType: storeSetPlateType, clearSelection, selectAll,
    assignWellsToGroup, assignDyePrograms,
    renameGroup, updateGroupDensity,
  } = usePlateStore();

  // Load saved programs; seed defaults if nothing stored yet
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_PROGRAMS_KEY);
      let programs: DyeProgramDef[] = [];
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          programs = parsed;
        }
      }
      if (programs.length === 0) {
        programs = DEFAULT_DYE_PROGRAMS;
        localStorage.setItem(SAVED_PROGRAMS_KEY, JSON.stringify(programs));
      } else {
        // Migration: remove old individual programs; add Revvity_Phenovue if missing
        const obsolete = new Set(['CP_NUCLEAR', 'CP_LIVE_488', 'CP_LIVE_555_647']);
        programs = programs.filter(p => !obsolete.has(p.name));
        if (!programs.find(p => p.name === 'Revvity_Phenovue')) {
          programs = [DEFAULT_DYE_PROGRAMS[0], ...programs];
        }
        localStorage.setItem(SAVED_PROGRAMS_KEY, JSON.stringify(programs));
      }
      setSavedPrograms(programs);
      setSavedProgramNames(programs.map((p: any) => p.name || p).filter(Boolean));
    } catch { /* ignore */ }
  }, []);

  // Keep effective plate type in sync
  const effectivePlateType = customPlate ? `${customRows},${customCols}` : plateType;
  const normalizedPlateType = effectivePlateType.replace('_well', '');

  useEffect(() => {
    storeSetPlateType(normalizedPlateType);
  }, [normalizedPlateType]); // eslint-disable-line

  useEffect(() => {
    if (!isActive || seedingDateTouched) return;
    setSeedingDate(getTodayDateInputValue());
  }, [isActive, seedingDateTouched]);

  // Derived
  const groupColors = useMemo(() => generateDistinctColors(Object.keys(groups)), [groups]);

  const groupCounts = useMemo(() => Object.keys(groups).reduce((acc, g) => {
    acc[g] = Object.values(wells).filter(x => x === g).length;
    return acc;
  }, {} as Record<string, number>), [wells, groups]);

  const PLATE_SIZES: Record<string, number> = { '6': 6, '12': 12, '24': 24, '48': 48, '96': 96, '384': 384 };
  const plateSize = PLATE_SIZES[normalizedPlateType]
    ?? (effectivePlateType.includes(',')
      ? parseInt(effectivePlateType.split(',')[0]) * parseInt(effectivePlateType.split(',')[1])
      : 96);
  const unassignedCount = plateSize - Object.keys(wells).length;
  const hasWells = Object.keys(wells).length > 0;

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isActive) return;
      const inInput = document.activeElement instanceof HTMLInputElement ||
                      document.activeElement instanceof HTMLTextAreaElement ||
                      document.activeElement instanceof HTMLSelectElement;
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        if (inInput) return; // let the browser handle native undo in inputs
        e.preventDefault();
        usePlateStore.getState().undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        if (inInput) return;
        e.preventDefault();
        usePlateStore.getState().redo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        e.preventDefault();
        if (selectedWells.size > 0 && designMode === 'cells') {
          setShowGroupModal(true);
          setGroupNameInput(`Group ${Object.keys(groups).length + 1}`);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        if (selectedWells.size > 0 && designMode === 'dyes') {
          setShowDyeModal(true);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        if (inInput) return; // let browser select-all in the input
        e.preventDefault();
        selectAll();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        if (inInput) return;
        e.preventDefault();
        clearSelection();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
        e.preventDefault();
        if (mode === 'dye') {
          setDesignMode(prev => prev === 'cells' ? 'dyes' : 'cells');
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isActive, selectedWells, groups, designMode, mode, clearSelection, selectAll]);

  // ── handlers ────────────────────────────────────────────────────────────────
  const closeGroupModal = () => {
    setShowGroupModal(false);
    setGroupNameInput('');
    setDensityInput(500);
    setSelectedExistingGroup(null);
  };

  const handleAssignGroup = () => {
    if (!selectedWells.size || !groupNameInput.trim()) return;
    const update: Record<string, string> = {};
    selectedWells.forEach(w => { update[w] = groupNameInput.trim(); });
    assignWellsToGroup(groupNameInput.trim(), densityInput, update);
    closeGroupModal();
  };

  const applyDye = (program: string, onlyAssigned = false) => {
    const programs: Record<string, string> = {};
    selectedWells.forEach(w => {
      if (!onlyAssigned || wells[w]) programs[w] = program;
    });
    assignDyePrograms(programs);
    setShowDyeWarning(false);
  };

  const handleSetDye = () => {
    const program = dyeProgramInput.trim();
    if (!program || !selectedWells.size) return;
    let unassigned = 0;
    selectedWells.forEach(w => { if (!wells[w]) unassigned++; });
    if (unassigned > 0) {
      setUnassignedInSel(unassigned);
      setShowDyeWarning(true);
      return;
    }
    applyDye(program);
  };

  const handleProcess = () => {
    // Persist layout to sessionStorage for results page
    sessionStorage.setItem('lastProcessedWells', JSON.stringify(wells));
    sessionStorage.setItem('lastProcessedDyeAssignments', JSON.stringify(dyePrograms));
    const groupsData = Object.keys(groups).reduce((acc, g) => {
      acc[g] = Object.entries(wells).filter(([, gn]) => gn === g).map(([w]) => w);
      return acc;
    }, {} as Record<string, string[]>);
    sessionStorage.setItem('lastProcessedGroups', JSON.stringify(groupsData));

    const formattedPlateType = effectivePlateType.includes(',')
      ? effectivePlateType
      : `${effectivePlateType}_well`;

    const config: ConfigInput = {
      project_name: projectName,
      plate_id: plateId,
      plate_type: formattedPlateType,
      mode,
      stock_cell_concentration: stockCellConc,
      overage_fraction: overagePct / 100,
      num_plates: numPlates,
      seeding_date: seedingDate || undefined,
      final_well_volume_ul: finalWellVolume,
      dead_volume_cells_ul: deadVolumeCells,
      dead_volume_dye_ul: deadVolumeDye,
    };

    let metaDyePrograms: DyeProgramInput[] | undefined;
    if (mode === 'dye') {
      try {
        const saved = localStorage.getItem(SAVED_PROGRAMS_KEY);
        if (saved) {
          const programs = JSON.parse(saved) as DyeProgramDef[];
          if (Array.isArray(programs) && programs.length > 0) {
            sessionStorage.setItem('dyePrograms', JSON.stringify(programs));
            metaDyePrograms = programs.map(p => ({
              name: p.name,
              dyes: p.dyes.map(d => ({
                dye_name: d.dyeName,
                stock_concentration: d.stockConcentration,
                stock_concentration_unit: d.stockUnit,
                final_concentration: d.finalConcentration,
                final_concentration_unit: d.finalUnit,
              })),
            }));
          }
        }
      } catch { /* ignore */ }
    }

    onProcess(config, metaDyePrograms);
  };

  // ── download helpers ────────────────────────────────────────────────────────
  const handleDownloadLayoutCSV = () => downloadFile(
    generateCellLayout({ plateType: effectivePlateType, wells, groups }),
    buildDownloadFilename('cell_layout', 'csv', projectName, plateId),
    'text/csv',
  );
  const handleDownloadLayoutSVG = () => downloadFile(
    generateLayoutSVG({ plateType: effectivePlateType, wells, groups }),
    buildDownloadFilename('plate_layout', 'svg', projectName, plateId),
    'image/svg+xml',
  );
  const handleDownloadDyeCSV = () => downloadFile(
    generateDyeLayout({ plateType: effectivePlateType, wells, dyePrograms }),
    buildDownloadFilename('dye_layout', 'csv', projectName, plateId),
    'text/csv',
  );
  const handleDownloadDyeSVG = () => downloadFile(
    generateDyeSVG({ plateType: effectivePlateType, wells, groups, dyePrograms }),
    buildDownloadFilename('dye_assignment', 'svg', projectName, plateId),
    'image/svg+xml',
  );

  const handleDownloadLayoutPNG = async () => {
    setDownloadingPNG('layout');
    try {
      await generateLayoutPNG(
        { plateType: effectivePlateType, wells, groups },
        buildDownloadFilename('plate_layout', 'png', projectName, plateId),
      );
    }
    catch { alert('Failed to generate PNG.'); }
    finally { setDownloadingPNG(null); }
  };
  const handleDownloadDyePNG = async () => {
    setDownloadingPNG('dye');
    try {
      await generateDyePNG(
        { plateType: effectivePlateType, wells, groups, dyePrograms },
        buildDownloadFilename('dye_assignment', 'png', projectName, plateId),
      );
    }
    catch { alert('Failed to generate PNG.'); }
    finally { setDownloadingPNG(null); }
  };

  // ── inline style tokens ─────────────────────────────────────────────────────
  const S = {
    label: { fontSize: '10px', color: '#888', marginBottom: '3px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' } as React.CSSProperties,
    input: { minHeight: '44px', padding: '10px 12px', background: '#1a1f2e', border: '1px solid #3a4857', borderRadius: '4px', color: '#fff', fontSize: '13px' } as React.CSSProperties,
    sep: { width: '1px', height: '36px', background: '#2a3847', alignSelf: 'center' } as React.CSSProperties,
  };

  const modeBtn = (m: 'no_dye' | 'dye') => ({
    padding: '6px 12px',
    background: mode === m ? '#00b8ff' : '#1a1f2e',
    color: mode === m ? '#0f1419' : '#aaa',
    border: `1px solid ${mode === m ? '#00b8ff' : '#3a4857'}`,
    borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: mode === m ? 700 : 400,
  } as React.CSSProperties);

  const dmBtn = (dm: 'cells' | 'dyes') => ({
    padding: '6px 12px',
    background: designMode === dm ? '#00b8ff' : '#2a3f4f',
    color: designMode === dm ? '#0f1419' : '#fff',
    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: designMode === dm ? 600 : 400,
  } as React.CSSProperties);

  const dlBtn = { padding: '8px 10px', background: '#2a3f4f', color: '#ccc', border: '1px solid #3a4857', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 } as React.CSSProperties;

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <h2 className="page-title">Plate Designer</h2>
      <div className="designer-page">

      {/* ── Compact config bar ───────────────────────────────────────────────── */}
      <div style={{ background: '#0f1419', borderBottom: '1px solid #2a3847', padding: '12px 20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>

          {/* Project info */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div>
              <div style={S.label}>Project</div>
              <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)}
                onFocus={e => e.target.select()} disabled={isLoading} style={{ ...S.input, width: '150px' }} />
            </div>
            <div>
              <div style={S.label}>Plate ID</div>
              <input type="text" value={plateId} onChange={e => setPlateId(e.target.value)}
                onFocus={e => e.target.select()} disabled={isLoading} style={{ ...S.input, width: '110px' }} />
            </div>
            <div>
              <div style={S.label}>Seeding Date</div>
              <input
                type="date"
                value={seedingDate}
                onChange={e => {
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
                onChange={e => {
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
                    onChange={e => setCustomRows(parseInt(e.target.value) || 1)} disabled={isLoading}
                    onFocus={e => e.target.select()} style={{ ...S.input, width: '78px' }} />
                </div>
                <div>
                  <div style={S.label}>Cols</div>
                  <NumberInput min={1} max={48} value={customCols}
                    onChange={e => setCustomCols(parseInt(e.target.value) || 1)} disabled={isLoading}
                    onFocus={e => e.target.select()} style={{ ...S.input, width: '78px' }} />
                </div>
              </>
            )}
            <div>
              <div style={S.label}># Plates</div>
              <NumberInput min={1} value={numPlates}
                onChange={e => setNumPlates(parseInt(e.target.value) || 1)} disabled={isLoading}
                onFocus={e => e.target.select()} style={{ ...S.input, width: '84px' }} />
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

      {/* ── Plate designer ───────────────────────────────────────────────────── */}
      <div className="designer-layout">

        {/* Plate visualization */}
        <div className="plate-section">
          <div className="plate-info">
            <span>{Object.keys(wells).length} wells assigned</span>
            {mode === 'dye' && selectedWells.size > 0 && <span>| {selectedWells.size} selected</span>}
          </div>
          <PlateVisualization
            plateType={normalizedPlateType}
            wells={wells}
            selectedWells={selectedWells}
            showNativeTooltip={false}
            groups={groups}
            dyePrograms={dyePrograms}
            designMode={designMode}
          />
        </div>

        {/* Controls */}
        <div className="controls-section">

          {/* Design-mode toggle (dye mode only) */}
          {mode === 'dye' && (
            <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #3a4857' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ fontWeight: 600, marginBottom: 0 }}>Design Mode:</label>
                <button onClick={() => setDesignMode('cells')} style={dmBtn('cells')}>Cells</button>
                <button onClick={() => setDesignMode('dyes')} style={dmBtn('dyes')}>Dyes</button>
                <span style={{ fontSize: '11px', color: '#4a6070', marginLeft: '4px' }}>⌘/Ctrl+M</span>
              </div>
            </div>
          )}

          <h3>{designMode === 'cells' ? 'Groups' : 'Dye Programs'}</h3>

          {/* Selection info */}
          {selectedWells.size > 0 && (
            <div className="info-box">
              <strong>{selectedWells.size} well{selectedWells.size === 1 ? '' : 's'} selected</strong>
              <small>
                {designMode === 'cells'
                  ? <>Click: toggle • Shift+Drag: Select region • Alt+Drag: Deselect &amp; unassign • ⌘/Ctrl+G: Assign group • ⌘/Ctrl+M: Toggle mode</>
                  : <>Click: toggle • Shift+Drag: Select region • Opt/Alt+Drag: Deselect wells • ⌘/Ctrl+P: Assign dye program • ⌘/Ctrl+M: Toggle mode</>}
              </small>
            </div>
          )}

          {/* ── Cells mode ── */}
          {designMode === 'cells' ? (
            <>
              {selectedWells.size > 0 && (
                <div className="control-group">
                  <button
                    onClick={() => { setShowGroupModal(true); setGroupNameInput(`Group ${Object.keys(groups).length + 1}`); }}
                    disabled={isLoading} className="action-btn large"
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
                          onClick={() => {
                            setEditingGroup(name);
                            setEditGroupName(name);
                            setEditGroupDensity(def.density);
                          }}
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
          ) : (
            /* ── Dyes mode ── */
            <>
              {selectedWells.size > 0 && (
                <div className="control-group">
                  <button
                    onClick={() => setShowDyeModal(true)}
                    disabled={isLoading} className="action-btn large"
                  >
                    Assign Dye Program (⌘/Ctrl+P)
                  </button>
                </div>
              )}
              {selectedWells.size > 0 && (
                <div className="control-group">
                  <label htmlFor="dye-program-input">Dye Program</label>
                  {/* Custom combobox: plain input + embedded chevron + floating dropdown */}
                  <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        id="dye-program-input"
                        type="text"
                        value={dyeProgramInput}
                        onChange={e => { setDyeProgramInput(e.target.value.toUpperCase()); setShowProgramDropdown(false); }}
                        onFocus={e => e.target.select()}
                        onClick={e => (e.target as HTMLInputElement).select()}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const prog = dyeProgramInput.trim();
                            if (!prog) return;
                            setShowProgramDropdown(false);
                            if (!savedProgramNames.includes(prog)) setShowDyeModal(true);
                            else handleSetDye();
                          }
                          if (e.key === 'Escape') setShowProgramDropdown(false);
                          if (e.key === 'ArrowDown') { e.preventDefault(); setShowProgramDropdown(true); }
                        }}
                        onBlur={() => setTimeout(() => setShowProgramDropdown(false), 150)}
                        placeholder="Type a program name…"
                        disabled={isLoading}
                        autoComplete="off"
                        style={{ width: '100%', paddingRight: savedProgramNames.length > 0 ? '36px' : undefined, boxSizing: 'border-box' }}
                      />
                      {/* Chevron inside the input field — only shown when saved programs exist */}
                      {savedProgramNames.length > 0 && (
                        <button
                          type="button"
                          tabIndex={-1}
                          onMouseDown={e => { e.preventDefault(); setShowProgramDropdown(v => !v); }}
                          style={{
                            position: 'absolute', right: 0, top: 0, bottom: 0, width: '34px',
                            background: '#1a1f2e', border: 'none',
                            borderLeft: '1px solid #3a4857',
                            color: showProgramDropdown ? '#00d9ff' : '#9ab2c4',
                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '12px', fontWeight: 700,
                            transition: 'color 0.15s, background 0.15s',
                            borderRadius: '0 6px 6px 0',
                          }}
                          disabled={isLoading}
                          title="Show saved programs"
                        >{showProgramDropdown ? '▲' : '▼'}</button>
                      )}
                      {/* Floating dropdown panel */}
                      {showProgramDropdown && savedProgramNames.length > 0 && (
                        <div style={{
                          position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, zIndex: 100,
                          background: '#0f1623', border: '1px solid #2a3847',
                          borderRadius: '6px', overflow: 'hidden',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                        }}>
                          {savedProgramNames.map(name => {
                            const c = generateDyeColor(name);
                            const isActive = dyeProgramInput === name;
                            return (
                              <div
                                key={name}
                                onMouseDown={e => { e.preventDefault(); setDyeProgramInput(name); setShowProgramDropdown(false); }}
                                style={{
                                  padding: '8px 12px', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', gap: '8px',
                                  borderLeft: `3px solid ${isActive ? c : 'transparent'}`,
                                  background: isActive ? `${c}18` : 'transparent',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = isActive ? `${c}18` : 'rgba(255,255,255,0.04)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = isActive ? `${c}18` : 'transparent'; }}
                              >
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0, boxShadow: `0 0 4px ${c}` }} />
                                <span style={{ fontSize: '12px', fontWeight: 600, color: isActive ? c : '#c0ccd8' }}>{name}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        const prog = dyeProgramInput.trim();
                        if (!prog || selectedWells.size === 0) return;
                        setShowProgramDropdown(false);
                        if (!savedProgramNames.includes(prog)) setShowDyeModal(true);
                        else handleSetDye();
                      }}
                      disabled={!dyeProgramInput.trim() || selectedWells.size === 0 || isLoading}
                      className="action-btn"
                    >
                      Apply
                    </button>
                  </div>
                  {savedProgramNames.length === 0 && (
                    <small style={{ color: '#888', display: 'block', marginTop: '4px' }}>
                      No saved programs yet — type a name and click Apply to define it.
                    </small>
                  )}
                </div>
              )}

              {savedPrograms.length > 0 && (
                <div className="control-group">
                  <label>Defined Programs:</label>
                  <div className="group-list">
                    {savedPrograms.map((prog, _idx) => {
                      const color = generateDyeColor(prog.name);
                      const wellCount = Object.values(dyePrograms).filter(p => p === prog.name).length;
                      const isSelected = dyeProgramInput === prog.name;
                      const canAssign = selectedWells.size > 0 && !isLoading;
                      return (
                        <div
                          key={prog.name}
                          className="group-item dye-program-card"
                          onClick={() => {
                            setDyeProgramInput(prog.name);
                            if (canAssign) {
                              // apply directly — known program
                              applyDye(prog.name);
                            }
                          }}
                          style={{
                            cursor: canAssign ? 'pointer' : 'default',
                            border: isSelected ? `1px solid ${color}` : '1px solid #2a3847',
                            background: isSelected ? `${color}14` : '#0f1419',
                            gap: '8px',
                            transition: 'border-color 0.15s, background 0.15s',
                          }}
                          title={canAssign ? `Assign selected wells to ${prog.name}` : prog.name}
                        >
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}88` }} />
                          <span style={{ flex: 1, fontWeight: 600, fontSize: '12px', color: isSelected ? color : '#e0e6ee' }}>{prog.name}</span>
                          <span style={{ color: '#5a6677', fontSize: '11px', whiteSpace: 'nowrap' }}>
                            {prog.dyes.length} {prog.dyes.length === 1 ? 'dye' : 'dyes'}
                            {wellCount > 0 && <> · <span style={{ color: color, fontWeight: 600 }}>{wellCount}w</span></>}
                          </span>
                          <button
                            className="dye-edit-btn"
                            onClick={e => { e.stopPropagation(); setManageProg(prog.name); setModalNewDye(BLANK_DYE); }}
                            style={{ background: 'rgba(0,184,255,0.12)', border: '1px solid rgba(0,184,255,0.35)', borderRadius: '3px', cursor: 'pointer', fontSize: '12px', padding: '2px 6px', lineHeight: 1, color: '#00b8ff', fontWeight: 600 }}
                            title="Edit program"
                          >Edit</button>
                          <button
                            className="dye-delete-btn"
                            onClick={e => {
                              e.stopPropagation();
                              const updated = savedPrograms.filter(p => p.name !== prog.name);
                              setSavedPrograms(updated);
                              setSavedProgramNames(updated.map(p => p.name));
                              localStorage.setItem(SAVED_PROGRAMS_KEY, JSON.stringify(updated));
                              if (dyeProgramInput === prog.name) setDyeProgramInput('');
                            }}
                            style={{ background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.35)', borderRadius: '3px', cursor: 'pointer', fontSize: '12px', padding: '2px 6px', lineHeight: 1, color: '#ff6b6b', fontWeight: 600 }}
                            title="Delete program"
                          >✕</button>
                        </div>
                      );
                    })}
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
          )}

          {/* Clear */}
          <div className="control-group">
            <button onClick={clearWells} disabled={isLoading || !hasWells} className="secondary-btn">
              Clear All
            </button>
          </div>

          {/* Downloads */}
          {hasWells && (
            <div className="control-group" style={{ borderTop: '1px solid #3a4857', paddingTop: '12px', marginTop: '16px' }}>
              <label style={{ marginBottom: '12px' }}>Download</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '12px' }}>
                <button onClick={handleDownloadLayoutCSV} disabled={isLoading} style={dlBtn}>Layout CSV</button>
                <button onClick={handleDownloadLayoutSVG} disabled={isLoading} style={dlBtn}>Layout SVG</button>
                <button onClick={handleDownloadLayoutPNG} disabled={isLoading || downloadingPNG === 'layout'} style={{ ...dlBtn, opacity: downloadingPNG === 'layout' ? 0.6 : 1 }}>
                  {downloadingPNG === 'layout' ? 'Generating…' : 'Layout PNG'}
                </button>
              </div>
              {mode === 'dye' && Object.values(dyePrograms).some(d => d) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  <button onClick={handleDownloadDyeCSV} disabled={isLoading} style={dlBtn}>Dye CSV</button>
                  <button onClick={handleDownloadDyeSVG} disabled={isLoading} style={dlBtn}>Dye SVG</button>
                  <button onClick={handleDownloadDyePNG} disabled={isLoading || downloadingPNG === 'dye'} style={{ ...dlBtn, opacity: downloadingPNG === 'dye' ? 0.6 : 1 }}>
                    {downloadingPNG === 'dye' ? 'Generating…' : 'Dye PNG'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Parameters Panel ─────────────────────────────────────────────────── */}
      <div className="params-panel">
        <div className="params-header">Parameters</div>
        <div className="params-fieldset">
          <div className="params-row">
            <div className="form-group">
              <label htmlFor="stock_cell_conc">Stock Cell Concentration (cells/mL)</label>
              <NumberInput
                id="stock_cell_conc" value={stockCellConc}
                onChange={e => setStockCellConc(parseInt(e.target.value))} disabled={isLoading}
                onFocus={e => e.target.select()}
              />
            </div>
            <div className="form-group">
              <label htmlFor="overage_pct">Overage (%)</label>
              <NumberInput
                id="overage_pct" step="5" min="0" max="200" value={overagePct}
                onChange={e => setOveragePct(parseInt(e.target.value))} disabled={isLoading}
                onFocus={e => e.target.select()}
              />
              <small>Extra volume to account for waste</small>
            </div>
            <div className="form-group">
              <label htmlFor="final_well_vol">Final Well Volume (µL)</label>
              <NumberInput
                id="final_well_vol" min="10" max="200" step="5" value={finalWellVolume}
                onChange={e => setFinalWellVolume(parseInt(e.target.value))} disabled={isLoading}
                onFocus={e => e.target.select()}
              />
              <small>
                {mode === 'no_dye'
                  ? `All ${finalWellVolume} µL from cells`
                  : `Split: ${finalWellVolume / 2} µL cells + ${finalWellVolume / 2} µL dye mix`}
              </small>
            </div>
            <div className="form-group">
              <label htmlFor="dead_vol_cells">Dead Volume – Cell Suspension (µL)</label>
              <NumberInput
                id="dead_vol_cells" value={deadVolumeCells}
                onChange={e => setDeadVolumeCells(parseInt(e.target.value))} disabled={isLoading}
                onFocus={e => e.target.select()}
              />
            </div>
            {mode === 'dye' && (
              <div className="form-group">
                <label htmlFor="dead_vol_dye">Dead Volume – Dye (µL)</label>
                <NumberInput
                  id="dead_vol_dye" value={deadVolumeDye}
                  onChange={e => setDeadVolumeDye(parseInt(e.target.value))} disabled={isLoading}
                  onFocus={e => e.target.select()}
                />
              </div>
            )}
          </div>
        </div>
        <div className="params-footer">
          <button
            onClick={() => setShowConfirmProcess(true)}
            disabled={isLoading || !hasWells}
            className="process-btn"
          >
            {isLoading ? 'Processing…' : '▶ Process'}
          </button>
        </div>
      </div>

      {/* ── Group Assignment Modal ────────────────────────────────────────────── */}
      {showGroupModal && selectedWells.size > 0 && (
        <div className="modal-overlay" onClick={closeGroupModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Assign {selectedWells.size} Well{selectedWells.size === 1 ? '' : 's'} to Group</h3>
            <div className="modal-form">
              <div className="form-group">
                <label htmlFor="group-name">Group Name</label>
                <input
                  id="group-name" type="text" value={groupNameInput}
                  onChange={e => setGroupNameInput(e.target.value)}
                  placeholder="e.g., Group 1, Control, Treatment-A"
                  onFocus={e => e.target.select()}
                  onKeyDown={e => e.key === 'Enter' && handleAssignGroup()}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="density-input">Seeding Density (cells per well)</label>
                <NumberInput
                  id="density-input" value={densityInput}
                  onChange={e => setDensityInput(parseInt(e.target.value) || 0)}
                  onFocus={e => e.target.select()}
                  onKeyDown={e => e.key === 'Enter' && handleAssignGroup()}
                  min="0" step="100"
                />
              </div>
              {Object.keys(groups).length > 0 && (
                <div className="existing-groups">
                  <p><small>Or select existing group:</small></p>
                  <div className="group-buttons">
                    {Object.entries(groups).map(([gName, gDef]) => (
                      <button key={gName} className="group-option"
                        style={{
                          backgroundColor: selectedExistingGroup === gName ? '#00b8ff' : '#2a3f4f',
                          color: '#fff', fontWeight: selectedExistingGroup === gName ? 600 : 400,
                          border: selectedExistingGroup === gName ? '2px solid #00d9ff' : '1px solid #3a4857',
                        }}
                        onClick={() => { setGroupNameInput(gName); setDensityInput(gDef.density || 500); setSelectedExistingGroup(gName); }}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAssignGroup(); } }}
                      >
                        {gName} <small>({groupCounts[gName] || 0}w • {gDef.density}c/w)</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button onClick={closeGroupModal} className="secondary-btn">Cancel</button>
              <button onClick={handleAssignGroup} disabled={!groupNameInput.trim() || densityInput <= 0} className="action-btn">
                Assign to {groupNameInput.trim() ? `"${groupNameInput.trim()}"` : 'Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Group Modal ─────────────────────────────────────────────────── */}
      {editingGroup !== null && (() => {
        const oldName = editingGroup;
        const trimmed = editGroupName.trim();
        const collision = trimmed.length > 0 && trimmed !== oldName && Object.prototype.hasOwnProperty.call(groups, trimmed);
        const empty = trimmed.length === 0;
        const nameChanged = trimmed !== oldName;
        const densityChanged = editGroupDensity !== groups[oldName]?.density;
        const canSave = !collision && !empty && (nameChanged || densityChanged);

        const handleEditSave = () => {
          try {
            const effectiveName = nameChanged ? trimmed : oldName;
            if (nameChanged) renameGroup(oldName, trimmed);
            if (densityChanged) updateGroupDensity(effectiveName, editGroupDensity);
            setEditingGroup(null);
          } catch (err) {
            console.error('[DesignPage] Edit Group save failed', err);
          }
        };

        return (
          <div className="modal-overlay" onClick={() => setEditingGroup(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Edit Group: {oldName}</h3>
              <div className="modal-form">
                <div className="form-group">
                  <label htmlFor="edit-group-name">Group Name</label>
                  <input
                    id="edit-group-name"
                    type="text"
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    autoFocus
                    onFocus={(e) => e.target.select()}
                  />
                  {collision && (
                    <div style={{ color: '#ff6b6b', fontSize: '12px', marginTop: '4px' }}>
                      A group named "{trimmed}" already exists.
                    </div>
                  )}
                  {empty && (
                    <div style={{ color: '#ff6b6b', fontSize: '12px', marginTop: '4px' }}>
                      Name cannot be empty.
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="edit-group-density">Cells per Well</label>
                  <NumberInput
                    id="edit-group-density"
                    value={editGroupDensity}
                    onChange={(e) => setEditGroupDensity(parseInt(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button onClick={() => setEditingGroup(null)} className="modal-cancel-btn">Cancel</button>
                <button onClick={handleEditSave} disabled={!canSave} className="modal-confirm-btn">Save</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Confirm Process Modal ────────────────────────────────────────────── */}
      {showConfirmProcess && (() => {
        const groupRows = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
        const dyeRows = savedPrograms
          .map((prog) => ({
            name: prog.name,
            wells: Object.values(dyePrograms).filter((p) => p === prog.name).length,
          }))
          .filter((row) => row.wells > 0);

        const onCancel = () => setShowConfirmProcess(false);
        const onConfirm = () => {
          setShowConfirmProcess(false);
          handleProcess();
        };

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
      })()}

      {/* ── Dye Assignment Modal ─────────────────────────────────────────────── */}
      {showDyeModal && selectedWells.size > 0 && (() => {
        const currentDyes = savedPrograms.find(p => p.name === dyeProgramInput)?.dyes || [];
        const canAddDye = modalNewDye.dyeName.trim() !== '' && modalNewDye.stockConcentration > 0 && modalNewDye.finalConcentration > 0;
        const selectSt: React.CSSProperties = { padding: '8px', background: '#1a1f2e', border: '1px solid #3a4857', borderRadius: '4px', color: '#fff', fontSize: '12px', minWidth: '80px', cursor: 'pointer' };

        const addDyeToProgram = () => {
          if (!canAddDye || !dyeProgramInput) return;
          const updated = savedPrograms.some(p => p.name === dyeProgramInput)
            ? savedPrograms.map(p => p.name === dyeProgramInput ? { ...p, dyes: [...p.dyes, modalNewDye] } : p)
            : [...savedPrograms, { name: dyeProgramInput, dyes: [modalNewDye] }];
          setSavedPrograms(updated);
          setSavedProgramNames(updated.map(p => p.name));
          localStorage.setItem(SAVED_PROGRAMS_KEY, JSON.stringify(updated));
          setModalNewDye(BLANK_DYE);
        };

        const removeDyeFromProgram = (idx: number) => {
          const updated = savedPrograms.map(p => p.name === dyeProgramInput ? { ...p, dyes: p.dyes.filter((_, i) => i !== idx) } : p);
          setSavedPrograms(updated);
          localStorage.setItem(SAVED_PROGRAMS_KEY, JSON.stringify(updated));
        };

        const handleAssignDye = () => {
          // Ensure program exists in savedPrograms (even with no dyes yet)
          if (dyeProgramInput && !savedPrograms.some(p => p.name === dyeProgramInput)) {
            const updated = [...savedPrograms, { name: dyeProgramInput, dyes: [] }];
            setSavedPrograms(updated);
            setSavedProgramNames(updated.map(p => p.name));
            localStorage.setItem(SAVED_PROGRAMS_KEY, JSON.stringify(updated));
          }
          setShowDyeModal(false);
          handleSetDye();
        };

        return (
          <div className="modal-overlay" onClick={() => setShowDyeModal(false)}>
            <form className="modal-content" onClick={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); if (dyeProgramInput.trim()) handleAssignDye(); }} style={{ maxWidth: '580px', maxHeight: '85vh', overflowY: 'auto' }}>
              <h3>Assign {selectedWells.size} Well{selectedWells.size === 1 ? '' : 's'} to Dye Program</h3>
              <div className="modal-form">

                {/* Program name */}
                <div className="form-group">
                  <label htmlFor="dye-modal-input">Program Name</label>
                  <input
                    id="dye-modal-input"
                    type="text"
                    list="saved-programs-list-modal"
                    value={dyeProgramInput}
                    onChange={e => { setDyeProgramInput(e.target.value.toUpperCase()); setModalNewDye(BLANK_DYE); }}
                    onFocus={e => e.target.select()}
                    placeholder="e.g., CP_A, NUCLEAR, CYTO"
                    autoFocus
                  />
                  <datalist id="saved-programs-list-modal">
                    {savedProgramNames.map(n => <option key={n} value={n} />)}
                  </datalist>
                </div>

                {/* Existing program picker */}
                {savedProgramNames.length > 0 && (
                  <div className="existing-groups">
                    <p><small>Or select existing program:</small></p>
                    <div className="group-buttons">
                      {savedProgramNames.map(prog => (
                        <button key={prog} className="group-option"
                          style={{
                            backgroundColor: dyeProgramInput === prog ? '#00b8ff' : '#2a3f4f',
                            color: '#fff', fontWeight: dyeProgramInput === prog ? 600 : 400,
                            border: dyeProgramInput === prog ? '2px solid #00d9ff' : '1px solid #3a4857',
                          }}
                          onClick={() => { setDyeProgramInput(prog); setModalNewDye(BLANK_DYE); }}
                        >
                          {prog}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Define program dyes */}
                {dyeProgramInput.trim() && (
                  <div style={{ borderTop: '1px solid #2a3847', paddingTop: '16px' }}>
                    <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#00b8ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Define "{dyeProgramInput}" Dye Composition
                    </p>

                    {/* Existing dyes */}
                    {currentDyes.length > 0 && (
                      <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {currentDyes.map((dye, idx) => (
                          <div key={idx} style={{
                            display: 'grid', gridTemplateColumns: '1fr 1.3fr 1.3fr auto',
                            gap: '8px', alignItems: 'center', padding: '8px 10px',
                            background: '#252d3d', borderRadius: '4px', fontSize: '12px', border: '1px solid #3a4857',
                          }}>
                            <span style={{ color: '#00d9ff', fontWeight: 600 }}>{dye.dyeName}</span>
                            <span style={{ color: '#aaa' }}><span style={{ color: '#a0aab8' }}>Stock: </span>{dye.stockConcentration} {dye.stockUnit}</span>
                            <span style={{ color: '#aaa' }}><span style={{ color: '#a0aab8' }}>Final: </span>{dye.finalConcentration} {dye.finalUnit}</span>
                            <button type="button" onClick={() => removeDyeFromProgram(idx)}
                              style={{ background: 'none', border: 'none', color: '#ff6b9d', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }} title="Remove">✕</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add dye form */}
                    <div style={{ background: '#252d3d', padding: '12px', borderRadius: '4px', border: '1px solid #3a4857', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <p style={{ fontSize: '11px', color: '#a0aab8', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Add Dye</p>
                      <input type="text" placeholder="Dye name (e.g., Hoechst_33342)"
                        value={modalNewDye.dyeName}
                        onChange={e => setModalNewDye({ ...modalNewDye, dyeName: e.target.value })}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (canAddDye) addDyeToProgram(); } }}
                        style={{ padding: '8px 10px', background: '#1a1f2e', border: `1px solid ${modalNewDye.dyeName ? '#00b8ff' : '#3a4857'}`, borderRadius: '4px', color: '#fff', fontSize: '12px' }}
                      />
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <label style={{ fontSize: '11px', color: '#a0aab8', whiteSpace: 'nowrap' }}>Stock:</label>
                        <NumberInput placeholder="conc." value={modalNewDye.stockConcentration || ''}
                          onChange={e => setModalNewDye({ ...modalNewDye, stockConcentration: parseFloat(e.target.value) || 0 })}
                          onFocus={e => e.target.select()}
                          style={{ flex: 1, padding: '8px', background: '#1a1f2e', border: `1px solid ${modalNewDye.stockConcentration > 0 ? '#00b8ff' : '#3a4857'}`, borderRadius: '4px', color: '#fff', fontSize: '12px' }}
                        />
                        <select value={modalNewDye.stockUnit} onChange={e => setModalNewDye({ ...modalNewDye, stockUnit: e.target.value })} style={selectSt}>{UNIT_OPTIONS}</select>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <label style={{ fontSize: '11px', color: '#a0aab8', whiteSpace: 'nowrap' }}>Final:</label>
                        <NumberInput placeholder="conc." value={modalNewDye.finalConcentration || ''}
                          onChange={e => setModalNewDye({ ...modalNewDye, finalConcentration: parseFloat(e.target.value) || 0 })}
                          onFocus={e => e.target.select()}
                          style={{ flex: 1, padding: '8px', background: '#1a1f2e', border: `1px solid ${modalNewDye.finalConcentration > 0 ? '#00b8ff' : '#3a4857'}`, borderRadius: '4px', color: '#fff', fontSize: '12px' }}
                        />
                        <select value={modalNewDye.finalUnit} onChange={e => setModalNewDye({ ...modalNewDye, finalUnit: e.target.value })} style={selectSt}>{UNIT_OPTIONS}</select>
                      </div>
                      <button type="button" onClick={addDyeToProgram} disabled={!canAddDye}
                        style={{ padding: '8px', background: canAddDye ? '#00d9ff' : '#3a4857', color: canAddDye ? '#0f1419' : '#888', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: canAddDye ? 'pointer' : 'not-allowed', fontSize: '12px' }}>
                        + Add Dye to "{dyeProgramInput}"
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowDyeModal(false)} className="secondary-btn">Cancel</button>
                <button type="submit" disabled={!dyeProgramInput.trim()} className="action-btn">
                  Assign {selectedWells.size} well{selectedWells.size === 1 ? '' : 's'} to "{dyeProgramInput.trim() || '…'}"
                </button>
              </div>
            </form>
          </div>
        );
      })()}

      {/* ── Manage Dye Program Modal ─────────────────────────────────────────── */}
      {manageProg !== null && (() => {
        const prog = savedPrograms.find(p => p.name === manageProg);
        if (!prog) { setManageProg(null); return null; }
        const canAddDye = modalNewDye.dyeName.trim() !== '' && modalNewDye.stockConcentration > 0 && modalNewDye.finalConcentration > 0;
        const selectSt: React.CSSProperties = { padding: '8px', background: '#1a1f2e', border: '1px solid #3a4857', borderRadius: '4px', color: '#fff', fontSize: '12px', minWidth: '80px', cursor: 'pointer' };

        const addDye = () => {
          if (!canAddDye) return;
          const updated = savedPrograms.map(p => p.name === manageProg ? { ...p, dyes: [...p.dyes, modalNewDye] } : p);
          setSavedPrograms(updated);
          localStorage.setItem(SAVED_PROGRAMS_KEY, JSON.stringify(updated));
          setModalNewDye(BLANK_DYE);
        };

        const removeDye = (idx: number) => {
          const updated = savedPrograms.map(p => p.name === manageProg ? { ...p, dyes: p.dyes.filter((_, i) => i !== idx) } : p);
          setSavedPrograms(updated);
          localStorage.setItem(SAVED_PROGRAMS_KEY, JSON.stringify(updated));
        };

        return (
          <div className="modal-overlay" onClick={() => setManageProg(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', maxHeight: '85vh', overflowY: 'auto' }}>
              <h3>Edit Program: {manageProg}</h3>
              <div className="modal-form">

                {/* Current dyes */}
                {prog.dyes.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dyes in this program</p>
                    {prog.dyes.map((dye, idx) => (
                      <div key={idx} style={{
                        display: 'grid', gridTemplateColumns: '1fr 1.3fr 1.3fr auto',
                        gap: '8px', alignItems: 'center', padding: '8px 10px',
                        background: '#252d3d', borderRadius: '4px', fontSize: '12px', border: '1px solid #3a4857',
                      }}>
                        <span style={{ color: '#00d9ff', fontWeight: 600 }}>{dye.dyeName}</span>
                        <span style={{ color: '#aaa' }}><span style={{ color: '#a0aab8' }}>Stock: </span>{dye.stockConcentration} {dye.stockUnit}</span>
                        <span style={{ color: '#aaa' }}><span style={{ color: '#a0aab8' }}>Final: </span>{dye.finalConcentration} {dye.finalUnit}</span>
                        <button type="button" onClick={() => removeDye(idx)}
                          style={{ background: 'none', border: 'none', color: '#ff6b9d', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }} title="Remove">✕</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>No dyes defined yet.</p>
                )}

                {/* Add dye form */}
                <div style={{ background: '#252d3d', padding: '12px', borderRadius: '4px', border: '1px solid #3a4857', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ fontSize: '11px', color: '#a0aab8', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Add Dye</p>
                  <input type="text" placeholder="Dye name (e.g., Hoechst_33342)"
                    value={modalNewDye.dyeName}
                    onChange={e => setModalNewDye({ ...modalNewDye, dyeName: e.target.value })}
                    style={{ padding: '8px 10px', background: '#1a1f2e', border: `1px solid ${modalNewDye.dyeName ? '#00b8ff' : '#3a4857'}`, borderRadius: '4px', color: '#fff', fontSize: '12px' }}
                  />
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <label style={{ fontSize: '11px', color: '#a0aab8', whiteSpace: 'nowrap' }}>Stock:</label>
                    <NumberInput placeholder="conc." value={modalNewDye.stockConcentration || ''}
                      onChange={e => setModalNewDye({ ...modalNewDye, stockConcentration: parseFloat(e.target.value) || 0 })}
                      onFocus={e => e.target.select()}
                      style={{ flex: 1, padding: '8px', background: '#1a1f2e', border: `1px solid ${modalNewDye.stockConcentration > 0 ? '#00b8ff' : '#3a4857'}`, borderRadius: '4px', color: '#fff', fontSize: '12px' }}
                    />
                    <select value={modalNewDye.stockUnit} onChange={e => setModalNewDye({ ...modalNewDye, stockUnit: e.target.value })} style={selectSt}>{UNIT_OPTIONS}</select>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <label style={{ fontSize: '11px', color: '#a0aab8', whiteSpace: 'nowrap' }}>Final:</label>
                    <NumberInput placeholder="conc." value={modalNewDye.finalConcentration || ''}
                      onChange={e => setModalNewDye({ ...modalNewDye, finalConcentration: parseFloat(e.target.value) || 0 })}
                      onFocus={e => e.target.select()}
                      style={{ flex: 1, padding: '8px', background: '#1a1f2e', border: `1px solid ${modalNewDye.finalConcentration > 0 ? '#00b8ff' : '#3a4857'}`, borderRadius: '4px', color: '#fff', fontSize: '12px' }}
                    />
                    <select value={modalNewDye.finalUnit} onChange={e => setModalNewDye({ ...modalNewDye, finalUnit: e.target.value })} style={selectSt}>{UNIT_OPTIONS}</select>
                  </div>
                  <button type="button" onClick={addDye} disabled={!canAddDye}
                    style={{ padding: '8px', background: canAddDye ? '#00d9ff' : '#3a4857', color: canAddDye ? '#0f1419' : '#888', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: canAddDye ? 'pointer' : 'not-allowed', fontSize: '12px' }}>
                    + Add Dye to "{manageProg}"
                  </button>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setManageProg(null)} className="secondary-btn">Cancel</button>
                <button type="button" onClick={() => setManageProg(null)} className="action-btn">Done</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Dye Warning Modal ────────────────────────────────────────────────── */}
      {showDyeWarning && (
        <div className="modal-overlay" onClick={() => setShowDyeWarning(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ color: '#ff6b9d', marginBottom: '12px' }}>Unassigned Wells Detected</h3>
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#3a2a2a', borderLeft: '3px solid #ff6b9d', borderRadius: '4px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                <strong>{unassignedInSel} well{unassignedInSel === 1 ? '' : 's'} {unassignedInSel === 1 ? 'is' : 'are'} not assigned to any group.</strong>
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: '#ccc' }}>
                Dye programs should be assigned to wells within specific groups. Unassigned wells may cause issues during processing.
              </p>
            </div>
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#1a2a2e', borderRadius: '4px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: '#888' }}>Selected wells breakdown:</p>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#ccc' }}>
                <li>Total selected: {selectedWells.size}</li>
                <li>In groups: {selectedWells.size - unassignedInSel}</li>
                <li>Unassigned: {unassignedInSel}</li>
              </ul>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
              <button onClick={() => { setShowDyeWarning(false); clearSelection(); }} className="secondary-btn">Cancel</button>
              <button
                onClick={() => applyDye(dyeProgramInput.trim(), true)}
                style={{ padding: '10px 16px', backgroundColor: '#ff6b9d', color: '#0f1419', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}
              >
                Skip empty, assign to {selectedWells.size - unassignedInSel} grouped well{selectedWells.size - unassignedInSel === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </>
  );
};
