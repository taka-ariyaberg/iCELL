/** Concentration-unit `<option>` set used by every dye-input field.
 *
 * Lives in its own .tsx file so the rest of the design directory's shared
 * code (types.ts) can stay pure TypeScript.
 */
export const UNIT_OPTIONS = (
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