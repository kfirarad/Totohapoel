import { useEffect, useMemo, useState } from 'react';
import { Teams } from '@/components/Teams';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Minus, Plus } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { BetResult, Column } from '@/types/database.types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useMarketDates } from '@/i18n/dates';
import { useMarket } from '@/markets/useMarket';
import { BetButtons } from '@/components/BetButtons';
import { Banner } from '@/components/Banner';
import { LimitTiles } from '@/components/LimitTiles';
import { Segmented } from '@/components/Segmented';
import { useSeasonDataQuery } from '@/hooks/useQueries';
import { useCurrentGroup } from '@/groups/useGroup';
import { toGroupColumn, type GroupColumnRow } from '@/groups/groupColumn';
import { autoFillGroupBet, formVotes, formWeights, readAlgoSettings, writeAlgoSettings, type AlgoSettings } from '@/lib/stats';

type OrderBy = 'game_num' | 'game_time';
type Limits = { doubles: number; triples: number };

const Stepper = ({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) => {
    const { t } = useTranslation();
    return (
    <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center rounded-lg bg-muted p-0.5">
            <button
                aria-label={t('groupBet.decrease', { label })}
                disabled={value <= min}
                onClick={() => onChange(value - 1)}
                className="flex size-8 items-center justify-center rounded-md enabled:hover:bg-card disabled:opacity-40"
            >
                <Minus className="size-3.5" aria-hidden />
            </button>
            <span className="w-7 text-center font-semibold tabular-nums" aria-live="polite">{value}</span>
            <button
                aria-label={t('groupBet.increase', { label })}
                disabled={value >= max}
                onClick={() => onChange(value + 1)}
                className="flex size-8 items-center justify-center rounded-md enabled:hover:bg-card disabled:opacity-40"
            >
                <Plus className="size-3.5" aria-hidden />
            </button>
        </div>
    </div>
    );
};
const OUTCOMES = ['1', 'X', '2'] as const;

export const GroupBet = () => {
    const { t, i18n } = useTranslation();
    const dates = useMarketDates();
    const { outcomeLabels } = useMarket();
    const group = useCurrentGroup();
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState<'ok' | 'fail' | null>(null);
    const [orderBy, setOrderBy] = useState<OrderBy>('game_num');
    const [userBet, setUserBet] = useState<Record<number, BetResult[]>>({});
    const [column, setColumn] = useState<Column | null>(null);
    // the group bet's own doubles/triples budget (defaults to the players' limits)
    const [limits, setLimits] = useState<Limits>({ doubles: 0, triples: 0 });

    const [algo, setAlgo] = useState<AlgoSettings>(readAlgoSettings);
    const updateAlgo = (patch: Partial<AlgoSettings>) => {
        const next = { ...algo, ...patch };
        setAlgo(next);
        writeAlgoSettings(next);
    };
    const { data: season, isLoading: isSeasonLoading } = useSeasonDataQuery();
    const votes = useMemo(() => {
        if (!season || !column?.id) return null;
        const weightOf = formWeights(season.columns, season.bets, new Date(column.deadline), algo.formWeeks, algo.power);
        return formVotes(season.bets.filter((b) => b.column_id === column.id), weightOf);
    }, [season, column?.id, column?.deadline, algo]);

    // /admin/group-bet/:columnId edits that column; without an id, the newest active one
    const { columnId } = useParams();
    useEffect(() => {
        const fetchLatestColumn = async () => {
            // the group's view of the column (its limits and its group bet)
            const query = supabase.from('columns').select('*, group_columns!inner(*)').eq('group_columns.group_id', group.id);
            const { data: row, error } = await (columnId
                ? query.eq('id', columnId).maybeSingle()
                : query.eq('group_columns.is_active', true).eq('group_columns.is_archived', false)
                    .order('deadline', { ascending: false }).limit(1).maybeSingle());

            if (error) {
                console.error(error);
                setLoadError(true);
            } else if (row) {
                const data = toGroupColumn(row as GroupColumnRow, group);
                setColumn(data);
                setLimits({
                    doubles: data.group_max_doubles ?? data.max_doubles ?? 0,
                    triples: data.group_max_triples ?? data.max_triples ?? 0,
                });
                const formattedBets: Record<number, BetResult[]> = {};
                (data.group_bet ?? []).forEach((bet) => {
                    formattedBets[Number(bet.game_num)] = bet.value;
                });
                setUserBet(formattedBets);
            }
            setLoading(false);
        };
        setLoading(true);
        fetchLatestColumn();
    }, [columnId, group]);

    useEffect(() => {
        if (notice !== 'ok') return;
        const t = setTimeout(() => setNotice(null), 3500);
        return () => clearTimeout(t);
    }, [notice]);

    const counts = useMemo(() => {
        const values = Object.values(userBet);
        return {
            filled: values.filter((b) => b.length > 0).length,
            doubles: values.filter((b) => b.length === 2).length,
            triples: values.filter((b) => b.length === 3).length,
        };
    }, [userBet]);

    const games = useMemo(
        () =>
            [...(column?.games ?? [])].sort((a, b) =>
                orderBy === 'game_time'
                    ? new Date(a.game_time).getTime() - new Date(b.game_time).getTime() || a.game_num - b.game_num
                    : a.game_num - b.game_num
            ),
        [column?.games, orderBy]
    );

    const handlePlaceBet = (gameNum: number, value: BetResult) => {
        const bet = userBet[gameNum] || [];
        setUserBet({
            ...userBet,
            [gameNum]: bet.includes(value) ? bet.filter((v) => v !== value) : [...bet, value],
        });
        setNotice(null);
    };

    const fillFromAlgo = () => {
        if (!votes || !column?.games) return;
        setUserBet(autoFillGroupBet(
            column.games.map((g) => g.game_num),
            votes,
            limits.doubles,
            limits.triples,
        ));
        setNotice(null);
    };

    const save = async () => {
        if (!column) return;
        setSaving(true);
        setNotice(null);
        const groupBet = Object.entries(userBet).map(([game_num, value]) => ({
            game_num: parseInt(game_num),
            value,
        }));
        const { data, error } = await supabase
            .from('group_columns')
            .update({
                group_bet: groupBet,
                // store only when it differs, so the group bet keeps following the players' limits otherwise
                group_bet_max_doubles: limits.doubles === (column.max_doubles ?? 0) ? null : limits.doubles,
                group_bet_max_triples: limits.triples === (column.max_triples ?? 0) ? null : limits.triples,
            })
            .eq('group_id', group.id)
            .eq('column_id', column.id)
            .select('column_id');
        setSaving(false);
        if (error || !data?.length) {
            console.error(error);
            setNotice('fail');
        } else {
            setNotice('ok');
        }
    };

    if (loading) {
        return (
            <div className="space-y-4" aria-busy="true">
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-32 rounded-2xl" />
                <Skeleton className="h-96 rounded-2xl" />
            </div>
        );
    }
    if (loadError) return <div className="p-4">{t('groupBet.loadError')}</div>;
    if (!column) return <div className="p-4 text-muted-foreground">{t('column.noActive')}</div>;

    const total = column.games?.length ?? 0;
    const canSave =
        !saving &&
        counts.filled >= total &&
        counts.doubles <= limits.doubles &&
        counts.triples <= limits.triples;
    const playerLimits = { doubles: column.max_doubles ?? 0, triples: column.max_triples ?? 0 };
    const customLimits = limits.doubles !== playerLimits.doubles || limits.triples !== playerLimits.triples;
    // number of toto rows the group column costs: 2 per double, 3 per triple
    const rows = 2 ** limits.doubles * 3 ** limits.triples;
    const updateLimits = (patch: Partial<Limits>) => {
        setLimits({ ...limits, ...patch });
        setNotice(null);
    };
    const isDeadlinePassed = new Date(column.deadline) < new Date();

    return (
        <div className="space-y-4 pb-28">
            {/* Header */}
            <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4 md:flex-row md:items-center md:justify-between md:p-6">
                <div>
                    <Link to="/admin/columns" className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                        <ChevronRight className="size-4 ltr:-scale-x-100" aria-hidden />
                        {t('glossary:columns')}
                    </Link>
                    <h1 className="text-xl font-bold tracking-tight md:text-2xl">{t('groupBet.title', { name: column.name })}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t('column.closedAt', { date: dates.format(column.deadline, t('dates.dayMonthTime')) })}
                    </p>
                </div>
                <LimitTiles
                    filled={counts.filled}
                    total={total}
                    doubles={counts.doubles}
                    maxDoubles={limits.doubles}
                    triples={counts.triples}
                    maxTriples={limits.triples}
                />
            </section>

            {/* Budget */}
            <section className="space-y-3 rounded-2xl border bg-card p-4 md:p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-base font-bold">{t('groupBet.budget')}</h2>
                    <span className="text-sm text-muted-foreground tabular-nums">{t('groupBet.rows', { count: rows, rows: rows.toLocaleString(i18n.language) })}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    <Stepper label={t('limits.doubles')} value={limits.doubles} min={0} max={column.operator_max_doubles ?? total} onChange={(v) => updateLimits({ doubles: v })} />
                    <Stepper label={t('limits.triples')} value={limits.triples} min={0} max={column.operator_max_triples ?? total} onChange={(v) => updateLimits({ triples: v })} />
                    {customLimits && (
                        <Button variant="ghost" size="sm" onClick={() => updateLimits(playerLimits)}>
                            {t('groupBet.sameAsPlayers', { doubles: playerLimits.doubles, triples: playerLimits.triples })}
                        </Button>
                    )}
                </div>
                {customLimits && (
                    <p className="text-sm text-muted-foreground">
                        {t('groupBet.customLimits', { doubles: playerLimits.doubles, triples: playerLimits.triples })}
                    </p>
                )}
            </section>

            {isDeadlinePassed && (
                <Banner tone="warn">{t('groupBet.deadlinePassed')}</Banner>
            )}

            {/* Algorithm */}
            <section className="space-y-3 rounded-2xl border bg-card p-4 md:p-6">
                <h2 className="text-base font-bold">{t('groupBet.algo.title')}</h2>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                    <Segmented
                        label={t('groupBet.algo.recentDraws')}
                        value={String(algo.formWeeks)}
                        onChange={(v) => updateAlgo({ formWeeks: Number(v) })}
                        options={[3, 5, 10].map((n) => ({ value: String(n), label: String(n) }))}
                    />
                    <Segmented
                        label={t('groupBet.algo.sharpness')}
                        value={String(algo.power)}
                        onChange={(v) => updateAlgo({ power: Number(v) })}
                        options={[
                            { value: '1', label: t('groupBet.algo.proportional') },
                            { value: '2', label: t('groupBet.algo.medium') },
                            { value: '3', label: t('groupBet.algo.sharp') },
                        ]}
                    />
                    <Button variant="outline" disabled={!votes} onClick={fillFromAlgo}>
                        {isSeasonLoading ? t('groupBet.algo.loadingHistory') : t('groupBet.algo.fill')}
                    </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                    {t('groupBet.algo.explanation', { weeks: algo.formWeeks, power: algo.power })}
                </p>
            </section>

            {/* Games */}
            <section className="overflow-hidden rounded-2xl border bg-card">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3 md:px-6">
                    <Segmented
                        label={t('common.orderBy')}
                        value={orderBy}
                        onChange={setOrderBy}
                        options={[
                            { value: 'game_num', label: t('common.numberShort') },
                            { value: 'game_time', label: t('common.time') },
                        ]}
                    />
                    {votes && <span className="text-xs text-muted-foreground">{t('groupBet.algo.percentages')}</span>}
                </div>
                <ul className="divide-y">
                    {games.map((game) => {
                        const v = votes?.[game.game_num];
                        const shares = OUTCOMES.map((o) => (v?.total ? v[o] / v.total : 0));
                        const lead = Math.max(...shares);
                        return (
                            <li key={game.game_num} className="flex items-center gap-3 px-4 py-2.5 md:gap-4 md:px-6">
                                <span className="w-5 shrink-0 text-sm text-muted-foreground tabular-nums">{game.game_num}</span>
                                <div className="min-w-0 flex-1">
                                    <div className="min-w-0 font-semibold">
                                        <Teams game={game} />
                                    </div>
                                    <div className="truncate text-xs text-muted-foreground md:text-sm">
                                        {dates.dayName(game.game_time)} {dates.time(game.game_time)} · {game.competition}
                                        {game.result && <> · {t('votes.resultColon')} <span className="font-semibold text-foreground">{outcomeLabels[game.result]}</span></>}
                                    </div>
                                </div>
                                <div className="flex shrink-0 flex-col gap-1">
                                    <BetButtons
                                        gameNum={game.game_num}
                                        userBet={userBet}
                                        result={game.result}
                                        disabled={false}
                                        onBetPlace={handlePlaceBet}
                                    />
                                    {v?.total ? (
                                        // one % under each button, leader emphasized
                                        <div className="grid grid-cols-3 px-[3px] text-center text-[11px] tabular-nums">
                                            {shares.map((share, i) => (
                                                <span
                                                    key={OUTCOMES[i]}
                                                    className={cn(share === lead ? 'font-semibold text-foreground' : 'text-muted-foreground')}
                                                >
                                                    {Math.round(share * 100)}%
                                                </span>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </section>

            {/* Save bar */}
            <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur">
                <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:gap-4 md:px-8">
                    <div className="flex-1">
                        {notice === 'ok' && (
                            <Banner tone="success" onClose={() => setNotice(null)}>{t('groupBet.saved')}</Banner>
                        )}
                        {notice === 'fail' && (
                            <Banner tone="error" action={{ label: t('common.retry'), onClick: save, disabled: !canSave }}>
                                {t('groupBet.saveFailed')}
                            </Banner>
                        )}
                    </div>
                    <Button className="h-12 rounded-xl px-6 text-base md:h-11" disabled={!canSave} onClick={save}>
                        {saving ? t('common.saving') : t('groupBet.save')}
                    </Button>
                </div>
            </div>
        </div>
    );
};
