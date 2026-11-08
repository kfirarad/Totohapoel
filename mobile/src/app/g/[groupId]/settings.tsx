import { router } from 'expo-router';
import { useGroupId } from '@/lib/group-id';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Switch, TextInput } from 'react-native';
import { defaultColumn } from '@/lib/columns';
import { Avatar, Button, List, Loading, Row, Screen, Section, Segmented, T } from '@/components/ui';
import { isPast } from '@/lib/dates';
import { pickImage } from '@/lib/image';
import {
  uploadAvatar, useGroup, useGroupColumns, useGroupTypes, useLeaveGroup, useRegenerateCode, useSetGroupType, useTotoTypes, useUpdateGroup,
} from '@/lib/queries';
import { radius, useColors } from '@/lib/theme';

export default function GroupSettings() {
  const groupId = useGroupId();
  const { t, i18n } = useTranslation();
  const c = useColors();
  const group = useGroup(groupId).data;
  const types = useTotoTypes().data ?? [];
  const subs = useGroupTypes(groupId).data ?? [];
  const columns = useGroupColumns(groupId).data ?? [];
  const update = useUpdateGroup(groupId);
  const setType = useSetGroupType(groupId);
  const regen = useRegenerateCode(groupId);
  const leave = useLeaveGroup();
  const [name, setName] = useState<string>();
  if (!group) return <Loading />;

  const err = (e: Error) => Alert.alert(t('error'), e.message);
  const custom = columns.filter((col) => col.group_id === groupId);
  const current = defaultColumn(columns);

  return (
    <Screen>
      <List>
        <Row
          last
          onPress={async () => {
            const uri = await pickImage();
            if (uri) update.mutate({ avatar_url: await uploadAvatar(`groups/${groupId}.jpg`, uri) }, { onError: err });
          }}
          start={<Avatar url={group.avatar_url} name={group.name} size={56} square />}
          title={
            <TextInput
              value={name ?? group.name}
              onChangeText={setName}
              onEndEditing={() => name?.trim() && name !== group.name && update.mutate({ name: name.trim() }, { onError: err })}
              style={{ fontSize: 16, fontWeight: '700', color: c.ink, borderBottomWidth: 1, borderColor: c.line, paddingVertical: 4, borderRadius: radius.sm }}
            />
          }
          subtitle={t('changePhoto')}
        />
      </List>

      <Section>{t('joining')}</Section>
      <List>
        <Row
          title={<T>{t('groupType')}</T>}
          end={
            <Segmented
              value={group.is_open ? 'open' : 'closed'}
              onChange={(v) => update.mutate({ is_open: v === 'open' }, { onError: err })}
              options={[{ value: 'open', label: t('open') }, { value: 'closed', label: t('closed') }]}
            />
          }
        />
        <Row
          last
          title={<T>{t('inviteCode')} <T bold style={{ writingDirection: 'ltr' }}>{group.join_code}</T></T>}
          end={
            <Pressable onPress={() => Alert.alert(t('newCode'), t('newCodeConfirm'), [
              { text: t('cancel'), style: 'cancel' },
              { text: t('newCode'), onPress: () => regen.mutate(undefined, { onError: err }) },
            ])}>
              <T size={13} color={c.accent}>{t('newCode')}</T>
            </Pressable>
          }
        />
      </List>

      <Section>{t('totoTypes')}</Section>
      <List>
        {types.map((x, i) => (
          <Row
            key={x.id}
            last={i === types.length - 1}
            title={<T>{i18n.language === 'he' ? x.name_he : x.name_en}</T>}
            end={<Switch value={subs.includes(x.id)} trackColor={{ true: c.accent }} onValueChange={(on) => setType.mutate({ typeId: x.id, on }, { onError: err })} />}
          />
        ))}
      </List>

      <Section>{t('customColumns')}</Section>
      <List>
        {custom.map((col) => (
          <Row
            key={col.id}
            title={<T>{col.name}</T>}
            subtitle={`${col.games.length} · ${isPast(col.deadline) ? t('closedAt', { when: '' }) : t('open')}`}
            chevron
            onPress={() => router.push({ pathname: '/g/[groupId]/column/[columnId]', params: { groupId, columnId: col.id } })}
          />
        ))}
        {/* ponytail: custom-column editor (games, deadline, results) is the next screen to build; port of web admin ColumnForm. */}
        <Row last title={<T color={c.muted}>＋ {t('newColumn')}</T>} />
      </List>

      {current && !isPast(current.deadline) && (
        <>
          <Section>{t('groupBet')}</Section>
          <List>
            <Row
              last
              chevron
              title={<T>{t('editGroupBet')} · {current.name}</T>}
              onPress={() => router.push({ pathname: '/g/[groupId]/group-bet/[columnId]', params: { groupId, columnId: current.id } })}
            />
          </List>
        </>
      )}

      <Button
        title={t('leaveGroup')}
        kind="ghost"
        onPress={() => Alert.alert(t('leaveGroup'), t('leaveConfirm'), [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('leaveGroup'),
            style: 'destructive',
            onPress: () => leave.mutate(groupId, { onSuccess: () => router.replace('/groups'), onError: () => Alert.alert(t('lastAdmin')) }),
          },
        ])}
      />
    </Screen>
  );
}
