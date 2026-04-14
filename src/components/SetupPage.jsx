import { useState, useEffect } from 'react';
import { draftOrder as defaultDraftOrder } from '../data/mockData';
import bigBoardData from '../data/bigboard.json';
import pffBoardData from '../data/pff_board.json';
import TeamNeedsModal from './TeamNeedsModal';

const BOARD_OPTIONS = [
  { id: 'otc', name: 'OTC - Brasil', data: bigBoardData },
  { id: 'consensus', name: 'Consensus', data: pffBoardData }
];

const SPEED_OPTIONS = [
  { id: 'slow', name: 'Lenta' },
  { id: 'normal', name: 'Normal' },
  { id: 'fast', name: 'Rápida' },
  { id: 'instant', name: 'Instantânea' }
];

export default function SetupPage({ onComplete }) {
  const getInitialState = (key, defaultValue) => {
    const saved = localStorage.getItem('nfl_mock_draft_setup');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed[key] !== undefined ? parsed[key] : defaultValue;
      } catch (e) {
        return defaultValue;
      }
    }
    return defaultValue;
  };

  const [bpaBoardId, setBpaBoardId] = useState(() => getInitialState('bpaBoardId', 'otc'));
  const [cpuBoardId, setCpuBoardId] = useState(() => getInitialState('cpuBoardId', 'consensus'));
  const [draftSpeed, setDraftSpeed] = useState(() => getInitialState('draftSpeed', 'normal'));
  const [numRounds, setNumRounds] = useState(() => getInitialState('numRounds', 3));
  const [userTeams, setUserTeams] = useState(() => getInitialState('userTeams', []));
  const [draftOrder, setDraftOrder] = useState(() => getInitialState('draftOrder', defaultDraftOrder));
  const [editingTeam, setEditingTeam] = useState(null);

  // Save to localStorage on changes
  useEffect(() => {
    const setupData = {
      bpaBoardId,
      cpuBoardId,
      draftSpeed,
      numRounds,
      userTeams,
      draftOrder
    };
    localStorage.setItem('nfl_mock_draft_setup', JSON.stringify(setupData));
  }, [bpaBoardId, cpuBoardId, draftSpeed, numRounds, userTeams, draftOrder]);

  // Normalize board data (ensure 'grade' exists)
  const normalizeBoard = (data) => {
    return data.map(p => ({
      ...p,
      grade: p.grade || p.pffGrade || 0,
    }));
  };

  const handleStartDraft = () => {
    if (userTeams.length === 0) return;

    const bpaData = normalizeBoard(BOARD_OPTIONS.find(b => b.id === bpaBoardId).data);
    const cpuData = normalizeBoard(BOARD_OPTIONS.find(b => b.id === cpuBoardId).data);

    // Filter draft order by rounds
    const filteredOrder = draftOrder.filter(pick => pick.round <= numRounds);

    onComplete({
      userTeams,
      prospects: bpaData,
      cpuProspects: cpuData, // Pass the CPU specific board
      draftOrder: filteredOrder,
      numRounds,
      draftSpeed
    });
  };

  const handleTeamNeedSave = (newNeeds) => {
    setDraftOrder(prev => prev.map(t => 
      t.abbr === editingTeam.abbr ? { ...t, needs: newNeeds } : t
    ));
    setEditingTeam(null);
  };

  const uniqueTeams = Array.from(new Set(draftOrder.map(t => t.abbr)))
    .map(abbr => draftOrder.find(t => t.abbr === abbr))
    .sort((a, b) => a.team.localeCompare(b.team));

  return (
    <div className="setup-page">
      <header className="setup-header-bar">
        <h1 className="setup-title">Mock Draft Setup</h1>
        <button 
          className="btn btn-primary start-btn" 
          disabled={userTeams.length === 0}
          onClick={handleStartDraft}
        >
          Iniciar Draft!
        </button>
      </header>

      <div className="setup-grid">
        {/* LEFT COLUMN: CONFIG & NEEDS */}
        <div className="setup-col config-column">
          <section className="setup-section glass-panel">
            <h3 className="section-title">Configuração</h3>
            <div className="config-form">
              <div className="form-group">
                <label>Rodadas</label>
                <select value={numRounds} onChange={(e) => setNumRounds(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5, 6, 7].map(r => (
                    <option key={r} value={r}>{r} Rodada{r > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Velocidade</label>
                <select value={draftSpeed} onChange={(e) => setDraftSpeed(e.target.value)}>
                  {SPEED_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>BPA - Big Board</label>
                <select value={bpaBoardId} onChange={(e) => setBpaBoardId(e.target.value)}>
                  {BOARD_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Seleção Automática - Big Board</label>
                <select value={cpuBoardId} onChange={(e) => setCpuBoardId(e.target.value)}>
                  {BOARD_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="setup-section glass-panel needs-section">
            <h3 className="section-title">Carência das equipes</h3>
            <div className="teams-needs-list custom-scrollbar">
              <div className="needs-grid-inner">
                {uniqueTeams.map(team => (
                  <div key={team.abbr} className="compact-need-item">
                    <div className="team-info">
                      <img src={team.logo} alt={team.abbr} />
                      <strong>{team.abbr}</strong>
                    </div>
                    <div className="needs-display">
                      {team.needs && team.needs.length > 0 ? team.needs.join(', ') : 'Nenhuma'}
                    </div>
                    <button className="btn-icon mini" onClick={() => setEditingTeam(team)}>...</button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: TEAM SELECTION */}
        <div className="setup-col teams-column glass-panel">
          <h3 className="section-title">SELECIONE OS TIMES</h3>
          <div className="team-selection-header">
            <button className="btn btn-outline btn-sm" onClick={() => setUserTeams(uniqueTeams.map(t => t.abbr))}>
              Selecionar Todos
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setUserTeams([])}>
              Limpar Seleção
            </button>
          </div>
          
          <div className="teams-selection-grid custom-scrollbar">
            {uniqueTeams.map(team => (
              <div 
                key={team.abbr} 
                className={`team-selection-card ${userTeams.includes(team.abbr) ? 'selected' : ''}`}
                onClick={() => setUserTeams(prev => prev.includes(team.abbr) ? prev.filter(t => t !== team.abbr) : [...prev, team.abbr])}
              >
                <img src={team.logo} alt={team.abbr} />
                <span>{team.abbr}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {editingTeam && (
        <TeamNeedsModal 
          team={editingTeam} 
          onClose={() => setEditingTeam(null)} 
          onSave={handleTeamNeedSave} 
        />
      )}
    </div>
  );
}
