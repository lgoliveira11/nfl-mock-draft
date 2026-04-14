import { useState } from 'react';
import { draftOrder as defaultDraftOrder, prospects as defaultProspects } from '../data/mockData';

export default function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [prospects, setProspects] = useState(defaultProspects);
  const [draftOrder, setDraftOrder] = useState(defaultDraftOrder);
  const [userTeams, setUserTeams] = useState([]);
  const [numRounds, setNumRounds] = useState(3);

  const handleFileUpload = (event, type) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (type === 'prospects') setProspects(data);
        if (type === 'order') setDraftOrder(data);
        alert('File loaded successfully!');
      } catch (err) {
        alert('Error parsing JSON file. Please ensure it is correctly formatted.');
      }
    };
    reader.readAsText(file);
  };

  const handleTeamNeedChange = (teamAbbr, newNeedsStr) => {
    const needsArray = newNeedsStr.split(',')
      .map(n => n.trim().toUpperCase())
      .filter(n => n);
      
    setDraftOrder(prev => prev.map(team => 
      team.abbr === teamAbbr ? { ...team, needs: needsArray } : team
    ));
  };

  const finishSetup = () => {
    if (userTeams.length === 0) {
      alert("Please select at least one team to control!");
      return;
    }
    const multiRoundOrder = draftOrder.filter(pick => pick.round <= numRounds);
    onComplete({
      userTeams,
      prospects,
      draftOrder: multiRoundOrder,
      numRounds
    });
  };

  return (
    <div className="setup-screen setup-container">
      
      <div className="setup-header">
        <h1>Mock Draft Setup</h1>
        <p>Configure your draft database before starting.</p>
      </div>

      <div className="glass-panel setup-panel">
        <div className="wizard-navigation-header">
          <button 
            className="btn btn-outline btn-sm nav-btn" 
            onClick={() => setStep(prev => prev - 1)}
            disabled={step === 1}
          >
            &larr; Voltar
          </button>
          
          <div className="step-tabs">
            <button 
              className={`step-tab-indicator ${step === 1 ? 'active' : ''}`} 
              onClick={() => setStep(1)}
              title="Player DB"
            >
              1
            </button>
            <div className="step-line"></div>
            <button 
              className={`step-tab-indicator ${step === 2 ? 'active' : ''}`} 
              onClick={() => setStep(2)}
              title="Team Needs"
            >
              2
            </button>
            <div className="step-line"></div>
            <button 
              className={`step-tab-indicator ${step === 3 ? 'active' : ''}`} 
              onClick={() => setStep(3)}
              title="Pick Team"
            >
              3
            </button>
          </div>

          {step === 3 ? (
            <button 
              className="btn btn-primary btn-sm nav-btn" 
              disabled={userTeams.length === 0}
              onClick={finishSetup}
            >
              Iniciar Draft! &rarr;
            </button>
          ) : (
            <button 
              className="btn btn-primary btn-sm nav-btn" 
              onClick={() => setStep(prev => prev + 1)}
            >
              Próximo &rarr;
            </button>
          )}
        </div>

        {step === 1 && (
          <div className="step-content">
            <h2>Player Big Board Data</h2>
            <p className="step-description">
              By default, we load the consensus Top 200 prospects. You can override this by uploading a JSON file.
            </p>
            <div className="content-info-box">
              <strong>Current Loaded Prospects: </strong> {prospects.length} players
            </div>
            
            <div className="upload-section">
              <label className="btn btn-outline file-label">
                Upload Custom Prospects JSON
                <input 
                   type="file" 
                   accept=".json" 
                   style={{ display: 'none' }} 
                   onChange={(e) => handleFileUpload(e, 'prospects')}
                />
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-content">
            <h2>Draft Order & Team Needs</h2>
            <p className="step-description">
              Review current needs. The CPU uses these for smarter picks!
            </p>
            
            <div className="upload-section">
              <label className="btn btn-outline btn-sm file-label">
                Upload Custom Order JSON
                <input 
                  type="file" 
                  accept=".json" 
                  style={{ display: 'none' }} 
                  onChange={(e) => handleFileUpload(e, 'order')}
                />
              </label>
            </div>

            <div className="needs-scroll-container">
              {Array.from(new Set(draftOrder.map(t => t.abbr)))
                .map(abbr => draftOrder.find(t => t.abbr === abbr))
                .sort((a, b) => a.team.localeCompare(b.team))
                .map((team) => (
                <div key={team.abbr} className="needs-item">
                  <div className="needs-team-info">
                    <span className="abbr-badge">{team.abbr}</span>
                    <img src={team.logo} alt={team.abbr} />
                    <span className="team-name">{team.team}</span>
                  </div>
                  <input 
                    type="text" 
                    value={team.needs ? team.needs.join(', ') : ''} 
                    onChange={(e) => handleTeamNeedChange(team.abbr, e.target.value)}
                    placeholder="e.g. QB, WR, EDGE"
                    className="needs-input"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step-content">
            <h2>Select Your Team</h2>
            <p className="step-description">
              Who will you draft for?
            </p>
            <div className="config-row">
              <strong className="config-label">Duração do Draft:</strong>
              <select 
                value={numRounds}
                onChange={(e) => setNumRounds(Number(e.target.value))}
                className="config-select"
              >
                {[1, 2, 3, 4, 5, 6, 7].map(r => (
                  <option key={r} value={r}>{r} Rodada{r > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
            
            <div className="bulk-actions">
              <button className="btn btn-outline btn-sm" onClick={() => setUserTeams(Array.from(new Set(draftOrder.map(t => t.abbr))))}>
                Selecionar Todos
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => setUserTeams([])}>
                Limpar Seleção
              </button>
            </div>
            
            <div className="team-grid selection-grid">
              {Array.from(new Set(draftOrder.map(t => t.abbr)))
                .map(abbr => draftOrder.find(t => t.abbr === abbr))
                .map(team => (
                <div 
                  key={team.abbr} 
                  className={`glass-panel team-card ${userTeams.includes(team.abbr) ? 'selected' : ''}`}
                  onClick={() => setUserTeams(prev => prev.includes(team.abbr) ? prev.filter(t => t !== team.abbr) : [...prev, team.abbr])}
                >
                  <img src={team.logo} alt={team.abbr} className="team-logo-large" />
                  <strong className="team-abbr-text">{team.abbr}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
