import React, { useState, useMemo, useEffect } from 'react';
import { PlateVisualization, generateDistinctColors } from '../../components/plate/PlateVisualization';
import { usePlateStore } from '../../store/plateStore';
import { ConfigInput, DyeProgramInput } from '../../services/apiClient';
import {
  BLANK_DYE,
  DEFAULT_DYE_PROGRAMS,
  DesignOutput,
  DyeDefinition,
  DyeProgramDef,
  SAVED_PROGRAMS_KEY,
  getTodayDateInputValue,
  parseInitialPlateType,
} from './types';
import { CellsModePanel } from './CellsModePanel';
import { CellForm, EMPTY_CELL_FORM, isCellFormComplete, cellFormFromGroup, toCellMeta } from './cellMeta';
import { ConfigBar } from './ConfigBar';
import { ConfirmProcessModal } from './ConfirmProcessModal';
import { DownloadActions } from './DownloadActions';
import { DyesModePanel } from './DyesModePanel';
import { DyeAssignmentModal } from './DyeAssignmentModal';
import { DyeWarningModal } from './DyeWarningModal';
import { EditGroupModal } from './EditGroupModal';
import { GroupModal } from './GroupModal';
import { ManageDyeProgramModal } from './ManageDyeProgramModal';
import { ParametersPanel } from './ParametersPanel';
import { useDesignKeyboard } from './useDesignKeyboard';
import { useDownloadHandlers } from './useDownloadHandlers';
import '../../styles/DesignerPage.css';

// Re-export the shared types so existing imports of
// `DesignOutput` / `DyeProgramDef` etc. via DesignPage.tsx keep working.
export type { DesignOutput, DyeDefinition, DyeProgramDef };
export { SAVED_PROGRAMS_KEY };

interface DesignPageProps {
  onProcess: (config: ConfigInput, metaDyePrograms?: DyeProgramInput[]) => void;
  onViewResults?: () => void;
  /** Pre-populate form fields when navigating back */
  initialDesign?: DesignOutput | null;
  isLoading?: boolean;
  /** When false (e.g. results page is active), disable keyboard shortcuts */
  isActive?: boolean;
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
  const [cellForm, setCellForm] = useState<CellForm>(EMPTY_CELL_FORM);
  const [editCellForm, setEditCellForm] = useState<CellForm>(EMPTY_CELL_FORM);
  const [designMode, setDesignMode] = useState<'cells' | 'dyes'>('cells');
  const [dyeProgramInput, setDyeProgramInput] = useState('');
  const [showProgramDropdown, setShowProgramDropdown] = useState(false);
  const [showDyeWarning, setShowDyeWarning] = useState(false);
  const [showDyeModal, setShowDyeModal] = useState(false);
  const [unassignedInSel, setUnassignedInSel] = useState(0);
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
    renameGroup, updateGroupDensity, updateGroupMeta,
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
      setSavedProgramNames(programs.map(p => p.name).filter(Boolean));
    } catch { /* ignore */ }
  }, []);

  // Keep effective plate type in sync
  const effectivePlateType = customPlate ? `${customRows},${customCols}` : plateType;
  const normalizedPlateType = effectivePlateType.replace('_well', '');

  useEffect(() => {
    storeSetPlateType(normalizedPlateType);
  }, [normalizedPlateType]);

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

  // Keyboard shortcuts — see useDesignKeyboard.ts for the binding table.
  useDesignKeyboard({
    isActive,
    selectedWells,
    groups,
    designMode,
    mode,
    clearSelection,
    selectAll,
    setDesignMode,
    openGroupModal: () => openAssignModal(),
    openDyeModal: () => setShowDyeModal(true),
  });

  // ── handlers ────────────────────────────────────────────────────────────────
  const openAssignModal = () => {
    setShowGroupModal(true);
    setGroupNameInput(`Group ${Object.keys(groups).length + 1}`);
    const names = Object.keys(groups);
    setCellForm(names.length ? cellFormFromGroup(groups[names[names.length - 1]]) : EMPTY_CELL_FORM);
  };

  const closeGroupModal = () => {
    setShowGroupModal(false);
    setGroupNameInput('');
    setDensityInput(500);
    setSelectedExistingGroup(null);
    setCellForm(EMPTY_CELL_FORM);
  };

  const handleAssignGroup = () => {
    if (!selectedWells.size || !groupNameInput.trim() || !isCellFormComplete(cellForm)) return;
    const update: Record<string, string> = {};
    selectedWells.forEach(w => { update[w] = groupNameInput.trim(); });
    assignWellsToGroup(groupNameInput.trim(), densityInput, update, toCellMeta(cellForm));
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

  // ── download helpers — see useDownloadHandlers.ts ───────────────────────────
  const {
    downloadingPNG,
    handleDownloadLayoutCSV,
    handleDownloadLayoutSVG,
    handleDownloadLayoutPNG,
    handleDownloadDyeCSV,
    handleDownloadDyeSVG,
    handleDownloadDyePNG,
  } = useDownloadHandlers({
    effectivePlateType,
    projectName,
    plateId,
    wells,
    groups,
    dyePrograms,
  });

  // ── inline style tokens (only ones still used by the controls section) ──
  const dmBtn = (dm: 'cells' | 'dyes') => ({
    padding: '6px 12px',
    background: designMode === dm ? '#00b8ff' : '#2a3f4f',
    color: designMode === dm ? '#0f1419' : '#fff',
    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: designMode === dm ? 600 : 400,
  } as React.CSSProperties);

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <h2 className="page-title">Plate Designer</h2>
      <div className="designer-page">

      {/* ── Compact config bar ───────────────────────────────────────────────── */}
      <ConfigBar
        projectName={projectName} setProjectName={setProjectName}
        plateId={plateId} setPlateId={setPlateId}
        seedingDate={seedingDate} setSeedingDate={setSeedingDate} setSeedingDateTouched={setSeedingDateTouched}
        plateType={plateType} setPlateTypeState={setPlateTypeState}
        customPlate={customPlate} setCustomPlate={setCustomPlate}
        customRows={customRows} setCustomRows={setCustomRows}
        customCols={customCols} setCustomCols={setCustomCols}
        numPlates={numPlates} setNumPlates={setNumPlates}
        mode={mode} setMode={setMode} setDesignMode={setDesignMode}
        isLoading={isLoading}
        onViewResults={onViewResults}
      />

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

          {/* ── Mode-specific panels ────────────────────────────────────────── */}
          {designMode === 'cells' ? (
            <CellsModePanel
              selectedWellCount={selectedWells.size}
              groups={groups}
              groupCounts={groupCounts}
              groupColors={groupColors}
              unassignedCount={unassignedCount}
              isLoading={isLoading}
              onAssignToGroup={() => openAssignModal()}
              onEditGroup={(name, density) => {
                setEditingGroup(name);
                setEditGroupName(name);
                setEditGroupDensity(density);
                setEditCellForm(cellFormFromGroup(groups[name]));
              }}
            />
          ) : (
            <DyesModePanel
              selectedWellCount={selectedWells.size}
              isLoading={isLoading}
              unassignedCount={unassignedCount}
              savedPrograms={savedPrograms}
              savedProgramNames={savedProgramNames}
              dyePrograms={dyePrograms}
              dyeProgramInput={dyeProgramInput}
              setDyeProgramInput={setDyeProgramInput}
              showProgramDropdown={showProgramDropdown}
              setShowProgramDropdown={setShowProgramDropdown}
              onOpenDyeModal={() => setShowDyeModal(true)}
              onApplyDye={(programName) => applyDye(programName)}
              onSetDye={handleSetDye}
              onManageProgram={(name) => { setManageProg(name); setModalNewDye(BLANK_DYE); }}
              onDeleteProgram={(name) => {
                const updated = savedPrograms.filter((p) => p.name !== name);
                setSavedPrograms(updated);
                setSavedProgramNames(updated.map((p) => p.name));
                localStorage.setItem(SAVED_PROGRAMS_KEY, JSON.stringify(updated));
                if (dyeProgramInput === name) setDyeProgramInput('');
              }}
            />
          )}

          {/* Clear */}
          <div className="control-group">
            <button onClick={clearWells} disabled={isLoading || !hasWells} className="secondary-btn">
              Clear All
            </button>
          </div>

          {/* Downloads */}
          <DownloadActions
            mode={mode}
            hasWells={hasWells}
            hasAnyDyeAssignment={Object.values(dyePrograms).some((d) => d)}
            isLoading={isLoading}
            downloadingPNG={downloadingPNG}
            onDownloadLayoutCSV={handleDownloadLayoutCSV}
            onDownloadLayoutSVG={handleDownloadLayoutSVG}
            onDownloadLayoutPNG={handleDownloadLayoutPNG}
            onDownloadDyeCSV={handleDownloadDyeCSV}
            onDownloadDyeSVG={handleDownloadDyeSVG}
            onDownloadDyePNG={handleDownloadDyePNG}
          />
        </div>
      </div>

      {/* ── Parameters Panel ─────────────────────────────────────────────────── */}
      <ParametersPanel
        mode={mode}
        stockCellConc={stockCellConc}
        setStockCellConc={setStockCellConc}
        overagePct={overagePct}
        setOveragePct={setOveragePct}
        finalWellVolume={finalWellVolume}
        setFinalWellVolume={setFinalWellVolume}
        deadVolumeCells={deadVolumeCells}
        setDeadVolumeCells={setDeadVolumeCells}
        deadVolumeDye={deadVolumeDye}
        setDeadVolumeDye={setDeadVolumeDye}
        isLoading={isLoading}
        hasWells={hasWells}
        onProcess={() => setShowConfirmProcess(true)}
      />

      {/* ── Group Assignment Modal ────────────────────────────────────────────── */}
      {showGroupModal && selectedWells.size > 0 && (
        <GroupModal
          selectedWellCount={selectedWells.size}
          groupNameInput={groupNameInput}
          setGroupNameInput={setGroupNameInput}
          densityInput={densityInput}
          setDensityInput={setDensityInput}
          groups={groups}
          groupCounts={groupCounts}
          selectedExistingGroup={selectedExistingGroup}
          setSelectedExistingGroup={setSelectedExistingGroup}
          cellForm={cellForm}
          setCellForm={setCellForm}
          canAssign={selectedWells.size > 0 && groupNameInput.trim().length > 0 && densityInput > 0 && isCellFormComplete(cellForm)}
          onClose={closeGroupModal}
          onAssign={handleAssignGroup}
        />
      )}

      {/* ── Edit Group Modal ─────────────────────────────────────────────────── */}
      {editingGroup !== null && (
        <EditGroupModal
          oldName={editingGroup}
          groups={groups}
          name={editGroupName}
          setName={setEditGroupName}
          density={editGroupDensity}
          setDensity={setEditGroupDensity}
          renameGroup={renameGroup}
          updateGroupDensity={updateGroupDensity}
          cellForm={editCellForm}
          setCellForm={setEditCellForm}
          updateGroupMeta={updateGroupMeta}
          onClose={() => setEditingGroup(null)}
        />
      )}

      {/* ── Confirm Process Modal ────────────────────────────────────────────── */}
      {showConfirmProcess && (
        <ConfirmProcessModal
          projectName={projectName}
          plateId={plateId}
          plateType={plateType}
          mode={mode}
          groups={groups}
          groupCounts={groupCounts}
          savedPrograms={savedPrograms}
          dyePrograms={dyePrograms}
          onCancel={() => setShowConfirmProcess(false)}
          onConfirm={() => {
            setShowConfirmProcess(false);
            handleProcess();
          }}
        />
      )}

      {/* ── Dye Assignment Modal ─────────────────────────────────────────────── */}
      {showDyeModal && selectedWells.size > 0 && (
        <DyeAssignmentModal
          selectedWellCount={selectedWells.size}
          dyeProgramInput={dyeProgramInput}
          setDyeProgramInput={setDyeProgramInput}
          savedPrograms={savedPrograms}
          setSavedPrograms={setSavedPrograms}
          savedProgramNames={savedProgramNames}
          setSavedProgramNames={setSavedProgramNames}
          draft={modalNewDye}
          setDraft={setModalNewDye}
          onAssign={() => { setShowDyeModal(false); handleSetDye(); }}
          onClose={() => setShowDyeModal(false)}
        />
      )}

      {/* ── Manage Dye Program Modal ─────────────────────────────────────────── */}
      {manageProg !== null && (
        <ManageDyeProgramModal
          programName={manageProg}
          savedPrograms={savedPrograms}
          setSavedPrograms={setSavedPrograms}
          draft={modalNewDye}
          setDraft={setModalNewDye}
          onClose={() => setManageProg(null)}
        />
      )}

      {/* ── Dye Warning Modal ────────────────────────────────────────────────── */}
      {showDyeWarning && (
        <DyeWarningModal
          unassignedCount={unassignedInSel}
          totalSelectedCount={selectedWells.size}
          onCancel={() => { setShowDyeWarning(false); clearSelection(); }}
          onSkipEmpty={() => applyDye(dyeProgramInput.trim(), true)}
        />
      )}

    </div>
    </>
  );
};
