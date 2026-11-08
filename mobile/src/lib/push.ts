import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

/** Ask permission, get the Expo push token, store it. Needs a dev build + EAS projectId. */
export async function registerPush() {
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', { name: 'default', importance: AndroidImportance.DEFAULT });
  let { granted } = await Notifications.getPermissionsAsync();
  if (!granted) ({ granted } = await Notifications.requestPermissionsAsync());
  if (!granted) return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const { data } = await supabase.auth.getUser();
  if (data.user) await supabase.from('push_tokens').upsert({ user_id: data.user.id, token, platform: Platform.OS });
}
