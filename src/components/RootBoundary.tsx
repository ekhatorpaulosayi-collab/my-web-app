import React from 'react';
import { captureError } from '../lib/sentry';

type Props = { children: React.ReactNode };
type State = { err: Error | null };

export class RootBoundary extends React.Component<Props, State> {
  state: State = { err: null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  componentDidCatch(err: Error) {
    captureError(err, { boundary: 'root' });
  }
  render() {
    if (this.state.err) {
      return (
        <div className="ds-legal">
          <h2>Something went wrong</h2>
          <p>Storehouse hit an unexpected error. Try reloading. If it continues, contact support and we will look it up.</p>
          <p><a href="mailto:storehouseapp@outlook.com">Contact support</a></p>
          <button type="button" className="ds-btn ds-btn-primary ds-btn-lg" onClick={() => location.reload()}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
