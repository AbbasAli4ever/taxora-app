import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@common/types';
import { authService } from '../auth.service';
import { clearTokens } from '@common/utils/storage';
import { useAuthStore } from '../store';
import { getApiErrorMessage } from '@common/utils/apiError';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
type RouteProps = RouteProp<AuthStackParamList, 'ResetPassword'>;

const schema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/\d/, 'Must have a number')
      .regex(/[^a-zA-Z0-9]/, 'Must have a symbol'),
    confirmPassword: z.string().min(1, 'Please confirm'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

const PRIMARY = '#0052cc';
const PRIMARY_DARK = '#003d9b';
const SURFACE = '#faf8ff';
const FIELD = 'rgba(255,255,255,0.86)';
const TEXT = '#191b23';
const BODY = '#434654';
const MUTED = '#737685';
const BORDER = '#dbe5ff';
const DANGER = '#ba1a1a';

function getStrengthScore(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  if (password.length >= 12) score++;
  return score;
}

const STRENGTH_LABEL = ['', 'WEAK', 'MEDIUM', 'STRONG', 'STRONG'];
const STRENGTH_COLOR = ['', DANGER, '#f59e0b', PRIMARY_DARK, PRIMARY_DARK];

type TokenState = 'loading' | 'valid' | 'invalid';

export function ResetPasswordScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const token = route.params?.token;

  const [tokenState, setTokenState] = useState<TokenState>(() => (token ? 'loading' : 'invalid'));
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const newPassword = useWatch({ control, name: 'newPassword' }) ?? '';
  const confirmPassword = useWatch({ control, name: 'confirmPassword' }) ?? '';
  const score = newPassword ? getStrengthScore(newPassword) : 0;

  const rules = [
    { text: '8+ characters', satisfied: newPassword.length >= 8 },
    { text: 'At least 1 number', satisfied: /\d/.test(newPassword) },
    { text: 'At least 1 symbol (@, #, $)', satisfied: /[^a-zA-Z0-9]/.test(newPassword) },
  ];
  const allRulesMet =
    rules.every((r) => r.satisfied) && !!newPassword && newPassword === confirmPassword;

  useEffect(() => {
    if (!token) {
      return;
    }
    authService
      .validateResetToken(token)
      .then((valid) => setTokenState(valid ? 'valid' : 'invalid'))
      .catch(() => setTokenState('invalid'));
  }, [token]);

  useEffect(() => {
    if (submitted) {
      const t = setTimeout(() => navigation.replace('Login'), 2000);
      return () => clearTimeout(t);
    }
  }, [submitted, navigation]);

  const onSubmit = async (data: FormData) => {
    if (!allRulesMet || !token) return;
    setServerError('');
    setSubmitting(true);
    try {
      await authService.resetPassword({ token, newPassword: data.newPassword });
      clearTokens();
      useAuthStore.getState().clearAuth();
      setSubmitted(true);
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = getApiErrorMessage(err, 'Failed to reset password');
      if (
        status === 400 &&
        (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid'))
      ) {
        setTokenState('invalid');
      } else if (status === 429) {
        setServerError('Too many attempts. Please try again later.');
      } else {
        setServerError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (tokenState === 'loading') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: SURFACE,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={PRIMARY_DARK} />
        <Text style={{ fontSize: 14, color: BODY, marginTop: 12 }}>Validating link...</Text>
      </View>
    );
  }

  if (tokenState === 'invalid') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: SURFACE,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            backgroundColor: '#ffdad6',
            borderRadius: 9999,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <MaterialCommunityIcons name="link-off" size={38} color={DANGER} />
        </View>
        <Text
          style={{
            fontSize: 22,
            fontWeight: '800',
            color: TEXT,
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          Link expired or invalid
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: BODY,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 32,
          }}
        >
          This reset link is no longer valid.{'\n'}Request a new one below.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('ForgotPassword')}
          style={{
            backgroundColor: PRIMARY_DARK,
            borderRadius: 12,
            height: 52,
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Request a new link</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (submitted) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: SURFACE,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            backgroundColor: '#dcfce7',
            borderRadius: 9999,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <MaterialCommunityIcons name="check-circle-outline" size={42} color="#16a34a" />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '800', color: TEXT }}>Password updated</Text>
        <Text style={{ fontSize: 14, color: BODY, marginTop: 8 }}>Redirecting to Sign In...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: SURFACE }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View
        style={{
          height: 64,
          backgroundColor: 'rgba(250,248,255,0.96)',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#e2e8f0',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 2,
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={25} color={PRIMARY_DARK} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '800', color: PRIMARY_DARK }}>FinanX</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: 24, paddingBottom: 16 }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: TEXT, marginBottom: 8 }}>
            Create new password
          </Text>
          <Text style={{ fontSize: 15, color: BODY, lineHeight: 22 }}>
            Your new password must be unique from those used previously to protect your FinanX
            account.
          </Text>
        </View>

        <LinearGradient
          colors={['#172033', '#4b5566']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: '100%',
            height: 128,
            borderRadius: 12,
            marginBottom: 24,
            backgroundColor: '#ededf8',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <MaterialCommunityIcons name="key-variant" size={64} color="#ffffff" />
          <View
            style={{
              position: 'absolute',
              right: -16,
              top: 18,
              width: 160,
              height: 2,
              backgroundColor: 'rgba(255,255,255,0.14)',
              transform: [{ rotate: '-24deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: 24,
              bottom: 22,
              width: 120,
              height: 2,
              backgroundColor: 'rgba(255,255,255,0.12)',
              transform: [{ rotate: '-24deg' }],
            }}
          />
        </LinearGradient>

        {/* Server error */}
        {!!serverError && (
          <View
            style={{
              backgroundColor: '#fff1f0',
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#ffd7d3',
            }}
          >
            <Text style={{ fontSize: 14, color: DANGER }}>{serverError}</Text>
          </View>
        )}

        <Text
          style={{
            fontSize: 12,
            color: BODY,
            letterSpacing: 0.6,
            fontWeight: '700',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          NEW PASSWORD
        </Text>

        {/* New password input */}
        <Controller
          control={control}
          name="newPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <LinearGradient
              colors={errors.newPassword ? ['#fff7f6', '#fff0ef'] : ['#ffffff', '#f0f5ff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                backgroundColor: FIELD,
                borderWidth: 1.5,
                borderColor: errors.newPassword ? DANGER : BORDER,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginBottom: 8,
                shadowColor: PRIMARY_DARK,
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.08,
                shadowRadius: 22,
                elevation: 4,
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: '#e9efff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={21}
                  color={errors.newPassword ? DANGER : PRIMARY_DARK}
                />
              </View>
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry={!showNew}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                placeholder="Enter new password"
                placeholderTextColor="#a7afc2"
                selectionColor={PRIMARY}
                style={{
                  flex: 1,
                  fontSize: 15,
                  color: TEXT,
                  height: 32,
                  padding: 0,
                  fontWeight: '600',
                  letterSpacing: 0,
                }}
              />
              <TouchableOpacity onPress={() => setShowNew((v) => !v)} style={{ paddingLeft: 8 }}>
                <MaterialCommunityIcons
                  name={showNew ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={MUTED}
                />
              </TouchableOpacity>
            </LinearGradient>
          )}
        />

        {/* Strength meter */}
        <View style={{ paddingHorizontal: 4, marginBottom: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                color: BODY,
                letterSpacing: 0.5,
                fontWeight: '700',
                textTransform: 'uppercase',
              }}
            >
              PASSWORD STRENGTH
            </Text>
            {score > 0 && (
              <Text
                style={{
                  fontSize: 10,
                  color: STRENGTH_COLOR[score],
                  fontWeight: '700',
                  letterSpacing: 0.5,
                }}
              >
                {STRENGTH_LABEL[score]}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 4, height: 6 }}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 9999,
                  backgroundColor: i < score ? STRENGTH_COLOR[score] : '#e1e2ec',
                }}
              />
            ))}
          </View>
        </View>

        {/* CONFIRM PASSWORD label */}
        <Text
          style={{
            fontSize: 12,
            color: BODY,
            letterSpacing: 0.6,
            fontWeight: '700',
            textTransform: 'uppercase',
            marginBottom: 6,
            marginTop: 4,
          }}
        >
          CONFIRM PASSWORD
        </Text>

        {/* Confirm password input */}
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <LinearGradient
              colors={errors.confirmPassword ? ['#fff7f6', '#fff0ef'] : ['#ffffff', '#f0f5ff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                backgroundColor: FIELD,
                borderWidth: 1.5,
                borderColor: errors.confirmPassword ? DANGER : BORDER,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginBottom: 24,
                shadowColor: PRIMARY_DARK,
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.08,
                shadowRadius: 22,
                elevation: 4,
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: '#e9efff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <MaterialCommunityIcons
                  name="lock-check-outline"
                  size={21}
                  color={errors.confirmPassword ? DANGER : PRIMARY_DARK}
                />
              </View>
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry={!showConfirm}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={handleSubmit(onSubmit)}
                placeholder="Repeat new password"
                placeholderTextColor="#a7afc2"
                selectionColor={PRIMARY}
                style={{
                  flex: 1,
                  fontSize: 15,
                  color: TEXT,
                  height: 32,
                  padding: 0,
                  fontWeight: '600',
                  letterSpacing: 0,
                }}
              />
              <TouchableOpacity
                onPress={() => setShowConfirm((v) => !v)}
                style={{ paddingLeft: 8 }}
              >
                <MaterialCommunityIcons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={MUTED}
                />
              </TouchableOpacity>
            </LinearGradient>
          )}
        />

        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 12,
            padding: 16,
            marginBottom: 32,
            shadowColor: '#101828',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.05,
            shadowRadius: 18,
            elevation: 3,
            borderWidth: 1,
            borderColor: '#e9edf6',
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: BODY,
              letterSpacing: 0.6,
              fontWeight: '700',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            SECURITY REQUIREMENTS
          </Text>
          {rules.map((rule) => (
            <View
              key={rule.text}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: rule.satisfied ? 'rgba(0,82,204,0.1)' : 'rgba(67,70,84,0.1)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons
                  name={rule.satisfied ? 'check-circle-outline' : 'circle-outline'}
                  size={18}
                  color={rule.satisfied ? PRIMARY_DARK : BODY}
                />
              </View>
              <Text
                style={{
                  fontSize: 14,
                  color: rule.satisfied ? PRIMARY_DARK : BODY,
                  fontWeight: rule.satisfied ? '600' : '400',
                }}
              >
                {rule.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Update Password button */}
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={submitting || !allRulesMet}
          style={{
            backgroundColor: !allRulesMet ? '#b2c5ff' : PRIMARY_DARK,
            borderRadius: 12,
            height: 56,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            shadowColor: allRulesMet ? PRIMARY_DARK : 'transparent',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: allRulesMet ? 4 : 0,
          }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }}>
                Update Password
              </Text>
              <MaterialCommunityIcons name="arrow-right" size={23} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        <Text style={{ textAlign: 'center', fontSize: 14, color: BODY, marginTop: 16 }}>
          Need help? <Text style={{ color: PRIMARY_DARK, fontWeight: '700' }}>Contact Support</Text>
        </Text>

        {/* Bottom indicator */}
        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <View style={{ width: 128, height: 4, backgroundColor: '#e1e2ec', borderRadius: 9999 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
