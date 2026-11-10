import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/Segmented';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/services/supabase';
import { useMarketDates } from '@/i18n/dates';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentGroup } from '@/groups/useGroup';
import { toGroupColumn, type GroupColumnRow } from '@/groups/groupColumn';
import type { Column, GroupColumnState } from '@/types/database.types';

type Row = Column & { played: number };
type View = 'current' | 'archived';

/** This group's columns, newest first, with how many of its players sent a bet */
const fetchColumns = async (group: ReturnType<typeof useCurrentGroup>): Promise<Row[]> => {
    const { data, error } = await supabase
        .from('columns')
        .select('*, group_columns!inner(*), user_bets(count)')
        .eq('group_columns.group_id', group.id)
        .eq('user_bets.group_id', group.id)
        .order('deadline', { ascending: false });
    if (error) throw error;
    return (data as (GroupColumnRow & { user_bets: { count: number }[] })[]).map(({ user_bets, ...row }) => ({
        ...toGroupColumn(row, group),
        played: user_bets?.[0]?.count ?? 0,
    }));
};

/** Inline editor for this group's limits on one column (blank = the group default) */
const LimitsEditor = ({ column, onSave, onCancel }: {
    column: Row;
    onSave: (patch: Pick<GroupColumnState, 'max_doubles' | 'max_triples'>) => void;
    onCancel: () => void;
}) => {
    const { t } = useTranslation();
    const [doubles, setDoubles] = useState(column.group_override_doubles?.toString() ?? '');
    const [triples, setTriples] = useState(column.group_override_triples?.toString() ?? '');
    const parse = (v: string) => (v.trim() === '' ? null : Math.max(0, Number(v)));
    return (
        <form
            className="relative z-10 mt-3 flex flex-wrap items-end gap-2 border-t pt-3"
            onSubmit={(e) => {
                e.preventDefault();
                onSave({ max_doubles: parse(doubles), max_triples: parse(triples) });
            }}
        >
            {([['doubles', doubles, setDoubles, column.operator_max_doubles], ['triples', triples, setTriples, column.operator_max_triples]] as const)
                .map(([key, value, set, max]) => (
                    <label key={key} className="space-y-1">
                        <span className="block text-xs text-muted-foreground">
                            {t(`limits.${key}`)}{max != null && ` (${t('admin.columns.operatorMax', { max })})`}
                        </span>
                        <Input
                            type="number" min={0} max={max ?? undefined} className="h-8 w-28"
                            placeholder={t('admin.columns.groupDefault')}
                            value={value} onChange={(e) => set(e.target.value)}
                        />
                    </label>
                ))}
            <Button size="sm" type="submit">{t('common.save')}</Button>
            <Button size="sm" type="button" variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
        </form>
    );
};

export const ColumnsList = () => {
    const { t } = useTranslation();
    const dates = useMarketDates();
    const group = useCurrentGroup();
    const { profile } = useAuth();
    const isSuperAdmin = !!profile?.is_admin;
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [view, setView] = useState<View>('current');
    const [editing, setEditing] = useState<string | null>(null);

    const { data: columns = [], isLoading, error } = useQuery({
        queryKey: ['columns', group.id, group.max_doubles, group.max_triples],
        queryFn: () => fetchColumns(group),
    });

    const update = useMutation({
        mutationFn: async ({ id, patch }: { id: string; patch: Partial<GroupColumnState> }) => {
            const { error } = await supabase.from('group_columns').update(patch)
                .eq('group_id', group.id).eq('column_id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            setEditing(null);
            // the list, the players' column page/navigation and season stats all depend on it
            queryClient.invalidateQueries({ queryKey: ['columns'] });
            queryClient.invalidateQueries({ queryKey: ['column'] });
            queryClient.invalidateQueries({ queryKey: ['seasonData'] });
        },
        onError: (e) => toast({ title: t('common.error'), description: e.message, variant: 'destructive' }),
    });

    if (isLoading) return <div>{t('common.loading')}</div>;
    if (error) return <div>{t('admin.columns.loadError')}</div>;

    const archivedCount = columns.filter((c) => c.is_archived).length;
    const visible = columns.filter((c) => !!c.is_archived === (view === 'archived'));
    const badge = 'rounded px-2 py-1 text-sm';

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold">{t('glossary:columns')}</h1>
                {isSuperAdmin && (
                    <Link to="/admin/columns/new">
                        <Button>{t('admin.columns.new')}</Button>
                    </Link>
                )}
            </div>
            <div className="mb-4">
                <Segmented<View>
                    label={t('admin.columns.show')}
                    value={view}
                    onChange={setView}
                    options={[
                        { value: 'current', label: t('glossary:columns') },
                        { value: 'archived', label: t('admin.columns.archiveTab', { count: archivedCount }) },
                    ]}
                />
            </div>
            {visible.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">
                    {view === 'archived' ? t('admin.columns.noneArchived') : t('admin.columns.none')}
                </p>
            )}
            <div className="grid gap-4">
                {visible.map((column) => {
                    const closed = new Date(column.deadline) < new Date();
                    const busy = update.isPending && update.variables?.id === column.id;
                    return (
                        <div key={column.id} className="relative block rounded-lg bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    {isSuperAdmin ? (
                                        // stretched link: the whole card opens the operator-column editor
                                        <Link to={`/admin/columns/${column.id}`} className="after:absolute after:inset-0">
                                            <h3 className="text-lg font-semibold">{column.name}</h3>
                                        </Link>
                                    ) : (
                                        <h3 className="text-lg font-semibold">{column.name}</h3>
                                    )}
                                    <p className="text-sm text-muted-foreground">
                                        {t('admin.columns.deadline', { date: dates.format(column.deadline, 'PPpp') })}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {t('admin.columns.limits', { doubles: column.max_doubles, triples: column.max_triples })}
                                        {column.group_override_doubles == null && column.group_override_triples == null
                                            ? ` · ${t('admin.columns.groupDefault')}` : ''}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Link
                                        to={`/admin/group-bet/${column.id}`}
                                        className="relative z-10 rounded bg-brand/10 px-2 py-1 text-sm font-medium hover:bg-brand/20"
                                    >
                                        {t('glossary:groupBet')}
                                    </Link>
                                    <span className={`${badge} bg-muted tabular-nums`}>
                                        {t('admin.columns.played', { count: column.played })}
                                    </span>
                                    <button
                                        className={`relative z-10 ${badge} ${column.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                                        title={t('admin.columns.toggleActive')}
                                        disabled={busy}
                                        onClick={() => update.mutate({ id: column.id!, patch: { is_active: !column.is_active } })}
                                    >
                                        {column.is_active ? t('common.active') : t('common.inactive')}
                                    </button>
                                    <span className={`${badge} ${closed ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                        {closed ? t('admin.columns.closed') : t('admin.columns.open')}
                                    </span>
                                    <Button
                                        variant="outline" size="sm" className="relative z-10"
                                        aria-label={t('admin.columns.editLimits')}
                                        onClick={() => setEditing(editing === column.id ? null : column.id!)}
                                    >
                                        <Pencil className="size-4" />
                                    </Button>
                                    <Button
                                        variant="outline" size="sm" className="relative z-10" disabled={busy}
                                        onClick={() => {
                                            const archived = !column.is_archived;
                                            if (archived && !window.confirm(t('admin.columns.archiveConfirm', { name: column.name }))) return;
                                            update.mutate({ id: column.id!, patch: { is_archived: archived } });
                                        }}
                                    >
                                        {column.is_archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                                        {column.is_archived ? t('admin.columns.restore') : t('admin.columns.archive')}
                                    </Button>
                                </div>
                            </div>
                            {editing === column.id && (
                                <LimitsEditor
                                    column={column}
                                    onCancel={() => setEditing(null)}
                                    onSave={(patch) => update.mutate({ id: column.id!, patch })}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
