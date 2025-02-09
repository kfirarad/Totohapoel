import { cn } from "@/lib/utils";
import { BetResult } from "@/types/database.types";

interface BetButtonsProps {
    gameNum: number;
    userBet: Record<number, BetResult[]>;
    result: BetResult | null;
    isDeadlinePassed: boolean;
    onBetPlace: (gameNum: number, value: BetResult) => void;
}

export const BetButtons = ({
    gameNum,
    userBet,
    result,
    isDeadlinePassed,
    onBetPlace
}: BetButtonsProps) => {

    return (
        <div className="flex flex-row gap-2 justify-center items-center">
            {(['1', 'X', '2'] as const).map((value) => (
                <button
                    key={value}
                    onClick={() => onBetPlace(gameNum, value)}
                    disabled={isDeadlinePassed}
                    className={cn(
                        'px-4 py-2 rounded font-medium transition-colors',
                        userBet[gameNum]?.includes(value)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80',
                        isDeadlinePassed && 'opacity-50 cursor-not-allowed',
                        result === value && userBet[gameNum]?.includes(value) && 'ring-4 ring-green-500',
                        result === value && !userBet[gameNum]?.includes(value) && 'ring-4 ring-red-500'
                    )}
                >
                    {value}
                </button>
            ))}
        </div>
    );
};
