import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/services/supabase';
import { Avatar } from '@/components/Avatar';
import { Input } from '@/components/ui/input';

type Player = {
    id: string;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
    is_admin: boolean;
};

const fetchPlayers = async () => {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url, is_admin')
        .order('name');

    if (error) throw error;
    return data as Player[];
};

export const UsersList = () => {
    const { t } = useTranslation();
    const { data: players = [], isLoading, error } = useQuery({
        queryKey: ['players'],
        queryFn: fetchPlayers,
    });
    const [search, setSearch] = useState('');

    const q = search.trim().toLowerCase();
    const filtered = q
        ? players.filter((p) => `${p.name ?? ''} ${p.email ?? ''}`.toLowerCase().includes(q))
        : players;

    if (isLoading) return <div className="p-4 text-muted-foreground">{t('common.loading')}</div>;
    if (error) return <div className="p-4">{t('admin.users.loadError')}</div>;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold">
                    {t('admin.nav.users')} <span className="text-base font-normal text-muted-foreground">({players.length})</span>
                </h1>
                <Input
                    type="search"
                    placeholder={t('admin.users.searchPlaceholder')}
                    aria-label={t('admin.users.searchLabel')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-xs"
                />
            </div>

            <ul className="divide-y rounded-2xl border bg-card">
                {filtered.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                        <Avatar url={p.avatar_url} name={p.name} className="size-9" />
                        <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{p.name ?? '—'}</div>
                            <div className="truncate text-sm text-muted-foreground"><bdi>{p.email}</bdi></div>
                        </div>
                        {p.is_admin && (
                            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">{t('admin.users.admin')}</span>
                        )}
                    </li>
                ))}
                {!filtered.length && (
                    <li className="px-4 py-6 text-center text-sm text-muted-foreground">{t('admin.users.none')}</li>
                )}
            </ul>
        </div>
    );
};
