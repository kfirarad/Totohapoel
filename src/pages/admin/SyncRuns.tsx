import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/services/supabase';
import { useMarketDates } from '@/i18n/dates';
import { cn } from '@/lib/utils';

type SyncRun = {
    id: number;
    market: string;
    kind: 'import' | 'results';
    status: 'running' | 'ok' | 'skipped' | 'error';
    message: string | null;
    stats: Record<string, number> | null;
    started_at: string;
    finished_at: string | null;
};

const statusClass: Record<SyncRun['status'], string> = {
    ok: 'bg-green-100 text-green-800',
    skipped: 'bg-gray-100 text-gray-800',
    running: 'bg-blue-100 text-blue-800',
    error: 'bg-red-100 text-red-800',
};

/** Super-admin: the latest market-sync runs (supabase/functions/market-sync) */
export const SyncRuns = () => {
    const { t } = useTranslation();
    const dates = useMarketDates();
    const { data: runs = [], isLoading, error } = useQuery({
        queryKey: ['syncRuns'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sync_runs').select('*').order('started_at', { ascending: false }).limit(50);
            if (error) throw error;
            return data as SyncRun[];
        },
        refetchInterval: 60_000,
    });

    if (isLoading) return <div>{t('common.loading')}</div>;
    if (error) return <div>{t('common.loadError')}</div>;

    return (
        <div>
            <h1 className="mb-1 text-2xl font-bold">{t('admin.sync.title')}</h1>
            <p className="mb-4 text-sm text-muted-foreground">{t('admin.sync.hint')}</p>
            {runs.length === 0 && <p className="py-8 text-center text-muted-foreground">{t('admin.sync.none')}</p>}
            <ul className="divide-y rounded-lg bg-card">
                {runs.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm">
                        <span className={cn('rounded px-2 py-0.5', statusClass[r.status])}>{t(`admin.sync.status.${r.status}`)}</span>
                        <span className="font-medium uppercase">{r.market}</span>
                        <span>{t(`admin.sync.kind.${r.kind}`)}</span>
                        <span className="text-muted-foreground">{dates.format(r.started_at, 'Pp')}</span>
                        {r.stats && (
                            <span className="text-muted-foreground" dir="ltr">
                                {Object.entries(r.stats).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                            </span>
                        )}
                        {r.message && <span className="basis-full text-muted-foreground">{r.message}</span>}
                    </li>
                ))}
            </ul>
        </div>
    );
};
