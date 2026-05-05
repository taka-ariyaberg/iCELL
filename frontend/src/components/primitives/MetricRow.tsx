import React from 'react';

export type MetricRowProps = {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
};

export const MetricRow = ({ label, value, unit }: MetricRowProps) => (
  <div className="metric">
    <span className="metric-label">{label}</span>
    <span className="metric-value">{value}</span>
    {unit !== undefined && <span className="metric-unit">{unit}</span>}
  </div>
);