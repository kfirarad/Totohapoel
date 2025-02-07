import { format } from 'date-fns';
import { BetResult } from '@/types/database.types';
import { Input } from '@/components/ui/input';
import { TableCell, TableRow } from '@/components/ui/table';

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
    return (
        <button
            onClick={onClick}
            className={`
                ${small ? 'px-2 py-1 text-sm' : 'px-4 py-2'} rounded relative
                ${selected ? 'bg-blue-400 text-white' : 'bg-gray-100'}
            `}
        >
            {value}
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
                    placeholder="Paste game details here..."
                />
            </TableCell>
            <TableCell>
                <Input
                    value={homeTeam}
                    onChange={(e) => onGameChange('home_team', e.target.value)}
                    placeholder="Home Team"
                />
            </TableCell>
            <TableCell>
                <Input
                    value={awayTeam}
                    onChange={(e) => onGameChange('away_team', e.target.value)}
                    placeholder="Away Team"
                />
            </TableCell>
            <TableCell>
                <Input
                    type="datetime-local"
                    value={format(new Date(gameTime), "yyyy-MM-dd'T'HH:mm")}
                    onChange={(e) => onGameChange('game_time', new Date(e.target.value).toISOString())}
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