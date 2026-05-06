import { Unit } from './Unit';

export type FormattedVolumeProps = {
  value: number;
  digits?: number;
  unit?: 'µL' | 'mL';
  withUnit?: boolean;
};

/** Render a numeric volume as `{value}.{digits} µL` (or other units).
 *
 * Used as a single source of truth so we never duplicate `${x.toFixed(1)} µL`
 * inline across components. The unit text is wrapped in <Unit> so any parent
 * that applies `text-transform: uppercase` doesn't case-map µ → Μ.
 */
export const FormattedVolume = ({
  value,
  digits = 1,
  unit = 'µL',
  withUnit = true,
}: FormattedVolumeProps) => (
  <>
    {value.toFixed(digits)}
    {withUnit && (
      <>
        {' '}
        <Unit>{unit}</Unit>
      </>
    )}
  </>
);