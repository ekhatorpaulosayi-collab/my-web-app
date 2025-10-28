import React from 'react';
type Props = { children: React.ReactNode };
type State = { error: Error | null };
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch() { /* noop: we just isolate errors */ }
  render() {
    if (this.state.error) {
      return <div style={{padding:16}}>Something went wrong here. Please close and try again.</div>;
    }
    return this.props.children;
  }
}
