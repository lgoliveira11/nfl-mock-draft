import { useState, useEffect, useRef, useMemo } from 'react';
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
  const [expandedLogPicks, setExpandedLogPicks] = useState([]);
  const [activeProspectFilter, setActiveProspectFilter] = useState('TODOS');
  const [selectedLogRound, setSelectedLogRound] = useState(1);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const currentPickRef = useRef(null);
  
  const ATAQUE_POS = ['QB', 'RB', 'WR', 'TE', 'OT', 'IOL'];
  const DEFESA_POS = ['EDGE', 'IDL', 'LB', 'CB', 'S'];
  const ST_POS = ['K', 'P'];
  const arraysEqual = (a, b) => a.length === b.length && a.every(val => b.includes(val));

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
          const teamDraftedPlayers = draftHistory.filter(h => h.team.abbr === currentTeam.abbr);
          const selectedProspect = getCpuPick(cpuProspects, currentTeam, teamDraftedPlayers);
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

  // Auto-expand current pick e ajustar round atual no log
  useEffect(() => {
    if (!isDraftComplete && setupConfig) {
      const currentPick = currentPickIndex + 1;
      setExpandedLogPicks(prev => prev.includes(currentPick) ? prev : [...prev, currentPick]);
      
      const currentPickData = setupConfig.draftOrder[currentPickIndex];
      if (currentPickData && currentPickData.round) {
        setSelectedLogRound(currentPickData.round);
      }
    }
  }, [currentPickIndex, isDraftComplete, setupConfig]);
  const displayedProspects = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    return availableProspects.filter(p => {
      const matchesPos = selectedPositions.length === 0 || selectedPositions.includes(p.position);
      const matchesSearch = searchLower ? p.name.toLowerCase().includes(searchLower) : true;
      return matchesPos && matchesSearch;
    });
  }, [availableProspects, selectedPositions, searchQuery]);

  // Needs dinâmicas: remove posições que o time já selecionou
  const activeNeeds = useMemo(() => {
    if (!currentTeamOnClock || !currentTeamOnClock.needs) return [];
    const teamDraftedPositions = draftHistory
      .filter(h => h.team.abbr === currentTeamOnClock.abbr)
      .map(h => h.player.position);
    return currentTeamOnClock.needs.filter(pos => !teamDraftedPositions.includes(pos));
  }, [currentTeamOnClock, draftHistory]);

  const fulfilledNeeds = useMemo(() => {
    if (!currentTeamOnClock || !currentTeamOnClock.needs) return [];
    const teamDraftedPositions = draftHistory
      .filter(h => h.team.abbr === currentTeamOnClock.abbr)
      .map(h => h.player.position);
    return currentTeamOnClock.needs.filter(pos => teamDraftedPositions.includes(pos));
  }, [currentTeamOnClock, draftHistory]);

  // Sincroniza o pre-filtro NEEDS se o time mudar ou se uma need for preenchida
  useEffect(() => {
    if (activeProspectFilter === 'NEEDS' && activeNeeds.length > 0) {
      setSelectedPositions(activeNeeds);
    } else if (activeProspectFilter === 'NEEDS' && activeNeeds.length === 0) {
      setActiveProspectFilter('TODOS');
      setSelectedPositions([]);
    }
  }, [activeNeeds, activeProspectFilter]);

  if (!setupConfig) {
    return (
      <div className="app-container">
        <SetupPage onComplete={(config) => setSetupConfig(config)} />
      </div>
    );
  }

  const { draftOrder, userTeams } = setupConfig;

  const availablePositions = Array.from(new Set(availableProspects.map(p => p.position))).sort();

  const handlePreFilterClick = (filterName) => {
    setActiveProspectFilter(filterName);
    if (filterName === 'TODOS') setSelectedPositions([]);
    else if (filterName === 'NEEDS') setSelectedPositions(activeNeeds);
    else if (filterName === 'ATAQUE') setSelectedPositions([...ATAQUE_POS]);
    else if (filterName === 'DEFESA') setSelectedPositions([...DEFESA_POS]);
    else if (filterName === 'S/T') setSelectedPositions([...ST_POS]);
  };

  const handlePositionToggle = (pos) => {
    setSelectedPositions(prev => {
      const newPos = prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos];
      
      if (newPos.length === 0) setActiveProspectFilter('TODOS');
      else if (arraysEqual(newPos, ATAQUE_POS)) setActiveProspectFilter('ATAQUE');
      else if (arraysEqual(newPos, DEFESA_POS)) setActiveProspectFilter('DEFESA');
      else if (arraysEqual(newPos, ST_POS)) setActiveProspectFilter('S/T');
      else if (activeNeeds.length > 0 && arraysEqual(newPos, activeNeeds)) setActiveProspectFilter('NEEDS');
      else setActiveProspectFilter('CUSTOM');
      
      return newPos;
    });
  };
  


  const handleLogPositionToggle = (pos) => {
    setLogSelectedPositions(prev => 
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    );
  };

  const displayedLog = (draftOrder || []).filter(pick => {
    const isPast = (pick.pick - 1) < currentPickIndex;
    const pastPick = isPast ? draftHistory.find(h => h.pick === pick.pick) : null;
    
    const matchesTeam = logTeamFilter === 'ALL' || pick.abbr === logTeamFilter;
    const matchesSearch = !logSearchQuery || (pastPick && pastPick.player.name.toLowerCase().includes(logSearchQuery.toLowerCase()));
    
    let matchesPos = logSelectedPositions.length === 0;
    if (!matchesPos) {
      if (isPast && pastPick) {
        matchesPos = logSelectedPositions.includes(pastPick.player.position);
      } else {
        matchesPos = pick.needs && pick.needs.some(n => logSelectedPositions.includes(n));
      }
    }

    const matchesRound = pick.round === selectedLogRound;

    return matchesTeam && matchesSearch && matchesPos && matchesRound;
  });

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-brand">
          <h1>NFL Mock Draft</h1>
        </div>
        <div className="header-controls" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="speed-control">
            <select 
              value={draftSpeed} 
              onChange={(e) => setDraftSpeed(e.target.value)}
            >
              <option value="slow">Lento</option>
              <option value="normal">Normal</option>
              <option value="fast">Rápido</option>
              <option value="instant">Instantâneo</option>
            </select>
          </div>
          <button className="btn btn-outline" onClick={() => window.location.reload()}>
            Reiniciar
          </button>
          <a href="/tracker" className="btn btn-outline" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <i className="fas fa-chart-bar"></i> Tracker
          </a>
        </div>
      </header>

      <div className="main-content redesigned">


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

        {!isDraftComplete && currentTeamOnClock && (
          <div className="otc-banner-container">
            <div className="tracker-otc-banner">
              <div className="otc-left">
                <span className="otc-label">ON THE CLOCK</span>
                <img src={currentTeamOnClock.logo} alt={currentTeamOnClock.abbr} className="otc-logo" />
                <div className="otc-info">
                  <div className="otc-team-name">{currentTeamOnClock.abbr}</div>
                  <div className="otc-team-full hide-on-mobile">{currentTeamOnClock.name}</div>
                </div>
              </div>

              <div className="otc-center hide-on-mobile">
                <div className="otc-needs-row">
                  {currentTeamOnClock.needs && currentTeamOnClock.needs.slice(0, 5).map(need => (
                    <span key={need} className="pos-badge-minimal tiny-badge">{need}</span>
                  ))}
                </div>
              </div>

              <div className="otc-right">
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <button className="btn-trade-register" onClick={() => setShowTradeModal(true)}>
                    <i className="fas fa-exchange-alt"></i> TROCA
                  </button>
                  <div className="otc-pick-info">
                    <span className="otc-pick-label">PICK {currentPickIndex + 1}</span>
                    <div className="otc-round">ROUND {currentTeamOnClock.round}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isDraftComplete && (
          <div className="layout-grid">
            {/* LEFT COLUMN: DRAFT LOG */}
            <div className={`sidebar left-log tab-content ${activeTab === 'history' ? 'active' : 'hidden'}`}>

              
              <div className="filters-container">
                <div className="round-selector" style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', overflowX: 'auto', paddingBottom: '0.4rem' }}>
                  {Array.from(new Set((setupConfig?.draftOrder || []).map(p => p.round))).sort((a,b) => a-b).map(round => (
                    <button 
                      key={round}
                      className={`pill-btn ${selectedLogRound === round ? 'active' : ''}`}
                      onClick={() => setSelectedLogRound(round)}
                      style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem' }}
                    >
                      ROUND {round}
                    </button>
                  ))}
                </div>
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

                     const isExpanded = expandedLogPicks.includes(t.pick);
                     const toggleExpand = () => {
                       setExpandedLogPicks(prev => prev.includes(t.pick) ? prev.filter(p => p !== t.pick) : [...prev, t.pick]);
                     };
                     
                     const teamPastPicks = draftHistory.filter(h => h.team.abbr === t.abbr);
                     const teamFuturePicks = setupConfig.draftOrder.map((teamObj, idx) => ({team: teamObj, pick: idx + 1})).filter(p => p.team.abbr === t.abbr && p.pick > currentPickIndex + 1);
                     const isTeamOnClock = currentTeamOnClock && currentTeamOnClock.abbr === t.abbr;

                     return (
                       <div key={t.pick} className={`log-item-container ${highlightClass}`}>
                         <div 
                           ref={isCurrent ? currentPickRef : null}
                           className={`log-item log-item-horizontal`}
                           style={{ opacity, cursor: 'pointer' }}
                           onClick={toggleExpand}
                         >
                           <div className="log-left" style={{ flex: 1 }}>
                             <div className="log-pick-num">{String(t.pick).padStart(2, '0')}</div>
                             <div className="log-team"><img src={t.logo} alt="logo" /></div>
                             <div className="log-team-abbr" style={{ fontWeight: 800, minWidth: '40px' }}>{t.abbr}</div>
                             <div className={`log-player-name ${isCurrent ? 'is-current' : ''}`}>
                               {isPast && pastPick ? pastPick.player.name : (isCurrent ? 'ON THE CLOCK' : '')}
                             </div>
                           </div>
                           <div className="log-right" style={{ gap: '1rem' }}>
                             <div className="log-needs-badges" style={{ flexWrap: 'nowrap' }}>
                               {isPast && pastPick ? (
                                 <span className={`pos-badge-minimal ${getPositionClass(pastPick.player.position)}`}>
                                   {pastPick.player.position}
                                 </span>
                               ) : (
                                 <span className="log-needs-text" style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                                   {t.needs && t.needs.slice(0, 4).join('   ')}
                                 </span>
                               )}
                             </div>
                             <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                 <polyline points="6 9 12 15 18 9"></polyline>
                               </svg>
                             </div>
                           </div>
                         </div>

                         {isExpanded && (
                           <div className="log-item-body">
                             <div className="team-picks-grid">
                               {teamPastPicks.map(tp => (
                                 <div key={tp.pick} className="team-pick-item">
                                   <span className="tp-num">{String(tp.pick).padStart(2, '0')}</span>
                                   <span className={`pos-badge-minimal ${getPositionClass(tp.player.position)}`}>{tp.player.position}</span>
                                   <span className="tp-name">{tp.player.name}</span>
                                 </div>
                               ))}
                               {isTeamOnClock && (
                                 <div className="team-pick-item is-current-pick-item">
                                   <span className="tp-num">{String(currentPickIndex + 1).padStart(2, '0')}</span>
                                   <span className="text-on-the-clock">ON THE CLOCK</span>
                                 </div>
                               )}
                             </div>
                             {teamFuturePicks.length > 0 && (
                               <div className="future-picks-row">
                                 <strong>Próximas escolhas:</strong> {teamFuturePicks.map(fp => fp.pick).join(', ')}
                               </div>
                             )}
                           </div>
                         )}
                       </div>
                     );
                  })
                }
              </div>
            </div>

            <div className={`draft-board right-board tab-content ${activeTab === 'prospects' ? 'active' : 'hidden'}`}>

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
                
                <div className="pill-filters" style={{ flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  <button 
                    className={`pill-btn ${activeProspectFilter === 'TODOS' ? 'active' : ''}`}
                    onClick={() => handlePreFilterClick('TODOS')}
                  >
                    TODOS
                  </button>
                  <button 
                    className={`pill-btn ${activeProspectFilter === 'NEEDS' ? 'active-need' : ''}`}
                    onClick={() => handlePreFilterClick('NEEDS')}
                    disabled={activeNeeds.length === 0}
                  >
                    NEEDS
                  </button>
                  <button 
                    className={`pill-btn ${activeProspectFilter === 'ATAQUE' ? 'active-pos' : ''}`}
                    onClick={() => handlePreFilterClick('ATAQUE')}
                  >
                    ATAQUE
                  </button>
                  <button 
                    className={`pill-btn ${activeProspectFilter === 'DEFESA' ? 'active-pos-def' : ''}`}
                    onClick={() => handlePreFilterClick('DEFESA')}
                  >
                    DEFESA
                  </button>
                  <button 
                    className={`pill-btn ${activeProspectFilter === 'S/T' ? 'active-pos-st' : ''}`}
                    onClick={() => handlePreFilterClick('S/T')}
                  >
                    S/T
                  </button>
                  <button 
                    className={`pill-btn ${activeProspectFilter === 'CUSTOM' ? 'active' : ''}`}
                    onClick={() => handlePreFilterClick('CUSTOM')}
                  >
                    CUSTOM
                  </button>
                </div>
                
                <div className="pill-filters pos-toggles" style={{ flexWrap: 'wrap' }}>
                  {ATAQUE_POS.map(pos => {
                    const isFulfilled = fulfilledNeeds.includes(pos);
                    const isSelected = selectedPositions.includes(pos);
                    return (
                      <button 
                        key={pos}
                        className={`pill-btn ${isSelected ? 'active-pos' : ''} ${isFulfilled ? 'fulfilled-need' : ''}`}
                        onClick={() => handlePositionToggle(pos)}
                      >
                        {pos}
                      </button>
                    );
                  })}
                  {DEFESA_POS.map(pos => {
                    const isFulfilled = fulfilledNeeds.includes(pos);
                    const isSelected = selectedPositions.includes(pos);
                    return (
                      <button 
                        key={pos}
                        className={`pill-btn ${isSelected ? 'active-pos-def' : ''} ${isFulfilled ? 'fulfilled-need' : ''}`}
                        onClick={() => handlePositionToggle(pos)}
                      >
                        {pos}
                      </button>
                    );
                  })}
                  {ST_POS.map(pos => {
                    const isFulfilled = fulfilledNeeds.includes(pos);
                    const isSelected = selectedPositions.includes(pos);
                    return (
                      <button 
                        key={pos}
                        className={`pill-btn ${isSelected ? 'active-pos-st' : ''} ${isFulfilled ? 'fulfilled-need' : ''}`}
                        onClick={() => handlePositionToggle(pos)}
                      >
                        {pos}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="prospects-container redesigned-cards">
                {displayedProspects.slice(0, 50).map((prospect) => (
                  <div key={prospect.id} className="prospect-card-horizontal">
                    <div className="card-left">
                      <div className="prospect-rank">{String(prospect.rank).padStart(2, '0')}</div>
                      <div className="prospect-pos-badge">
                        <span className={`pos-badge-minimal ${getPositionClass(prospect.position)}`}>
                          {prospect.position}
                        </span>
                      </div>
                      <div className="prospect-details-v">
                        <h3 className="prospect-name-row" style={{ margin: 0 }}>
                          <span className="player-name">{prospect.name}</span>
                        </h3>
                      </div>
                    </div>
                    
                    <div className="card-right">
                      {activeNeeds.includes(prospect.position) && (
                        <span className="team-need-badge">NEED</span>
                      )}
                      <button 
                        className="btn-icon-only"
                        style={{ background: 'none', border: 'none', padding: '0 0.5rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                        onClick={() => setSelectedProfileId(prospect.id)}
                      >
                        <i className="fas fa-address-card" style={{ fontSize: '1.2rem' }}></i>
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

      {showTradeModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header-bar">
              <span className="modal-brand">TRADE CENTER</span>
              <button className="btn-icon" onClick={() => setShowTradeModal(false)}>✕</button>
            </div>
            <div className="profile-scroll-content" style={{ padding: '2rem' }}>
              <h2 style={{ marginBottom: '1rem' }}>Registrar Troca</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Esta funcionalidade permite registrar trocas de picks entre times.
              </p>
              
              <div className="glass-panel-inner" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label>Time A</label>
                  <select className="post-draft-select">
                    <option>{currentTeamOnClock?.abbr}</option>
                    {/* Mais times seriam listados aqui */}
                  </select>
                </div>
                <div className="form-group">
                  <label>Time B</label>
                  <select className="post-draft-select">
                    <option>Selecionar time...</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Picks Envolvidas</label>
                  <input type="text" className="search-bar input" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '4px', color: 'white' }} placeholder="Ex: 32, 64" />
                </div>
                <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowTradeModal(false)}>
                  Confirmar Troca
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
