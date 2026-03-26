export function SkeletonCard({ index = 0 }: { index?: number }) {
  // Use index to deterministically but organically stagger the fade-in and set widths
  const delay = `${index * 100}ms`;
  const titleWidth = `${60 + (index % 3) * 15}%`; // Varies between 60%, 75%, 90%
  const line1Width = `${85 + (index % 2) * 10}%`; // Varies between 85%, 95%
  const line2Width = `${40 + (index % 4) * 10}%`; // Varies between 40%, 50%, 60%, 70%

  return (
    <div
      className="block bg-surface p-6 rounded-xl border border-border-subtle opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="w-16 h-4 bg-border-subtle rounded animate-pulse"></div>
      </div>
      <div className="h-6 bg-border-subtle rounded animate-pulse mt-2 mb-4" style={{ width: titleWidth }}></div>
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-border-subtle rounded animate-pulse" style={{ width: line1Width }}></div>
        <div className="h-4 bg-border-subtle rounded animate-pulse" style={{ width: line2Width }}></div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-border-subtle animate-pulse"></div>
          <div className="w-24 h-4 bg-border-subtle rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
