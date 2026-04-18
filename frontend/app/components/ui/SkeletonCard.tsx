export function SkeletonCard({ index = 0 }: { index?: number }) {
  const delay = `${index * 120}ms`;
  const titleWidth = `${60 + (index % 3) * 15}%`;
  const line1Width = `${85 + (index % 2) * 10}%`;
  const line2Width = `${40 + (index % 4) * 10}%`;

  return (
    <div
      className="block glass-card p-6 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-20 h-5 rounded-lg skeleton-shimmer"></div>
        <div className="w-14 h-4 rounded-lg skeleton-shimmer" style={{ animationDelay: '150ms' }}></div>
      </div>
      <div className="h-6 rounded-lg skeleton-shimmer mt-2 mb-4" style={{ width: titleWidth, animationDelay: '100ms' }}></div>
      <div className="space-y-2.5 mb-5">
        <div className="h-4 rounded-lg skeleton-shimmer" style={{ width: line1Width, animationDelay: '200ms' }}></div>
        <div className="h-4 rounded-lg skeleton-shimmer" style={{ width: line2Width, animationDelay: '300ms' }}></div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full skeleton-shimmer" style={{ animationDelay: '250ms' }}></div>
          <div className="w-28 h-4 rounded-lg skeleton-shimmer" style={{ animationDelay: '350ms' }}></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-4 rounded-lg skeleton-shimmer" style={{ animationDelay: '400ms' }}></div>
          <div className="w-10 h-4 rounded-lg skeleton-shimmer" style={{ animationDelay: '450ms' }}></div>
        </div>
      </div>
    </div>
  );
}
