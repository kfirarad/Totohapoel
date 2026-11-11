import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { Avatar, List, Row, Screen, Segmented, T } from '@/components/ui';
import { useUserId } from '@/lib/auth';
import { pickImage } from '@/lib/image';
import { setLastGroup, uploadAvatar, useCreateGroup, useTotoTypes } from '@/lib/queries';
import { radius, useColors } from '@/lib/theme';

export default function NewGroup() {
  const { t, i18n } = useTranslation();
  const c = useColors();
  const uid = useUserId();
  const types = useTotoTypes().data ?? [];
  const create = useCreateGroup();
  const [name, setName] = useState('');
  const [open, setOpen] = useState<'open' | 'closed'>('closed');
  const [picked, setPicked] = useState<string[] | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const selected = picked ?? types.slice(0, 1).map((x) => x.id); // default: first type (Toto16)

  const submit = async () => {
    try {
      const avatar_url = image ? await uploadAvatar(`groups/${uid}-${Date.now()}.jpg`, image) : null;
      const id = await create.mutateAsync({ name: name.trim(), is_open: open === 'open', toto_type_ids: selected, avatar_url });
      setLastGroup(id);
      router.dismissAll();
      router.replace({ pathname: '/g/[groupId]/members', params: { groupId: id, share: '1' } });
    } catch (e) {
      Alert.alert(t('error'), (e as Error).message);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => <Pressable onPress={() => router.back()}><T color={c.accent}>{t('cancel')}</T></Pressable>,
          headerRight: () => (
            <Pressable disabled={!name.trim() || create.isPending} onPress={submit}>
              <T bold color={name.trim() ? c.accent : c.muted}>{t('create')}</T>
            </Pressable>
          ),
        }}
      />
      <Screen>
        <Pressable style={{ alignItems: 'center', gap: 6 }} onPress={async () => setImage((await pickImage()) ?? image)}>
          <Avatar url={image} name="📷" size={88} square />
          <T size={13} color={c.accent}>{image ? t('changePhoto') : t('addPhoto')}</T>
        </Pressable>
        <T muted bold size={12.5}>{t('groupName')}</T>
        <TextInput
          value={name}
          onChangeText={setName}
          maxLength={40}
          autoFocus
          style={{ height: 46, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, paddingHorizontal: 12, color: c.ink, backgroundColor: c.surface }}
        />
        <T muted bold size={12.5}>{t('whoCanJoin')}</T>
        <Segmented value={open} onChange={setOpen} options={[{ value: 'open', label: t('open') }, { value: 'closed', label: t('closed') }]} />
        <T muted size={11.5}>{t('closedHint')}</T>
        <T muted bold size={12.5}>{t('totoTypes')}</T>
        <List>
          {types.map((x, i) => {
            const on = selected.includes(x.id);
            return (
              <Row
                key={x.id}
                last={i === types.length - 1}
                title={i18n.language === 'he' ? x.name_he : x.name_en}
                subtitle={x.country}
                onPress={() => setPicked(on ? selected.filter((s) => s !== x.id) : [...selected, x.id])}
                end={on ? <T bold color={c.accent}>✓</T> : <View />}
              />
            );
          })}
        </List>
      </Screen>
    </>
  );
}
