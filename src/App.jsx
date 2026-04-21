import { useState, useEffect, useRef } from 'react';
import SetupPage from './components/SetupPage';
import PlayerProfileModal from './components/PlayerProfileModal';
import { getCpuPick } from './utils/draftEngine';
import { playerDatabase } from './data/mockData';
import './index.css';

function App() {
  const [setupConfig, setSetupConfig] = useState(null);
  
  // App State once configured
  const [currentPickIndex, setCurrentPickIndex] = useState(0);
  const [availableProspects, setAvailableProspects] = useState([]);
  const [cpuProspects, setCpuProspects] = useState([]); // Board for CPU logic
  const [draftHistory, setDraftHistory] = useState([]);
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftSpeed, setDraftSpeed] = useState('normal');
  const [selectedPositions, setSelectedPositions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [postDraftTeamFilter, setPostDraftTeamFilter] = useState("ALL");
  const [logTeamFilter, setLogTeamFilter] = useState("ALL");
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [logSelectedPositions, setLogSelectedPositions] = useState([]);
  const [activeTab, setActiveTab] = useState('prospects');
  const currentPickRef = useRef(null);

  // Initialize draft based on configuration
  useEffect(() => {
    if (setupConfig) {
      setAvailableProspects(setupConfig.prospects);
      setCpuProspects(setupConfig.cpuProspects || setupConfig.prospects);
      setDraftSpeed(setupConfig.draftSpeed || 'normal');
      setCurrentPickIndex(0);
      setDraftHistory([]);
    }
  }, [setupConfig]);

  // CPU Auto Pick Logic
  useEffect(() => {
    if (!setupConfig || currentPickIndex >= setupConfig.draftOrder.length || availableProspects.length === 0) return;

    const currentTeam = setupConfig.draftOrder[currentPickIndex];
    
    if (!setupConfig.userTeams.includes(currentTeam.abbr)) {
      if (draftSpeed === 'instant') {
        let simPickIndex = currentPickIndex;
        let simAvailableProps = [...availableProspects];
        let simCpuProps = [...cpuProspects];
        const newHistoryPicks = [];

        while (simPickIndex < setupConfig.draftOrder.length) {
          const simTeam = setupConfig.draftOrder[simPickIndex];
          if (setupConfig.userTeams.includes(simTeam.abbr)) break;
          
          const selectedProspect = getCpuPick(simCpuProps, simTeam);
          if (!selectedProspect) break;
          
          newHistoryPicks.push({ pick: simPickIndex + 1, team: simTeam, player: selectedProspect });
          simAvailableProps = simAvailableProps.filter(p => p.id !== selectedProspect.id);
          simCpuProps = simCpuProps.filter(p => p.id !== selectedProspect.id);
          simPickIndex++;
        }

        setDraftHistory(prev => [...prev, ...newHistoryPicks]);
        setAvailableProspects(simAvailableProps);
        setCpuProspects(simCpuProps);
        setCurrentPickIndex(simPickIndex);
      } else {
        const speedMap = { slow: 3000, normal: 1500, fast: 500 };
        const timer = setTimeout(() => {
          const selectedProspect = getCpuPick(cpuProspects, currentTeam);
          if (selectedProspect) {
            handleMakePick(selectedProspect.id);
          }
        }, speedMap[draftSpeed]);
        
        return () => clearTimeout(timer);
      }
    }
  }, [currentPickIndex, setupConfig, availableProspects, draftSpeed]);

  const handleMakePick = (playerId) => {
    const player = availableProspects.find(p => p.id === playerId);
    const team = setupConfig.draftOrder[currentPickIndex];

    setDraftHistory(prev => [...prev, { pick: currentPickIndex + 1, team, player }]);
    setAvailableProspects(prev => prev.filter(p => p.id !== playerId));
    setCpuProspects(prev => prev.filter(p => p.id !== playerId));
    setCurrentPickIndex(prev => prev + 1);
  };

  const onUserDraftPick = (playerId) => {
    const currentTeam = setupConfig.draftOrder[currentPickIndex];
    if (!setupConfig.userTeams.includes(currentTeam.abbr) || isDrafting) return;
    handleMakePick(playerId);
  };

  const getPositionClass = (pos) => {
    if (["QB"].includes(pos)) return "pos-QB";
    if (["WR", "TE", "RB"].includes(pos)) return "pos-WR";
    if (["OT", "IOL"].includes(pos)) return "pos-OT";
    if (["EDGE", "DT", "LB", "CB", "S"].includes(pos)) return "pos-EDGE";
    return "";
  };

  const isDraftComplete = setupConfig ? (currentPickIndex >= setupConfig.draftOrder.length || availableProspects.length === 0) : false;
  const currentTeamOnClock = (setupConfig && !isDraftComplete) ? setupConfig.draftOrder[currentPickIndex] : null;
  const isUserTurn = (setupConfig && currentTeamOnClock) ? setupConfig.userTeams.includes(currentTeamOnClock.abbr) : false;

  useEffect(() => {
    if (!isDraftComplete && setupConfig) {
      if (isUserTurn) {
        setActiveTab('prospects');
      } else {
        setActiveTab('history');
      }
    }
  }, [isUserTurn, isDraftComplete, setupConfig]);
  
  // Auto-scroll to current pick in log
  useEffect(() => {
    if (currentPickRef.current) {
      currentPickRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, [currentPickIndex, activeTab]);

  if (!setupConfig) {
    return (
      <div className="app-container">
        <SetupPage onComplete={(config) => setSetupConfig(config)} />
      </div>
    );
  }

  const { draftOrder, userTeams } = setupConfig;

  const availablePositions = Array.from(new Set(availableProspects.map(p => p.position))).sort();
  
  const handlePositionToggle = (pos) => {
    setSelectedPositions(prev => 
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    );
  };
  
  const applyTeamNeedsFilter = () => {
    if (currentTeamOnClock && currentTeamOnClock.needs) {
      setSelectedPositions(currentTeamOnClock.needs);
    }
  };
  
  const displayedProspects = availableProspects.filter(p => {
    const matchesPos = selectedPositions.length === 0 || selectedPositions.includes(p.position);
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPos && matchesSearch;
  });

  const handleLogPositionToggle = (pos) => {
    setLogSelectedPositions(prev => 
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    );
  };

  const displayedLog = (draftOrder || []).filter(pick => {
    const isPast = (pick.pick - 1) < currentPickIndex;
    const pastPick = isPast ? draftHistory.find(h => h.pick === pick.pick) : null;
    
    // Team Filter: ALL or Current Team on Clock
    const currentTeamAbbr = currentTeamOnClock?.abbr || "";
    const matchesTeam = logTeamFilter === 'ALL' || pick.abbr === logTeamFilter;
    
    // Name Search (Only applies if player is picked)
    const matchesSearch = !logSearchQuery || (pastPick && pastPick.player.name.toLowerCase().includes(logSearchQuery.toLowerCase()));
    
    // Position Filter
    let matchesPos = logSelectedPositions.length === 0;
    if (!matchesPos) {
      if (isPast && pastPick) {
        matchesPos = logSelectedPositions.includes(pastPick.player.position);
      } else {
        // If not picked yet, check against team needs
        matchesPos = pick.needs && pick.needs.some(n => logSelectedPositions.includes(n));
      }
    }

    return matchesTeam && matchesSearch && matchesPos;
  });

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-brand">
          <h1>NFL Mock Draft</h1>
        </div>
        <div className="user-info">
          <span style={{ color: 'var(--text-secondary)' }}>Você controla: </span>
          <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {userTeams.length > 5 ? (
              <strong>{userTeams.length} times</strong>
            ) : (
              userTeams.map(teamAbbr => {
                const team = draftOrder.find(t => t.abbr === teamAbbr);
                return team ? (
                  <div key={teamAbbr} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <img src={team.logo} alt={teamAbbr} title={teamAbbr} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                    <strong>{teamAbbr}</strong>
                  </div>
                ) : null;
              })
            )}
          </div>
          <button className="btn btn-outline" onClick={() => window.location.reload()}>
            Reiniciar
          </button>
        </div>
      </header>

      <div className="main-content redesigned">
        {!isDraftComplete && (
          <div className="banner glow-panel">
            <div className="banner-logo">
              <img src={currentTeamOnClock.logo} alt={currentTeamOnClock.abbr} />
            </div>
            <div className="banner-text">
              <span className="banner-subtitle">ON THE CLOCK</span>
              <h2 className="banner-title">{currentTeamOnClock.team}</h2>
            </div>
          </div>
        )}

        {isDraftComplete && (
          <div className="post-draft-container-full">
            <div className="pd-filter-row">
              <button 
                className={`pd-filter-pill ${postDraftTeamFilter === "ALL" ? 'active' : ''}`}
                onClick={() => setPostDraftTeamFilter("ALL")}
              >
                TODOS
              </button>
              {userTeams.map(abbr => {
                const team = draftOrder.find(t => t.abbr === abbr);
                return (
                  <button 
                    key={abbr} 
                    className={`pd-filter-pill ${postDraftTeamFilter === abbr ? 'active' : ''}`}
                    onClick={() => setPostDraftTeamFilter(abbr)}
                  >
                    <img src={team.logo} alt={abbr} />
                    {abbr}
                  </button>
                );
              })}
            </div>

            <div className="post-draft-export-list">
              {(() => {
                const filteredHistory = draftHistory.filter(pick => postDraftTeamFilter === "ALL" || pick.team.abbr === postDraftTeamFilter);
                const groupedHistory = filteredHistory.reduce((acc, pick) => {
                  const roundNumber = pick.team.round;
                  if (!acc[roundNumber]) acc[roundNumber] = [];
                  acc[roundNumber].push(pick);
                  return acc;
                }, {});

                return Object.keys(groupedHistory).map(roundNum => (
                  <div key={roundNum} className="pd-round-group">
                    <div className="pd-round-header">
                      {roundNum}a Rodada
                    </div>
                    <div className="pd-round-items">
                      {groupedHistory[roundNum].map((pick, idx) => (
                        <div key={pick.pick} className="pd-dense-row">
                          <div className="pd-dense-col pd-pick-number-compact">{pick.pick}</div>
                          <div className="pd-dense-col pd-team-col-compact">
                            <img src={pick.team.logo} alt={pick.team.abbr} />
                            <span>{pick.team.abbr}</span>
                          </div>
                          <div className="pd-dense-col pd-player-col-compact">
                            <strong>{pick.player.name}</strong>
                          </div>
                          <div className="pd-dense-col pd-pos-col-compact">
                            <span className={`pos-badge custom-badge tiny-badge ${getPositionClass(pick.player.position)}`}>
                              {pick.player.position}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {!isDraftComplete && (
          <div className="mobile-tabs">
            <button 
              className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              Histórico
            </button>
            <button 
              className={`tab-btn ${activeTab === 'prospects' ? 'active' : ''}`}
              onClick={() => setActiveTab('prospects')}
            >
              Prospectos
            </button>
          </div>
        )}

        {!isDraftComplete && (
          <div className="layout-grid">
            {/* LEFT COLUMN: DRAFT LOG */}
            <div className={`sidebar left-log tab-content ${activeTab === 'history' ? 'active' : 'hidden'}`}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 className="section-title" style={{ margin: 0 }}>Histórico de Escolhas</h3>
              </div>
              
              <div className="filters-container">
                <div className="search-bar">
                  <input 
                    type="text" 
                    placeholder="Procurar jogador..."
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                  />
                  <span className="search-icon">🔍</span>
                </div>
                
                <div className="pill-filters">
                  <button 
                    className={`pill-btn ${logTeamFilter === 'ALL' ? 'active' : ''}`}
                    onClick={() => { setLogTeamFilter('ALL'); setLogSelectedPositions([]); }}
                  >
                    TODOS
                  </button>
                  
                  {currentTeamOnClock && (
                    <button 
                      className={`pill-btn ${logTeamFilter === currentTeamOnClock.abbr ? 'active-need' : ''}`}
                      onClick={() => {
                        setLogTeamFilter(currentTeamOnClock.abbr);
                        if (currentTeamOnClock.needs) setLogSelectedPositions(currentTeamOnClock.needs);
                      }}
                    >
                      <img src={currentTeamOnClock.logo} alt={currentTeamOnClock.abbr} style={{ width: '16px', height: '16px', marginRight: '4px' }} />
                      {currentTeamOnClock.abbr}
                    </button>
                  )}
                  
                  <div className="pill-separator"></div>

                  {['QB', 'RB', 'WR', 'TE', 'OT', 'IOL', 'EDGE', 'IDL', 'LB', 'CB', 'S'].map(pos => (
                    <button 
                      key={pos}
                      className={`pill-btn ${logSelectedPositions.includes(pos) ? 'active-pos' : ''}`}
                      onClick={() => handleLogPositionToggle(pos)}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              <div className="draft-log">
                {displayedLog.map((t) => {
                     const isPast = (t.pick - 1) < currentPickIndex;
                     const isCurrent = (t.pick - 1) === currentPickIndex;
                     
                     let opacity = isPast ? 1 : (isCurrent ? 1 : 0.4);
                     const pastPick = isPast ? draftHistory.find(h => h.pick === t.pick) : null;
                     const isUserControlled = userTeams.includes(t.abbr);
                     
                     let highlightClass = "";
                     if (isCurrent) highlightClass = "current-pick-highlight";
                     else if (isPast && isUserControlled) highlightClass = "active";

                     return (
                       <div 
                         key={t.pick} 
                         ref={isCurrent ? currentPickRef : null}
                         className={`log-item log-item-horizontal ${highlightClass}`}
                         style={{ opacity }}
                       >
                         <div className="log-left" style={{ flex: 1 }}>
                           <div className="log-pick-num">{String(t.pick).padStart(2, '0')}</div>
                           <div className="log-team"><img src={t.logo} alt="logo" /></div>
                           <div className="log-player-name">
                             {isPast && pastPick ? pastPick.player.name : ""}
                           </div>
                         </div>
                         <div className="log-right" style={{ gap: '1rem' }}>
                           <div className="log-needs-badges" style={{ flexWrap: 'nowrap' }}>
                             {isPast && pastPick ? (
                               <span className={`pos-badge custom-badge tiny-badge ${getPositionClass(pastPick.player.position)}`}>
                                 {pastPick.player.position}
                               </span>
                             ) : (
                               t.needs && t.needs.slice(0, 4).map(n => (
                                 <span key={n} className={`pos-badge custom-badge tiny-badge ${getPositionClass(n)}`}>{n}</span>
                               ))
                             )}
                           </div>
                           
                           {isPast && pastPick && (
                             <button 
                               className="btn-outline-pill mini"
                               style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                               onClick={() => setSelectedProfileId(pastPick.player.id)}
                             >
                               Ver Perfil
                             </button>
                           )}
                         </div>
                       </div>
                     );
                  })
                }
              </div>
            </div>

            {/* RIGHT COLUMN: PROSPECT BOARD */}
            <div className={`draft-board right-board tab-content ${activeTab === 'prospects' ? 'active' : 'hidden'}`}>
              <div className="board-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <h3 className="section-title" style={{ margin: 0 }}>Prospectos</h3>
                  <div className="speed-control">
                    <span>Velocidade CPU:</span>
                    <select 
                      value={draftSpeed} 
                      onChange={(e) => setDraftSpeed(e.target.value)}
                    >
                      <option value="slow">Lenta</option>
                      <option value="normal">Normal</option>
                      <option value="fast">Rápida</option>
                      <option value="instant">Instantânea</option>
                    </select>
                  </div>
                </div>
                <div>
                  {isUserTurn && <strong style={{ color: 'var(--accent-primary)' }}>É a sua vez de escolher!</strong>}
                  {!isUserTurn && <span style={{ color: 'var(--text-muted)' }}>Aguardando escolha da CPU...</span>}
                </div>
              </div>

              <div className="filters-container">
                <div className="search-bar">
                  <input 
                    type="text" 
                    placeholder="Procurar jogador..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <span className="search-icon">🔍</span>
                </div>
                
                <div className="pill-filters">
                  <button 
                    className={`pill-btn ${selectedPositions.length === 0 ? 'active' : ''}`}
                    onClick={() => setSelectedPositions([])}
                  >
                    ALL
                  </button>
                  <button 
                    className={`pill-btn ${currentTeamOnClock?.needs && selectedPositions.join(',') === currentTeamOnClock.needs.join(',') ? 'active-need' : ''}`}
                    onClick={applyTeamNeedsFilter}
                    disabled={!currentTeamOnClock?.needs}
                  >
                    NEED
                  </button>
                  
                  <div className="pill-separator"></div>

                  {['QB', 'RB', 'WR', 'TE', 'OT', 'IOL'].map(pos => (
                    availablePositions.includes(pos) && (
                      <button 
                        key={pos}
                        className={`pill-btn ${selectedPositions.includes(pos) ? 'active-pos' : ''}`}
                        onClick={() => handlePositionToggle(pos)}
                      >
                        {pos}
                      </button>
                    )
                  ))}

                  <div className="pill-separator"></div>

                  {['EDGE', 'IDL', 'LB', 'CB', 'S'].map(pos => (
                    availablePositions.includes(pos) && (
                      <button 
                        key={pos}
                        className={`pill-btn ${selectedPositions.includes(pos) ? 'active-pos' : ''}`}
                        onClick={() => handlePositionToggle(pos)}
                      >
                        {pos}
                      </button>
                    )
                  ))}
                </div>
              </div>

              <div className="prospects-container redesigned-cards">
                {displayedProspects.slice(0, 50).map((prospect) => (
                  <div key={prospect.id} className="prospect-card-horizontal">
                    <div className="card-left">
                      <div className="prospect-rank">{String(prospect.rank).padStart(2, '0')}</div>
                      <div className="prospect-details-v">
                        <h3 className="prospect-name-row">
                          <span className="player-name">{prospect.name}</span>
                          {currentTeamOnClock?.needs?.includes(prospect.position) && (
                            <span className="team-need-badge">NEED</span>
                          )}
                        </h3>
                        <div className="prospect-meta">
                          <span className={`pos-badge custom-badge ${getPositionClass(prospect.position)}`}>
                            {prospect.position}
                          </span>
                          <span className="meta-sep">|</span>
                          <span className="meta-grade">
                            <span className="hide-on-mobile">Grade: </span>
                            {prospect.grade}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="card-right">
                      <button 
                        className="btn-outline-pill btn-profile-compact"
                        onClick={() => setSelectedProfileId(prospect.id)}
                      >
                        <span className="btn-text">Ver Perfil</span>
                        <span className="btn-icon-mobile">≡</span>
                      </button>
                      <button 
                        className="btn-primary-pill btn-draft-compact"
                        disabled={!isUserTurn}
                        onClick={() => onUserDraftPick(prospect.id)}
                      >
                        Draft
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedProfileId && (
        <PlayerProfileModal 
          playerData={{
            ...(availableProspects.find(p => p.id === selectedProfileId) || draftHistory.find(d => d.player.id === selectedProfileId)?.player || {}),
            ...playerDatabase[selectedProfileId]
          }} 
          onClose={() => setSelectedProfileId(null)} 
        />
      )}
    </div>
  );
}

export default App;
