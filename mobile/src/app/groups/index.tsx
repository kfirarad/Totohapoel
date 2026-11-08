import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { CreateJoinButtons, GroupList } from '@/components/group-list';
import { Avatar, Card, Loading, Screen, T } from '@/components/ui';
import { fwd } from '@/lib/dir';
import { useMyGroups, useProfile } from '@/lib/queries';
import { useColors } from '@/lib/theme';

export default function Groups() {
  const { t } = useTranslation();
  const groups = useMyGroups();
  const profile = useProfile();
  if (groups.isPending) return <Loading />;
  const list = groups.data ?? [];

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push('/profile')} accessibilityLabel={t('profile')}>
              <Avatar url={profile.data?.avatar_url} name={profile.data?.name} size={30} />
            </Pressable>
          ),
        }}
      />
      <Screen>
        {list.length === 0 ? (
          <>
            <View style={{ marginVertical: 12, gap: 4 }}>
              <T bold size={24}>{t('hi', { name: profile.data?.name?.split(' ')[0] ?? '' })}</T>
              <T muted>{t('noGroups')}</T>
            </View>
            <EntryCard accent icon="＋" title={t('createGroup')} sub={t('createGroupSub')} onPress={() => router.push('/groups/new')} />
            <EntryCard icon="#" title={t('joinGroup')} sub={t('joinGroupSub')} onPress={() => router.push('/join')} />
            <Card style={{ borderStyle: 'dashed', marginTop: 24 }}>
              <T muted size={13} style={{ textAlign: 'center' }}>{t('oneBetHint')}</T>
            </Card>
          </>
        ) : (
          <>
            <Card fill><T muted size={13}>{t('oneBetHint')}</T></Card>
            <GroupList groups={list} />
            <CreateJoinButtons />
          </>
        )}
      </Screen>
    </>
  );
}

function EntryCard({ icon, title, sub, onPress, accent }: { icon: string; title: string; sub: string; onPress: () => void; accent?: boolean }) {
  const c = useColors();
  return (
    <Card onPress={onPress} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: accent ? c.accent : c.line, borderWidth: accent ? 1.5 : 1 }}>
      <View style={{ width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: accent ? c.accent : c.fill }}>
        <T bold color={accent ? c.accentInk : c.ink}>{icon}</T>
      </View>
      <View style={{ flex: 1 }}>
        <T bold>{title}</T>
        <T muted size={13}>{sub}</T>
      </View>
      <T muted size={20}>{fwd()}</T>
    </Card>
  );
}
