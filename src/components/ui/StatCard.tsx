export function StatCard({
  label,
  value,
  delta,
  loading = false,
}: {
  label: string;
  value: string;
  delta?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="ds-card" aria-busy="true">
        <div className="ds-skel" style={{ height: 12, width: 80, marginBottom: 12 }} />
        <div className="ds-skel" style={{ height: 28, width: 120 }} />
      </div>
    );
  }
  return (
    <div className="ds-card">
      <div className="ds-stat-label">{label}</div>
      <div className="ds-stat-value ds-money">{value}</div>
      {delta && <div style={{ marginTop: 6, color: '#15803d', fontSize: 14, fontWeight: 600 }}>{delta}</div>}
    </div>
  );
}
