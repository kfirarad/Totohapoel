import { useTranslation } from 'react-i18next';
import { BetResult } from '@/types/database.types';
import { Input } from '@/components/ui/input';
import { TableCell, TableRow } from '@/components/ui/table';
import { formatInTz } from '@/i18n/dates';
import { useMarket } from '@/markets/useMarket';
import { zonedLocalToIso } from '@/markets/time';

interface GameFormRowProps {
    gameNum: number;
    competition: string;
    homeTeam: string;
    awayTeam: string;
    gameTime: string;
    result?: BetResult;
    isDeadlinePassed: boolean;
    onGameChange: (field: string, value: string) => void;
    onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
    onSetResult?: (value: BetResult) => void;
}

const BetButton = ({
    value,
    selected,
    onClick,
    small = true
}: {
    value: BetResult;
    selected: boolean;
    onClick: () => void;
    small?: boolean;
}) => {
    const { outcomeLabels } = useMarket();
    return (
        <button
            onClick={onClick}
            className={`
                ${small ? 'px-2 py-1 text-sm' : 'px-4 py-2'} rounded relative
                ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted'}
            `}
        >
            {value && outcomeLabels[value]}
        </button>
    );
};

export const GameFormRow = ({
    gameNum,
    competition,
    homeTeam,
    awayTeam,
    gameTime,
    result,
    isDeadlinePassed,
    onGameChange,
    onPaste,
    onSetResult
}: GameFormRowProps) => {
    const { t } = useTranslation();
    const { timeZone } = useMarket();
    return (
        <TableRow>
            <TableCell className="font-medium">
                {gameNum}
            </TableCell>
            <TableCell>
                <Input
                    value={competition}
                    onChange={(e) => onGameChange('competition', e.target.value)}
                    onPaste={onPaste}
                    placeholder={t('admin.columnForm.pasteGameHere')}
                />
            </TableCell>
            <TableCell>
                <Input
                    value={homeTeam}
                    onChange={(e) => onGameChange('home_team', e.target.value)}
                    placeholder={t('admin.columnForm.homeTeam')}
                />
            </TableCell>
            <TableCell>
                <Input
                    value={awayTeam}
                    onChange={(e) => onGameChange('away_team', e.target.value)}
                    placeholder={t('admin.columnForm.awayTeam')}
                />
            </TableCell>
            <TableCell>
                <Input
                    type="datetime-local"
                    value={formatInTz(gameTime, "yyyy-MM-dd'T'HH:mm", timeZone)}
                    onChange={(e) => onGameChange('game_time', zonedLocalToIso(e.target.value, timeZone))}
                />
            </TableCell>
            {isDeadlinePassed && onSetResult && (
                <TableCell>
                    <div className="flex gap-2 justify-center">
                        {(['1', 'X', '2'] as BetResult[]).map((value) => (
                            <BetButton
                                key={value}
                                value={value}
                                selected={result === value}
                                onClick={() => onSetResult(value)}
                            />
                        ))}
                    </div>
                </TableCell>
            )}
        </TableRow>
    );
};