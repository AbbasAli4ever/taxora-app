import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LineChart } from 'react-native-gifted-charts';

import { apiService } from '@common/services/api.service';
import { API_ENDPOINTS } from '@common/constants';
import { useAuthStore } from '@modules/auth/store';
import { HomeStackParamList, RootStackParamList } from '@common/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type Nav = NativeStackNavigationProp<HomeStackParamList & RootStackParamList>;

// Backend-supported period values only
type Period =
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'last_quarter', label: 'Last Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'last_year', label: 'Last Year' },
];

interface ChangeMetric {
  current: number;
  previous: number;
  changeAmount: number;
  changePercent: number | null;
  changeDirection: 'up' | 'down' | 'flat' | 'new';
}

interface FinancialOverview {
  period: { start: string; end: string };
  revenue: ChangeMetric;
  expenses: ChangeMetric;
  netIncome: ChangeMetric;
  cashBalance: number;
  totalAR: number;
  totalAP: number;
}

interface DailyFlowPoint {
  date: string;
  inflow: number;
  outflow: number;
}

interface CashFlowData {
  bankAccounts: Array<{
    accountId: string;
    name: string;
    institution: string | null;
    last4: string | null;
    currentBalance: number;
  }>;
  totalCashBalance: number;
  last30Days: { totalInflow: number; totalOutflow: number; netCashFlow: number };
  dailyFlow: DailyFlowPoint[];
}

interface RevExpPoint {
  date: string;
  label: string;
  revenue: number;
  expenses: number;
}

interface RevExpTrend {
  granularity: 'daily' | 'weekly' | 'monthly';
  data: RevExpPoint[];
}

interface AgingTotals {
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days91plus: number;
  total: number;
}

interface ActivityItem {
  id: string;
  type: 'INVOICE' | 'BILL' | 'EXPENSE' | 'JOURNAL_ENTRY' | 'PAYMENT';
  label: string;
  description: string;
  status: string;
  amount: number;
  occurredAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIMARY = '#003d9b';
const SURFACE = '#faf8ff';

const SURFACE_CARD = '#ffffff';
const ON_SURFACE = '#191b23';
const ON_SURFACE_V = '#434654';
const OUTLINE_V = '#c3c6d6';
const ERROR = '#ba1a1a';
const ERROR_BG = '#ffdad6';
const SUCCESS = '#059669';
const MUTED = '#737685';
const SCREEN_W = Dimensions.get('window').width;
const CARD_W = SCREEN_W - 64;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value ?? 0);
}

function formatAmount(amount: number): string {
  const sign = amount >= 0 ? '+' : '-';
  return `${sign}${new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Math.abs(amount ?? 0))}`;
}

function periodLabel(p: Period): string {
  return PERIOD_OPTIONS.find((o) => o.value === p)?.label ?? p;
}

function activityIcon(type: string): React.ComponentProps<typeof MaterialCommunityIcons>['name'] {
  const map: Record<string, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
    INVOICE: 'file-document-outline',
    BILL: 'receipt',
    EXPENSE: 'cash-minus',
    PAYMENT: 'cash-check',
    JOURNAL_ENTRY: 'book-open-outline',
  };
  return map[type] ?? 'circle-outline';
}

function activityIconBg(type: string): { bg: string; color: string } {
  const map: Record<string, { bg: string; color: string }> = {
    INVOICE: { bg: '#dbeafe', color: PRIMARY },
    BILL: { bg: '#fef3c7', color: '#92400e' },
    EXPENSE: { bg: ERROR_BG, color: ERROR },
    PAYMENT: { bg: '#d1fae5', color: SUCCESS },
  };
  return map[type] ?? { bg: '#f1f5f9', color: ON_SURFACE_V };
}

function statusBadge(status: string): { bg: string; text: string } {
  const s = (status ?? '').toUpperCase();
  if (s === 'PENDING' || s === 'DRAFT') return { bg: ERROR_BG, text: ERROR };
  if (s === 'PAID' || s === 'CLEARED') return { bg: '#d1fae5', text: SUCCESS };
  if (s === 'SENT' || s === 'OPEN') return { bg: '#dbeafe', text: PRIMARY };
  return { bg: '#e1e2ec', text: MUTED };
}

// ─── Empty fallbacks ──────────────────────────────────────────────────────────

const EMPTY_KPI: FinancialOverview = {
  period: { start: '', end: '' },
  revenue: {
    current: 0,
    previous: 0,
    changeAmount: 0,
    changePercent: null,
    changeDirection: 'flat',
  },
  expenses: {
    current: 0,
    previous: 0,
    changeAmount: 0,
    changePercent: null,
    changeDirection: 'flat',
  },
  netIncome: {
    current: 0,
    previous: 0,
    changeAmount: 0,
    changePercent: null,
    changeDirection: 'flat',
  },
  cashBalance: 0,
  totalAR: 0,
  totalAP: 0,
};

const EMPTY_CASH_FLOW: CashFlowData = {
  bankAccounts: [],
  totalCashBalance: 0,
  last30Days: { totalInflow: 0, totalOutflow: 0, netCashFlow: 0 },
  dailyFlow: [],
};

const EMPTY_AGING: AgingTotals = {
  current: 0,
  days1to30: 0,
  days31to60: 0,
  days61to90: 0,
  days91plus: 0,
  total: 0,
};

// ─── API Hooks — ALL keyed on period ─────────────────────────────────────────

function useFinancialOverview(period: Period) {
  return useQuery<FinancialOverview>({
    queryKey: ['dashboard', 'financial-overview', period],
    queryFn: async () => {
      const res = await apiService.get(
        `${API_ENDPOINTS.DASHBOARD.FINANCIAL_OVERVIEW}?period=${period}`,
      );
      return (res.data as any) ?? EMPTY_KPI;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    placeholderData: () => EMPTY_KPI,
  });
}

function useCashFlow(period: Period) {
  return useQuery<CashFlowData>({
    queryKey: ['dashboard', 'cash-flow-overview', period],
    queryFn: async () => {
      const res = await apiService.get(
        `${API_ENDPOINTS.DASHBOARD.CASH_FLOW_OVERVIEW}?period=${period}`,
      );
      const d = res.data as any;
      // Normalise: backend may return dailyFlow or series
      if (d && !d.dailyFlow && d.series) d.dailyFlow = d.series;
      return d ?? EMPTY_CASH_FLOW;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    placeholderData: () => EMPTY_CASH_FLOW,
  });
}

function useRevExpTrend(period: Period) {
  return useQuery<RevExpTrend>({
    queryKey: ['dashboard', 'revenue-expense-trend', period],
    queryFn: async () => {
      const res = await apiService.get(`/dashboard/revenue-expense-trend?period=${period}`);
      return (res.data as any) ?? { granularity: 'daily' as const, data: [] };
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    placeholderData: () => ({ granularity: 'daily' as const, data: [] }),
  });
}

function useArAging() {
  const today = new Date().toISOString().slice(0, 10);
  return useQuery<AgingTotals>({
    queryKey: ['reports', 'ar-aging'],
    queryFn: async () => {
      const res = await apiService.get(`${API_ENDPOINTS.REPORTS.AR_AGING}?asOfDate=${today}`);
      return (res.data as any)?.totals ?? EMPTY_AGING;
    },
    staleTime: 300_000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    placeholderData: () => EMPTY_AGING,
  });
}

function useApAging() {
  const today = new Date().toISOString().slice(0, 10);
  return useQuery<AgingTotals>({
    queryKey: ['reports', 'ap-aging'],
    queryFn: async () => {
      const res = await apiService.get(`${API_ENDPOINTS.REPORTS.AP_AGING}?asOfDate=${today}`);
      return (res.data as any)?.totals ?? EMPTY_AGING;
    },
    staleTime: 300_000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    placeholderData: () => EMPTY_AGING,
  });
}

function useRecentActivity() {
  return useQuery<ActivityItem[]>({
    queryKey: ['dashboard', 'recent-activity'],
    queryFn: async () => {
      const res = await apiService.get(`${API_ENDPOINTS.DASHBOARD.RECENT_ACTIVITY}?limit=20`);
      const d = res.data as any;
      return Array.isArray(d?.activities) ? d.activities : [];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    placeholderData: () => [],
  });
}

function useUnreadCount() {
  return useQuery<number>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      try {
        const res = await apiService.get('/notifications/unread-count');
        return (res.data as any)?.unreadCount ?? 0;
      } catch {
        return 0;
      }
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    placeholderData: () => 0,
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonBox({ w, h, radius = 8 }: { w: number; h: number; radius?: number }) {
  return <View style={{ width: w, height: h, borderRadius: radius, backgroundColor: '#e1e2ec' }} />;
}

function KPICardSkeleton() {
  return (
    <View
      style={{
        width: CARD_W,
        backgroundColor: SURFACE_CARD,
        borderRadius: 16,
        padding: 16,
        marginRight: 12,
        borderWidth: 1,
        borderColor: OUTLINE_V + '30',
        gap: 12,
        shadowColor: '#09305a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <SkeletonBox w={100} h={12} />
        <SkeletonBox w={28} h={28} radius={8} />
      </View>
      <SkeletonBox w={160} h={32} radius={6} />
      <SkeletonBox w={120} h={20} radius={10} />
      <View style={{ flexDirection: 'row', gap: 4, alignItems: 'flex-end', height: 40 }}>
        {[0.4, 0.6, 0.35, 0.75, 1].map((v, i) => (
          <View
            key={i}
            style={{ flex: 1, height: 40 * v, backgroundColor: '#e1e2ec', borderRadius: 3 }}
          />
        ))}
      </View>
    </View>
  );
}

interface KPICardProps {
  label: string;
  value: number;
  deltaPct?: number | null;
  deltaDir?: 'up' | 'down' | 'flat' | 'new';
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconColor: string;
  iconBg: string;
  sparkBars?: number[];
}

function KPICard({
  label,
  value,
  deltaPct,
  deltaDir,
  icon,
  iconColor,
  iconBg,
  sparkBars,
}: KPICardProps) {
  const hasDelta = deltaPct != null && deltaDir !== 'flat' && deltaDir !== 'new';
  const positive = deltaDir === 'up';
  const bars = sparkBars ?? [0.4, 0.6, 0.35, 0.75, 1.0];
  const maxBar = Math.max(...bars, 0.01);

  return (
    <View
      style={{
        width: CARD_W,
        backgroundColor: SURFACE_CARD,
        borderRadius: 16,
        padding: 16,
        marginRight: 12,
        borderWidth: 1,
        borderColor: OUTLINE_V + '30',
        gap: 10,
        shadowColor: '#09305a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
        elevation: 3,
      }}
    >
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: MUTED,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: iconBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
        </View>
      </View>
      <Text style={{ fontSize: 28, fontWeight: '700', color: ON_SURFACE, letterSpacing: -0.5 }}>
        {formatCurrency(value)}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {hasDelta ? (
          <>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 999,
                backgroundColor: (positive ? PRIMARY : ERROR) + '15',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: positive ? PRIMARY : ERROR }}>
                {positive ? '+' : ''}
                {deltaPct!.toFixed(1)}%
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: MUTED }}>vs previous</Text>
          </>
        ) : (
          <Text style={{ fontSize: 12, color: MUTED }}>No comparison data</Text>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 40, gap: 4 }}>
        {bars.map((v, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: (v / maxBar) * 40,
              backgroundColor: i === bars.length - 1 ? PRIMARY : PRIMARY + '30',
              borderRadius: 3,
            }}
          />
        ))}
      </View>
    </View>
  );
}

function AgingMiniBar({ label, totals }: { label: string; totals: AgingTotals }) {
  const buckets = [
    { key: 'current', display: 'Current', value: totals.current, color: SUCCESS },
    { key: 'days1to30', display: '1–30', value: totals.days1to30, color: '#f59e0b' },
    { key: 'days31to60', display: '31–60', value: totals.days31to60, color: '#f97316' },
    { key: 'days91plus', display: '90+', value: totals.days91plus, color: ERROR },
  ];
  const total = totals.total || 1;
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: SURFACE_CARD,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: OUTLINE_V + '30',
        shadowColor: '#09305a',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 1,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: MUTED,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 18, fontWeight: '700', color: ON_SURFACE, marginBottom: 10 }}>
        {formatCurrency(totals.total)}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          height: 6,
          borderRadius: 3,
          overflow: 'hidden',
          marginBottom: 10,
        }}
      >
        {buckets.map((b) => (
          <View key={b.key} style={{ flex: b.value / total, backgroundColor: b.color }} />
        ))}
      </View>
      {buckets.map((b) => (
        <View
          key={b.key}
          style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: b.color }} />
            <Text style={{ fontSize: 11, color: ON_SURFACE_V }}>{b.display}</Text>
          </View>
          <Text style={{ fontSize: 11, fontWeight: '600', color: ON_SURFACE }}>
            {formatCurrency(b.value)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function QuickActionTile({
  icon,
  label,
  iconBg,
  iconColor,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  iconBg: string;
  iconColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flex: 1,
        backgroundColor: SURFACE_CARD,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: OUTLINE_V + '20',
        minHeight: 100,
        shadowColor: '#09305a',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 1,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          backgroundColor: iconBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialCommunityIcons name={icon} size={24} color={iconColor} />
      </View>
      <Text style={{ fontSize: 13, fontWeight: '600', color: ON_SURFACE, textAlign: 'center' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const icon = activityIcon(item.type);
  const { bg, color } = activityIconBg(item.type);
  const { bg: badgeBg, text: badgeText } = statusBadge(item.status);
  const isPositive = item.type === 'INVOICE' || item.type === 'PAYMENT';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 9999,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: ON_SURFACE }} numberOfLines={1}>
          {item.label}
        </Text>
        <Text style={{ fontSize: 12, color: ON_SURFACE_V }} numberOfLines={1}>
          {item.description}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: isPositive ? PRIMARY : ON_SURFACE }}>
          {formatAmount(isPositive ? Math.abs(item.amount) : -Math.abs(item.amount))}
        </Text>
        <View
          style={{
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
            backgroundColor: badgeBg,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: badgeText, letterSpacing: 0.5 }}>
            {(item.status ?? '').toUpperCase()}
          </Text>
        </View>
      </View>
    </View>
  );
}

function ActivitySkeleton() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    >
      <SkeletonBox w={40} h={40} radius={999} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBox w={140} h={12} />
        <SkeletonBox w={90} h={10} />
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <SkeletonBox w={80} h={12} />
        <SkeletonBox w={50} h={16} radius={4} />
      </View>
    </View>
  );
}

// ─── Period Dropdown ──────────────────────────────────────────────────────────

function PeriodDropdown({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.75}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          backgroundColor: PRIMARY + '12',
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderWidth: 1,
          borderColor: PRIMARY + '30',
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '700', color: PRIMARY }}>
          {periodLabel(value)}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={16} color={PRIMARY} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View
            style={{
              position: 'absolute',
              top: 140,
              right: 20,
              backgroundColor: SURFACE_CARD,
              borderRadius: 14,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 12,
              overflow: 'hidden',
              minWidth: 180,
            }}
          >
            {PERIOD_OPTIONS.map((opt, idx) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  backgroundColor: value === opt.value ? PRIMARY + '10' : 'transparent',
                  borderBottomWidth: idx < PERIOD_OPTIONS.length - 1 ? 1 : 0,
                  borderBottomColor: '#f1f5f9',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: value === opt.value ? '700' : '400',
                    color: value === opt.value ? PRIMARY : ON_SURFACE,
                  }}
                >
                  {opt.label}
                </Text>
                {value === opt.value && (
                  <MaterialCommunityIcons name="check" size={16} color={PRIMARY} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const company = useAuthStore((s) => s.company);
  const queryClient = useQueryClient();

  const [period, setPeriod] = useState<Period>('this_month');
  const [refreshing, setRefreshing] = useState(false);

  // All queries use the same period
  const { data: kpi, isLoading: kpiLoading } = useFinancialOverview(period);
  const { data: cashFlow, isLoading: chartLoading } = useCashFlow(period);
  const { data: revExp } = useRevExpTrend(period);
  const { data: arAging } = useArAging();
  const { data: apAging } = useApAging();
  const { data: activity, isLoading: actLoading } = useRecentActivity();
  const { data: unread = 0 } = useUnreadCount();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['reports'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  // Chart: use dailyFlow, compute net = inflow - outflow client-side
  const chartData = React.useMemo(() => {
    const flows = cashFlow?.dailyFlow;
    if (!Array.isArray(flows) || flows.length === 0) return [];
    return flows.map((p) => ({ value: (p.inflow ?? 0) - (p.outflow ?? 0) }));
  }, [cashFlow]);

  // Sparklines
  const cashSparkBars = React.useMemo(() => {
    const flows = cashFlow?.dailyFlow;
    if (!Array.isArray(flows) || flows.length === 0) return undefined;
    const nets = flows.map((p) => (p.inflow ?? 0) - (p.outflow ?? 0));
    const last5 = nets.slice(-5);
    const max = Math.max(...last5.map(Math.abs), 1);
    return last5.map((v) => Math.abs(v) / max);
  }, [cashFlow]);

  const netIncomeSparkBars = React.useMemo(() => {
    if (!Array.isArray(revExp?.data) || revExp!.data.length === 0) return undefined;
    const last5 = revExp!.data.slice(-5).map((p) => (p.revenue ?? 0) - (p.expenses ?? 0));
    const max = Math.max(...last5.map(Math.abs), 1);
    return last5.map((v) => Math.abs(v) / max);
  }, [revExp]);

  // X-axis labels
  const chartLabels = React.useMemo(() => {
    const flows = cashFlow?.dailyFlow;
    if (!Array.isArray(flows) || flows.length === 0) return ['', '', '', ''];
    const picks = [
      0,
      Math.floor(flows.length / 3),
      Math.floor((flows.length * 2) / 3),
      flows.length - 1,
    ];
    return picks.map((i) => {
      const d = new Date(flows[i]?.date ?? '');
      return isNaN(d.getTime())
        ? ''
        : `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })}`;
    });
  }, [cashFlow]);

  const chartWidth = SCREEN_W - 64;

  return (
    <View style={{ flex: 1, backgroundColor: SURFACE }}>
      <StatusBar barStyle="dark-content" backgroundColor={SURFACE} />

      {/* ── Top App Bar ── */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: SURFACE_CARD }}>
        <View
          style={{
            height: 56,
            backgroundColor: SURFACE_CARD,
            borderBottomWidth: 1,
            borderBottomColor: '#f1f5f9',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            shadowColor: '#09305a',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <TouchableOpacity
            onPress={() => (navigation as any).navigate('CompanySelect', { mode: 'in-app' })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: PRIMARY, letterSpacing: -0.3 }}>
              {company?.name ?? 'FinanX'}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color={PRIMARY} />
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={{ padding: 6, borderRadius: 9999, position: 'relative' }}
              activeOpacity={0.7}
              onPress={() => (navigation as any).navigate('NotificationInbox')}
            >
              <MaterialCommunityIcons name="bell-outline" size={24} color={ON_SURFACE_V} />
              {unread > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: ERROR,
                    borderWidth: 1.5,
                    borderColor: SURFACE_CARD,
                  }}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => (navigation as any).navigate('Profile')}
              activeOpacity={0.8}
              style={{
                width: 36,
                height: 36,
                borderRadius: 9999,
                backgroundColor: PRIMARY + '20',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                borderWidth: 1.5,
                borderColor: OUTLINE_V,
              }}
            >
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={{ width: 36, height: 36 }} />
              ) : (
                <Text style={{ fontSize: 14, fontWeight: '700', color: PRIMARY }}>
                  {user?.firstName?.charAt(0).toUpperCase() ?? 'U'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* ── Scrollable Body ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
        }
      >
        {/* ── Greeting row + Period dropdown ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: 8,
          }}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text
              style={{ fontSize: 22, fontWeight: '600', color: ON_SURFACE, letterSpacing: -0.4 }}
              numberOfLines={1}
            >
              {greeting()}, {user?.firstName ?? 'there'}
            </Text>
            <Text style={{ fontSize: 13, color: ON_SURFACE_V, marginTop: 2 }}>{formatDate()}</Text>
          </View>
          <PeriodDropdown value={period} onChange={setPeriod} />
        </View>

        {/* ── KPI Carousel ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={CARD_W + 12}
          snapToAlignment="start"
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12 }}
        >
          {kpiLoading ? (
            <>
              <KPICardSkeleton />
              <KPICardSkeleton />
              <KPICardSkeleton />
            </>
          ) : kpi ? (
            <>
              <KPICard
                label="Cash Balance"
                value={kpi.cashBalance}
                icon="bank-outline"
                iconColor={PRIMARY}
                iconBg={PRIMARY + '15'}
                sparkBars={cashSparkBars}
              />
              <KPICard
                label="Revenue"
                value={kpi.revenue.current}
                deltaPct={kpi.revenue.changePercent}
                deltaDir={kpi.revenue.changeDirection}
                icon="trending-up"
                iconColor="#0040a2"
                iconBg="#dae2ff"
              />
              <KPICard
                label="Net Income"
                value={kpi.netIncome.current}
                deltaPct={kpi.netIncome.changePercent}
                deltaDir={kpi.netIncome.changeDirection}
                icon="finance"
                iconColor={SUCCESS}
                iconBg="#d1fae5"
                sparkBars={netIncomeSparkBars}
              />
              <KPICard
                label="Outstanding AR"
                value={kpi.totalAR}
                icon="file-document-outline"
                iconColor="#0891b2"
                iconBg="#e0f2fe"
              />
              <KPICard
                label="Outstanding AP"
                value={kpi.totalAP}
                icon="receipt"
                iconColor={ERROR}
                iconBg={ERROR_BG}
              />
            </>
          ) : (
            <View
              style={{ width: CARD_W, alignItems: 'center', justifyContent: 'center', height: 160 }}
            >
              <MaterialCommunityIcons name="chart-bar" size={40} color={OUTLINE_V} />
              <Text style={{ color: MUTED, marginTop: 8, fontSize: 13 }}>No data available</Text>
            </View>
          )}
        </ScrollView>

        {/* ── Cash Flow Chart ── */}
        <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
          <View
            style={{
              backgroundColor: SURFACE_CARD,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: OUTLINE_V + '30',
              shadowColor: '#09305a',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: ON_SURFACE,
                letterSpacing: -0.3,
                marginBottom: 16,
              }}
            >
              Cash Flow
            </Text>

            {chartLoading ? (
              <View style={{ height: 160, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={PRIMARY} />
              </View>
            ) : chartData.length > 0 ? (
              <View style={{ marginLeft: -10 }}>
                <LineChart
                  data={chartData}
                  width={chartWidth}
                  height={140}
                  curved
                  areaChart
                  color={PRIMARY}
                  startFillColor={PRIMARY}
                  endFillColor={PRIMARY}
                  startOpacity={0.18}
                  endOpacity={0.01}
                  thickness={2.5}
                  hideDataPoints
                  hideRules
                  hideYAxisText
                  xAxisColor="transparent"
                  yAxisColor="transparent"
                  initialSpacing={0}
                  endSpacing={0}
                  noOfSections={3}
                  adjustToWidth
                />
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingHorizontal: 10,
                    marginTop: 4,
                  }}
                >
                  {chartLabels.map((l, i) => (
                    <Text key={i} style={{ fontSize: 10, color: MUTED, fontWeight: '500' }}>
                      {l}
                    </Text>
                  ))}
                </View>
              </View>
            ) : cashFlow?.bankAccounts?.length ? (
              // Fallback: no transactions yet — show bank account balances
              <View style={{ gap: 0 }}>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}
                >
                  <MaterialCommunityIcons name="information-outline" size={14} color={MUTED} />
                  <Text style={{ fontSize: 12, color: MUTED }}>
                    No transactions recorded yet. Current bank balances:
                  </Text>
                </View>
                {cashFlow.bankAccounts.map((acc, idx) => (
                  <View key={acc.accountId}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 10,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 9999,
                            backgroundColor: PRIMARY + '12',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <MaterialCommunityIcons name="bank-outline" size={18} color={PRIMARY} />
                        </View>
                        <View>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: ON_SURFACE }}>
                            {acc.name}
                          </Text>
                          {acc.institution ? (
                            <Text style={{ fontSize: 11, color: MUTED }}>
                              {acc.institution}
                              {acc.last4 ? ` ••••${acc.last4}` : ''}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: PRIMARY }}>
                        {formatCurrency(acc.currentBalance)}
                      </Text>
                    </View>
                    {idx < cashFlow.bankAccounts.length - 1 && (
                      <View style={{ height: 1, backgroundColor: '#f1f5f9' }} />
                    )}
                  </View>
                ))}
                {/* Total */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: 12,
                    marginTop: 4,
                    borderTopWidth: 1,
                    borderTopColor: '#f1f5f9',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: ON_SURFACE_V,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    Total Balance
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: PRIMARY }}>
                    {formatCurrency(cashFlow.totalCashBalance)}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ height: 140, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="chart-line" size={40} color={OUTLINE_V} />
                <Text style={{ color: MUTED, marginTop: 8, fontSize: 13 }}>No cash flow data</Text>
              </View>
            )}

            {/* Summary row — only when chart has data */}
            {chartData.length > 0 && cashFlow?.last30Days && (
              <View
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  marginTop: 16,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: '#f1f5f9',
                }}
              >
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text
                    style={{
                      fontSize: 11,
                      color: MUTED,
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      marginBottom: 2,
                    }}
                  >
                    Inflow
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: SUCCESS }}>
                    {formatCurrency(cashFlow.last30Days.totalInflow)}
                  </Text>
                </View>
                <View style={{ width: 1, backgroundColor: '#f1f5f9' }} />
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text
                    style={{
                      fontSize: 11,
                      color: MUTED,
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      marginBottom: 2,
                    }}
                  >
                    Outflow
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: ERROR }}>
                    {formatCurrency(cashFlow.last30Days.totalOutflow)}
                  </Text>
                </View>
                <View style={{ width: 1, backgroundColor: '#f1f5f9' }} />
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text
                    style={{
                      fontSize: 11,
                      color: MUTED,
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      marginBottom: 2,
                    }}
                  >
                    Net
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: cashFlow.last30Days.netCashFlow >= 0 ? PRIMARY : ERROR,
                    }}
                  >
                    {formatCurrency(cashFlow.last30Days.netCashFlow)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* ── Revenue vs Expenses Chart ── */}
        <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
          <View
            style={{
              backgroundColor: SURFACE_CARD,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: OUTLINE_V + '30',
              shadowColor: '#09305a',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 16,
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: ON_SURFACE,
                    letterSpacing: -0.3,
                  }}
                >
                  Revenue vs Expenses
                </Text>
                <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                  {periodLabel(period)}
                </Text>
              </View>
              {/* Legend */}
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View
                    style={{ width: 12, height: 3, borderRadius: 2, backgroundColor: PRIMARY }}
                  />
                  <Text style={{ fontSize: 11, color: ON_SURFACE_V, fontWeight: '500' }}>
                    Revenue
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 12, height: 3, borderRadius: 2, backgroundColor: ERROR }} />
                  <Text style={{ fontSize: 11, color: ON_SURFACE_V, fontWeight: '500' }}>
                    Expenses
                  </Text>
                </View>
              </View>
            </View>

            {/* Chart */}
            {revExp && Array.isArray(revExp.data) && revExp.data.length > 0 ? (
              (() => {
                const revenueData = revExp.data.map((p) => ({ value: p.revenue ?? 0 }));
                const expensesData = revExp.data.map((p) => ({ value: p.expenses ?? 0 }));
                // Pick 4 evenly-spaced labels
                const pts = revExp.data;
                const labelPicks = [
                  0,
                  Math.floor(pts.length / 3),
                  Math.floor((pts.length * 2) / 3),
                  pts.length - 1,
                ];
                const axisLabels = labelPicks.map((i) => pts[i]?.label ?? '');

                return (
                  <View style={{ marginLeft: -10 }}>
                    <LineChart
                      data={revenueData}
                      data2={expensesData}
                      width={chartWidth}
                      height={150}
                      curved
                      color1={PRIMARY}
                      color2={ERROR}
                      thickness={2.5}
                      thickness2={2.5}
                      hideDataPoints
                      hideRules
                      hideYAxisText
                      xAxisColor="transparent"
                      yAxisColor="transparent"
                      initialSpacing={0}
                      endSpacing={0}
                      noOfSections={4}
                      adjustToWidth
                      startFillColor1={PRIMARY}
                      endFillColor1={PRIMARY}
                      startOpacity1={0.08}
                      endOpacity1={0}
                      startFillColor2={ERROR}
                      endFillColor2={ERROR}
                      startOpacity2={0.06}
                      endOpacity2={0}
                      areaChart
                    />
                    {/* X-axis labels */}
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        paddingHorizontal: 10,
                        marginTop: 4,
                      }}
                    >
                      {axisLabels.map((l, i) => (
                        <Text key={i} style={{ fontSize: 10, color: MUTED, fontWeight: '500' }}>
                          {l}
                        </Text>
                      ))}
                    </View>
                  </View>
                );
              })()
            ) : (
              <View style={{ height: 150, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={PRIMARY} />
              </View>
            )}

            {/* Summary totals from financial-overview */}
            {kpi && (
              <View
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  marginTop: 16,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: '#f1f5f9',
                }}
              >
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text
                    style={{
                      fontSize: 11,
                      color: MUTED,
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      marginBottom: 2,
                    }}
                  >
                    Revenue
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: PRIMARY }}>
                    {formatCurrency(kpi.revenue.current)}
                  </Text>
                  {kpi.revenue.changePercent != null && (
                    <Text
                      style={{
                        fontSize: 11,
                        color: kpi.revenue.changeDirection === 'up' ? SUCCESS : ERROR,
                        marginTop: 1,
                      }}
                    >
                      {kpi.revenue.changeDirection === 'up' ? '+' : ''}
                      {kpi.revenue.changePercent.toFixed(1)}%
                    </Text>
                  )}
                </View>
                <View style={{ width: 1, backgroundColor: '#f1f5f9' }} />
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text
                    style={{
                      fontSize: 11,
                      color: MUTED,
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      marginBottom: 2,
                    }}
                  >
                    Expenses
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: ERROR }}>
                    {formatCurrency(kpi.expenses.current)}
                  </Text>
                  {kpi.expenses.changePercent != null && (
                    <Text
                      style={{
                        fontSize: 11,
                        color: kpi.expenses.changeDirection === 'up' ? ERROR : SUCCESS,
                        marginTop: 1,
                      }}
                    >
                      {kpi.expenses.changeDirection === 'up' ? '+' : ''}
                      {kpi.expenses.changePercent.toFixed(1)}%
                    </Text>
                  )}
                </View>
                <View style={{ width: 1, backgroundColor: '#f1f5f9' }} />
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text
                    style={{
                      fontSize: 11,
                      color: MUTED,
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      marginBottom: 2,
                    }}
                  >
                    Net
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: kpi.netIncome.current >= 0 ? PRIMARY : ERROR,
                    }}
                  >
                    {formatCurrency(kpi.netIncome.current)}
                  </Text>
                  {kpi.netIncome.changePercent != null && (
                    <Text
                      style={{
                        fontSize: 11,
                        color: kpi.netIncome.changeDirection === 'up' ? SUCCESS : ERROR,
                        marginTop: 1,
                      }}
                    >
                      {kpi.netIncome.changeDirection === 'up' ? '+' : ''}
                      {kpi.netIncome.changePercent.toFixed(1)}%
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <QuickActionTile
              icon="file-document-plus-outline"
              label="New Invoice"
              iconBg={PRIMARY + '15'}
              iconColor={PRIMARY}
              onPress={() => (navigation as any).navigate('SalesStack', { screen: 'InvoiceForm' })}
            />
            <QuickActionTile
              icon="receipt-outline"
              label="Scan Receipt"
              iconBg="#d7e3fb"
              iconColor="#535f73"
              onPress={() =>
                (navigation as any).navigate('ExpensesStack', { screen: 'ReceiptCamera' })
              }
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <QuickActionTile
              icon="cash-minus"
              label="New Expense"
              iconBg={ERROR_BG}
              iconColor={ERROR}
              onPress={() =>
                (navigation as any).navigate('ExpensesStack', { screen: 'ExpenseForm' })
              }
            />
            <QuickActionTile
              icon="cash-check"
              label="Record Payment"
              iconBg="#ffdbcf"
              iconColor="#7b2600"
              onPress={() =>
                (navigation as any).navigate('SalesStack', { screen: 'InvoicePayment' })
              }
            />
          </View>
        </View>

        {/* ── AR / AP Aging ── */}
        {(arAging || apAging) && (
          <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: ON_SURFACE,
                marginBottom: 12,
                letterSpacing: -0.3,
              }}
            >
              Aging Summary
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {arAging && <AgingMiniBar label="AR" totals={arAging} />}
              {apAging && <AgingMiniBar label="AP" totals={apAging} />}
            </View>
          </View>
        )}

        {/* ── Recent Activity ── */}
        <View style={{ marginHorizontal: 20, marginBottom: 24 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <Text
              style={{ fontSize: 18, fontWeight: '600', color: ON_SURFACE, letterSpacing: -0.3 }}
            >
              Recent Activity
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('ActivityFeed')}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: PRIMARY }}>View all</Text>
            </TouchableOpacity>
          </View>

          <View
            style={{
              backgroundColor: SURFACE_CARD,
              borderRadius: 16,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: OUTLINE_V + '30',
              shadowColor: '#09305a',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
              height: 380,
            }}
          >
            {actLoading ? (
              <ScrollView scrollEnabled={false}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <React.Fragment key={i}>
                    <ActivitySkeleton />
                    {i < 5 && (
                      <View
                        style={{ height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 16 }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </ScrollView>
            ) : activity && activity.length > 0 ? (
              <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled bounces={false}>
                {activity.map((item, idx) => (
                  <React.Fragment key={item.id}>
                    <TouchableOpacity activeOpacity={0.7}>
                      <ActivityRow item={item} />
                    </TouchableOpacity>
                    {idx < activity.length - 1 && (
                      <View
                        style={{ height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 16 }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </ScrollView>
            ) : (
              <View
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}
              >
                <MaterialCommunityIcons name="clock-outline" size={40} color={OUTLINE_V} />
                <Text style={{ color: MUTED, marginTop: 8, fontSize: 14, textAlign: 'center' }}>
                  No recent activity yet.{'\n'}Create your first invoice to get started.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
