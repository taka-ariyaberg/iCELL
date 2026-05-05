import React from 'react';

type UnitProps = {
  children: React.ReactNode;
};

export const Unit = ({ children }: UnitProps) => (
  <span className="unit">{children}</span>
);
