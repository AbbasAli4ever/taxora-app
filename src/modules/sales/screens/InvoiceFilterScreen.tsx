import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { SalesStackParamList, RootStackParamList } from '@common/types';
import { API_ENDPOINTS } from '@common/constants';
import { apiService } from '@common/services/api.service';

const BG = '#faf8ff';
const SURFACE = '#ffffff';
const PRIMARY = '#003d9b';
const ON_SURF = '#191b23';
const ON_VAR = '#434654';
const OUTLINE_V = '#c3c6d6';
const MUTED = '#737685';

type Nav = NativeStackNavigationProp<SalesStackParamList & RootStackParamList>;

const ALL_STATUSES = ['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID'] as const;
const STATUS_COLORS: Record<string, { text: string; bg: string; activeBg: string }> = {
  DRAFT: { text: '#434654', bg: '#e1e2ec', activeBg: '#434654' },
  SENT: { text: '#0040a2', bg: '#dae2ff', activeBg: '#0040a2' },
  PARTIALLY_PAID: { text: '#7b2600', bg: '#ffdbcf', activeBg: '#7b2600' },
  PAID: { text: '#1a6b3c', bg: '#d4f4e3', activeBg: '#1a6b3c' },
  OVERDUE: { text: '#ba1a1a', bg: '#ffdad6', activeBg: '#ba1a1a' },
  VOID: { text: '#434654', bg: '#ededf8', activeBg: '#434654' },
};

type DatePreset = 'this_week' | 'this_month' | 'last_month' | 'this_quarter' | 'ytd' | 'custom';

function getDateRange(preset: DatePreset): { from: string; to: string } | null {
  const now = new Date();
  const toStr = (d: Date) => d.toISOString().slice(0, 10);

  switch (preset) {
    case 'this_week': {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      return { from: toStr(start), to: toStr(now) };
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: toStr(start), to: toStr(now) };
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: toStr(start), to: toStr(end) };
    }
    case 'this_quarter': {
      const q = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), q * 3, 1);
      return { from: toStr(start), to: toStr(now) };
    }
    case 'ytd': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { from: toStr(start), to: toStr(now) };
    }
    default:
      return null;
  }
}

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'this_week', label: 'This Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'this_quarter', label: 'This Quarter' },
  { key: 'ytd', label: 'YTD' },
  { key: 'custom', label: 'Custom' },
];

interface Customer {
  id: string;
  displayName: string;
}

export function InvoiceFilterScreen() {
  const navigation = useNavigation<Nav>();

  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [datePreset, setDatePreset] = useState<DatePreset | null>(null);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  function toggleStatus(s: string) {
    setSelectedStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function searchCustomers(q: string) {
    setLoadingCustomers(true);
    try {
      const res = await apiService.get<{
        data: { items?: Customer[]; data?: Customer[] } | Customer[];
      }>(API_ENDPOINTS.CUSTOMERS.LIST, { params: { search: q, limit: 20 } });
      const raw = res.data;
      const arr = Array.isArray(raw) ? raw : ((raw as any).data?.items ?? (raw as any).data ?? []);
      setCustomers(arr);
    } catch {
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  }

  function handleReset() {
    setSelectedStatuses([]);
    setDatePreset(null);
    setCustomFrom('');
    setCustomTo('');
    setSelectedCustomer(null);
    setAmountMin('');
    setAmountMax('');
  }

  function handleApply() {
    let dateFrom: string | undefined;
    let dateTo: string | undefined;

    if (datePreset && datePreset !== 'custom') {
      const range = getDateRange(datePreset);
      if (range) {
        dateFrom = range.from;
        dateTo = range.to;
      }
    } else if (datePreset === 'custom') {
      dateFrom = customFrom || undefined;
      dateTo = customTo || undefined;
    }

    // Navigate back to InvoiceList passing filter params
    // InvoiceList reads these via route.params if we use navigation.navigate
    navigation.navigate('InvoiceList');
    // Note: in a full implementation filters would be passed via navigation params
    // or a shared Zustand store; InvoiceList would consume them on focus.
  }

  const hasFilters =
    selectedStatuses.length > 0 ||
    datePreset !== null ||
    selectedCustomer !== null ||
    amountMin !== '' ||
    amountMax !== '';

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
          backgroundColor: SURFACE,
          borderBottomWidth: 1,
          borderBottomColor: OUTLINE_V + '40',
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={ON_SURF} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center', marginBottom: 4, marginRight: 8 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: OUTLINE_V }} />
        </View>
        <Text
          style={{ flex: 1, fontSize: 17, fontWeight: '700', color: ON_SURF, textAlign: 'center' }}
        >
          Filters
        </Text>
        <TouchableOpacity onPress={handleReset}>
          <Text style={{ fontSize: 15, color: PRIMARY, fontWeight: '600' }}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}>
        {/* Status */}
        <View style={{ backgroundColor: SURFACE, borderRadius: 16, padding: 16 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: MUTED,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: 12,
            }}
          >
            Status
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ALL_STATUSES.map((s) => {
              const active = selectedStatuses.includes(s);
              const colors = STATUS_COLORS[s];
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => toggleStatus(s)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: active ? colors.activeBg : colors.bg,
                    borderWidth: active ? 0 : 1,
                    borderColor: OUTLINE_V,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: active ? '#fff' : colors.text,
                    }}
                  >
                    {s.replace(/_/g, ' ')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Date Range */}
        <View style={{ backgroundColor: SURFACE, borderRadius: 16, padding: 16 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: MUTED,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: 12,
            }}
          >
            Date Range
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {DATE_PRESETS.map((p) => {
              const active = datePreset === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  onPress={() => setDatePreset(active ? null : p.key)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: active ? PRIMARY : SURFACE,
                    borderWidth: 1,
                    borderColor: active ? PRIMARY : OUTLINE_V,
                  }}
                >
                  <Text
                    style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : ON_VAR }}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {datePreset === 'custom' && (
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: MUTED, fontWeight: '600', marginBottom: 4 }}>
                  FROM
                </Text>
                <TextInput
                  value={customFrom}
                  onChangeText={setCustomFrom}
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
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: MUTED, fontWeight: '600', marginBottom: 4 }}>
                  TO
                </Text>
                <TextInput
                  value={customTo}
                  onChangeText={setCustomTo}
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
              </View>
            </View>
          )}
        </View>

        {/* Customer */}
        <View style={{ backgroundColor: SURFACE, borderRadius: 16, padding: 16 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: MUTED,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: 12,
            }}
          >
            Customer
          </Text>
          <TouchableOpacity
            onPress={() => {
              searchCustomers('');
              setShowCustomerModal(true);
            }}
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
              size={20}
              color={selectedCustomer ? PRIMARY : MUTED}
            />
            <Text
              style={{
                flex: 1,
                fontSize: 14,
                color: selectedCustomer ? ON_SURF : MUTED,
                fontWeight: selectedCustomer ? '600' : '400',
              }}
            >
              {selectedCustomer?.displayName ?? 'Any customer'}
            </Text>
            {selectedCustomer ? (
              <TouchableOpacity onPress={() => setSelectedCustomer(null)}>
                <MaterialCommunityIcons name="close-circle" size={18} color={MUTED} />
              </TouchableOpacity>
            ) : (
              <MaterialCommunityIcons name="chevron-down" size={18} color={MUTED} />
            )}
          </TouchableOpacity>
        </View>

        {/* Amount Range */}
        <View style={{ backgroundColor: SURFACE, borderRadius: 16, padding: 16 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: MUTED,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: 12,
            }}
          >
            Amount Range
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: MUTED, fontWeight: '600', marginBottom: 4 }}>
                MIN ($)
              </Text>
              <TextInput
                value={amountMin}
                onChangeText={setAmountMin}
                placeholder="0.00"
                placeholderTextColor={MUTED}
                keyboardType="decimal-pad"
                style={{
                  fontSize: 15,
                  color: ON_SURF,
                  borderBottomWidth: 1,
                  borderBottomColor: OUTLINE_V,
                  paddingBottom: 6,
                }}
              />
            </View>
            <View style={{ alignSelf: 'flex-end', paddingBottom: 8 }}>
              <Text style={{ fontSize: 14, color: MUTED }}>—</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: MUTED, fontWeight: '600', marginBottom: 4 }}>
                MAX ($)
              </Text>
              <TextInput
                value={amountMax}
                onChangeText={setAmountMax}
                placeholder="No limit"
                placeholderTextColor={MUTED}
                keyboardType="decimal-pad"
                style={{
                  fontSize: 15,
                  color: ON_SURF,
                  borderBottomWidth: 1,
                  borderBottomColor: OUTLINE_V,
                  paddingBottom: 6,
                }}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Apply Button */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: SURFACE,
          borderTopWidth: 1,
          borderTopColor: OUTLINE_V + '40',
          padding: 16,
          paddingBottom: 28,
        }}
      >
        <TouchableOpacity
          onPress={handleApply}
          style={{
            backgroundColor: PRIMARY,
            borderRadius: 14,
            height: 52,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
            Apply Filters
            {hasFilters
              ? ` (${[selectedStatuses.length > 0, datePreset !== null, selectedCustomer !== null, amountMin !== '' || amountMax !== ''].filter(Boolean).length})`
              : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Customer Modal */}
      <Modal visible={showCustomerModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: SURFACE,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              height: '80%',
            }}
          >
            <View
              style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: OUTLINE_V + '40' }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontSize: 17, fontWeight: '700', color: ON_SURF }}>
                  Select Customer
                </Text>
                <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
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
                  value={customerSearch}
                  onChangeText={(q) => {
                    setCustomerSearch(q);
                    searchCustomers(q);
                  }}
                  placeholder="Search customers..."
                  placeholderTextColor={MUTED}
                  style={{ flex: 1, marginLeft: 8, fontSize: 14, color: ON_SURF }}
                  autoFocus
                />
              </View>
            </View>
            {loadingCustomers ? (
              <ActivityIndicator color={PRIMARY} style={{ marginTop: 32 }} />
            ) : (
              <FlatList
                data={customers}
                keyExtractor={(c) => c.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedCustomer(item);
                      setShowCustomerModal(false);
                    }}
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: OUTLINE_V + '30',
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <MaterialCommunityIcons
                      name="account"
                      size={18}
                      color={MUTED}
                      style={{ marginRight: 12 }}
                    />
                    <Text style={{ fontSize: 15, color: ON_SURF, flex: 1 }}>
                      {item.displayName}
                    </Text>
                    {selectedCustomer?.id === item.id && (
                      <MaterialCommunityIcons name="check" size={18} color={PRIMARY} />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={{ padding: 24, color: MUTED, textAlign: 'center' }}>
                    No customers found
                  </Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
