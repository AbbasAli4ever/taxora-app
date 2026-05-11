import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
  ActionSheetIOS,
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
import { useAuthStore } from '@modules/auth/store';

const BG = '#faf8ff';
const SURFACE = '#ffffff';
const PRIMARY = '#003d9b';
const ON_SURF = '#191b23';
const ON_VAR = '#434654';
const OUTLINE_V = '#c3c6d6';
const ERROR = '#ba1a1a';
const MUTED = '#737685';
const SUCCESS = '#1a6b3c';

const STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  DRAFT: { text: '#434654', bg: '#e1e2ec' },
  SENT: { text: '#0040a2', bg: '#dae2ff' },
  PARTIALLY_PAID: { text: '#7b2600', bg: '#ffdbcf' },
  PAID: { text: '#1a6b3c', bg: '#d4f4e3' },
  OVERDUE: { text: '#ba1a1a', bg: '#ffdad6' },
  VOID: { text: '#434654', bg: '#ededf8' },
};

type Nav = NativeStackNavigationProp<SalesStackParamList & RootStackParamList>;
type Route = RouteProp<SalesStackParamList, 'InvoiceDetail'>;

interface Invoice {
  id: string;
  invoiceNumber: string;
  referenceNumber?: string;
  status: string;
  statusInfo: {
    label: string;
    color: string;
    description: string;
    allowEdit: boolean;
    allowDelete: boolean;
    allowSend: boolean;
    allowVoid: boolean;
    allowPayment: boolean;
  };
  invoiceDate: string;
  dueDate?: string;
  paymentTerms?: string;
  sentAt?: string;
  paidAt?: string;
  voidedAt?: string;
  voidReason?: string;
  customer: {
    id: string;
    displayName: string;
    email?: string;
    phone?: string;
  };
  currencyCode: string;
  exchangeRate: number;
  lineItems: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    taxPercent: number;
    amount: number;
    sortOrder: number;
    product?: { id: string; name: string };
  }>;
  subtotal: number;
  discountType?: 'PERCENTAGE' | 'FIXED';
  discountValue?: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  notes?: string;
  termsAndConditions?: string;
  isRecurring: boolean;
  nextRecurringDate?: string;
  projectId?: string;
  project?: { id: string; name: string };
  payments: Array<{
    id: string;
    paymentDate: string;
    amount: number;
    paymentMethod?: string;
    referenceNumber?: string;
    notes?: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface AuditEvent {
  id: string;
  action: string;
  actor?: { firstName: string; lastName: string };
  createdAt: string;
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

function customerInitials(name: string) {
  return name
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View
      style={{ backgroundColor: SURFACE, borderRadius: 16, marginBottom: 12, overflow: 'hidden' }}
    >
      <TouchableOpacity
        onPress={() => setOpen((o) => !o)}
        activeOpacity={0.8}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '700', color: ON_SURF }}>{title}</Text>
        <MaterialCommunityIcons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={MUTED}
        />
      </TouchableOpacity>
      {open && <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>{children}</View>}
    </View>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View
      style={{
        backgroundColor: SURFACE,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        ...(style ?? {}),
      }}
    >
      {children}
    </View>
  );
}

function ActionBtn({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{ alignItems: 'center', gap: 6, opacity: disabled ? 0.5 : 1 }}
      activeOpacity={0.7}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          backgroundColor: PRIMARY + '12',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialCommunityIcons name={icon as any} size={22} color={PRIMARY} />
      </View>
      <Text style={{ fontSize: 11, color: ON_VAR, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );
}

function TotalsRow({
  label,
  value,
  bold,
  valueColor,
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueColor?: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
      }}
    >
      <Text style={{ fontSize: 14, color: ON_VAR, fontWeight: bold ? '700' : '400' }}>{label}</Text>
      <Text
        style={{
          fontSize: bold ? 16 : 14,
          color: valueColor ?? ON_SURF,
          fontWeight: bold ? '800' : '600',
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export function InvoiceDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { id } = route.params;
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [mutating, setMutating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: invoice,
    isLoading,
    isError,
    refetch,
  } = useQuery<Invoice>({
    queryKey: ['invoices', 'detail', id],
    queryFn: async () => {
      const res = await apiService.get<any>(API_ENDPOINTS.INVOICES.DETAIL(id));
      return (res.data as any).data ?? res.data;
    },
    staleTime: 30 * 1000,
  });

  const canViewAudit = hasPermission('audit:view');
  const { data: auditEvents } = useQuery<AuditEvent[]>({
    queryKey: ['audit-trail', { entityType: 'INVOICE', entityId: id }],
    queryFn: async () => {
      const res = await apiService.get<any>(API_ENDPOINTS.AUDIT_TRAIL, {
        params: { entityType: 'INVOICE', entityId: id },
      });
      return (res.data as any).data ?? res.data;
    },
    enabled: canViewAudit,
  });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['invoices', 'detail', id] });
    queryClient.invalidateQueries({ queryKey: ['invoices', 'list'] });
    queryClient.invalidateQueries({ queryKey: ['invoices', 'summary'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['audit-trail'] });
  }

  async function handleSend() {
    if (!invoice) return;
    if (!invoice.customer.email) {
      Alert.alert(
        'No email on file',
        `No email on file for ${invoice.customer.displayName}. Add an email on the web app first.`,
      );
      return;
    }
    Alert.alert(
      'Send Invoice',
      `Send invoice ${invoice.invoiceNumber} to ${invoice.customer.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setMutating(true);
            try {
              await apiService.post(API_ENDPOINTS.INVOICES.SEND(id));
              invalidateAll();
            } catch (e) {
              Alert.alert('Error', getApiErrorMessage(e));
            } finally {
              setMutating(false);
            }
          },
        },
      ],
    );
  }

  async function handleVoid() {
    Alert.alert('Void Invoice', `Void invoice ${invoice?.invoiceNumber}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Void',
        style: 'destructive',
        onPress: async () => {
          setMutating(true);
          try {
            await apiService.post(API_ENDPOINTS.INVOICES.VOID(id), {});
            invalidateAll();
          } catch (e) {
            Alert.alert('Error', getApiErrorMessage(e));
          } finally {
            setMutating(false);
          }
        },
      },
    ]);
  }

  async function handleDelete() {
    Alert.alert(
      'Delete Invoice',
      `Delete draft invoice ${invoice?.invoiceNumber}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setMutating(true);
            try {
              await apiService.delete(API_ENDPOINTS.INVOICES.DETAIL(id));
              invalidateAll();
              navigation.goBack();
            } catch (e) {
              Alert.alert('Error', getApiErrorMessage(e));
            } finally {
              setMutating(false);
            }
          },
        },
      ],
    );
  }

  function showMoreSheet() {
    const options: string[] = [];
    if (invoice?.statusInfo.allowEdit) options.push('Duplicate');
    if (invoice?.statusInfo.allowVoid) options.push('Void');
    if (invoice?.statusInfo.allowDelete) options.push('Delete');
    options.push('Cancel');

    const cancelIdx = options.length - 1;
    const deleteIdx = options.indexOf('Delete');

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: cancelIdx,
          destructiveButtonIndex: deleteIdx >= 0 ? deleteIdx : undefined,
        },
        (idx) => {
          const chosen = options[idx];
          if (chosen === 'Duplicate') navigation.navigate('InvoiceForm', { prefillFromId: id });
          if (chosen === 'Void') handleVoid();
          if (chosen === 'Delete') handleDelete();
        },
      );
    } else {
      const btns = options
        .filter((o) => o !== 'Cancel')
        .map((o) => ({
          text: o,
          style: o === 'Delete' || o === 'Void' ? ('destructive' as const) : ('default' as const),
          onPress: () => {
            if (o === 'Duplicate') navigation.navigate('InvoiceForm', { prefillFromId: id });
            if (o === 'Void') handleVoid();
            if (o === 'Delete') handleDelete();
          },
        }));
      Alert.alert('More Actions', undefined, [...btns, { text: 'Cancel', style: 'cancel' }]);
    }
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}
      >
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  if (isError || !invoice) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: ERROR, fontSize: 15, marginBottom: 16 }}>Failed to load invoice</Text>
        <TouchableOpacity onPress={() => refetch()}>
          <Text style={{ color: PRIMARY, fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const statusColors = STATUS_COLORS[invoice.status] ?? STATUS_COLORS.DRAFT;
  const initials = customerInitials(invoice.customer.displayName);
  const isOverdue = invoice.status === 'OVERDUE';
  const amountDueColor = invoice.amountDue === 0 ? SUCCESS : isOverdue ? ERROR : PRIMARY;

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
          <MaterialCommunityIcons name="arrow-left" size={24} color={ON_SURF} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: ON_SURF }}>
          Invoice Detail
        </Text>
        <TouchableOpacity onPress={showMoreSheet}>
          <MaterialCommunityIcons name="dots-vertical" size={24} color={ON_SURF} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
        }
      >
        <Card>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 12,
            }}
          >
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 20,
                backgroundColor: statusColors.bg,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: statusColors.text }}>
                {invoice.status.replace(/_/g, ' ')}
              </Text>
            </View>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: PRIMARY + '18',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: '700', color: PRIMARY }}>{initials}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 32, fontWeight: '800', color: ON_SURF, letterSpacing: -0.5 }}>
            {formatCurrency(invoice.totalAmount, invoice.currencyCode)}
            <Text style={{ fontSize: 16, fontWeight: '400', color: MUTED }}>
              {' '}
              {invoice.currencyCode}
            </Text>
          </Text>
          <Text style={{ fontSize: 14, color: MUTED, marginTop: 4 }}>
            {invoice.dueDate ? `Due ${formatDate(invoice.dueDate)} · ` : ''}
            {invoice.customer.displayName}
          </Text>
          {invoice.isRecurring && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 }}>
              <MaterialCommunityIcons name="refresh" size={14} color={PRIMARY} />
              <Text style={{ fontSize: 12, color: PRIMARY, fontWeight: '600' }}>
                Recurring
                {invoice.nextRecurringDate
                  ? ` · Next: ${formatDate(invoice.nextRecurringDate)}`
                  : ''}
              </Text>
            </View>
          )}
          {invoice.project && (
            <Text style={{ fontSize: 12, color: PRIMARY, fontWeight: '600', marginTop: 6 }}>
              Project: {invoice.project.name}
            </Text>
          )}
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            {invoice.statusInfo.allowSend && (
              <ActionBtn icon="send" label="Send" onPress={handleSend} disabled={mutating} />
            )}
            <ActionBtn
              icon="file-pdf-box"
              label="PDF"
              onPress={() => Alert.alert('PDF', 'PDF sharing coming soon')}
              disabled={mutating}
            />
            {invoice.statusInfo.allowPayment && (
              <ActionBtn
                icon="cash"
                label="Payment"
                onPress={() => navigation.navigate('InvoicePayment', { id })}
                disabled={mutating}
              />
            )}
            {invoice.statusInfo.allowEdit && (
              <ActionBtn
                icon="pencil"
                label="Edit"
                onPress={() => navigation.navigate('InvoiceForm', { id })}
                disabled={mutating}
              />
            )}
            <ActionBtn
              icon="dots-horizontal"
              label="More"
              onPress={showMoreSheet}
              disabled={mutating}
            />
          </View>
        </Card>

        <Card>
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
            Line Items ({invoice.lineItems.length})
          </Text>
          {invoice.lineItems.map((line, idx) => (
            <View
              key={line.id}
              style={{
                paddingVertical: 10,
                borderTopWidth: idx > 0 ? 1 : 0,
                borderTopColor: OUTLINE_V + '40',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    fontSize: 14,
                    color: ON_SURF,
                    fontWeight: '600',
                    marginRight: 8,
                  }}
                >
                  {line.description}
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: ON_SURF }}>
                  {formatCurrency(line.amount, invoice.currencyCode)}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>
                {line.quantity} × {formatCurrency(line.unitPrice, invoice.currencyCode)}
                {line.discountPercent > 0 ? ` · ${line.discountPercent}% off` : ''}
                {line.taxPercent > 0 ? ` · ${line.taxPercent}% tax` : ''}
              </Text>
            </View>
          ))}
        </Card>

        <Card>
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
          <TotalsRow
            label="Subtotal"
            value={formatCurrency(invoice.subtotal, invoice.currencyCode)}
          />
          {invoice.discountAmount > 0 && (
            <TotalsRow
              label={`Discount${invoice.discountType === 'PERCENTAGE' ? ` (${invoice.discountValue}%)` : ''}`}
              value={`-${formatCurrency(invoice.discountAmount, invoice.currencyCode)}`}
              valueColor={SUCCESS}
            />
          )}
          {invoice.taxAmount > 0 && (
            <TotalsRow
              label="Tax"
              value={formatCurrency(invoice.taxAmount, invoice.currencyCode)}
            />
          )}
          <View
            style={{
              height: 1,
              borderStyle: 'dashed',
              borderWidth: 1,
              borderColor: OUTLINE_V,
              marginVertical: 10,
            }}
          />
          <TotalsRow
            label="Total"
            value={formatCurrency(invoice.totalAmount, invoice.currencyCode)}
            bold
          />
          <TotalsRow
            label={invoice.amountDue === 0 ? 'Paid in Full' : 'Amount Due'}
            value={formatCurrency(invoice.amountDue, invoice.currencyCode)}
            bold
            valueColor={amountDueColor}
          />
        </Card>

        {invoice.payments.length > 0 && (
          <Card>
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
              Payment History
            </Text>
            {invoice.payments.map((p, idx) => (
              <View
                key={p.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 10,
                  borderTopWidth: idx > 0 ? 1 : 0,
                  borderTopColor: OUTLINE_V + '40',
                }}
              >
                <View>
                  <Text style={{ fontSize: 14, color: ON_SURF, fontWeight: '600' }}>
                    {formatDate(p.paymentDate)}
                  </Text>
                  <Text style={{ fontSize: 12, color: MUTED }}>
                    {p.paymentMethod?.replace(/_/g, ' ') ?? 'OTHER'}
                    {p.referenceNumber ? ` · ${p.referenceNumber}` : ''}
                  </Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: SUCCESS }}>
                  {formatCurrency(p.amount, invoice.currencyCode)}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {(invoice.notes || invoice.termsAndConditions) && (
          <Collapsible title="Notes & Terms">
            {invoice.notes && (
              <View style={{ marginBottom: 12 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: MUTED,
                    marginBottom: 4,
                    textTransform: 'uppercase',
                  }}
                >
                  Internal Notes
                </Text>
                <Text style={{ fontSize: 14, color: ON_VAR, lineHeight: 21 }}>{invoice.notes}</Text>
              </View>
            )}
            {invoice.termsAndConditions && (
              <View>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: MUTED,
                    marginBottom: 4,
                    textTransform: 'uppercase',
                  }}
                >
                  Terms & Conditions
                </Text>
                <Text style={{ fontSize: 14, color: ON_VAR, lineHeight: 21 }}>
                  {invoice.termsAndConditions}
                </Text>
              </View>
            )}
          </Collapsible>
        )}

        {canViewAudit && auditEvents && auditEvents.length > 0 && (
          <Collapsible title="Activity Timeline">
            {auditEvents.map((ev, idx) => (
              <View key={ev.id} style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ alignItems: 'center' }}>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: PRIMARY,
                      marginTop: 4,
                    }}
                  />
                  {idx < auditEvents.length - 1 && (
                    <View style={{ width: 2, flex: 1, backgroundColor: OUTLINE_V, marginTop: 4 }} />
                  )}
                </View>
                <View style={{ flex: 1, paddingBottom: 16 }}>
                  <Text style={{ fontSize: 13, color: ON_SURF, fontWeight: '600' }}>
                    {ev.action}
                  </Text>
                  <Text style={{ fontSize: 12, color: MUTED }}>
                    {ev.actor ? `${ev.actor.firstName} ${ev.actor.lastName} · ` : ''}
                    {formatDate(ev.createdAt)}
                  </Text>
                </View>
              </View>
            ))}
          </Collapsible>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
