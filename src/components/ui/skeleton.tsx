import { cn } from "@/lib/utils";

/// Neutral pulsing placeholder used by route-level loading.tsx boundaries so
/// navigation swaps instantly while the server component streams in.
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}
