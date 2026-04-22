import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';
import { draftOrder as rawDraftOrder } from './data/mockData';
import bigBoard from './data/bigboard.json';
import pffBoard from './data/pff_board.json';

// ─── Constants ────────────────────────────────────────────────────────────────
const MASTER_PASSWORD = 'nfldraft2025';

const BOARDS = {
  consensus: { label: 'Consensus', data: bigBoard },
  pff: { label: 'PFF', data: pffBoard },
};

// Build unique team list from draft order (preserving logo paths)
const ALL_TEAMS = Object.values(
  rawDraftOrder.reduce((acc, t) => {
    if (!acc[t.abbr]) acc[t.abbr] = { abbr: t.abbr, team: t.team, logo: t.logo };
    return acc;
  }, {})
).sort((a, b) => a.abbr.localeCompare(b.abbr));

const POSITION_COLORS = {
  QB: '#ef4444', RB: '#f97316', WR: '#eab308', TE: '#84cc16',
  OT: '#22c55e', IOL: '#10b981', EDGE: '#06b6d4', IDL: '#3b82f6',
  LB: '#8b5cf6', CB: '#ec4899', S: '#f43f5e', K: '#a78bfa', P: '#a78bfa',
};
function posColor(pos) { return POSITION_COLORS[pos] || '#94a3b8'; }

// ─── Component ────────────────────────────────────────────────────────────────
export default function DraftTracker() {
  // Auth
  const [isMaster, setIsMaster] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginInput, setLoginInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // View toggle
  const [view, setView] = useState('board'); // 'board' | 'picks'

  // Board
  const [selectedBoard, setSelectedBoard] = useState('consensus');

  // picks: { [playerId]: { playerName, position, pickNumber, round, teamAbbr, teamName, teamLogo } }
  const [picks, setPicks] = useState({});

  // trades: [{ id, teamA, teamB, picksAtoB: [nums], picksBtoA: [nums], note }]
  const [trades, setTrades] = useState([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Filters (board view)
  const [posFilter, setPosFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Pick Modal
  const [modalPlayer, setModalPlayer] = useState(null);
  const [modalPickNum, setModalPickNum] = useState('');
  const [modalTeamSearch, setModalTeamSearch] = useState('');
  const [modalTeam, setModalTeam] = useState(null);
  const pickNumRef = useRef(null);

  // Trade Modal
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeTeamA, setTradeTeamA] = useState(null);
  const [tradeTeamB, setTradeTeamB] = useState(null);
  const [tradePicksAtoB, setTradePicksAtoB] = useState(''); // comma-separated
  const [tradePicksBtoA, setTradePicksBtoA] = useState('');
  const [tradeNote, setTradeNote] = useState('');
  const [tradeTeamSearch, setTradeTeamSearch] = useState('');
  const [tradeStep, setTradeStep] = useState(1); // 1=teams, 2=picks

  // ─── Load ─────────────────────────────────────────────────────────────────
  const loadPicks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('draft_picks')
        .select('*')
        .order('pick_number', { ascending: true });

      if (!error && data && data.length > 0) {
        const map = {};
        data.forEach(row => {
          map[row.player_id] = {
            playerName: row.player_name,
            position: row.player_position,
            pickNumber: row.pick_number,
            round: row.round,
            teamAbbr: row.team_abbr,
            teamName: row.team_name,
            teamLogo: row.team_logo,
            boardSource: row.board_source,
          };
        });
        setPicks(map);
        localStorage.setItem('dt_picks_v2', JSON.stringify(map));
        setLastSaved(new Date());
      } else {
        const local = localStorage.getItem('dt_picks_v2');
        if (local) setPicks(JSON.parse(local));
      }
    } catch {
      const local = localStorage.getItem('dt_picks_v2');
      if (local) setPicks(JSON.parse(local));
    }
    // Load trades from localStorage
    const localTrades = localStorage.getItem('dt_trades_v2');
    if (localTrades) setTrades(JSON.parse(localTrades));
    setLoading(false);
  }, []);

  useEffect(() => { loadPicks(); }, [loadPicks]);

  // ─── Auth ──────────────────────────────────────────────────────────────────
  function handleLogin() {
    if (loginInput === MASTER_PASSWORD) {
      setIsMaster(true);
      setShowLogin(false);
      setLoginError('');
      setLoginInput('');
    } else {
      setLoginError('Senha incorreta');
    }
  }

  // ─── Save to cloud ─────────────────────────────────────────────────────────
  async function handleSaveToCloud() {
    if (!isMaster) return;
    setSaving(true);
    try {
      const rows = Object.entries(picks).map(([playerId, p]) => ({
        player_id: playerId,
        player_name: p.playerName,
        player_position: p.position,
        pick_number: p.pickNumber,
        round: p.round || 1,
        team_abbr: p.teamAbbr,
        team_name: p.teamName,
        team_logo: p.teamLogo,
        board_source: p.boardSource || selectedBoard,
      }));

      if (rows.length > 0) {
        const { error } = await supabase
          .from('draft_picks')
          .upsert(rows, { onConflict: 'player_id' });
        if (error) throw error;
      }

      // Remove deleted picks from DB
      const playerIds = Object.keys(picks);
      if (playerIds.length === 0) {
        await supabase.from('draft_picks').delete().neq('player_id', '');
      }

      setLastSaved(new Date());
    } catch (err) {
      alert('Erro ao salvar: ' + err.message);
    }
    setSaving(false);
  }

  // ─── Open modal ────────────────────────────────────────────────────────────
  function openModal(player) {
    const existing = picks[String(player.id)];
    setModalPlayer(player);
    setModalPickNum(existing?.pickNumber ? String(existing.pickNumber) : '');
    setModalTeam(existing ? ALL_TEAMS.find(t => t.abbr === existing.teamAbbr) || null : null);
    setModalTeamSearch('');
    setTimeout(() => pickNumRef.current?.focus(), 100);
  }

  function closeModal() {
    setModalPlayer(null);
    setModalPickNum('');
    setModalTeam(null);
    setModalTeamSearch('');
  }

  // ─── Confirm pick ──────────────────────────────────────────────────────────
  function confirmPick() {
    if (!modalPlayer || !modalTeam || !modalPickNum) return;
    const pickNum = parseInt(modalPickNum);
    if (isNaN(pickNum) || pickNum < 1) return;

    // Derive round from pick number (7 rounds, ~32-36 picks each — use draftOrder)
    const slot = rawDraftOrder.find((_, idx) => idx + 1 === pickNum);
    const round = slot?.round || Math.ceil(pickNum / 32);

    const updated = {
      ...picks,
      [String(modalPlayer.id)]: {
        playerName: modalPlayer.name,
        position: modalPlayer.position,
        pickNumber: pickNum,
        round,
        teamAbbr: modalTeam.abbr,
        teamName: modalTeam.team,
        teamLogo: modalTeam.logo,
        boardSource: selectedBoard,
      },
    };
    setPicks(updated);
    localStorage.setItem('dt_picks_v2', JSON.stringify(updated));
    closeModal();
  }

  // ─── Clear pick ────────────────────────────────────────────────────────────
  function clearPick(playerId, e) {
    e.stopPropagation();
    const updated = { ...picks };
    delete updated[String(playerId)];
    setPicks(updated);
    localStorage.setItem('dt_picks_v2', JSON.stringify(updated));
  }

  // ─── Trades ────────────────────────────────────────────────────────────────
  function parsePickNums(str) {
    return str.split(/[,\s]+/).map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0);
  }

  function openTradeModal() {
    setTradeTeamA(null); setTradeTeamB(null);
    setTradePicksAtoB(''); setTradePicksBtoA('');
    setTradeNote(''); setTradeTeamSearch('');
    setTradeStep(1); setShowTradeModal(true);
  }

  function confirmTrade() {
    if (!tradeTeamA || !tradeTeamB) return;
    const picksAtoB = parsePickNums(tradePicksAtoB);
    const picksBtoA = parsePickNums(tradePicksBtoA);
    if (picksAtoB.length === 0 && picksBtoA.length === 0) return;
    const newTrade = {
      id: Date.now(),
      teamA: tradeTeamA, teamB: tradeTeamB,
      picksAtoB, picksBtoA,
      note: tradeNote,
      timestamp: new Date().toISOString(),
    };
    const updated = [...trades, newTrade];
    setTrades(updated);
    localStorage.setItem('dt_trades_v2', JSON.stringify(updated));
    setShowTradeModal(false);
  }

  function deleteTrade(id) {
    const updated = trades.filter(t => t.id !== id);
    setTrades(updated);
    localStorage.setItem('dt_trades_v2', JSON.stringify(updated));
  }

  // Compute effective team for a pick slot after all trades
  function getEffectiveTeam(pickNum) {
    let team = rawDraftOrder[pickNum - 1];
    if (!team) return null;
    let result = { abbr: team.abbr, team: team.team, logo: team.logo };
    for (const trade of trades) {
      if (trade.picksAtoB.includes(pickNum)) result = trade.teamB;
      if (trade.picksBtoA.includes(pickNum)) result = trade.teamA;
    }
    return result;
  }

  // All picks touched by trades (sorted)
  const tradedPickNums = [...new Set(trades.flatMap(t => [...t.picksAtoB, ...t.picksBtoA]))].sort((a,b)=>a-b);

  // ─── Derived data ──────────────────────────────────────────────────────────
  const boardData = BOARDS[selectedBoard].data;
  const totalDrafted = Object.keys(picks).length;

  const ALL_POSITIONS = [...new Set(boardData.map(p => p.position))].sort();

  const filteredBoard = boardData.filter(player => {
    const pid = String(player.id);
    const isDrafted = !!picks[pid];

    if (posFilter === 'DRAFTED') return isDrafted;
    if (posFilter === 'UNDRAFTED') return !isDrafted;
    if (posFilter !== 'ALL') return player.position === posFilter;

    const matchSearch = !search ||
      player.name.toLowerCase().includes(search.toLowerCase()) ||
      player.position.toLowerCase().includes(search.toLowerCase());

    return matchSearch;
  }).filter(player => {
    if (posFilter === 'ALL' || posFilter === 'DRAFTED' || posFilter === 'UNDRAFTED') {
      return !search ||
        player.name.toLowerCase().includes(search.toLowerCase()) ||
        player.position.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  // Picks sorted by pick number
  const sortedPicks = Object.entries(picks)
    .map(([pid, p]) => ({ playerId: pid, ...p }))
    .sort((a, b) => a.pickNumber - b.pickNumber);

  // Teams filtered in modal
  const filteredTeams = ALL_TEAMS.filter(t =>
    !modalTeamSearch ||
    t.abbr.toLowerCase().includes(modalTeamSearch.toLowerCase()) ||
    t.team.toLowerCase().includes(modalTeamSearch.toLowerCase())
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="tracker-page">

      {/* ── Header ── */}
      <div className="tracker-header">
        <div className="tracker-brand">
          <a href="/" className="tracker-back-btn" title="Voltar">
            <i className="fas fa-chevron-left"></i>
          </a>
          <div>
            <h1>NFL Draft Tracker</h1>
            <span className="tracker-subtitle">2025 NFL Draft · Ao Vivo</span>
          </div>
        </div>

        <div className="tracker-header-right">
          {/* Board selector */}
          <div className="tracker-board-select">
            <span className="tracker-label">Board:</span>
            {Object.entries(BOARDS).map(([key, b]) => (
              <button
                key={key}
                className={`pill-btn ${selectedBoard === key ? 'active' : ''}`}
                onClick={() => setSelectedBoard(key)}
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="tracker-view-toggle">
            <button
              className={`tracker-toggle-btn ${view === 'board' ? 'active' : ''}`}
              onClick={() => setView('board')}
            >
              <i className="fas fa-list-ol"></i> Board
            </button>
            <button
              className={`tracker-toggle-btn ${view === 'picks' ? 'active' : ''}`}
              onClick={() => setView('picks')}
            >
              <i className="fas fa-stream"></i> Picks ({totalDrafted})
            </button>
          </div>

          {/* Stats & actions */}
          <div className="tracker-actions">
            {lastSaved && (
              <span className="tracker-stat tracker-saved">
                <i className="fas fa-cloud"></i>
                {lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button className="btn-icon-tracker" onClick={loadPicks} title="Atualizar">
              <i className={`fas fa-rotate-right ${loading ? 'fa-spin' : ''}`}></i>
            </button>
            {isMaster && (
              <button className="btn-save-tracker" onClick={handleSaveToCloud} disabled={saving}>
                {saving
                  ? <><i className="fas fa-spinner fa-spin"></i> Salvando...</>
                  : <><i className="fas fa-cloud-arrow-up"></i> Salvar</>
                }
              </button>
            )}
            {!isMaster ? (
              <button className="btn-login-tracker" onClick={() => setShowLogin(true)}>
                <i className="fas fa-lock"></i> Master
              </button>
            ) : (
              <button className="btn-logout-tracker" onClick={() => setIsMaster(false)}>
                <i className="fas fa-lock-open"></i> Admin
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="tracker-progress-bar">
        <div
          className="tracker-progress-fill"
          style={{ width: `${(totalDrafted / boardData.length) * 100}%` }}
        />
      </div>

      {/* ── Content ── */}
      {view === 'board' ? (
        <div className="tracker-content">
          {/* Filters */}
          <div className="tracker-filters">
            <div className="tracker-search-wrap">
              <i className="fas fa-search tracker-search-icon"></i>
              <input
                className="tracker-search-input"
                placeholder="Buscar jogador..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="tracker-pos-filters">
              {['ALL', 'UNDRAFTED', 'DRAFTED', ...ALL_POSITIONS].map(f => (
                <button
                  key={f}
                  className={`pill-btn ${posFilter === f ? 'active' : ''}`}
                  onClick={() => setPosFilter(f)}
                  style={f.length <= 4 && f !== 'ALL' && f !== 'DRAFTED' && f !== 'UNDRAFTED'
                    ? { color: posColor(f), borderColor: `${posColor(f)}44` }
                    : {}
                  }
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Board list */}
          {loading ? (
            <div className="tracker-loading">
              <i className="fas fa-spinner fa-spin"></i> Carregando...
            </div>
          ) : (
            <div className="tracker-board-list">
              {filteredBoard.map(player => {
                const pid = String(player.id);
                const pick = picks[pid];
                const isDrafted = !!pick;
                return (
                  <div
                    key={player.id}
                    className={`tracker-board-row ${isDrafted ? 'is-drafted' : 'is-available'}`}
                    onClick={() => openModal(player)}
                  >
                    {/* Rank */}
                    <div className="tbr-rank">
                      {String(player.rank).padStart(2, '0')}
                    </div>

                    {/* Position badge */}
                    <div className="tbr-pos">
                      <span
                        className="tpr-pos-badge"
                        style={{
                          background: `${posColor(player.position)}18`,
                          color: posColor(player.position),
                          borderColor: `${posColor(player.position)}44`,
                        }}
                      >
                        {player.position}
                      </span>
                    </div>

                    {/* Name */}
                    <div className="tbr-name">
                      <span className={isDrafted ? 'tbr-name-drafted' : ''}>{player.name}</span>
                      {player.grade && (
                        <span className="tbr-grade">{Number(player.grade).toFixed(1)}</span>
                      )}
                    </div>

                    {/* Draft info or empty */}
                    {isDrafted ? (
                      <div className="tbr-pick-info">
                        <img src={pick.teamLogo} alt={pick.teamAbbr} className="tbr-team-logo" />
                        <span className="tbr-team-abbr">{pick.teamAbbr}</span>
                        <span className="tbr-pick-num">#{pick.pickNumber}</span>
                      </div>
                    ) : (
                      <div className="tbr-pick-info tbr-undrafted">
                        <span className="tbr-available">Disponível</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="tbr-action" onClick={e => e.stopPropagation()}>
                      {isDrafted && (
                        <button
                          className="tpr-btn tpr-btn-clear"
                          onClick={e => clearPick(player.id, e)}
                          title="Remover"
                        >
                          <i className="fas fa-xmark"></i>
                        </button>
                      )}
                      {!isDrafted && (
                        <button
                          className="tpr-btn tpr-btn-add"
                          onClick={() => openModal(player)}
                          title="Registrar pick"
                        >
                          <i className="fas fa-plus"></i>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredBoard.length === 0 && (
                <div className="tracker-empty-search">Nenhum jogador encontrado.</div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ── Picks View ── */
        <div className="tracker-content">
          {/* Trades header */}
          <div className="picks-view-header">
            <span className="picks-view-title">
              <i className="fas fa-stream"></i> {sortedPicks.length} picks registradas
            </span>
            <button className="btn-trade-register" onClick={openTradeModal}>
              <i className="fas fa-arrows-rotate"></i> Registrar Troca
            </button>
          </div>

          {/* Trades list */}
          {trades.length > 0 && (
            <div className="trades-list">
              <div className="trades-list-title"><i className="fas fa-arrows-rotate"></i> Trocas Registradas</div>
              {trades.map(t => (
                <div key={t.id} className="trade-card">
                  <div className="trade-card-teams">
                    <div className="trade-side">
                      <img src={t.teamA.logo} alt={t.teamA.abbr} className="tbr-team-logo" />
                      <span className="tbr-team-abbr">{t.teamA.abbr}</span>
                    </div>
                    <div className="trade-arrows">
                      {t.picksAtoB.length > 0 && <div className="trade-flow"><span className="trade-picks">{t.picksAtoB.map(n=>`#${n}`).join(', ')}</span><i className="fas fa-arrow-right trade-arrow"></i></div>}
                      {t.picksBtoA.length > 0 && <div className="trade-flow"><i className="fas fa-arrow-left trade-arrow"></i><span className="trade-picks">{t.picksBtoA.map(n=>`#${n}`).join(', ')}</span></div>}
                    </div>
                    <div className="trade-side">
                      <img src={t.teamB.logo} alt={t.teamB.abbr} className="tbr-team-logo" />
                      <span className="tbr-team-abbr">{t.teamB.abbr}</span>
                    </div>
                    <button className="tpr-btn tpr-btn-clear" style={{marginLeft:'auto'}} onClick={() => deleteTrade(t.id)}><i className="fas fa-xmark"></i></button>
                  </div>
                  {t.note && <div className="trade-note">{t.note}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Picks list */}
          {sortedPicks.length === 0 ? (
            <div className="tracker-empty-search" style={{ padding: '2rem' }}>
              Nenhuma pick registrada ainda. Alterne para Board para registrar picks.
            </div>
          ) : (
            <div className="tracker-board-list">
              {sortedPicks.map(p => {
                const isTradedPick = tradedPickNums.includes(p.pickNumber);
                const originalTeam = rawDraftOrder[p.pickNumber - 1];
                const effectiveTeam = getEffectiveTeam(p.pickNumber);
                const isViaTradeByDifferentTeam = effectiveTeam && p.teamAbbr !== (originalTeam?.abbr);
                return (
                  <div key={p.playerId} className={`tracker-board-row is-drafted ${isTradedPick ? 'is-traded-pick' : ''}`}>
                    <div className="tbr-rank" style={{ color: 'var(--text-primary)' }}>#{String(p.pickNumber).padStart(2,'0')}</div>
                    <div className="tbr-pick-info" style={{ minWidth: 80 }}>
                      <img src={p.teamLogo} alt={p.teamAbbr} className="tbr-team-logo" />
                      <span className="tbr-team-abbr">{p.teamAbbr}</span>
                    </div>
                    <div className="tbr-pos">
                      <span className="tpr-pos-badge" style={{ background:`${posColor(p.position)}18`, color:posColor(p.position), borderColor:`${posColor(p.position)}44` }}>{p.position}</span>
                    </div>
                    <div className="tbr-name" style={{ flex: 1 }}>
                      <span>{p.playerName}</span>
                      {isTradedPick && <span className="trade-badge"><i className="fas fa-arrows-rotate"></i> via troca</span>}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>R{p.round}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Login Modal ── */}
      {showLogin && (
        <div className="tracker-modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="tracker-modal" onClick={e => e.stopPropagation()}>
            <div className="tracker-modal-header">
              <h2><i className="fas fa-lock"></i> Acesso Master</h2>
              <button className="modal-close-btn" onClick={() => setShowLogin(false)}>
                <i className="fas fa-xmark"></i>
              </button>
            </div>
            <div className="tracker-modal-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                Modo master permite salvar picks na nuvem.
              </p>
              <input
                type="password"
                className="tracker-input"
                placeholder="Senha"
                value={loginInput}
                onChange={e => setLoginInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                autoFocus
              />
              {loginError && <span className="tracker-error">{loginError}</span>}
              <button className="btn-save-tracker" style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }} onClick={handleLogin}>
                Entrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pick Registration Modal ── */}
      {modalPlayer && (
        <div className="tracker-modal-overlay" onClick={closeModal}>
          <div className="tracker-modal tracker-modal-wide" onClick={e => e.stopPropagation()}>
            <div className="tracker-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span
                  className="tpr-pos-badge"
                  style={{
                    background: `${posColor(modalPlayer.position)}22`,
                    color: posColor(modalPlayer.position),
                    borderColor: `${posColor(modalPlayer.position)}55`,
                    fontSize: '0.75rem',
                  }}
                >
                  {modalPlayer.position}
                </span>
                <h2 style={{ margin: 0 }}>
                  #{modalPlayer.rank} {modalPlayer.name}
                </h2>
              </div>
              <button className="modal-close-btn" onClick={closeModal}>
                <i className="fas fa-xmark"></i>
              </button>
            </div>

            <div className="tracker-modal-body">
              {/* Pick number */}
              <label className="tracker-field-label">Número da Escolha</label>
              <input
                ref={pickNumRef}
                type="number"
                min="1"
                max="259"
                className="tracker-input"
                placeholder="Ex: 14"
                value={modalPickNum}
                onChange={e => setModalPickNum(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirmPick()}
              />

              {/* Team selector */}
              <label className="tracker-field-label" style={{ marginTop: '1rem' }}>Time</label>
              <input
                className="tracker-input"
                placeholder="Buscar time..."
                value={modalTeamSearch}
                onChange={e => setModalTeamSearch(e.target.value)}
                style={{ marginBottom: '0.5rem' }}
              />

              <div className="tracker-team-grid">
                {filteredTeams.map(t => (
                  <button
                    key={t.abbr}
                    className={`tracker-team-option ${modalTeam?.abbr === t.abbr ? 'selected' : ''}`}
                    onClick={() => setModalTeam(t)}
                  >
                    <img src={t.logo} alt={t.abbr} className="tto-logo" />
                    <span className="tto-abbr">{t.abbr}</span>
                  </button>
                ))}
              </div>

              {/* Confirm */}
              <button
                className="btn-save-tracker"
                style={{
                  width: '100%',
                  marginTop: '1rem',
                  justifyContent: 'center',
                  opacity: (!modalTeam || !modalPickNum) ? 0.5 : 1,
                }}
                onClick={confirmPick}
                disabled={!modalTeam || !modalPickNum}
              >
                <i className="fas fa-check"></i> Confirmar Pick
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Trade Modal ── */}
      {showTradeModal && (
        <div className="tracker-modal-overlay" onClick={() => setShowTradeModal(false)}>
          <div className="tracker-modal tracker-modal-wide" onClick={e => e.stopPropagation()}>
            <div className="tracker-modal-header">
              <h2><i className="fas fa-arrows-rotate"></i> Registrar Troca</h2>
              <button className="modal-close-btn" onClick={() => setShowTradeModal(false)}><i className="fas fa-xmark"></i></button>
            </div>
            <div className="tracker-modal-body">
              {tradeStep === 1 ? (
                <>
                  <label className="tracker-field-label">Selecione os dois times envolvidos</label>
                  <input className="tracker-input" placeholder="Buscar time..." value={tradeTeamSearch} onChange={e => setTradeTeamSearch(e.target.value)} style={{ marginBottom: '0.5rem' }} />
                  <div className="tracker-team-grid" style={{ maxHeight: 220 }}>
                    {ALL_TEAMS.filter(t => !tradeTeamSearch || t.abbr.toLowerCase().includes(tradeTeamSearch.toLowerCase()) || t.team.toLowerCase().includes(tradeTeamSearch.toLowerCase())).map(t => (
                      <button
                        key={t.abbr}
                        className={`tracker-team-option ${
                          tradeTeamA?.abbr === t.abbr ? 'selected trade-team-a' :
                          tradeTeamB?.abbr === t.abbr ? 'selected trade-team-b' : ''
                        }`}
                        onClick={() => {
                          if (tradeTeamA?.abbr === t.abbr) { setTradeTeamA(null); return; }
                          if (tradeTeamB?.abbr === t.abbr) { setTradeTeamB(null); return; }
                          if (!tradeTeamA) { setTradeTeamA(t); }
                          else if (!tradeTeamB) { setTradeTeamB(t); }
                        }}
                      >
                        <img src={t.logo} alt={t.abbr} className="tto-logo" />
                        <span className="tto-abbr">{t.abbr}</span>
                      </button>
                    ))}
                  </div>
                  <div className="trade-selected-teams">
                    {tradeTeamA ? <div className="trade-selected-tag"><img src={tradeTeamA.logo} style={{width:20,height:20,objectFit:'contain'}} />{tradeTeamA.abbr}</div> : <div className="trade-selected-empty">Time A</div>}
                    <i className="fas fa-arrows-rotate" style={{color:'var(--text-muted)'}}></i>
                    {tradeTeamB ? <div className="trade-selected-tag"><img src={tradeTeamB.logo} style={{width:20,height:20,objectFit:'contain'}} />{tradeTeamB.abbr}</div> : <div className="trade-selected-empty">Time B</div>}
                  </div>
                  <button className="btn-save-tracker" style={{width:'100%',marginTop:'1rem',justifyContent:'center',opacity:(!tradeTeamA||!tradeTeamB)?0.5:1}} disabled={!tradeTeamA||!tradeTeamB} onClick={() => setTradeStep(2)}>
                    Próximo <i className="fas fa-arrow-right"></i>
                  </button>
                </>
              ) : (
                <>
                  <div className="trade-step2-header">
                    <div className="trade-side"><img src={tradeTeamA.logo} alt={tradeTeamA.abbr} className="tbr-team-logo" /><strong>{tradeTeamA.abbr}</strong></div>
                    <i className="fas fa-arrows-rotate" style={{color:'var(--text-muted)'}}></i>
                    <div className="trade-side"><img src={tradeTeamB.logo} alt={tradeTeamB.abbr} className="tbr-team-logo" /><strong>{tradeTeamB.abbr}</strong></div>
                  </div>
                  <label className="tracker-field-label" style={{marginTop:'1rem'}}>{tradeTeamA.abbr} cede as escolhas (separadas por vírgula)</label>
                  <input className="tracker-input" placeholder="Ex: 5, 37, 105" value={tradePicksAtoB} onChange={e => setTradePicksAtoB(e.target.value)} />
                  <label className="tracker-field-label" style={{marginTop:'0.75rem'}}>{tradeTeamB.abbr} cede as escolhas</label>
                  <input className="tracker-input" placeholder="Ex: 3" value={tradePicksBtoA} onChange={e => setTradePicksBtoA(e.target.value)} />
                  <label className="tracker-field-label" style={{marginTop:'0.75rem'}}>Notas (opcional)</label>
                  <input className="tracker-input" placeholder="Ex: + futuras escolhas condicionais" value={tradeNote} onChange={e => setTradeNote(e.target.value)} />
                  <div style={{display:'flex',gap:'0.5rem',marginTop:'1rem'}}>
                    <button className="btn-login-tracker" onClick={() => setTradeStep(1)}><i className="fas fa-arrow-left"></i> Voltar</button>
                    <button className="btn-save-tracker" style={{flex:1,justifyContent:'center'}} onClick={confirmTrade}><i className="fas fa-check"></i> Confirmar Troca</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
