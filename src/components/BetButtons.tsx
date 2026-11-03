import { cn } from "@/lib/utils";
import { BetResult } from "@/types/database.types";

interface BetButtonsProps {
    gameNum: number;
    userBet: Record<number, BetResult[]>;
    result: BetResult | null;
    disabled: boolean;
    onBetPlace: (gameNum: number, value: BetResult) => void;
}

/** null = no result yet; otherwise whether the bet includes the result */
export const betOutcome = (picks: BetResult[] | undefined, result: BetResult | null) =>
    result ? !!picks?.includes(result) : null;

export const BetButtons = ({
    gameNum,
    userBet,
    result,
    disabled,
    onBetPlace
}: BetButtonsProps) => {
    const correct = betOutcome(userBet[gameNum], result);
    return (
        <div role="group" aria-label={`ניחוש למשחק ${gameNum}`} className="flex shrink-0 gap-0.5 rounded-xl bg-muted p-[3px]">
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
                            'h-11 w-10 rounded-[9px] text-[15px] font-semibold transition-colors md:w-11',
                            'disabled:cursor-default',
                            picked
                                ? 'bg-primary text-primary-foreground'
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
