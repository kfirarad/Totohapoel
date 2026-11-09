import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Button, Segmented, T } from '@/components/ui';
import { devSignIn, googleReady, signInWithApple, signInWithGoogle } from '@/lib/auth';
import { setLang, type Lang } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

export default function SignIn() {
  const { t, i18n } = useTranslation();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [apple, setApple] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { AppleAuthentication.isAvailableAsync().then(setApple); }, []);

  const run = (fn: () => Promise<void>) => async () => {
    setBusy(true);
    try { await fn(); } catch (e) { Alert.alert(t('error'), String((e as Error).message ?? e)); } finally { setBusy(false); }
  };
  const changeLang = async (l: Lang) => { if (!(await setLang(l))) Alert.alert(t('restartManually')); };

  return (
    <View style={{ flex: 1, backgroundColor: c.surface, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16, paddingHorizontal: 16 }}>
      <View style={{ alignSelf: 'flex-end', width: 120 }}>
        <Segmented value={i18n.language as Lang} onChange={changeLang} options={[{ value: 'he', label: 'עב' }, { value: 'en', label: 'EN' }]} />
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <Avatar name="⚽" size={88} square />
        <T bold size={28} style={{ textAlign: 'center' }}>{t('appName')}</T>
        <T muted style={{ textAlign: 'center', maxWidth: 260 }}>{t('tagline')}</T>
      </View>
      <View style={{ gap: 10 }}>
        {apple && Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={14}
            style={{ height: 50 }}
            onPress={run(signInWithApple)}
          />
        )}
        {googleReady && <Button title={t('signInGoogle')} onPress={run(signInWithGoogle)} loading={busy} />}
        {__DEV__ && !!process.env.EXPO_PUBLIC_DEV_PASSWORD && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button small kind="ghost" style={{ flex: 1 }} title="Dev A" onPress={run(() => devSignIn('a'))} />
            <Button small kind="ghost" style={{ flex: 1 }} title="Dev B" onPress={run(() => devSignIn('b'))} />
          </View>
        )}
        <T muted size={11.5} style={{ textAlign: 'center' }}>{t('terms')}</T>
      </View>
    </View>
  );
}
