/** Right-hand detail panel of the Protocol Navigator.
 *
 *  Renders the active ProtocolEntry's preparation instructions. For
 *  cells mode it shows a flat instruction list; for dyes mode it parses
 *  the protocol-text lines into Diluent/component subsections plus a
 *  "Finish Mastermix" footer.
 */

import { splitProtocolDetail } from '../../utils/protocolInstructions';
import { ProtocolEntry, ProtocolMode } from './protocolTypes';

type ProtocolRow = {
  label: string;
  value: string;
};

type DyeComponentSection = {
  name: string;
  concentrationRows: ProtocolRow[];
  lines: string[];
};

const renderInstructionLine = (detail: string, key: string) => {
  const normalizedDetail = detail.trim();
  const splitDetail = splitProtocolDetail(normalizedDetail);

  if (splitDetail) {
    return (
      <div key={key} className="protocol-detail-row">
        <span className="protocol-detail-row-label">{splitDetail.label}</span>
        <span className="protocol-detail-row-value">{splitDetail.value}</span>
      </div>
    );
  }

  return (
    <div key={key} className="protocol-detail-note">
      {normalizedDetail}
    </div>
  );
};

const parseDyeConcentrationRows = (value: string): ProtocolRow[] => (
  value
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (/^mastermix target concentration\b/i.test(part)) {
        return {
          label: 'Mastermix Target Concentration',
          value: part.replace(/^mastermix target concentration\b/i, '').trim(),
        };
      }
      if (/^target final concentration\b/i.test(part)) {
        return {
          label: 'Target Final Concentration',
          value: part.replace(/^target final concentration\b/i, '').trim(),
        };
      }
      if (/^mastermix target\b/i.test(part)) {
        return {
          label: 'Mastermix Target',
          value: part.replace(/^mastermix target\b/i, '').trim(),
        };
      }
      return { label: 'Concentration', value: part };
    })
);

const parseDyeDetails = (details: string[]) => {
  const overview: string[] = [];
  const finish: string[] = [];
  const components: DyeComponentSection[] = [];
  let currentComponent: DyeComponentSection | null = null;

  const pushCurrent = () => {
    if (currentComponent) {
      components.push(currentComponent);
      currentComponent = null;
    }
  };

  details.forEach((detail) => {
    const normalizedDetail = detail.trim();
    if (!normalizedDetail) return;

    const splitDetail = splitProtocolDetail(normalizedDetail);
    const isDiluentHeader = /^Diluent$/i.test(normalizedDetail);
    const isComponentHeader = (
      isDiluentHeader
      || (
        splitDetail
        && /(?:mastermix target concentration|target final concentration)/i.test(splitDetail.value)
      )
    );
    const isFinishLine = /^Mix well and dispense/i.test(normalizedDetail);

    if (isComponentHeader) {
      pushCurrent();
      currentComponent = {
        name: isDiluentHeader ? 'Diluent' : splitDetail!.label,
        concentrationRows: isDiluentHeader ? [] : parseDyeConcentrationRows(splitDetail!.value),
        lines: [],
      };
      return;
    }

    if (isFinishLine) {
      pushCurrent();
      finish.push(normalizedDetail);
      return;
    }

    if (currentComponent) {
      currentComponent.lines.push(normalizedDetail);
    } else {
      overview.push(normalizedDetail);
    }
  });

  pushCurrent();
  return { overview, components, finish };
};

const renderDyeDetailBlocks = (details: string[], entryId: string) => {
  const structured = parseDyeDetails(details);

  return (
    <div className="protocol-detail-stack">
      {structured.overview.length > 0 && (
        <div className="protocol-detail-instructions">
          {structured.overview.map((detail, index) => (
            renderInstructionLine(detail, `${entryId}-overview-${index}`)
          ))}
        </div>
      )}

      {structured.components.map((component, index) => (
        <section key={`${entryId}-component-${index}`} className="protocol-detail-subsection">
          <h5 className="protocol-detail-subsection-title">{component.name}</h5>
          <div className="protocol-detail-instructions">
            {component.concentrationRows.map((row, rowIndex) => (
              <div key={`${entryId}-component-${index}-row-${rowIndex}`} className="protocol-detail-row">
                <span className="protocol-detail-row-label">{row.label}</span>
                <span className="protocol-detail-row-value">{row.value}</span>
              </div>
            ))}
            {component.lines.map((detail, detailIndex) => (
              renderInstructionLine(detail, `${entryId}-component-${index}-detail-${detailIndex}`)
            ))}
          </div>
        </section>
      ))}

      {structured.finish.length > 0 && (
        <section className="protocol-detail-subsection">
          <h5 className="protocol-detail-subsection-title">Finish Mastermix</h5>
          <div className="protocol-detail-instructions">
            {structured.finish.map((detail, index) => (
              renderInstructionLine(detail, `${entryId}-finish-${index}`)
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

interface ProtocolDetailCardProps {
  entry: ProtocolEntry | null;
  protocolMode: ProtocolMode;
  /** Border color of the active card (`var(--icell-accent)` when no entry). */
  color: string;
}

export const ProtocolDetailCard = ({ entry, protocolMode, color }: ProtocolDetailCardProps) => {
  if (!entry) {
    return (
      <div className="protocol-empty-card">
        <h4>{protocolMode === 'cells' ? 'Select a Cell Prep Region' : 'Select a Dye Region'}</h4>
        <p>
          {protocolMode === 'cells'
            ? 'Click a colored region on the plate to load its preparation instructions.'
            : 'Click a colored dye region on the plate to load its mastermix instructions.'}
        </p>
      </div>
    );
  }

  return (
    <div className="protocol-detail-card" style={{ borderColor: color }}>
      <div className="protocol-detail-header">
        <h4>{entry.title}</h4>
        <p className="protocol-detail-subtitle">{entry.subtitle}</p>
      </div>

      {entry.details.length > 0 ? (
        protocolMode === 'dyes'
          ? renderDyeDetailBlocks(entry.details, entry.id)
          : (
            <div className="protocol-detail-instructions">
              {entry.details.map((detail, index) => renderInstructionLine(detail, `${entry.id}-${index}`))}
            </div>
          )
      ) : (
        <div className="protocol-detail-note">
          This preparation group has no additional detail lines in the generated protocol text.
        </div>
      )}
    </div>
  );
};