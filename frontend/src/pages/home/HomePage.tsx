import React from 'react';
import {
  ArrowRightIcon,
  CsvFileIcon,
  FlaskIcon,
  HandoffIcon,
  ImportFilesIcon,
  NewProjectIcon,
  PlateIcon,
} from './HomeIcons';
import { PlatePreview } from './PlatePreview';
import '../../styles/HomePage.css';

interface HomePageProps {
  /** Opens the Design page (plate designer). */
  onNewProject: () => void;
  /** Opens the Import page (CSV uploader). */
  onImportFiles: () => void;
}

/** What iCELL does. Every line is sourced from README.md. */
const CAPABILITIES: ReadonlyArray<{ title: string; text: string; icon: React.ReactNode }> = [
  {
    title: 'Interactive plate design',
    text: 'Assign groups and dye programs well by well, right in the browser.',
    icon: <PlateIcon />,
  },
  {
    title: 'Per-well volumes & mastermix',
    text: 'Dispense volumes for every well and total mastermix recipes from your seeding parameters.',
    icon: <FlaskIcon />,
  },
  {
    title: 'Machine-ready CSV exports',
    text: 'Seeding and dye-program summaries as CSV, plus step-by-step preparation instructions.',
    icon: <CsvFileIcon />,
  },
  {
    title: 'Feeds iMETA directly',
    text: 'iMETA.csv carries per-well metadata into iMETA without a manual reformat step.',
    icon: <HandoffIcon />,
  },
];

interface HomeActionProps {
  id: string;
  variant: 'primary' | 'secondary';
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

/**
 * One of the two start actions. The accessible name is just the title
 * ("New Project"); the longer text is attached as its description.
 */
const HomeAction: React.FC<HomeActionProps> = ({ id, variant, title, description, icon, onClick }) => (
  <button
    type="button"
    className={`home-action home-action--${variant}`}
    onClick={onClick}
    aria-labelledby={`${id}-title`}
    aria-describedby={`${id}-desc`}
  >
    <span className="home-action-head">
      <span className="home-action-icon" aria-hidden="true">{icon}</span>
      <span id={`${id}-title`} className="home-action-title">{title}</span>
      <span className="home-action-arrow" aria-hidden="true"><ArrowRightIcon /></span>
    </span>
    <span id={`${id}-desc`} className="home-action-desc">{description}</span>
  </button>
);

export const HomePage: React.FC<HomePageProps> = ({ onNewProject, onImportFiles }) => (
  <div className="home-page">
    <div className="home-shell">
      <div className="home-hero">
        <div className="home-copy">
          <p className="home-eyebrow">Complete Cell Painting calculator</p>
          <h2 className="home-title">
            Every well, <span className="home-title-accent">calculated.</span>
          </h2>
          <p className="home-lead">
            From cell seeding to dye mastermixes: lay out your plate and iCELL computes
            per-well dispense volumes, mastermix recipes and machine-readable
            instructions — no spreadsheets.
          </p>

          <div className="home-actions">
            <HomeAction
              id="home-action-new"
              variant="primary"
              title="New Project"
              description="Design plate layout, assign groups and dye programs, then configure seeding parameters."
              icon={<NewProjectIcon />}
              onClick={onNewProject}
            />
            <HomeAction
              id="home-action-import"
              variant="secondary"
              title="Import Files"
              description="Upload existing plate layouts for processing."
              icon={<ImportFilesIcon />}
              onClick={onImportFiles}
            />
          </div>
        </div>

        <PlatePreview />
      </div>

      <ul className="home-capabilities" aria-label="What iCELL does">
        {CAPABILITIES.map(({ title, text, icon }) => (
          <li key={title} className="home-capability">
            <h3 className="home-capability-title">
              <span className="home-capability-icon" aria-hidden="true">{icon}</span>
              {title}
            </h3>
            <p className="home-capability-text">{text}</p>
          </li>
        ))}
      </ul>
    </div>
  </div>
);
