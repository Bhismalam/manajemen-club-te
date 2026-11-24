// Monogram TE mengikuti aset ikon aplikasi; penanda navigasi tetap memakai marka lintasan.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" className={className}>
      <path fill="currentColor" d="M0 0h512v512H0z" />
      <path
        className="text-primary-foreground"
        fill="currentColor"
        d="M112 164h128v32h-48v152h-32V196h-48zM272 164h128v32h-96v44h80v32h-80v44h96v32H272z"
      />
    </svg>
  );
}
