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
  Alert,
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

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<AuthStackParamList, 'MFAChallenge'>,
  NativeStackNavigationProp<RootStackParamList>
>;
type RouteProps = RouteProp<AuthStackParamList, 'MFAChallenge'>;

const EXPIRY_SECONDS = 5 * 60;
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
  const { tempToken } = route.params;

  // TOTP mode state
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  // Backup code mode state
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [inputsDisabled, setInputsDisabled] = useState(false);
  const [expiryCountdown, setExpiryCountdown] = useState(EXPIRY_SECONDS);
  const [expired, setExpired] = useState(false);

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

  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setExpiryCountdown((s) => {
        if (s <= 1) {
          clearInterval(countdownRef.current!);
          setExpired(true);
          setInputsDisabled(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const formatCountdown = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const handleMFAResult = useCallback(
    async (result: Awaited<ReturnType<typeof authController.verifyMFA>>) => {
      setSubmitting(false);
      if (result.type === 'success') return;

      if (result.type === 'company') {
        navigation.navigate('CompanySelect', {
          mode: 'post-login',
          tempToken: result.tempToken,
          companies: result.companies,
        });
        return;
      }

      const msg = result.message ?? '';
      if (
        msg.includes('Invalid or expired 2FA token') ||
        msg.includes('Invalid token purpose') ||
        msg.includes('2FA is not enabled')
      ) {
        Alert.alert('Session expired', 'Please sign in again.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
      } else if (msg.includes('deactivated')) {
        Alert.alert(
          'Account deactivated',
          'Your account has been deactivated. Contact your admin.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }],
        );
      } else if (msg.includes('Invalid backup code')) {
        setBackupCode('');
        setServerError('Invalid backup code. Please try again.');
      } else {
        // Invalid TOTP code
        setServerError('Invalid code. Please try again.');
        triggerShake();
        setCode(Array(6).fill(''));
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    },
    [navigation],
  );

  const submitTOTP = useCallback(
    async (digits: string[]) => {
      const codeStr = digits.join('');
      if (codeStr.length < 6 || submitting || inputsDisabled) return;
      setSubmitting(true);
      setServerError('');
      const result = await authController.verifyMFA(tempToken, codeStr, false);
      await handleMFAResult(result);
    },
    [submitting, inputsDisabled, tempToken, handleMFAResult],
  );

  const submitBackupCode = useCallback(async () => {
    if (!backupCode || submitting || inputsDisabled) return;
    setSubmitting(true);
    setServerError('');
    const result = await authController.verifyMFA(tempToken, backupCode, true);
    await handleMFAResult(result);
  }, [backupCode, submitting, inputsDisabled, tempToken, handleMFAResult]);

  const handleCellChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
    if (newCode.every((d) => d !== '')) setTimeout(() => submitTOTP(newCode), 250);
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const switchToBackup = () => {
    setUseBackupCode(true);
    setServerError('');
    setCode(Array(6).fill(''));
  };

  const switchToTOTP = () => {
    setUseBackupCode(false);
    setServerError('');
    setBackupCode('');
  };

  const isVerifyDisabled =
    submitting || inputsDisabled || (useBackupCode ? backupCode.length < 1 : code.some((d) => !d));

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

        {/* Expiry countdown */}
        <View style={{ paddingHorizontal: 8 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '700',
              color: expiryCountdown <= 60 ? DANGER : MUTED,
              letterSpacing: 0.4,
            }}
          >
            {formatCountdown(expiryCountdown)}
          </Text>
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
          {/* Shield icon */}
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
            {useBackupCode ? 'Enter Backup Code' : 'Authenticator Code'}
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
            {useBackupCode
              ? 'Enter your 8-character backup code'
              : 'Enter the 6-digit code from your authenticator app'}
          </Text>

          {/* Expired state */}
          {expired && (
            <View
              style={{
                backgroundColor: '#fff1f0',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                marginTop: 24,
                width: '100%',
                borderWidth: 1,
                borderColor: '#ffd7d3',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <MaterialCommunityIcons name="clock-alert-outline" size={28} color={DANGER} />
              <Text style={{ fontSize: 14, color: DANGER, textAlign: 'center', fontWeight: '600' }}>
                Your session has expired. Go back and sign in again.
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                style={{
                  backgroundColor: DANGER,
                  borderRadius: 10,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                  Back to Login
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Error banner */}
          {!expired && !!serverError && (
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

          {/* Input area — TOTP or Backup code */}
          {!expired && (
            <>
              {useBackupCode ? (
                /* Backup code single input */
                <View style={{ width: '100%', marginTop: 32 }}>
                  <TextInput
                    value={backupCode}
                    onChangeText={(t) =>
                      setBackupCode(
                        t
                          .replace(/[^a-zA-Z0-9]/g, '')
                          .slice(0, 8)
                          .toUpperCase(),
                      )
                    }
                    placeholder="XXXXXXXX"
                    placeholderTextColor="#b7bdcf"
                    maxLength={8}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    editable={!inputsDisabled && !submitting}
                    style={{
                      backgroundColor: FIELD,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: backupCode ? PRIMARY : BORDER,
                      height: 56,
                      paddingHorizontal: 16,
                      fontSize: 22,
                      fontWeight: '700',
                      color: TEXT,
                      textAlign: 'center',
                      letterSpacing: 4,
                    }}
                  />
                  <Text style={{ fontSize: 12, color: MUTED, textAlign: 'center', marginTop: 8 }}>
                    8 characters — letters and numbers only
                  </Text>
                </View>
              ) : (
                /* TOTP 6-cell input */
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
                        textContentType="oneTimeCode"
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
              )}

              {/* Toggle backup / totp */}
              <TouchableOpacity
                onPress={useBackupCode ? switchToTOTP : switchToBackup}
                style={{ marginTop: 20 }}
              >
                <Text style={{ fontSize: 14, color: PRIMARY_DARK, fontWeight: '700' }}>
                  {useBackupCode ? 'Use authenticator code instead' : 'Use a backup code instead'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Verify button + footer */}
        {!expired && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 32 }}>
            <TouchableOpacity
              onPress={useBackupCode ? submitBackupCode : () => submitTOTP(code)}
              disabled={isVerifyDisabled}
              style={{
                backgroundColor: isVerifyDisabled ? '#b2c5ff' : PRIMARY_DARK,
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
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
