import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ExpensesStackParamList } from '@common/types';
import { ExpenseListScreen } from '@modules/expenses/screens/ExpenseListScreen';
import { ExpenseDetailScreen } from '@modules/expenses/screens/ExpenseDetailScreen';
import { ExpenseFormScreen } from '@modules/expenses/screens/ExpenseFormScreen';
import { ReceiptCameraScreen } from '@modules/expenses/screens/ReceiptCameraScreen';
import { ReceiptConfirmScreen } from '@modules/expenses/screens/ReceiptConfirmScreen';
import { CategoryPickerScreen } from '@modules/expenses/screens/CategoryPickerScreen';
import { BillListScreen } from '@modules/expenses/screens/BillListScreen';
import { BillDetailScreen } from '@modules/expenses/screens/BillDetailScreen';
import { BillFormScreen } from '@modules/expenses/screens/BillFormScreen';
import { BillPayScreen } from '@modules/expenses/screens/BillPayScreen';
import { VendorPickerScreen } from '@modules/expenses/screens/VendorPickerScreen';
import { VendorListScreen } from '@modules/expenses/screens/VendorListScreen';
import { VendorDetailScreen } from '@modules/expenses/screens/VendorDetailScreen';
import { VendorFormScreen } from '@modules/expenses/screens/VendorFormScreen';

const Stack = createNativeStackNavigator<ExpensesStackParamList>();

export function ExpensesStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ExpenseList" component={ExpenseListScreen} />
      <Stack.Screen name="ExpenseDetail" component={ExpenseDetailScreen} />
      <Stack.Screen name="ExpenseForm" component={ExpenseFormScreen} />
      <Stack.Screen name="ReceiptCamera" component={ReceiptCameraScreen} />
      <Stack.Screen name="ReceiptConfirm" component={ReceiptConfirmScreen} />
      <Stack.Screen name="CategoryPicker" component={CategoryPickerScreen} />
      <Stack.Screen name="BillList" component={BillListScreen} />
      <Stack.Screen name="BillDetail" component={BillDetailScreen} />
      <Stack.Screen name="BillForm" component={BillFormScreen} />
      <Stack.Screen name="BillPay" component={BillPayScreen} />
      <Stack.Screen name="VendorPicker" component={VendorPickerScreen} />
      <Stack.Screen name="VendorList" component={VendorListScreen} />
      <Stack.Screen name="VendorDetail" component={VendorDetailScreen} />
      <Stack.Screen name="VendorForm" component={VendorFormScreen} />
    </Stack.Navigator>
  );
}
