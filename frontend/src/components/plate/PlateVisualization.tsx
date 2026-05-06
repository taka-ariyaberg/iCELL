import React, { useState, useRef } from 'react';
import { usePlateStore } from '../../store/plateStore';
import { PlateLegend } from './PlateLegend';
import '../../styles/PlateVisualization.css';

interface PlateVisualizationProps {
  plateType: string;
  wells: Record<string, string>;
  selectedWells: Set<string>;
  wellValueLabels?: Record<string, string>;
  wellHoverDetails?: Record<string, string[]>;
  showWellValueLabels?: boolean;
  showNativeTooltip?: boolean;
  groups?: Record<string, any>;
  dyePrograms?: Record<string, string>; // well -> dye program mapping
  designMode?: 'cells' | 'dyes';
  readOnly?: boolean; // Disable all interactions
  hideLegend?: boolean;
  onGroupSelect?: (well: string, isShiftClick: boolean) => void; // Callback for well selection in read-only viewer mode
  // Viewer mode callbacks (full interaction but state managed externally, not in store)
  onExternalToggle?: (well: string) => void;
  onExternalRangeSelect?: (start: string, end: string) => void;
  onExternalRangeDeselect?: (start: string, end: string) => void;
}

import { GROUP_COLOR_PALETTE } from '../../styles/tokens';

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Assign unique colors within the currently visible group set where possible.
export function generateDistinctColors(names: string[]): Record<string, string> {
  const uniqueNames = Array.from(new Set(names.filter(Boolean))).sort((left, right) => left.localeCompare(right));
  const usedIndices = new Set<number>();
  const colorMap: Record<string, string> = {};

  uniqueNames.forEach((name, orderIndex) => {
    const preferredIndex = hashName(name) % GROUP_COLOR_PALETTE.length;
    let colorIndex = preferredIndex;

    for (let offset = 0; offset < GROUP_COLOR_PALETTE.length; offset++) {
      const candidateIndex = (preferredIndex + offset) % GROUP_COLOR_PALETTE.length;
      if (!usedIndices.has(candidateIndex)) {
        colorIndex = candidateIndex;
        break;
      }
    }

    if (usedIndices.has(colorIndex) && usedIndices.size >= GROUP_COLOR_PALETTE.length) {
      colorIndex = orderIndex % GROUP_COLOR_PALETTE.length;
    }

    usedIndices.add(colorIndex);
    colorMap[name] = GROUP_COLOR_PALETTE[colorIndex];
  });

  return colorMap;
}

// Fixed palette of 12 perceptually distinct, vivid dye colors.
// Deliberately avoids blues/cyans which are used by cell groups.
const DYE_PALETTE = [
  '#ff6b35', // vivid orange
  '#f72585', // hot pink
  '#ffbe0b', // amber
  '#ff4d6d', // coral red
  '#c77dff', // lavender purple
  '#80ed99', // mint green
  '#ff9f1c', // warm orange-yellow
  '#e040fb', // magenta
  '#f4a261', // peach
  '#ff595e', // tomato
  '#b5e48c', // light lime
  '#ff70a6', // bubblegum pink
];

export function generateDyeColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash = hash & hash;
  }
  return DYE_PALETTE[Math.abs(hash) % DYE_PALETTE.length];
}

export const PlateVisualization: React.FC<PlateVisualizationProps> = ({
  plateType,
  wells,
  selectedWells,
  wellValueLabels = {},
  wellHoverDetails = {},
  showWellValueLabels = true,
  showNativeTooltip = true,
  groups = {},
  dyePrograms = {},
  designMode = 'cells',
  readOnly = false,
  hideLegend = false,
  onGroupSelect,
  onExternalToggle,
  onExternalRangeSelect,
  onExternalRangeDeselect,
}) => {
  const [zoom, setZoom] = useState(1);
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [dragMode, setDragMode] = useState<'select' | 'deselect' | null>(null);
  const [hoveredWell, setHoveredWell] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const { toggleWell, selectWell, deselectWell, selectWellRangeNoHistory, deselectWellRangeNoHistory, deselectRangeSelectionOnlyNoHistory, clearDyeProgram, clearDyeProgramRangeNoHistory, captureSnapshot } = usePlateStore();

  // Viewer mode: full interactions routed through external callbacks, not store
  const isViewerMode = !!(onExternalToggle || onExternalRangeSelect || onExternalRangeDeselect);

  // Parse plate dimensions
  let rows = 8, cols = 12;
  if (plateType === '6') {
    rows = 2; cols = 3;
  } else if (plateType === '12') {
    rows = 3; cols = 4;
  } else if (plateType === '24') {
    rows = 4; cols = 6;
  } else if (plateType === '48') {
    rows = 6; cols = 8;
  } else if (plateType === '384') {
    rows = 16; cols = 24;
  } else if (plateType === '1536') {
    rows = 32; cols = 48;
  } else if (plateType.includes(',')) {
    const [r, c] = plateType.split(',').map(Number);
    rows = r; cols = c;
  }

  const letters = Array.from({ length: rows }, (_, i) =>
    String.fromCharCode(65 + i)
  );

  // Generate colors for all defined groups while avoiding collisions in the current set.
  const definedGroupNames = groups ? Object.keys(groups) : [];
  const groupColors = generateDistinctColors(definedGroupNames);

  // Dye program colours — warm palette, distinct from cool cell-group colours
  const dyeProgramNames = designMode === 'dyes' ? Array.from(new Set(Object.values(dyePrograms))).sort() : [];
  const dyeProgramColors: Record<string, string> = {};
  dyeProgramNames.forEach((program) => {
    dyeProgramColors[program] = generateDyeColor(program);
  });

  const getWellColor = (group?: string | null, dye?: string | null): string => {
    if (designMode === 'dyes') {
      // Assigned: always fill with dye color (selected = brighter via glow on top)
      if (dye) return dyeProgramColors[dye] || '#00b8ff';
      // No dye: dim the group color so the plate reads as "dye mode"
      if (group) return `${groupColors[group] || '#3a6080'}44`;
      return 'rgba(255, 255, 255, 0.05)';
    }
    if (group) return groupColors[group] || '#00b8ff';
    return 'rgba(255, 255, 255, 0.05)';
  };

  const handleWellClick = (well: string, event: React.MouseEvent) => {
    // Legacy read-only viewer with onGroupSelect callback
    if (readOnly && onGroupSelect) {
      const isShiftClick = event.shiftKey;
      onGroupSelect(well, isShiftClick);
      return;
    }
    if (readOnly) return;

    // New viewer mode: route to external callbacks
    if (isViewerMode) {
      // Shift/Alt handled by mouseDown+mouseEnter drag; plain click = toggle
      if (!event.shiftKey && !event.altKey) {
        onExternalToggle?.(well);
      }
      return;
    }

    // Prevent interaction if currently dragging
    if (dragStart) return;

    const isShift = event.shiftKey;
    const isAlt = event.altKey;

    if (isShift) {
      setDragStart(well);
      setDragMode('select');
    } else if (isAlt) {
      if (designMode === 'dyes') {
        // In dyes mode: alt+click clears dye assignment AND deselects that well
        clearDyeProgram(well);
        deselectWell(well);
      } else {
        setDragStart(well);
        setDragMode('deselect');
      }
    } else if (designMode === 'dyes') {
      if (selectedWells.has(well)) {
        // Already selected → remove from selection
        deselectWell(well);
      } else if (dyePrograms[well]) {
        // Has a dye → only clear it, do NOT select the well
        clearDyeProgram(well);
      } else {
        // No dye → add to selection for assignment
        selectWell(well);
      }
    } else {
      toggleWell(well);
    }
  };

  const handleWellMouseDown = (well: string, event: React.MouseEvent) => {
    if (readOnly && !isViewerMode) return;

    const isShift = event.shiftKey;
    const isAlt = event.altKey;

    if (isShift) {
      captureSnapshot();
      setDragStart(well);
      setDragMode('select');
      event.preventDefault();
    } else if (isAlt) {
      captureSnapshot();
      setDragStart(well);
      setDragMode('deselect');
      event.preventDefault();
    }
  };

  const handleWellMouseEnter = (well: string) => {
    setHoveredWell(well);
    if (readOnly && !isViewerMode) return;
    if (!dragStart || !dragMode) return;

    if (dragMode === 'select') {
      if (isViewerMode) {
        onExternalRangeSelect?.(dragStart, well);
      } else {
        selectWellRangeNoHistory(dragStart, well);
      }
    } else if (dragMode === 'deselect') {
      if (isViewerMode) {
        onExternalRangeDeselect?.(dragStart, well);
      } else if (designMode === 'dyes') {
        // In dyes mode: alt+drag clears dye assignment only — never touches cell groups
        clearDyeProgramRangeNoHistory(dragStart, well);
        deselectRangeSelectionOnlyNoHistory(dragStart, well);
      } else {
        deselectWellRangeNoHistory(dragStart, well);
      }
    }
  };

  const handleWellMouseMove = (event: React.MouseEvent) => {
    setTooltipPosition({ x: event.clientX + 16, y: event.clientY + 16 });
  };

  const handleWellMouseLeave = () => {
    setHoveredWell(null);
  };

  const handleMouseUp = () => {
    setDragStart(null);
    setDragMode(null);
  };

  const getTooltipLines = (well: string, group?: string, dye?: string, wellValueText?: string) => {
    const customLines = wellHoverDetails[well];
    if (customLines && customLines.length > 0) {
      return customLines;
    }

    const lines = [well];
    if (group) {
      lines.push(group);
    }
    if (dye && designMode === 'dyes') {
      lines.push(dye);
    }
    if (wellValueText) {
      lines.push(`Dispense: ${wellValueText} µL`);
    }
    if (!group && !dye) {
      lines.push('Unassigned');
    }
    return lines;
  };

  const wellSize = 28 * zoom;
  const headerSize = 24 * zoom;

  return (
    <div className="plate-container" ref={containerRef} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div className="plate-controls">
        <div className="zoom-controls">
          <button 
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            className="zoom-btn"
          >
            −
          </button>
          <span className="zoom-level">{Math.round(zoom * 100)}%</span>
          <button 
            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
            className="zoom-btn"
          >
            +
          </button>
        </div>
        <div className="plate-info">
          Plate: {rows}×{cols} • {Object.keys(wells).length} assigned • {selectedWells.size} selected
        </div>
      </div>

      <div className="plate-grid-wrapper">
        <div 
          className="plate-grid"
          style={{
            gridTemplateColumns: `${headerSize}px repeat(${cols}, ${wellSize}px)`,
          }}
        >
          {/* Corner */}
          <div className="grid-header corner-cell"></div>

          {/* Column headers */}
          {Array.from({ length: cols }, (_, i) => (
            <div key={`col-${i + 1}`} className="grid-header col-header">
              {i + 1}
            </div>
          ))}

          {/* Rows */}
          {letters.map((letter) => (
            <React.Fragment key={`row-${letter}`}>
              {/* Row label */}
              <div className="grid-header row-header">{letter}</div>

              {/* Wells */}
              {Array.from({ length: cols }, (_, c) => {
                const well = `${letter}${c + 1}`;
                const group = wells[well];
                const dye = dyePrograms[well];
                const isSelected = selectedWells.has(well);
                const wellValueText = wellValueLabels[well];
                
                // Compute glow box-shadow
                const hasGroup = !!group;
                const hasDye = !!dye;
                const assignmentClass = hasGroup ? 'assigned' : (hasDye && designMode === 'dyes' ? 'assigned' : 'empty');
                const dyeClass = hasDye && designMode === 'dyes' ? 'dye-program' : '';

                let wellBoxShadow: string;
                let wellBorder: string | undefined;
                if (designMode === 'dyes') {
                  const dyeColor = dye ? (dyeProgramColors[dye] || '#00b8ff') : null;
                  const glowColor = dyeColor || 'rgba(0,184,255,0.8)';
                  if (isSelected) {
                    wellBoxShadow = `inset 0 0 8px ${glowColor}, 0 0 12px ${glowColor}`;
                    wellBorder = dyeColor ? `1px solid ${dyeColor}88` : undefined;
                  } else if (dyeColor) {
                    wellBoxShadow = 'none';
                    wellBorder = `1px solid ${dyeColor}88`;
                  } else {
                    wellBoxShadow = 'none';
                    wellBorder = undefined;
                  }
                } else {
                  const glowColor = group ? groupColors[group] : 'rgba(0,184,255,0.8)';
                  wellBoxShadow = isSelected
                    ? `inset 0 0 8px ${glowColor}, 0 0 12px ${glowColor}`
                    : 'inset 0 0 0 1px rgba(0, 0, 0, 0.3)';
                }

                return (
                  <div
                    key={well}
                    className={`well ${isSelected ? 'selected' : ''} ${assignmentClass} ${dyeClass}`}
                    style={{
                      backgroundColor: getWellColor(group, dye),
                      width: `${wellSize}px`,
                      height: `${wellSize}px`,
                      minWidth: `${wellSize}px`,
                      minHeight: `${wellSize}px`,
                      boxShadow: wellBoxShadow,
                      border: wellBorder,
                      transition: 'box-shadow 0.15s ease-out, border-color 0.15s ease-out',
                      position: 'relative'
                    }}
                    onClick={(e) => handleWellClick(well, e)}
                    onMouseDown={(e) => handleWellMouseDown(well, e)}
                    onMouseEnter={() => handleWellMouseEnter(well)}
                    onMouseMove={handleWellMouseMove}
                    onMouseLeave={handleWellMouseLeave}
                    title={showNativeTooltip ? getTooltipLines(well, group, dye, wellValueText).join(' • ') : undefined}
                  >
                    {zoom > 1.2 && group && (
                      <span className="well-label" style={{color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.5)', fontSize: '10px'}}>{group.replace('Group ', '')}</span>
                    )}
                    {zoom > 1.2 && designMode === 'dyes' && dye && (
                      <span className="well-dye-badge" style={{
                        backgroundColor: dyeProgramColors[dye],
                        color: '#0f1419',
                        fontSize: '7px',
                        fontWeight: 600,
                        padding: '1px 2px',
                      }}>{dye}</span>
                    )}
                    {showWellValueLabels && wellValueText && (
                      <span style={{
                        position: 'absolute',
                        left: '50%',
                        bottom: '2px',
                        transform: 'translateX(-50%)',
                        color: '#f5fbff',
                        background: 'rgba(15, 20, 25, 0.55)',
                        borderRadius: '3px',
                        padding: '1px 3px',
                        fontSize: `${Math.max(7, Math.min(10, 8 * zoom))}px`,
                        fontWeight: 700,
                        lineHeight: 1,
                        textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                      }}>{wellValueText}</span>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {hoveredWell && (
        <div
          className="well-hover-tooltip"
          style={{ left: `${tooltipPosition.x}px`, top: `${tooltipPosition.y}px` }}
        >
          {getTooltipLines(
            hoveredWell,
            wells[hoveredWell],
            dyePrograms[hoveredWell],
            wellValueLabels[hoveredWell]
          ).map((line, index) => (
            <div
              key={`${hoveredWell}-${index}`}
              className={index === 0 ? 'well-hover-tooltip-title' : 'well-hover-tooltip-line'}
            >
              {line}
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      {!hideLegend && (
        <PlateLegend
          rows={rows}
          cols={cols}
          wells={wells}
          dyePrograms={dyePrograms}
          groups={groups}
          groupColors={groupColors}
          dyeProgramColors={dyeProgramColors}
          designMode={designMode}
          isViewerMode={isViewerMode}
          readOnly={readOnly}
          onGroupSelect={onGroupSelect}
        />
      )}
    </div>
  );
};
