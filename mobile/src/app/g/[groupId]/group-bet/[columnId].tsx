import { router, useLocalSearchParams } from 'expo-router';
import { useGroupId } from '@/lib/group-id';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';
import { LimitTiles, PickGame } from '@/components/column';
import { Button, Loading, Screen, T } from '@/components/ui';
import { canSubmit, fromPicks, picksOf, toPicks, togglePick, usage, type Picks } from '@/core/scoring';
import type { Column, UserBet } from '@/core/types';
import { autoFillGroupBet, formVotes, formWeights } from '@/core/stats';
import { useColumnBets, useGroupBet, useGroupColumns, useSaveGroupBet, useSeason } from '@/lib/queries';

/** Group bet editor: any admin edits until the deadline; can prefill from members' (form-weighted) votes. */
export default function GroupBetEditor() {
  const groupId = useGroupId();
  const { columnId } = useLocalSearchParams<{ columnId: string }>();
  const column = useGroupColumns(groupId).data?.find((c) => c.id === columnId);
  const existing = useGroupBet(groupId, columnId);
  if (!column || existing.isPending) return <Loading />;
  return <Editor groupId={groupId} column={column} initial={toPicks(existing.data?.bet_values)} />;
}

const NO_BETS: UserBet[] = [];

function Editor({ groupId, column, initial }: { groupId: string; column: Column; initial: Picks }) {
  const { t } = useTranslation();
  const columnId = column.id;
  const bets = useColumnBets(groupId, columnId).data ?? NO_BETS;
  const season = useSeason(groupId).data;
  const save = useSaveGroupBet(groupId);
  const [picks, setPicks] = useState<Picks>(initial);

  const prefill = useMemo(() => {
    if (!season) return null;
    return () => {
      const weightOf = formWeights(season.columns, season.bets, new Date(column.deadline), 5, 2);
      const v = formVotes(bets.map((b) => ({ ...b, profiles: null })), weightOf);
      const filled = autoFillGroupBet(column.games.map((g) => g.game_num), v, column.max_doubles, column.max_triples);
      setPicks(toPicks(Object.entries(filled).map(([game_num, value]) => ({ game_num, value }))));
    };
  }, [column, season, bets]);

  const u = usage(picks);
  return (
    <Screen>
      <T bold size={18}>{column.name}</T>
      <LimitTiles filled={u.filled} total={column.games.length} doubles={u.doubles} maxDoubles={column.max_doubles} triples={u.triples} maxTriples={column.max_triples} />
      {prefill && <Button small title={`✨ ${t('votes')}`} onPress={prefill} />}
      <View>
        {column.games.map((g) => <PickGame key={g.game_num} game={g} picks={picksOf(picks, g)} onToggle={(o) => setPicks((prev) => togglePick(prev, g.game_num, o))} />)}
      </View>
      <Button
        kind="primary"
        title={t('save')}
        loading={save.isPending}
        disabled={!canSubmit(picks, column.games, column.max_doubles, column.max_triples)}
        onPress={() => save.mutate({ columnId, values: fromPicks(picks) }, { onSuccess: () => router.back(), onError: (e) => Alert.alert(t('error'), e.message) })}
      />
    </Screen>
  );
}
