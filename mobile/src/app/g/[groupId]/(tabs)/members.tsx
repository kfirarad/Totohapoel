import * as Clipboard from 'expo-clipboard';
import { useGroupId } from '@/lib/group-id';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Share, View } from 'react-native';
import { Avatar, Button, Card, Chip, List, Loading, Row, Screen, Section, T } from '@/components/ui';
import type { GroupMember } from '@/core/types';
import { useUserId } from '@/lib/auth';
import { inviteText } from '@/lib/invite';
import { useGroup, useMemberAction, useMembers } from '@/lib/queries';
import { useColors } from '@/lib/theme';

export default function Members() {
  const groupId = useGroupId();
  const { share } = useLocalSearchParams<{ share?: string }>();
  const { t } = useTranslation();
  const c = useColors();
  const uid = useUserId();
  const group = useGroup(groupId).data;
  const members = useMembers(groupId);
  const act = useMemberAction(groupId);
  const list = members.data ?? [];
  const active = list.filter((m) => m.status === 'active');
  const pending = list.filter((m) => m.status === 'pending');
  const isAdmin = active.some((m) => m.user_id === uid && m.role === 'admin');
  const admins = active.filter((m) => m.role === 'admin').length;
  const shareInvite = () => group && Share.share({ message: inviteText(group, t) });

  // Right after creating a group: open the share sheet once.
  useEffect(() => { if (share && group) { shareInvite(); router.setParams({ share: undefined }); } }, [share, group]); // eslint-disable-line react-hooks/exhaustive-deps

  if (members.isPending) return <Loading />;
  const run = (a: Parameters<typeof act.mutate>[0]) => act.mutate(a, { onError: (e) => Alert.alert(t('error'), e.message) });

  const menu = (m: GroupMember) =>
    Alert.alert(m.profiles?.name ?? '', undefined, [
      m.role === 'admin'
        ? { text: t('removeAdmin'), onPress: () => (admins > 1 ? run({ fn: 'set_member_role', userId: m.user_id, role: 'member' }) : Alert.alert(t('lastAdmin'))) }
        : { text: t('makeAdmin'), onPress: () => run({ fn: 'set_member_role', userId: m.user_id, role: 'admin' }) },
      {
        text: t('removeMember'),
        style: 'destructive',
        onPress: () => Alert.alert(t('removeMember'), m.profiles?.name, [
          { text: t('cancel'), style: 'cancel' },
          { text: t('removeMember'), style: 'destructive', onPress: () => run({ fn: 'remove_member', userId: m.user_id }) },
        ]),
      },
      { text: t('cancel'), style: 'cancel' },
    ]);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <T bold size={20} style={{ flex: 1 }}>{t('tabMembers')} · {active.length}</T>
        {isAdmin && (
          <Pressable accessibilityLabel={t('settings')} onPress={() => router.push({ pathname: '/g/[groupId]/settings', params: { groupId } })}>
            <T size={22}>⚙</T>
          </Pressable>
        )}
      </View>
      {group && (isAdmin || group.is_open) && (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <T muted size={11.5}>{t('inviteCode')}</T>
            <T bold size={20} style={{ letterSpacing: 2, writingDirection: 'ltr' }}>{group.join_code}</T>
          </View>
          <Button small title={t('copy')} onPress={async () => { await Clipboard.setStringAsync(group.join_code); Alert.alert(t('copied')); }} />
          <Button small kind="primary" title={`⤴ ${t('share')}`} onPress={shareInvite} />
        </Card>
      )}
      {isAdmin && pending.length > 0 && (
        <>
          <Section>{`${t('pendingRequests')} · ${pending.length}`}</Section>
          <List>
            {pending.map((m, i) => (
              <Row
                key={m.user_id}
                last={i === pending.length - 1}
                start={<Avatar url={m.profiles?.avatar_url} name={m.profiles?.name} />}
                title={m.profiles?.name ?? '—'}
                end={
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Button small title="✗" accessibilityLabel="reject" onPress={() => run({ fn: 'reject_member', userId: m.user_id })} />
                    <Button small kind="primary" title="✓" accessibilityLabel="approve" onPress={() => run({ fn: 'approve_member', userId: m.user_id })} />
                  </View>
                }
              />
            ))}
          </List>
        </>
      )}
      <Section>{t('tabMembers')}</Section>
      <List>
        {active.map((m, i) => (
          <Row
            key={m.user_id}
            last={i === active.length - 1}
            start={<Avatar url={m.profiles?.avatar_url} name={m.profiles?.name} />}
            title={m.user_id === uid ? t('me') : m.profiles?.name ?? '—'}
            end={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {m.role === 'admin' && <Chip accent label={t('admin')} />}
                {isAdmin && m.user_id !== uid && <Pressable onPress={() => menu(m)} hitSlop={10}><T muted size={18}>⋯</T></Pressable>}
              </View>
            }
          />
        ))}
      </List>
      <T muted size={11.5} color={c.muted}>{t('oneBetHint')}</T>
    </Screen>
  );
}
