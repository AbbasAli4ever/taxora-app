import React, { useEffect } from 'react';
import { NavigationContainer }  from '@react-navigation/native';
import { SafeAreaProvider }     from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootNavigator }        from '@navigation/root.navigator';
import { useAuthStore }         from '@modules/auth/store';
import { useAppStore }          from '@common/store/appStore';

export function Main() {
  const hydrateSession = useAuthStore((s) => s.hydrateSession);
  const setReady       = useAppStore((s) => s.setReady);

  useEffect(() => {
    (async () => {
      await hydrateSession();
      setReady(true);
    })();
  }, [hydrateSession, setReady]);

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
