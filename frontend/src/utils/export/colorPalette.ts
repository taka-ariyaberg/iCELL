/** Color-palette helpers used by the export pipeline.
 *
 * `generateDyeColor` and `generateColors` use stable hashing so the same
 * group/dye name always renders the same color, with a collision-avoidance
 * pass for the multi-group case. The base palette comes from
 * `styles/tokens.ts`.
 */

import { GROUP_COLOR_PALETTE } from '../../styles/tokens';

// DYE_PALETTE — must stay in sync with the same array in PlateVisualization.tsx
const DYE_PALETTE = [
  '#ff6b35', '#f72585', '#ffbe0b', '#ff4d6d',
  '#c77dff', '#80ed99', '#ff9f1c', '#e040fb',
  '#f4a261', '#ff595e', '#b5e48c', '#ff70a6',
];

export function generateDyeColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) { h = ((h << 5) - h) + name.charCodeAt(i); h |= 0; }
  return DYE_PALETTE[Math.abs(h) % DYE_PALETTE.length];
}

/** Generate a stable color mapping with collision avoidance. */
export function generateColors(items: string[]): Record<string, string> {
  const colors = GROUP_COLOR_PALETTE;

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