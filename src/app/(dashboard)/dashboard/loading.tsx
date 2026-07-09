import { Skeleton } from "@/components/ui/skeleton";

// Instant navigation boundary: the router swaps to this skeleton immediately
// while DashboardPage resolves its DB queries and streams in.
export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-40" />

      <section className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </section>

      <section className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </section>

      <Skeleton className="h-40 w-full" />
    </div>
  );
}
