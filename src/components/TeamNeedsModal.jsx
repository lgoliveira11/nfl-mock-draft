import { useState, useEffect } from 'react';

const ALL_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OT', 'IOL', 'EDGE', 'IDL', 'LB', 'CB', 'S', 'K/P'];

export default function TeamNeedsModal({ team, onClose, onSave }) {
  const [selectedNeeds, setSelectedNeeds] = useState(team.needs || []);

  const handleTogglePosition = (pos) => {
    setSelectedNeeds(prev => 
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    );
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const items = [...selectedNeeds];
    [items[index - 1], items[index]] = [items[index], items[index - 1]];
    setSelectedNeeds(items);
  };

  const moveDown = (index) => {
    if (index === selectedNeeds.length - 1) return;
    const items = [...selectedNeeds];
    [items[index + 1], items[index]] = [items[index], items[index + 1]];
    setSelectedNeeds(items);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="modal-content team-needs-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', height: '600px' }}>
        <div className="modal-header-bar">
          <div className="modal-brand">EDITAR CARÊNCIAS: {team.team}</div>
          <button className="btn-icon" onClick={onClose}>&times;</button>
        </div>
        
        <div className="profile-scroll-content" style={{ padding: '1.5rem 2rem' }}>
          <section className="profile-section">
            <h4 className="section-title">Selecionar Posições</h4>
            <div className="pill-filters" style={{ flexWrap: 'wrap', gap: '0.4rem', overflow: 'visible', paddingBottom: '1rem' }}>
              {ALL_POSITIONS.map(pos => (
                <button 
                  key={pos}
                  className={`pill-btn ${selectedNeeds.includes(pos) ? 'active-pos' : ''}`}
                  onClick={() => handleTogglePosition(pos)}
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem' }}
                >
                  {pos}
                </button>
              ))}
            </div>
          </section>

          <section className="profile-section" style={{ marginTop: '1rem' }}>
            <h4 className="section-title">Ordenar Prioridades</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              As posições no topo terão maior peso nas escolhas da CPU.
            </p>
            
            <div className="needs-order-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {selectedNeeds.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                  Nenhuma posição selecionada.
                </div>
              ) : (
                selectedNeeds.map((pos, index) => (
                  <div key={pos} className="glass-panel-inner" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem', 
                    padding: '0.5rem 1rem',
                  }}>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: '800', width: '20px', fontSize: '0.9rem' }}>{index + 1}</span>
                    <span className="pos-badge" style={{ minWidth: '40px', textAlign: 'center' }}>{pos}</span>
                    <div style={{ flex: 1 }}></div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button 
                        className="btn-icon" 
                        style={{ width: '28px', height: '28px' }} 
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                      >↑</button>
                      <button 
                        className="btn-icon" 
                        style={{ width: '28px', height: '28px' }} 
                        onClick={() => moveDown(index)}
                        disabled={index === selectedNeeds.length - 1}
                      >↓</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="step-actions right" style={{ padding: '1.5rem 2rem', borderTop: '1px solid var(--border-color)' }}>
          <button className="btn btn-outline" onClick={onClose} style={{ marginRight: '1rem' }}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onSave(selectedNeeds)}>Salvar Alterações</button>
        </div>
      </div>
    </div>
  );
}
