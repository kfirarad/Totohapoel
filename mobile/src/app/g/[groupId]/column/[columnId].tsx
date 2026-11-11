import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useGroupId } from '@/lib/group-id';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { CompareGame } from '@/components/column';
import { ColumnView } from '@/components/column-view';
import { Avatar, Card, Loading, Screen, Segmented, T } from '@/components/ui';
import { picksOf, score, toPicks } from '@/core/scoring';
import type { UserBet } from '@/core/types';
import { useUserId } from '@/lib/auth';
import { useColumnBets, useGroupColumns, useMembers } from '@/lib/queries';

const NO_BETS: UserBet[] = [];

/** A specific column; with ?user= shows me-vs-member diff (only after deadline — RLS/UI). */
export default function ColumnScreen() {
  const groupId = useGroupId();
  const { columnId, user } = useLocalSearchParams<{ columnId: string; user?: string }>();
  const cols = useGroupColumns(groupId);
  const column = cols.data?.find((c) => c.id === columnId);
  if (!column) return <Loading />;
  if (user) return <Compare groupId={groupId} column={column} other={user} />;
  return (
    <Screen>
      <ColumnView groupId={groupId} columns={cols.data!} column={column} onNavigate={(id) => router.setParams({ columnId: id })} />
    </Screen>
  );
}

function Compare({ groupId, column, other }: { groupId: string; column: NonNullable<ReturnType<typeof useGroupColumns>['data']>[number]; other: string }) {
  const { t } = useTranslation();
  const uid = useUserId();
  const bets = useColumnBets(groupId, column.id).data ?? NO_BETS;
  const members = useMembers(groupId).data ?? [];
  const [mode, setMode] = useState<'diff' | 'all'>('diff');
  const mine = useMemo(() => toPicks(bets.find((b) => b.user_id === uid)?.bet_values), [bets, uid]);
  const theirs = useMemo(() => toPicks(bets.find((b) => b.user_id === other)?.bet_values), [bets, other]);
  const prof = members.find((m) => m.user_id === other)?.profiles;
  const me = members.find((m) => m.user_id === uid)?.profiles;
  const same = (n: number) => [...(mine[n] ?? [])].sort().join() === [...(theirs[n] ?? [])].sort().join();
  const diffs = column.games.filter((g) => !same(g.game_num));
  const games = mode === 'diff' ? diffs : column.games;
  const a = score(mine, column.games).hits;
  const b = score(theirs, column.games).hits;

  return (
    <>
      <Stack.Screen options={{ title: `${t('me')} / ${prof?.name ?? ''}` }} />
      <Screen>
        <Card fill style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
          <Side name={t('me')} avatarName={me?.name} url={me?.avatar_url} hits={a} />
          <View style={{ alignItems: 'center' }}>
            <T muted size={13}>{column.name}</T>
            <T bold>{a - b > 0 ? `+${a - b}` : a - b}</T>
          </View>
          <Side name={prof?.name ?? ''} url={prof?.avatar_url} hits={b} />
        </Card>
        <Segmented value={mode} onChange={setMode} options={[{ value: 'diff', label: `${t('onlyDiffs')} (${diffs.length})` }, { value: 'all', label: t('allGames') }]} />
        <View>
          {games.map((g) => (
            <CompareGame key={g.game_num} game={g} rows={[{ label: t('me'), picks: picksOf(mine, g) }, { label: prof?.name ?? '', picks: picksOf(theirs, g) }]} />
          ))}
        </View>
      </Screen>
    </>
  );
}

const Side = ({ name, avatarName, url, hits }: { name: string; avatarName?: string; url?: string | null; hits: number }) => (
  <View style={{ alignItems: 'center', gap: 2 }}>
    <Avatar url={url} name={avatarName ?? name} />
    <T bold size={22}>{hits}</T>
    <T muted size={11.5}>{name}</T>
  </View>
);
