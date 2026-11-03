import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Teams } from "@/components/Teams";
import { cn } from "@/lib/utils";
import { Segmented } from "@/components/Segmented";
import type { BetResult, Game } from "@/types/database.types";

type Votes = { "1": number; X: number; "2": number; total: number };
type Hedge = { singles: number; doubles: number; triples: number };

const OUTCOMES = ["1", "X", "2"] as const;

// vote share -> heat step (thresholds 10/30/50/70%)
const HEAT = [
  "bg-muted text-muted-foreground",
  "bg-heat-1 text-heat-1-fg",
  "bg-heat-2 text-heat-2-fg",
  "bg-heat-3 text-heat-3-fg",
  "bg-heat-4 text-heat-4-fg",
];
const heatStep = (share: number) => (share >= 0.7 ? 4 : share >= 0.5 ? 3 : share >= 0.3 ? 2 : share >= 0.1 ? 1 : 0);

const HEDGE = [
  { key: "singles", label: "סינגל", className: "bg-hedge-1" },
  { key: "doubles", label: "כפול", className: "bg-hedge-2" },
  { key: "triples", label: "משולש", className: "bg-hedge-3" },
] as const;

/** 0 = everyone single, 1 = everyone triple */
const openness = (h?: Hedge) => {
  const n = h ? h.singles + h.doubles + h.triples : 0;
  return n ? (h!.doubles * 0.5 + h!.triples) / n : 0;
};

const HedgeBar = ({ hedge, className }: { hedge: Hedge; className?: string }) => {
  const n = hedge.singles + hedge.doubles + hedge.triples;
  if (!n) return null;
  return (
    <div className={cn("flex gap-0.5", className)} aria-hidden>
      {HEDGE.map((h) =>
        hedge[h.key] ? (
          <div key={h.key} className={cn("h-full rounded-full", h.className)} style={{ width: `${(hedge[h.key] / n) * 100}%` }} />
        ) : null
      )}
    </div>
  );
};

export const VoteHeatmap = <T extends string>({
  games,
  votes,
  hedge,
  picks,
  pickLabel,
  pickOptions,
  pickValue,
  onPickChange,
  participants,
}: {
  games: Game[];
  votes: Record<number, Votes | undefined>;
  hedge: Record<number, Hedge | undefined>;
  picks: Record<number, BetResult[]>;
  /** legend label for the framed picks, e.g. "הבחירה שלי" */
  pickLabel: string;
  /** whose picks can be framed; omitted when there's only one source */
  pickOptions?: { value: T; label: string }[];
  pickValue: T;
  onPickChange: (value: T) => void;
  participants: number;
}) => {
  const [sort, setSort] = useState<"num" | "open">("num");
  // hide the pick frames to look at the group's votes alone
  const [showPicks, setShowPicks] = useState(true);

  const total = games.reduce(
    (acc, g) => {
      const h = hedge[g.game_num];
      if (h) {
        acc.singles += h.singles;
        acc.doubles += h.doubles;
        acc.triples += h.triples;
      }
      return acc;
    },
    { singles: 0, doubles: 0, triples: 0 }
  );
  const totalN = total.singles + total.doubles + total.triples;
  const totalText = HEDGE.map((h) => `${totalN ? Math.round((total[h.key] / totalN) * 100) : 0}% ${h.label}`).join(" · ");

  const rows =
    sort === "open"
      ? [...games].sort((a, b) => openness(hedge[b.game_num]) - openness(hedge[a.game_num]) || a.game_num - b.game_num)
      : games;

  return (
    <div className="border-t">
      {/* Summary + legend */}
      <div className="flex flex-col gap-3 px-4 py-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Segmented
              label="סדר"
              value={sort}
              onChange={setSort}
              options={[
                { value: "num", label: "מס׳" },
                { value: "open", label: "הכי פתוח" },
              ]}
            />
            {showPicks && pickOptions && (
              <Segmented label="מסומן" value={pickValue} onChange={onPickChange} options={pickOptions} />
            )}
          </div>
          <span className="text-sm text-muted-foreground">{participants} משתתפים</span>
        </div>

        {totalN > 0 && (
          <div className="flex flex-col gap-1.5 rounded-xl bg-muted/60 px-3 py-2.5">
            <div className="flex flex-wrap justify-between gap-x-3 text-xs">
              <span className="font-semibold">פיזור בטור כולו</span>
              <span className="text-muted-foreground tabular-nums">{totalText}</span>
            </div>
            <HedgeBar hedge={total} className="h-2" />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            קולות 0%
            <span className="flex gap-0.5" aria-hidden>
              {HEAT.map((c, i) => (
                <span key={i} className={cn("h-2.5 w-3 rounded-sm", c.split(" ")[0])} />
              ))}
            </span>
            100%
          </span>
          <span className="flex items-center gap-2">
            {HEDGE.map((h) => (
              <span key={h.key} className="flex items-center gap-1">
                <span className={cn("size-2.5 rounded-sm", h.className)} aria-hidden />
                {h.label}
              </span>
            ))}
          </span>
          <button
            onClick={() => setShowPicks(!showPicks)}
            aria-pressed={showPicks}
            title={showPicks ? "הסתר סימון" : "הצג סימון"}
            className={cn(
              "-mx-1.5 flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-muted hover:text-foreground",
              !showPicks && "line-through"
            )}
          >
            <span className="size-3 rounded-[3px] ring-2 ring-inset ring-foreground" aria-hidden />
            {pickLabel}
            {showPicks ? <Eye className="size-3.5" aria-hidden /> : <EyeOff className="size-3.5" aria-hidden />}
          </button>
          {showPicks ? (
            <span className="flex items-center gap-1.5">
              תוצאה:
              <span className="flex items-center gap-1">
                <span className="h-[3px] w-3 rounded-full bg-success" aria-hidden />
                פגיעה
              </span>
              <span className="flex items-center gap-1">
                <span className="h-[3px] w-3 rounded-full bg-destructive" aria-hidden />
                החטאה
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <span className="h-[3px] w-3 rounded-full bg-foreground" aria-hidden />
              תוצאה
            </span>
          )}
        </div>
      </div>

      {/* Grid */}
      <div role="table" aria-label="הצבעות לפי משחק" className="px-4 pb-4 md:px-6">
        <div
          role="row"
          className="grid grid-cols-[22px_minmax(0,1fr)_repeat(3,50px)] items-center gap-1 pb-1.5 text-xs font-semibold text-muted-foreground md:grid-cols-[28px_minmax(0,1fr)_repeat(3,72px)]"
        >
          <span role="columnheader">#</span>
          <span role="columnheader">משחק · פיזור</span>
          {OUTCOMES.map((o) => (
            <span role="columnheader" key={o} className="text-center">{o}</span>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          {rows.map((game) => {
            const v = votes[game.game_num];
            const h = hedge[game.game_num];
            const shares = OUTCOMES.map((o) => (v?.total ? v[o] / v.total : 0));
            const lead = Math.max(...shares);
            const mine = picks[game.game_num] ?? [];
            return (
              <div
                role="row"
                key={game.game_num}
                className="grid grid-cols-[22px_minmax(0,1fr)_repeat(3,50px)] items-center gap-1 md:grid-cols-[28px_minmax(0,1fr)_repeat(3,72px)]"
              >
                <span role="cell" className="text-xs text-muted-foreground tabular-nums">{game.game_num}</span>
                <div role="cell" className="flex min-w-0 flex-col gap-1 pe-1.5">
                  <span className="truncate text-[13px] font-semibold md:text-sm">
                    <Teams game={game} />
                  </span>
                  {h && (
                    <>
                      <HedgeBar hedge={h} className="h-[5px]" />
                      <span className="truncate text-[11px] text-muted-foreground tabular-nums">
                        {h.singles} סינגל · {h.doubles} כפול · {h.triples} משולש
                      </span>
                    </>
                  )}
                </div>
                {OUTCOMES.map((o, i) => {
                  const isMine = showPicks && mine.includes(o);
                  const isResult = game.result === o;
                  const pct = Math.round(shares[i] * 100);
                  const hit = !!game.result && mine.includes(game.result);
                  const label = `משחק ${game.game_num}, ${o}: ${pct}%${isMine ? `, ${pickLabel}` : ""}${isResult ? (showPicks ? `, התוצאה (${hit ? "פגיעה" : "החטאה"})` : ", התוצאה") : ""}`;
                  return (
                    <div
                      role="cell"
                      key={o}
                      aria-label={label}
                      title={label}
                      className={cn(
                        "relative flex h-12 items-center justify-center rounded-lg text-[13px] tabular-nums md:text-sm",
                        HEAT[heatStep(shares[i])],
                        shares[i] === lead && lead > 0 ? "font-bold" : "font-medium",
                        // pick: ink ring with a surface gap so it reads on any heat step
                        isMine && "shadow-[inset_0_0_0_2px_hsl(var(--foreground)),inset_0_0_0_3.5px_hsl(var(--card))]"
                      )}
                    >
                      {v?.total ? `${pct}%` : "—"}
                      {isResult && (
                        // result marker: green = the marked picks hit, red = missed; card-colored halo keeps it visible on dark heat
                        <span
                          aria-hidden
                          className={cn(
                            "absolute inset-x-2 top-1 h-[3px] rounded-full shadow-[0_0_0_1.5px_hsl(var(--card))]",
                            !showPicks ? "bg-foreground" : hit ? "bg-success" : "bg-destructive"
                          )}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
