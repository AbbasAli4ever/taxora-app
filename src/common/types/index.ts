// ─── Backend API Envelope ─────────────────────────────────────────────────────
// Exact shape: { success, message, data } per MOBILE_RN_SETUP_GUIDE §0

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string | string[];
  error: string;
  statusCode: number;
}

export interface PaginatedData<T> {
  data: T[];
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
}

// ─── Domain Models ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

export interface Company {
  id: string;
  name: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ─── Auth — three login response shapes (§4.1) ────────────────────────────────

export interface LoginResponseDirect {
  accessToken: string;
  refreshToken: string;
  user: User;
  company: Company;
}

export interface LoginResponseMFA {
  requires2fa: true;
  tempToken: string;
  method: 'totp' | 'email';
}

export interface LoginResponseCompanySelect {
  requiresCompanySelection: true;
  tempToken: string;
  companies: Company[];
}

export type LoginResponse = LoginResponseDirect | LoginResponseMFA | LoginResponseCompanySelect;

// ─── UI Types ─────────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type InputVariant = 'default' | 'error' | 'success';

export type StatusColor = 'info' | 'success' | 'warning' | 'danger' | 'muted';

export type DocumentStatus =
  | 'DRAFT'
  | 'SENT'
  | 'OPEN'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'VOID'
  | 'REJECTED'
  | 'CANCELLED'
  | 'PENDING'
  | 'APPROVED'
  | 'ACCEPTED'
  | 'EXPIRED';

// ─── Navigation Param Lists ───────────────────────────────────────────────────

export type RootStackParamList = {
  Auth: undefined;
  CompanySelect: {
    mode?: 'post-login' | 'in-app';
    tempToken?: string;
    companies?: Company[];
  };
  App: undefined;
};

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  MFAChallenge: { tempToken: string; method: 'totp' | 'email'; email: string; password: string };
};

export type AppTabParamList = {
  HomeStack: undefined;
  SalesStack: undefined;
  ExpensesStack: undefined;
  ApprovalsStack: undefined;
  MoreStack: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  QuickStats: { type: string };
  ActivityFeed: undefined;
};

export type SalesStackParamList = {
  InvoiceList: undefined;
  InvoiceDetail: { id: string };
  InvoiceForm: { id?: string };
  InvoiceSend: { id: string };
  InvoicePayment: { id: string };
  EstimateList: undefined;
  EstimateDetail: { id: string };
  EstimateForm: { id?: string };
  EstimateConvert: { id: string };
  CustomerList: undefined;
  CustomerDetail: { id: string };
  CustomerForm: { id?: string };
};

export type ExpensesStackParamList = {
  ExpenseList: undefined;
  ExpenseDetail: { id: string };
  ExpenseForm: { id?: string };
  ReceiptCamera: undefined;
  ReceiptConfirm: { imageUri: string };
  CategoryPicker: undefined;
  BillList: undefined;
  BillDetail: { id: string };
  BillForm: { id?: string };
  BillPay: { id: string };
  VendorPicker: undefined;
  VendorList: undefined;
  VendorDetail: { id: string };
  VendorForm: { id?: string };
};

export type ApprovalsStackParamList = {
  ApprovalQueue: undefined;
  ApprovalDetail: { id: string };
  ApprovalDecision: { id: string; action: 'approve' | 'reject' };
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  Timer: undefined;
  TimeEntryList: undefined;
  TimeEntryForm: { id?: string };
  TimeSubmit: undefined;
  ProjectList: undefined;
  ProjectDetail: { id: string };
  ProjectProfit: { id: string };
  BankAccountList: undefined;
  BankTxnList: { accountId: string };
  BankTxnDetail: { id: string };
  ReconciliationView: { id: string };
  ReportPL: undefined;
  ReportBS: undefined;
  ReportCashFlow: undefined;
  ReportARAging: undefined;
  ReportAPAging: undefined;
  ReportSalesByCustomer: undefined;
  ProductList: undefined;
  ProductDetail: { id: string };
  ProductStockCard: { id: string };
  NotificationInbox: undefined;
  NotificationSettings: undefined;
  Profile: undefined;
  ChangePassword: undefined;
  CurrencyPref: undefined;
  About: undefined;
};
