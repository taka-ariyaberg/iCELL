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
