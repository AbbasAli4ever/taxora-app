import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Platform,
  ActionSheetIOS,
  Alert,
  Linking,
  RefreshControl,
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

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG = '#faf8ff';
const SURFACE = '#ffffff';
const PRIMARY = '#003d9b';
const PRIMARY_C = '#0052cc';
const ON_SURF = '#191b23';
const ON_VAR = '#434654';
const OUTLINE_V = '#c3c6d6';
const MUTED = '#737685';
const ERROR = '#ba1a1a';
const SEC_FIX = '#d7e3fb';
const ON_SEC_FIX = '#3b475b';
const SURF_CONT = '#ededf8';
const SEC_CONT = '#d4e0f8';
const ON_SEC_CONT = '#576377';

const AVATAR_PALETTES = [
  { bg: '#dae2ff', text: '#0040a2' },
  { bg: '#d7e3fb', text: '#3b475b' },
  { bg: '#ffdbcf', text: '#812800' },
  { bg: '#d4f4e3', text: '#1a6b3c' },
];
function getAvatarColor(id: string) {
  const sum = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_PALETTES[sum % AVATAR_PALETTES.length];
}
function getInitials(displayName: string) {
  return (
    displayName
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

type Nav = NativeStackNavigationProp<SalesStackParamList & RootStackParamList>;
type RouteT = RouteProp<SalesStackParamList, 'CustomerDetail'>;
type TabKey = 'overview' | 'invoices' | 'estimates' | 'activity';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Address {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
}

interface Customer {
  id: string;
  customerType: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  fax: string | null;
  website: string | null;
  billingAddress: Address;
  shippingAddress: Address;
  paymentTerms: string | null;
  preferredCurrency: string | null;
  currentBalance: number;
  openingBalance: number;
  creditLimit: number | null;
  notes: string | null;
  isActive: boolean;
  taxNumber: string | null;
  taxExempt: boolean;
  createdAt: string;
}

interface AgingCustomer {
  customerId: string;
  customerName: string;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days91plus: number;
  total: number;
}

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  dueDate: string | null;
  invoiceDate: string;
}

interface EstimateItem {
  id: string;
  estimateNumber: string;
  status: string;
  totalAmount: number;
  expiryDate: string | null;
  estimateDate: string;
}

interface AuditEntry {
  id: string;
  action: string;
  description: string | null;
  createdAt: string;
  actorName: string | null;
}

// ─── Small components ─────────────────────────────────────────────────────────
function InfoRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: string;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10 }}>
      <MaterialCommunityIcons
        name={icon as any}
        size={18}
        color={MUTED}
        style={{ marginRight: 12, marginTop: 2 }}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: MUTED,
            marginBottom: 2,
          }}
        >
          {label}
        </Text>
        <Text style={{ fontSize: 15, color: ON_SURF }}>{value}</Text>
      </View>
    </View>
  );
  if (onPress)
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  return content;
}

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View
      style={[
        {
          backgroundColor: SURFACE,
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          shadowColor: '#09305a',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export function CustomerDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteT>();
  const { id } = route.params;
  const queryClient = useQueryClient();
  const canEdit = useAuthStore((s) => s.hasPermission('customer:edit'));
  const canDelete = useAuthStore((s) => s.hasPermission('customer:delete'));
  const canAudit = useAuthStore((s) => s.hasPermission('audit:view'));

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [mutating, setMutating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // ── Customer detail ───────────────────────────────────────────────────────
  const {
    data: customer,
    isLoading,
    isError,
    refetch,
  } = useQuery<Customer>({
    queryKey: ['customers', 'detail', id],
    queryFn: async () => {
      const res = await apiService.get<{ data: Customer }>(API_ENDPOINTS.CUSTOMERS.DETAIL(id));
      return (res.data as any).data ?? res.data;
    },
    staleTime: 60 * 1000,
  });

  // ── AR aging ──────────────────────────────────────────────────────────────
  const { data: arAging } = useQuery<{ customers: AgingCustomer[] }>({
    queryKey: ['reports', 'ar-aging', { asOfDate: today }],
    queryFn: async () => {
      const res = await apiService.get<{ data: { customers: AgingCustomer[] } }>(
        API_ENDPOINTS.REPORTS.AR_AGING,
        {
          params: { asOfDate: today },
        },
      );
      return (res.data as any).data ?? res.data;
    },
    staleTime: 60 * 1000,
  });

  const customerAging = arAging?.customers?.find((c) => c.customerId === id) ?? null;

  // ── Invoices tab (lazy) ───────────────────────────────────────────────────
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery<InvoiceItem[]>({
    queryKey: ['invoices', 'list', { customerId: id }],
    queryFn: async () => {
      const res = await apiService.get<{ data: { items: InvoiceItem[] } }>(
        API_ENDPOINTS.INVOICES.LIST,
        {
          params: { customerId: id, limit: 20 },
        },
      );
      const d = (res.data as any).data ?? res.data;
      return d.items ?? d;
    },
    staleTime: 60 * 1000,
    enabled: activeTab === 'invoices',
  });

  // ── Estimates tab (lazy) ──────────────────────────────────────────────────
  const { data: estimatesData, isLoading: estimatesLoading } = useQuery<EstimateItem[]>({
    queryKey: ['estimates', 'list', { customerId: id }],
    queryFn: async () => {
      const res = await apiService.get<{ data: { items: EstimateItem[] } }>(
        API_ENDPOINTS.ESTIMATES.LIST,
        {
          params: { customerId: id, limit: 20 },
        },
      );
      const d = (res.data as any).data ?? res.data;
      return d.items ?? d;
    },
    staleTime: 60 * 1000,
    enabled: activeTab === 'estimates',
  });

  // ── Activity tab (lazy) ───────────────────────────────────────────────────
  const { data: activityData, isLoading: activityLoading } = useQuery<AuditEntry[]>({
    queryKey: ['audit-trail', { entityType: 'CUSTOMER', entityId: id }],
    queryFn: async () => {
      const res = await apiService.get<{ data: AuditEntry[] }>(API_ENDPOINTS.AUDIT_TRAIL, {
        params: { entityType: 'CUSTOMER', entityId: id },
      });
      return (res.data as any).data ?? res.data;
    },
    staleTime: 60 * 1000,
    enabled: activeTab === 'activity' && canAudit,
  });

  // ── Pull-to-refresh ───────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    if (activeTab === 'invoices')
      await queryClient.invalidateQueries({ queryKey: ['invoices', 'list', { customerId: id }] });
    if (activeTab === 'estimates')
      await queryClient.invalidateQueries({ queryKey: ['estimates', 'list', { customerId: id }] });
    if (activeTab === 'activity')
      await queryClient.invalidateQueries({
        queryKey: ['audit-trail', { entityType: 'CUSTOMER', entityId: id }],
      });
    setRefreshing(false);
  }, [refetch, activeTab, queryClient, id]);

  // ── Deactivate ────────────────────────────────────────────────────────────
  const handleDeactivate = useCallback(() => {
    Alert.alert(
      'Deactivate Customer',
      `Are you sure you want to deactivate ${customer?.displayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            setMutating(true);
            try {
              await apiService.delete(API_ENDPOINTS.CUSTOMERS.DETAIL(id));
              queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
              queryClient.invalidateQueries({ queryKey: ['customers', 'detail', id] });
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
  }, [customer?.displayName, id, navigation, queryClient]);

  // ── More menu ─────────────────────────────────────────────────────────────
  const handleMoreMenu = useCallback(() => {
    const opts: string[] = [];
    if (canEdit) opts.push('Edit Customer');
    if (canDelete && customer?.isActive) opts.push('Deactivate');
    opts.push('Cancel');
    const cancelIdx = opts.length - 1;
    const destructiveIdx = opts.indexOf('Deactivate');

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: opts,
          cancelButtonIndex: cancelIdx,
          destructiveButtonIndex: destructiveIdx >= 0 ? destructiveIdx : undefined,
        },
        (idx) => {
          if (opts[idx] === 'Edit Customer') navigation.navigate('CustomerForm', { id });
          if (opts[idx] === 'Deactivate') handleDeactivate();
        },
      );
    } else {
      Alert.alert('Options', undefined, [
        ...(canEdit
          ? [{ text: 'Edit Customer', onPress: () => navigation.navigate('CustomerForm', { id }) }]
          : []),
        ...(canDelete && customer?.isActive
          ? [{ text: 'Deactivate', style: 'destructive' as const, onPress: handleDeactivate }]
          : []),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  }, [canEdit, canDelete, customer, id, navigation, handleDeactivate]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fmtCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const formatAddress = (addr: Address): string | null => {
    const parts = [
      addr.line1,
      addr.line2,
      addr.city,
      addr.state,
      addr.postalCode,
      addr.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  const canOpenMap = !!customer?.billingAddress?.line1 && !!customer?.billingAddress?.city;

  const handleCall = () => customer?.phone && Linking.openURL(`tel:${customer.phone}`);
  const handleEmail = () => customer?.email && Linking.openURL(`mailto:${customer.email}`);
  const handleMap = () => {
    if (!customer || !canOpenMap) return;
    const addr = `${customer.billingAddress.line1}, ${customer.billingAddress.city}`;
    const url =
      Platform.OS === 'ios'
        ? `maps:?q=${encodeURIComponent(addr)}`
        : `geo:0,0?q=${encodeURIComponent(addr)}`;
    Linking.openURL(url);
  };

  // ── Status colors ─────────────────────────────────────────────────────────
  const STATUS_COLORS: Record<string, { text: string; bg: string }> = {
    DRAFT: { text: '#434654', bg: '#e1e2ec' },
    SENT: { text: '#0040a2', bg: '#dae2ff' },
    PARTIALLY_PAID: { text: '#7b2600', bg: '#ffdbcf' },
    PAID: { text: '#1a6b3c', bg: '#d4f4e3' },
    OVERDUE: { text: '#ba1a1a', bg: '#ffdad6' },
    VOID: { text: '#434654', bg: '#ededf8' },
    ACCEPTED: { text: '#1a6b3c', bg: '#d4f4e3' },
    REJECTED: { text: '#ba1a1a', bg: '#ffdad6' },
    EXPIRED: { text: '#434654', bg: '#ededf8' },
  };

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

  if (isError || !customer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={ERROR} />
          <Text style={{ fontSize: 16, color: ON_SURF, marginTop: 12, textAlign: 'center' }}>
            Could not load customer
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={{
              marginTop: 16,
              backgroundColor: PRIMARY,
              paddingHorizontal: 24,
              paddingVertical: 10,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const avatar = getAvatarColor(customer.id);
  const initials = getInitials(customer.displayName);

  // ── Aging bar data ────────────────────────────────────────────────────────
  const agingTotal = customerAging?.total ?? 0;
  const agingBuckets =
    agingTotal > 0 && customerAging
      ? [
          { key: 'current', pct: customerAging.current / agingTotal, color: PRIMARY },
          { key: 'd1to30', pct: customerAging.days1to30 / agingTotal, color: '#b2c5ff' },
          { key: 'd31to60', pct: customerAging.days31to60 / agingTotal, color: '#a33500' },
          { key: 'd61to90', pct: customerAging.days61to90 / agingTotal, color: ERROR },
          { key: 'd91plus', pct: customerAging.days91plus / agingTotal, color: '#93000a' },
        ]
      : null;

  // ─── Main render ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
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
          <MaterialCommunityIcons name="arrow-left" size={24} color={PRIMARY} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '700', color: PRIMARY }}>Customer Details</Text>
        <TouchableOpacity
          onPress={handleMoreMenu}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          disabled={mutating}
        >
          {mutating ? (
            <ActivityIndicator size="small" color={PRIMARY} />
          ) : (
            <MaterialCommunityIcons name="dots-vertical" size={22} color={ON_VAR} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
        }
      >
        {/* Hero */}
        <View
          style={{
            alignItems: 'center',
            paddingTop: 28,
            paddingBottom: 20,
            paddingHorizontal: 16,
            backgroundColor: BG,
          }}
        >
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: avatar.bg,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 36, fontWeight: '700', color: avatar.text }}>{initials}</Text>
          </View>

          <Text
            style={{
              fontSize: 24,
              fontWeight: '700',
              color: ON_SURF,
              letterSpacing: -0.3,
              textAlign: 'center',
            }}
          >
            {customer.displayName}
          </Text>

          {/* Status pill */}
          <View
            style={{
              marginTop: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: customer.isActive ? 'rgba(26,107,60,0.1)' : SURF_CONT,
              borderRadius: 100,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: customer.isActive ? '#1a6b3c' : MUTED,
              }}
            />
            <Text
              style={{
                fontSize: 10,
                fontWeight: '700',
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                color: customer.isActive ? '#1a6b3c' : MUTED,
              }}
            >
              {customer.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>

          {/* Contact icons */}
          <View style={{ flexDirection: 'row', gap: 20, marginTop: 16 }}>
            {/* Call */}
            <TouchableOpacity
              onPress={handleCall}
              disabled={!customer.phone}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: customer.phone ? SEC_FIX : SURF_CONT,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons
                name="phone-outline"
                size={22}
                color={customer.phone ? ON_SEC_FIX : MUTED}
              />
            </TouchableOpacity>
            {/* Email */}
            <TouchableOpacity
              onPress={handleEmail}
              disabled={!customer.email}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: customer.email ? SEC_FIX : SURF_CONT,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons
                name="email-outline"
                size={22}
                color={customer.email ? ON_SEC_FIX : MUTED}
              />
            </TouchableOpacity>
            {/* Map */}
            <TouchableOpacity
              onPress={handleMap}
              disabled={!canOpenMap}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: canOpenMap ? SEC_FIX : SURF_CONT,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons
                name="map-outline"
                size={22}
                color={canOpenMap ? ON_SEC_FIX : MUTED}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          {/* AR Summary card */}
          <Card>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 12,
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    color: MUTED,
                    marginBottom: 4,
                  }}
                >
                  Outstanding Balance
                </Text>
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: '700',
                    color: customer.currentBalance > 0 ? ERROR : MUTED,
                    letterSpacing: -0.5,
                  }}
                >
                  {fmtCurrency(customer.currentBalance)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('InvoiceForm', { customerId: customer.id } as any)
                }
                disabled={!customer.isActive}
                style={{
                  backgroundColor: customer.isActive ? PRIMARY_C : OUTLINE_V,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>New Invoice</Text>
              </TouchableOpacity>
            </View>

            {/* Aging bar */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                color: MUTED,
                marginBottom: 6,
              }}
            >
              Aging Summary
            </Text>
            <View
              style={{
                height: 8,
                borderRadius: 4,
                overflow: 'hidden',
                flexDirection: 'row',
                backgroundColor: SURF_CONT,
              }}
            >
              {agingBuckets ? (
                agingBuckets.map((b) => (
                  <View key={b.key} style={{ flex: b.pct, backgroundColor: b.color }} />
                ))
              ) : (
                <View style={{ flex: 1, backgroundColor: OUTLINE_V + '50' }} />
              )}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              {['Current', '1-30', '31-60', '61-90', '90+'].map((l) => (
                <Text key={l} style={{ fontSize: 10, color: MUTED }}>
                  {l}
                </Text>
              ))}
            </View>
          </Card>

          {/* Tab bar */}
          <View
            style={{
              flexDirection: 'row',
              borderBottomWidth: 1,
              borderBottomColor: OUTLINE_V,
              marginBottom: 12,
            }}
          >
            {(['overview', 'invoices', 'estimates', 'activity'] as TabKey[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderBottomWidth: 2,
                  borderBottomColor: activeTab === tab ? PRIMARY : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: activeTab === tab ? '600' : '400',
                    color: activeTab === tab ? PRIMARY : MUTED,
                    textTransform: 'capitalize',
                  }}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Overview tab ─────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <>
              {/* Contact Info */}
              <Card>
                <Text style={{ fontSize: 18, fontWeight: '600', color: ON_SURF, marginBottom: 8 }}>
                  Contact Info
                </Text>
                {customer.email && (
                  <InfoRow
                    icon="email-outline"
                    label="Email"
                    value={customer.email}
                    onPress={handleEmail}
                  />
                )}
                {customer.phone && (
                  <InfoRow
                    icon="phone-outline"
                    label="Phone"
                    value={customer.phone}
                    onPress={handleCall}
                  />
                )}
                {customer.mobile && (
                  <InfoRow icon="cellphone" label="Mobile" value={customer.mobile} />
                )}
                {customer.website && (
                  <InfoRow
                    icon="web"
                    label="Website"
                    value={customer.website}
                    onPress={() => Linking.openURL(customer.website!)}
                  />
                )}
                {!customer.email && !customer.phone && !customer.mobile && !customer.website && (
                  <Text style={{ fontSize: 14, color: MUTED }}>No contact info</Text>
                )}
              </Card>

              {/* Billing Details */}
              <Card>
                <Text style={{ fontSize: 18, fontWeight: '600', color: ON_SURF, marginBottom: 8 }}>
                  Billing Details
                </Text>
                {formatAddress(customer.billingAddress) && (
                  <InfoRow
                    icon="map-marker-outline"
                    label="Billing Address"
                    value={formatAddress(customer.billingAddress)!}
                    onPress={canOpenMap ? handleMap : undefined}
                  />
                )}
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                  {customer.paymentTerms && (
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          letterSpacing: 0.6,
                          textTransform: 'uppercase',
                          color: MUTED,
                          marginBottom: 2,
                        }}
                      >
                        Payment Terms
                      </Text>
                      <Text style={{ fontSize: 14, color: ON_SURF }}>{customer.paymentTerms}</Text>
                    </View>
                  )}
                  {customer.preferredCurrency && (
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          letterSpacing: 0.6,
                          textTransform: 'uppercase',
                          color: MUTED,
                          marginBottom: 2,
                        }}
                      >
                        Currency
                      </Text>
                      <Text style={{ fontSize: 14, color: ON_SURF }}>
                        {customer.preferredCurrency}
                      </Text>
                    </View>
                  )}
                </View>
                {customer.notes && (
                  <View
                    style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTopWidth: 1,
                      borderTopColor: OUTLINE_V + '40',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        letterSpacing: 0.6,
                        textTransform: 'uppercase',
                        color: MUTED,
                        marginBottom: 4,
                      }}
                    >
                      Notes
                    </Text>
                    <Text style={{ fontSize: 14, color: ON_SURF, lineHeight: 20 }}>
                      {customer.notes}
                    </Text>
                  </View>
                )}
              </Card>

              {/* Edit button */}
              {canEdit && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('CustomerForm', { id })}
                  activeOpacity={0.75}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    backgroundColor: SEC_CONT,
                    borderRadius: 14,
                    paddingVertical: 14,
                    marginBottom: 8,
                  }}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={18} color={ON_SEC_CONT} />
                  <Text style={{ fontSize: 15, fontWeight: '600', color: ON_SEC_CONT }}>
                    Edit Customer
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* ── Invoices tab ──────────────────────────────────────────────── */}
          {activeTab === 'invoices' && (
            <View>
              {invoicesLoading && <ActivityIndicator color={PRIMARY} style={{ marginTop: 32 }} />}
              {!invoicesLoading && (!invoicesData || invoicesData.length === 0) && (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <MaterialCommunityIcons
                    name="file-document-outline"
                    size={48}
                    color={OUTLINE_V}
                  />
                  <Text style={{ fontSize: 15, color: MUTED, marginTop: 12 }}>No invoices yet</Text>
                </View>
              )}
              {(invoicesData ?? []).map((inv) => {
                const sc = STATUS_COLORS[inv.status] ?? { text: ON_VAR, bg: SURF_CONT };
                return (
                  <TouchableOpacity
                    key={inv.id}
                    onPress={() => navigation.navigate('InvoiceDetail', { id: inv.id })}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: SURFACE,
                      borderRadius: 12,
                      padding: 14,
                      marginBottom: 8,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: ON_SURF }}>
                        {inv.invoiceNumber}
                      </Text>
                      {inv.dueDate && (
                        <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                          Due {fmtDate(inv.dueDate)}
                        </Text>
                      )}
                    </View>
                    <View
                      style={{
                        backgroundColor: sc.bg,
                        borderRadius: 100,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        marginRight: 10,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: sc.text }}>
                        {inv.status}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: ON_SURF,
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {fmtCurrency(inv.totalAmount)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ── Estimates tab ─────────────────────────────────────────────── */}
          {activeTab === 'estimates' && (
            <View>
              {estimatesLoading && <ActivityIndicator color={PRIMARY} style={{ marginTop: 32 }} />}
              {!estimatesLoading && (!estimatesData || estimatesData.length === 0) && (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <MaterialCommunityIcons name="file-outline" size={48} color={OUTLINE_V} />
                  <Text style={{ fontSize: 15, color: MUTED, marginTop: 12 }}>
                    No estimates yet
                  </Text>
                </View>
              )}
              {(estimatesData ?? []).map((est) => {
                const sc = STATUS_COLORS[est.status] ?? { text: ON_VAR, bg: SURF_CONT };
                return (
                  <TouchableOpacity
                    key={est.id}
                    onPress={() => navigation.navigate('EstimateDetail', { id: est.id })}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: SURFACE,
                      borderRadius: 12,
                      padding: 14,
                      marginBottom: 8,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: ON_SURF }}>
                        {est.estimateNumber}
                      </Text>
                      {est.expiryDate && (
                        <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                          Expires {fmtDate(est.expiryDate)}
                        </Text>
                      )}
                    </View>
                    <View
                      style={{
                        backgroundColor: sc.bg,
                        borderRadius: 100,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        marginRight: 10,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: sc.text }}>
                        {est.status}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: ON_SURF,
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {fmtCurrency(est.totalAmount)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ── Activity tab ──────────────────────────────────────────────── */}
          {activeTab === 'activity' && (
            <View>
              {!canAudit && (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <MaterialCommunityIcons name="lock-outline" size={48} color={OUTLINE_V} />
                  <Text style={{ fontSize: 15, color: MUTED, marginTop: 12 }}>
                    No permission to view activity
                  </Text>
                </View>
              )}
              {canAudit && activityLoading && (
                <ActivityIndicator color={PRIMARY} style={{ marginTop: 32 }} />
              )}
              {canAudit && !activityLoading && (!activityData || activityData.length === 0) && (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <MaterialCommunityIcons name="history" size={48} color={OUTLINE_V} />
                  <Text style={{ fontSize: 15, color: MUTED, marginTop: 12 }}>No activity yet</Text>
                </View>
              )}
              {canAudit &&
                (activityData ?? []).map((entry, idx) => (
                  <View key={entry.id} style={{ flexDirection: 'row', marginBottom: 16 }}>
                    <View style={{ alignItems: 'center', marginRight: 12 }}>
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: PRIMARY,
                          marginTop: 4,
                        }}
                      />
                      {idx < (activityData?.length ?? 0) - 1 && (
                        <View
                          style={{
                            width: 2,
                            flex: 1,
                            backgroundColor: OUTLINE_V + '60',
                            marginTop: 4,
                          }}
                        />
                      )}
                    </View>
                    <View style={{ flex: 1, paddingBottom: 4 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: ON_SURF }}>
                        {entry.action}
                      </Text>
                      {entry.description && (
                        <Text style={{ fontSize: 13, color: ON_VAR, marginTop: 2 }}>
                          {entry.description}
                        </Text>
                      )}
                      <Text style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>
                        {entry.actorName ? `${entry.actorName} · ` : ''}
                        {fmtDate(entry.createdAt)}
                      </Text>
                    </View>
                  </View>
                ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
