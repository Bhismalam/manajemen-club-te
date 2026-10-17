// Marka "T" di ujung lintasan dasar kolam: tanda klub, juga dipakai sebagai indikator item aktif.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <rect x="10.5" y="5" width="3" height="16" rx="1.5" fill="currentColor" />
      <rect x="5" y="3" width="14" height="3" rx="1.5" fill="currentColor" />
    </svg>
  );
}
