export function Skeleton({ width = '100%', height = 16 }: { width?: string | number; height?: string | number }) {
  return <div className="ds-skel" style={{ width, height }} aria-hidden="true" />;
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={48} />
      ))}
    </div>
  );
}
