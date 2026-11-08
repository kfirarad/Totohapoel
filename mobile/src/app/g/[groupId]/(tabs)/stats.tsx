import { useGroupId } from '@/lib/group-id';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Avatar, Card, List, Loading, Row, Screen, Segmented, T } from '@/components/ui';
import { computePlayerStats, groupScore, closedColumns } from '@/core/stats';
import { useUserId } from '@/lib/auth';
import { useSeason } from '@/lib/queries';
import { useColors } from '@/lib/theme';

type Metric = 'hitRate' | 'wins' | 'formRate';
const pct = (n: number | null) => (n == null ? '—' : `${Math.round(n * 100)}%`);

/** Group-scoped season stats: my card + one ranked list (full season, incl. rounds before joining). */
export default function Stats() {
  const groupId = useGroupId();
  const { t } = useTranslation();
  const c = useColors();
  const uid = useUserId();
  const season = useSeason(groupId);
  const [form, setForm] = useState<'3' | '5' | '10'>('5');
  const [metric, setMetric] = useState<Metric>('hitRate');

  const stats = useMemo(
    () => (season.data ? computePlayerStats(season.data.columns, season.data.bets, Number(form)) : []),
    [season.data, form],
  );
  if (season.isPending) return <Loading />;

  const ranked = [...stats].sort((a, b) => (b[metric] ?? -1) - (a[metric] ?? -1));
  const me = stats.find((s) => s.userId === uid);
  const myRank = [...stats].sort((a, b) => b.hitRate - a.hitRate).findIndex((s) => s.userId === uid) + 1;
  const closed = closedColumns(season.data?.columns ?? []);
  const gScores = closed.map(groupScore).filter((x): x is number => x != null);
  const gGraded = closed.filter((col) => groupScore(col) != null).reduce((s, col) => s + (col.games?.filter((g) => g.result).length ?? 0), 0);
  const groupRate = gGraded ? gScores.reduce((a, b) => a + b, 0) / gGraded : null;
  const recent = closed.slice(-Number(form));

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <T bold size={20} style={{ flex: 1 }}>{t('season')}</T>
        <View style={{ width: 170 }}>
          <Segmented value={form} onChange={setForm} options={[{ value: '3', label: `${t('form')}: 3` }, { value: '5', label: '5' }, { value: '10', label: '10' }]} />
        </View>
      </View>
      {me && (
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Avatar url={me.avatarUrl} name={me.name} size={56} />
            <View>
              <T bold>{t('me')}</T>
              <T muted size={13}>{t('rank', { rank: myRank })} · {stats.length}</T>
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Stat label={t('hitRate')} v={pct(me.hitRate)} />
            <Stat label={t('wins')} v={String(me.wins)} />
            <Stat label={t('bestWeek')} v={String(me.bestWeek)} />
            <Stat label={t('beatGroup')} v={String(me.beatGroup)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 44 }}>
            {recent.map((col, i) => {
              const bet = season.data!.bets.find((b) => b.column_id === col.id && b.user_id === uid);
              const graded = col.games?.filter((g) => g.result).length ?? 0;
              const hits = bet?.bet_values.filter((v) => col.games?.find((g) => String(g.game_num) === String(v.game_num) && g.result && v.value.includes(g.result))).length ?? 0;
              return <View key={col.id} style={{ flex: 1, height: `${graded ? (hits / graded) * 100 : 0}%`, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: i === recent.length - 1 ? c.accent : c.fill2 }} />;
            })}
          </View>
        </Card>
      )}
      <Segmented value={metric} onChange={setMetric} options={[{ value: 'hitRate', label: t('hitRate') }, { value: 'wins', label: t('wins') }, { value: 'formRate', label: t('form') }]} />
      <List>
        {ranked.map((s, i) => (
          <Row
            key={s.userId}
            highlight={s.userId === uid}
            start={<><T bold muted size={13} style={{ width: 20, textAlign: 'center' }}>{i + 1}</T><Avatar url={s.avatarUrl} name={s.name} size={26} /></>}
            title={s.userId === uid ? t('me') : s.name}
            end={<View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><T muted size={11.5}>{s.wins} 🏆</T><T bold>{metric === 'wins' ? s.wins : pct(s[metric])}</T></View>}
          />
        ))}
        {groupRate != null && <Row last title={t('groupBet')} end={<T bold>{pct(groupRate)}</T>} />}
      </List>
    </Screen>
  );
}

function Stat({ label, v }: { label: string; v: string }) {
  const c = useColors();
  return (
    <View style={{ flexBasis: '48%', flexGrow: 1, backgroundColor: c.fill, borderRadius: 12, padding: 10 }}>
      <T muted size={11.5}>{label}</T>
      <T bold size={22}>{v}</T>
    </View>
  );
}
