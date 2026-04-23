import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { draftOrder as rawDraftOrder } from './data/mockData';
import bigBoard from './data/bigboard.json';
import pffBoard from './data/pff_board.json';

// ─── Constants ────────────────────────────────────────────────────────────────
const MASTER_PASSWORD = 'DraFt#2026!AdmIn_TrAckEr_X9';

const BOARDS = {
  otc: { label: 'OTC', data: bigBoard },
  pff: { label: 'PFF', data: pffBoard },
};

// Build unique team list from draft order (preserving logo paths)
const ALL_TEAMS = Object.values(
  rawDraftOrder.reduce((acc, t) => {
    if (!acc[t.abbr]) acc[t.abbr] = { abbr: t.abbr, team: t.team, logo: t.logo };
    return acc;
  }, {})
).sort((a, b) => a.abbr.localeCompare(b.abbr));

// Função para completar um board com jogadores da PFF que estão faltando
function getAugmentedBoard(targetBoard, pffData) {
  if (targetBoard === pffData) return targetBoard;
  
  const targetIds = new Set(targetBoard.map(p => String(p.id)));
  const missingFromPff = pffData.filter(p => !targetIds.has(String(p.id)));
  
  // Ordenar os faltantes pelo rank original da PFF
  const sortedMissing = [...missingFromPff].sort((a, b) => (a.rank || 999) - (b.rank || 999));
  
  // Adicionar ao final do board alvo com novos ranks sequenciais
  const augmented = [...targetBoard];
  let nextRank = augmented.length > 0 ? Math.max(...augmented.map(p => p.rank || 0)) + 1 : 1;
  
  sortedMissing.forEach(p => {
    augmented.push({
      ...p,
      rank: nextRank++,
      isAugmented: true // Marcador opcional para debug/UI
    });
  });
  
  return augmented;
}

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
  const [selectedBoard, setSelectedBoard] = useState('otc');

  // picks: { [playerId]: { playerName, position, pickNumber, round, teamAbbr, teamName, teamLogo } }
  const [picks, setPicks] = useState({});

  // trades: [{ id, teamA, teamB, picksAtoB: [nums], picksBtoA: [nums], note }]
  const [trades, setTrades] = useState([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const channelRef = useRef(null);

  // Filters (board view)
  const [posFilter, setPosFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedPicksRound, setSelectedPicksRound] = useState(1);

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
  const [tradePicksAtoB, setTradePicksAtoB] = useState([]); // Array of numbers
  const [tradePicksBtoA, setTradePicksBtoA] = useState([]);
  const [tradeNote, setTradeNote] = useState('');
  const [tradeTeamSearch, setTradeTeamSearch] = useState('');
  const [tradeStep, setTradeStep] = useState(1); // 1=teams, 2=picks
  const [selectedTrade, setSelectedTrade] = useState(null);

  // ─── Load ─────────────────────────────────────────────────────────────────
  const loadPicks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('draft_picks')
        .select('*')
        .setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
        .order('pick_number', { ascending: true });

      const map = {};
      if (!error && data) {
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
      }
      setPicks(map);
      if (!error) setLastSaved(new Date());
    } catch (e) {
      console.error(e);
    }
    // Load trades
    try {
      const { data: tradeData, error: tradeError } = await supabase
        .from('draft_trades')
        .select('*')
        .setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      
      let formattedTrades = [];
      if (!tradeError && tradeData) {
        formattedTrades = tradeData.map(t => ({
          id: t.id,
          teamA: ALL_TEAMS.find(at => at.abbr === t.team_a) || { abbr: t.team_a },
          teamB: ALL_TEAMS.find(at => at.abbr === t.team_b) || { abbr: t.team_b },
          picksAtoB: t.picks_a_to_b || [],
          picksBtoA: t.picks_b_to_a || [],
          note: t.note
        }));
      }
      setTrades(formattedTrades);
    } catch (e) {
      console.error(e);
    }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => { 
    loadPicks();
    // Definir round inicial baseado na próxima pick
    const currentPickNum = Object.keys(picks).length + 1;
    const slot = rawDraftOrder.find((_, idx) => idx + 1 === currentPickNum);
    if (slot && slot.round) setSelectedPicksRound(slot.round);
  }, [loadPicks]);

  useEffect(() => {
    // Iniciar o canal e guardar na ref
    const channel = supabase
      .channel('draft_realtime_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'draft_picks' }, () => {
        loadPicks();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'draft_trades' }, () => {
        loadPicks();
      })
      .on('broadcast', { event: 'sync_data' }, ({ payload }) => {
        console.log('Broadcast de estado recebido:', payload);
        if (payload.picks) setPicks(payload.picks);
        if (payload.trades) setTrades(payload.trades);
        // Recarregar silenciosamente para garantir consistência
        setTimeout(() => loadPicks(true), 1000);
      })
      .subscribe((status) => {
        console.log('Status do canal Realtime:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [loadPicks]);

  // ─── Auth ──────────────────────────────────────────────────────────────────
  function handleLogin() {
    if (loginInput === MASTER_PASSWORD) {
      setIsMaster(true);
      setShowLogin(false);
      setLoginError('');
      setLoginInput('');
      setSearch(''); // Limpar qualquer preenchimento automático do navegador
    } else {
      setLoginError('Senha incorreta');
    }
  }

  // ─── Save to cloud ─────────────────────────────────────────────────────────
  async function handleSaveToCloud() {
    if (!isMaster) return;
    setSaving(true);
    try {
      // ─── Save Picks ───
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

      // 1. Upsert (Insert/Update) current picks
      if (rows.length > 0) {
        const { error } = await supabase
          .from('draft_picks')
          .upsert(rows, { onConflict: 'player_id' });
        if (error) throw error;
      }

      // 2. Delete picks that are no longer in the state
      const currentPlayerIds = Object.keys(picks);
      if (currentPlayerIds.length > 0) {
        // Envolver cada ID em aspas duplas caso sejam strings, para evitar erro no PostgREST
        const formattedIds = currentPlayerIds.map(id => `"${id}"`).join(',');
        const idList = `(${formattedIds})`;
        const { error: delError } = await supabase
          .from('draft_picks')
          .delete()
          .not('player_id', 'in', idList); 
        if (delError) throw delError;
      } else {
        // If state is empty, clear the whole table
        const { error: delAllError } = await supabase
          .from('draft_picks')
          .delete()
          .neq('player_id', '0'); 
        if (delAllError) throw delAllError;
      }

      // ─── Save Trades ───
      const tradeRows = trades.map(t => ({
        id: t.id,
        team_a: t.teamA,
        team_b: t.teamB,
        picks_a_to_b: t.picksAtoB,
        picks_b_to_a: t.picksBtoA,
        note: t.note
      }));

      // Clear old trades and insert new ones
      await supabase.from('draft_trades').delete().neq('id', 0); // Limpa tudo
      if (tradeRows.length > 0) {
        const { error: tradeErr } = await supabase
          .from('draft_trades')
          .insert(tradeRows);
        if (tradeErr) throw tradeErr;
      }

      // ─── Enviar Broadcast de ESTADO para outros clientes ───
      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'sync_data',
          payload: { 
            picks: picks,
            trades: trades,
            timestamp: new Date().getTime() 
          },
        });
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
    // For undrafted players, suggest the next pick and expected team
    const suggestedPickNum = existing?.pickNumber
      ? String(existing.pickNumber)
      : String(totalDrafted + 1);
    const suggestedTeam = existing
      ? ALL_TEAMS.find(t => t.abbr === existing.teamAbbr) || null
      : getEffectiveTeam(totalDrafted + 1)
        ? ALL_TEAMS.find(t => t.abbr === getEffectiveTeam(totalDrafted + 1)?.abbr) || null
        : null;
    setModalPlayer(player);
    setModalPickNum(suggestedPickNum);
    setModalTeam(suggestedTeam);
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
    setTradePicksAtoB([]); setTradePicksBtoA([]);
    setTradeNote(''); setTradeTeamSearch('');
    setTradeStep(1); setShowTradeModal(true);
  }

  function confirmTrade() {
    if (!tradeTeamA || !tradeTeamB) return;
    const picksAtoB = tradePicksAtoB;
    const picksBtoA = tradePicksBtoA;
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
    setShowTradeModal(false);
  }

  function deleteTrade(id) {
    const updated = trades.filter(t => t.id !== id);
    setTrades(updated);
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

  function getTradeForPick(pickNum) {
    return [...trades].reverse().find(t => t.picksAtoB.includes(pickNum) || t.picksBtoA.includes(pickNum));
  }

  // All picks touched by trades (sorted)
  const tradedPickNums = [...new Set(trades.flatMap(t => [...t.picksAtoB, ...t.picksBtoA]))].sort((a,b)=>a-b);

  // Helper to get all picks currently owned by a team
  function getTeamCurrentPicks(teamAbbr) {
    if (!teamAbbr) return [];
    return rawDraftOrder
      .map((slot, idx) => ({ ...slot, pickNumber: idx + 1 }))
      .filter(slot => {
        const effective = getEffectiveTeam(slot.pickNumber);
        return effective?.abbr === teamAbbr;
      });
  }

  // ─── Derived data ──────────────────────────────────────────────────────────
  // Computed Board Data (Augmented with PFF if not already PFF)
  const boardData = useMemo(() => {
    const baseBoard = BOARDS[selectedBoard]?.data || [];
    if (selectedBoard === 'pff') return baseBoard;
    return getAugmentedBoard(baseBoard, BOARDS.pff.data);
  }, [selectedBoard]);
  const totalDrafted = Object.keys(picks).length;

  // Next pick tracking
  const nextPickNumber = totalDrafted + 1;
  const nextExpectedTeam = getEffectiveTeam(nextPickNumber);
  const totalPicks = rawDraftOrder.length;
  const nextSlot = rawDraftOrder[nextPickNumber - 1];
  const isDraftComplete = nextPickNumber > totalPicks;

  const ALL_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OT', 'IOL', 'EDGE', 'IDL', 'LB', 'CB', 'S'];

  const filteredBoard = boardData.filter(player => {
    const isDrafted = !!picks[String(player.id)];

    // 1. Position/Status Filter
    if (posFilter === 'DRAFTED' && !isDrafted) return false;
    if (posFilter === 'UNDRAFTED' && isDrafted) return false;
    if (posFilter !== 'ALL' && posFilter !== 'DRAFTED' && posFilter !== 'UNDRAFTED' && player.position !== posFilter) return false;

    // 2. Search Filter
    if (search) {
      const s = search.toLowerCase();
      const nameMatch = player.name?.toLowerCase().includes(s);
      const posMatch = player.position?.toLowerCase().includes(s);
      if (!nameMatch && !posMatch) return false;
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
            <span className="tracker-subtitle">2026 NFL Draft · Ao Vivo</span>
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
      <div className="tracker-content">
        
        {/* Header Sticky: Banner + Filtros */}
        <div className="tracker-header-sticky">
          {/* On The Clock banner - Visible in both views */}
          {!isDraftComplete && nextExpectedTeam && (
            <div className="tracker-otc-banner">
              <div className="otc-left">
                <span className="otc-label">ON THE CLOCK</span>
                <img src={nextExpectedTeam.logo} alt={nextExpectedTeam.abbr} className="otc-logo" />
                <span className="otc-team-name">{nextExpectedTeam.abbr}</span>
                <span className="otc-team-full hide-on-mobile">{nextExpectedTeam.team}</span>
              </div>
              <div className="otc-right">
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {isMaster && (
                    <button className="btn-trade-register" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }} onClick={openTradeModal}>
                      <i className="fas fa-arrows-rotate"></i> TROCA
                    </button>
                  )}
                  <div style={{ textAlign: 'right' }}>
                    <span className="otc-pick-label">Escolha</span>
                    <div className="otc-pick-num">#{String(nextPickNumber).padStart(2, '0')}</div>
                    {nextSlot && <span className="otc-round">Round {nextSlot.round}</span>}
                  </div>
                </div>
              </div>
            </div>
          )}
          {isDraftComplete && (
            <div className="tracker-otc-banner otc-complete">
              <i className="fas fa-trophy"></i> Draft Concluído! {totalDrafted} jogadores selecionados.
            </div>
          )}

          {view === 'board' ? (
            <div className="tracker-filters">
              <div className="tracker-search-wrap">
                <i className="fas fa-search tracker-search-icon"></i>
                <input
                  className="tracker-search-input"
                  placeholder="Buscar jogador..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoComplete="off"
                  name="draftPlayerSearch"
                  spellCheck="false"
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
          ) : (
            <div className="round-selector-sticky">
              <div className="round-selector" style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.4rem' }}>
                {[1, 2, 3, 4, 5, 6, 7].map(round => (
                  <button 
                    key={round}
                    className={`pill-btn ${selectedPicksRound === round ? 'active' : ''}`}
                    onClick={() => setSelectedPicksRound(round)}
                  >
                    ROUND {round}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {view === 'board' ? (
          <div className="tracker-board-list-container">

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
                      {isDrafted && tradedPickNums.includes(pick.pickNumber) && (
                        <span 
                          className="trade-badge clickable" 
                          style={{ marginLeft: '0.6rem' }}
                          onClick={(e) => { e.stopPropagation(); setSelectedTrade(getTradeForPick(pick.pickNumber)); }}
                          title="Ver detalhes da troca"
                        >
                          <i className="fas fa-arrows-rotate"></i> via troca
                        </span>
                      )}
                    </div>

                    {/* Grade Column */}
                    <div className="tbr-grade-col">
                      {player.isAugmented ? (
                        <span className="tbr-grade">-</span>
                      ) : (
                        player.grade && (
                          <span className="tbr-grade">{Number(player.grade).toFixed(1)}</span>
                        )
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
                      {isMaster && (
                        <>
                          {isDrafted ? (
                            <button
                              className="tpr-btn tpr-btn-clear"
                              onClick={e => clearPick(player.id, e)}
                              title="Remover"
                            >
                              <i className="fas fa-xmark"></i>
                            </button>
                          ) : (
                            <button
                              className="tpr-btn tpr-btn-add"
                              onClick={() => openModal(player)}
                              title="Registrar pick"
                            >
                              <i className="fas fa-plus"></i>
                            </button>
                          )}
                        </>
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
            <div className="tracker-board-list-container">

            {/* Trades list removed from here as per user request to clean up UI */}

            <div className="tracker-board-list">
              {rawDraftOrder
                .map((slot, idx) => ({ slot, pickNumber: idx + 1 }))
                .filter(({ slot }) => slot.round === selectedPicksRound)
                .map(({ slot, pickNumber }) => {
                  const effectiveTeam = getEffectiveTeam(pickNumber);
                  const pickData = Object.values(picks).find(p => p.pickNumber === pickNumber);
                  const isTradedPick = tradedPickNums.includes(pickNumber);
                  const isOnTheClock = pickNumber === nextPickNumber && !isDraftComplete;

                  return (
                    <div 
                      key={pickNumber} 
                      className={`tracker-board-row ${pickData ? 'is-drafted' : isOnTheClock ? 'current-pick-highlight' : 'is-available'} ${isTradedPick ? 'is-traded-pick' : ''}`}
                      style={{ cursor: 'default' }}
                    >
                      <div className="tbr-rank" style={{ color: 'var(--text-primary)' }}>#{String(pickNumber).padStart(2,'0')}</div>
                      
                      <div className="tbr-pick-info" style={{ minWidth: 80 }}>
                        <img src={effectiveTeam?.logo || slot.logo} alt={effectiveTeam?.abbr || slot.abbr} className="tbr-team-logo" />
                        <span className="tbr-team-abbr">{effectiveTeam?.abbr || slot.abbr}</span>
                      </div>

                      {pickData ? (
                        <>
                          <div className="tbr-pos">
                            <span className="tpr-pos-badge" style={{ background:`${posColor(pickData.position)}18`, color:posColor(pickData.position), borderColor:`${posColor(pickData.position)}44` }}>{pickData.position}</span>
                          </div>
                          <div className="tbr-name">
                            <span>{pickData.playerName}</span>
                            {isTradedPick && (
                              <span 
                                className="trade-badge clickable" 
                                onClick={(e) => { e.stopPropagation(); setSelectedTrade(getTradeForPick(pickNumber)); }}
                                title="Ver detalhes da troca"
                              >
                                <i className="fas fa-arrows-rotate"></i> via troca
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="tbr-pos">
                            {/* Espaço reservado para manter alinhamento */}
                          </div>
                          <div className="tbr-name" style={{ color: isOnTheClock ? '#93c5fd' : 'var(--text-muted)', fontWeight: isOnTheClock ? 800 : 400 }}>
                            <span>{isOnTheClock ? 'ON THE CLOCK' : 'PREVISTA'}</span>
                            {isTradedPick && (
                              <span 
                                className="trade-badge clickable" 
                                style={{marginLeft: '0.5rem'}}
                                onClick={(e) => { e.stopPropagation(); setSelectedTrade(getTradeForPick(pickNumber)); }}
                                title="Ver detalhes da troca"
                              >
                                <i className="fas fa-arrows-rotate"></i> via troca
                              </span>
                            )}
                          </div>
                        </>
                      )}
                      
                      <div className="tbr-grade" style={{ fontSize: '0.72rem', opacity: 0.6 }}>R{slot.round}</div>
                      <div className="tbr-action">
                        {isMaster && (
                          <>
                            {pickData ? (
                              <button 
                                className="tpr-btn tpr-btn-clear" 
                                onClick={e => {
                                  const playerId = Object.keys(picks).find(id => picks[id].pickNumber === pickNumber);
                                  if (playerId) clearPick(playerId, e);
                                }} 
                                title="Remover"
                              >
                                <i className="fas fa-xmark"></i>
                              </button>
                            ) : (
                              <button 
                                className="tpr-btn tpr-btn-add" 
                                onClick={() => {
                                  setModalPickNum(String(pickNumber));
                                  setView('board');
                                  setTimeout(() => document.querySelector('.tracker-search-input')?.focus(), 100);
                                }} 
                                title="Registrar pick"
                              >
                                <i className="fas fa-plus"></i>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

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

                  <div className="trade-picks-selector-grid">
                    <div className="trade-picks-col">
                      <label className="tracker-field-label">Escolhas de {tradeTeamA.abbr}</label>
                      <div className="trade-picks-list">
                        {getTeamCurrentPicks(tradeTeamA.abbr).map(p => (
                          <div 
                            key={p.pickNumber} 
                            className={`trade-pick-item ${tradePicksAtoB.includes(p.pickNumber) ? 'selected' : ''}`}
                            onClick={() => {
                              if (tradePicksAtoB.includes(p.pickNumber)) setTradePicksAtoB(tradePicksAtoB.filter(n => n !== p.pickNumber));
                              else setTradePicksAtoB([...tradePicksAtoB, p.pickNumber]);
                            }}
                          >
                            <span className="tp-num">#{p.pickNumber}</span>
                            <span className="tp-round">R{p.round}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="trade-picks-col">
                      <label className="tracker-field-label">Escolhas de {tradeTeamB.abbr}</label>
                      <div className="trade-picks-list">
                        {getTeamCurrentPicks(tradeTeamB.abbr).map(p => (
                          <div 
                            key={p.pickNumber} 
                            className={`trade-pick-item ${tradePicksBtoA.includes(p.pickNumber) ? 'selected' : ''}`}
                            onClick={() => {
                              if (tradePicksBtoA.includes(p.pickNumber)) setTradePicksBtoA(tradePicksBtoA.filter(n => n !== p.pickNumber));
                              else setTradePicksBtoA([...tradePicksBtoA, p.pickNumber]);
                            }}
                          >
                            <span className="tp-num">#{p.pickNumber}</span>
                            <span className="tp-round">R{p.round}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <label className="tracker-field-label" style={{marginTop:'0.75rem'}}>Notas (opcional)</label>
                  <input className="tracker-input" placeholder="Ex: troca de escolhas de 1ª rodada" value={tradeNote} onChange={e => setTradeNote(e.target.value)} />
                  
                  <div style={{display:'flex',gap:'0.5rem',marginTop:'1rem'}}>
                    <button className="btn-login-tracker" onClick={() => setTradeStep(1)}><i className="fas fa-arrow-left"></i> Voltar</button>
                    <button className="btn-save-tracker" style={{flex:1,justifyContent:'center', opacity: (tradePicksAtoB.length === 0 && tradePicksBtoA.length === 0) ? 0.5 : 1}} onClick={confirmTrade} disabled={tradePicksAtoB.length === 0 && tradePicksBtoA.length === 0}><i className="fas fa-check"></i> Confirmar Troca</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ── Trade Details Modal ── */}
      {selectedTrade && (
        <div className="tracker-modal-overlay" onClick={() => setSelectedTrade(null)}>
          <div className="tracker-modal" onClick={e => e.stopPropagation()}>
            <div className="tracker-modal-header">
              <h2><i className="fas fa-info-circle"></i> Detalhes da Troca</h2>
              <button className="modal-close-btn" onClick={() => setSelectedTrade(null)}><i className="fas fa-xmark"></i></button>
            </div>
            <div className="tracker-modal-body">
              <div className="trade-card" style={{ margin: 0, border: 'none', background: 'transparent' }}>
                <div className="trade-card-teams">
                  <div className="trade-side">
                    <img src={selectedTrade.teamA.logo} alt={selectedTrade.teamA.abbr} className="tbr-team-logo" />
                    <span className="tbr-team-abbr">{selectedTrade.teamA.abbr}</span>
                  </div>
                  <div className="trade-arrows">
                    {selectedTrade.picksAtoB.length > 0 && <div className="trade-flow"><span className="trade-picks">{selectedTrade.picksAtoB.map(n=>`#${n}`).join(', ')}</span><i className="fas fa-arrow-right trade-arrow"></i></div>}
                    {selectedTrade.picksBtoA.length > 0 && <div className="trade-flow"><i className="fas fa-arrow-left trade-arrow"></i><span className="trade-picks">{selectedTrade.picksBtoA.map(n=>`#${n}`).join(', ')}</span></div>}
                  </div>
                  <div className="trade-side">
                    <img src={selectedTrade.teamB.logo} alt={selectedTrade.teamB.abbr} className="tbr-team-logo" />
                    <span className="tbr-team-abbr">{selectedTrade.teamB.abbr}</span>
                  </div>
                </div>
                {selectedTrade.note && <div className="trade-note" style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)' }}>{selectedTrade.note}</div>}
                
                {isMaster && (
                  <button 
                    className="btn-login-tracker" 
                    style={{ width: '100%', marginTop: '2rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                    onClick={() => {
                      if (window.confirm("Deseja realmente desfazer esta troca? Os times das escolhas já feitas que dependiam desta troca serão alterados visualmente no tracker.")) {
                        deleteTrade(selectedTrade.id);
                        setSelectedTrade(null);
                      }
                    }}
                  >
                    <i className="fas fa-trash-can"></i> Desfazer esta Troca
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
