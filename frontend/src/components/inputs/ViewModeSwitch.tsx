import React from 'react';
import '../../styles/ViewModeSwitch.css';

type ViewMode = 'cells' | 'dyes';

interface ViewModeSwitchProps {
  mode: ViewMode;
  onToggle: () => void;
  className?: string;
  shortcutHint?: string;
}

export const ViewModeSwitch: React.FC<ViewModeSwitchProps> = ({
  mode,
  onToggle,
  className = '',
  shortcutHint,
}) => {
  const nextMode = mode === 'cells' ? 'dyes' : 'cells';
  const currentIcon = mode === 'cells' ? '🧪' : '🎨';

  return (
    <div className={`view-mode-switch ${className}`.trim()}>
      <button
        type="button"
        className={`view-mode-toggle${mode === 'dyes' ? ' is-dyes' : ''}`}
        onClick={onToggle}
        aria-label={`Switch to ${nextMode} view`}
        title={`Switch to ${nextMode} view`}
      >
        <span className="view-mode-track" aria-hidden="true">
          <span className="view-mode-side view-mode-side-cells">🧪</span>
          <span className="view-mode-side view-mode-side-dyes">🎨</span>
          <span className="view-mode-thumb">
            <span className="view-mode-thumb-icon">{currentIcon}</span>
            <span className="view-mode-thumb-label">
              {mode === 'cells' ? 'Cells' : 'Dyes'}
            </span>
          </span>
        </span>
      </button>
      {shortcutHint && <span className="view-mode-shortcut">{shortcutHint}</span>}
    </div>
  );
};
