import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { T } from '@/components/ui';
import { OUTCOMES, type Game, type Outcome } from '@/core/types';
import type { VoteCount } from '@/core/scoring';
import { useColors } from '@/lib/theme';
import { formatGameTime } from '@/lib/dates';

/** Teams row + three 1/X/2 buttons. Both rows mirror together, so "1" always sits under the home team. */
function GameShell({ game, children, right }: { game: Game; children: React.ReactNode; right?: React.ReactNode }) {
  const { t } = useTranslation();
  const c = useColors();
  return (
    <View style={{ paddingVertical: 10, gap: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.line }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T muted size={12}><T bold size={12}>{game.game_num}</T> · {game.competition}</T>
        {right ?? <T muted size={12}>{formatGameTime(game.game_time)}</T>}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <T bold style={{ flex: 1, textAlign: 'center' }} numberOfLines={1}>{game.home_team}</T>
        <T muted size={12}>{t('vs')}</T>
        <T bold style={{ flex: 1, textAlign: 'center' }} numberOfLines={1}>{game.away_team}</T>
      </View>
      {children}
    </View>
  );
}

type Look = 'off' | 'on' | 'hit' | 'miss' | 'fade' | 'result';

function PickButtons({ look, onPress }: { look: (o: Outcome) => Look; onPress?: (o: Outcome) => void }) {
  const c = useColors();
  const styles: Record<Look, { bg: string; fg: string; opacity?: number; dashed?: boolean }> = {
    off: { bg: c.fill, fg: c.ink },
    on: { bg: c.accent, fg: c.accentInk },
    hit: { bg: c.accent, fg: c.accentInk, dashed: true },
    miss: { bg: c.ink, fg: c.surface },
    fade: { bg: c.accent, fg: c.accentInk, opacity: 0.35 },
    result: { bg: c.fill, fg: c.ink, dashed: true },
  };
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {OUTCOMES.map((o) => {
        const l = look(o);
        const s = styles[l];
        return (
          <Pressable
            key={o}
            disabled={!onPress}
            onPress={() => onPress?.(o)}
            accessibilityRole="button"
            accessibilityState={{ selected: l === 'on' || l === 'hit' }}
            style={{
              flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
              backgroundColor: s.bg, opacity: s.opacity ?? 1,
              borderWidth: s.dashed ? 2 : 0, borderStyle: 'dashed', borderColor: l === 'hit' ? c.accentInk : c.accent,
            }}
          >
            <T bold size={16} color={s.fg} style={l === 'miss' ? { textDecorationLine: 'line-through' } : undefined}>
              {o}{l === 'hit' ? ' ✓' : ''}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function PickGame({ game, picks, onToggle }: { game: Game; picks: Outcome[]; onToggle: (o: Outcome) => void }) {
  return (
    <GameShell game={game}>
      <PickButtons
        look={(o) => (picks.includes(o) ? 'on' : 'off')}
        onPress={(o) => { Haptics.selectionAsync(); onToggle(o); }}
      />
    </GameShell>
  );
}

const resultLook = (picks: Outcome[], result: Game['result']) => (o: Outcome): Look => {
  const picked = picks.includes(o);
  if (!result) return picked ? 'on' : 'off';
  if (o === result) return picked ? 'hit' : 'result';
  if (!picked) return 'off';
  return picks.includes(result as Outcome) ? 'fade' : 'miss';
};

export function ResultGame({ game, picks }: { game: Game; picks: Outcome[] }) {
  const mark = !game.result ? '⏱' : picks.includes(game.result as Outcome) ? '✓' : '✗';
  return (
    <GameShell game={game} right={<T size={12}>{mark}</T>}>
      <PickButtons look={resultLook(picks, game.result)} />
    </GameShell>
  );
}

/** Two players on one game, stacked (compare screen). */
export function CompareGame({ game, rows }: { game: Game; rows: { label: string; picks: Outcome[] }[] }) {
  return (
    <GameShell game={game}>
      {rows.map((r) => (
        <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <T muted size={11.5} style={{ width: 40 }} numberOfLines={1}>{r.label}</T>
          <View style={{ flex: 1 }}><PickButtons look={resultLook(r.picks, game.result)} /></View>
        </View>
      ))}
    </GameShell>
  );
}

export function LimitTiles({ filled, total, doubles, maxDoubles, triples, maxTriples }: { filled: number; total: number; doubles: number; maxDoubles: number; triples: number; maxTriples: number }) {
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      <Tile label={t('filled')} n={filled} max={total} accent />
      <Tile label={t('doubles')} n={doubles} max={maxDoubles} />
      <Tile label={t('triples')} n={triples} max={maxTriples} />
    </View>
  );
}

function Tile({ label, n, max, accent }: { label: string; n: number; max: number; accent?: boolean }) {
  const c = useColors();
  const over = n > max;
  return (
    <View style={{ flex: 1, backgroundColor: c.fill, borderRadius: 12, padding: 8, gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <T muted size={12}>{label}</T>
        <T bold color={over ? c.danger : c.ink}>{n}/{max}</T>
      </View>
      <View style={{ height: 4, borderRadius: 4, backgroundColor: c.fill2, overflow: 'hidden' }}>
        <View style={{ height: 4, width: `${Math.min(100, max ? (n / max) * 100 : 0)}%`, backgroundColor: over ? c.danger : accent ? c.accent : c.ink }} />
      </View>
    </View>
  );
}

/** Per-game vote shares; my picks outlined, result ✓. */
export function VoteRow({ game, count, mine }: { game: Game; count: VoteCount; mine: Outcome[] }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
      <T size={13} style={{ flex: 1 }} numberOfLines={1}><T bold size={13}>{game.game_num}</T> {game.home_team} – {game.away_team}</T>
      <View style={{ flexDirection: 'row', gap: 3, width: 150 }}>
        {OUTCOMES.map((o) => {
          const share = count.voters ? count[o] / count.voters : 0;
          return (
            <View
              key={o}
              style={{
                flex: 1, height: 34, borderRadius: 7, alignItems: 'center', justifyContent: 'center',
                backgroundColor: share > 0.66 ? c.accent : share > 0.33 ? c.accentSoft : c.fill,
                borderWidth: mine.includes(o) ? 2 : 0, borderColor: c.ink,
              }}
            >
              <T bold size={12} color={share > 0.66 ? c.accentInk : c.ink}>
                {Math.round(share * 100)}%{game.result === o ? '✓' : ''}
              </T>
            </View>
          );
        })}
      </View>
    </View>
  );
}

