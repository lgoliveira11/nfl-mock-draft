import { useState } from 'react';
import { draftOrder as defaultDraftOrder, prospects as defaultProspects } from '../data/mockData';

export default function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [prospects, setProspects] = useState(defaultProspects);
  const [draftOrder, setDraftOrder] = useState(defaultDraftOrder);
  const [userTeam, setUserTeam] = useState(null);

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
    // parses a comma separated string into an array
    const needsArray = newNeedsStr.split(',')
      .map(n => n.trim().toUpperCase())
      .filter(n => n);
      
    // update state
    setDraftOrder(prev => prev.map(team => 
      team.abbr === teamAbbr ? { ...team, needs: needsArray } : team
    ));
  };

  const finishSetup = () => {
    if (!userTeam) {
      alert("Please select a team to control!");
      return;
    }
    // Pass the finalized configuration up to App
    onComplete({
      userTeam,
      prospects,
      draftOrder
    });
  };

  return (
    <div className="setup-screen" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left', minHeight: '80vh' }}>
      
      <div className="app-brand" style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1>Mock Draft Setup</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Configure your draft database before starting.</p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <button 
            className={`btn ${step === 1 ? 'btn-primary' : 'btn-outline'}`} 
            onClick={() => setStep(1)}
          >
            1. Player DB
          </button>
          <button 
            className={`btn ${step === 2 ? 'btn-primary' : 'btn-outline'}`} 
            onClick={() => setStep(2)}
          >
            2. Team Needs
          </button>
          <button 
            className={`btn ${step === 3 ? 'btn-primary' : 'btn-outline'}`} 
            onClick={() => setStep(3)}
          >
            3. Pick Team
          </button>
        </div>

        {step === 1 && (
          <div className="step-content">
            <h2 style={{ marginBottom: '1rem' }}>Player Big Board Data</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              By default, we load the consensus Top 40 prospects for the 2024 class. You can override this by uploading a JSON file containing an array of player objects (id, name, rank, position, school, grade).
            </p>
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <strong>Current Loaded Prospects: </strong> {prospects.length} players
            </div>
            
            <div style={{ marginTop: '1.5rem' }}>
              <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
                Upload Custom Prospects JSON
                <input 
                  type="file" 
                  accept=".json" 
                  style={{ display: 'none' }} 
                  onChange={(e) => handleFileUpload(e, 'prospects')}
                />
              </label>
            </div>
            
            <div style={{ marginTop: '2rem', textAlign: 'right' }}>
               <button className="btn btn-primary" onClick={() => setStep(2)}>Next: Team Needs &rarr;</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-content">
            <h2 style={{ marginBottom: '1rem' }}>Draft Order & Team Needs</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Review the current 1st Round order and adjust the immediate needs for any team. The CPU will use these primary needs to make smarter draft picks!
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', padding: '0.5rem 1rem' }}>
                Upload Custom Order JSON
                <input 
                  type="file" 
                  accept=".json" 
                  style={{ display: 'none' }} 
                  onChange={(e) => handleFileUpload(e, 'order')}
                />
              </label>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {draftOrder.map((team) => (
                <div key={team.pick} className="log-item" style={{ display: 'grid', gridTemplateColumns: '50px 150px 1fr', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 'bold' }}>#{team.pick}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{team.logo}</span>
                    <span>{team.abbr}</span>
                  </div>
                  <input 
                    type="text" 
                    value={team.needs ? team.needs.join(', ') : ''} 
                    onChange={(e) => handleTeamNeedChange(team.abbr, e.target.value)}
                    placeholder="e.g. QB, WR, EDGE"
                    style={{
                      background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'white', padding: '0.5rem', borderRadius: '4px', width: '100%', outline: 'none'
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
               <button className="btn btn-outline" onClick={() => setStep(1)}>&larr; Back</button>
               <button className="btn btn-primary" onClick={() => setStep(3)}>Next: Pick Your Team &rarr;</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step-content">
            <h2 style={{ marginBottom: '1rem' }}>Select Your Team</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Who will you draft for? The CPU will automate the picks for all other franchises based on their Team Needs and the BPA algorithm.
            </p>
            
            <div className="team-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
              {Array.from(new Set(draftOrder.map(t => t.abbr)))
                .map(abbr => draftOrder.find(t => t.abbr === abbr))
                .map(team => (
                <div 
                  key={team.abbr} 
                  className={`glass-panel team-card ${userTeam === team.abbr ? 'selected' : ''}`}
                  onClick={() => setUserTeam(team.abbr)}
                  style={{ padding: '1rem' }}
                >
                  <span className="team-logo-large" style={{ fontSize: '2rem' }}>{team.logo}</span>
                  <strong style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>{team.abbr}</strong>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
               <button className="btn btn-outline" onClick={() => setStep(2)}>&larr; Back</button>
               <button 
                  className="btn btn-primary" 
                  disabled={!userTeam}
                  style={{ opacity: userTeam ? 1 : 0.5 }}
                  onClick={finishSetup}
               >
                 Start Mock Draft! &rarr;
               </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
