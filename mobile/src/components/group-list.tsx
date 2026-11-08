import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';
import { Avatar, Button, Chip, List, Row } from '@/components/ui';
import { setLastGroup, useLeaveGroup, type MyGroup } from '@/lib/queries';

/** My groups list (groups home + switcher sheet). Pending rows dimmed; tap offers to cancel the request. */
export function GroupList({ groups, currentId, onOpen }: { groups: MyGroup[]; currentId?: string; onOpen?: () => void }) {
  const { t } = useTranslation();
  const leave = useLeaveGroup();
  const open = (m: MyGroup) => {
    if (m.status === 'pending')
      return Alert.alert(m.groups.name, t('pending'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: () => leave.mutate(m.group_id) },
      ]);
    setLastGroup(m.group_id);
    onOpen?.();
    router.replace({ pathname: '/g/[groupId]/column', params: { groupId: m.group_id } });
  };
  return (
    <List>
      {groups.map((m, i) => (
        <Row
          key={m.group_id}
          last={i === groups.length - 1}
          highlight={m.group_id === currentId}
          dim={m.status === 'pending'}
          onPress={() => open(m)}
          start={<Avatar url={m.groups.avatar_url} name={m.groups.name} size={44} square />}
          title={m.groups.name}
          subtitle={`${t('members', { count: m.groups.member_count[0]?.count ?? 0 })} · ${m.groups.is_open ? t('open') : t('closed')}`}
          end={m.status === 'pending' ? <Chip outline label={t('pending')} /> : m.role === 'admin' ? <Chip accent label={t('admin')} /> : undefined}
          chevron={m.status === 'active'}
        />
      ))}
    </List>
  );
}

export function CreateJoinButtons({ before }: { before?: () => void }) {
  const { t } = useTranslation();
  const go = (href: '/groups/new' | '/join') => () => { before?.(); router.push(href); };
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Button small style={{ flex: 1 }} title={`＋ ${t('createGroup')}`} onPress={go('/groups/new')} />
      <Button small style={{ flex: 1 }} title={`# ${t('joinGroup')}`} onPress={go('/join')} />
    </View>
  );
}
