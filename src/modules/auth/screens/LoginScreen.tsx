import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { AuthStackParamList, RootStackParamList } from '@common/types';
import { authController } from '../auth.controller';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<AuthStackParamList, 'Login'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const schema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
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

function FloatingInput({
  label,
  value,
  onChange,
  onBlur,
  error,
  secureTextEntry,
  keyboardType,
  returnKeyType,
  onSubmitEditing,
  inputRef,
  showToggle,
  showPassword,
  onTogglePassword,
  placeholder,
  iconName,
}: any) {
  return (
    <View style={{ marginBottom: 0 }}>
      <LinearGradient
        colors={error ? ['#fff7f6', '#fff0ef'] : ['#ffffff', '#f0f5ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          backgroundColor: FIELD,
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: error ? DANGER : BORDER,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingVertical: 12,
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
          <MaterialCommunityIcons name={iconName} size={21} color={error ? DANGER : PRIMARY_DARK} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 11,
              color: error ? DANGER : MUTED,
              letterSpacing: 0.3,
              marginBottom: 2,
              fontWeight: '700',
              textTransform: 'uppercase',
            }}
          >
            {label}
          </Text>
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            secureTextEntry={secureTextEntry && !showPassword}
            keyboardType={keyboardType || 'default'}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={secureTextEntry ? 'password' : 'email'}
            textContentType={secureTextEntry ? 'password' : 'emailAddress'}
            returnKeyType={returnKeyType || 'next'}
            onSubmitEditing={onSubmitEditing}
            placeholder={placeholder || ''}
            placeholderTextColor="#a7afc2"
            selectionColor={PRIMARY}
            style={{
              fontSize: 16,
              color: TEXT,
              height: 32,
              padding: 0,
              fontWeight: '600',
              letterSpacing: 0,
            }}
          />
        </View>
        {showToggle && (
          <TouchableOpacity
            onPress={onTogglePassword}
            style={{ paddingLeft: 10, paddingVertical: 8 }}
          >
            <MaterialCommunityIcons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={MUTED}
            />
          </TouchableOpacity>
        )}
      </LinearGradient>
      {error && (
        <Text style={{ fontSize: 12, color: DANGER, marginTop: 6, paddingHorizontal: 4 }}>
          {error}
        </Text>
      )}
    </View>
  );
}

export function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [failCount, setFailCount] = useState(0);
  const [biometric, setBiometric] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: FormData) => {
    setServerError('');
    setSubmitting(true);
    const result = await authController.login({
      email: data.email.trim(),
      password: data.password,
    });
    setSubmitting(false);

    if (result.type === 'success') return;
    if (result.type === 'mfa') {
      navigation.navigate('MFAChallenge', {
        tempToken: result.tempToken,
        method: result.method,
        email: data.email.trim(),
        password: data.password,
      });
      return;
    }
    if (result.type === 'company') {
      navigation.navigate('CompanySelect', {
        tempToken: result.tempToken,
        companies: result.companies,
      });
      return;
    }
    setServerError(result.message ?? 'Something went wrong');
    setFailCount((c) => c + 1);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: SURFACE }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand section */}
        <View
          style={{ alignItems: 'center', paddingTop: 72, paddingBottom: 34, paddingHorizontal: 16 }}
        >
          <LinearGradient
            colors={['#e9efff', '#d7e2ff']}
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              shadowColor: PRIMARY_DARK,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.12,
              shadowRadius: 20,
              elevation: 5,
              borderWidth: 1,
              borderColor: '#edf2ff',
            }}
          >
            <MaterialCommunityIcons name="bank-outline" size={34} color={PRIMARY_DARK} />
          </LinearGradient>
          <Text
            style={{
              fontSize: 32,
              fontWeight: '800',
              color: TEXT,
              lineHeight: 40,
              textAlign: 'center',
            }}
          >
            Welcome back
          </Text>
          <Text style={{ fontSize: 15, color: BODY, marginTop: 4, textAlign: 'center' }}>
            Sign in to your FinanX dashboard
          </Text>
        </View>

        {/* Form */}
        <View style={{ paddingHorizontal: 16 }}>
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

          {/* Email */}
          <View style={{ marginBottom: 16 }}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <FloatingInput
                  label="Email address"
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                  keyboardType="email-address"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  placeholder="you@company.com"
                  iconName="email-outline"
                />
              )}
            />
          </View>

          {/* Password */}
          <View style={{ marginBottom: 8 }}>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <FloatingInput
                  label="Password"
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  secureTextEntry
                  showToggle
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword((v) => !v)}
                  inputRef={passwordRef}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit(onSubmit)}
                  placeholder="Enter password"
                  iconName="lock-outline"
                />
              )}
            />
          </View>

          {/* Forgot password */}
          <TouchableOpacity
            style={{ alignSelf: 'flex-end', marginBottom: 20, marginTop: 4 }}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text
              style={{
                fontSize: 12,
                color: PRIMARY_DARK,
                fontWeight: '600',
                letterSpacing: 0.05,
                textTransform: failCount >= 3 ? undefined : undefined,
                textDecorationLine: failCount >= 3 ? 'underline' : 'none',
              }}
            >
              Forgot password?
            </Text>
          </TouchableOpacity>

          {/* Biometric toggle row */}
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#e6eaf4',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              marginBottom: 24,
              shadowColor: '#101828',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.06,
              shadowRadius: 18,
              elevation: 3,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="face-recognition" size={24} color={MUTED} />
              <Text style={{ fontSize: 15, color: TEXT, fontWeight: '500' }}>
                Use Face ID next time
              </Text>
            </View>
            <Switch
              value={biometric}
              onValueChange={setBiometric}
              trackColor={{ false: '#dfe3ee', true: PRIMARY }}
              thumbColor="#ffffff"
            />
          </View>

          {/* Sign In button */}
          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={submitting}
            style={{
              backgroundColor: PRIMARY_DARK,
              borderRadius: 12,
              height: 56,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: PRIMARY_DARK,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
              opacity: submitting ? 0.8 : 1,
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Contact admin */}
          <View style={{ alignItems: 'center', marginTop: 16 }}>
            <Text style={{ fontSize: 14, color: BODY }}>
              New here?{' '}
              <Text style={{ color: PRIMARY_DARK, fontWeight: '700' }}>Contact admin</Text>
            </Text>
          </View>
        </View>

        {/* Feature cards grid */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginTop: 32, gap: 16 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: '#eef2ff',
              borderRadius: 12,
              padding: 16,
              gap: 4,
              borderWidth: 1,
              borderColor: '#e1e8ff',
            }}
          >
            <MaterialCommunityIcons name="shield-check-outline" size={22} color={PRIMARY_DARK} />
            <Text
              style={{
                fontSize: 12,
                color: BODY,
                letterSpacing: 0.6,
                fontWeight: '700',
                textTransform: 'uppercase',
              }}
            >
              SECURE LOGIN
            </Text>
            <Text style={{ fontSize: 14, color: TEXT, fontWeight: '600' }}>256-bit encryption</Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: '#eef2ff',
              borderRadius: 12,
              padding: 16,
              gap: 4,
              borderWidth: 1,
              borderColor: '#e1e8ff',
            }}
          >
            <MaterialCommunityIcons name="chart-timeline-variant" size={22} color={PRIMARY_DARK} />
            <Text
              style={{
                fontSize: 12,
                color: BODY,
                letterSpacing: 0.6,
                fontWeight: '700',
                textTransform: 'uppercase',
              }}
            >
              REAL-TIME
            </Text>
            <Text style={{ fontSize: 14, color: TEXT, fontWeight: '600' }}>Active monitoring</Text>
          </View>
        </View>

        {/* Bottom watermark */}
        <View
          style={{
            height: 128,
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingBottom: 16,
            opacity: 0.2,
          }}
        >
          <Text style={{ fontSize: 56, fontWeight: '800', color: PRIMARY_DARK }}>FinanX</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
