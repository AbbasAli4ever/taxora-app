import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SectionList,
  RefreshControl,
  StatusBar,
  Platform,
  ActionSheetIOS,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { SalesStackParamList, RootStackParamList } from '@common/types';
import { API_ENDPOINTS } from '@common/constants';
import { apiService } from '@common/services/api.service';
import { useAuthStore } from '@modules/auth/store';

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG = '#faf8ff';
const SURFACE = '#ffffff';
const SURF_LOW = '#f3f3fd';
const PRIMARY = '#003d9b';
const PRIMARY_C = '#0052cc';
const ON_SURF = '#191b23';
const OUTLINE_V = '#c3c6d6';
const MUTED = '#737685';
const ERROR = '#ba1a1a';

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

interface Customer {
  id: string;
  customerType: string;
  displayName: string;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
}

function SkeletonRow() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: SURFACE,
        borderRadius: 12,
        marginBottom: 8,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: OUTLINE_V + '50',
          marginRight: 12,
        }}
      />
      <View style={{ flex: 1, gap: 6 }}>
        <View
          style={{ height: 14, borderRadius: 6, backgroundColor: OUTLINE_V + '50', width: '60%' }}
        />
        <View
          style={{ height: 12, borderRadius: 6, backgroundColor: OUTLINE_V + '30', width: '40%' }}
        />
      </View>
      <View style={{ height: 14, borderRadius: 6, backgroundColor: OUTLINE_V + '30', width: 56 }} />
    </View>
  );
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function CustomerListScreen() {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const canCreate = useAuthStore((s) => s.hasPermission('customer:create'));

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const sectionListRef = useRef<SectionList>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    data: customers,
    isLoading,
    isError,
    refetch,
  } = useQuery<Customer[]>({
    queryKey: ['customers', 'list', { search: debouncedSearch }],
    queryFn: async () => {
      const res = await apiService.get<{ data: Customer[] }>(API_ENDPOINTS.CUSTOMERS.LIST, {
        params: {
          search: debouncedSearch || undefined,
          sortBy: 'displayName',
          sortOrder: 'asc',
          isActive: true,
        },
      });
      return (res.data as any).data ?? res.data;
    },
    staleTime: 60 * 1000,
  });

  const sections = useMemo(() => {
    const grouped: Record<string, Customer[]> = {};
    (customers ?? []).forEach((c) => {
      const letter = (c.displayName?.[0] ?? '#').toUpperCase();
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(c);
    });
    return Object.keys(grouped)
      .sort()
      .map((l) => ({ title: l, data: grouped[l] }));
  }, [customers]);

  const presentLetters = useMemo(() => sections.map((s) => s.title), [sections]);

  const handleSearchChange = useCallback((text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(text), 300);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
    setRefreshing(false);
  }, [queryClient]);

  const jumpToLetter = useCallback(
    (letter: string) => {
      const idx = sections.findIndex((s) => s.title === letter);
      if (idx !== -1 && sectionListRef.current) {
        try {
          sectionListRef.current.scrollToLocation({
            sectionIndex: idx,
            itemIndex: 0,
            animated: true,
          });
        } catch {
          // scrollToLocation may fail if section is empty; ignore
        }
      }
    },
    [sections],
  );

  const handleLongPress = useCallback(
    (customer: Customer) => {
      const hasPhone = !!customer.phone;
      const hasEmail = !!customer.email;
      const options = [
        ...(hasPhone ? ['Call'] : []),
        ...(hasEmail ? ['Email'] : []),
        'Edit',
        'Cancel',
      ];
      const cancelIdx = options.length - 1;

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          { options, cancelButtonIndex: cancelIdx },
          (idx) => {
            const chosen = options[idx];
            if (chosen === 'Call') Linking.openURL(`tel:${customer.phone}`);
            if (chosen === 'Email') Linking.openURL(`mailto:${customer.email}`);
            if (chosen === 'Edit') navigation.navigate('CustomerForm', { id: customer.id });
          },
        );
      } else {
        Alert.alert(customer.displayName, undefined, [
          ...(hasPhone
            ? [{ text: 'Call', onPress: () => Linking.openURL(`tel:${customer.phone}`) }]
            : []),
          ...(hasEmail
            ? [{ text: 'Email', onPress: () => Linking.openURL(`mailto:${customer.email}`) }]
            : []),
          { text: 'Edit', onPress: () => navigation.navigate('CustomerForm', { id: customer.id }) },
          { text: 'Cancel', style: 'cancel' as const },
        ]);
      }
    },
    [navigation],
  );

  const fmtCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: 8,
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}
      >
        <View>
          <Text style={{ fontSize: 24, fontWeight: '700', color: ON_SURF, letterSpacing: -0.3 }}>
            Customers
          </Text>
          <Text style={{ fontSize: 14, color: MUTED, marginTop: 2 }}>
            {isLoading ? '…' : `${customers?.length ?? 0} customers`}
          </Text>
        </View>
        {canCreate && (
          <TouchableOpacity
            onPress={() => navigation.navigate('CustomerForm', {})}
            activeOpacity={0.8}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: PRIMARY_C,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: PRIMARY_C,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <MaterialCommunityIcons name="plus" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: SURF_LOW,
            borderRadius: 12,
            paddingHorizontal: 12,
            height: 44,
          }}
        >
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={MUTED}
            style={{ marginRight: 8 }}
          />
          <TextInput
            value={search}
            onChangeText={handleSearchChange}
            placeholder="Search customers..."
            placeholderTextColor={MUTED}
            autoCapitalize="none"
            autoCorrect={false}
            style={{ flex: 1, fontSize: 15, color: ON_SURF, backgroundColor: 'transparent' }}
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearch('');
                setDebouncedSearch('');
              }}
            >
              <MaterialCommunityIcons name="close-circle" size={18} color={MUTED} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {/* Loading */}
        {isLoading && (
          <View style={{ paddingHorizontal: 16 }}>
            {[0, 1, 2].map((i) => (
              <SkeletonRow key={i} />
            ))}
          </View>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color={ERROR} />
            <Text style={{ fontSize: 16, color: ON_SURF, marginTop: 12, textAlign: 'center' }}>
              Could not load customers
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
        )}

        {/* Empty */}
        {!isLoading && !isError && (customers ?? []).length === 0 && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <MaterialCommunityIcons name="account-group-outline" size={64} color={OUTLINE_V} />
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: ON_SURF,
                marginTop: 16,
                textAlign: 'center',
              }}
            >
              {debouncedSearch ? 'No results found' : 'No customers yet'}
            </Text>
            <Text style={{ fontSize: 14, color: MUTED, marginTop: 6, textAlign: 'center' }}>
              {debouncedSearch
                ? 'Try a different search term'
                : 'Add your first customer to start invoicing'}
            </Text>
            {!debouncedSearch && canCreate && (
              <TouchableOpacity
                onPress={() => navigation.navigate('CustomerForm', {})}
                style={{
                  marginTop: 20,
                  backgroundColor: PRIMARY_C,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Add Customer</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Sectioned list */}
        {!isLoading && !isError && sections.length > 0 && (
          <SectionList
            ref={sectionListRef}
            sections={sections}
            keyExtractor={(item) => item.id}
            stickySectionHeadersEnabled
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, paddingRight: 28 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
            }
            renderSectionHeader={({ section: { title } }) => (
              <View style={{ backgroundColor: BG, paddingVertical: 6, paddingHorizontal: 4 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    color: PRIMARY,
                  }}
                >
                  {title}
                </Text>
              </View>
            )}
            renderItem={({ item }) => {
              const avatar = getAvatarColor(item.id);
              const initials = getInitials(item.displayName);
              const subtitle = item.email ?? item.phone ?? '';
              const hasBalance = item.currentBalance > 0;
              return (
                <TouchableOpacity
                  onPress={() => navigation.navigate('CustomerDetail', { id: item.id })}
                  onLongPress={() => handleLongPress(item)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 14,
                    backgroundColor: SURFACE,
                    borderRadius: 12,
                    marginBottom: 8,
                    shadowColor: '#09305a',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 1,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: avatar.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: avatar.text }}>
                      {initials}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize: 15, fontWeight: '500', color: ON_SURF }}
                      numberOfLines={1}
                    >
                      {item.displayName}
                    </Text>
                    {subtitle ? (
                      <Text style={{ fontSize: 13, color: MUTED, marginTop: 2 }} numberOfLines={1}>
                        {subtitle}
                      </Text>
                    ) : null}
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: hasBalance ? ERROR : MUTED,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {fmtCurrency(item.currentBalance)}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* Alphabet rail */}
        {sections.length > 0 && (
          <View
            style={{
              position: 'absolute',
              right: 4,
              top: 0,
              bottom: 0,
              justifyContent: 'center',
              alignItems: 'center',
              paddingVertical: 8,
            }}
          >
            {ALPHABET.map((letter) => (
              <TouchableOpacity
                key={letter}
                onPress={() => jumpToLetter(letter)}
                hitSlop={{ top: 2, bottom: 2, left: 4, right: 4 }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: presentLetters.includes(letter) ? PRIMARY : OUTLINE_V,
                    paddingVertical: 1,
                  }}
                >
                  {letter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
