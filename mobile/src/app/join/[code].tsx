import * as Haptics from 'expo-haptics';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Avatar, Button, Card, Chip, Loading, Screen, T } from '@/components/ui';
import { PENDING_JOIN, useAuth } from '@/lib/auth';
import { setLastGroup, useGroupPreview, useJoinGroup } from '@/lib/queries';
import { useColors } from '@/lib/theme';

/** Invite landing (deep link /join/CODE or after code entry): preview, then join / request. */
export default function JoinLanding() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const code = (raw ?? '').toUpperCase();
  const { session } = useAuth();
  if (!session) {
    localStorage.setItem(PENDING_JOIN, code); // resumed by app/index after sign-in
    return <Redirect href="/sign-in" />;
  }
  return <Landing code={code} />;
}

function Landing({ code }: { code: string }) {
  const { t } = useTranslation();
  const c = useColors();
  const preview = useGroupPreview(code);
  const join = useJoinGroup();
  const g = preview.data;
  const enter = (id: string) => { setLastGroup(id); router.dismissAll(); router.replace({ pathname: '/g/[groupId]/column', params: { groupId: id } }); };

  if (preview.isLoading) return <Loading />;
  if (!g)
    return (
      <Screen style={{ paddingTop: 40 }}>
        <Card><T>{t('badCode')}</T></Card>
        <Button title={t('backToGroups')} onPress={() => router.replace('/join')} />
      </Screen>
    );
  if (g.is_member) return <Redirect href={{ pathname: '/g/[groupId]/column', params: { groupId: g.id } }} />;

  if (join.data)
    return (
      <Screen style={{ paddingTop: 40 }}>
        <Card style={{ alignItems: 'center', gap: 10, padding: 24 }}>
          <T size={32}>{join.data === 'active' ? '✓' : '⏳'}</T>
          <T bold size={19} style={{ textAlign: 'center' }}>{join.data === 'active' ? t('joined', { name: g.name }) : t('requestSent')}</T>
          {join.data === 'pending' && <T muted size={13} style={{ textAlign: 'center' }}>{t('requestSentSub')}</T>}
          {join.data === 'active' ? (
            <Button kind="primary" style={{ alignSelf: 'stretch' }} title={t('enterGroup')} onPress={() => enter(g.id)} />
          ) : (
            <Button style={{ alignSelf: 'stretch' }} title={t('backToGroups')} onPress={() => { router.dismissAll(); router.replace('/groups'); }} />
          )}
        </Card>
      </Screen>
    );

  return (
    <Screen style={{ paddingTop: 40, flexGrow: 1 }}>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Avatar url={g.avatar_url} name={g.name} size={88} square />
        <T bold size={22}>{g.name}</T>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <T muted size={13}>{t('members', { count: g.member_count })}</T>
          <Chip label={g.is_open ? t('open') : t('closed')} />
        </View>
      </View>
      <Card fill><T size={13}>{t('oneBetHint')}</T></Card>
      <View style={{ flex: 1 }} />
      <Button
        kind="primary"
        loading={join.isPending}
        title={g.is_open ? t('join') : t('requestJoin')}
        onPress={() => join.mutate(code, { onSuccess: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) })}
      />
      {!g.is_open && <T muted size={11.5} style={{ textAlign: 'center' }} color={c.muted}>{t('closedJoinHint')}</T>}
    </Screen>
  );
}
