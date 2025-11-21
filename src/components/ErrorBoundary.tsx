import React from 'react';
type Props = { children: React.ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) { return { error }; }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16 }}>
          <h2 style={{ margin: '8px 0' }}>Something went wrong</h2>
          <p style={{ color: '#6b7280' }}>Please try again.</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 12,
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              background: '#fff',
              cursor: 'pointer'
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
