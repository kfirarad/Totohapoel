import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Share, View } from 'react-native';
import { CreateJoinButtons, GroupList } from '@/components/group-list';
import { Screen, T } from '@/components/ui';
import { inviteText } from '@/lib/invite';
import { useMyGroups } from '@/lib/queries';
import { useColors } from '@/lib/theme';

/** Bottom sheet: switch / create / join. `groupId` = current group. */
export default function Switcher() {
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const { t } = useTranslation();
  const c = useColors();
  const groups = useMyGroups().data ?? [];
  const current = groups.find((m) => m.group_id === groupId);
  const close = () => router.back();

  return (
    <Screen style={{ paddingTop: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <T bold size={18} style={{ flex: 1 }}>{t('myGroups')}</T>
        <Pressable onPress={() => { close(); router.replace('/groups'); }}><T color={c.accent}>{t('manage')}</T></Pressable>
      </View>
      <GroupList groups={groups} currentId={groupId} onOpen={close} />
      <CreateJoinButtons before={close} />
      {current && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
          <Pressable onPress={() => Share.share({ message: inviteText(current.groups, t) })}>
            <T color={c.accent}>⤴ {t('inviteFriends')}</T>
          </Pressable>
          {current.role === 'admin' && (
            <Pressable onPress={() => { close(); router.push({ pathname: '/g/[groupId]/settings', params: { groupId: groupId! } }); }}>
              <T color={c.accent}>⚙ {t('settings')}</T>
            </Pressable>
          )}
        </View>
      )}
    </Screen>
  );
}
