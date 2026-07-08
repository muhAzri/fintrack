import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  accent,
  children,
}: {
  label: string;
  value: string;
  accent?: "positive" | "negative";
  children?: ReactNode;
}) {
  return (
    <Card className="gap-0 py-4">
      <CardContent className="px-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p
          className={cn(
            "mt-1 text-xl font-semibold tabular-nums",
            accent === "positive" && "text-green-600 dark:text-green-500",
            accent === "negative" && "text-destructive",
          )}
        >
          {value}
        </p>
        {children}
      </CardContent>
    </Card>
  );
}
