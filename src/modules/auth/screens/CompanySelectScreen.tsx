import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Company } from '@common/types';
import { authController } from '../auth.controller';
import { authService } from '../auth.service';
import { useAuthStore } from '../store';
import { saveTokens } from '@common/utils/storage';
import { getApiErrorMessage } from '@common/utils/apiError';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CompanySelect'>;
type RouteProps = RouteProp<RootStackParamList, 'CompanySelect'>;

interface CompanyItem extends Company {
  role?: string | { id: string; name: string } | null;
  isActive?: boolean;
  logoUrl?: string;
  isPrimaryAdmin?: boolean;
  baseCurrency?: string;
}

const AVATAR_COLORS = ['#003d9b', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2'];
const PRIMARY = '#0052cc';
const PRIMARY_DARK = '#003d9b';
const SURFACE = '#faf8ff';
const FIELD = '#f4f6ff';
const TEXT = '#191b23';
const BODY = '#434654';
const MUTED = '#737685';
const BORDER = '#d8deee';

function avatarColor(name: string): string {
  const safe = name ?? '';
  let hash = 0;
  for (let i = 0; i < safe.length; i++) hash = safe.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getRoleName(role: CompanyItem['role']): string | null {
  if (!role) return null;
  if (typeof role === 'string') return role;
  return role.name ?? null;
}

function SkeletonCard() {
  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        marginBottom: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 48, height: 48, borderRadius: 9999, backgroundColor: '#e1e2ec' }} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ height: 14, width: '60%', backgroundColor: '#e1e2ec', borderRadius: 6 }} />
          <View style={{ height: 11, width: '35%', backgroundColor: '#e1e2ec', borderRadius: 6 }} />
        </View>
        <View style={{ width: 24, height: 24, borderRadius: 9999, backgroundColor: '#e1e2ec' }} />
      </View>
    </View>
  );
}

export function CompanySelectScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { mode = 'post-login', tempToken = '', companies: initialCompanies } = route.params ?? {};

  const [loading, setLoading] = useState(mode === 'in-app');
  const [companies, setCompanies] = useState<CompanyItem[]>(
    (initialCompanies as CompanyItem[]) ?? [],
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const currentCompany = useAuthStore((s) => s.company);

  useEffect(() => {
    if (mode === 'in-app') {
      (async () => {
        try {
          const list = await authService.getMyCompanies();
          setCompanies(list as CompanyItem[]);
        } catch {
          // show empty state
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [mode]);

  const filtered = useMemo(() => {
    const safe = Array.isArray(companies) ? companies : [];
    if (!searchQuery.trim()) return safe;
    const q = searchQuery.toLowerCase().trim();
    return safe.filter((c) => {
      const n = (c.name ?? (c as any).companyName ?? '').toLowerCase();
      return n.includes(q);
    });
  }, [companies, searchQuery]);

  const handleSelect = async (company: CompanyItem) => {
    if (selectingId) return;
    const companyId = company.id ?? (company as any).companyId;
    setSelectingId(companyId);

    try {
      if (mode === 'post-login') {
        const result = await authController.selectCompany(companyId, tempToken);
        if (!result.success) {
          setSelectingId(null);
          return;
        }
        setSelectingId(null);
        navigation.reset({ index: 0, routes: [{ name: 'App' }] });
        return;
      } else {
        const tokens = await authService.switchCompany(companyId);
        saveTokens(tokens.accessToken, tokens.refreshToken);
        const permissions = await authService.getMyPermissions();
        const updatedCompany: Company = {
          id: companyId,
          name: company.name ?? (company as any).companyName ?? '',
        };
        const user = useAuthStore.getState().user!;
        useAuthStore.getState().setAuth(user, updatedCompany, permissions);
        navigation.navigate('App');
      }
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'Failed to select company');
      const status = err?.response?.status;
      if (status === 403) {
        console.warn(msg);
      }
      setSelectingId(null);
    }
  };

  const renderItem = ({ item }: { item: CompanyItem }) => {
    const displayName = item.name ?? (item as any).companyName ?? '?';
    const isActiveCompany =
      item.id === currentCompany?.id ||
      (item as any).companyId === currentCompany?.id ||
      item.isActive;
    const isSelecting = selectingId === (item.id ?? (item as any).companyId);
    const color = avatarColor(displayName);
    const initial = displayName.charAt(0).toUpperCase();
    const roleName = getRoleName(item.role);

    if (isActiveCompany) {
      return (
        <TouchableOpacity
          onPress={() => handleSelect(item)}
          disabled={!!selectingId}
          style={{
            borderRadius: 16,
            marginBottom: 12,
            padding: 16,
            backgroundColor: PRIMARY_DARK,
            shadowColor: PRIMARY_DARK,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 6,
            opacity: selectingId && selectingId !== item.id ? 0.5 : 1,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {/* Avatar */}
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 9999,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }}>{initial}</Text>
            </View>

            {/* Info */}
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: -0.2 }}>
                {displayName}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {roleName && (
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 9999,
                      backgroundColor: 'rgba(255,255,255,0.2)',
                    }}
                  >
                    <Text style={{ fontSize: 11, color: '#fff', fontWeight: '600' }}>
                      {roleName}
                    </Text>
                  </View>
                )}
                {item.baseCurrency && (
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                    {item.baseCurrency}
                  </Text>
                )}
              </View>
            </View>

            {/* Check / spinner */}
            {isSelecting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <MaterialCommunityIcons name="check-circle-outline" size={32} color="#fff" />
            )}
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        onPress={() => handleSelect(item)}
        disabled={!!selectingId}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 14,
          marginBottom: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: '#e9edf6',
          shadowColor: '#101828',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.05,
          shadowRadius: 18,
          elevation: 3,
          opacity: selectingId && selectingId !== item.id ? 0.5 : 1,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {/* Avatar */}
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 9999,
              backgroundColor: color + '18',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: '700', color }}>{initial}</Text>
          </View>

          {/* Info */}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: TEXT }}>{displayName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {roleName && (
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 9999,
                    backgroundColor: '#e1e2ec',
                  }}
                >
                  <Text style={{ fontSize: 11, color: BODY, fontWeight: '700' }}>{roleName}</Text>
                </View>
              )}
              {item.baseCurrency && (
                <Text style={{ fontSize: 12, color: MUTED }}>{item.baseCurrency}</Text>
              )}
            </View>
          </View>

          {/* Right */}
          {isSelecting ? (
            <ActivityIndicator color={PRIMARY_DARK} size="small" />
          ) : (
            <MaterialCommunityIcons name="chevron-right" size={26} color={MUTED} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: SURFACE }}>
      <StatusBar barStyle="dark-content" backgroundColor={SURFACE} />

      {/* Top AppBar */}
      <SafeAreaView style={{ backgroundColor: SURFACE }}>
        <View
          style={{
            height: 56,
            backgroundColor: SURFACE,
            borderBottomWidth: 1,
            borderBottomColor: '#f1f5f9',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 8,
          }}
        >
          {mode === 'in-app' ? (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ padding: 8, borderRadius: 9999 }}
            >
              <MaterialCommunityIcons name="arrow-left" size={25} color={PRIMARY_DARK} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 38 }} />
          )}

          <Text style={{ fontSize: 18, fontWeight: '800', color: PRIMARY_DARK }}>
            Select Company
          </Text>

          <TouchableOpacity style={{ padding: 8, borderRadius: 9999 }}>
            <MaterialCommunityIcons name="help-circle-outline" size={30} color={PRIMARY_DARK} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Page header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 }}>
        <Text
          style={{
            fontSize: 32,
            fontWeight: '700',
            color: TEXT,
            lineHeight: 40,
          }}
        >
          Choose a company
        </Text>
        <Text style={{ fontSize: 15, color: BODY, marginTop: 6, lineHeight: 22 }}>
          Switch between your organization accounts or create a new one.
        </Text>
      </View>

      {/* Search bar — always shown */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: FIELD,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: BORDER,
            paddingHorizontal: 12,
            height: 44,
            gap: 8,
            shadowColor: '#101828',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.04,
            shadowRadius: 16,
            elevation: 2,
          }}
        >
          <MaterialCommunityIcons name="magnify" size={22} color={MUTED} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search companies..."
            placeholderTextColor={MUTED}
            style={{
              flex: 1,
              fontSize: 15,
              color: TEXT,
              height: '100%',
              padding: 0,
              fontWeight: '500',
            }}
          />
        </View>
      </View>

      {/* List area */}
      {loading ? (
        <View style={{ paddingHorizontal: 20 }}>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      ) : filtered.length === 0 ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 9999,
              backgroundColor: '#dbe5ff',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <MaterialCommunityIcons name="office-building-outline" size={38} color={PRIMARY_DARK} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: TEXT, marginBottom: 6 }}>
            No companies found
          </Text>
          <Text style={{ fontSize: 14, color: BODY, textAlign: 'center', lineHeight: 20 }}>
            {searchQuery ? 'Try a different search term' : "You don't have any companies yet"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <TouchableOpacity
              style={{
                borderRadius: 14,
                marginBottom: 12,
                padding: 16,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: '#bfc8dc',
                borderStyle: 'dashed',
                height: 64,
                flexDirection: 'row',
                gap: 8,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 9999,
                  backgroundColor: '#dbe5ff',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons name="domain-plus" size={18} color={PRIMARY_DARK} />
              </View>
              <Text style={{ fontSize: 15, color: PRIMARY_DARK, fontWeight: '700' }}>
                Connect another entity
              </Text>
            </TouchableOpacity>
          }
        />
      )}

      {/* Sticky footer — Create Company */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: SURFACE,
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: Platform.OS === 'ios' ? 32 : 20,
          borderTopWidth: 1,
          borderTopColor: '#e1e2ec',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <TouchableOpacity
          style={{
            backgroundColor: PRIMARY,
            borderRadius: 12,
            height: 56,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            shadowColor: PRIMARY_DARK,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#fff', letterSpacing: -0.2 }}>
            Create Company
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
