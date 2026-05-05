// Shared design tokens. Single source of truth for values used across
// more than one component (color palettes, etc.). CSS variables for
// theme colors live in styles/App.css.

/** Color palette used to differentiate cell groups and dye programs.
 *
 * Order matters — colors are assigned by group/program index, so the
 * sequence is part of the contract. Match the visual identity of the
 * web app and SVG export. Add new colors at the END.
 */
export const GROUP_COLOR_PALETTE: readonly string[] = [
  '#00d9ff', '#ff6b9d', '#ffd700',
  '#00ff88', '#ff8c42', '#00b8ff',
  '#ff66cc', '#66ff66', '#ffaa33',
  '#33aaff', '#ff3366', '#aaff33',
];