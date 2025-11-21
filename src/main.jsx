import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './styles/tokens.css'
import AppRoutes from './AppRoutes.jsx'
import './lib/set-vh.js'
import { RootBoundary } from './components/RootBoundary.tsx'
import { BusinessProvider } from './contexts/BusinessProfile.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { PreferencesProvider } from './contexts/PreferencesContext.tsx'
import { StaffProvider } from './contexts/StaffContext.tsx'

// Bypass landing page - go directly to app for development
localStorage.setItem('hasVisited', 'true');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootBoundary>
      <BrowserRouter>
        <AuthProvider>
          <StaffProvider>
            <BusinessProvider>
              <PreferencesProvider>
                <AppRoutes />
              </PreferencesProvider>
            </BusinessProvider>
          </StaffProvider>
        </AuthProvider>
      </BrowserRouter>
    </RootBoundary>
  </StrictMode>,
)
