import '@/lib/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { AuthProvider } from '@/lib/auth-provider';
import { Loading } from '@/components/ui';

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } });

function Root() {
  const { session, loading } = useAuth();
  const { t } = useTranslation();
  if (loading) return <Loading />;
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="groups/index" options={{ title: t('myGroups') }} />
        <Stack.Screen name="groups/new" options={{ presentation: 'modal', title: t('newGroup') }} />
        <Stack.Screen name="join/index" options={{ presentation: 'modal', title: t('joinTitle') }} />
        <Stack.Screen name="profile" options={{ presentation: 'modal', title: t('profile') }} />
        <Stack.Screen
          name="switcher"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.6, 1], sheetGrabberVisible: true, headerShown: false }}
        />
        <Stack.Screen name="g/[groupId]" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Screen name="join/[code]" options={{ presentation: 'modal', title: t('joinTitle') }} />
    </Stack>
  );
}

export default function Layout() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </QueryClientProvider>
  );
}
