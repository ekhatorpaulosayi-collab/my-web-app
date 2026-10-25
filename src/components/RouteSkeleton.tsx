/** Placeholder blocks for a route that is still fetching. */
export function RouteSkeleton({ label }: { label: string }) {
  return (
    <div className="route-skeleton" role="status" aria-busy="true" aria-label={label}>
      <div className="ds-skel route-skeleton-title" />
      <div className="ds-skel route-skeleton-block" />
      <div className="ds-skel route-skeleton-block" />
      <div className="ds-skel route-skeleton-block" />
    </div>
  );
}
