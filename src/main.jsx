import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './lib/set-vh.js'
import { RootBoundary } from './components/RootBoundary.tsx'
import { BusinessProvider } from './contexts/BusinessProfile.jsx'

// Bypass landing page - go directly to app for development
localStorage.setItem('hasVisited', 'true');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootBoundary>
      <BusinessProvider>
        <App />
      </BusinessProvider>
    </RootBoundary>
  </StrictMode>,
)
