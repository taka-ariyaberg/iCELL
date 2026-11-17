import React from 'react';

/**
 * Line icons for the home page. 24px grid, stroke follows currentColor so the
 * surrounding CSS sets the colour. Purely decorative: every icon is hidden from
 * assistive tech, and the text next to it carries the meaning.
 */
const Icon: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

export const NewProjectIcon: React.FC = () => (
  <Icon>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
    <path d="M12 8.5v7M8.5 12h7" />
  </Icon>
);

export const ImportFilesIcon: React.FC = () => (
  <Icon>
    <path d="M12 14.5V4.5" />
    <path d="M7.75 8.75 12 4.5l4.25 4.25" />
    <path d="M4.5 14v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V14" />
  </Icon>
);

export const ArrowRightIcon: React.FC = () => (
  <Icon>
    <path d="M5 12h13" />
    <path d="M13 7l5 5-5 5" />
  </Icon>
);

const WELL_DOTS: ReadonlyArray<[number, number]> = [
  [8, 10], [12, 10], [16, 10],
  [8, 14], [12, 14], [16, 14],
];

export const PlateIcon: React.FC = () => (
  <Icon>
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    {WELL_DOTS.map(([cx, cy]) => (
      <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.3" fill="currentColor" stroke="none" />
    ))}
  </Icon>
);

export const FlaskIcon: React.FC = () => (
  <Icon>
    <path d="M9.5 3.5h5" />
    <path d="M10.5 3.5v5.25L5.6 17.4a2 2 0 0 0 1.75 3.1h9.3a2 2 0 0 0 1.75-3.1L13.5 8.75V3.5" />
    <path d="M7.6 14.5h8.8" />
  </Icon>
);

export const CsvFileIcon: React.FC = () => (
  <Icon>
    <path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z" />
    <path d="M14 3.5v5h5" />
    <path d="M8.5 12.5h7M8.5 16h7M12 12.5V16" />
  </Icon>
);

export const HandoffIcon: React.FC = () => (
  <Icon>
    <path d="M3.5 12h9" />
    <path d="M9 8.5l3.5 3.5L9 15.5" />
    <rect x="15" y="5" width="5.5" height="14" rx="1.75" />
  </Icon>
);
