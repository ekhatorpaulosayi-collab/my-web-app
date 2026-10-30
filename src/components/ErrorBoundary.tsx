import React from 'react';
import { captureError } from '../lib/sentry';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) { return { error }; }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info);
    captureError(error, { componentStack: info.componentStack });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="ds-legal">
          <h2>Something went wrong</h2>
          <p>This screen hit an error. Your sales data is still saved.</p>
          <p>
            <a href="mailto:storehouseapp@outlook.com">Contact support</a>
          </p>
          <button type="button" className="ds-btn ds-btn-primary ds-btn-lg" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
