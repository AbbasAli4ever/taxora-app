import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SalesStackParamList } from '@common/types';
import { InvoiceListScreen } from '@modules/sales/screens/InvoiceListScreen';
import { InvoiceDetailScreen } from '@modules/sales/screens/InvoiceDetailScreen';
import { InvoiceFormScreen } from '@modules/sales/screens/InvoiceFormScreen';
import { InvoiceSendScreen } from '@modules/sales/screens/InvoiceSendScreen';
import { InvoicePaymentScreen } from '@modules/sales/screens/InvoicePaymentScreen';
import { EstimateListScreen } from '@modules/sales/screens/EstimateListScreen';
import { EstimateDetailScreen } from '@modules/sales/screens/EstimateDetailScreen';
import { EstimateFormScreen } from '@modules/sales/screens/EstimateFormScreen';
import { EstimateConvertScreen } from '@modules/sales/screens/EstimateConvertScreen';
import { CustomerListScreen } from '@modules/sales/screens/CustomerListScreen';
import { CustomerDetailScreen } from '@modules/sales/screens/CustomerDetailScreen';
import { CustomerFormScreen } from '@modules/sales/screens/CustomerFormScreen';

const Stack = createNativeStackNavigator<SalesStackParamList>();

export function SalesStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="InvoiceList" component={InvoiceListScreen} />
      <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
      <Stack.Screen name="InvoiceForm" component={InvoiceFormScreen} />
      <Stack.Screen name="InvoiceSend" component={InvoiceSendScreen} />
      <Stack.Screen name="InvoicePayment" component={InvoicePaymentScreen} />
      <Stack.Screen name="EstimateList" component={EstimateListScreen} />
      <Stack.Screen name="EstimateDetail" component={EstimateDetailScreen} />
      <Stack.Screen name="EstimateForm" component={EstimateFormScreen} />
      <Stack.Screen name="EstimateConvert" component={EstimateConvertScreen} />
      <Stack.Screen name="CustomerList" component={CustomerListScreen} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
      <Stack.Screen name="CustomerForm" component={CustomerFormScreen} />
    </Stack.Navigator>
  );
}
