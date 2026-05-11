import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  Switch,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { ExpensesStackParamList, RootStackParamList } from '@common/types';
import { API_ENDPOINTS } from '@common/constants';
import { apiService } from '@common/services/api.service';
import { getApiErrorMessage, parseFieldErrors } from '@common/utils/apiError';
import { useAuthStore } from '@modules/auth/store';

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG = '#faf8ff';
const SURFACE = '#ffffff';
const SURF_LOW = '#f3f3fd';
const SURF_VAR = '#e1e2ec';
const PRIMARY = '#003d9b';
const PRIMARY_C = '#0052cc';
const ON_SURF = '#191b23';
const ON_VAR = '#434654';
const OUTLINE_V = '#c3c6d6';
const MUTED = '#737685';
const ERROR = '#ba1a1a';
const ERR_CONT = '#ffdad6';

type Nav = NativeStackNavigationProp<ExpensesStackParamList & RootStackParamList>;
type RouteT = RouteProp<ExpensesStackParamList, 'VendorForm'>;

// ─── Schema ───────────────────────────────────────────────────────────────────
const schema = z.object({
  vendorType: z.enum(['Individual', 'Business']),
  displayName: z.string().min(1, 'Display name is required'),
  companyName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.union([z.string().email('Invalid email address'), z.literal('')]).optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  website: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().max(2, 'Max 2 chars').optional(),
  preferredCurrency: z.string().optional(),
  paymentTerms: z.string().optional(),
  taxNumber: z.string().optional(),
  businessIdNo: z.string().optional(),
  track1099: z.boolean(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

// ─── Field component ──────────────────────────────────────────────────────────
function Field({
  label,
  required,
  children,
  error,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', marginBottom: 5 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: ON_SURF }}>{label}</Text>
        {required && <Text style={{ fontSize: 14, color: ERROR, marginLeft: 3 }}>*</Text>}
      </View>
      {children}
      {error ? <Text style={{ fontSize: 12, color: ERROR, marginTop: 4 }}>{error}</Text> : null}
    </View>
  );
}

function StyledInput({
  value,
  onChangeText,
  onBlur,
  placeholder,
  keyboardType,
  autoCapitalize,
  multiline,
  numberOfLines,
  editable,
  icon,
  error,
  trailing,
  onTrailingPress,
}: {
  value: string;
  onChangeText: (t: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  multiline?: boolean;
  numberOfLines?: number;
  editable?: boolean;
  icon?: string;
  error?: boolean;
  trailing?: string;
  onTrailingPress?: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: multiline ? 'flex-start' : 'center',
        backgroundColor: SURF_LOW,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: error ? ERROR : OUTLINE_V + '80',
        paddingHorizontal: 12,
        paddingVertical: multiline ? 10 : 0,
        minHeight: multiline ? 80 : 48,
      }}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon as any}
          size={18}
          color={MUTED}
          style={{ marginRight: 8, ...(multiline ? { marginTop: 2 } : {}) }}
        />
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={OUTLINE_V}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        autoCorrect={false}
        multiline={multiline}
        numberOfLines={numberOfLines}
        editable={editable !== false}
        style={{
          flex: 1,
          fontSize: 15,
          color: ON_SURF,
          backgroundColor: 'transparent',
          paddingVertical: multiline ? 0 : 12,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
      {trailing && (
        <TouchableOpacity
          onPress={onTrailingPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name={trailing as any} size={18} color={MUTED} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export function VendorFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteT>();
  const editId = route.params?.id;
  const isEdit = !!editId;
  const queryClient = useQueryClient();
  const canDelete = useAuthStore((s) => s.hasPermission('vendor:delete'));

  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [moreExpanded, setMoreExpanded] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      vendorType: 'Business',
      displayName: '',
      companyName: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      mobile: '',
      website: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      preferredCurrency: '',
      paymentTerms: '',
      taxNumber: '',
      businessIdNo: '',
      track1099: false,
      notes: '',
    },
  });

  const vendorType = watch('vendorType');
  const preferredCurrency = watch('preferredCurrency');
  const track1099 = watch('track1099');

  // ── Load currencies ───────────────────────────────────────────────────────
  const { data: currencies } = useQuery<Currency[]>({
    queryKey: ['currencies', 'list'],
    queryFn: async () => {
      const res = await apiService.get<{ data: Currency[] }>(API_ENDPOINTS.CURRENCIES.LIST);
      return (res.data as any).data ?? res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const filteredCurrencies =
    currencies?.filter((c) =>
      currencySearch
        ? c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
          c.name.toLowerCase().includes(currencySearch.toLowerCase())
        : true,
    ) ?? [];

  // ── Load existing vendor for edit ─────────────────────────────────────────
  const { data: existingVendor } = useQuery({
    queryKey: ['vendors', 'detail', editId],
    queryFn: async () => {
      const res = await apiService.get<{ data: any }>(API_ENDPOINTS.VENDORS.DETAIL(editId!));
      return (res.data as any).data ?? res.data;
    },
    enabled: isEdit,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (existingVendor && isEdit) {
      reset({
        vendorType: existingVendor.vendorType ?? 'Business',
        displayName: existingVendor.displayName ?? '',
        companyName: existingVendor.companyName ?? '',
        firstName: existingVendor.firstName ?? '',
        lastName: existingVendor.lastName ?? '',
        email: existingVendor.email ?? '',
        phone: existingVendor.phone ?? '',
        mobile: existingVendor.mobile ?? '',
        website: existingVendor.website ?? '',
        addressLine1: existingVendor.address?.line1 ?? '',
        addressLine2: existingVendor.address?.line2 ?? '',
        city: existingVendor.address?.city ?? '',
        state: existingVendor.address?.state ?? '',
        postalCode: existingVendor.address?.postalCode ?? '',
        country: existingVendor.address?.country ?? '',
        preferredCurrency: existingVendor.preferredCurrency ?? '',
        paymentTerms: existingVendor.paymentTerms ?? '',
        taxNumber: existingVendor.taxNumber ?? '',
        businessIdNo: existingVendor.businessIdNo ?? '',
        track1099: existingVendor.track1099 ?? false,
        notes: existingVendor.notes ?? '',
      });
    }
  }, [existingVendor, isEdit, reset]);

  // ── Auto-fill displayName ─────────────────────────────────────────────────
  const autoFillDisplayName = useCallback(() => {
    if (watch('displayName')) return;
    if (vendorType === 'Business') {
      const cn = watch('companyName');
      if (cn) setValue('displayName', cn);
    } else {
      const first = watch('firstName');
      const last = watch('lastName');
      const combined = [first, last].filter(Boolean).join(' ');
      if (combined) setValue('displayName', combined);
    }
  }, [vendorType, setValue, watch]);

  // ── Close / dirty guard ───────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    if (isDirty) {
      Alert.alert('Discard changes?', 'Your changes will be lost.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
      ]);
    } else {
      navigation.goBack();
    }
  }, [isDirty, navigation]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const body: Record<string, any> = {
        vendorType: data.vendorType,
        displayName: data.displayName,
        ...(data.companyName ? { companyName: data.companyName } : {}),
        ...(data.firstName ? { firstName: data.firstName } : {}),
        ...(data.lastName ? { lastName: data.lastName } : {}),
        ...(data.email ? { email: data.email } : {}),
        ...(data.phone ? { phone: data.phone } : {}),
        ...(data.mobile ? { mobile: data.mobile } : {}),
        ...(data.website ? { website: data.website } : {}),
        ...(data.addressLine1 ? { addressLine1: data.addressLine1 } : {}),
        ...(data.addressLine2 ? { addressLine2: data.addressLine2 } : {}),
        ...(data.city ? { city: data.city } : {}),
        ...(data.state ? { state: data.state } : {}),
        ...(data.postalCode ? { postalCode: data.postalCode } : {}),
        ...(data.country ? { country: data.country } : {}),
        ...(data.preferredCurrency ? { preferredCurrency: data.preferredCurrency } : {}),
        ...(data.paymentTerms ? { paymentTerms: data.paymentTerms } : {}),
        ...(data.taxNumber ? { taxNumber: data.taxNumber } : {}),
        ...(data.businessIdNo ? { businessIdNo: data.businessIdNo } : {}),
        track1099: data.track1099,
        ...(data.notes ? { notes: data.notes } : {}),
      };

      if (isEdit && editId) {
        await apiService.patch(API_ENDPOINTS.VENDORS.DETAIL(editId), body);
        queryClient.invalidateQueries({ queryKey: ['vendors', 'list'] });
        queryClient.invalidateQueries({ queryKey: ['vendors', 'detail', editId] });
        navigation.goBack();
      } else {
        const res = await apiService.post<{ data: { id: string } }>(
          API_ENDPOINTS.VENDORS.LIST,
          body,
        );
        const newId = ((res.data as any).data ?? res.data)?.id;
        queryClient.invalidateQueries({ queryKey: ['vendors', 'list'] });
        if (newId) {
          navigation.replace('VendorDetail', { id: newId });
        } else {
          navigation.goBack();
        }
      }
    } catch (e: any) {
      const statusCode = e?.response?.data?.statusCode ?? e?.response?.status;
      const message: string = e?.response?.data?.message ?? '';
      if (statusCode === 409) {
        if (message.toLowerCase().includes('email')) {
          setError('email', { message: 'A vendor with this email already exists' });
        } else {
          setError('displayName', { message: 'A vendor with this name already exists' });
        }
      } else {
        const fieldErrors = parseFieldErrors(e);
        if (Object.keys(fieldErrors).length > 0) {
          Object.entries(fieldErrors).forEach(([field, msg]) => {
            setError(field as any, { message: msg });
          });
        } else {
          Alert.alert('Error', getApiErrorMessage(e));
        }
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Deactivate ────────────────────────────────────────────────────────────
  const handleDeactivate = useCallback(() => {
    Alert.alert(
      'Deactivate Vendor',
      'This vendor will be deactivated. They will not be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            setDeactivating(true);
            try {
              await apiService.delete(API_ENDPOINTS.VENDORS.DETAIL(editId!));
              queryClient.invalidateQueries({ queryKey: ['vendors', 'list'] });
              queryClient.invalidateQueries({ queryKey: ['vendors', 'detail', editId] });
              (navigation as any).navigate('VendorList');
            } catch (e) {
              Alert.alert('Error', getApiErrorMessage(e));
            } finally {
              setDeactivating(false);
            }
          },
        },
      ],
    );
  }, [editId, navigation, queryClient]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Drag handle */}
      <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: SURF_VAR }} />
      </View>

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: OUTLINE_V + '40',
        }}
      >
        <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="close" size={24} color={ON_SURF} />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            fontSize: 20,
            fontWeight: '700',
            color: ON_SURF,
            textAlign: 'center',
            marginHorizontal: 8,
          }}
        >
          {isEdit ? 'Edit Vendor' : 'New Vendor'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Vendor Type */}
          <Field label="VENDOR TYPE">
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: SURF_LOW,
                borderRadius: 12,
                padding: 4,
              }}
            >
              {(['Individual', 'Business'] as const).map((type) => {
                const active = vendorType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setValue('vendorType', type)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 9,
                      alignItems: 'center',
                      backgroundColor: active ? SURFACE : 'transparent',
                      shadowColor: active ? '#09305a' : 'transparent',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: active ? 0.08 : 0,
                      shadowRadius: 4,
                      elevation: active ? 2 : 0,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: active ? '600' : '400',
                        color: active ? PRIMARY : ON_VAR,
                      }}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Field>

          {/* Display Name */}
          <Controller
            control={control}
            name="displayName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Field label="Display Name" required error={errors.displayName?.message}>
                <StyledInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={vendorType === 'Business' ? 'e.g. Acme Services' : 'e.g. John Smith'}
                  error={!!errors.displayName}
                />
              </Field>
            )}
          />

          {/* Individual fields */}
          {vendorType === 'Individual' && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Controller
                  control={control}
                  name="firstName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Field label="First Name">
                      <StyledInput
                        value={value ?? ''}
                        onChangeText={onChange}
                        onBlur={() => {
                          onBlur();
                          autoFillDisplayName();
                        }}
                        placeholder="First"
                      />
                    </Field>
                  )}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Controller
                  control={control}
                  name="lastName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Field label="Last Name">
                      <StyledInput
                        value={value ?? ''}
                        onChangeText={onChange}
                        onBlur={() => {
                          onBlur();
                          autoFillDisplayName();
                        }}
                        placeholder="Last"
                      />
                    </Field>
                  )}
                />
              </View>
            </View>
          )}

          {/* Business company name */}
          {vendorType === 'Business' && (
            <Controller
              control={control}
              name="companyName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Field label="Company Name">
                  <StyledInput
                    value={value ?? ''}
                    onChangeText={onChange}
                    onBlur={() => {
                      onBlur();
                      autoFillDisplayName();
                    }}
                    placeholder="Acme International Holdings Ltd."
                  />
                </Field>
              )}
            />
          )}

          {/* Email */}
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Field label="Email" error={errors.email?.message}>
                <StyledInput
                  value={value ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="billing@acme.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  icon="email-outline"
                  error={!!errors.email}
                />
              </Field>
            )}
          />

          {/* Phone */}
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <Field label="Phone">
                <StyledInput
                  value={value ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="+1 (555) 000-0000"
                  keyboardType="phone-pad"
                  icon="phone-outline"
                />
              </Field>
            )}
          />

          {/* Preferred Currency + Payment Terms side by side */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="Preferred Currency">
                <TouchableOpacity
                  onPress={() => setShowCurrencyModal(true)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: SURF_LOW,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: OUTLINE_V + '80',
                    paddingHorizontal: 12,
                    height: 48,
                  }}
                >
                  <MaterialCommunityIcons
                    name="cash-multiple"
                    size={16}
                    color={MUTED}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: preferredCurrency ? ON_SURF : OUTLINE_V,
                    }}
                    numberOfLines={1}
                  >
                    {preferredCurrency || 'USD'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={16} color={MUTED} />
                </TouchableOpacity>
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="paymentTerms"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Field label="Payment Terms">
                    <StyledInput
                      value={value ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Net 30"
                    />
                  </Field>
                )}
              />
            </View>
          </View>

          {/* Divider + More fields */}
          <View
            style={{ borderTopWidth: 1, borderTopColor: OUTLINE_V + '60', marginVertical: 8 }}
          />
          <TouchableOpacity
            onPress={() => setMoreExpanded((v) => !v)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 10,
              marginBottom: 4,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '600', color: ON_SURF }}>More fields</Text>
            <MaterialCommunityIcons
              name={moreExpanded ? 'chevron-up' : 'chevron-right'}
              size={22}
              color={ON_VAR}
            />
          </TouchableOpacity>

          {moreExpanded && (
            <>
              {/* Mobile */}
              <Controller
                control={control}
                name="mobile"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Field label="Mobile">
                    <StyledInput
                      value={value ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="+1 (555) 000-0000"
                      keyboardType="phone-pad"
                      icon="cellphone"
                    />
                  </Field>
                )}
              />

              {/* Website */}
              <Controller
                control={control}
                name="website"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Field label="Website">
                    <StyledInput
                      value={value ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="https://acme.com"
                      keyboardType="url"
                      autoCapitalize="none"
                      icon="web"
                    />
                  </Field>
                )}
              />

              {/* Address */}
              <Controller
                control={control}
                name="addressLine1"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Field label="Address">
                    <StyledInput
                      value={value ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Start typing address..."
                      icon="map-marker-outline"
                    />
                  </Field>
                )}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Controller
                    control={control}
                    name="city"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Field label="City">
                        <StyledInput
                          value={value ?? ''}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="City"
                        />
                      </Field>
                    )}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Controller
                    control={control}
                    name="state"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Field label="State">
                        <StyledInput
                          value={value ?? ''}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="State"
                        />
                      </Field>
                    )}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Controller
                    control={control}
                    name="postalCode"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Field label="Postal Code">
                        <StyledInput
                          value={value ?? ''}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="ZIP"
                          keyboardType="number-pad"
                        />
                      </Field>
                    )}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Controller
                    control={control}
                    name="country"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Field label="Country (2-char)" error={errors.country?.message}>
                        <StyledInput
                          value={value ?? ''}
                          onChangeText={(v) => onChange(v.slice(0, 2).toUpperCase())}
                          onBlur={onBlur}
                          placeholder="US"
                          autoCapitalize="characters"
                          error={!!errors.country}
                        />
                      </Field>
                    )}
                  />
                </View>
              </View>

              {/* Tax Number */}
              <Controller
                control={control}
                name="taxNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Field label="Tax Number (TIN / EIN)">
                    <StyledInput
                      value={value ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="e.g. TX-9988"
                    />
                  </Field>
                )}
              />

              {/* Business ID */}
              <Controller
                control={control}
                name="businessIdNo"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Field label="Business ID">
                    <StyledInput
                      value={value ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="e.g. BID-4455"
                    />
                  </Field>
                )}
              />

              {/* 1099 toggle */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 8,
                  marginBottom: 14,
                }}
              >
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '500', color: ON_SURF }}>
                    1099 Vendor
                  </Text>
                  <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                    Track this vendor for 1099 reporting
                  </Text>
                </View>
                <Controller
                  control={control}
                  name="track1099"
                  render={({ field: { onChange, value } }) => (
                    <Switch
                      value={value}
                      onValueChange={onChange}
                      trackColor={{ false: OUTLINE_V, true: PRIMARY }}
                      thumbColor={SURFACE}
                    />
                  )}
                />
              </View>

              {/* Notes */}
              <Controller
                control={control}
                name="notes"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Field label="Internal Notes">
                    <StyledInput
                      value={value ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Add any specific details about this vendor..."
                      multiline
                      numberOfLines={3}
                    />
                  </Field>
                )}
              />

              {/* Deactivate — edit only */}
              {isEdit && canDelete && (
                <TouchableOpacity
                  onPress={handleDeactivate}
                  disabled={deactivating}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    backgroundColor: ERR_CONT,
                    borderRadius: 12,
                    paddingVertical: 14,
                    marginTop: 8,
                  }}
                >
                  {deactivating ? (
                    <ActivityIndicator size="small" color={ERROR} />
                  ) : (
                    <MaterialCommunityIcons name="store-off-outline" size={18} color={ERROR} />
                  )}
                  <Text style={{ fontSize: 14, fontWeight: '600', color: ERROR }}>
                    Deactivate Vendor
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky footer */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          flexDirection: 'row',
          gap: 12,
          padding: 16,
          backgroundColor: SURFACE + 'ee',
          borderTopWidth: 1,
          borderTopColor: OUTLINE_V + '40',
          paddingBottom: Platform.OS === 'ios' ? 28 : 16,
        }}
      >
        <TouchableOpacity
          onPress={handleClose}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            height: 48,
            borderRadius: 12,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: ON_VAR }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={saving}
          style={{
            flex: 2,
            alignItems: 'center',
            justifyContent: 'center',
            height: 48,
            borderRadius: 12,
            backgroundColor: PRIMARY_C,
            shadowColor: PRIMARY_C,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 4,
            opacity: saving ? 0.8 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
              {isEdit ? 'Save Changes' : 'Save Vendor'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Currency picker modal */}
      <Modal visible={showCurrencyModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: SURFACE,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '65%',
            }}
          >
            <View
              style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: OUTLINE_V + '40' }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: '700', color: ON_SURF }}>
                  Select Currency
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowCurrencyModal(false);
                    setCurrencySearch('');
                  }}
                >
                  <MaterialCommunityIcons name="close" size={22} color={ON_VAR} />
                </TouchableOpacity>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: SURF_LOW,
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  height: 40,
                }}
              >
                <MaterialCommunityIcons
                  name="magnify"
                  size={18}
                  color={MUTED}
                  style={{ marginRight: 6 }}
                />
                <TextInput
                  value={currencySearch}
                  onChangeText={setCurrencySearch}
                  placeholder="Search currencies..."
                  placeholderTextColor={MUTED}
                  autoCapitalize="none"
                  style={{ flex: 1, fontSize: 14, color: ON_SURF, backgroundColor: 'transparent' }}
                />
              </View>
            </View>
            <FlatList
              data={filteredCurrencies}
              keyExtractor={(c) => c.code}
              renderItem={({ item }) => {
                const isSelected = preferredCurrency === item.code;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setValue('preferredCurrency', item.code);
                      setShowCurrencyModal(false);
                      setCurrencySearch('');
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: OUTLINE_V + '30',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: isSelected ? '600' : '400',
                          color: isSelected ? PRIMARY : ON_SURF,
                        }}
                      >
                        {item.code} - {item.name}
                      </Text>
                    </View>
                    {isSelected && (
                      <MaterialCommunityIcons name="check" size={18} color={PRIMARY} />
                    )}
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={{ paddingBottom: 32 }}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
