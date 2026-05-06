import React from 'react';
import { NumberInput } from '../../components/NumberInput';
import { DyeDefinition } from './types';

/** Concentration-unit `<option>` set used by both Stock and Final selects below. */
const UNIT_OPTIONS = (
  <>
    <option value="nM">nM</option>
    <option value="uM">µM</option>
    <option value="mM">mM</option>
    <option value="ng_per_ml">ng/mL</option>
    <option value="ug_per_ml">µg/mL</option>
    <option value="mg_per_ml">mg/mL</option>
    <option value="units_per_ml">units/mL</option>
    <option value="X">X (fold)</option>
  </>
);

const selectSt: React.CSSProperties = {
  padding: '8px',
  background: '#1a1f2e',
  border: '1px solid #3a4857',
  borderRadius: '4px',
  color: '#fff',
  fontSize: '12px',
  minWidth: '80px',
  cursor: 'pointer',
};

interface AddDyeFormProps {
  /** Name of the program the dye is being added to — labels the submit button. */
  targetProgramName: string;
  draft: DyeDefinition;
  setDraft: (next: DyeDefinition) => void;
  onAdd: () => void;
  /** When true, also commit on Enter inside the dye-name input. */
  enterToSubmit?: boolean;
}

/** Small sub-form used inside both `DyeAssignmentModal` and
 *  `ManageDyeProgramModal` to add a new dye row to a program.
 *
 *  Centralizes the (dye name + stock conc/unit + final conc/unit + add
 *  button) layout so both modals stay in sync.
 */
export const AddDyeForm = ({
  targetProgramName,
  draft,
  setDraft,
  onAdd,
  enterToSubmit = false,
}: AddDyeFormProps) => {
  const canAdd =
    draft.dyeName.trim() !== '' &&
    draft.stockConcentration > 0 &&
    draft.finalConcentration > 0;

  return (
    <div
      style={{
        background: '#252d3d',
        padding: '12px',
        borderRadius: '4px',
        border: '1px solid #3a4857',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <p style={{ fontSize: '11px', color: '#a0aab8', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Add Dye
      </p>
      <input
        type="text"
        placeholder="Dye name (e.g., Hoechst_33342)"
        value={draft.dyeName}
        onChange={(e) => setDraft({ ...draft, dyeName: e.target.value })}
        onKeyDown={
          enterToSubmit
            ? (e) => { if (e.key === 'Enter') { e.preventDefault(); if (canAdd) onAdd(); } }
            : undefined
        }
        style={{
          padding: '8px 10px',
          background: '#1a1f2e',
          border: `1px solid ${draft.dyeName ? '#00b8ff' : '#3a4857'}`,
          borderRadius: '4px',
          color: '#fff',
          fontSize: '12px',
        }}
      />
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <label style={{ fontSize: '11px', color: '#a0aab8', whiteSpace: 'nowrap' }}>Stock:</label>
        <NumberInput
          placeholder="conc."
          value={draft.stockConcentration || ''}
          onChange={(e) => setDraft({ ...draft, stockConcentration: parseFloat(e.target.value) || 0 })}
          onFocus={(e) => e.target.select()}
          style={{
            flex: 1,
            padding: '8px',
            background: '#1a1f2e',
            border: `1px solid ${draft.stockConcentration > 0 ? '#00b8ff' : '#3a4857'}`,
            borderRadius: '4px',
            color: '#fff',
            fontSize: '12px',
          }}
        />
        <select
          value={draft.stockUnit}
          onChange={(e) => setDraft({ ...draft, stockUnit: e.target.value })}
          style={selectSt}
        >
          {UNIT_OPTIONS}
        </select>
      </div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <label style={{ fontSize: '11px', color: '#a0aab8', whiteSpace: 'nowrap' }}>Final:</label>
        <NumberInput
          placeholder="conc."
          value={draft.finalConcentration || ''}
          onChange={(e) => setDraft({ ...draft, finalConcentration: parseFloat(e.target.value) || 0 })}
          onFocus={(e) => e.target.select()}
          style={{
            flex: 1,
            padding: '8px',
            background: '#1a1f2e',
            border: `1px solid ${draft.finalConcentration > 0 ? '#00b8ff' : '#3a4857'}`,
            borderRadius: '4px',
            color: '#fff',
            fontSize: '12px',
          }}
        />
        <select
          value={draft.finalUnit}
          onChange={(e) => setDraft({ ...draft, finalUnit: e.target.value })}
          style={selectSt}
        >
          {UNIT_OPTIONS}
        </select>
      </div>
      <button
        type="button"
        onClick={onAdd}
        disabled={!canAdd}
        style={{
          padding: '8px',
          background: canAdd ? '#00d9ff' : '#3a4857',
          color: canAdd ? '#0f1419' : '#888',
          border: 'none',
          borderRadius: '4px',
          fontWeight: 600,
          cursor: canAdd ? 'pointer' : 'not-allowed',
          fontSize: '12px',
        }}
      >
        + Add Dye to "{targetProgramName}"
      </button>
    </div>
  );
};