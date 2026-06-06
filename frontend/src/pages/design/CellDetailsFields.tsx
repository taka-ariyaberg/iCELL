import { useState } from 'react';
import { CellForm, cellFormErrors, sanitizeDecimal } from './cellMeta';

interface Props {
  form: CellForm;
  setForm: (f: CellForm) => void;
}

const BLOCKED_NUMBER_KEYS = ['e', 'E', '+', '-'];

/** The four mandatory cell-identity fields as a 2×2 grid with inline validation.
 *  Errors show only after a field has been touched (blurred), so a fresh form
 *  isn't all-red on open. Used by both the Assign and Edit group modals. */
export const CellDetailsFields = ({ form, setForm }: Props) => {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const errors = cellFormErrors(form);
  const mark = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  const err = (k: keyof CellForm) =>
    touched[k] && errors[k] ? <div className="field-error">{errors[k]}</div> : null;

  return (
    <div className="form-group" style={{ borderTop: '1px solid #3a4857', paddingTop: '12px' }}>
      <label>Cell details (all required)</label>
      <div className="cell-details-grid">
        <div className="field-cell">
          <input type="text" value={form.cellLine} placeholder="Cell line (e.g. HeLa)"
            onChange={(e) => setForm({ ...form, cellLine: e.target.value })}
            onBlur={() => mark('cellLine')} />
          {err('cellLine')}
        </div>
        <div className="field-cell">
          <input type="text" value={form.modification} placeholder="Wildtype?"
            onChange={(e) => setForm({ ...form, modification: e.target.value })}
            onBlur={() => mark('modification')} />
          {err('modification')}
        </div>
        <div className="field-cell">
          <input type="text" value={form.passage} placeholder="Passage (e.g. P12)"
            onChange={(e) => setForm({ ...form, passage: e.target.value })}
            onBlur={() => mark('passage')} />
          {err('passage')}
        </div>
        <div className="field-cell">
          <input type="number" min="0" max="100" inputMode="decimal" placeholder="Viability %"
            value={form.viability ?? ''}
            onKeyDown={(e) => { if (BLOCKED_NUMBER_KEYS.includes(e.key)) e.preventDefault(); }}
            onChange={(e) => {
              const s = sanitizeDecimal(e.target.value);
              setForm({ ...form, viability: s === '' ? null : Number(s) });
            }}
            onBlur={() => mark('viability')} />
          {err('viability')}
        </div>
      </div>
    </div>
  );
};
