import { NumberInput } from '../../components/inputs/NumberInput';
import { Unit } from '../../components/primitives/Unit';

interface ParametersPanelProps {
  mode: 'no_dye' | 'dye';
  stockCellConc: number;
  setStockCellConc: (next: number) => void;
  overagePct: number;
  setOveragePct: (next: number) => void;
  finalWellVolume: number;
  setFinalWellVolume: (next: number) => void;
  deadVolumeCells: number;
  setDeadVolumeCells: (next: number) => void;
  deadVolumeDye: number;
  setDeadVolumeDye: (next: number) => void;
  isLoading: boolean;
  hasWells: boolean;
  onProcess: () => void;
}

/** Bottom panel of the Design page: seeding parameters + Process button.
 *
 *  The dye dead-volume input is only shown when `mode === 'dye'`.
 *  Process is wired to the parent's confirm-process modal.
 */
export const ParametersPanel = ({
  mode,
  stockCellConc,
  setStockCellConc,
  overagePct,
  setOveragePct,
  finalWellVolume,
  setFinalWellVolume,
  deadVolumeCells,
  setDeadVolumeCells,
  deadVolumeDye,
  setDeadVolumeDye,
  isLoading,
  hasWells,
  onProcess,
}: ParametersPanelProps) => (
  <div className="params-panel">
    <div className="params-header">Parameters</div>
    <div className="params-fieldset">
      <div className="params-row">
        <div className="form-group">
          <label htmlFor="stock_cell_conc">Stock Cell Concentration (cells/mL)</label>
          <NumberInput
            id="stock_cell_conc" value={stockCellConc}
            onChange={(e) => setStockCellConc(parseInt(e.target.value))} disabled={isLoading}
            onFocus={(e) => e.target.select()}
          />
        </div>
        <div className="form-group">
          <label htmlFor="overage_pct">Overage (%)</label>
          <NumberInput
            id="overage_pct" step="5" min="0" max="200" value={overagePct}
            onChange={(e) => setOveragePct(parseInt(e.target.value))} disabled={isLoading}
            onFocus={(e) => e.target.select()}
          />
        </div>
        <div className="form-group">
          <label htmlFor="final_well_vol">Final Well Volume <Unit>(µL)</Unit></label>
          <NumberInput
            id="final_well_vol" min="10" max="200" step="5" value={finalWellVolume}
            onChange={(e) => setFinalWellVolume(parseInt(e.target.value))} disabled={isLoading}
            onFocus={(e) => e.target.select()}
          />
        </div>
        <div className="form-group">
          <label htmlFor="dead_vol_cells">Dead Volume – Cell Suspension <Unit>(µL)</Unit></label>
          <NumberInput
            id="dead_vol_cells" value={deadVolumeCells}
            onChange={(e) => setDeadVolumeCells(parseInt(e.target.value))} disabled={isLoading}
            onFocus={(e) => e.target.select()}
          />
        </div>
        {mode === 'dye' && (
          <div className="form-group">
            <label htmlFor="dead_vol_dye">Dead Volume – Dye <Unit>(µL)</Unit></label>
            <NumberInput
              id="dead_vol_dye" value={deadVolumeDye}
              onChange={(e) => setDeadVolumeDye(parseInt(e.target.value))} disabled={isLoading}
              onFocus={(e) => e.target.select()}
            />
          </div>
        )}
      </div>
    </div>
    <div className="params-footer">
      <button
        onClick={onProcess}
        disabled={isLoading || !hasWells}
        className="process-btn"
      >
        {isLoading ? 'Processing…' : '▶ Process'}
      </button>
    </div>
  </div>
);