export type PlateNavigationChipProps = {
  currentPlate: number;
  numPlates: number;
};

export const PlateNavigationChip = ({ currentPlate, numPlates }: PlateNavigationChipProps) => {
  if (numPlates <= 1) return null;
  return (
    <div className="plate-nav">
      <div className="plate-nav-chip">
        <span className="plate-nav-eyebrow">Viewing</span>
        <span className="plate-nav-value">Plate {currentPlate}</span>
        <span className="plate-nav-divider">/</span>
        <span className="plate-nav-total">{numPlates}</span>
      </div>
    </div>
  );
};