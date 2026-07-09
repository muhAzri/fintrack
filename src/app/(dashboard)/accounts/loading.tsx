import { Skeleton } from "@/components/ui/skeleton";

export default function AccountsLoading() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-24" />
      </div>

      <Skeleton className="h-36 w-full" />

      {Array.from({ length: 2 }).map((_, s) => (
        <section key={s} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <div className="overflow-hidden rounded-lg border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
