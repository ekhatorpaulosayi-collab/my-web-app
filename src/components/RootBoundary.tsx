import React from 'react';

type Props = { children: React.ReactNode };
type State = { err: Error | null };

export class RootBoundary extends React.Component<Props, State> {
  state: State = { err: null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  componentDidCatch() { /* log could go here */ }
  render() {
    if (this.state.err) {
      return (
        <div style={{padding:24, maxWidth:720, margin:'56px auto', fontFamily:'system-ui'}}>
          <h2>Something went wrong</h2>
          <p>We hit an unexpected error. Try reloading the page.</p>
          <pre style={{whiteSpace:'pre-wrap', background:'#f6f7f9', padding:12, borderRadius:8}}>
            {String(this.state.err?.message ?? 'Unknown error')}
          </pre>
          <button onClick={()=>location.reload()} style={{marginTop:12, padding:'10px 14px', borderRadius:8, border:'1px solid #d0d7de', background:'#fff', cursor:'pointer'}}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
