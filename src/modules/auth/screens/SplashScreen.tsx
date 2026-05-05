import React, { useEffect, useRef, useState } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { AuthStackParamList, RootStackParamList } from '@common/types';
import { authController } from '../auth.controller';
import { useAuthStore } from '../store';
import { getToken, getUser } from '@common/utils/storage';
import { User } from '@common/types';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<AuthStackParamList, 'Splash'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const MIN_DISPLAY_MS = 800;
const PRIMARY = '#0052cc';
const PRIMARY_DARK = '#003d9b';
const SURFACE = '#faf8ff';
const TEXT = '#191b23';
const MUTED = '#737685';

export function SplashScreen() {
  const navigation = useNavigation<Nav>();
  const { width: screenWidth } = useWindowDimensions();
  const [offlineNoCache] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);
  const barWidth = screenWidth * 0.33;
  const barX = useSharedValue(-barWidth);

  useEffect(() => {
    scale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) });
    barX.value = withRepeat(
      withSequence(
        withTiming(screenWidth + barWidth, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
        withTiming(-barWidth, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: barX.value }],
  }));

  useEffect(() => {
    (async () => {
      startTimeRef.current = Date.now();
      const elapsed = () => Date.now() - (startTimeRef.current ?? Date.now());
      const waitRemaining = () =>
        new Promise<void>((res) => setTimeout(res, Math.max(0, MIN_DISPLAY_MS - elapsed())));

      if (!getToken()) {
        await waitRemaining();
        navigation.replace('Login');
        return;
      }

      const success = await authController.bootSession();
      await waitRemaining();

      if (success) {
        const store = useAuthStore.getState();
        if (!store.user?.id) {
          navigation.replace('Login');
          return;
        }
        if (!store.company) {
          navigation.navigate('CompanySelect', { tempToken: '', companies: [] });
          return;
        }
      } else {
        const cachedUser = getUser<User>();
        if (!cachedUser) navigation.replace('Login');
      }
    })();
  }, []);

  return (
    <LinearGradient
      colors={['#ffffff', SURFACE, '#eef3ff']}
      locations={[0, 0.52, 1]}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      <View
        style={{
          position: 'absolute',
          top: 96,
          left: -32,
          width: 180,
          height: 260,
          borderRadius: 40,
          borderWidth: 1,
          borderColor: '#eef2ff',
          opacity: 0.9,
          transform: [{ rotate: '-18deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: -48,
          bottom: 112,
          width: 220,
          height: 220,
          borderRadius: 44,
          backgroundColor: '#edf2ff',
          opacity: 0.58,
          transform: [{ rotate: '14deg' }],
        }}
      />

      <Animated.View
        style={[
          cardStyle,
          {
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <View
          style={{
            width: 96,
            height: 96,
            backgroundColor: '#ffffff',
            borderRadius: 26,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
            shadowColor: PRIMARY_DARK,
            shadowOffset: { width: 0, height: 18 },
            shadowOpacity: 0.16,
            shadowRadius: 34,
            elevation: 12,
            borderWidth: 1.5,
            borderColor: '#eef2ff',
          }}
        >
          <MaterialCommunityIcons name="wallet-outline" size={44} color={PRIMARY_DARK} />
        </View>

        <Text
          style={{
            fontSize: 32,
            fontWeight: '800',
            color: PRIMARY_DARK,
            lineHeight: 40,
          }}
        >
          FinanX
        </Text>

        <Text
          style={{
            fontSize: 16,
            color: MUTED,
            marginTop: 6,
            lineHeight: 24,
            maxWidth: 280,
            textAlign: 'center',
          }}
        >
          Simplify your finances
        </Text>
      </Animated.View>

      <View
        style={{
          position: 'absolute',
          bottom: 48,
          left: screenWidth * 0.2,
          right: screenWidth * 0.2,
          height: 4,
          backgroundColor: '#e6eaf6',
          borderRadius: 9999,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={[
            barStyle,
            {
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: barWidth,
              backgroundColor: PRIMARY,
              borderRadius: 9999,
            },
          ]}
        />
      </View>

      <View
        style={{
          position: 'absolute',
          bottom: 24,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 12,
            color: '#c3c6d6',
            letterSpacing: 2.2,
            fontWeight: '600',
            textTransform: 'uppercase',
          }}
        >
          SECURE ACCESS
        </Text>
      </View>

      {offlineNoCache && (
        <View
          style={{
            position: 'absolute',
            bottom: 100,
            left: 24,
            right: 24,
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Text style={{ textAlign: 'center', fontWeight: '700', color: TEXT, fontSize: 15 }}>
            {"You're offline"}
          </Text>
          <Text style={{ textAlign: 'center', color: MUTED, fontSize: 13, marginTop: 4 }}>
            Connect to sign in.
          </Text>
        </View>
      )}
    </LinearGradient>
  );
}
