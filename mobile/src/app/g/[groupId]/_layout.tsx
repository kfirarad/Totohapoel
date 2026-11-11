import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { Avatar, T } from '@/components/ui';
import { GroupIdContext } from '@/lib/group-id';
import { useGroup, useProfile } from '@/lib/queries';
import { useColors } from '@/lib/theme';

/** In-group shell: header always has [group button → switcher] and [profile button]. */
export default function GroupLayout() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { t } = useTranslation();
  return (
    <GroupIdContext.Provider value={groupId}>
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen
        name="(tabs)"
        options={{ title: '', headerLeft: () => <GroupButton groupId={groupId} />, headerRight: () => <ProfileButton /> }}
      />
      <Stack.Screen name="column/[columnId]" options={{ title: '' }} />
      <Stack.Screen name="settings" options={{ title: t('groupSettings') }} />
      <Stack.Screen name="group-bet/[columnId]" options={{ title: t('editGroupBet') }} />
    </Stack>
    </GroupIdContext.Provider>
  );
}

function GroupButton({ groupId }: { groupId: string }) {
  const g = useGroup(groupId).data;
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/switcher', params: { groupId } })}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, paddingStart: 4, paddingEnd: 10, borderRadius: 999, backgroundColor: c.fill, maxWidth: 230 }}
    >
      <Avatar url={g?.avatar_url} name={g?.name} size={26} square />
      <T bold numberOfLines={1} style={{ flexShrink: 1 }}>{g?.name ?? ''}</T>
      <T muted size={11}>▾</T>
    </Pressable>
  );
}

function ProfileButton() {
  const p = useProfile().data;
  const { t } = useTranslation();
  return (
    <Pressable accessibilityLabel={t('profile')} onPress={() => router.push('/profile')}>
      <Avatar url={p?.avatar_url} name={p?.name} size={32} />
    </Pressable>
  );
}
