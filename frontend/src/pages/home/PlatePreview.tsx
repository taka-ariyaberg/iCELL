import React from 'react';

/*
 * Decorative 96-well plate (8 × 12) for the home page, drawn in the Plate
 * Designer's style: rounded-square wells and accent row/column labels.
 *
 * The inner wells (rows B–G, columns 2–11) are mapped in three groups by row
 * band; the edge wells stay empty. It is a single SVG with a fixed viewBox, so
 * it scales with its container and never changes size. It is an illustration
 * only, not connected to the plate store.
 *
 * Motion ("dispense pass", HomePage.css): a soft head sweeps across the
 * columns and each mapped column lights up as it passes, staggered by the
 * --col custom property. With reduced motion the plate is shown fully mapped.
 */

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;
const COLUMN_COUNT = 12;

// Geometry in SVG user units.
const WELL = 22;
const PITCH = 28;
const PAD = 14;
const LABEL = 22;
const GRID_X = PAD + LABEL;
const GRID_Y = PAD + LABEL;
const VIEW_W = GRID_X + COLUMN_COUNT * PITCH - (PITCH - WELL) + PAD;
const VIEW_H = GRID_Y + ROWS.length * PITCH - (PITCH - WELL) + PAD;

const COLUMNS = Array.from({ length: COLUMN_COUNT }, (_, col) => col);

const wellX = (col: number) => GRID_X + col * PITCH;
const wellY = (row: number) => GRID_Y + row * PITCH;

/** 0 = empty edge row; 1–3 = mapped group, strongest fill first (B–C, D–E, F–G). */
const toneForRow = (row: number) => (row === 0 || row === ROWS.length - 1 ? 0 : Math.ceil(row / 2));

const isMappedColumn = (col: number) => col > 0 && col < COLUMN_COUNT - 1;

export const PlatePreview: React.FC = () => (
  <div className="home-plate" aria-hidden="true">
    <svg
      className="home-plate-svg"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width={VIEW_W}
      height={VIEW_H}
      focusable="false"
    >
      <defs>
        <linearGradient id="home-plate-head-fill" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="currentColor" stopOpacity="0" />
          <stop offset="0.5" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect className="home-plate-bed" width={VIEW_W} height={VIEW_H} rx={6} />

      <g className="home-plate-labels">
        {COLUMNS.map((col) => (
          <text key={`col-${col}`} x={wellX(col) + WELL / 2} y={PAD + LABEL / 2}>
            {col + 1}
          </text>
        ))}
        {ROWS.map((row, r) => (
          <text key={`row-${row}`} x={PAD + LABEL / 2 - 2} y={wellY(r) + WELL / 2}>
            {row}
          </text>
        ))}
      </g>

      <g className="home-plate-wells">
        {ROWS.map((row, r) =>
          COLUMNS.map((col) => (
            <rect key={`${row}${col + 1}`} x={wellX(col)} y={wellY(r)} width={WELL} height={WELL} rx={4} />
          )),
        )}
      </g>

      {/* Dispense head: starts over column 1 and travels to column 12. */}
      <rect
        className="home-plate-head"
        x={wellX(0) - 5}
        y={GRID_Y - 7}
        width={WELL + 10}
        height={ROWS.length * PITCH - (PITCH - WELL) + 14}
        rx={7}
        fill="url(#home-plate-head-fill)"
      />

      {COLUMNS.filter(isMappedColumn).map((col) => (
        <g key={`fill-${col}`} className="home-plate-column" style={{ '--col': col } as React.CSSProperties}>
          {ROWS.map((row, r) => {
            const tone = toneForRow(r);
            return tone === 0 ? null : (
              <rect
                key={`${row}${col + 1}`}
                className={`home-plate-fill home-plate-fill--${tone}`}
                x={wellX(col)}
                y={wellY(r)}
                width={WELL}
                height={WELL}
                rx={4}
              />
            );
          })}
        </g>
      ))}
    </svg>
  </div>
);
