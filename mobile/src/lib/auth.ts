import type { Session } from '@supabase/supabase-js';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase';

const googleReady = !!process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID && !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
if (googleReady)
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });

type Auth = { session: Session | null; loading: boolean };
export const AuthContext = createContext<Auth>({ session: null, loading: true });

export const useAuth = () => useContext(AuthContext);
export const useUserId = () => useContext(AuthContext).session?.user.id ?? '';

export async function signInWithGoogle() {
  if (!googleReady) throw new Error('Google sign-in not configured (EXPO_PUBLIC_GOOGLE_*_CLIENT_ID)');
  await GoogleSignin.hasPlayServices();
  const res = await GoogleSignin.signIn();
  if (res.type !== 'success' || !res.data.idToken) return;
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: res.data.idToken });
  if (error) throw error;
}

export async function signInWithApple() {
  try {
    const cred = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
    if (!cred.identityToken) return;
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken });
    if (error) throw error;
    // Apple sends the name only on first sign-in; persist it.
    const name = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(' ');
    if (name) await supabase.auth.updateUser({ data: { full_name: name } });
  } catch (e) {
    if ((e as { code?: string }).code !== 'ERR_REQUEST_CANCELED') throw e;
  }
}

export async function signOut() {
  await GoogleSignin.signOut().catch(() => {});
  await supabase.auth.signOut();
}

export const PENDING_JOIN = 'pending-join';

/** __DEV__ only: local Supabase test users (password from EXPO_PUBLIC_DEV_PASSWORD). */
export async function devSignIn(who: 'a' | 'b') {
  const email = `dev-${who}@groupbet.test`;
  const password = process.env.EXPO_PUBLIC_DEV_PASSWORD!;
  const res = await supabase.auth.signInWithPassword({ email, password });
  if (!res.error) return;
  const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: who === 'a' ? 'Dana Dev' : 'Ben Dev' } } });
  if (error) throw error;
}
