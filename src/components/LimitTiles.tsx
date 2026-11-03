import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/** Filled / doubles / triples progress tiles, shared by the player column and the admin group bet */
export const LimitTiles = ({
  filled,
  total,
  doubles,
  maxDoubles,
  triples,
  maxTriples,
  loading,
}: {
  filled: number;
  total: number;
  doubles: number;
  maxDoubles: number;
  triples: number;
  maxTriples: number;
  loading?: boolean;
}) => {
  const tiles = [
    { label: "מלאים", n: filled, max: total, strict: false },
    { label: "כפולים", n: doubles, max: maxDoubles, strict: true },
    { label: "משולשים", n: triples, max: maxTriples, strict: true },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 md:w-96">
      {tiles.map((t) => {
        if (loading) return <Skeleton key={t.label} className="h-[54px] rounded-xl" />;
        const over = t.strict && t.n > t.max;
        const done = !over && t.n === t.max;
        return (
          <div key={t.label} className="rounded-xl bg-muted p-2.5">
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xs text-muted-foreground">{t.label}</span>
              <span className={cn("font-semibold tabular-nums", over && "text-destructive", done && "text-success")}>
                {t.n}/{t.max}
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border">
              <div
                className={cn("h-full rounded-full bg-foreground transition-[width]", over && "bg-destructive", done && "bg-success")}
                style={{ width: `${t.max ? Math.min(100, (t.n / t.max) * 100) : 0}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
