import { cn } from "@/lib/utils";
import { BetResult } from "@/types/database.types";

interface BetButtonsProps {
    gameNum: number;
    userBet: Record<number, BetResult[]>;
    result: BetResult | null;
    disabled: boolean;
    onBetPlace: (gameNum: number, value: BetResult) => void;
    /** inline: compact segmented group; board: three equal full-width buttons (mobile scoreboard) */
    layout?: "inline" | "board";
}

/** null = no result yet; otherwise whether the bet includes the result */
export const betOutcome = (picks: BetResult[] | undefined, result: BetResult | null) =>
    result ? !!picks?.includes(result) : null;

export const BetButtons = ({
    gameNum,
    userBet,
    result,
    disabled,
    onBetPlace,
    layout = "inline",
}: BetButtonsProps) => {
    const board = layout === "board";
    const correct = betOutcome(userBet[gameNum], result);
    return (
        <div
            role="group"
            aria-label={`ניחוש למשחק ${gameNum}`}
            className={board ? "grid w-full grid-cols-3 gap-1" : "flex shrink-0 gap-0.5 rounded-xl bg-muted p-[3px]"}
        >
            {(['1', 'X', '2'] as const).map((value) => {
                const picked = !!userBet[gameNum]?.includes(value);
                const isResult = result === value;
                return (
                    <button
                        key={value}
                        aria-pressed={picked}
                        aria-label={`משחק ${gameNum}: ${value}${isResult ? ' (תוצאה)' : ''}`}
                        onClick={() => onBetPlace(gameNum, value)}
                        disabled={disabled}
                        className={cn(
                            'text-[15px] font-semibold transition-colors disabled:cursor-default',
                            board ? 'h-10 w-full rounded-[10px]' : 'h-11 w-10 rounded-[9px] md:w-11',
                            picked
                                ? 'bg-primary text-primary-foreground'
                                : board
                                ? 'bg-muted text-foreground enabled:hover:bg-accent'
                                : 'text-foreground enabled:hover:bg-card',
                            // after the result: hit = green, picks on a missed game = red,
                            // extra picks on a hit game fade, the real result is outlined green
                            picked && isResult && 'bg-success text-success-foreground',
                            picked && !isResult && correct === false && 'bg-error text-error-foreground',
                            picked && !isResult && correct === true && 'opacity-35',
                            !picked && isResult && 'ring-2 ring-inset ring-success'
                        )}
                    >
                        {value}
                    </button>
                );
            })}
        </div>
    );
};
