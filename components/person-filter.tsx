export function PersonFilter({
  name,
  count,
  total,
  onClear,
}: {
  name: string
  count: number
  total: number
  onClear: () => void
}) {
  return (
    <div className="person-filter" data-person-filter="" aria-live="polite">
      <p className="person-filter__line">
        <span className="person-filter__who">Showing {name}&apos;s plans</span>
        <span className="person-filter__count">
          {count} of {total}
        </span>
      </p>
      <button type="button" className="person-filter__clear" onClick={onClear}>
        Show everyone
      </button>
    </div>
  )
}
