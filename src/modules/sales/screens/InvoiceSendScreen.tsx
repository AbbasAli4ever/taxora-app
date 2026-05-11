import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
const WARNING = '#7b4f00';
const WARNING_BG = '#fff3cd';

type Nav = NativeStackNavigationProp<SalesStackParamList & RootStackParamList>;
type Route = RouteProp<SalesStackParamList, 'InvoiceSend'>;

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  statusInfo: { allowSend: boolean };
  customer: { id: string; displayName: string; email?: string };
  currencyCode: string;
  totalAmount: number;
  dueDate?: string;
  isRecurring: boolean;
  nextRecurringDate?: string;
}

function formatCurrency(amount: number, code = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

function formatDate(str?: string) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function InvoiceSendScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { id } = route.params;
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const { data: invoice, isLoading } = useQuery<Invoice>({
    queryKey: ['invoices', 'detail', id],
    queryFn: async () => {
      const res = await apiService.get<{ data: Invoice }>(API_ENDPOINTS.INVOICES.DETAIL(id));
      return (res.data as any).data ?? res.data;
    },
    staleTime: 30 * 1000,
  });

  async function handleSend() {
    if (!invoice) return;
    setSubmitting(true);
    try {
      await apiService.post(API_ENDPOINTS.INVOICES.SEND(id));
      queryClient.invalidateQueries({ queryKey: ['invoices', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['audit-trail'] });
      navigation.goBack();
    } catch (e) {
      const msg = getApiErrorMessage(e);
      if (msg.toLowerCase().includes('email')) {
        Alert.alert(
          "Couldn't send",
          "Couldn't send the email. Invoice status updated — try resending from detail.",
        );
        navigation.goBack();
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || !invoice) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}
      >
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  const hasEmail = Boolean(invoice.customer.email);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={ON_SURF} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: ON_SURF }}>
          Send Invoice
        </Text>
      </View>

      {/* Drag handle visual */}
      <View style={{ alignItems: 'center', marginBottom: 4 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: OUTLINE_V }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Summary card */}
        <View style={{ backgroundColor: SURFACE, borderRadius: 16, padding: 20 }}>
          <Text
            style={{
              fontSize: 12,
              color: MUTED,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: 12,
            }}
          >
            Invoice Summary
          </Text>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: ON_SURF }}>
              {invoice.invoiceNumber}
            </Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: PRIMARY }}>
              {formatCurrency(invoice.totalAmount, invoice.currencyCode)}
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: ON_VAR }}>{invoice.customer.displayName}</Text>
          {invoice.dueDate && (
            <Text style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
              Due {formatDate(invoice.dueDate)}
            </Text>
          )}

          {/* Recurring note */}
          {invoice.isRecurring && invoice.nextRecurringDate && (
            <View
              style={{
                backgroundColor: WARNING_BG,
                borderRadius: 10,
                padding: 12,
                marginTop: 12,
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <MaterialCommunityIcons
                name="refresh"
                size={16}
                color={WARNING}
                style={{ marginTop: 1 }}
              />
              <Text style={{ flex: 1, fontSize: 13, color: WARNING, lineHeight: 19 }}>
                Sending will create the next occurrence on {formatDate(invoice.nextRecurringDate)}.
              </Text>
            </View>
          )}
        </View>

        {/* Recipient row */}
        <View style={{ backgroundColor: SURFACE, borderRadius: 16, padding: 20 }}>
          <Text
            style={{
              fontSize: 12,
              color: MUTED,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: 12,
            }}
          >
            Recipient
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: PRIMARY + '18',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name="email-outline" size={20} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>Sending to:</Text>
              {hasEmail ? (
                <Text style={{ fontSize: 14, color: ON_SURF, fontWeight: '600' }}>
                  {invoice.customer.email}
                </Text>
              ) : (
                <Text style={{ fontSize: 14, color: ERROR, fontWeight: '600' }}>
                  No email on file
                </Text>
              )}
            </View>
          </View>
          {!hasEmail && (
            <View
              style={{ backgroundColor: '#ffdad6', borderRadius: 10, padding: 12, marginTop: 12 }}
            >
              <Text style={{ fontSize: 13, color: ERROR, lineHeight: 19 }}>
                No email address on file for this customer. Add an email address on the web app
                first.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer buttons */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingBottom: 24,
          paddingTop: 12,
          gap: 12,
          borderTopWidth: 1,
          borderTopColor: OUTLINE_V + '40',
          backgroundColor: SURFACE,
        }}
      >
        <TouchableOpacity
          onPress={handleSend}
          disabled={submitting || !hasEmail}
          style={{
            backgroundColor: hasEmail ? PRIMARY : OUTLINE_V,
            borderRadius: 14,
            height: 52,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Send Now</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 16, color: ON_VAR, fontWeight: '600' }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
