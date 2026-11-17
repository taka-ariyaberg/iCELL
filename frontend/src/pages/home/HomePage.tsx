import React from 'react';

interface HomePageProps {
  /** Opens the Design page (plate designer). */
  onNewProject: () => void;
  /** Opens the Import page (CSV uploader). */
  onImportFiles: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNewProject, onImportFiles }) => (
  <div className="home-page">
    <div className="mode-selector">
      <button
        className="mode-button"
        onClick={onNewProject}
      >
        <h3>New Project</h3>
        <p>Design plate layout, assign groups and dye programs, then configure seeding parameters.</p>
      </button>

      <button
        className="mode-button"
        onClick={onImportFiles}
      >
        <h3>Import Files</h3>
        <p>Upload existing plate layouts for processing.</p>
      </button>
    </div>
  </div>
);
