import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { draftOrder as rawDraftOrder } from './data/mockData';
import bigBoard from './data/bigboard.json';
import pffBoard from './data/pff_board.json';
import bigBoardCristian from './data/bigboard_cristian.json';
import { calculateGrade, getGradeColor } from './utils/gradeUtils';

// ─── Constants ────────────────────────────────────────────────────────────────
const BOARDS = {
  otc: { label: 'OTC', data: bigBoard },
  pff: { label: 'PFF', data: pffBoard },
  cristian: { label: 'Cristian', data: bigBoardCristian },
};

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

// ─── Helper Functions ─────────────────────────────────────────────────────────
function getAugmentedBoard(targetBoard, pffData) {
  if (targetBoard === pffData) return targetBoard;
  const targetIds = new Set(targetBoard.map(p => String(p.id)));
  const missingFromPff = pffData.filter(p => !targetIds.has(String(p.id)));
  const sortedMissing = [...missingFromPff].sort((a, b) => (a.rank || 999) - (b.rank || 999));
  const augmented = [...targetBoard];
  let nextRank = augmented.length > 0 ? Math.max(...augmented.map(p => p.rank || 0)) + 1 : 1;
  sortedMissing.forEach(p => {
    augmented.push({ ...p, rank: nextRank++, isAugmented: true });
  });
  return augmented;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ScoutProjetado() {
  const [selectedBoard, setSelectedBoard] = useState('otc');
  const [realPicks, setRealPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(ALL_TEAMS[0]);

  // Load real picks from Supabase
  const loadRealPicks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('draft_picks')
        .select('*')
        .order('pick_number', { ascending: true });
      if (!error && data) setRealPicks(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRealPicks();
  }, [loadRealPicks]);

  // Compute the augmented board based on selection
  const boardData = useMemo(() => {
    const baseBoard = BOARDS[selectedBoard]?.data || [];
    if (selectedBoard === 'pff') return baseBoard;
    return getAugmentedBoard(baseBoard, BOARDS.pff.data);
  }, [selectedBoard]);

  // ─── Projection Logic ───
  const projectedData = useMemo(() => {
    if (!realPicks.length || !boardData.length) return [];

    let availablePlayers = [...boardData];
    const results = [];

    // Important: We follow the real picks order
    for (const realPick of realPicks) {
      const pos = realPick.player_position;
      
      // Find best available at that position
      let projectedPlayer = availablePlayers.find(p => p.position === pos);
      
      // If none found at that position, take BPA
      if (!projectedPlayer) {
        projectedPlayer = availablePlayers[0];
      }

      if (projectedPlayer) {
        results.push({
          pickNumber: realPick.pick_number,
          round: realPick.round,
          teamAbbr: realPick.team_abbr,
          teamLogo: realPick.team_logo,
          realPlayer: {
            name: realPick.player_name,
            position: realPick.player_position,
          },
          projectedPlayer: projectedPlayer,
        });
        // Remove from available for next iterations
        availablePlayers = availablePlayers.filter(p => p.id !== projectedPlayer.id);
      }
    }
    return results;
  }, [realPicks, boardData]);

  // Filter results for the selected team
  const teamProjectedPicks = useMemo(() => {
    return projectedData.filter(p => p.teamAbbr === selectedTeam.abbr);
  }, [projectedData, selectedTeam]);

  return (
    <div className="tracker-page">
      {/* ── Header ── */}
      <div className="tracker-header">
        <div className="tracker-brand">
          <a href="/tracker" className="tracker-back-btn" title="Voltar para o Tracker">
            <i className="fas fa-chevron-left"></i>
          </a>
          <div>
            <h1>Scout Projetado</h1>
            <span className="tracker-subtitle">Análise baseada em Big Boards vs Realidade</span>
          </div>
        </div>

        <div className="tracker-header-right">
          <div className="tracker-board-select">
            <span className="tracker-label">Big Board:</span>
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
        </div>
      </div>

      <div className="tracker-content">
        <div className="tracker-header-sticky">
          {/* Team selector similar to Teams view */}
          <div className="round-selector-sticky">
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.4rem', alignItems: 'center' }}>
              {ALL_TEAMS.map(t => (
                <button
                  key={t.abbr}
                  className={`team-filter-btn ${selectedTeam?.abbr === t.abbr ? 'active' : ''}`}
                  onClick={() => setSelectedTeam(t)}
                  title={t.team}
                >
                  <img src={t.logo} alt={t.abbr} className="team-filter-logo" />
                  <span className="team-filter-abbr">{t.abbr}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="tracker-board-list-container">
          {loading ? (
            <div className="tracker-loading">
              <i className="fas fa-spinner fa-spin"></i> Carregando dados reais...
            </div>
          ) : realPicks.length === 0 ? (
            <div className="tracker-empty-search" style={{ padding: '4rem', textAlign: 'center' }}>
              <i className="fas fa-clipboard-list" style={{ fontSize: '3rem', opacity: 0.2, marginBottom: '1rem', display: 'block' }}></i>
              Nenhuma escolha foi registrada no Tracker ainda.<br />
              Registre as picks no Tracker para ver a análise do Scout aqui.
            </div>
          ) : (
            <div className="tracker-board-list">
              <div className="scout-comparison-header hide-on-mobile">
                <div className="scout-col-pick">PICK</div>
                <div className="scout-col-real">REALIDADE</div>
                <div className="scout-col-arrow"></div>
                <div className="scout-col-projected">SCOUT PROJETADO</div>
                <div className="scout-col-diff">RANK</div>
              </div>

              {teamProjectedPicks.map((pick) => (
                <div key={pick.pickNumber} className="tracker-board-row scout-row">
                  <div className="tbr-rank">#{String(pick.pickNumber).padStart(2, '0')}</div>
                  
                  {/* Real Side */}
                  <div className="scout-side real-side">
                    <div className="tbr-pos">
                      <span className="tpr-pos-badge" style={{ 
                        background: `${posColor(pick.realPlayer.position)}18`, 
                        color: posColor(pick.realPlayer.position), 
                        borderColor: `${posColor(pick.realPlayer.position)}44` 
                      }}>
                        {pick.realPlayer.position}
                      </span>
                    </div>
                    <div className="tbr-name">
                      <span>{pick.realPlayer.name}</span>
                    </div>
                  </div>

                  <div className="scout-arrow">
                    <i className="fas fa-chevron-right"></i>
                  </div>

                  {/* Projected Side */}
                  <div className="scout-side projected-side">
                    <div className="tbr-pos">
                      <span className="tpr-pos-badge" style={{ 
                        background: `${posColor(pick.projectedPlayer.position)}18`, 
                        color: posColor(pick.projectedPlayer.position), 
                        borderColor: `${posColor(pick.projectedPlayer.position)}44` 
                      }}>
                        {pick.projectedPlayer.position}
                      </span>
                    </div>
                    <div className="tbr-name">
                      <span style={{ color: 'var(--accent-primary)' }}>{pick.projectedPlayer.name}</span>
                    </div>
                  </div>

                  {/* Big Board Rank of Projected Player */}
                  <div className="tbr-grade-col" style={{ marginLeft: 'auto' }}>
                    <span className="tbr-grade">#{pick.projectedPlayer.rank}</span>
                  </div>
                </div>
              ))}

              {teamProjectedPicks.length === 0 && (
                <div className="tracker-empty-search">Este time ainda não fez escolhas no draft real.</div>
              )}
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .scout-row {
          display: grid;
          grid-template-columns: 60px 1fr 40px 1fr 80px;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
        }
        .scout-comparison-header {
          display: grid;
          grid-template-columns: 60px 1fr 40px 1fr 80px;
          padding: 1rem;
          font-weight: 800;
          font-size: 0.75rem;
          color: var(--text-muted);
          letter-spacing: 0.1em;
          border-bottom: 1px solid var(--border-color);
        }
        .scout-side {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .scout-arrow {
          display: flex;
          justify-content: center;
          color: var(--text-muted);
          opacity: 0.5;
        }
        .projected-side .tbr-name {
          font-weight: 700;
        }
        @media (max-width: 768px) {
          .scout-row {
            grid-template-columns: 40px 1fr;
            grid-template-areas: "pick real" "pick proj" "pick rank";
            gap: 0.5rem;
          }
          .tbr-rank { grid-area: pick; }
          .real-side { grid-area: real; opacity: 0.7; font-size: 0.9rem; }
          .projected-side { grid-area: proj; }
          .scout-arrow { display: none; }
          .tbr-grade-col { grid-area: rank; margin-left: 0 !important; }
        }
      `}} />
    </div>
  );
}
