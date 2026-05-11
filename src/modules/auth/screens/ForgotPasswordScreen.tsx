import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@common/types';
import { authService } from '../auth.service';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

const schema = z.object({ email: z.email('Enter a valid email address') });
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

function SuccessView({ email, onBack }: { email: string; onBack: () => void }) {
  const [openMailError, setOpenMailError] = useState(false);

  const openMailApp = async () => {
    const url = Platform.OS === 'ios' ? 'message://' : 'mailto:';
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        Linking.openURL(url);
      } else {
        setOpenMailError(true);
        setTimeout(() => setOpenMailError(false), 3000);
      }
    } catch {
      setOpenMailError(true);
      setTimeout(() => setOpenMailError(false), 3000);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: SURFACE }}>
      <View
        style={{
          height: 64,
          backgroundColor: 'rgba(250,248,255,0.96)',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#f1f5f9',
        }}
      >
        <TouchableOpacity onPress={onBack} style={{ padding: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={25} color={PRIMARY_DARK} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '800', color: PRIMARY_DARK }}>FinanX</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingTop: 48,
          paddingBottom: 40,
        }}
      >
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <LinearGradient
            colors={['#e9efff', '#d7e2ff']}
            style={{
              width: 96,
              height: 96,
              borderRadius: 9999,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: PRIMARY_DARK,
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.12,
              shadowRadius: 24,
              elevation: 6,
            }}
          >
            <MaterialCommunityIcons name="email-check-outline" size={48} color={PRIMARY_DARK} />
          </LinearGradient>
        </View>

        <Text style={{ fontSize: 24, fontWeight: '800', color: TEXT, marginBottom: 8 }}>
          Check your email
        </Text>
        <Text style={{ fontSize: 16, color: BODY, lineHeight: 24, marginBottom: 8 }}>
          {"If an account exists with this email, we've sent a reset link to "}
          <Text style={{ color: PRIMARY_DARK, fontWeight: '700' }}>{email}</Text>
          {'. The link expires in 1 hour.'}
        </Text>

        {openMailError && (
          <View
            style={{
              backgroundColor: '#fff7ed',
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 10,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: '#fed7aa',
            }}
          >
            <Text style={{ fontSize: 13, color: '#92400e', textAlign: 'center' }}>
              No email app found on this device.
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={openMailApp}
          style={{
            backgroundColor: PRIMARY_DARK,
            borderRadius: 12,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>Open Mail App</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onBack} style={{ alignItems: 'center', marginTop: 4 }}>
          <Text style={{ fontSize: 14, color: BODY }}>
            Back to <Text style={{ color: PRIMARY_DARK, fontWeight: '700' }}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export function ForgotPasswordScreen() {
  const navigation = useNavigation<Nav>();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    const email = data.email.trim();
    try {
      await authService.forgotPassword({ email });
    } catch (err: any) {
      // non-revealing — always show success
    } finally {
      setSubmitting(false);
      setSubmittedEmail(email);
      setSubmitted(true);
    }
  };

  if (submitted) {
    return <SuccessView email={submittedEmail} onBack={() => navigation.navigate('Login')} />;
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
        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ padding: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={25} color={PRIMARY_DARK} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '800', color: PRIMARY_DARK }}>FinanX</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 24 }}>
          <LinearGradient
            colors={['#e9efff', '#d7e2ff']}
            style={{
              width: 96,
              height: 96,
              borderRadius: 9999,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: PRIMARY_DARK,
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.12,
              shadowRadius: 24,
              elevation: 6,
            }}
          >
            <MaterialCommunityIcons name="lock-reset" size={50} color={PRIMARY_DARK} />
          </LinearGradient>
        </View>

        <Text style={{ fontSize: 26, fontWeight: '800', color: TEXT, marginBottom: 8 }}>
          Reset password
        </Text>
        <Text style={{ fontSize: 16, color: BODY, lineHeight: 24, marginBottom: 32 }}>
          {"Enter your email and we'll send a reset link"}
        </Text>

        {/* Email input — floating label style matching design */}
        <View style={{ marginBottom: 32 }}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <LinearGradient
                  colors={errors.email ? ['#fff7f6', '#fff0ef'] : ['#ffffff', '#f0f5ff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    backgroundColor: FIELD,
                    borderWidth: 1.5,
                    borderColor: errors.email ? DANGER : BORDER,
                    borderRadius: 16,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
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
                      name="email-outline"
                      size={21}
                      color={errors.email ? DANGER : PRIMARY_DARK}
                    />
                  </View>
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="send"
                    onSubmitEditing={handleSubmit(onSubmit)}
                    placeholder="you@company.com"
                    placeholderTextColor="#a7afc2"
                    selectionColor={PRIMARY}
                    style={{
                      flex: 1,
                      fontSize: 16,
                      color: TEXT,
                      height: 32,
                      padding: 0,
                      fontWeight: '600',
                    }}
                  />
                </LinearGradient>
                <Text
                  style={{
                    fontSize: 12,
                    color: errors.email ? DANGER : MUTED,
                    marginTop: 6,
                    paddingHorizontal: 2,
                  }}
                >
                  {errors.email ? errors.email.message : 'example@finanx.com'}
                </Text>
              </View>
            )}
          />
        </View>

        {/* Send Reset Link button */}
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={submitting}
          style={{
            backgroundColor: PRIMARY,
            borderRadius: 12,
            height: 56,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            shadowColor: PRIMARY_DARK,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 4,
            opacity: submitting ? 0.8 : 1,
          }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }}>
                Send Reset Link
              </Text>
              <MaterialCommunityIcons name="send-outline" size={22} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Footer */}
        <View
          style={{
            marginTop: 40,
            paddingTop: 24,
            borderTopWidth: 1,
            borderTopColor: '#e1e2ec',
            gap: 16,
          }}
        >
          <Text style={{ textAlign: 'center', fontSize: 14, color: BODY }}>
            Still having trouble?{' '}
            <Text style={{ color: PRIMARY_DARK, fontWeight: '700' }}>Contact Support</Text>
          </Text>

          <View style={{ flexDirection: 'row', gap: 8 }}>
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
                ENCRYPTED
              </Text>
              <Text style={{ fontSize: 14, color: TEXT, fontWeight: '600' }}>256-bit AES</Text>
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
              <MaterialCommunityIcons name="headset" size={22} color="#7b2600" />
              <Text
                style={{
                  fontSize: 12,
                  color: BODY,
                  letterSpacing: 0.6,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                }}
              >
                ASSISTANCE
              </Text>
              <Text style={{ fontSize: 14, color: TEXT, fontWeight: '600' }}>24/7 Help</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
