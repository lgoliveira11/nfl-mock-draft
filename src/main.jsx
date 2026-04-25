import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import DraftTracker from './DraftTracker.jsx'
import ScoutProjetado from './ScoutProjetado.jsx'
import Home from './Home.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tracker" element={<DraftTracker />} />
        <Route path="/scout" element={<ScoutProjetado />} />
        <Route path="/simulation" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
