import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const tiles = [
    { key: "filled", label: t("limits.filled"), n: filled, max: total, strict: false },
    { key: "doubles", label: t("limits.doubles"), n: doubles, max: maxDoubles, strict: true },
    { key: "triples", label: t("limits.triples"), n: triples, max: maxTriples, strict: true },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 md:w-96">
      {tiles.map((tile) => {
        if (loading) return <Skeleton key={tile.key} className="h-[54px] rounded-xl" />;
        const over = tile.strict && tile.n > tile.max;
        const done = !over && tile.n === tile.max;
        return (
          <div key={tile.key} className="rounded-xl bg-muted p-2.5">
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xs text-muted-foreground">{tile.label}</span>
              <span className={cn("font-semibold tabular-nums", over && "text-destructive", done && "text-success")}>
                {tile.n}/{tile.max}
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border">
              <div
                className={cn("h-full rounded-full bg-foreground transition-[width]", over && "bg-destructive", done && "bg-success")}
                style={{ width: `${tile.max ? Math.min(100, (tile.n / tile.max) * 100) : 0}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
