import React from 'react';

type PillState = 'connected' | 'not_connected' | 'error' | 'updating';

interface StatusPillProps {
  state: PillState;
  label?: string;
}

const DEFAULT_LABELS: Record<PillState, string> = {
  connected: 'Connected',
  not_connected: 'Not connected',
  error: 'Error',
  updating: 'Updating…'
};

export function StatusPill({ state, label }: StatusPillProps) {
  const text = label ?? DEFAULT_LABELS[state];
  return <span className={`stx-pill ${state}`}>{text}</span>;
}
