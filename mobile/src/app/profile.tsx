import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { Avatar, List, Loading, Row, Screen, Section, Segmented, SwitchRow, T } from '@/components/ui';
import type { Profile as P } from '@/core/types';
import { signOut, useUserId } from '@/lib/auth';
import { setLang, type Lang } from '@/lib/i18n';
import { pickImage } from '@/lib/image';
import { registerPush } from '@/lib/push';
import { uploadAvatar, useProfile, useUpdateProfile } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';

/** Global (not per group) → modal from the header avatar. */
export default function Profile() {
  const { t, i18n } = useTranslation();
  const c = useColors();
  const uid = useUserId();
  const profile = useProfile().data;
  const update = useUpdateProfile();
  const [name, setName] = useState<string>();
  if (!profile) return <Loading />;

  const err = (e: Error) => Alert.alert(t('error'), e.message);
  const setNotify = async (k: keyof P['notify'], v: boolean) => {
    if (v) await registerPush().catch(() => {});
    update.mutate({ notify: { ...profile.notify, [k]: v } }, { onError: err });
  };
  const changeLang = async (l: Lang) => {
    update.mutate({ locale: l });
    if (!(await setLang(l))) Alert.alert(t('restartManually'));
  };
  const del = () =>
    Alert.alert(t('deleteAccount'), t('deleteConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => { await supabase.rpc('delete_account'); await signOut(); } },
    ]);

  return (
    <>
      <Stack.Screen options={{ headerRight: () => <Pressable onPress={() => router.back()}><T bold color={c.accent}>{t('done')}</T></Pressable> }} />
      <Screen>
        <Pressable
          style={{ alignItems: 'center', gap: 6, marginVertical: 8 }}
          onPress={async () => {
            const uri = await pickImage();
            if (uri) update.mutate({ avatar_url: await uploadAvatar(`users/${uid}.jpg`, uri) }, { onError: err });
          }}
        >
          <Avatar url={profile.avatar_url} name={profile.name} size={88} />
          <T size={13} color={c.accent}>{t('changePhoto')}</T>
        </Pressable>
        <List>
          <Row
            last
            start={<T muted size={13} style={{ width: 60 }}>{t('name')}</T>}
            title={
              <TextInput
                value={name ?? profile.name}
                onChangeText={setName}
                maxLength={30}
                onEndEditing={() => name?.trim() && name !== profile.name && update.mutate({ name: name.trim() }, { onError: err })}
                style={{ fontSize: 15, color: c.ink, paddingVertical: 4 }}
              />
            }
          />
        </List>
        <Section>{t('language')}</Section>
        <Segmented value={i18n.language as Lang} onChange={changeLang} options={[{ value: 'he', label: 'עברית' }, { value: 'en', label: 'English' }]} />
        <T muted size={11.5}>{t('restartHint')}</T>
        <Section>{t('notifications')}</Section>
        <List>
          <SwitchRow title={t('notifyDeadline')} subtitle={t('notifyDeadlineSub')} value={profile.notify.deadline} onChange={(v) => setNotify('deadline', v)} />
          <SwitchRow title={t('notifyResults')} value={profile.notify.results} onChange={(v) => setNotify('results', v)} />
          <SwitchRow last title={t('notifyJoin')} value={profile.notify.join_requests} onChange={(v) => setNotify('join_requests', v)} />
        </List>
        <List>
          <Row last title={<T color={c.accent} style={{ textAlign: 'center' }}>{t('logout')}</T>} onPress={signOut} />
        </List>
        <View style={{ alignItems: 'center' }}>
          <Pressable onPress={del}><T size={12} color={c.danger} style={{ textDecorationLine: 'underline' }}>{t('deleteAccount')}</T></Pressable>
        </View>
      </Screen>
    </>
  );
}
