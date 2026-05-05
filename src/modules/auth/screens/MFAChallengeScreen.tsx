import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { AuthStackParamList, RootStackParamList } from '@common/types';
import { authController } from '../auth.controller';
import { authService } from '../auth.service';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<AuthStackParamList, 'MFAChallenge'>,
  NativeStackNavigationProp<RootStackParamList>
>;
type RouteProps = RouteProp<AuthStackParamList, 'MFAChallenge'>;

const RESEND_COOLDOWN = 60;
const PRIMARY = '#0052cc';
const PRIMARY_DARK = '#003d9b';
const SURFACE = '#faf8ff';
const FIELD = '#f4f6ff';
const TEXT = '#191b23';
const BODY = '#434654';
const MUTED = '#737685';
const BORDER = '#d8deee';
const DANGER = '#ba1a1a';

export function MFAChallengeScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { tempToken, method, email } = route.params;

  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(45);
  const [inputsDisabled, setInputsDisabled] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>(Array(6).fill(null));
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  const triggerShake = () => {
    shakeX.set(
      withSequence(
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(-6, { duration: 60 }),
        withTiming(6, { duration: 60 }),
        withTiming(0, { duration: 60 }),
      ),
    );
  };

  const startCountdown = (seconds: number = RESEND_COOLDOWN) => {
    setResendCountdown(seconds);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setResendCountdown((s) => {
        if (s <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    // Start countdown on mount for email method
    const kickoff = setTimeout(() => {
      if (method === 'email') startCountdown(45);
    }, 0);
    return () => {
      clearTimeout(kickoff);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const submitCode = useCallback(
    async (digits: string[]) => {
      const codeStr = digits.join('');
      if (codeStr.length < 6 || submitting || inputsDisabled) return;
      setSubmitting(true);
      setServerError('');
      const result = await authController.verifyMFA(tempToken, codeStr);
      setSubmitting(false);

      if (result.type === 'success') return;
      if (result.type === 'company') {
        navigation.navigate('CompanySelect', {
          tempToken: result.tempToken,
          companies: result.companies,
        });
        return;
      }
      const msg = result.message;
      if (msg.toLowerCase().includes('expired')) {
        setServerError('Code expired. Request a new one.');
      } else if (msg.toLowerCase().includes('many') || msg.includes('429')) {
        setServerError('Too many attempts. Please wait.');
        setInputsDisabled(true);
      } else {
        setServerError('Invalid code. Please try again.');
        triggerShake();
        setCode(Array(6).fill(''));
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    },
    [submitting, inputsDisabled, tempToken, navigation],
  );

  const handleCellChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
    if (newCode.every((d) => d !== '')) setTimeout(() => submitCode(newCode), 250);
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    try {
      const res = await authService.resend2FA(tempToken);
      startCountdown(res.retryAfter ?? RESEND_COOLDOWN);
    } catch {
      startCountdown(RESEND_COOLDOWN);
    }
  };

  const formatCountdown = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: SURFACE }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Top AppBar */}
      <View
        style={{
          height: 56,
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: '#f1f5f9',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 2,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={{ padding: 8, borderRadius: 9999 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={25} color={PRIMARY_DARK} />
        </TouchableOpacity>

        <Text style={{ fontSize: 24, fontWeight: '800', color: TEXT }}>{"Verify it's you"}</Text>

        <View style={{ padding: 8 }}>
          <MaterialCommunityIcons name="account-circle-outline" size={26} color={PRIMARY_DARK} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Main content — centered */}
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 16,
            paddingVertical: 32,
          }}
        >
          {/* Shield icon in primary-fixed rounded square */}
          <LinearGradient
            colors={['#e9efff', '#d7e2ff']}
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
              shadowColor: PRIMARY_DARK,
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.12,
              shadowRadius: 24,
              elevation: 6,
            }}
          >
            <MaterialCommunityIcons name="shield-lock-outline" size={50} color={PRIMARY_DARK} />
          </LinearGradient>

          {/* Heading */}
          <Text style={{ fontSize: 22, fontWeight: '800', color: TEXT, marginBottom: 8 }}>
            Authenticator Code
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: BODY,
              textAlign: 'center',
              maxWidth: 280,
              lineHeight: 22,
            }}
          >
            {method === 'email'
              ? `We sent a code to ${email?.replace(/(.{2})([^@]*)(@.*)/, '$1***$3')}`
              : 'Enter the 6-digit code from your authenticator'}
          </Text>

          {/* Error */}
          {!!serverError && (
            <View
              style={{
                backgroundColor: '#fff1f0',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 10,
                marginTop: 16,
                width: '100%',
                borderWidth: 1,
                borderColor: '#ffd7d3',
              }}
            >
              <Text style={{ fontSize: 14, color: DANGER, textAlign: 'center' }}>
                {serverError}
              </Text>
            </View>
          )}

          {/* OTP cells — 6 cells in grid */}
          <Animated.View
            style={[
              shakeStyle,
              {
                flexDirection: 'row',
                justifyContent: 'center',
                marginTop: 32,
                gap: 8,
              },
            ]}
          >
            {code.map((digit, index) => (
              <View
                key={index}
                style={{
                  width: 48,
                  height: 56,
                  backgroundColor: FIELD,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: digit ? PRIMARY : BORDER,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#101828',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.04,
                  shadowRadius: 16,
                  elevation: 2,
                }}
              >
                <TextInput
                  ref={(r) => {
                    inputRefs.current[index] = r;
                  }}
                  value={digit || ''}
                  onChangeText={(text) => handleCellChange(text, index)}
                  onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(key, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  selectTextOnFocus
                  editable={!inputsDisabled && !submitting}
                  placeholder="0"
                  placeholderTextColor="#b7bdcf"
                  style={{
                    fontSize: 20,
                    fontWeight: '700',
                    color: TEXT,
                    textAlign: 'center',
                    width: '100%',
                    height: '100%',
                    padding: 0,
                  }}
                />
              </View>
            ))}
          </Animated.View>

          {/* Resend section */}
          <View style={{ alignItems: 'center', marginTop: 24, gap: 4 }}>
            <TouchableOpacity onPress={handleResend} disabled={resendCountdown > 0}>
              <Text
                style={{
                  fontSize: 14,
                  color: resendCountdown > 0 ? '#b7bdcf' : PRIMARY_DARK,
                  fontWeight: '700',
                }}
              >
                Resend code
              </Text>
            </TouchableOpacity>
            {resendCountdown > 0 && (
              <Text
                style={{
                  fontSize: 12,
                  color: BODY,
                  letterSpacing: 0.6,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                }}
              >
                Available in {formatCountdown(resendCountdown)}
              </Text>
            )}
          </View>
        </View>

        {/* Verify button + footer */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 32 }}>
          <TouchableOpacity
            onPress={() => submitCode(code)}
            disabled={submitting || inputsDisabled || code.some((d) => !d)}
            style={{
              backgroundColor:
                submitting || inputsDisabled || code.some((d) => !d) ? '#b2c5ff' : PRIMARY_DARK,
              borderRadius: 12,
              height: 56,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              shadowColor: PRIMARY_DARK,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }}>Verify</Text>
                <MaterialCommunityIcons name="chevron-right" size={26} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          <Text style={{ textAlign: 'center', fontSize: 14, color: MUTED, marginTop: 12 }}>
            Need help?{' '}
            <Text style={{ color: PRIMARY_DARK, fontWeight: '700' }}>Contact support</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
