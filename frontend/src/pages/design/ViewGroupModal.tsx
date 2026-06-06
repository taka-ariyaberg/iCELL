import type { GroupDefinition } from '../../store/plateStore';

interface ViewGroupModalProps {
  group: GroupDefinition;
  wellCount: number;
  onClose: () => void;
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
    <span style={{ color: '#7a8a99' }}>{label}</span>
    <span style={{ fontWeight: 600 }}>{value || '—'}</span>
  </div>
);

export const ViewGroupModal = ({ group, wellCount, onClose }: ViewGroupModalProps) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <h3>Group: {group.name}</h3>
      <div className="modal-form">
        <Row label="Wells" value={String(wellCount)} />
        <Row label="Seeding density" value={`${group.density} cells/well`} />
        <Row label="Cell line" value={group.cellLine ?? ''} />
        <Row label="Genetic modification" value={group.modification ?? ''} />
        <Row label="Passage" value={group.passage ?? ''} />
        <Row label="Viability" value={group.viability != null ? `${group.viability} %` : ''} />
      </div>
      <div className="modal-actions" style={{ gridTemplateColumns: '1fr' }}>
        <button onClick={onClose} className="action-btn" style={{ width: '100%' }}>Close</button>
      </div>
    </div>
  </div>
);
