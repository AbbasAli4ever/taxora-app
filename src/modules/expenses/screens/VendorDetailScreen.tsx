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

import { ExpensesStackParamList, RootStackParamList } from '@common/types';
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
const TER_FIXED = '#ffdbcf';
const ON_TER_FIX = '#812800';

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

type Nav = NativeStackNavigationProp<ExpensesStackParamList & RootStackParamList>;
type RouteT = RouteProp<ExpensesStackParamList, 'VendorDetail'>;
type TabKey = 'overview' | 'bills' | 'expenses' | 'activity';

// ─── Types ────────────────────────────────────────────────────────────────────
interface VendorAddress {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
}

interface Vendor {
  id: string;
  vendorType: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  fax: string | null;
  website: string | null;
  address: VendorAddress;
  taxNumber: string | null;
  businessIdNo: string | null;
  track1099: boolean;
  paymentTerms: string | null;
  preferredCurrency: string | null;
  currentBalance: number;
  openingBalance: number;
  creditLimit: number | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

interface AgingVendor {
  vendorId: string;
  vendorName: string;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days91plus: number;
  total: number;
}

interface BillItem {
  id: string;
  billNumber: string;
  status: string;
  totalAmount: number;
  dueDate: string | null;
  billDate: string;
}

interface ExpenseItem {
  id: string;
  expenseNumber?: string;
  description: string;
  status: string;
  totalAmount: number;
  expenseDate: string;
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
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
      }}
    >
      <Text style={{ fontSize: 14, color: MUTED }}>{label}</Text>
      <Text
        style={{
          fontSize: 14,
          fontWeight: '500',
          color: ON_SURF,
          flexShrink: 1,
          textAlign: 'right',
          marginLeft: 12,
        }}
      >
        {value}
      </Text>
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

function CardSection({
  title,
  icon,
  children,
  badge,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: SURFACE,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#09305a',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 1,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <MaterialCommunityIcons
          name={icon as any}
          size={20}
          color={PRIMARY}
          style={{ marginRight: 8 }}
        />
        <Text style={{ fontSize: 18, fontWeight: '600', color: ON_SURF, flex: 1 }}>{title}</Text>
        {badge}
      </View>
      {children}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export function VendorDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteT>();
  const { id } = route.params;
  const queryClient = useQueryClient();
  const canEdit = useAuthStore((s) => s.hasPermission('vendor:edit'));
  const canDelete = useAuthStore((s) => s.hasPermission('vendor:delete'));
  const canAudit = useAuthStore((s) => s.hasPermission('audit:view'));

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [mutating, setMutating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // ── Vendor detail ─────────────────────────────────────────────────────────
  const {
    data: vendor,
    isLoading,
    isError,
    refetch,
  } = useQuery<Vendor>({
    queryKey: ['vendors', 'detail', id],
    queryFn: async () => {
      const res = await apiService.get<{ data: Vendor }>(API_ENDPOINTS.VENDORS.DETAIL(id));
      return (res.data as any).data ?? res.data;
    },
    staleTime: 60 * 1000,
  });

  // ── AP aging ──────────────────────────────────────────────────────────────
  const { data: apAging } = useQuery<{ vendors: AgingVendor[] }>({
    queryKey: ['reports', 'ap-aging', { asOfDate: today }],
    queryFn: async () => {
      const res = await apiService.get<{ data: { vendors: AgingVendor[] } }>(
        API_ENDPOINTS.REPORTS.AP_AGING,
        {
          params: { asOfDate: today },
        },
      );
      return (res.data as any).data ?? res.data;
    },
    staleTime: 60 * 1000,
  });

  const vendorAging = apAging?.vendors?.find((v) => v.vendorId === id) ?? null;

  // ── Bills tab (lazy) ──────────────────────────────────────────────────────
  const { data: billsData, isLoading: billsLoading } = useQuery<BillItem[]>({
    queryKey: ['bills', 'list', { vendorId: id }],
    queryFn: async () => {
      const res = await apiService.get<{ data: any }>(API_ENDPOINTS.BILLS.LIST, {
        params: { vendorId: id, limit: 20 },
      });
      const d = (res.data as any).data ?? res.data;
      return d.items ?? d;
    },
    staleTime: 60 * 1000,
    enabled: activeTab === 'bills',
  });

  // ── Expenses tab (lazy) ───────────────────────────────────────────────────
  const { data: expensesData, isLoading: expensesLoading } = useQuery<ExpenseItem[]>({
    queryKey: ['expenses', 'list', { vendorId: id }],
    queryFn: async () => {
      const res = await apiService.get<{ data: any }>(API_ENDPOINTS.EXPENSES.LIST, {
        params: { vendorId: id, limit: 20 },
      });
      const d = (res.data as any).data ?? res.data;
      return d.items ?? d;
    },
    staleTime: 60 * 1000,
    enabled: activeTab === 'expenses',
  });

  // ── Activity tab (lazy) ───────────────────────────────────────────────────
  const { data: activityData, isLoading: activityLoading } = useQuery<AuditEntry[]>({
    queryKey: ['audit-trail', { entityType: 'VENDOR', entityId: id }],
    queryFn: async () => {
      const res = await apiService.get<{ data: AuditEntry[] }>(API_ENDPOINTS.AUDIT_TRAIL, {
        params: { entityType: 'VENDOR', entityId: id },
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
    if (activeTab === 'bills')
      await queryClient.invalidateQueries({ queryKey: ['bills', 'list', { vendorId: id }] });
    if (activeTab === 'expenses')
      await queryClient.invalidateQueries({ queryKey: ['expenses', 'list', { vendorId: id }] });
    if (activeTab === 'activity')
      await queryClient.invalidateQueries({
        queryKey: ['audit-trail', { entityType: 'VENDOR', entityId: id }],
      });
    setRefreshing(false);
  }, [refetch, activeTab, queryClient, id]);

  // ── Deactivate ────────────────────────────────────────────────────────────
  const handleDeactivate = useCallback(() => {
    Alert.alert(
      'Deactivate Vendor',
      `Are you sure you want to deactivate ${vendor?.displayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            setMutating(true);
            try {
              await apiService.delete(API_ENDPOINTS.VENDORS.DETAIL(id));
              queryClient.invalidateQueries({ queryKey: ['vendors', 'list'] });
              queryClient.invalidateQueries({ queryKey: ['vendors', 'detail', id] });
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
  }, [vendor?.displayName, id, navigation, queryClient]);

  // ── More menu ─────────────────────────────────────────────────────────────
  const handleMoreMenu = useCallback(() => {
    const opts: string[] = [];
    if (canEdit) opts.push('Edit Vendor');
    if (canDelete && vendor?.isActive) opts.push('Deactivate');
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
          if (opts[idx] === 'Edit Vendor') navigation.navigate('VendorForm', { id });
          if (opts[idx] === 'Deactivate') handleDeactivate();
        },
      );
    } else {
      Alert.alert('Options', undefined, [
        ...(canEdit
          ? [{ text: 'Edit Vendor', onPress: () => navigation.navigate('VendorForm', { id }) }]
          : []),
        ...(canDelete && vendor?.isActive
          ? [{ text: 'Deactivate', style: 'destructive' as const, onPress: handleDeactivate }]
          : []),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  }, [canEdit, canDelete, vendor, id, navigation, handleDeactivate]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fmtCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const formatAddress = (addr: VendorAddress): string | null => {
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

  const canOpenMap = !!vendor?.address?.line1 && !!vendor?.address?.city;

  const handleCall = () => vendor?.phone && Linking.openURL(`tel:${vendor.phone}`);
  const handleEmail = () => vendor?.email && Linking.openURL(`mailto:${vendor.email}`);
  const handleMap = () => {
    if (!vendor || !canOpenMap) return;
    const addr = `${vendor.address.line1}, ${vendor.address.city}`;
    const url =
      Platform.OS === 'ios'
        ? `maps:?q=${encodeURIComponent(addr)}`
        : `geo:0,0?q=${encodeURIComponent(addr)}`;
    Linking.openURL(url);
  };

  // ── Status colors ─────────────────────────────────────────────────────────
  const STATUS_COLORS: Record<string, { text: string; bg: string }> = {
    DRAFT: { text: '#434654', bg: '#e1e2ec' },
    PENDING: { text: '#0040a2', bg: '#dae2ff' },
    APPROVED: { text: '#1a6b3c', bg: '#d4f4e3' },
    PARTIALLY_PAID: { text: '#7b2600', bg: '#ffdbcf' },
    PAID: { text: '#1a6b3c', bg: '#d4f4e3' },
    OVERDUE: { text: '#ba1a1a', bg: '#ffdad6' },
    VOID: { text: '#434654', bg: '#ededf8' },
    REJECTED: { text: '#ba1a1a', bg: '#ffdad6' },
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

  if (isError || !vendor) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={ERROR} />
          <Text style={{ fontSize: 16, color: ON_SURF, marginTop: 12, textAlign: 'center' }}>
            Could not load vendor
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

  const avatar = getAvatarColor(vendor.id);
  const initials = getInitials(vendor.displayName);

  // ── Aging bar data ────────────────────────────────────────────────────────
  const agingTotal = vendorAging?.total ?? 0;
  const agingBuckets =
    agingTotal > 0 && vendorAging
      ? [
          { key: 'current', pct: vendorAging.current / agingTotal, color: PRIMARY },
          { key: 'd1to30', pct: vendorAging.days1to30 / agingTotal, color: '#b2c5ff' },
          { key: 'd31to60', pct: vendorAging.days31to60 / agingTotal, color: '#a33500' },
          { key: 'd61to90', pct: vendorAging.days61to90 / agingTotal, color: ERROR },
          { key: 'd91plus', pct: vendorAging.days91plus / agingTotal, color: '#93000a' },
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
        <Text style={{ fontSize: 17, fontWeight: '700', color: PRIMARY }}>Vendor Details</Text>
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
            {vendor.displayName}
          </Text>

          {/* Status pill */}
          <View
            style={{
              marginTop: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: vendor.isActive ? 'rgba(26,107,60,0.1)' : SURF_CONT,
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
                backgroundColor: vendor.isActive ? '#1a6b3c' : MUTED,
              }}
            />
            <Text
              style={{
                fontSize: 10,
                fontWeight: '700',
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                color: vendor.isActive ? '#1a6b3c' : MUTED,
              }}
            >
              {vendor.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>

          {/* Contact icons */}
          <View style={{ flexDirection: 'row', gap: 20, marginTop: 16 }}>
            <TouchableOpacity
              onPress={handleCall}
              disabled={!vendor.phone}
              style={{ alignItems: 'center', gap: 4 }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: vendor.phone ? SEC_FIX : SURF_CONT,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons
                  name="phone-outline"
                  size={22}
                  color={vendor.phone ? ON_SEC_FIX : MUTED}
                />
              </View>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '600',
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  color: MUTED,
                }}
              >
                Call
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleEmail}
              disabled={!vendor.email}
              style={{ alignItems: 'center', gap: 4 }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: vendor.email ? SEC_FIX : SURF_CONT,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons
                  name="email-outline"
                  size={22}
                  color={vendor.email ? ON_SEC_FIX : MUTED}
                />
              </View>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '600',
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  color: MUTED,
                }}
              >
                Email
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleMap}
              disabled={!canOpenMap}
              style={{ alignItems: 'center', gap: 4 }}
            >
              <View
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
              </View>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '600',
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  color: MUTED,
                }}
              >
                Map
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          {/* AP Summary card */}
          <View
            style={{
              backgroundColor: SURFACE,
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
              shadowColor: '#09305a',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 6,
              elevation: 1,
            }}
          >
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
                  Current Balance
                </Text>
                <Text
                  style={{ fontSize: 32, fontWeight: '700', color: MUTED, letterSpacing: -0.5 }}
                >
                  {fmtCurrency(vendor.currentBalance)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => (navigation as any).navigate('BillForm', { vendorId: vendor.id })}
                disabled={!vendor.isActive}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: vendor.isActive ? PRIMARY_C : OUTLINE_V,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                }}
              >
                <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>New Bill</Text>
              </TouchableOpacity>
            </View>

            {/* Aging bar */}
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  color: MUTED,
                }}
              >
                Aging
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  color: MUTED,
                }}
              >
                Total Outstanding
              </Text>
            </View>
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              {(vendorAging
                ? [
                    { label: 'Current', val: vendorAging.current },
                    { label: '1-30', val: vendorAging.days1to30 },
                    { label: '31-60', val: vendorAging.days31to60 },
                    { label: '61-90+', val: vendorAging.days61to90 + vendorAging.days91plus },
                  ]
                : [
                    { label: 'Current', val: 0 },
                    { label: '1-30', val: 0 },
                    { label: '31-60', val: 0 },
                    { label: '61-90+', val: 0 },
                  ]
              ).map((b) => (
                <View
                  key={b.label}
                  style={{
                    backgroundColor: SURF_CONT,
                    borderRadius: 6,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ fontSize: 10, color: ON_VAR }}>
                    {b.label}: ${(b.val / 1000).toFixed(1)}k
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Tab bar */}
          <View
            style={{
              flexDirection: 'row',
              borderBottomWidth: 1,
              borderBottomColor: OUTLINE_V,
              marginBottom: 12,
            }}
          >
            {(['overview', 'bills', 'expenses', 'activity'] as TabKey[]).map((tab) => (
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
              <CardSection title="Contact Info" icon="card-account-details-outline">
                {vendor.email && (
                  <InfoRow label="Email" value={vendor.email} onPress={handleEmail} />
                )}
                {vendor.phone && (
                  <InfoRow label="Phone" value={vendor.phone} onPress={handleCall} />
                )}
                {vendor.mobile && <InfoRow label="Mobile" value={vendor.mobile} />}
                {vendor.fax && <InfoRow label="Fax" value={vendor.fax} />}
                {vendor.website && (
                  <InfoRow
                    label="Website"
                    value={vendor.website}
                    onPress={() => Linking.openURL(vendor.website!)}
                  />
                )}
                {!vendor.email && !vendor.phone && !vendor.mobile && !vendor.website && (
                  <Text style={{ fontSize: 14, color: MUTED }}>No contact info</Text>
                )}
              </CardSection>

              {/* Address */}
              {formatAddress(vendor.address) && (
                <CardSection title="Address" icon="map-marker-outline">
                  <Text style={{ fontSize: 15, color: ON_SURF, lineHeight: 22 }}>
                    {[vendor.address.line1, vendor.address.line2].filter(Boolean).join('\n')}
                    {'\n'}
                    {[vendor.address.city, vendor.address.state, vendor.address.postalCode]
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                </CardSection>
              )}

              {/* Tax Info */}
              {(vendor.taxNumber || vendor.businessIdNo || vendor.track1099) && (
                <CardSection
                  title="Tax Info"
                  icon="file-document-outline"
                  badge={
                    vendor.track1099 ? (
                      <View
                        style={{
                          backgroundColor: TER_FIXED,
                          borderRadius: 100,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: ON_TER_FIX }}>
                          1099 Vendor
                        </Text>
                      </View>
                    ) : null
                  }
                >
                  {vendor.taxNumber && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 6,
                      }}
                    >
                      <Text style={{ fontSize: 14, color: MUTED }}>Tax Number</Text>
                      <View
                        style={{
                          backgroundColor: SURF_CONT,
                          borderRadius: 6,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '500',
                            color: ON_SURF,
                            fontVariant: ['tabular-nums'],
                          }}
                        >
                          {vendor.taxNumber}
                        </Text>
                      </View>
                    </View>
                  )}
                  {vendor.businessIdNo && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 6,
                      }}
                    >
                      <Text style={{ fontSize: 14, color: MUTED }}>Business ID</Text>
                      <View
                        style={{
                          backgroundColor: SURF_CONT,
                          borderRadius: 6,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '500',
                            color: ON_SURF,
                            fontVariant: ['tabular-nums'],
                          }}
                        >
                          {vendor.businessIdNo}
                        </Text>
                      </View>
                    </View>
                  )}
                </CardSection>
              )}

              {/* Payment Terms */}
              <CardSection title="Payment Terms" icon="cash-multiple">
                {vendor.paymentTerms && <InfoRow label="Terms" value={vendor.paymentTerms} />}
                {vendor.preferredCurrency && (
                  <InfoRow label="Currency" value={vendor.preferredCurrency} />
                )}
                {!vendor.paymentTerms && !vendor.preferredCurrency && (
                  <Text style={{ fontSize: 14, color: MUTED }}>No payment terms set</Text>
                )}
                {vendor.notes && (
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
                      {vendor.notes}
                    </Text>
                  </View>
                )}
              </CardSection>

              {/* Edit button */}
              {canEdit && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('VendorForm', { id })}
                  activeOpacity={0.75}
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: PRIMARY,
                    borderRadius: 14,
                    paddingVertical: 14,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>
                    Edit Vendor
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* ── Bills tab ─────────────────────────────────────────────────── */}
          {activeTab === 'bills' && (
            <View>
              {billsLoading && <ActivityIndicator color={PRIMARY} style={{ marginTop: 32 }} />}
              {!billsLoading && (!billsData || billsData.length === 0) && (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <MaterialCommunityIcons name="receipt" size={48} color={OUTLINE_V} />
                  <Text style={{ fontSize: 15, color: MUTED, marginTop: 12 }}>No bills yet</Text>
                </View>
              )}
              {(billsData ?? []).map((bill) => {
                const sc = STATUS_COLORS[bill.status] ?? { text: ON_VAR, bg: SURF_CONT };
                return (
                  <TouchableOpacity
                    key={bill.id}
                    onPress={() => navigation.navigate('BillDetail', { id: bill.id })}
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
                        {bill.billNumber}
                      </Text>
                      {bill.dueDate && (
                        <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                          Due {fmtDate(bill.dueDate)}
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
                        {bill.status}
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
                      {fmtCurrency(bill.totalAmount)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ── Expenses tab ──────────────────────────────────────────────── */}
          {activeTab === 'expenses' && (
            <View>
              {expensesLoading && <ActivityIndicator color={PRIMARY} style={{ marginTop: 32 }} />}
              {!expensesLoading && (!expensesData || expensesData.length === 0) && (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <MaterialCommunityIcons name="cash-remove" size={48} color={OUTLINE_V} />
                  <Text style={{ fontSize: 15, color: MUTED, marginTop: 12 }}>No expenses yet</Text>
                </View>
              )}
              {(expensesData ?? []).map((exp) => {
                const sc = STATUS_COLORS[exp.status] ?? { text: ON_VAR, bg: SURF_CONT };
                return (
                  <TouchableOpacity
                    key={exp.id}
                    onPress={() => navigation.navigate('ExpenseDetail', { id: exp.id })}
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
                      <Text
                        style={{ fontSize: 14, fontWeight: '600', color: ON_SURF }}
                        numberOfLines={1}
                      >
                        {exp.description || exp.expenseNumber || 'Expense'}
                      </Text>
                      <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                        {fmtDate(exp.expenseDate)}
                      </Text>
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
                        {exp.status}
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
                      {fmtCurrency(exp.totalAmount)}
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
