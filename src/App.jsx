import { useState, useEffect } from 'react';
import SetupWizard from './components/SetupWizard';
import { getCpuPick } from './utils/draftEngine';
import './index.css';

function App() {
  const [setupConfig, setSetupConfig] = useState(null);
  
  // App State once configured
  const [currentPickIndex, setCurrentPickIndex] = useState(0);
  const [availableProspects, setAvailableProspects] = useState([]);
  const [draftHistory, setDraftHistory] = useState([]);
  const [isDrafting, setIsDrafting] = useState(false);

  // Initialize draft based on configuration
  useEffect(() => {
    if (setupConfig) {
      setAvailableProspects(setupConfig.prospects);
      setCurrentPickIndex(0);
      setDraftHistory([]);
    }
  }, [setupConfig]);

  // CPU Auto Pick Logic
  useEffect(() => {
    if (!setupConfig || currentPickIndex >= setupConfig.draftOrder.length) return;

    const currentTeam = setupConfig.draftOrder[currentPickIndex];
    
    if (currentTeam.abbr !== setupConfig.userTeam && !isDrafting) {
      setIsDrafting(true);
      
      const timer = setTimeout(() => {
        const selectedProspect = getCpuPick(availableProspects, currentTeam);
        if (selectedProspect) {
          handleMakePick(selectedProspect.id);
        }
        setIsDrafting(false);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [currentPickIndex, setupConfig, availableProspects, isDrafting]);

  const handleMakePick = (playerId) => {
    const player = availableProspects.find(p => p.id === playerId);
    const team = setupConfig.draftOrder[currentPickIndex];

    setDraftHistory(prev => [...prev, { pick: currentPickIndex + 1, team, player }]);
    setAvailableProspects(prev => prev.filter(p => p.id !== playerId));
    setCurrentPickIndex(prev => prev + 1);
  };

  const onUserDraftPick = (playerId) => {
    const currentTeam = setupConfig.draftOrder[currentPickIndex];
    if (currentTeam.abbr !== setupConfig.userTeam || isDrafting) return;
    handleMakePick(playerId);
  };

  const getPositionClass = (pos) => {
    if (["QB"].includes(pos)) return "pos-QB";
    if (["WR", "TE", "RB"].includes(pos)) return "pos-WR";
    if (["OT", "IOL"].includes(pos)) return "pos-OT";
    if (["EDGE", "DT", "LB", "CB", "S"].includes(pos)) return "pos-EDGE";
    return "";
  };

  if (!setupConfig) {
    return (
      <div className="app-container">
        <SetupWizard onComplete={(config) => setSetupConfig(config)} />
      </div>
    );
  }

  const { draftOrder, userTeam } = setupConfig;
  const isDraftComplete = currentPickIndex >= draftOrder.length;
  const currentTeamOnClock = isDraftComplete ? null : draftOrder[currentPickIndex];
  const isUserTurn = currentTeamOnClock?.abbr === userTeam;

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-brand">
          <h1>NFL Mock Draft</h1>
        </div>
        <div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Você controla: </span>
          <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span>{draftOrder.find(t => t.abbr === userTeam)?.logo}</span>
            <strong>{userTeam}</strong>
          </div>
          <button className="btn btn-outline" onClick={() => window.location.reload()}>
            Reiniciar
          </button>
        </div>
      </header>

      <div className="main-content">
        <div className="draft-board">
          {!isDraftComplete && (
            <div className="on-the-clock-banner">
              <div className="otc-info">
                <h2>On The Clock</h2>
                <div className="otc-team-name">{currentTeamOnClock.team}</div>
                <div style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Pick {currentPickIndex + 1} of {draftOrder.length}
                </div>
              </div>
              <div className="otc-logo">{currentTeamOnClock.logo}</div>
            </div>
          )}

          {isDraftComplete && (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--accent-primary)' }}>Draft Concluído!</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Excelente trabalho gerenciando a equipe.</p>
            </div>
          )}

          {!isDraftComplete && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.5rem' }}>Prospect Board</h3>
                {isUserTurn && <strong style={{ color: 'var(--success)' }}>É a sua vez de escolher!</strong>}
                {!isUserTurn && <span style={{ color: 'var(--warning)' }}>Aguardando escolha da CPU...</span>}
              </div>

              <div className="prospects-container">
                {availableProspects.slice(0, 50).map((prospect) => (
                  <div key={prospect.id} className="glass-panel prospect-card">
                    <div className="prospect-info">
                      <div className="prospect-rank">#{prospect.rank}</div>
                      <div className="prospect-details">
                        <div style={{display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '0.2rem'}}>
                          <h3>{prospect.name}</h3>
                          {/* Highlight if player fits a team need during user's turn */}
                          {isUserTurn && currentTeamOnClock?.needs?.includes(prospect.position) && (
                            <span style={{ fontSize: '0.7rem', background: 'var(--success)', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                              NEED
                            </span>
                          )}
                        </div>
                        <div className="prospect-meta">
                          <span className={`pos-badge ${getPositionClass(prospect.position)}`}>
                            {prospect.position}
                          </span>
                          <span>|</span>
                          <span>{prospect.school}</span>
                          <span>|</span>
                          <span>Grade: {prospect.grade}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      className="btn btn-primary"
                      disabled={!isUserTurn}
                      onClick={() => onUserDraftPick(prospect.id)}
                      style={{ opacity: !isUserTurn ? 0.5 : 1, cursor: !isUserTurn ? 'not-allowed' : 'pointer' }}
                    >
                      Draft
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            Draft Log
          </h3>
          <div className="draft-log">
            {draftHistory.map((pickData) => (
              <div 
                key={pickData.pick} 
                className={`log-item ${pickData.team.abbr === userTeam ? 'active' : ''}`}
              >
                <div className="log-pick-num">{String(pickData.pick).padStart(2, '0')}</div>
                <div className="log-team">{pickData.team.logo}</div>
                <div className="log-player">
                  <h4>{pickData.player.name}</h4>
                  <span>{pickData.player.position} - {pickData.player.school}</span>
                </div>
              </div>
            ))}
            
            {!isDraftComplete && draftOrder.slice(currentPickIndex, currentPickIndex + 8).map((t, idx) => (
              <div key={`future-${idx}`} className="log-item" style={{ opacity: 0.4 }}>
                <div className="log-pick-num">{String(currentPickIndex + idx + 1).padStart(2, '0')}</div>
                <div className="log-team">{t.logo}</div>
                <div className="log-player" style={{display: 'flex', flexDirection: 'column'}}>
                  <h4>Aguardando...</h4>
                  <span style={{fontSize: '0.7rem', color: 'var(--accent-primary)'}}>
                    Needs: {t.needs && t.needs.join(', ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
