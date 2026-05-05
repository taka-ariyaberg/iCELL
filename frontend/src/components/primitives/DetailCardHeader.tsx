import React from 'react';

export type DetailCardHeaderProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  color: string;
};

export const DetailCardHeader = ({ title, subtitle, badge, color }: DetailCardHeaderProps) => (
  <div className="detail-card-header" style={{ borderBottomColor: `${color}44` }}>
    <div className="detail-card-title-block">
      <h4 className="detail-card-title" style={{ color }}>{title}</h4>
      {subtitle !== undefined && <div className="detail-card-subtitle">{subtitle}</div>}
    </div>
    {badge !== undefined && (
      <span
        className="detail-card-badge"
        style={{
          background: `${color}22`,
          color,
          borderColor: `${color}66`,
        }}
      >
        {badge}
      </span>
    )}
  </div>
);