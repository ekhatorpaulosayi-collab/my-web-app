import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStaff } from '../contexts/StaffContext';
import { AppShell } from './layout/AppShell';

/**
 * Protected Route Component
 * Redirects to /login if user is not authenticated
 * Shows loading spinner while checking auth state
 */
export default function ProtectedRoute({ children, ownerOnly = false, blockCashier = false, devOnly = false, skeleton = null }) {
  const { currentUser, loading } = useAuth();
  const { isStaffMode, currentRole, roleReady } = useStaff();

  console.warn('🔐 [ProtectedRoute] Checking auth:', {
    hasUser: !!currentUser,
    userId: currentUser?.uid,
    email: currentUser?.email,
    loading: loading,
    path: window.location.pathname
  });

  // Show loading spinner while checking auth state
  if (loading || (currentUser && !roleReady)) {
    console.warn('🔐 [ProtectedRoute] Still loading auth...');
    if (skeleton) return skeleton;
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e5e7eb',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    console.warn('🔐 [ProtectedRoute] User NOT authenticated, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  // M17: debug/test pages are only reachable in local development builds
  if (devOnly && !import.meta.env.DEV) {
    return <Navigate to="/dashboard" replace />;
  }

  // H1: staff (cashier/manager) sessions can't open owner-only pages by URL.
  // Cashiers also can't open money, export, or customer routes. The role is
  // the server session, not localStorage.
  if (ownerOnly && isStaffMode) {
    return <Navigate to="/dashboard" replace />;
  }
  if (blockCashier && currentRole === 'cashier') {
    return <Navigate to="/dashboard" replace />;
  }

  // User is authenticated, render children inside the app shell (side nav / bottom tabs).
  console.warn('🔐 [ProtectedRoute] User authenticated, rendering protected content');
  return <AppShell>{children}</AppShell>;
}
