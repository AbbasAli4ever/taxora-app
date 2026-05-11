import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { SalesStackParamList, RootStackParamList } from '@common/types';
import { API_ENDPOINTS } from '@common/constants';
import { apiService } from '@common/services/api.service';
import { getApiErrorMessage, parseFieldErrors } from '@common/utils/apiError';
import { useAuthStore } from '@modules/auth/store';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const BG = '#faf8ff';
const SURFACE = '#ffffff';
const PRIMARY = '#003d9b';
const ON_SURF = '#191b23';
const ON_VAR = '#434654';
const OUTLINE_V = '#c3c6d6';
const ERROR = '#ba1a1a';
const MUTED = '#737685';
const SUCCESS = '#1a6b3c';

type Nav = NativeStackNavigationProp<SalesStackParamList & RootStackParamList>;
type Route = RouteProp<SalesStackParamList, 'InvoiceForm'>;

const PAYMENT_TERMS = [
  'DUE_ON_RECEIPT',
  'NET_10',
  'NET_15',
  'NET_30',
  'NET_45',
  'NET_60',
  'NET_90',
  'CUSTOM',
] as const;

const RECURRING_FREQS = ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const;

const lineItemSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1, 'Required'),
  quantity: z.number().positive('Must be > 0'),
  unitPrice: z.number().min(0, 'Must be ≥ 0'),
  discountPercent: z.number().min(0).max(100).optional(),
  taxPercent: z.number().min(0).optional(),
  taxRateId: z.string().optional(),
  sortOrder: z.number().optional(),
});

const schema = z.object({
  customerId: z.string().min(1, 'Customer required'),
  invoiceNumber: z.string().optional(),
  referenceNumber: z.string().max(100).optional(),
  invoiceDate: z.string().min(1, 'Required'),
  dueDate: z.string().optional(),
  paymentTerms: z.enum(PAYMENT_TERMS).optional(),
  currencyCode: z.string().optional(),
  exchangeRate: z.number().optional(),
  depositAccountId: z.string().optional(),
  projectId: z.string().optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
  discountValue: z.number().optional(),
  lineItems: z.array(lineItemSchema).min(1, 'Add at least one line item'),
  notes: z.string().max(2000).optional(),
  termsAndConditions: z.string().max(5000).optional(),
  isRecurring: z.boolean().optional(),
  recurringFrequency: z.enum(RECURRING_FREQS).optional(),
  recurringEndDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(amount: number, code = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

function computeDueDate(invoiceDate: string, terms: string): string {
  const d = new Date(invoiceDate);
  const netDays: Record<string, number> = {
    DUE_ON_RECEIPT: 0,
    NET_10: 10,
    NET_15: 15,
    NET_30: 30,
    NET_45: 45,
    NET_60: 60,
    NET_90: 90,
  };
  const days = netDays[terms] ?? 0;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ─── Small Picker Modal ───────────────────────────────────────────────────────

function PickerModal<T extends string>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: readonly T[];
  selected?: T;
  onSelect: (v: T) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: SURFACE,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '70%',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: OUTLINE_V + '40',
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: ON_SURF }}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={22} color={MUTED} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={options as T[]}
            keyExtractor={(i) => i}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: OUTLINE_V + '30',
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    fontSize: 15,
                    color: selected === item ? PRIMARY : ON_SURF,
                    fontWeight: selected === item ? '700' : '400',
                  }}
                >
                  {item.replace(/_/g, ' ')}
                </Text>
                {selected === item && (
                  <MaterialCommunityIcons name="check" size={20} color={PRIMARY} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── Search Modal ─────────────────────────────────────────────────────────────

function SearchModal({
  visible,
  title,
  onClose,
  onSelect,
  fetchUrl,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSelect: (item: {
    id: string;
    displayName?: string;
    name?: string;
    description?: string;
    unitPrice?: number;
  }) => void;
  fetchUrl: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<
    Array<{
      id: string;
      displayName?: string;
      name?: string;
      description?: string;
      unitPrice?: number;
    }>
  >([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    search('');
  }, [visible]);

  async function search(q: string) {
    setLoading(true);
    try {
      const res = await apiService.get<{
        data: { items?: unknown[]; data?: unknown[] } | unknown[];
      }>(fetchUrl, { params: { search: q, limit: 20 } });
      const raw = res.data;
      const arr = Array.isArray(raw) ? raw : ((raw as any).data?.items ?? (raw as any).data ?? []);
      setResults(arr as any[]);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(text: string) {
    setQuery(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(text), 300);
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: SURFACE,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            height: '80%',
          }}
        >
          <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: OUTLINE_V + '40' }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: '700', color: ON_SURF }}>{title}</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={22} color={MUTED} />
              </TouchableOpacity>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#f3f3fd',
                borderRadius: 12,
                paddingHorizontal: 12,
                height: 42,
              }}
            >
              <MaterialCommunityIcons name="magnify" size={20} color={MUTED} />
              <TextInput
                value={query}
                onChangeText={handleSearch}
                placeholder="Search..."
                placeholderTextColor={MUTED}
                style={{ flex: 1, marginLeft: 8, fontSize: 14, color: ON_SURF }}
                autoFocus
              />
            </View>
          </View>
          {loading ? (
            <ActivityIndicator color={PRIMARY} style={{ marginTop: 32 }} />
          ) : (
            <FlatList
              data={results}
              keyExtractor={(i) => i.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: OUTLINE_V + '30',
                  }}
                >
                  <Text style={{ fontSize: 15, color: ON_SURF, fontWeight: '600' }}>
                    {item.displayName ?? item.name ?? item.id}
                  </Text>
                  {item.description && (
                    <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                      {item.description}
                    </Text>
                  )}
                  {item.unitPrice !== undefined && (
                    <Text style={{ fontSize: 12, color: PRIMARY, marginTop: 2 }}>
                      {formatCurrency(item.unitPrice)}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ padding: 24, color: MUTED, textAlign: 'center' }}>No results</Text>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Live Totals Hook ─────────────────────────────────────────────────────────

function useLiveTotals(control: any) {
  const lineItems = useWatch({ control, name: 'lineItems' }) as FormData['lineItems'];
  const discountType = useWatch({ control, name: 'discountType' }) as FormData['discountType'];
  const discountValue = useWatch({ control, name: 'discountValue' }) as number | undefined;
  const currencyCode = useWatch({ control, name: 'currencyCode' }) as string | undefined;

  const subtotal = (lineItems ?? []).reduce((sum, item) => {
    const qty = Number(item?.quantity ?? 0);
    const price = Number(item?.unitPrice ?? 0);
    const disc = Number(item?.discountPercent ?? 0);
    const tax = Number(item?.taxPercent ?? 0);
    const lineAmt = qty * price * (1 - disc / 100) * (1 + tax / 100);
    return sum + lineAmt;
  }, 0);

  let discountAmount = 0;
  if (discountType === 'PERCENTAGE' && discountValue) {
    discountAmount = subtotal * (discountValue / 100);
  } else if (discountType === 'FIXED' && discountValue) {
    discountAmount = discountValue;
  }

  const taxAmount = (lineItems ?? []).reduce((sum, item) => {
    const qty = Number(item?.quantity ?? 0);
    const price = Number(item?.unitPrice ?? 0);
    const disc = Number(item?.discountPercent ?? 0);
    const tax = Number(item?.taxPercent ?? 0);
    return sum + qty * price * (1 - disc / 100) * (tax / 100);
  }, 0);

  const total = Math.max(0, subtotal - discountAmount);

  return { subtotal, discountAmount, taxAmount, total, code: currencyCode ?? 'USD' };
}

// ─── Line Item Card ───────────────────────────────────────────────────────────

function LineItemCard({
  index,
  control,
  remove,
  setValue,
  errors,
}: {
  index: number;
  control: any;
  remove: (i: number) => void;
  setValue: any;
  errors: any;
}) {
  const [showProductPicker, setShowProductPicker] = useState(false);

  return (
    <View
      style={{
        backgroundColor: '#f3f3fd',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: PRIMARY,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '700', color: MUTED, textTransform: 'uppercase' }}>
          Item {index + 1}
        </Text>
        <TouchableOpacity onPress={() => remove(index)}>
          <MaterialCommunityIcons name="trash-can-outline" size={20} color={ERROR} />
        </TouchableOpacity>
      </View>

      {/* Description / Product */}
      <TouchableOpacity
        onPress={() => setShowProductPicker(true)}
        style={{
          backgroundColor: SURFACE,
          borderRadius: 10,
          padding: 12,
          marginBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <MaterialCommunityIcons name="package-variant" size={18} color={MUTED} />
        <Controller
          control={control}
          name={`lineItems.${index}.description`}
          render={({ field: { value } }) => (
            <Text style={{ flex: 1, fontSize: 14, color: value ? ON_SURF : MUTED }}>
              {value || 'Select product or type description'}
            </Text>
          )}
        />
        <MaterialCommunityIcons name="chevron-down" size={18} color={MUTED} />
      </TouchableOpacity>
      {errors?.lineItems?.[index]?.description && (
        <Text style={{ fontSize: 11, color: ERROR, marginBottom: 4 }}>
          {errors.lineItems[index].description.message}
        </Text>
      )}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: MUTED, fontWeight: '600', marginBottom: 4 }}>
            QTY
          </Text>
          <Controller
            control={control}
            name={`lineItems.${index}.quantity`}
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value?.toString() ?? ''}
                onChangeText={(t) => onChange(parseFloat(t) || 0)}
                keyboardType="decimal-pad"
                style={{
                  backgroundColor: SURFACE,
                  borderRadius: 8,
                  padding: 10,
                  fontSize: 14,
                  color: ON_SURF,
                }}
              />
            )}
          />
        </View>
        <View style={{ flex: 2 }}>
          <Text style={{ fontSize: 11, color: MUTED, fontWeight: '600', marginBottom: 4 }}>
            UNIT PRICE
          </Text>
          <Controller
            control={control}
            name={`lineItems.${index}.unitPrice`}
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value?.toString() ?? ''}
                onChangeText={(t) => onChange(parseFloat(t) || 0)}
                keyboardType="decimal-pad"
                style={{
                  backgroundColor: SURFACE,
                  borderRadius: 8,
                  padding: 10,
                  fontSize: 14,
                  color: ON_SURF,
                }}
              />
            )}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: MUTED, fontWeight: '600', marginBottom: 4 }}>
            TAX %
          </Text>
          <Controller
            control={control}
            name={`lineItems.${index}.taxPercent`}
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value?.toString() ?? ''}
                onChangeText={(t) => onChange(parseFloat(t) || 0)}
                keyboardType="decimal-pad"
                style={{
                  backgroundColor: SURFACE,
                  borderRadius: 8,
                  padding: 10,
                  fontSize: 14,
                  color: ON_SURF,
                }}
              />
            )}
          />
        </View>
      </View>

      <SearchModal
        visible={showProductPicker}
        title="Select Product"
        fetchUrl={API_ENDPOINTS.PRODUCTS.LIST}
        onClose={() => setShowProductPicker(false)}
        onSelect={(item) => {
          setValue(`lineItems.${index}.productId`, item.id);
          setValue(`lineItems.${index}.description`, item.name ?? item.displayName ?? '');
          if (item.unitPrice !== undefined)
            setValue(`lineItems.${index}.unitPrice`, item.unitPrice);
        }}
      />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function InvoiceFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const editId = route.params?.id;
  const prefillId = route.params?.prefillFromId;
  const isEdit = Boolean(editId);
  const isDuplicate = Boolean(prefillId);
  const mode = isEdit ? 'edit' : 'create';

  // Picker modal states
  const [showCustomer, setShowCustomer] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showDiscountType, setShowDiscountType] = useState(false);
  const [showFreq, setShowFreq] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendAfterSave, setSendAfterSave] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      invoiceDate: todayStr(),
      lineItems: [{ description: '', quantity: 1, unitPrice: 0 }],
      currencyCode: 'USD',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });
  const { subtotal, discountAmount, taxAmount, total, code: currCode } = useLiveTotals(control);

  const watchedTerms = watch('paymentTerms');
  const watchedDate = watch('invoiceDate');
  const watchedRecurring = watch('isRecurring');
  const watchedDiscount = watch('discountType');

  // Next number (create mode)
  const { data: nextNum } = useQuery<string>({
    queryKey: ['invoices', 'next-number'],
    queryFn: async () => {
      const res = await apiService.get<{ data: { nextInvoiceNumber: string } }>(
        API_ENDPOINTS.INVOICES.NEXT_NUMBER,
      );
      return ((res.data as any).data ?? res.data)?.nextInvoiceNumber;
    },
    enabled: !isEdit,
  });

  useEffect(() => {
    if (nextNum && !isEdit) setValue('invoiceNumber', nextNum);
  }, [nextNum, isEdit, setValue]);

  // Load existing invoice for edit/duplicate
  const sourceId = editId ?? prefillId;
  const { data: existingInvoice } = useQuery({
    queryKey: ['invoices', 'detail', sourceId],
    queryFn: async () => {
      const res = await apiService.get<{ data: any }>(API_ENDPOINTS.INVOICES.DETAIL(sourceId!));
      return (res.data as any).data ?? res.data;
    },
    enabled: Boolean(sourceId),
  });

  useEffect(() => {
    if (!existingInvoice) return;
    const base: Partial<FormData> = {
      customerId: existingInvoice.customer?.id,
      referenceNumber: existingInvoice.referenceNumber,
      invoiceDate: isDuplicate ? todayStr() : existingInvoice.invoiceDate,
      dueDate: isDuplicate ? undefined : existingInvoice.dueDate,
      paymentTerms: existingInvoice.paymentTerms,
      currencyCode: existingInvoice.currencyCode,
      depositAccountId: existingInvoice.depositAccount?.id,
      projectId: existingInvoice.projectId,
      discountType: existingInvoice.discountType,
      discountValue: existingInvoice.discountValue,
      lineItems: existingInvoice.lineItems?.map((l: any) => ({
        productId: l.product?.id,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountPercent: l.discountPercent || undefined,
        taxPercent: l.taxPercent || undefined,
      })),
      notes: existingInvoice.notes,
      termsAndConditions: existingInvoice.termsAndConditions,
      isRecurring: existingInvoice.isRecurring,
      recurringFrequency: existingInvoice.recurringFrequency,
    };
    if (!isDuplicate) base.invoiceNumber = existingInvoice.invoiceNumber;
    reset(base);
  }, [existingInvoice, isDuplicate, reset]);

  // Auto-compute due date when terms change
  useEffect(() => {
    if (watchedTerms && watchedTerms !== 'CUSTOM' && watchedDate) {
      setValue('dueDate', computeDueDate(watchedDate, watchedTerms));
    }
  }, [watchedTerms, watchedDate, setValue]);

  function handleBack() {
    if (isDirty) {
      Alert.alert('Discard changes?', 'You have unsaved changes.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
      ]);
    } else {
      navigation.goBack();
    }
  }

  const canSend = hasPermission('invoice:send');

  async function onSave(data: FormData, andSend: boolean) {
    setSaving(true);
    try {
      let invoiceId: string;
      if (isEdit && editId) {
        const res = await apiService.patch<{ data: { id: string } }>(
          API_ENDPOINTS.INVOICES.DETAIL(editId),
          data,
        );
        invoiceId = ((res.data as any).data ?? res.data)?.id;
      } else {
        const res = await apiService.post<{ data: { id: string } }>(
          API_ENDPOINTS.INVOICES.LIST,
          data,
        );
        invoiceId = ((res.data as any).data ?? res.data)?.id;
        if (andSend) {
          try {
            await apiService.post(API_ENDPOINTS.INVOICES.SEND(invoiceId));
          } catch {
            Alert.alert(
              "Saved as draft — couldn't send",
              'Try again from the invoice detail screen.',
            );
          }
        }
      }
      queryClient.invalidateQueries({ queryKey: ['invoices', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigation.navigate('InvoiceDetail', { id: invoiceId });
    } catch (e: any) {
      const fieldErrors = parseFieldErrors(e);
      if (Object.keys(fieldErrors).length > 0) {
        Object.entries(fieldErrors).forEach(([field, message]) => {
          if (field === 'invoiceNumber') {
            setError('invoiceNumber', { message });
          }
        });
      }
      Alert.alert('Error', getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  // Section label
  const title = isEdit ? 'Edit Invoice' : isDuplicate ? 'Duplicate Invoice' : 'New Invoice';

  const customerName =
    existingInvoice && (editId ?? prefillId) ? existingInvoice.customer?.displayName : undefined;
  const [selectedCustomerName, setSelectedCustomerName] = useState<string | undefined>(
    customerName,
  );
  const watchedCustomer = watch('customerId');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: OUTLINE_V + '40',
          backgroundColor: SURFACE,
        }}
      >
        <TouchableOpacity onPress={handleBack} style={{ marginRight: 12 }}>
          <MaterialCommunityIcons name="close" size={24} color={ON_SURF} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: ON_SURF }}>{title}</Text>
        {saving ? (
          <ActivityIndicator size="small" color={PRIMARY} />
        ) : (
          <TouchableOpacity onPress={handleSubmit((d) => onSave(d, false))}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: PRIMARY }}>Save</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}>
          {/* Customer */}
          <View style={{ backgroundColor: SURFACE, borderRadius: 16, padding: 16 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: MUTED,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginBottom: 10,
              }}
            >
              Customer
            </Text>
            <TouchableOpacity
              onPress={() => setShowCustomer(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: '#f3f3fd',
                borderRadius: 12,
                padding: 14,
              }}
            >
              <MaterialCommunityIcons
                name="account"
                size={22}
                color={watchedCustomer ? PRIMARY : MUTED}
              />
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: watchedCustomer ? ON_SURF : MUTED,
                  fontWeight: watchedCustomer ? '600' : '400',
                }}
              >
                {selectedCustomerName ?? (watchedCustomer ? watchedCustomer : 'Select customer')}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color={MUTED} />
            </TouchableOpacity>
            {errors.customerId && (
              <Text style={{ fontSize: 11, color: ERROR, marginTop: 4 }}>
                {errors.customerId.message}
              </Text>
            )}
          </View>

          {/* Invoice # + Dates */}
          <View style={{ backgroundColor: SURFACE, borderRadius: 16, padding: 16 }}>
            <View style={{ marginBottom: 14 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: MUTED,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  marginBottom: 8,
                }}
              >
                Invoice #
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Controller
                  control={control}
                  name="invoiceNumber"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      value={value ?? ''}
                      onChangeText={onChange}
                      placeholder="INV-0001"
                      placeholderTextColor={MUTED}
                      style={{
                        flex: 1,
                        fontSize: 15,
                        color: ON_SURF,
                        borderBottomWidth: 1,
                        borderBottomColor: errors.invoiceNumber ? ERROR : OUTLINE_V,
                        paddingBottom: 6,
                      }}
                    />
                  )}
                />
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      const res = await apiService.get<{ data: { nextInvoiceNumber: string } }>(
                        API_ENDPOINTS.INVOICES.NEXT_NUMBER,
                      );
                      setValue(
                        'invoiceNumber',
                        ((res.data as any).data ?? res.data)?.nextInvoiceNumber,
                      );
                    } catch {}
                  }}
                >
                  <MaterialCommunityIcons name="refresh" size={20} color={PRIMARY} />
                </TouchableOpacity>
              </View>
              {errors.invoiceNumber && (
                <Text style={{ fontSize: 11, color: ERROR, marginTop: 4 }}>
                  {errors.invoiceNumber.message}
                </Text>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: MUTED,
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    marginBottom: 8,
                  }}
                >
                  Issue Date
                </Text>
                <Controller
                  control={control}
                  name="invoiceDate"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      value={value ?? ''}
                      onChangeText={onChange}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={MUTED}
                      style={{
                        fontSize: 14,
                        color: ON_SURF,
                        borderBottomWidth: 1,
                        borderBottomColor: OUTLINE_V,
                        paddingBottom: 6,
                      }}
                    />
                  )}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: MUTED,
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    marginBottom: 8,
                  }}
                >
                  Due Date
                </Text>
                <Controller
                  control={control}
                  name="dueDate"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      value={value ?? ''}
                      onChangeText={onChange}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={MUTED}
                      style={{
                        fontSize: 14,
                        color: ON_SURF,
                        borderBottomWidth: 1,
                        borderBottomColor: OUTLINE_V,
                        paddingBottom: 6,
                      }}
                    />
                  )}
                />
              </View>
            </View>

            {/* Payment Terms */}
            <View style={{ marginTop: 14 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: MUTED,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  marginBottom: 8,
                }}
              >
                Payment Terms
              </Text>
              <TouchableOpacity
                onPress={() => setShowTerms(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottomWidth: 1,
                  borderBottomColor: OUTLINE_V,
                  paddingBottom: 6,
                }}
              >
                <Text style={{ fontSize: 14, color: watchedTerms ? ON_SURF : MUTED }}>
                  {watchedTerms ? watchedTerms.replace(/_/g, ' ') : 'Optional'}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={18} color={MUTED} />
              </TouchableOpacity>
            </View>

            {/* Reference */}
            <View style={{ marginTop: 14 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: MUTED,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  marginBottom: 8,
                }}
              >
                Reference Number
              </Text>
              <Controller
                control={control}
                name="referenceNumber"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value ?? ''}
                    onChangeText={onChange}
                    placeholder="Optional"
                    placeholderTextColor={MUTED}
                    maxLength={100}
                    style={{
                      fontSize: 14,
                      color: ON_SURF,
                      borderBottomWidth: 1,
                      borderBottomColor: OUTLINE_V,
                      paddingBottom: 6,
                    }}
                  />
                )}
              />
            </View>
          </View>

          {/* Line Items */}
          <View style={{ backgroundColor: SURFACE, borderRadius: 16, padding: 16 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: MUTED,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}
              >
                Line Items ({fields.length})
              </Text>
            </View>
            {fields.map((field, idx) => (
              <LineItemCard
                key={field.id}
                index={idx}
                control={control}
                remove={remove}
                setValue={setValue}
                errors={errors}
              />
            ))}
            <TouchableOpacity
              onPress={() => append({ description: '', quantity: 1, unitPrice: 0 })}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderWidth: 1.5,
                borderColor: PRIMARY,
                borderStyle: 'dashed',
                borderRadius: 12,
                paddingVertical: 12,
                marginTop: 4,
              }}
            >
              <MaterialCommunityIcons name="plus" size={20} color={PRIMARY} />
              <Text style={{ fontSize: 14, color: PRIMARY, fontWeight: '700' }}>Add Line</Text>
            </TouchableOpacity>
            {errors.lineItems && typeof errors.lineItems.message === 'string' && (
              <Text style={{ fontSize: 12, color: ERROR, marginTop: 8 }}>
                {errors.lineItems.message}
              </Text>
            )}
          </View>

          {/* Invoice-level Discount */}
          <View style={{ backgroundColor: SURFACE, borderRadius: 16, padding: 16 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: MUTED,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginBottom: 12,
              }}
            >
              Invoice Discount
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <TouchableOpacity
                onPress={() => setShowDiscountType(true)}
                style={{
                  backgroundColor: '#f3f3fd',
                  borderRadius: 10,
                  padding: 12,
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{ fontSize: 14, color: watchedDiscount ? ON_SURF : MUTED }}>
                  {watchedDiscount ?? 'None'}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={16} color={MUTED} />
              </TouchableOpacity>
              {watchedDiscount && (
                <Controller
                  control={control}
                  name="discountValue"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      value={value?.toString() ?? ''}
                      onChangeText={(t) => onChange(parseFloat(t) || 0)}
                      keyboardType="decimal-pad"
                      placeholder={watchedDiscount === 'PERCENTAGE' ? '%' : '$'}
                      placeholderTextColor={MUTED}
                      style={{
                        flex: 1,
                        fontSize: 15,
                        color: ON_SURF,
                        borderBottomWidth: 1,
                        borderBottomColor: OUTLINE_V,
                        paddingBottom: 6,
                      }}
                    />
                  )}
                />
              )}
            </View>
          </View>

          {/* Live Totals */}
          <View style={{ backgroundColor: SURFACE, borderRadius: 16, padding: 16 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: MUTED,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginBottom: 12,
              }}
            >
              Totals
            </Text>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}
            >
              <Text style={{ fontSize: 14, color: ON_VAR }}>Subtotal</Text>
              <Text style={{ fontSize: 14, color: ON_SURF, fontWeight: '600' }}>
                {formatCurrency(subtotal, currCode)}
              </Text>
            </View>
            {discountAmount > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 4,
                }}
              >
                <Text style={{ fontSize: 14, color: ON_VAR }}>Discount</Text>
                <Text style={{ fontSize: 14, color: SUCCESS, fontWeight: '600' }}>
                  -{formatCurrency(discountAmount, currCode)}
                </Text>
              </View>
            )}
            {taxAmount > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 4,
                }}
              >
                <Text style={{ fontSize: 14, color: ON_VAR }}>Tax</Text>
                <Text style={{ fontSize: 14, color: ON_SURF, fontWeight: '600' }}>
                  {formatCurrency(taxAmount, currCode)}
                </Text>
              </View>
            )}
            <View style={{ height: 1, backgroundColor: OUTLINE_V, marginVertical: 8 }} />
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}
            >
              <Text style={{ fontSize: 16, fontWeight: '800', color: ON_SURF }}>Total</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: PRIMARY }}>
                {formatCurrency(total, currCode)}
              </Text>
            </View>
          </View>

          {/* Advanced Collapsible */}
          <TouchableOpacity
            onPress={() => setShowAdvanced((o) => !o)}
            style={{
              backgroundColor: SURFACE,
              borderRadius: 16,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: ON_SURF }}>
              Advanced Settings
            </Text>
            <MaterialCommunityIcons
              name={showAdvanced ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={MUTED}
            />
          </TouchableOpacity>

          {showAdvanced && (
            <View style={{ backgroundColor: SURFACE, borderRadius: 16, padding: 16, gap: 16 }}>
              {/* Notes */}
              <View>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: MUTED,
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    marginBottom: 8,
                  }}
                >
                  Notes
                </Text>
                <Controller
                  control={control}
                  name="notes"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      value={value ?? ''}
                      onChangeText={onChange}
                      placeholder="Internal notes..."
                      placeholderTextColor={MUTED}
                      multiline
                      maxLength={2000}
                      style={{
                        fontSize: 14,
                        color: ON_SURF,
                        minHeight: 80,
                        textAlignVertical: 'top',
                        borderWidth: 1,
                        borderColor: OUTLINE_V,
                        borderRadius: 10,
                        padding: 10,
                      }}
                    />
                  )}
                />
              </View>

              {/* Terms & Conditions */}
              <View>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: MUTED,
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    marginBottom: 8,
                  }}
                >
                  Terms & Conditions
                </Text>
                <Controller
                  control={control}
                  name="termsAndConditions"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      value={value ?? ''}
                      onChangeText={onChange}
                      placeholder="Terms & conditions..."
                      placeholderTextColor={MUTED}
                      multiline
                      maxLength={5000}
                      style={{
                        fontSize: 14,
                        color: ON_SURF,
                        minHeight: 100,
                        textAlignVertical: 'top',
                        borderWidth: 1,
                        borderColor: OUTLINE_V,
                        borderRadius: 10,
                        padding: 10,
                      }}
                    />
                  )}
                />
              </View>

              {/* Recurring */}
              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ fontSize: 14, color: ON_SURF, fontWeight: '600' }}>
                    Recurring Invoice
                  </Text>
                  <Controller
                    control={control}
                    name="isRecurring"
                    render={({ field: { onChange, value } }) => (
                      <Switch
                        value={!!value}
                        onValueChange={onChange}
                        thumbColor={value ? '#fff' : '#f4f3f4'}
                        trackColor={{ false: OUTLINE_V, true: PRIMARY }}
                      />
                    )}
                  />
                </View>
                {watchedRecurring && (
                  <View style={{ marginTop: 12, gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => setShowFreq(true)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#f3f3fd',
                        borderRadius: 10,
                        padding: 12,
                      }}
                    >
                      <Text style={{ fontSize: 14, color: ON_SURF }}>
                        {watch('recurringFrequency') ?? 'Select frequency'}
                      </Text>
                      <MaterialCommunityIcons name="chevron-down" size={18} color={MUTED} />
                    </TouchableOpacity>
                    <View>
                      <Text style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>
                        End Date (optional)
                      </Text>
                      <Controller
                        control={control}
                        name="recurringEndDate"
                        render={({ field: { onChange, value } }) => (
                          <TextInput
                            value={value ?? ''}
                            onChangeText={onChange}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={MUTED}
                            style={{
                              fontSize: 14,
                              color: ON_SURF,
                              borderBottomWidth: 1,
                              borderBottomColor: OUTLINE_V,
                              paddingBottom: 6,
                            }}
                          />
                        )}
                      />
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Footer */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: SURFACE,
          borderTopWidth: 1,
          borderTopColor: OUTLINE_V + '40',
          paddingHorizontal: 16,
          paddingVertical: 12,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <Text style={{ fontSize: 13, color: MUTED, fontWeight: '600' }}>TOTAL AMOUNT</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: PRIMARY }}>
            {formatCurrency(total, currCode)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={handleSubmit((d) => onSave(d, false))}
            disabled={saving}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: PRIMARY,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: PRIMARY }}>
              {isEdit ? 'Save Changes' : 'Save Draft'}
            </Text>
          </TouchableOpacity>
          {!isEdit && canSend && (
            <TouchableOpacity
              onPress={handleSubmit((d) => onSave(d, true))}
              disabled={saving}
              style={{
                flex: 1,
                height: 48,
                borderRadius: 12,
                backgroundColor: PRIMARY,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Save & Send</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Modals */}
      <SearchModal
        visible={showCustomer}
        title="Select Customer"
        fetchUrl={API_ENDPOINTS.CUSTOMERS.LIST}
        onClose={() => setShowCustomer(false)}
        onSelect={(item) => {
          setValue('customerId', item.id);
          setSelectedCustomerName(item.displayName ?? item.name);
        }}
      />

      <PickerModal
        visible={showTerms}
        title="Payment Terms"
        options={PAYMENT_TERMS}
        selected={watchedTerms}
        onSelect={(v) => setValue('paymentTerms', v)}
        onClose={() => setShowTerms(false)}
      />

      <PickerModal
        visible={showDiscountType}
        title="Discount Type"
        options={['PERCENTAGE', 'FIXED'] as const}
        selected={watchedDiscount}
        onSelect={(v) => setValue('discountType', v)}
        onClose={() => setShowDiscountType(false)}
      />

      <PickerModal
        visible={showFreq}
        title="Recurring Frequency"
        options={RECURRING_FREQS}
        selected={watch('recurringFrequency')}
        onSelect={(v) => setValue('recurringFrequency', v)}
        onClose={() => setShowFreq(false)}
      />
    </SafeAreaView>
  );
}
