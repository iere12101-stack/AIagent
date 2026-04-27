export function ConversationListSkeleton() {
  return (
    <div className="divide-y divide-white/[0.04]">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex items-start gap-3 px-4 py-3">
          <div className="h-9 w-9 animate-pulse rounded-full bg-white/[0.06]" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <div className="h-3 w-28 animate-pulse rounded bg-white/[0.06]" />
              <div className="h-2 w-12 animate-pulse rounded bg-white/[0.04]" />
            </div>
            <div className="h-2.5 w-48 animate-pulse rounded bg-white/[0.04]" />
            <div className="flex gap-1.5">
              <div className="h-4 w-10 animate-pulse rounded bg-white/[0.04]" />
              <div className="h-4 w-14 animate-pulse rounded bg-white/[0.04]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
