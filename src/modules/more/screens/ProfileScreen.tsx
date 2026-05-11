import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  Image,
  ActionSheetIOS,
  Platform,
  KeyboardAvoidingView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import { MoreStackParamList, RootStackParamList } from '@common/types';
import { API_ENDPOINTS } from '@common/constants';
import { apiService } from '@common/services/api.service';
import { useAuthStore } from '@modules/auth/store';
import { authController } from '@modules/auth/auth.controller';

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG = '#faf8ff';
const SURFACE = '#ffffff';
const ON_SURFACE = '#191b23';
const ON_VARIANT = '#434654';
const OUTLINE_V = '#c3c6d6';
const PRIMARY = '#003d9b';
const PRIMARY_FIXED = '#dae2ff';
const ON_PRIMARY_FIXED = '#0040a2';
const ERROR = '#ba1a1a';
const ERROR_CONTAINER = '#ffdad6';
const ON_ERROR_CONTAINER = '#ba1a1a';
const SECTION_LBL = '#737685';
const SURFACE_VARIANT = '#e1e2ec';

type Nav = NativeStackNavigationProp<MoreStackParamList & RootStackParamList>;

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProfileData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  isPrimaryAdmin: boolean;
  isActive: boolean;
  role: { id: string; code: string; name: string } | null;
  company: { id: string; name: string; logoUrl: string | null };
  permissions: string[];
  preferences: { timezone: string | null; locale: string | null; dateFormat: string | null };
  lastLoginAt: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
}

type EditableField = 'firstName' | 'lastName' | 'phone' | null;

// ─── Components ───────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: SECTION_LBL,
        marginBottom: 6,
        marginLeft: 4,
      }}
    >
      {label}
    </Text>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: OUTLINE_V + '50', marginHorizontal: 16 }} />;
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: SURFACE,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: OUTLINE_V + '40',
        shadowColor: '#09305a',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 1,
      }}
    >
      {children}
    </View>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  editable?: boolean;
  editing?: boolean;
  onPencilPress?: () => void;
  onChangeText?: (t: string) => void;
  onBlur?: () => void;
  editValue?: string;
  isLast?: boolean;
  saving?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}

function InfoRow({
  label,
  value,
  editable = false,
  editing = false,
  onPencilPress,
  onChangeText,
  onBlur,
  editValue = '',
  isLast = false,
  saving = false,
  keyboardType = 'default',
}: InfoRowProps) {
  const inputRef = useRef<TextInput>(null);

  React.useEffect(() => {
    if (editing) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [editing]);

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: SURFACE,
          minHeight: 64,
        }}
      >
        {/* Label + value stack */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: '600',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              color: SECTION_LBL,
              marginBottom: 4,
            }}
          >
            {label}
          </Text>
          {editing ? (
            <TextInput
              ref={inputRef}
              value={editValue}
              onChangeText={onChangeText}
              onBlur={onBlur}
              keyboardType={keyboardType}
              style={{
                fontSize: 15,
                color: ON_SURFACE,
                paddingVertical: 0,
                borderBottomWidth: 1.5,
                borderBottomColor: PRIMARY,
              }}
              returnKeyType="done"
              onSubmitEditing={onBlur}
            />
          ) : (
            <Text style={{ fontSize: 15, color: value ? ON_SURFACE : SECTION_LBL }}>
              {value || 'Not set'}
            </Text>
          )}
        </View>

        {/* Right side */}
        {saving ? (
          <ActivityIndicator size="small" color={PRIMARY} style={{ marginLeft: 8 }} />
        ) : editable ? (
          <TouchableOpacity
            onPress={onPencilPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginLeft: 8 }}
          >
            <MaterialCommunityIcons
              name={editing ? 'check-circle-outline' : 'pencil-outline'}
              size={18}
              color={editing ? PRIMARY : SECTION_LBL}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {!isLast && <Divider />}
    </View>
  );
}

interface NavRowProps {
  icon: string;
  label: string;
  onPress: () => void;
  isLast?: boolean;
  badge?: string;
}

function NavRow({ icon, label, onPress, isLast = false, badge }: NavRowProps) {
  return (
    <View>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          height: 52,
          backgroundColor: SURFACE,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: PRIMARY + '12',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 14,
          }}
        >
          <MaterialCommunityIcons name={icon as any} size={17} color={PRIMARY} />
        </View>
        <Text style={{ flex: 1, fontSize: 15, color: ON_SURFACE }}>{label}</Text>
        {badge ? (
          <View
            style={{
              backgroundColor: PRIMARY_FIXED,
              borderRadius: 100,
              paddingHorizontal: 8,
              paddingVertical: 2,
              marginRight: 6,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '600', color: ON_PRIMARY_FIXED }}>
              {badge}
            </Text>
          </View>
        ) : null}
        <MaterialCommunityIcons name="chevron-right" size={18} color={SECTION_LBL} />
      </TouchableOpacity>
      {!isLast && <Divider />}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();

  const [editingField, setEditingField] = useState<EditableField>(null);
  const [editValue, setEditValue] = useState('');
  const [savingField, setSavingField] = useState<EditableField>(null);
  const [uploading, setUploading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Load profile from GET /users/me (NOT /auth/me) ────────────────────────
  const {
    data: profile,
    isLoading,
    isError,
    refetch,
  } = useQuery<ProfileData>({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const res = await apiService.get<{ data: ProfileData }>(API_ENDPOINTS.USERS.ME);
      return (res.data as any).data ?? res.data;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  // ── Derived values ────────────────────────────────────────────────────────
  const initials =
    [profile?.firstName?.[0], profile?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || '—';
  const roleLabel = profile?.role?.name ?? null;
  const isAdmin = profile?.role?.code === 'ADMIN' || hasPermission('company:edit');

  // ── Pull-to-refresh ───────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // ── Inline edit ───────────────────────────────────────────────────────────
  const startEdit = useCallback(
    (field: EditableField) => {
      if (!profile) return;
      const current =
        field === 'firstName'
          ? profile.firstName
          : field === 'lastName'
            ? profile.lastName
            : (profile.phone ?? '');
      setEditValue(current);
      setEditingField(field);
    },
    [profile],
  );

  const commitEdit = useCallback(async () => {
    if (!editingField || !profile) return;
    const prev =
      editingField === 'firstName'
        ? profile.firstName
        : editingField === 'lastName'
          ? profile.lastName
          : (profile.phone ?? '');

    if (editValue.trim() === prev) {
      setEditingField(null);
      return;
    }

    setSavingField(editingField);
    setEditingField(null);

    try {
      const body: Record<string, string> = { [editingField]: editValue.trim() };
      const res = await apiService.patch<{
        data: { id: string; firstName: string; lastName: string; phone: string };
      }>(API_ENDPOINTS.USERS.UPDATE_PROFILE, body);
      const updated = (res.data as any).data ?? res.data;
      // Merge only — do NOT invalidate (per MD §5.2)
      queryClient.setQueryData<ProfileData>(['users', 'me'], (old) =>
        old ? { ...old, ...updated } : old,
      );
    } catch {
      // Revert to previous value + show error
      queryClient.setQueryData<ProfileData>(['users', 'me'], (old) =>
        old ? { ...old, [editingField]: prev } : old,
      );
      Alert.alert('Save failed', 'Could not update your profile. Please try again.');
    } finally {
      setSavingField(null);
    }
  }, [editingField, editValue, profile, queryClient]);

  // ── Avatar ────────────────────────────────────────────────────────────────
  const pickAndUploadImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
      Alert.alert('Image too large', 'Image must be under 2MB.');
      return;
    }

    setUploading(true);
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );

      const formData = new FormData();
      formData.append('file', {
        uri: manipulated.uri,
        name: 'avatar.jpg',
        type: 'image/jpeg',
      } as any);

      const res = await apiService.client.post<{ success: boolean; data: { avatarUrl: string } }>(
        API_ENDPOINTS.USERS.AVATAR,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      const newUrl = res.data?.data?.avatarUrl;
      if (newUrl) {
        queryClient.setQueryData<ProfileData>(['users', 'me'], (old) =>
          old ? { ...old, avatarUrl: newUrl } : old,
        );
      }
    } catch {
      Alert.alert('Upload failed', 'Could not upload your photo. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [queryClient]);

  const removeAvatar = useCallback(async () => {
    setUploading(true);
    try {
      await apiService.delete(API_ENDPOINTS.USERS.AVATAR);
      queryClient.setQueryData<ProfileData>(['users', 'me'], (old) =>
        old ? { ...old, avatarUrl: null } : old,
      );
    } catch {
      Alert.alert('Remove failed', 'Could not remove your photo. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [queryClient]);

  const handleAvatarPress = useCallback(() => {
    const hasAvatar = !!profile?.avatarUrl;
    const options = ['Choose Photo', ...(hasAvatar ? ['Remove Photo'] : []), 'Cancel'];
    const destructiveIndex = hasAvatar ? 1 : -1;
    const cancelIndex = options.length - 1;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex, destructiveButtonIndex: destructiveIndex },
        async (idx) => {
          if (options[idx] === 'Choose Photo') await pickAndUploadImage();
          if (options[idx] === 'Remove Photo') await removeAvatar();
        },
      );
    } else {
      const buttons: any[] = [
        { text: 'Choose Photo', onPress: pickAndUploadImage },
        ...(hasAvatar
          ? [{ text: 'Remove Photo', style: 'destructive', onPress: removeAvatar }]
          : []),
        { text: 'Cancel', style: 'cancel' },
      ];
      Alert.alert('Profile Photo', '', buttons);
    }
  }, [profile?.avatarUrl, pickAndUploadImage, removeAvatar]);

  // ── Sign out ──────────────────────────────────────────────────────────────
  const handleSignOut = useCallback(() => {
    const doSignOut = async () => {
      setSigningOut(true);
      try {
        await authController.logout();
        queryClient.clear();
      } finally {
        setSigningOut(false);
      }
      navigation.reset({ index: 0, routes: [{ name: 'Login' as any }] });
    };

    Alert.alert('Sign Out', "You'll need to sign in again.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: doSignOut },
    ]);
  }, [navigation, queryClient]);

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={ERROR} />
          <Text
            style={{
              fontSize: 17,
              fontWeight: '600',
              color: ON_SURFACE,
              marginTop: 12,
              textAlign: 'center',
            }}
          >
            Could not load profile
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={{
              marginTop: 20,
              backgroundColor: PRIMARY,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          height: 56,
          backgroundColor: SURFACE,
          borderBottomWidth: 1,
          borderBottomColor: OUTLINE_V + '40',
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={ON_SURFACE} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: ON_SURFACE }}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
          }
        >
          {/* ── Profile header ──────────────────────────────────────────── */}
          <View
            style={{
              alignItems: 'center',
              paddingTop: 32,
              paddingBottom: 24,
              paddingHorizontal: 16,
              backgroundColor: BG,
            }}
          >
            {/* Avatar */}
            <TouchableOpacity
              onPress={handleAvatarPress}
              activeOpacity={0.85}
              style={{ marginBottom: 16 }}
            >
              <View
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 44,
                  shadowColor: '#09305a',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.14,
                  shadowRadius: 12,
                  elevation: 5,
                  overflow: 'hidden',
                }}
              >
                {profile.avatarUrl ? (
                  <Image
                    source={{ uri: profile.avatarUrl }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: PRIMARY_FIXED,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 32, fontWeight: '700', color: ON_PRIMARY_FIXED }}>
                      {initials}
                    </Text>
                  </View>
                )}
              </View>

              {/* Camera badge */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: PRIMARY,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: BG,
                }}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialCommunityIcons name="camera-outline" size={13} color="#fff" />
                )}
              </View>
            </TouchableOpacity>

            {/* Name */}
            <Text
              style={{
                fontSize: 22,
                fontWeight: '700',
                color: ON_SURFACE,
                letterSpacing: -0.3,
              }}
            >
              {fullName}
            </Text>

            {/* Email */}
            <Text style={{ fontSize: 14, color: ON_VARIANT, marginTop: 4 }}>{profile.email}</Text>

            {/* Role badge — primary-fixed style per MD */}
            {roleLabel && (
              <View
                style={{
                  marginTop: 10,
                  backgroundColor: PRIMARY_FIXED,
                  borderRadius: 100,
                  paddingHorizontal: 14,
                  paddingVertical: 5,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: ON_PRIMARY_FIXED,
                    letterSpacing: 0.2,
                  }}
                >
                  {roleLabel}
                </Text>
              </View>
            )}

            {/* Company chip */}
            {profile.company && (
              <TouchableOpacity
                onPress={() => (navigation as any).navigate('CompanySettings')}
                activeOpacity={0.75}
                style={{
                  marginTop: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: SURFACE_VARIANT,
                  borderRadius: 100,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                }}
              >
                <MaterialCommunityIcons
                  name="office-building-outline"
                  size={13}
                  color={ON_VARIANT}
                />
                <Text style={{ fontSize: 12, fontWeight: '500', color: ON_VARIANT }}>
                  {profile.company.name}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ paddingHorizontal: 16, gap: 20 }}>
            {/* ── Personal Info ────────────────────────────────────────── */}
            <View>
              <SectionHeader label="Personal Info" />
              <Card>
                <InfoRow
                  label="First Name"
                  value={profile.firstName}
                  editable
                  editing={editingField === 'firstName'}
                  editValue={editingField === 'firstName' ? editValue : profile.firstName}
                  onPencilPress={() =>
                    editingField === 'firstName' ? commitEdit() : startEdit('firstName')
                  }
                  onChangeText={setEditValue}
                  onBlur={commitEdit}
                  saving={savingField === 'firstName'}
                />
                <InfoRow
                  label="Last Name"
                  value={profile.lastName}
                  editable
                  editing={editingField === 'lastName'}
                  editValue={editingField === 'lastName' ? editValue : profile.lastName}
                  onPencilPress={() =>
                    editingField === 'lastName' ? commitEdit() : startEdit('lastName')
                  }
                  onChangeText={setEditValue}
                  onBlur={commitEdit}
                  saving={savingField === 'lastName'}
                />
                <InfoRow
                  label="Phone"
                  value={profile.phone ?? ''}
                  editable
                  editing={editingField === 'phone'}
                  editValue={editingField === 'phone' ? editValue : (profile.phone ?? '')}
                  onPencilPress={() =>
                    editingField === 'phone' ? commitEdit() : startEdit('phone')
                  }
                  onChangeText={setEditValue}
                  onBlur={commitEdit}
                  saving={savingField === 'phone'}
                  keyboardType="phone-pad"
                />
                {/* Email — read-only, no pencil icon (web-only in v1) */}
                <InfoRow label="Email" value={profile.email} editable={false} isLast />
              </Card>
            </View>

            {/* ── Account ──────────────────────────────────────────────── */}
            <View>
              <SectionHeader label="Account" />
              <Card>
                <NavRow
                  icon="lock-outline"
                  label="Change Password"
                  onPress={() => navigation.navigate('ChangePassword')}
                />
                <NavRow
                  icon="translate"
                  label="Language & Date"
                  onPress={() => navigation.navigate('CurrencyPref')}
                  isLast
                />
              </Card>
            </View>

            {/* ── Company — admin only ──────────────────────────────────── */}
            {isAdmin && (
              <View>
                <SectionHeader label="Company" />
                <Card>
                  <NavRow
                    icon="office-building-cog-outline"
                    label="Company Settings"
                    onPress={() => (navigation as any).navigate('CompanySettings')}
                    isLast
                  />
                </Card>
              </View>
            )}

            {/* ── Notifications ────────────────────────────────────────── */}
            <View>
              <SectionHeader label="Notifications" />
              <Card>
                <NavRow
                  icon="bell-outline"
                  label="Notification Settings"
                  onPress={() => navigation.navigate('NotificationSettings')}
                  isLast
                />
              </Card>
            </View>

            {/* ── Session ──────────────────────────────────────────────── */}
            <View>
              <SectionHeader label="Session" />
              <Card>
                <NavRow
                  icon="swap-horizontal"
                  label="Switch Company"
                  onPress={() => (navigation as any).navigate('CompanySelect', { mode: 'in-app' })}
                  isLast
                />
              </Card>
            </View>

            {/* ── Support ──────────────────────────────────────────────── */}
            <View>
              <SectionHeader label="Support" />
              <Card>
                <NavRow
                  icon="information-outline"
                  label="About FinanX"
                  onPress={() => navigation.navigate('About')}
                  isLast
                />
              </Card>
            </View>

            {/* ── Sign Out ─────────────────────────────────────────────── */}
            <TouchableOpacity
              onPress={handleSignOut}
              activeOpacity={0.75}
              disabled={signingOut}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 15,
                borderRadius: 14,
                backgroundColor: ERROR_CONTAINER,
              }}
            >
              {signingOut ? (
                <ActivityIndicator size="small" color={ON_ERROR_CONTAINER} />
              ) : (
                <MaterialCommunityIcons name="logout" size={20} color={ON_ERROR_CONTAINER} />
              )}
              <Text style={{ fontSize: 16, fontWeight: '600', color: ON_ERROR_CONTAINER }}>
                {signingOut ? 'Signing out…' : 'Sign Out'}
              </Text>
            </TouchableOpacity>

            <Text
              style={{
                textAlign: 'center',
                fontSize: 11,
                color: OUTLINE_V,
                marginTop: 4,
                marginBottom: 8,
              }}
            >
              FinanX Mobile v1.0.0
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
