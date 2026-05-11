import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { SalesStackParamList, RootStackParamList } from '@common/types';
import { API_ENDPOINTS } from '@common/constants';
import { apiService } from '@common/services/api.service';
import { getApiErrorMessage } from '@common/utils/apiError';
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

const STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  DRAFT: { text: '#434654', bg: '#e1e2ec' },
  SENT: { text: '#0040a2', bg: '#dae2ff' },
  PARTIALLY_PAID: { text: '#7b2600', bg: '#ffdbcf' },
  PAID: { text: '#1a6b3c', bg: '#d4f4e3' },
  OVERDUE: { text: '#ba1a1a', bg: '#ffdad6' },
  VOID: { text: '#434654', bg: '#ededf8' },
};

type Segment = 'All' | 'Unpaid' | 'Overdue' | 'Paid' | 'Draft';
type Nav = NativeStackNavigationProp<SalesStackParamList & RootStackParamList>;

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  referenceNumber?: string;
  customer: { id: string; displayName: string; email?: string };
  invoiceDate: string;
  dueDate?: string;
  totalAmount: number;
  amountDue: number;
  amountPaid: number;
  currencyCode: string;
  status: string;
  isRecurring: boolean;
  sentAt?: string;
  paidAt?: string;
  createdAt: string;
}

interface InvoiceSummary {
  draft: { count: number };
  sent: { count: number };
  partiallyPaid: { count: number };
  paid: { count: number; amount: number };
  overdue: { count: number; amount: number };
  void: { count: number };
  totals: { totalInvoiced: number; totalUnpaid: number; totalPaid: number };
}

function formatCurrency(amount: number, code = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

function formatRelativeDate(dateStr?: string): { text: string; danger: boolean } {
  if (!dateStr) return { text: '', danger: false };
  const due = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.round((due.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0) return { text: `Overdue ${Math.abs(diffDays)}d`, danger: true };
  if (diffDays === 0) return { text: 'Due today', danger: true };
  if (diffDays <= 7) return { text: `Due in ${diffDays}d`, danger: false };
  return {
    text: `Due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    danger: false,
  };
}

function customerInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function hashColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#003d9b', '#1a6b3c', '#7b2600', '#5c1a8a', '#0c5e6b'];
  return colors[Math.abs(hash) % colors.length];
}

// ─── Invoice Row ──────────────────────────────────────────────────────────────

function InvoiceRow({ item, onPress }: { item: InvoiceItem; onPress: () => void }) {
  const statusColors = STATUS_COLORS[item.status] ?? STATUS_COLORS.DRAFT;
  const dueInfo = formatRelativeDate(item.dueDate);
  const initials = customerInitials(item.customer.displayName);
  const avatarColor = hashColor(item.customer.id);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: SURFACE,
        borderBottomWidth: 1,
        borderBottomColor: OUTLINE_V + '40',
      }}
    >
      {/* Avatar */}
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: avatarColor + '22',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '700', color: avatarColor }}>{initials}</Text>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: ON_SURF }}>
            {item.invoiceNumber}
          </Text>
          {item.isRecurring && <MaterialCommunityIcons name="refresh" size={13} color={MUTED} />}
        </View>
        <Text style={{ fontSize: 13, color: ON_VAR, marginBottom: 2 }} numberOfLines={1}>
          {item.customer.displayName}
        </Text>
        {dueInfo.text ? (
          <Text style={{ fontSize: 12, color: dueInfo.danger ? ERROR : MUTED }}>
            {dueInfo.text}
          </Text>
        ) : null}
      </View>

      {/* Amount + Status */}
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: ON_SURF, marginBottom: 5 }}>
          {formatCurrency(item.totalAmount, item.currencyCode)}
        </Text>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 12,
            backgroundColor: statusColors.bg,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '600', color: statusColors.text }}>
            {item.status.replace('_', ' ')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: SURFACE,
        borderBottomWidth: 1,
        borderBottomColor: OUTLINE_V + '40',
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: '#e1e2ec',
          marginRight: 12,
        }}
      />
      <View style={{ flex: 1 }}>
        <View
          style={{
            height: 14,
            width: 100,
            backgroundColor: '#e1e2ec',
            borderRadius: 4,
            marginBottom: 6,
          }}
        />
        <View
          style={{
            height: 12,
            width: 140,
            backgroundColor: '#e1e2ec',
            borderRadius: 4,
            marginBottom: 4,
          }}
        />
        <View style={{ height: 11, width: 80, backgroundColor: '#e1e2ec', borderRadius: 4 }} />
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <View
          style={{
            height: 16,
            width: 70,
            backgroundColor: '#e1e2ec',
            borderRadius: 4,
            marginBottom: 6,
          }}
        />
        <View style={{ height: 20, width: 50, backgroundColor: '#e1e2ec', borderRadius: 10 }} />
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function InvoiceListScreen() {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [segment, setSegment] = useState<Segment>('All');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<InvoiceItem[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canCreate = hasPermission('invoice:create');
  const canSend = hasPermission('invoice:send');
  const canVoid = hasPermission('invoice:void');

  // Segment → status param
  function segmentToStatus(seg: Segment): string | null {
    switch (seg) {
      case 'Overdue':
        return 'OVERDUE';
      case 'Paid':
        return 'PAID';
      case 'Draft':
        return 'DRAFT';
      default:
        return null;
    }
  }

  // Summary
  const { data: summary } = useQuery<InvoiceSummary>({
    queryKey: ['invoices', 'summary'],
    queryFn: async () => {
      const res = await apiService.get<any>(API_ENDPOINTS.INVOICES.SUMMARY);
      return (res.data as any).data ?? res.data;
    },
    staleTime: 60 * 1000,
  });

  // List fetch
  const {
    data: listData,
    isLoading,
    isFetching,
  } = useQuery<{
    items: InvoiceItem[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }>({
    queryKey: ['invoices', 'list', { segment, search: debouncedSearch, page }],
    queryFn: async () => {
      if (segment === 'Unpaid') {
        // 3 parallel requests merged
        const statuses = ['SENT', 'PARTIALLY_PAID', 'OVERDUE'];
        const results = await Promise.all(
          statuses.map((s) =>
            apiService.get<any>(API_ENDPOINTS.INVOICES.LIST, {
              params: { status: s, search: debouncedSearch || undefined, page, limit: 20 },
            }),
          ),
        );
        const extracted = results.map((r) => {
          const d = (r.data as any).data ?? r.data;
          if (Array.isArray(d)) return { items: d, pagination: { total: d.length } };
          return { items: d.items ?? d.data ?? [], pagination: d.pagination ?? { total: 0 } };
        });
        const merged = extracted.flatMap((e) => e.items);
        merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const total = extracted.reduce((acc, e) => acc + (e.pagination?.total ?? 0), 0);
        return { items: merged, pagination: { total, page: 1, limit: 60, totalPages: 1 } };
      }
      const status = segmentToStatus(segment);
      const res = await apiService.get<any>(API_ENDPOINTS.INVOICES.LIST, {
        params: {
          status: status ?? undefined,
          search: debouncedSearch || undefined,
          page,
          limit: 20,
        },
      });
      const d = (res.data as any).data ?? res.data;
      // handle both { items, pagination } and flat array shapes
      if (Array.isArray(d)) {
        return {
          items: d,
          pagination: { total: d.length, page: 1, limit: d.length, totalPages: 1 },
        };
      }
      return {
        items: d.items ?? d.data ?? [],
        pagination: d.pagination ?? { total: 0, page: 1, limit: 20, totalPages: 1 },
      };
    },
    staleTime: 30 * 1000,
  });

  // Update allItems on listData change
  React.useEffect(() => {
    if (!listData) return;
    if (page === 1) {
      setAllItems(listData.items ?? []); // eslint-disable-line react-hooks/set-state-in-effect
    } else {
      setAllItems((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        const newItems = (listData.items ?? []).filter((i) => !existingIds.has(i.id));
        return [...prev, ...newItems];
      });
    }
    setHasMore(page < (listData.pagination?.totalPages ?? 1));
    setLoadingMore(false);
  }, [listData, page]);

  // Search debounce
  function handleSearchChange(text: string) {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(text);
      setPage(1);
    }, 300);
  }

  function handleSegmentChange(seg: Segment) {
    setSegment(seg);
    setPage(1);
    setAllItems([]);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    setAllItems([]);
    await queryClient.invalidateQueries({ queryKey: ['invoices'] });
    setRefreshing(false);
  }, [queryClient]);

  function loadMore() {
    if (loadingMore || !hasMore || isFetching) return;
    setLoadingMore(true);
    setPage((p) => p + 1);
  }

  async function handleSend(item: InvoiceItem) {
    if (!item.customer.email) {
      Alert.alert(
        'No email on file',
        `No email on file for ${item.customer.displayName}. Add an email on the web app first.`,
      );
      return;
    }
    Alert.alert('Send Invoice', `Send ${item.invoiceNumber} to ${item.customer.email}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: async () => {
          try {
            await apiService.post(API_ENDPOINTS.INVOICES.SEND(item.id));
            queryClient.invalidateQueries({ queryKey: ['invoices', 'list'] });
            queryClient.invalidateQueries({ queryKey: ['invoices', 'summary'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          } catch (e) {
            Alert.alert('Error', getApiErrorMessage(e));
          }
        },
      },
    ]);
  }

  async function handleVoid(item: InvoiceItem) {
    Alert.alert('Void Invoice', `Void invoice ${item.invoiceNumber}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Void',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiService.post(API_ENDPOINTS.INVOICES.VOID(item.id), {});
            queryClient.invalidateQueries({ queryKey: ['invoices', 'list'] });
            queryClient.invalidateQueries({ queryKey: ['invoices', 'summary'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          } catch (e) {
            Alert.alert('Error', getApiErrorMessage(e));
          }
        },
      },
    ]);
  }

  // Header summary values
  const activeCount = summary
    ? (summary.draft?.count ?? 0) +
      (summary.sent?.count ?? 0) +
      (summary.partiallyPaid?.count ?? 0) +
      (summary.overdue?.count ?? 0)
    : 0;
  const outstandingAmount = summary?.totals?.totalUnpaid ?? 0;
  const outstandingCurrency = formatCurrency(outstandingAmount);

  const SEGMENTS: Segment[] = ['All', 'Unpaid', 'Overdue', 'Paid', 'Draft'];

  function renderItem({ item }: { item: InvoiceItem }) {
    return (
      <InvoiceRow
        item={item}
        onPress={() => navigation.navigate('InvoiceDetail', { id: item.id })}
      />
    );
  }

  function renderEmpty() {
    if (isLoading) return null;
    const msgs: Record<Segment, string> = {
      All: 'No invoices yet',
      Unpaid: 'No unpaid invoices',
      Overdue: 'No overdue invoices · Nice work!',
      Paid: 'No paid invoices yet',
      Draft: 'No draft invoices',
    };
    return (
      <View style={{ alignItems: 'center', paddingTop: 64, paddingHorizontal: 32 }}>
        <MaterialCommunityIcons name="file-document-outline" size={56} color={OUTLINE_V} />
        <Text
          style={{
            fontSize: 17,
            fontWeight: '600',
            color: ON_SURF,
            marginTop: 16,
            textAlign: 'center',
          }}
        >
          {msgs[segment]}
        </Text>
        {segment === 'All' && canCreate && (
          <TouchableOpacity
            onPress={() => navigation.navigate('InvoiceForm', {})}
            style={{
              marginTop: 20,
              paddingHorizontal: 24,
              paddingVertical: 12,
              backgroundColor: PRIMARY,
              borderRadius: 24,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Create Invoice</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function renderFooter() {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator color={PRIMARY} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View>
            <Text style={{ fontSize: 28, fontWeight: '800', color: ON_SURF }}>Invoices</Text>
            {summary && (
              <Text style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>
                {activeCount} invoices · {outstandingCurrency} outstanding
              </Text>
            )}
          </View>
        </View>

        {/* Search + Filter */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 10 }}>
          <View
            style={{
              flex: 1,
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
              placeholder="Search invoices..."
              placeholderTextColor={MUTED}
              value={search}
              onChangeText={handleSearchChange}
              style={{ flex: 1, marginLeft: 8, fontSize: 14, color: ON_SURF }}
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearch('');
                  setDebouncedSearch('');
                  setPage(1);
                }}
              >
                <MaterialCommunityIcons name="close-circle" size={18} color={MUTED} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('InvoiceFilter')}
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              backgroundColor: SURFACE,
              borderWidth: 1,
              borderColor: OUTLINE_V,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name="tune-variant" size={22} color={PRIMARY} />
          </TouchableOpacity>
        </View>

        {/* Segmented Control */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={SEGMENTS}
          keyExtractor={(s) => s}
          contentContainerStyle={{ paddingVertical: 12, gap: 8 }}
          renderItem={({ item: seg }) => {
            const active = segment === seg;
            return (
              <TouchableOpacity
                onPress={() => handleSegmentChange(seg)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor: active ? PRIMARY : SURFACE,
                  borderWidth: 1,
                  borderColor: active ? PRIMARY : OUTLINE_V,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : ON_VAR }}>
                  {seg}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* List */}
      {isLoading && page === 1 ? (
        <View style={{ backgroundColor: SURFACE, flex: 1 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={allItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          style={{ backgroundColor: SURFACE, flex: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
          }
        />
      )}

      {/* FAB */}
      {canCreate && (
        <TouchableOpacity
          onPress={() => navigation.navigate('InvoiceForm', {})}
          style={{
            position: 'absolute',
            bottom: 28,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: PRIMARY,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <MaterialCommunityIcons name="plus" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}
