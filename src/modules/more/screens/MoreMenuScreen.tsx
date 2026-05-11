import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';

import { MoreStackParamList, RootStackParamList } from '@common/types';
import { useAuthStore } from '@modules/auth/store';
import { authController } from '@modules/auth/auth.controller';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const BG = '#faf8ff';
const SURFACE = '#ffffff';
const ON_SURFACE = '#191b23';
const ON_VARIANT = '#434654';
const OUTLINE_V = '#c3c6d6';
const PRIMARY = '#003d9b';
const ERROR = '#ba1a1a';
const SECTION_LBL = '#737685';

type Nav = NativeStackNavigationProp<MoreStackParamList & RootStackParamList>;

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: SECTION_LBL,
        paddingHorizontal: 4,
        marginBottom: 6,
        marginTop: 4,
      }}
    >
      {label}
    </Text>
  );
}

interface RowProps {
  label: string;
  icon: string;
  onPress: () => void;
  showChevron?: boolean;
  destructive?: boolean;
  isLast?: boolean;
  loading?: boolean;
}

function SettingsRow({
  label,
  icon,
  onPress,
  showChevron = true,
  destructive = false,
  isLast = false,
  loading = false,
}: RowProps) {
  const color = destructive ? ERROR : PRIMARY;
  const textColor = destructive ? ERROR : ON_SURFACE;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 52,
        backgroundColor: SURFACE,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: OUTLINE_V + '40',
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: destructive ? '#ffdad6' : '#dae2ff',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 14,
        }}
      >
        <MaterialCommunityIcons name={icon as any} size={18} color={color} />
      </View>

      <Text
        style={{
          flex: 1,
          fontSize: 16,
          fontWeight: '400',
          color: textColor,
          letterSpacing: 0,
        }}
      >
        {label}
      </Text>

      {loading ? (
        <ActivityIndicator size="small" color={PRIMARY} />
      ) : showChevron && !destructive ? (
        <MaterialCommunityIcons name="chevron-right" size={20} color={SECTION_LBL} />
      ) : null}
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function MoreMenuScreen() {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const { user, company } = useAuthStore();
  const [signingOut, setSigningOut] = useState(false);

  const userInitials =
    [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User';
  const companyName = company?.name ?? 'No company';

  const handleSignOut = useCallback(() => {
    const doSignOut = async () => {
      setSigningOut(true);
      try {
        await authController.logout();
        queryClient.clear();
      } finally {
        setSigningOut(false);
      }
      navigation.reset({ index: 0, routes: [{ name: 'Auth' as any }] });
    };

    Alert.alert('Sign Out', "You'll need to sign in again.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: doSignOut,
      },
    ]);
  }, [navigation, queryClient]);

  const handleCompanySwitch = useCallback(() => {
    (navigation as any).navigate('CompanySelect', { mode: 'in-app' });
  }, [navigation]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 12,
          backgroundColor: BG,
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            color: ON_SURFACE,
            letterSpacing: -0.5,
          }}
        >
          More
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 20 }}
      >
        {/* Profile Card */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Profile')}
          style={{
            backgroundColor: SURFACE,
            borderRadius: 16,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            borderWidth: 1,
            borderColor: OUTLINE_V + '50',
            shadowColor: '#09305a',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.07,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          {/* Avatar */}
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: PRIMARY + '18',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: '700', color: PRIMARY }}>{userInitials}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: ON_SURFACE }}>{fullName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
              <MaterialCommunityIcons name="office-building-outline" size={14} color={PRIMARY} />
              <Text style={{ fontSize: 13, color: ON_VARIANT }}>{companyName}</Text>
            </View>
          </View>

          <MaterialCommunityIcons name="chevron-right" size={20} color={SECTION_LBL} />
        </TouchableOpacity>

        {/* Work Section */}
        <View>
          <SectionHeader label="Work" />
          <View
            style={{
              backgroundColor: SURFACE,
              borderRadius: 14,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: OUTLINE_V + '40',
              shadowColor: '#09305a',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 6,
              elevation: 1,
            }}
          >
            <SettingsRow
              label="Time Tracking"
              icon="timer-outline"
              onPress={() => navigation.navigate('Timer')}
            />
            <SettingsRow
              label="Projects"
              icon="folder-outline"
              onPress={() => navigation.navigate('ProjectList')}
              isLast
            />
          </View>
        </View>

        {/* Finance Section */}
        <View>
          <SectionHeader label="Finance" />
          <View
            style={{
              backgroundColor: SURFACE,
              borderRadius: 14,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: OUTLINE_V + '40',
              shadowColor: '#09305a',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 6,
              elevation: 1,
            }}
          >
            <SettingsRow
              label="Banking"
              icon="bank-outline"
              onPress={() => navigation.navigate('BankAccountList')}
            />
            <SettingsRow
              label="Reports"
              icon="chart-bar"
              onPress={() => navigation.navigate('ReportPL')}
            />
            <SettingsRow
              label="Products"
              icon="package-variant-closed"
              onPress={() => navigation.navigate('ProductList')}
              isLast
            />
          </View>
        </View>

        {/* Account Section */}
        <View>
          <SectionHeader label="Account" />
          <View
            style={{
              backgroundColor: SURFACE,
              borderRadius: 14,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: OUTLINE_V + '40',
              shadowColor: '#09305a',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 6,
              elevation: 1,
            }}
          >
            <SettingsRow
              label="Notifications"
              icon="bell-outline"
              onPress={() => navigation.navigate('NotificationInbox')}
            />
            <SettingsRow
              label="Profile & Settings"
              icon="account-circle-outline"
              onPress={() => navigation.navigate('Profile')}
            />
            <SettingsRow
              label="Switch Company"
              icon="swap-horizontal"
              onPress={handleCompanySwitch}
              isLast
            />
          </View>
        </View>

        {/* Session Section */}
        <View>
          <SectionHeader label="Session" />
          <View
            style={{
              backgroundColor: SURFACE,
              borderRadius: 14,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: OUTLINE_V + '40',
              shadowColor: '#09305a',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 6,
              elevation: 1,
            }}
          >
            <SettingsRow
              label="Sign Out"
              icon="logout"
              onPress={handleSignOut}
              showChevron={false}
              destructive
              isLast
              loading={signingOut}
            />
          </View>
        </View>

        {/* Version */}
        <Text
          style={{
            textAlign: 'center',
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: OUTLINE_V,
            marginTop: 4,
          }}
        >
          VERSION 1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
