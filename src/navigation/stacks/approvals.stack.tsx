import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ApprovalsStackParamList } from '@common/types';
import { ApprovalQueueScreen } from '@modules/approvals/screens/ApprovalQueueScreen';
import { ApprovalDetailScreen } from '@modules/approvals/screens/ApprovalDetailScreen';
import { ApprovalDecisionScreen } from '@modules/approvals/screens/ApprovalDecisionScreen';

const Stack = createNativeStackNavigator<ApprovalsStackParamList>();

export function ApprovalsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ApprovalQueue" component={ApprovalQueueScreen} />
      <Stack.Screen name="ApprovalDetail" component={ApprovalDetailScreen} />
      <Stack.Screen name="ApprovalDecision" component={ApprovalDecisionScreen} />
    </Stack.Navigator>
  );
}
