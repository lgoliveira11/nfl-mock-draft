import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  const [showSoon, setShowSoon] = useState(false);

  return (
    <div className="home-container">
      <div className="home-content">
        <header className="home-header">
          <div className="home-logo-area">
            <img src="https://static.www.nfl.com/image/upload/v1554321393/league/ov6696vnrxy968uaxv7y.svg" alt="NFL" className="home-nfl-logo" />
            <div className="home-divider"></div>
            <h1 className="home-title">MOCK DRAFT <span className="text-accent">2026</span></h1>
          </div>
          <p className="home-subtitle">A experiência definitiva de simulação e acompanhamento do Draft da NFL.</p>
        </header>

        <div className="home-cards">
          {/* Draft Tracker Card */}
          <div className="home-card" onClick={() => navigate('/tracker')}>
            <div className="home-card-icon">
              <i className="fas fa-satellite-dish"></i>
            </div>
            <div className="home-card-info">
              <h2>Draft Tracker</h2>
              <p>Acompanhe as escolhas em tempo real, gerencie trocas e visualize o board atualizado ao vivo.</p>
              <div className="home-card-badge">LIVE</div>
            </div>
            <button className="home-card-btn">Acessar Tracker</button>
          </div>

          {/* Mock Draft Card */}
          <div className="home-card coming-soon" onClick={() => setShowSoon(true)}>
            <div className="home-card-icon">
              <i className="fas fa-football"></i>
            </div>
            <div className="home-card-info">
              <h2>Mock Draft Simulator</h2>
              <p>Simule o seu próprio draft, tome decisões estratégicas e veja como o seu time se reconstrói.</p>
              <div className="home-card-badge-soon">EM BREVE</div>
            </div>
            <button className="home-card-btn-soon">Aguarde</button>
          </div>
        </div>

        <footer className="home-footer">
          <p>&copy; 2026 NFL Draft Companion · Criado para fãs de futebol americano.</p>
        </footer>
      </div>

      {/* "Em Breve" Modal */}
      {showSoon && (
        <div className="tracker-modal-overlay" onClick={() => setShowSoon(false)}>
          <div className="tracker-modal" onClick={e => e.stopPropagation()} style={{textAlign: 'center', padding: '2.5rem'}}>
            <div className="home-card-icon" style={{margin: '0 auto 1.5rem', color: '#fbbf24'}}>
              <i className="fas fa-clock"></i>
            </div>
            <h2 style={{fontSize: '1.8rem', marginBottom: '1rem'}}>Simulador em Breve!</h2>
            <p style={{color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem'}}>
              Estamos finalizando os ajustes finos no motor de simulação para garantir a melhor experiência. 
              Por enquanto, use o <strong>Draft Tracker</strong> para acompanhar o evento ao vivo!
            </p>
            <button className="btn-save-tracker" style={{width: '100%', justifyContent: 'center'}} onClick={() => setShowSoon(false)}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
