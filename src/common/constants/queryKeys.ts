// TanStack Query cache key factory — §6 of MOBILE_RN_SETUP_GUIDE
// All screen MDs reference these keys by name — never inline strings.

export const QK = {
  // Auth
  me: () => ['auth', 'me'] as const,
  permissions: () => ['auth', 'permissions'] as const,
  companies: () => ['auth', 'companies'] as const,

  // Dashboard
  dashboard: {
    overview: () => ['dashboard', 'overview'] as const,
    recentActivity: (limit?: number) => ['dashboard', 'recent-activity', limit] as const,
    cashFlow: (period: string) => ['dashboard', 'cash-flow', period] as const,
    analytics: () => ['dashboard', 'analytics'] as const,
  },

  // Invoices
  invoices: {
    list: (filters?: object) => ['invoices', 'list', filters ?? {}] as const,
    detail: (id: string) => ['invoices', 'detail', id] as const,
    summary: () => ['invoices', 'summary'] as const,
    nextNumber: () => ['invoices', 'next-number'] as const,
    statuses: () => ['invoices', 'statuses'] as const,
  },

  // Estimates
  estimates: {
    list: (filters?: object) => ['estimates', 'list', filters ?? {}] as const,
    detail: (id: string) => ['estimates', 'detail', id] as const,
    summary: () => ['estimates', 'summary'] as const,
  },

  // Customers
  customers: {
    list: (filters?: object) => ['customers', 'list', filters ?? {}] as const,
    detail: (id: string) => ['customers', 'detail', id] as const,
  },

  // Expenses
  expenses: {
    list: (filters?: object) => ['expenses', 'list', filters ?? {}] as const,
    detail: (id: string) => ['expenses', 'detail', id] as const,
    summary: () => ['expenses', 'summary'] as const,
  },

  // Bills
  bills: {
    list: (filters?: object) => ['bills', 'list', filters ?? {}] as const,
    detail: (id: string) => ['bills', 'detail', id] as const,
    summary: () => ['bills', 'summary'] as const,
  },

  // Vendors
  vendors: {
    list: (filters?: object) => ['vendors', 'list', filters ?? {}] as const,
    detail: (id: string) => ['vendors', 'detail', id] as const,
  },

  // Approvals
  approvals: {
    myPending: () => ['approvals', 'my-pending'] as const,
    dashboard: () => ['approvals', 'dashboard'] as const,
    detail: (id: string) => ['approvals', 'detail', id] as const,
  },

  // Time entries
  timeEntries: {
    list: (filters?: object) => ['time-entries', 'list', filters ?? {}] as const,
    detail: (id: string) => ['time-entries', 'detail', id] as const,
  },

  // Projects
  projects: {
    list: (filters?: object) => ['projects', 'list', filters ?? {}] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
    profitability: (id: string) => ['projects', 'profitability', id] as const,
  },

  // Banking
  banking: {
    accounts: () => ['banking', 'accounts'] as const,
    transactions: (accountId: string, filters?: object) =>
      ['banking', 'transactions', accountId, filters ?? {}] as const,
    transaction: (id: string) => ['banking', 'transaction', id] as const,
    reconciliation: (id: string) => ['banking', 'reconciliation', id] as const,
  },

  // Reports
  reports: {
    pl: (filters?: object) => ['reports', 'pl', filters ?? {}] as const,
    bs: (filters?: object) => ['reports', 'bs', filters ?? {}] as const,
    cashFlow: (filters?: object) => ['reports', 'cash-flow', filters ?? {}] as const,
    arAging: (filters?: object) => ['reports', 'ar-aging', filters ?? {}] as const,
    apAging: (filters?: object) => ['reports', 'ap-aging', filters ?? {}] as const,
    salesByCustomer: (filters?: object) => ['reports', 'sales-by-customer', filters ?? {}] as const,
  },

  // Products
  products: {
    list: (filters?: object) => ['products', 'list', filters ?? {}] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
    stockCard: (id: string) => ['products', 'stock-card', id] as const,
  },

  // Notifications
  notifications: {
    list: (filters?: object) => ['notifications', 'list', filters ?? {}] as const,
    preferences: () => ['notifications', 'preferences'] as const,
  },

  // Currencies
  currencies: {
    list: () => ['currencies', 'list'] as const,
    base: () => ['currencies', 'base'] as const,
  },
} as const;
