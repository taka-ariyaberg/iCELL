import React from 'react';
import { ArrowRightIcon, ImportFilesIcon, NewProjectIcon } from './HomeIcons';
import '../../styles/HomePage.css';

interface HomePageProps {
  /** Opens the Design page (plate designer). */
  onNewProject: () => void;
  /** Opens the Import page (CSV uploader). */
  onImportFiles: () => void;
}

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
      </div>
    </div>
  </div>
);
