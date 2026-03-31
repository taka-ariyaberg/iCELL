/**
 * Utility functions for exporting plate layouts and dye assignments
 */

export interface PlateExportData {
  plateType: string;
  wells: Record<string, string>;
  groups?: Record<string, { density: number }>;
  dyePrograms?: Record<string, string>;
}

/**
 * Parse plate dimensions from plate type string
 */
function getPlateDimensions(plateType: string): { rows: number; cols: number } {
  const plateSizeMap: Record<string, { rows: number; cols: number }> = {
    '6': { rows: 2, cols: 3 },
    '12': { rows: 3, cols: 4 },
    '24': { rows: 4, cols: 6 },
    '48': { rows: 6, cols: 8 },
    '96': { rows: 8, cols: 12 },
    '384': { rows: 16, cols: 24 },
    '1536': { rows: 32, cols: 48 },
  };

  if (plateSizeMap[plateType]) {
    return plateSizeMap[plateType];
  }

  if (plateType.includes(',')) {
    const [r, c] = plateType.split(',').map(Number);
    return { rows: r, cols: c };
  }

  return { rows: 8, cols: 12 }; // default to 96-well
}

/**
 * Generate SVG visualization of plate layout with enhanced styling
 */
// DYE_PALETTE — must stay in sync with the same array in PlateVisualization.tsx
const DYE_PALETTE = [
  '#ff6b35', '#f72585', '#ffbe0b', '#ff4d6d',
  '#c77dff', '#80ed99', '#ff9f1c', '#e040fb',
  '#f4a261', '#ff595e', '#b5e48c', '#ff70a6',
];

function generateDyeColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) { h = ((h << 5) - h) + name.charCodeAt(i); h |= 0; }
  return DYE_PALETTE[Math.abs(h) % DYE_PALETTE.length];
}

/**
 * Generate color mapping for use in SVG.
 * Uses the same collision-avoidance strategy as the UI for active groups.
 */
function generateColors(items: string[]): Record<string, string> {
  const colors = [
    '#00d9ff', '#ff6b9d', '#ffd700',
    '#00ff88', '#ff8c42', '#00b8ff',
    '#ff66cc', '#66ff66', '#ffaa33',
    '#33aaff', '#ff3366', '#aaff33'
  ];

  const usedIndices = new Set<number>();
  const colorMap: Record<string, string> = {};
  Array.from(new Set(items.filter(Boolean))).sort((left, right) => left.localeCompare(right)).forEach((item, orderIndex) => {
    let hash = 0;
    for (let i = 0; i < item.length; i++) { hash = ((hash << 5) - hash) + item.charCodeAt(i); hash |= 0; }

    const preferredIndex = Math.abs(hash) % colors.length;
    let colorIndex = preferredIndex;

    for (let offset = 0; offset < colors.length; offset++) {
      const candidateIndex = (preferredIndex + offset) % colors.length;
      if (!usedIndices.has(candidateIndex)) {
        colorIndex = candidateIndex;
        break;
      }
    }

    if (usedIndices.has(colorIndex) && usedIndices.size >= colors.length) {
      colorIndex = orderIndex % colors.length;
    }

    usedIndices.add(colorIndex);
    colorMap[item] = colors[colorIndex];
  });

  return colorMap;
}

// ── Shared SVG building blocks ────────────────────────────────────────────────

function svgDefs(extraDefs = ''): string {
  return `  <defs>
    <radialGradient id="gloss" cx="35%" cy="30%" r="60%">
      <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.52"/>
      <stop offset="48%"  stop-color="#ffffff" stop-opacity="0.10"/>
      <stop offset="68%"  stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="glossShadow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="42%"  stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.50"/>
    </linearGradient>
    <filter id="pip-glow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur"/>
    </filter>
${extraDefs}  </defs>\n`;
}

function svgDarkBackground(w: number, h: number): string {
  return `  <!-- Background -->\n  <rect width="${w}" height="${h}" fill="#111827" rx="10"/>\n  <rect x="1" y="1" width="${w - 2}" height="${h - 2}" fill="none" stroke="#1e2a3a" stroke-width="1.5" rx="9"/>\n`;
}

function svgHeaderText(x: number, y: number, label: string | number): string {
  return `  <text x="${x}" y="${y}" font-size="10" fill="#00b8ff" text-anchor="middle" dominant-baseline="middle" font-weight="700" font-family="ui-monospace,monospace">${label}</text>\n`;
}

function svgWell(x: number, y: number, w: number, h: number, color: string, rx: number, hasDye: boolean, pip: boolean): string {
  let out = '';
  // Drop shadow
  out += `  <rect x="${x + 1}" y="${y + 1.5}" width="${w}" height="${h}" fill="#00000040" rx="${rx}"/>\n`;
  // Well body
  out += `  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" rx="${rx}"/>\n`;
  if (hasDye) {
    // Gloss sphere overlay
    out += `  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#gloss)" rx="${rx}"/>\n`;
    out += `  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#glossShadow)" rx="${rx}"/>\n`;
    if (pip) {
      // Indicator dot — top-right corner
      const px = x + w - 4;
      const py = y + 4;
      out += `  <circle cx="${px}" cy="${py}" r="1.8" fill="#ffffff" opacity="0.45" filter="url(#pip-glow)"/>\n`;
      out += `  <circle cx="${px}" cy="${py}" r="1.8" fill="#ffffff" opacity="0.92"/>\n`;
    }
  }
  return out;
}

function svgEmptyWell(x: number, y: number, w: number, h: number, rx: number): string {
  return `  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="rgba(255,255,255,0.05)" stroke="#3a4857" stroke-width="0.8" rx="${rx}"/>\n`;
}

function svgLegendSwatch(x: number, y: number, color: string, hasDye: boolean, rx = 4): string {
  let out = `  <rect x="${x}" y="${y}" width="16" height="16" fill="${color}" rx="${rx}"/>\n`;
  if (hasDye) {
    out += `  <rect x="${x}" y="${y}" width="16" height="16" fill="url(#gloss)" rx="${rx}"/>\n`;
    out += `  <rect x="${x}" y="${y}" width="16" height="16" fill="url(#glossShadow)" rx="${rx}"/>\n`;
    out += `  <circle cx="${x + 13}" cy="${y + 3}" r="1.8" fill="#ffffff" opacity="0.92"/>\n`;
  }
  return out;
}

function svgLegendText(x: number, y: number, label: string, sub = ''): string {
  let out = `  <text x="${x}" y="${y + 8}" font-size="11" fill="#e0e6ee" font-weight="600" font-family="Arial,sans-serif">${label}</text>\n`;
  if (sub) out += `  <text x="${x}" y="${y + 22}" font-size="9.5" fill="#7a8c99" font-family="Arial,sans-serif">${sub}</text>\n`;
  return out;
}

function svgTitle(cx: number, y: number, title: string, subtitle: string): string {
  return `  <text x="${cx}" y="${y}" text-anchor="middle" font-size="16" fill="#e0e6ee" font-weight="700" font-family="Arial,sans-serif">${title}</text>\n` +
         `  <text x="${cx}" y="${y + 18}" text-anchor="middle" font-size="11" fill="#556f78" font-family="Arial,sans-serif">${subtitle}</text>\n`;
}

/**
 * Generate SVG visualization of plate layout with enhanced styling
 */
export function generateLayoutSVG(data: PlateExportData): string {
  const { plateType, wells, groups = {} } = data;
  const { rows, cols } = getPlateDimensions(plateType);

  const wellSize = 24;
  const headerSize = 20;
  const gap = 3;
  const margin = 40;
  const titleH = 50;
  const legendRowH = 32;

  const groupNames = Object.keys(groups).sort();
  const groupColors = generateColors(groupNames);

  const plateW = cols * (wellSize + gap) - gap;
  const plateH = rows * (wellSize + gap) - gap;
  const totalWells = rows * cols;
  const assignedWells = Object.keys(wells).length;
  const unassignedCount = totalWells - assignedWells;
  const legendItemCount = groupNames.length + (unassignedCount > 0 ? 1 : 0);
  const itemsPerRow = Math.max(1, Math.floor((plateW + headerSize) / 220));
  const legendRows = Math.ceil(legendItemCount / itemsPerRow);
  const legendH = legendItemCount > 0 ? legendRows * legendRowH + 36 : 0;

  const svgW = margin * 2 + headerSize + plateW;
  const svgH = margin + titleH + headerSize + plateH + (legendH > 0 ? legendH + 20 : 0) + margin;

  const plateX = margin + headerSize;
  const plateY = margin + titleH + headerSize;
  const letters = Array.from({ length: rows }, (_, i) => String.fromCharCode(65 + i));

  let svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg width="${svgW}" height="${svgH}" xmlns="http://www.w3.org/2000/svg">\n`;
  svg += svgDefs();
  svg += svgDarkBackground(svgW, svgH);
  svg += svgTitle(margin + headerSize + plateW / 2, margin + 16, 'Plate Layout Assignment', `${plateType}-Well Plate`);

  // Column headers
  for (let c = 1; c <= cols; c++) {
    svg += svgHeaderText(plateX + (c - 1) * (wellSize + gap) + wellSize / 2, margin + titleH + headerSize / 2, c);
  }

  // Rows
  for (let r = 0; r < rows; r++) {
    const letter = letters[r];
    const wy = plateY + r * (wellSize + gap);
    svg += svgHeaderText(margin + headerSize / 2, wy + wellSize / 2, letter);

    for (let c = 1; c <= cols; c++) {
      const wx = plateX + (c - 1) * (wellSize + gap);
      const well = `${letter}${c}`;
      const group = wells[well];
      if (group && groupColors[group]) {
        svg += svgWell(wx, wy, wellSize, wellSize, groupColors[group], 3, false, false);
      } else {
        svg += svgEmptyWell(wx, wy, wellSize, wellSize, 3);
      }
    }
  }

  // Legend
  if (groupNames.length > 0) {
    const lx = margin;
    let ly = plateY + plateH + 28;
    svg += `  <text x="${lx}" y="${ly}" font-size="11" fill="#00b8ff" font-weight="700" text-transform="uppercase" letter-spacing="0.5" font-family="Arial,sans-serif">GROUPS</text>\n`;
    ly += 14;

    groupNames.forEach((grp, idx) => {
      const col = idx % itemsPerRow;
      const row = Math.floor(idx / itemsPerRow);
      const sx = lx + col * 220;
      const sy = ly + row * legendRowH;
      svg += svgLegendSwatch(sx, sy, groupColors[grp], false);
      const density = groups[grp]?.density;
      const wellCount = Object.values(wells).filter(g => g === grp).length;
      svg += svgLegendText(sx + 24, sy - 2, grp, `${wellCount} wells${density ? ` · ${density} cells/well` : ''}`);
    });

    // Unassigned wells
    if (unassignedCount > 0) {
      const idx = groupNames.length;
      const col = idx % itemsPerRow;
      const row = Math.floor(idx / itemsPerRow);
      const sx = lx + col * 220;
      const sy = ly + row * legendRowH;
      svg += `  <rect x="${sx}" y="${sy}" width="16" height="16" fill="rgba(255,255,255,0.05)" stroke="#3a4857" stroke-width="0.8" rx="4"/>\n`;
      svg += svgLegendText(sx + 24, sy - 2, 'Unassigned', `${unassignedCount} wells`);
    }
  }

  svg += `</svg>`;
  return svg;
}

/**
 * Generate SVG visualization of dye assignments with enhanced styling
 */
export function generateDyeSVG(data: PlateExportData): string {
  const { plateType, wells, dyePrograms = {}, groups = {} } = data;
  const { rows, cols } = getPlateDimensions(plateType);

  const wellSize = 24;
  const headerSize = 20;
  const gap = 3;
  const margin = 40;
  const titleH = 50;

  const groupNames = Object.keys(groups).sort();
  const dyeNames = Array.from(new Set(Object.values(dyePrograms))).filter(Boolean).sort();
  const dyeColorMap: Record<string, string> = {};
  dyeNames.forEach(d => { dyeColorMap[d] = generateDyeColor(d); });
  const groupColors = generateColors(groupNames);

  const plateW = cols * (wellSize + gap) - gap;
  const plateH = rows * (wellSize + gap) - gap;
  const svgW = margin * 2 + headerSize + plateW;

  // ── Legend layout (matches UI: nested group → dyes) ─────────────────────────
  const PANEL_PAD = 16;
  const LEGEND_HDR_H = 24;  // "GROUPS & DYE PROGRAMS" header height
  const GROUP_ROW_H = 20;   // height of each group header row
  const DYE_PAD_TOP = 4;    // space above dye list inside a group
  const DYE_ROW_H = 14;     // height per dye entry
  const GROUP_GAP = 8;      // vertical gap between group items

  // Per-group data
  const groupData = groupNames.map(group => {
    const wellsInGroup = Object.entries(wells).filter(([, g]) => g === group);
    const dyesForGroup = Array.from(new Set(wellsInGroup.map(([w]) => dyePrograms[w]).filter(Boolean))).sort();
    const noDyeCount = wellsInGroup.filter(([w]) => !dyePrograms[w]).length;
    return { group, count: wellsInGroup.length, dyes: dyesForGroup, noDyeCount, wellsInGroup };
  });

  const gItemH = (g: { dyes: string[]; noDyeCount: number }) => {
    const subRows = g.dyes.length + (g.noDyeCount > 0 ? 1 : 0);
    return GROUP_ROW_H + (subRows > 0 ? DYE_PAD_TOP + subRows * DYE_ROW_H : 0) + GROUP_GAP;
  };

  // 2-column placement: fill left column first (balance by height)
  const nCols = Math.min(2, Math.max(1, groupData.length));
  const panelW = svgW - 2 * margin;
  const colW = (panelW - 2 * PANEL_PAD) / nCols;

  const positions: Array<{ g: typeof groupData[0]; col: number; localY: number }> = [];
  const colHeights = [0, 0];
  for (const g of groupData) {
    const col = nCols === 1 ? 0 : (colHeights[0] <= colHeights[1] ? 0 : 1);
    positions.push({ g, col, localY: colHeights[col] });
    colHeights[col] += gItemH(g);
  }
  const contentH = Math.max(colHeights[0], colHeights[1]);
  const totalWells = rows * cols;
  const assignedToGroupWells = Object.keys(wells).length;
  const emptyWells = totalWells - assignedToGroupWells;
  const EMPTY_ROW_H = emptyWells > 0 ? 24 : 0;
  const legendPanelH = LEGEND_HDR_H + contentH + EMPTY_ROW_H + 2 * PANEL_PAD;

  // Fallback: flat dye list when no groups defined
  const flatLegendRows = Math.ceil(dyeNames.length / Math.max(1, Math.floor(plateW / 200)));
  const legendH = groupData.length > 0
    ? legendPanelH + 20
    : (dyeNames.length > 0 ? flatLegendRows * 26 + 36 : 0);

  const plateX = margin + headerSize;
  const plateY = margin + titleH + headerSize;
  const letters = Array.from({ length: rows }, (_, i) => String.fromCharCode(65 + i));
  const svgH = margin + titleH + headerSize + plateH + legendH + margin;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg width="${svgW}" height="${svgH}" xmlns="http://www.w3.org/2000/svg">\n`;
  svg += svgDefs();
  svg += svgDarkBackground(svgW, svgH);
  svg += svgTitle(margin + headerSize + plateW / 2, margin + 16, 'Dye Program Assignment', `${plateType}-Well Plate`);

  // Column headers
  for (let c = 1; c <= cols; c++) {
    svg += svgHeaderText(plateX + (c - 1) * (wellSize + gap) + wellSize / 2, margin + titleH + headerSize / 2, c);
  }

  // Rows
  for (let r = 0; r < rows; r++) {
    const letter = letters[r];
    const wy = plateY + r * (wellSize + gap);
    svg += svgHeaderText(margin + headerSize / 2, wy + wellSize / 2, letter);

    for (let c = 1; c <= cols; c++) {
      const wx = plateX + (c - 1) * (wellSize + gap);
      const well = `${letter}${c}`;
      const group = wells[well];
      const dye = dyePrograms[well];

      if (dye) {
        // Dye-assigned: fill with dye color, no 3D gloss (matches UI)
        const dyeColor = generateDyeColor(dye);
        svg += svgWell(wx, wy, wellSize, wellSize, dyeColor, 3, false, false);
        // Colored border
        svg += `  <rect x="${wx}" y="${wy}" width="${wellSize}" height="${wellSize}" fill="none" stroke="${dyeColor}" stroke-width="1" rx="3" opacity="0.55"/>
`;
      } else if (group && groupColors[group]) {
        // No dye: show dimmed group color (same as UI `${color}44`)
        svg += `  <rect x="${wx + 1}" y="${wy + 1.5}" width="${wellSize}" height="${wellSize}" fill="#00000040" rx="3"/>
`;
        svg += `  <rect x="${wx}" y="${wy}" width="${wellSize}" height="${wellSize}" fill="${groupColors[group]}" opacity="0.27" rx="3"/>
`;
      } else {
        svg += svgEmptyWell(wx, wy, wellSize, wellSize, 3);
      }
    }
  }

  // ── Legend ──────────────────────────────────────────────────────────────────
  if (groupData.length > 0) {
    const panelX = margin;
    const panelY = plateY + plateH + 20;

    // Dark panel background (matches UI .plate-legend: #1a1f2e)
    svg += `  <rect x="${panelX}" y="${panelY}" width="${panelW}" height="${legendPanelH}" fill="#1a1f2e" rx="6"/>\n`;
    svg += `  <rect x="${panelX}" y="${panelY}" width="${panelW}" height="${legendPanelH}" fill="none" stroke="#2a3847" stroke-width="1" rx="6"/>\n`;

    // Header (matches UI <h4> in cyan, uppercase, letter-spacing)
    svg += `  <text x="${panelX + PANEL_PAD}" y="${panelY + PANEL_PAD + 12}" font-size="11" fill="#00b8ff" font-weight="700" font-family="Arial,sans-serif" letter-spacing="0.5">GROUPS &amp; DYE PROGRAMS</text>\n`;

    const contentY = panelY + PANEL_PAD + LEGEND_HDR_H;

    for (const { g, col, localY } of positions) {
      const ix = panelX + PANEL_PAD + col * colW;
      const iy = contentY + localY;

      // Group swatch (14×14, matches UI)
      svg += `  <rect x="${ix}" y="${iy + 3}" width="14" height="14" fill="${groupColors[g.group]}" rx="3"/>\n`;

      // Group name (bold) + well count (muted) — single text with tspan
      svg += `  <text x="${ix + 20}" y="${iy + 13}" font-size="11" font-family="Arial,sans-serif"><tspan font-weight="700" fill="#e0e6ee">${g.group}</tspan><tspan fill="#666"> (${g.count}w)</tspan></text>\n`;

      // Dye rows (indented, left border)
      if (g.dyes.length > 0 || g.noDyeCount > 0) {
        const dyeAreaX = ix + 20;
        const dyeAreaY = iy + GROUP_ROW_H + DYE_PAD_TOP;
        const totalSubRows = g.dyes.length + (g.noDyeCount > 0 ? 1 : 0);

        // Left border line (matches UI borderLeft: '1px solid #3a4857')
        svg += `  <line x1="${dyeAreaX}" y1="${dyeAreaY}" x2="${dyeAreaX}" y2="${dyeAreaY + totalSubRows * DYE_ROW_H}" stroke="#3a4857" stroke-width="1"/>\n`;

        g.dyes.forEach((dye, di) => {
          const dy = dyeAreaY + di * DYE_ROW_H;
          const dyeX = dyeAreaX + 6; // 6px paddingLeft
          const dyeWellCount = g.wellsInGroup.filter(([w]) => dyePrograms[w] === dye).length;

          // Dye swatch (10×8, matches UI)
          svg += `  <rect x="${dyeX}" y="${dy + 3}" width="10" height="8" fill="${dyeColorMap[dye] || '#00b8ff'}" rx="2"/>\n`;
          // Dye name + well count
          svg += `  <text x="${dyeX + 14}" y="${dy + 10}" font-size="10" fill="#cccccc" font-family="Arial,sans-serif">${dye}<tspan fill="#666"> (${dyeWellCount}w)</tspan></text>\n`;
        });

        // "No dye" row — cells in this group without a dye program
        if (g.noDyeCount > 0) {
          const dy = dyeAreaY + g.dyes.length * DYE_ROW_H;
          const dyeX = dyeAreaX + 6;
          svg += `  <rect x="${dyeX}" y="${dy + 3}" width="10" height="8" fill="rgba(255,255,255,0.07)" rx="2"/>\n`;
          svg += `  <text x="${dyeX + 14}" y="${dy + 10}" font-size="10" fill="#5a6677" font-family="Arial,sans-serif">No dye<tspan> (${g.noDyeCount}w)</tspan></text>\n`;
        }
      }
    }

    // "Empty (no cells)" footer — wells with no cell group at all
    if (emptyWells > 0) {
      const ey = contentY + contentH + 4;
      svg += `  <rect x="${panelX + PANEL_PAD}" y="${ey + 3}" width="14" height="14" fill="rgba(255,255,255,0.06)" rx="3"/>\n`;
      svg += `  <text x="${panelX + PANEL_PAD + 20}" y="${ey + 13}" font-size="11" font-family="Arial,sans-serif"><tspan font-weight="700" fill="#5a6677">Empty (no cells)</tspan><tspan fill="#666"> (${emptyWells}w)</tspan></text>\n`;
    }
  } else if (dyeNames.length > 0) {
    // Fallback: flat dye list when no groups
    const lx = margin;
    let ly = plateY + plateH + 28;
    const perRow = Math.max(1, Math.floor(plateW / 200));
    svg += `  <text x="${lx}" y="${ly}" font-size="11" fill="#00b8ff" font-weight="700" font-family="Arial,sans-serif">DYE PROGRAMS</text>\n`;
    ly += 14;
    dyeNames.forEach((dye, idx) => {
      const sx = lx + (idx % perRow) * 200;
      const sy = ly + Math.floor(idx / perRow) * 26;
      const dyeWellCount = Object.values(dyePrograms).filter(p => p === dye).length;
      svg += svgLegendSwatch(sx, sy, dyeColorMap[dye], false);
      svg += svgLegendText(sx + 24, sy - 2, dye, `${dyeWellCount} wells`);
    });
  }

  svg += `</svg>`;
  return svg;
}

/**
 * Convert SVG string to PNG and download
 */
async function svgToPng(svgString: string, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const svg = new DOMParser().parseFromString(svgString, 'image/svg+xml');
    const svgElement = svg.documentElement;
    
    const width = parseInt(svgElement.getAttribute('width') || '800');
    const height = parseInt(svgElement.getAttribute('height') || '600');
    
    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }
    
    ctx.scale(dpr, dpr);
    
    // Create a blob from SVG
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          URL.revokeObjectURL(svgUrl);
          resolve();
        } else {
          reject(new Error('Failed to create PNG blob'));
        }
      }, 'image/png');
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error('Failed to load SVG image'));
    };
    
    img.src = svgUrl;
  });
}

/**
 * Generate PNG for plate layout
 */
export async function generateLayoutPNG(data: PlateExportData, filename: string): Promise<void> {
  const svg = generateLayoutSVG(data);
  await svgToPng(svg, filename);
}

/**
 * Generate PNG for dye assignments
 */
export async function generateDyePNG(data: PlateExportData, filename: string): Promise<void> {
  const svg = generateDyeSVG(data);
  await svgToPng(svg, filename);
}

/**
 * Generate cell_layout.csv for iCELL input format
 */
export function generateCellLayout(data: PlateExportData): string {
  const { plateType, wells, groups = {} } = data;
  const { rows, cols } = getPlateDimensions(plateType);

  const letters = Array.from({ length: rows }, (_, i) => String.fromCharCode(65 + i));
  const header = ['row_name', ...Array.from({ length: cols }, (_, i) => String(i + 1))];
  const lines = [header.join(',')];

  for (const letter of letters) {
    const rowValues = [letter];
    for (let col = 1; col <= cols; col++) {
      const well = `${letter}${col}`;
      const group = wells[well];
      const density = group && groups[group] ? groups[group].density : '';
      rowValues.push(String(density));
    }
    lines.push(rowValues.join(','));
  }

  return lines.join('\n') + '\n';
}

/**
 * Generate dye_layout.csv for iCELL input format
 */
export function generateDyeLayout(data: PlateExportData): string {
  const { plateType, dyePrograms = {} } = data;
  const { rows, cols } = getPlateDimensions(plateType);

  const letters = Array.from({ length: rows }, (_, i) => String.fromCharCode(65 + i));
  const header = ['row_name', ...Array.from({ length: cols }, (_, i) => String(i + 1))];
  const lines = [header.join(',')];

  for (const letter of letters) {
    const rowValues = [letter];
    for (let col = 1; col <= cols; col++) {
      const well = `${letter}${col}`;
      const dye = dyePrograms[well];
      rowValues.push(dye || '');
    }
    lines.push(rowValues.join(','));
  }

  return lines.join('\n') + '\n';
}

/**
 * Generate meta_dye.csv for iCELL input format.
 * Accepts DyeProgram[] as stored in sessionStorage (camelCase format from ConfigPage).
 */
export function generateMetaDye(dyePrograms: Array<{ name: string; dyes: Array<{ dyeName: string; stockConcentration: number; stockUnit: string; finalConcentration: number; finalUnit: string }> }>): string {
  // Column names must match exactly what iCELL validation expects
  let csv = 'dye_program,dye_name,stock_concentration,stock_concentration_unit,final_concentration,final_concentration_unit\n';

  dyePrograms.forEach(program => {
    if (program && program.dyes && Array.isArray(program.dyes)) {
      program.dyes.forEach(dye => {
        csv += `${program.name},${dye.dyeName},${dye.stockConcentration},${dye.stockUnit},${dye.finalConcentration},${dye.finalUnit}\n`;
      });
    }
  });

  return csv;
}

/**
 * Download a file
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
