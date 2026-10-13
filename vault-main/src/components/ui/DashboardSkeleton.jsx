import { Skeleton } from "./Skeleton";

/**
 * Stand-in for a dashboard page while its data loads: the page's shape (stat
 * cards, then table rows or a card grid) with skeleton values, instead of a
 * blank "Loading..." line. Matches the dashboard's #272727 cards.
 */
export function DashboardSkeleton({ stats = 0, rows = 0, cards = 0 }) {
  return (
    <div className="space-y-6 text-white" aria-busy="true" aria-label="Loading">
      {stats > 0 && (
        <div className={`grid gap-4 md:grid-cols-2 ${stats >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          {Array.from({ length: stats }, (_, i) => (
            <div key={i} className="flex flex-col gap-4 bg-[#272727] p-6">
              <Skeleton className="h-[1em] w-24" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-[1em] w-36" />
            </div>
          ))}
        </div>
      )}
      {rows > 0 && (
        <div className="flex flex-col divide-y divide-white/5 bg-[#272727]">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center justify-between gap-6 p-5">
              <Skeleton className="h-[1em] w-1/3" />
              <Skeleton className="h-[1em] w-20" />
              <Skeleton className="h-[1em] w-16" />
            </div>
          ))}
        </div>
      )}
      {cards > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: cards }, (_, i) => (
            <div key={i} className="flex flex-col gap-4 bg-[#272727] p-4">
              <Skeleton className="aspect-video w-full" />
              <Skeleton className="h-[1em] w-1/2" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
