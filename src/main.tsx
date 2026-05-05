import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from '@navigation/root.navigator';
import { useAuthStore } from '@modules/auth/store';
import { hydrateCache } from '@common/utils/storage';

// TanStack Query client — §6 of MOBILE_RN_SETUP_GUIDE
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
});

export function Main() {
  const hydrateSession = useAuthStore((s) => s.hydrateSession);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      // 1. Fill the in-memory cache from AsyncStorage
      await hydrateCache();
      // 2. Restore auth state from cache (synchronous after step 1)
      hydrateSession();
      setReady(true);
    })();
  }, [hydrateSession]);

  if (!ready) {
    return (
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}
      >
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

export { queryClient };
