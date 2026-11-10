import { BetResult } from '@/types/database.types';
import { TableCell, TableRow } from '@/components/ui/table';
import { useTranslation } from 'react-i18next';
import { useMarketDates } from '@/i18n/dates';
import { useMarket } from '@/markets/useMarket';

interface GameRowProps {
    gameNum: number;
    competition: string;
    homeTeam: string;
    awayTeam: string;
    gameTime: string;
    result?: BetResult;
    isDeadlinePassed: boolean;
    userBet?: BetResult;
    onPlaceBet?: (value: BetResult) => void;
}

const BetButton = ({
    value,
    selected,
    disabled,
    onClick,
    result,
    small
}: {
    value: BetResult;
    selected: boolean;
    disabled: boolean;
    onClick: () => void;
    result?: BetResult;
    small?: boolean;
}) => {
    const isCorrect = result && selected && result === value;
    const isAnswer = result === value;
    const { outcomeLabels } = useMarket();

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                ${small ? 'px-2 py-1 text-sm' : 'px-4 py-2'} rounded relative
                ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted'}
                ${disabled ? 'opacity-90 cursor-not-allowed' : ''}
                ${isCorrect ? 'ring-2 ring-green-500 bg-opacity-40' : ''}                
                ${!selected && isAnswer ? 'ring-2 ring-red-500' : ''}
            `}
        >
            {value && outcomeLabels[value]}
        </button>
    );
};

export const GameRow = ({
    gameNum,
    competition,
    homeTeam,
    awayTeam,
    gameTime,
    result,
    isDeadlinePassed,
    userBet,
    onPlaceBet
}: GameRowProps) => {
    const { t } = useTranslation();
    const dates = useMarketDates();
    return (
        <TableRow>
            <TableCell className="font-medium p-4">
                {gameNum}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
                <div>{competition}</div>
                <div>{dates.dayName(gameTime)}, {dates.time(gameTime)}</div>
            </TableCell>
            <TableCell className="font-medium flex flex-col items-center justify-center md:flex-row md:gap-2 text-center">
                <div>{homeTeam}</div>
                <div className="text-muted-foreground">{t('common.vs')}</div>
                <div>{awayTeam}</div>
            </TableCell>
            <TableCell>
                <div className="flex gap-2 justify-center align-center flex-col">
                    {(['1', 'X', '2'] as BetResult[]).map((value) => (
                        <BetButton
                            key={value}
                            value={value}
                            selected={userBet === value}
                            disabled={isDeadlinePassed}
                            onClick={() => onPlaceBet?.(value)}
                            result={result}
                        />
                    ))}
                </div>
            </TableCell>
        </TableRow>
    );
}; 