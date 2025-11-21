import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Protected Route Component
 * Redirects to /login if user is not authenticated
 * Shows loading spinner while checking auth state
 */
export default function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();

  // Show loading spinner while checking auth state
  if (loading) {
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
    console.debug('[ProtectedRoute] User not authenticated, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, render children
  return children;
}
