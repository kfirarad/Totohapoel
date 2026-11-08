import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LimitTiles, PickGame, ResultGame, VoteRow } from '@/components/column';
import { Avatar, Button, Card, List, Row, Segmented, T } from '@/components/ui';
import { back, fwd } from '@/lib/dir';
import { canSubmit, fromPicks, picksOf, score, toPicks, togglePick, usage, votes, type Picks } from '@/core/scoring';
import type { UserBet , Column } from '@/core/types';
import { useUserId } from '@/lib/auth';
import { fromNow, formatDate, isPast } from '@/lib/dates';
import { useColumnBets, useGroupBet, useMembers, useMyBet, useMyGroups, useSaveBet } from '@/lib/queries';
import { useColors } from '@/lib/theme';

const NO_BETS: UserBet[] = [];
const draftKey = (col: string, uid: string) => `bet-draft:${col}:${uid}`;

export function ColumnView({ groupId, columns, column, onNavigate }: { groupId: string; columns: Column[]; column: Column; onNavigate: (id: string) => void }) {
  const { t } = useTranslation();
  const closed = isPast(column.deadline);
  const sorted = [...columns].sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline));
  const i = sorted.findIndex((c) => c.id === column.id);
  const openNow = columns.filter((c) => !isPast(c.deadline));

  return (
    <>
      {openNow.length > 1 && !closed && (
        <Segmented value={column.id} onChange={onNavigate} options={openNow.map((c) => ({ value: c.id, label: c.name }))} />
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <NavBtn label={back()} disabled={i <= 0} onPress={() => onNavigate(sorted[i - 1].id)} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <T bold size={18}>{column.name}</T>
          <T muted size={13}>{closed ? t('closedAt', { when: formatDate(column.deadline) }) : t('closesIn', { when: fromNow(column.deadline) })}</T>
        </View>
        <NavBtn label={fwd()} disabled={i >= sorted.length - 1} onPress={() => onNavigate(sorted[i + 1].id)} />
      </View>
      {closed ? <ClosedColumn groupId={groupId} column={column} /> : <OpenColumn column={column} />}
    </>
  );
}

function NavBtn({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable disabled={disabled} onPress={onPress} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : 1 }}>
      <T bold size={18}>{label}</T>
    </Pressable>
  );
}

function OpenColumn({ column }: { column: Column }) {
  const uid = useUserId();
  const mine = useMyBet(column.id);
  if (mine.isPending) return null;
  const draft = localStorage.getItem(draftKey(column.id, uid));
  const initial: Picks = draft ? JSON.parse(draft) : toPicks(mine.data?.bet_values);
  return <PickColumn key={column.id} column={column} initial={initial} hasBet={!!mine.data} />;
}

function PickColumn({ column, initial, hasBet }: { column: Column; initial: Picks; hasBet: boolean }) {
  const { t } = useTranslation();
  const c = useColors();
  const uid = useUserId();
  const insets = useSafeAreaInsets();
  const save = useSaveBet();
  const groupCount = useMyGroups().data?.filter((m) => m.status === 'active').length ?? 1;
  const [p, setPicks] = useState<Picks>(initial);
  const u = usage(p);
  const toggle = (game: number, o: '1' | 'X' | '2') =>
    setPicks((prev) => {
      const next = togglePick(prev, game, o);
      localStorage.setItem(draftKey(column.id, uid), JSON.stringify(next));
      return next;
    });
  const submit = () =>
    save.mutate(
      { columnId: column.id, values: fromPicks(p) },
      {
        onSuccess: () => { localStorage.removeItem(draftKey(column.id, uid)); Alert.alert(t('saved')); },
        onError: (e) => Alert.alert(t('error'), e.message),
      },
    );
  const left = column.games.length - u.filled;

  return (
    <>
      <LimitTiles filled={u.filled} total={column.games.length} doubles={u.doubles} maxDoubles={column.max_doubles} triples={u.triples} maxTriples={column.max_triples} />
      <View>
        {column.games.map((g) => (
          <PickGame key={g.game_num} game={g} picks={picksOf(p, g)} onToggle={(o) => toggle(g.game_num, o)} />
        ))}
      </View>
      <View style={{ gap: 8, paddingBottom: insets.bottom }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <T bold size={13} color={c.accent}>{u.filled}/{column.games.length}</T>
          <T muted size={13} style={{ flex: 1 }}>{left > 0 ? t('gamesLeft', { count: left }) : ''}</T>
          <T muted size={11.5}>{t('countsIn', { count: groupCount })}</T>
        </View>
        <Button
          kind="primary"
          title={hasBet ? t('update') : t('submit')}
          loading={save.isPending}
          disabled={!canSubmit(p, column.games, column.max_doubles, column.max_triples)}
          onPress={submit}
        />
      </View>
    </>
  );
}

function ClosedColumn({ groupId, column }: { groupId: string; column: Column }) {
  const { t } = useTranslation();
  const c = useColors();
  const uid = useUserId();
  const members = useMembers(groupId).data ?? [];
  const bets = useColumnBets(groupId, column.id).data ?? NO_BETS;
  const groupBet = useGroupBet(groupId, column.id).data;
  const [source, setSource] = useState<'me' | 'group'>('me');
  const [view, setView] = useState<'column' | 'votes'>('column');
  const [filter, setFilter] = useState<'all' | 'hit' | 'miss' | 'live'>('all');

  const myPicks = useMemo(() => toPicks(bets.find((b) => b.user_id === uid)?.bet_values), [bets, uid]);
  const groupPicks = useMemo(() => toPicks(groupBet?.bet_values), [groupBet]);
  const shown = source === 'me' ? myPicks : groupPicks;
  const meScore = score(myPicks, column.games);
  const gbScore = groupBet ? score(groupPicks, column.games) : null;
  const voteCounts = useMemo(() => votes(bets.map((b) => b.bet_values), column.games), [bets, column.games]);

  const board = bets
    .map((b) => ({ uid: b.user_id, hits: score(toPicks(b.bet_values), column.games).hits, profile: members.find((m) => m.user_id === b.user_id)?.profiles }))
    .sort((a, b) => b.hits - a.hits);
  const avg = board.length ? board.reduce((s, r) => s + r.hits, 0) / board.length : 0;

  const games = column.games.filter((g) => {
    const pk = picksOf(shown, g);
    if (filter === 'live') return !g.result;
    if (filter === 'hit') return !!g.result && pk.includes(g.result as never);
    if (filter === 'miss') return !!g.result && !pk.includes(g.result as never);
    return true;
  });
  const pct = (s: { hits: number; graded: number }) => (s.graded ? Math.round((s.hits / s.graded) * 100) : 0);
  const compare = (userId: string) => router.push({ pathname: '/g/[groupId]/column/[columnId]', params: { groupId, columnId: column.id, user: userId } });

  return (
    <>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <ScoreTile active={source === 'me'} label={t('me')} s={meScore} pct={pct(meScore)} onPress={() => setSource('me')} />
        {gbScore && <ScoreTile active={source === 'group'} label={t('groupBet')} s={gbScore} pct={pct(gbScore)} onPress={() => setSource('group')} />}
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <View style={{ flex: 1 }}>
          <Segmented value={view} onChange={setView} options={[{ value: 'column', label: t('myColumn') }, { value: 'votes', label: t('votes') }]} />
        </View>
        {view === 'column' && (
          <View style={{ width: 160 }}>
            <Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: t('all') }, { value: 'hit', label: '✓' }, { value: 'miss', label: '✗' }, { value: 'live', label: '⏱' }]} />
          </View>
        )}
      </View>
      {view === 'column' ? (
        <View>{games.map((g) => <ResultGame key={g.game_num} game={g} picks={picksOf(shown, g)} />)}</View>
      ) : (
        <View>{column.games.map((g) => <VoteRow key={g.game_num} game={g} count={voteCounts[g.game_num]} mine={picksOf(shown, g)} />)}</View>
      )}
      <T bold style={{ marginTop: 4 }}>{t('roundLeaderboard')}</T>
      <List>
        {board.map((r, i) => (
          <Row
            key={r.uid}
            highlight={r.uid === uid}
            onPress={r.uid === uid ? undefined : () => compare(r.uid)}
            chevron={r.uid !== uid}
            start={<><T bold muted size={13} style={{ width: 20, textAlign: 'center' }}>{i + 1}</T><Avatar url={r.profile?.avatar_url} name={r.profile?.name} size={26} /></>}
            title={r.uid === uid ? t('me') : r.profile?.name ?? '—'}
            end={<T bold>{r.hits}</T>}
          />
        ))}
        {gbScore && <Row start={<T muted style={{ width: 20, textAlign: 'center' }}>–</T>} title={t('groupBet')} end={<T bold>{gbScore.hits}</T>} />}
        <Row last start={<T muted style={{ width: 20, textAlign: 'center' }}>∅</T>} title={<T muted>{t('average')}</T>} end={<T bold muted>{avg.toFixed(1)}</T>} />
      </List>
      {board.length > 1 && (
        <Card fill style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <T size={13} style={{ flex: 1 }}>{t('compareWith')}</T>
          <Button small title={t('pickMember')} onPress={() => compare(board.find((r) => r.uid !== uid)!.uid)} style={{ backgroundColor: c.surface }} />
        </Card>
      )}
    </>
  );
}

function ScoreTile({ label, s, pct, active, onPress }: { label: string; s: { hits: number; graded: number }; pct: number; active: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={{ flex: 1, padding: 10, borderRadius: 12, backgroundColor: active ? c.surface : c.fill, borderWidth: active ? 1 : 0, borderColor: c.line, gap: 2 }}>
      <T muted size={11.5}>{label}</T>
      <T bold size={22}>{pct}% <T muted size={13}>{s.hits}/{s.graded}</T></T>
    </Pressable>
  );
}

