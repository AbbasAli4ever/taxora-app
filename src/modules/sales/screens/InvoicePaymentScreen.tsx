import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { SalesStackParamList, RootStackParamList } from '@common/types';
import { API_ENDPOINTS } from '@common/constants';
import { apiService } from '@common/services/api.service';
import { getApiErrorMessage } from '@common/utils/apiError';

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
type Route = RouteProp<SalesStackParamList, 'InvoicePayment'>;

type PaymentMethod = 'CASH' | 'CHECK' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'OTHER';

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  customer: { displayName: string };
  currencyCode: string;
  amountDue: number;
  dueDate?: string;
}

interface BankAccount {
  id: string;
  name: string;
  accountNumber?: string;
  isDefault?: boolean;
}

function formatCurrency(amount: number, code = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const METHODS: { key: PaymentMethod; icon: string; label: string }[] = [
  { key: 'CASH', icon: 'cash', label: 'Cash' },
  { key: 'CHECK', icon: 'checkbook', label: 'Check' },
  { key: 'BANK_TRANSFER', icon: 'bank', label: 'Bank' },
  { key: 'CREDIT_CARD', icon: 'credit-card', label: 'Card' },
  { key: 'OTHER', icon: 'dots-horizontal-circle', label: 'Other' },
];

const schema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  paymentDate: z.string().min(1, 'Date required'),
  paymentMethod: z.enum(['CASH', 'CHECK', 'BANK_TRANSFER', 'CREDIT_CARD', 'OTHER']).optional(),
  referenceNumber: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  depositAccountId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function InvoicePaymentScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { id } = route.params;
  const queryClient = useQueryClient();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [tempDate, setTempDate] = useState(todayStr());

  const { data: invoice } = useQuery<Invoice>({
    queryKey: ['invoices', 'detail', id],
    queryFn: async () => {
      const res = await apiService.get<{ data: Invoice }>(API_ENDPOINTS.INVOICES.DETAIL(id));
      return (res.data as any).data ?? res.data;
    },
    staleTime: 30 * 1000,
  });

  const { data: accounts } = useQuery<BankAccount[]>({
    queryKey: ['banking', 'accounts'],
    queryFn: async () => {
      const res = await apiService.get<{ data: BankAccount[] }>(API_ENDPOINTS.BANKING.ACCOUNTS);
      return (res.data as any).data ?? res.data;
    },
    staleTime: 60 * 1000,
  });

  const amountDue = invoice?.amountDue ?? 0;
  const currencyCode = invoice?.currencyCode ?? 'USD';

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: amountDue,
      paymentDate: todayStr(),
      paymentMethod: 'OTHER',
      referenceNumber: '',
      notes: '',
      depositAccountId: accounts?.find((a) => a.isDefault)?.id ?? accounts?.[0]?.id,
    },
  });

  // Update amount default when invoice loads
  React.useEffect(() => {
    if (amountDue > 0) setValue('amount', amountDue);
  }, [amountDue, setValue]);

  React.useEffect(() => {
    if (accounts && accounts.length > 0) {
      const def = accounts.find((a) => a.isDefault) ?? accounts[0];
      setValue('depositAccountId', def.id);
    }
  }, [accounts, setValue]);

  const watchedAmount = watch('amount');
  const watchedMethod = watch('paymentMethod');
  const watchedDate = watch('paymentDate');
  const showAccountPicker = accounts && accounts.length > 1;

  const onSubmit = async (data: FormData) => {
    if (data.amount > amountDue) {
      setError('amount', {
        message: `Cannot exceed outstanding amount of ${formatCurrency(amountDue, currencyCode)}`,
      });
      return;
    }
    try {
      await apiService.post(API_ENDPOINTS.INVOICES.PAYMENTS(id), {
        amount: data.amount,
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod ?? 'OTHER',
        referenceNumber: data.referenceNumber || undefined,
        notes: data.notes || undefined,
        depositAccountId: data.depositAccountId || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['banking', 'accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigation.goBack();
      }, 1500);
    } catch (e) {
      Alert.alert('Error', getApiErrorMessage(e));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
          <MaterialCommunityIcons name="close" size={24} color={ON_SURF} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: ON_SURF }}>
          Record Payment
        </Text>
        <TouchableOpacity onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator size="small" color={PRIMARY} />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: '700', color: PRIMARY }}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {/* Summary card */}
          {invoice && (
            <View style={{ backgroundColor: SURFACE, borderRadius: 16, padding: 16 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: MUTED,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  marginBottom: 8,
                }}
              >
                {invoice.invoiceNumber}
              </Text>
              <Text style={{ fontSize: 28, fontWeight: '800', color: PRIMARY }}>
                {formatCurrency(amountDue, currencyCode)}
              </Text>
              <Text style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
                Outstanding · {invoice.customer.displayName}
              </Text>
            </View>
          )}

          {/* Payment Method */}
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
              Payment Method
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {METHODS.map((m) => {
                const active = watchedMethod === m.key;
                return (
                  <TouchableOpacity
                    key={m.key}
                    onPress={() => setValue('paymentMethod', m.key)}
                    style={{ alignItems: 'center', gap: 5 }}
                  >
                    <View
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        backgroundColor: active ? PRIMARY : PRIMARY + '12',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: active ? 0 : 1,
                        borderColor: OUTLINE_V,
                      }}
                    >
                      <MaterialCommunityIcons
                        name={m.icon as any}
                        size={22}
                        color={active ? '#fff' : PRIMARY}
                      />
                    </View>
                    <Text
                      style={{ fontSize: 11, color: active ? PRIMARY : ON_VAR, fontWeight: '600' }}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Amount */}
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
              Amount
            </Text>
            <Controller
              control={control}
              name="amount"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  value={value?.toString() ?? ''}
                  onChangeText={(t) => {
                    const n = parseFloat(t);
                    onChange(isNaN(n) ? 0 : n);
                  }}
                  keyboardType="decimal-pad"
                  style={{
                    fontSize: 32,
                    fontWeight: '800',
                    color: ON_SURF,
                    borderBottomWidth: 2,
                    borderBottomColor: errors.amount ? ERROR : PRIMARY,
                    paddingBottom: 8,
                    marginBottom: 8,
                  }}
                />
              )}
            />
            {errors.amount && (
              <Text style={{ fontSize: 12, color: ERROR, marginBottom: 8 }}>
                {errors.amount.message}
              </Text>
            )}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => setValue('amount', amountDue)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor: PRIMARY + '12',
                  borderWidth: 1,
                  borderColor: PRIMARY + '30',
                }}
              >
                <Text style={{ fontSize: 13, color: PRIMARY, fontWeight: '600' }}>Full</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setValue('amount', Math.floor((amountDue / 2) * 100) / 100)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor: PRIMARY + '12',
                  borderWidth: 1,
                  borderColor: PRIMARY + '30',
                }}
              >
                <Text style={{ fontSize: 13, color: PRIMARY, fontWeight: '600' }}>Half</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Date */}
          <View style={{ backgroundColor: SURFACE, borderRadius: 16, padding: 16 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: MUTED,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginBottom: 8,
              }}
            >
              Payment Date
            </Text>
            <TouchableOpacity
              onPress={() => {
                setTempDate(watchedDate);
                setShowDateModal(true);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: OUTLINE_V,
              }}
            >
              <MaterialCommunityIcons name="calendar" size={20} color={PRIMARY} />
              <Text style={{ fontSize: 15, color: ON_SURF }}>{watchedDate || todayStr()}</Text>
            </TouchableOpacity>
          </View>

          {/* Deposit Account (hidden if only 1) */}
          {showAccountPicker && (
            <View style={{ backgroundColor: SURFACE, borderRadius: 16, padding: 16 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: MUTED,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  marginBottom: 8,
                }}
              >
                Deposit To
              </Text>
              <Controller
                control={control}
                name="depositAccountId"
                render={({ field: { onChange, value } }) => (
                  <View style={{ gap: 8 }}>
                    {accounts!.map((acc) => (
                      <TouchableOpacity
                        key={acc.id}
                        onPress={() => onChange(acc.id)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          borderRadius: 10,
                          backgroundColor: value === acc.id ? PRIMARY + '12' : '#f3f3fd',
                          borderWidth: 1,
                          borderColor: value === acc.id ? PRIMARY : OUTLINE_V,
                        }}
                      >
                        <MaterialCommunityIcons
                          name="bank"
                          size={18}
                          color={value === acc.id ? PRIMARY : MUTED}
                        />
                        <Text
                          style={{
                            fontSize: 14,
                            color: value === acc.id ? PRIMARY : ON_SURF,
                            fontWeight: value === acc.id ? '700' : '400',
                            flex: 1,
                          }}
                        >
                          {acc.name}
                        </Text>
                        {value === acc.id && (
                          <MaterialCommunityIcons name="check" size={18} color={PRIMARY} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              />
            </View>
          )}

          {/* Reference */}
          <View style={{ backgroundColor: SURFACE, borderRadius: 16, padding: 16 }}>
            <Text
              style={{
                fontSize: 13,
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
                  placeholder={watchedMethod === 'CHECK' ? 'Check #1234' : 'Optional'}
                  placeholderTextColor={MUTED}
                  maxLength={100}
                  style={{
                    fontSize: 15,
                    color: ON_SURF,
                    borderBottomWidth: 1,
                    borderBottomColor: OUTLINE_V,
                    paddingBottom: 6,
                  }}
                />
              )}
            />
          </View>

          {/* Notes */}
          <View style={{ backgroundColor: SURFACE, borderRadius: 16, padding: 16 }}>
            <Text
              style={{
                fontSize: 13,
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
                  placeholder="Optional notes..."
                  placeholderTextColor={MUTED}
                  multiline
                  maxLength={2000}
                  style={{ fontSize: 14, color: ON_SURF, minHeight: 80, textAlignVertical: 'top' }}
                />
              )}
            />
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky footer */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingBottom: 24,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: OUTLINE_V + '40',
          backgroundColor: SURFACE,
        }}
      >
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          style={{
            backgroundColor: PRIMARY,
            borderRadius: 14,
            height: 52,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Record Payment</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Success overlay */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: '#00000088',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              backgroundColor: SURFACE,
              borderRadius: 24,
              padding: 40,
              alignItems: 'center',
              gap: 16,
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: SUCCESS + '20',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name="check-circle" size={48} color={SUCCESS} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: ON_SURF }}>
              Payment Recorded
            </Text>
            <Text style={{ fontSize: 15, color: MUTED }}>
              {formatCurrency(watchedAmount ?? 0, currencyCode)}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Date picker modal */}
      <Modal visible={showDateModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: SURFACE,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: ON_SURF, marginBottom: 16 }}>
              Select Date
            </Text>
            <TextInput
              value={tempDate}
              onChangeText={setTempDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={MUTED}
              style={{
                fontSize: 18,
                color: ON_SURF,
                borderWidth: 1,
                borderColor: OUTLINE_V,
                borderRadius: 10,
                padding: 14,
                marginBottom: 16,
              }}
            />
            <TouchableOpacity
              onPress={() => {
                const d = new Date(tempDate);
                const today = new Date();
                if (isNaN(d.getTime()) || d > today) {
                  Alert.alert('Invalid date', 'Please enter a valid date (not in the future).');
                  return;
                }
                setValue('paymentDate', tempDate);
                setShowDateModal(false);
              }}
              style={{
                backgroundColor: PRIMARY,
                borderRadius: 12,
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowDateModal(false)}
              style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: ON_VAR, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
