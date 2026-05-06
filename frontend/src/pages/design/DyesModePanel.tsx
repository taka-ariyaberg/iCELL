import { generateDyeColor } from '../../components/plate/PlateVisualization';
import { DyeProgramDef } from './types';

interface DyesModePanelProps {
  selectedWellCount: number;
  isLoading: boolean;
  unassignedCount: number;

  savedPrograms: DyeProgramDef[];
  savedProgramNames: string[];
  /** Per-well program assignments — used to count wells per program in the cards. */
  dyePrograms: Record<string, string>;

  dyeProgramInput: string;
  setDyeProgramInput: (next: string) => void;
  showProgramDropdown: boolean;
  setShowProgramDropdown: React.Dispatch<React.SetStateAction<boolean>>;

  onOpenDyeModal: () => void;
  /** Direct apply (skips the unassigned-wells warning) — used by the
   *  saved-program card click. */
  onApplyDye: (programName: string) => void;
  /** Apply via the warning gate — used by the Apply button and Enter key
   *  when the typed name matches an existing program. */
  onSetDye: () => void;
  onManageProgram: (name: string) => void;
  onDeleteProgram: (name: string) => void;
}

/** Dyes-mode side panel: assign-dye action, custom combobox over the
 *  saved program names with floating dropdown, defined-programs list
 *  with edit/delete, and the unassigned-wells summary.
 */
export const DyesModePanel = ({
  selectedWellCount,
  isLoading,
  unassignedCount,
  savedPrograms,
  savedProgramNames,
  dyePrograms,
  dyeProgramInput,
  setDyeProgramInput,
  showProgramDropdown,
  setShowProgramDropdown,
  onOpenDyeModal,
  onApplyDye,
  onSetDye,
  onManageProgram,
  onDeleteProgram,
}: DyesModePanelProps) => {
  const trySubmit = () => {
    const prog = dyeProgramInput.trim();
    if (!prog || selectedWellCount === 0) return;
    setShowProgramDropdown(false);
    if (!savedProgramNames.includes(prog)) onOpenDyeModal();
    else onSetDye();
  };

  return (
    <>
      {selectedWellCount > 0 && (
        <div className="control-group">
          <button
            onClick={onOpenDyeModal}
            disabled={isLoading}
            className="action-btn large"
          >
            Assign Dye Program (⌘/Ctrl+P)
          </button>
        </div>
      )}
      {selectedWellCount > 0 && (
        <div className="control-group">
          <label htmlFor="dye-program-input">Dye Program</label>
          {/* Custom combobox: plain input + embedded chevron + floating dropdown */}
          <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                id="dye-program-input"
                type="text"
                value={dyeProgramInput}
                onChange={(e) => { setDyeProgramInput(e.target.value.toUpperCase()); setShowProgramDropdown(false); }}
                onFocus={(e) => e.target.select()}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (!dyeProgramInput.trim()) return;
                    trySubmit();
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
                  onMouseDown={(e) => { e.preventDefault(); setShowProgramDropdown((v) => !v); }}
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
                  {savedProgramNames.map((name) => {
                    const c = generateDyeColor(name);
                    const isActive = dyeProgramInput === name;
                    return (
                      <div
                        key={name}
                        onMouseDown={(e) => { e.preventDefault(); setDyeProgramInput(name); setShowProgramDropdown(false); }}
                        style={{
                          padding: '8px 12px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '8px',
                          borderLeft: `3px solid ${isActive ? c : 'transparent'}`,
                          background: isActive ? `${c}18` : 'transparent',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = isActive ? `${c}18` : 'rgba(255,255,255,0.04)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? `${c}18` : 'transparent'; }}
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
              onClick={trySubmit}
              disabled={!dyeProgramInput.trim() || selectedWellCount === 0 || isLoading}
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
            {savedPrograms.map((prog) => {
              const color = generateDyeColor(prog.name);
              const wellCount = Object.values(dyePrograms).filter((p) => p === prog.name).length;
              const isSelected = dyeProgramInput === prog.name;
              const canAssign = selectedWellCount > 0 && !isLoading;
              return (
                <div
                  key={prog.name}
                  className="group-item dye-program-card"
                  onClick={() => {
                    setDyeProgramInput(prog.name);
                    if (canAssign) {
                      // apply directly — known program
                      onApplyDye(prog.name);
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
                    {wellCount > 0 && <> · <span style={{ color, fontWeight: 600 }}>{wellCount}w</span></>}
                  </span>
                  <button
                    className="dye-edit-btn"
                    onClick={(e) => { e.stopPropagation(); onManageProgram(prog.name); }}
                    style={{ background: 'rgba(0,184,255,0.12)', border: '1px solid rgba(0,184,255,0.35)', borderRadius: '3px', cursor: 'pointer', fontSize: '12px', padding: '2px 6px', lineHeight: 1, color: '#00b8ff', fontWeight: 600 }}
                    title="Edit program"
                  >Edit</button>
                  <button
                    className="dye-delete-btn"
                    onClick={(e) => { e.stopPropagation(); onDeleteProgram(prog.name); }}
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
  );
};