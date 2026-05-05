import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MoreStackParamList } from '@common/types';
import { MoreMenuScreen } from '@modules/more/screens/MoreMenuScreen';
import { TimerScreen } from '@modules/more/screens/TimerScreen';
import { TimeEntryListScreen } from '@modules/more/screens/TimeEntryListScreen';
import { TimeEntryFormScreen } from '@modules/more/screens/TimeEntryFormScreen';
import { TimeSubmitScreen } from '@modules/more/screens/TimeSubmitScreen';
import { ProjectListScreen } from '@modules/more/screens/ProjectListScreen';
import { ProjectDetailScreen } from '@modules/more/screens/ProjectDetailScreen';
import { ProjectProfitScreen } from '@modules/more/screens/ProjectProfitScreen';
import { BankAccountListScreen } from '@modules/more/screens/BankAccountListScreen';
import { BankTxnListScreen } from '@modules/more/screens/BankTxnListScreen';
import { BankTxnDetailScreen } from '@modules/more/screens/BankTxnDetailScreen';
import { ReconciliationViewScreen } from '@modules/more/screens/ReconciliationViewScreen';
import { ReportPLScreen } from '@modules/more/screens/ReportPLScreen';
import { ReportBSScreen } from '@modules/more/screens/ReportBSScreen';
import { ReportCashFlowScreen } from '@modules/more/screens/ReportCashFlowScreen';
import { ReportARAgingScreen } from '@modules/more/screens/ReportARAgingScreen';
import { ReportAPAgingScreen } from '@modules/more/screens/ReportAPAgingScreen';
import { ReportSalesByCustomerScreen } from '@modules/more/screens/ReportSalesByCustomerScreen';
import { ProductListScreen } from '@modules/more/screens/ProductListScreen';
import { ProductDetailScreen } from '@modules/more/screens/ProductDetailScreen';
import { ProductStockCardScreen } from '@modules/more/screens/ProductStockCardScreen';
import { NotificationInboxScreen } from '@modules/more/screens/NotificationInboxScreen';
import { NotificationSettingsScreen } from '@modules/more/screens/NotificationSettingsScreen';
import { ProfileScreen } from '@modules/more/screens/ProfileScreen';
import { ChangePasswordScreen } from '@modules/more/screens/ChangePasswordScreen';
import { CurrencyPrefScreen } from '@modules/more/screens/CurrencyPrefScreen';
import { AboutScreen } from '@modules/more/screens/AboutScreen';

const Stack = createNativeStackNavigator<MoreStackParamList>();

export function MoreStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MoreMenu" component={MoreMenuScreen} />
      <Stack.Screen name="Timer" component={TimerScreen} />
      <Stack.Screen name="TimeEntryList" component={TimeEntryListScreen} />
      <Stack.Screen name="TimeEntryForm" component={TimeEntryFormScreen} />
      <Stack.Screen name="TimeSubmit" component={TimeSubmitScreen} />
      <Stack.Screen name="ProjectList" component={ProjectListScreen} />
      <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
      <Stack.Screen name="ProjectProfit" component={ProjectProfitScreen} />
      <Stack.Screen name="BankAccountList" component={BankAccountListScreen} />
      <Stack.Screen name="BankTxnList" component={BankTxnListScreen} />
      <Stack.Screen name="BankTxnDetail" component={BankTxnDetailScreen} />
      <Stack.Screen name="ReconciliationView" component={ReconciliationViewScreen} />
      <Stack.Screen name="ReportPL" component={ReportPLScreen} />
      <Stack.Screen name="ReportBS" component={ReportBSScreen} />
      <Stack.Screen name="ReportCashFlow" component={ReportCashFlowScreen} />
      <Stack.Screen name="ReportARAging" component={ReportARAgingScreen} />
      <Stack.Screen name="ReportAPAging" component={ReportAPAgingScreen} />
      <Stack.Screen name="ReportSalesByCustomer" component={ReportSalesByCustomerScreen} />
      <Stack.Screen name="ProductList" component={ProductListScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="ProductStockCard" component={ProductStockCardScreen} />
      <Stack.Screen name="NotificationInbox" component={NotificationInboxScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="CurrencyPref" component={CurrencyPrefScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
    </Stack.Navigator>
  );
}
