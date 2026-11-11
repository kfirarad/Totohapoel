import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, TextInput, View } from 'react-native';
import { Button, Screen, T } from '@/components/ui';
import { useColors } from '@/lib/theme';

const LEN = 6;
const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, LEN);

/** Code entry: one hidden TextInput rendered as 6 boxes; auto-advances to the landing on the 6th char. */
export default function JoinCode() {
  const { t } = useTranslation();
  const c = useColors();
  const [code, setCode] = useState('');
  const go = (v: string) => router.replace({ pathname: '/join/[code]', params: { code: v } });
  const change = (s: string) => { const v = clean(s); setCode(v); if (v.length === LEN) go(v); };

  return (
    <Screen style={{ paddingTop: 40, gap: 16 }}>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <T bold size={20}>{t('enterCode')}</T>
        <T muted size={13}>{t('codeHint')}</T>
      </View>
      <Pressable style={{ flexDirection: 'row', direction: 'ltr', gap: 6, justifyContent: 'center' }}>
        {Array.from({ length: LEN }, (_, i) => (
          <View key={i} style={{ width: 44, height: 54, borderRadius: 10, borderWidth: 1.5, borderColor: i === code.length ? c.accent : c.line, alignItems: 'center', justifyContent: 'center' }}>
            <T bold size={22}>{code[i] ?? ''}</T>
          </View>
        ))}
        <TextInput
          value={code}
          onChangeText={change}
          autoFocus
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={LEN}
          style={{ position: 'absolute', inset: 0, opacity: 0.02 }}
          accessibilityLabel={t('enterCode')}
        />
      </Pressable>
      <Button kind="primary" title={t('continue')} disabled={code.length < LEN} onPress={() => go(code)} />
      <Button kind="ghost" title={t('paste')} onPress={async () => change(await Clipboard.getStringAsync())} />
    </Screen>
  );
}
