import React from 'react';

const getGradeColor = (grade) => {
  if (grade >= 7.0) return 'var(--success)';
  if (grade >= 6.5) return 'var(--accent-primary)';
  if (grade >= 6.0) return 'var(--warning)';
  return 'var(--danger)';
};

const getTierText = (grade) => {
  if (grade >= 7.5) return 'Elite';
  if (grade >= 7.0) return '1st Round';
  if (grade >= 6.5) return 'Starter';
  if (grade >= 6.0) return 'Rotacional';
  return 'Backup';
};

const getLetterGrade = (grade) => {
  if (grade >= 7.5) return 'A';
  if (grade >= 7.0) return 'B+';
  if (grade >= 6.5) return 'B';
  if (grade >= 6.0) return 'C+';
  if (grade >= 5.5) return 'C';
  return 'D';
};

const PlayerProfileModal = ({ playerData, onClose }) => {
  if (!playerData) return null;

  // Render stats lines
  const renderStats = () => {
    if (!playerData.estatisticas || playerData.estatisticas.length === 0) {
      return <div style={{ color: 'var(--text-muted)' }}>Nenhuma estatística detalhada encontrada.</div>;
    }
    return (
      <div className="stats-list">
        {playerData.estatisticas.map((stat, idx) => (
          <div key={idx} className="stat-item">
            {stat}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Top bar */}
        <div className="modal-header-bar">
          <button className="btn-icon" onClick={onClose}>
            &lt;
          </button>
          <div className="modal-brand">CLÓCK</div>
          <button className="btn-icon bookmark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>
        </div>

        {/* Header Info */}
        <div className="profile-header">
          <div className="profile-main-info">
            <div className="profile-ranks">
              <span style={{ color: 'var(--text-muted)' }}>#{playerData.rank || '--'} Overall</span>
              <span style={{ color: 'var(--text-muted)' }}> | </span>
              <span style={{ color: 'var(--text-muted)' }}>#{playerData.posRank || '--'} {playerData.position || '--'}</span>
            </div>
            
            <h1 className="profile-name">{playerData.name}</h1>
            <div className="profile-school">{playerData.school || 'College'}</div>
            
            <div className="profile-tags">
              <span className="pos-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>{playerData.position || 'N/A'}</span>
              <span className="pos-badge" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.3)' }}>Dia {playerData.grade >= 6.5 ? '1/2' : '3'}</span>
            </div>

            <div className="profile-bio">
              {playerData.bio ? playerData.bio.split('|').map((part, i) => (
                <span key={i} className="bio-part">{part.trim()}</span>
              )) : (
                <span className="bio-part">Dados biográficos indisponíveis</span>
              )}
            </div>
          </div>
          
          <div className="profile-grade-circle" style={{ borderColor: getGradeColor(playerData.grade) }}>
            <div className="grade-score" style={{ color: getGradeColor(playerData.grade) }}>
              {playerData.grade?.toFixed(2) || '0.00'}
            </div>
            <div className="grade-letter">{getLetterGrade(playerData.grade)}</div>
            <div className="grade-tier">{getTierText(playerData.grade)}</div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="profile-scroll-content">
          <div className="profile-section">
            <h3 className="section-title">RESUMO DO PROSPECTO</h3>
            <p className="profile-text">{playerData.resumo}</p>
          </div>

          {(playerData.fortes?.length > 0 || playerData.fracos?.length > 0) && (
            <div className="profile-section">
              <h3 className="section-title">PONTOS FORTES E FRACOS</h3>
              <div className="strengths-weaknesses">
                <div className="strengths-col glass-panel-inner">
                  <h4 style={{ color: 'var(--success)' }}>FORTES</h4>
                  <ul>
                    {playerData.fortes?.map((pt, i) => (
                      <li key={`forte-${i}`}>{pt}</li>
                    ))}
                  </ul>
                </div>
                <div className="weaknesses-col glass-panel-inner">
                  <h4 style={{ color: 'var(--danger)' }}>FRACOS</h4>
                  <ul>
                    {playerData.fracos?.map((pt, i) => (
                      <li key={`fraco-${i}`}>{pt}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {playerData.notas && Object.keys(playerData.notas).length > 0 && (
            <div className="profile-section">
              <h3 className="section-title">NOTAS DO SCOUT</h3>
              <div className="scout-notes glass-panel-inner" style={{ padding: '0.5rem 1.5rem', background: 'var(--bg-tertiary)' }}>
                {Object.entries(playerData.notas).map(([key, value]) => {
                  if (key.toUpperCase() === 'NOTA FINAL') return null;
                  const ratio = ((value) / 10) * 100; // max is usually around 8 for these grades
                  return (
                    <div className="scout-bar-row" key={key}>
                      <div className="scout-bar-label">{key}</div>
                      <div className="scout-bar-bg">
                        <div className="scout-bar-fill" style={{ 
                          width: `${Math.min(ratio * 1.25, 100)}%`,
                          background: getGradeColor(value)
                        }}></div>
                      </div>
                      <div className="scout-bar-value">{value.toFixed(2)}</div>
                    </div>
                  );
                })}
                
                {/* NOTA FINAL */}
                {playerData.notas['NOTA FINAL'] && (
                  <div className="scout-bar-row final-grade-row" style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <div className="scout-bar-label" style={{ fontWeight: 800 }}>NOTA FINAL</div>
                    <div className="scout-bar-value" style={{ 
                      color: getGradeColor(playerData.notas['NOTA FINAL']),
                      fontWeight: 800,
                      fontSize: '1.2rem'
                    }}>{playerData.notas['NOTA FINAL'].toFixed(2)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="profile-section">
            <h3 className="section-title">PRINCIPAIS ESTATÍSTICAS</h3>
            <div className="stats-box glass-panel-inner">
              {renderStats()}
            </div>
          </div>

          <div className="profile-section" style={{ paddingBottom: '2rem' }}>
            <h3 className="section-title">TIMES INTERESSADOS</h3>
            <div className="teams-box glass-panel-inner" style={{ minHeight: '3rem', display: 'flex', alignItems: 'center' }}>
               {playerData.times?.length > 0 ? (
                 <div className="interested-teams">
                   {playerData.times.map((team, idx) => (
                     <div className="team-badge" key={idx}>
                       <span style={{ fontSize: '1rem' }}>🚩</span> {team.trim()}
                     </div>
                   ))}
                 </div>
               ) : (
                <div style={{ color: 'var(--text-muted)' }}>Nenhum time anotado.</div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfileModal;
