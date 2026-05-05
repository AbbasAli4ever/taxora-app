# FinanX React Native — Codebase Setup Guide

> **For the RN engineer / build agent.** Read this file before writing a single line of code. It tells you exactly how the existing NestJS backend works, what contracts the mobile app must honour, and how to scaffold the RN project to match.

---

## 0. What Already Exists (Do Not Re-Build)

The backend is a **production NestJS + PostgreSQL + Prisma** monorepo at `finanx_backend/`.

- **Global API prefix:** `api/v1` — every endpoint is under `/api/v1/...`
- **Swagger docs:** `GET /api/docs` (in development)
- **Auth:** JWT (Bearer token in `Authorization` header) + refresh token
- **Validation:** `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true, transform: true` — sending unknown fields returns `400`
- **Standard response envelope:**
  ```json
  { "success": true, "message": "...", "data": { ... } }
  ```
  Errors:
  ```json
  { "success": false, "message": "...", "error": "...", "statusCode": 400 }
  ```

**The mobile app is a client of this API. It does not touch the backend codebase.**

---

## 1. Environment Variables

Create `.env.development` and `.env.production` in the RN project root. Use `react-native-config` or Expo's `app.config.js` to load them.

```env
# ── Backend ──────────────────────────────────────────────
API_BASE_URL=http://localhost:3000/api/v1          # dev (change to prod URL for release)

# ── Push Notifications (Day 103 — set when ready) ───────
FIREBASE_PROJECT_ID=your_firebase_project_id       # FCM for Android + iOS
# APNs is configured via Firebase, no separate key needed in env

# ── Sentry (error tracking) ──────────────────────────────
SENTRY_DSN=https://xxxxx@o0.ingest.sentry.io/0    # add when account is set up

# ── Feature Flags ────────────────────────────────────────
ENABLE_OCR=false                                   # flip to true when Day 102 endpoint ships
ENABLE_PUSH=false                                  # flip to true when Day 103 endpoint ships
```

**Never hardcode the API URL.** Always use `API_BASE_URL` from env.

---

## 2. RN Project Scaffold

```
finanx-mobile/
├── src/
│   ├── api/                    # API client layer
│   │   ├── client.ts           # Axios instance + interceptors
│   │   ├── auth.ts             # Auth endpoints
│   │   ├── invoices.ts         # Invoices endpoints
│   │   └── ...                 # one file per backend module
│   ├── store/                  # Zustand slices
│   │   ├── auth.store.ts       # JWT, user, permissions
│   │   ├── timer.store.ts      # live stopwatch state
│   │   └── ui.store.ts         # theme, active company
│   ├── navigation/
│   │   ├── RootNavigator.tsx   # Auth stack vs App stack gate
│   │   ├── AppNavigator.tsx    # Bottom tabs + stack
│   │   └── linking.ts          # Deep link config
│   ├── screens/                # One folder per screen
│   │   ├── auth/
│   │   ├── home/
│   │   ├── invoices/
│   │   └── ...
│   ├── components/             # Shared components
│   ├── hooks/                  # useQuery wrappers per resource
│   ├── utils/
│   │   ├── currency.ts         # Intl.NumberFormat helpers
│   │   ├── date.ts             # date-fns helpers
│   │   └── storage.ts          # MMKV wrapper
│   └── constants/
│       └── queryKeys.ts        # All React Query cache keys in one place
├── .env.development
├── .env.production
└── app.json / app.config.js
```

---

## 3. API Client Setup

### 3.1 Axios instance (`src/api/client.ts`)

```ts
import axios from 'axios';
import Config from 'react-native-config';
import { getToken, getRefreshToken, saveToken, clearTokens } from '../utils/storage';

export const api = axios.create({
  baseURL: Config.API_BASE_URL,      // e.g. "http://localhost:3000/api/v1"
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach JWT ─────────────────────
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor: handle 401 + token refresh ────
let isRefreshing = false;
let failedQueue: any[] = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const refreshToken = await getRefreshToken();
        const { data } = await api.post('/auth/refresh', { refreshToken });
        const newToken = data.data.accessToken;
        await saveToken(newToken, data.data.refreshToken);
        failedQueue.forEach((p) => p.resolve(newToken));
        failedQueue = [];
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        failedQueue.forEach((p) => p.reject(error));
        failedQueue = [];
        await clearTokens();
        // Navigate to login — handled by auth store subscriber
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);
```

### 3.2 Token storage (`src/utils/storage.ts`)

Use **MMKV** (not AsyncStorage — MMKV is synchronous and faster):

```ts
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

export const getToken = () => storage.getString('auth.accessToken') ?? null;
export const getRefreshToken = () => storage.getString('auth.refreshToken') ?? null;
export const saveToken = (access: string, refresh: string) => {
  storage.set('auth.accessToken', access);
  storage.set('auth.refreshToken', refresh);
};
export const clearTokens = () => {
  storage.delete('auth.accessToken');
  storage.delete('auth.refreshToken');
};
```

---

## 4. Auth Flow (Exact API Contracts)

All auth endpoints are under `/api/v1/auth/`.

### 4.1 Login
```
POST /auth/login
Body: { email: string, password: string }
```
Three possible response shapes — check `data` shape:

```ts
// Shape A — direct success (single-company user)
{ accessToken, refreshToken, user: { id, email, firstName, lastName }, company: { id, name } }

// Shape B — MFA required
{ requires2fa: true, tempToken: string, method: 'totp'|'email' }

// Shape C — multi-company selection required
{ requiresCompanySelection: true, tempToken: string, companies: [{ id, name }] }
```

### 4.2 Select company (after Shape C)
```
POST /auth/select-company
Body: { companyId: string, tempToken: string }
Response: { accessToken, refreshToken, user, company }
```

### 4.3 MFA verify (after Shape B)
```
POST /auth/login
Body: { email, password, twoFactorCode: string }
Response: Shape A or Shape C
```

### 4.4 Refresh token
```
POST /auth/refresh
Body: { refreshToken: string }
Response: { accessToken, refreshToken }
```

### 4.5 Get current user
```
GET /auth/me                      → { id, email, firstName, lastName, avatarUrl, company }
GET /auth/my-permissions          → { permissions: string[] }   (e.g. ["invoice:create", ...])
GET /auth/my-companies            → { companies: [{ id, name }] }
```
**Call `GET /auth/me` and `GET /auth/my-permissions` in parallel on app launch.** Store permissions in Zustand — all UI gating reads from there, never re-fetches mid-session.

### 4.6 Switch company (in-app)
```
POST /auth/switch-company
Body: { companyId: string }
Response: { accessToken, refreshToken }
```
After success: save new tokens + call `queryClient.clear()` to prevent cross-company data leaks.

### 4.7 Logout
```
POST /auth/logout
Body: { refreshToken: string }
```
Then clear MMKV + queryClient + navigate to Login.

### 4.8 Forgot / Reset password
```
POST /auth/forgot-password    Body: { email: string }
GET  /auth/validate-reset-token?token=xxx
POST /auth/reset-password     Body: { token: string, newPassword: string }
```

---

## 5. Zustand Auth Store (`src/store/auth.store.ts`)

```ts
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  company: Company | null;
  permissions: string[];           // flat array: ["invoice:create", "invoice:view", ...]
  isAuthenticated: boolean;
  setAuth: (user: User, company: Company, permissions: string[]) => void;
  clearAuth: () => void;
  hasPermission: (perm: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  company: null,
  permissions: [],
  isAuthenticated: false,
  setAuth: (user, company, permissions) =>
    set({ user, company, permissions, isAuthenticated: true }),
  clearAuth: () =>
    set({ user: null, company: null, permissions: [], isAuthenticated: false }),
  hasPermission: (perm) => get().permissions.includes(perm),
}));
```

**Usage in any component:**
```ts
const canCreate = useAuthStore((s) => s.hasPermission('invoice:create'));
if (!canCreate) return null; // hide the button
```

---

## 6. React Query Setup

Use **TanStack Query v5**. Configure the QueryClient in the app root:

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,        // 60s default — override per-query as documented in screen MDs
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
});
```

### Cache key convention

All cache keys are in `src/constants/queryKeys.ts`. Follow the exact keys documented in each screen MD:

```ts
export const QK = {
  invoices: {
    list: (filters?: object) => ['invoices', 'list', filters ?? {}],
    detail: (id: string) => ['invoices', 'detail', id],
    summary: () => ['invoices', 'summary'],
  },
  customers: {
    list: (filters?: object) => ['customers', 'list', filters ?? {}],
    detail: (id: string) => ['customers', 'detail', id],
  },
  // ... mirror each screen MD's "Cache key" section exactly
} as const;
```

---

## 7. Navigation Structure

```
RootNavigator
├── AuthStack (unauthenticated)
│   ├── Splash
│   ├── Login
│   ├── ForgotPassword
│   ├── ResetPassword
│   ├── MFA
│   └── CompanySwitcher (post-login variant)
└── AppStack (authenticated)
    └── BottomTabs
        ├── Tab 1: Home
        │   └── HomeDashboard → QuickStats, ActivityFeed
        ├── Tab 2: Sales
        │   ├── InvoiceList → InvoiceDetail → InvoiceForm, InvoiceSend, InvoicePayment
        │   └── EstimateList → EstimateDetail → EstimateForm, EstimateConvert
        ├── Tab 3: Expenses
        │   ├── ExpenseList → ExpenseDetail → ExpenseForm
        │   ├── ExpenseReceiptCamera → ExpenseReceiptConfirm
        │   ├── BillList → BillDetail → BillForm, BillPay
        │   └── CustomerList / VendorList (picker and browse)
        ├── Tab 4: Approvals
        │   └── ApprovalsQueue → ApprovalsDetail → ApprovalsDecision
        └── Tab 5: More
            ├── TimeTimer
            ├── TimeList → TimeForm, TimeSubmit
            ├── ProjectList → ProjectDetail → ProjectProfitability
            ├── ProductList → ProductDetail → ProductStockCard
            ├── BankingAccountList → BankingTxnList → BankingTxnDetail, BankingReconciliationView
            ├── Reports hub → ReportPL, ReportBS, ReportARaging, ReportAPaging,
            │                  ReportSalesByCustomer, ReportCashFlow
            ├── NotificationsInbox → NotificationsSettings
            └── ProfileScreen → ChangePassword, CurrencyPrefs, CompanySettings, AboutScreen
```

### Deep link config (`src/navigation/linking.ts`)

```ts
export const linking = {
  prefixes: ['finanx://'],
  config: {
    screens: {
      AppStack: {
        screens: {
          InvoiceDetail: 'invoice/:id',
          ExpenseDetail: 'expense/:id',
          BillDetail:    'bill/:id',
          ApprovalsDetail: 'approvals/:id',
          ProjectDetail: 'project/:id',
          VendorDetail:  'vendor/:id',
          CustomerDetail:'customer/:id',
        },
      },
    },
  },
};
```

---

## 8. Permissions Reference

Permissions are returned from `GET /auth/my-permissions` as plain strings. Below is the complete set relevant to mobile screens:

| Area | Permissions |
|------|------------|
| Invoices | `invoice:view` `invoice:create` `invoice:edit` `invoice:delete` `invoice:send` |
| Estimates | `estimate:view` `estimate:create` `estimate:edit` `estimate:delete` |
| Bills | `bill:view` `bill:create` `bill:edit` `bill:delete` |
| Expenses | `expense:view` `expense:create` `expense:edit` `expense:delete` `expense:approve` |
| Customers | `customer:view` `customer:create` `customer:edit` `customer:delete` |
| Vendors | `vendor:view` `vendor:create` `vendor:edit` `vendor:delete` |
| Products | `product:view` `product:create` `product:edit` `product:delete` |
| Inventory | `inventory:view` `inventory:adjust` |
| Approvals | `approval:view` `approval:approve` `approval:manage` |
| Time Entries | `time_entry:view` `time_entry:create` `time_entry:edit` `time_entry:delete` `time_entry:approve` |
| Projects | `project:view` `project:create` `project:edit` `project:delete` |
| Banking | `bank_account:view` `bank_account:reconcile` `bank_transaction:categorize` |
| Reports | `report:view_basic` |
| Dashboard | `dashboard:view` |
| Currencies | `currency:view` `currency:manage` |
| Audit Trail | `audit:view` |
| Notifications | `notification:view` `notification:manage` |
| Users | `user:view` `user:invite` `user:edit` `user:delete` |
| Company | `company:view` `company:edit` |
| Recurring | `recurring:view` `recurring:manage` |

**Pattern used in every component:**
```tsx
const { hasPermission } = useAuthStore();
if (!hasPermission('invoice:create')) return null;
```

---

## 9. Standard Error Handling Pattern

All API errors follow the same envelope. Create one central handler:

```ts
// src/utils/apiError.ts
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? fallback;
  }
  return fallback;
}
```

In mutations:
```ts
onError: (error) => {
  Toast.show(getApiErrorMessage(error, 'Something went wrong'));
}
```

For field-level errors (RHF):
```ts
// Backend returns: { statusCode: 400, message: ["email must be an email"], error: "Bad Request" }
// Parse message array and call setError() per field
```

---

## 10. Key Backend Conventions the Mobile App Must Respect

| Convention | Detail |
|---|---|
| **Date format** | All dates sent to the API must be ISO 8601 strings: `"2025-07-01"` or `"2025-07-01T14:30:00.000Z"` |
| **IDs** | All IDs are UUIDs (`string`). Never send integers. |
| **Amounts** | All monetary amounts are plain `number` (float). No string encoding. |
| **Duration (time entries)** | Sent as decimal hours: `1.5` = 1h 30m. Min `0.01`. |
| **Boolean query params** | Send as string `"true"` / `"false"` (query param limitation) — backend uses `@Transform` to parse. |
| **Pagination** | All list endpoints use `page` (1-based) + `limit`. Response always includes `page, limit, totalPages, totalItems`. |
| **Whitelist validation** | Never send extra fields not in the DTO — backend returns `400 Bad Request`. |
| **Multipart uploads** | Attachments use `multipart/form-data` with field name `file` (single) or `files` (multiple). |
| **Currency** | Amounts stored in the document's currency. Exchange rate applied at creation. Mobile must pass `currencyCode` and `exchangeRate` when creating cross-currency documents. |
| **Status enums** | All status values are SCREAMING_SNAKE_CASE: `DRAFT`, `OPEN`, `PARTIALLY_PAID`, etc. |

---

## 11. Recommended Package List

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.x",
    "axios": "^1.x",
    "zustand": "^4.x",
    "react-native-mmkv": "^2.x",
    "react-navigation/native": "^7.x",
    "@react-navigation/bottom-tabs": "^7.x",
    "@react-navigation/stack": "^7.x",
    "react-native-screens": "^3.x",
    "react-native-safe-area-context": "^4.x",
    "react-hook-form": "^7.x",
    "@hookform/resolvers": "^3.x",
    "zod": "^3.x",
    "react-native-bottom-sheet": "^5.x",
    "react-native-reanimated": "^3.x",
    "react-native-gesture-handler": "^2.x",
    "react-native-image-picker": "^7.x",
    "react-native-camera": "^4.x",
    "react-native-device-info": "^10.x",
    "react-native-config": "^1.x",
    "date-fns": "^3.x",
    "@shopify/flash-list": "^1.x",
    "react-native-share": "^10.x",
    "@sentry/react-native": "^5.x"
  }
}
```

---

## 12. Backend Modules → Mobile Screen Map

Quick reference for which backend module each screen calls:

| Mobile Screen Area | Backend Module(s) | Controller prefix |
|---|---|---|
| Auth | `auth`, `users` | `/auth`, `/users` |
| Dashboard | `dashboard` | `/dashboard` |
| Invoices | `invoices` | `/invoices` |
| Estimates | `estimates` | `/estimates` |
| Bills | `bills` | `/bills` |
| Expenses | `expenses` | `/expenses` |
| Customers | `customers` | `/customers` |
| Vendors | `vendors` | `/vendors` |
| Products | `products`, `inventory` | `/products`, `/inventory` |
| Approvals | `approvals` | `/approvals` |
| Time Tracking | `time-entries` | `/time-entries` |
| Projects | `projects` | `/projects` |
| Banking | `banking` | `/banking` |
| Reports | `reports` | `/reports` |
| Notifications | `notifications` | `/notifications` |
| Profile | `users`, `companies` | `/users/me`, `/companies` |
| Company Settings | `companies` | `/companies` |
| Currencies | `currencies` | `/currencies` |

---

## 13. What to Build First (Phase A Checklist)

Follow this exact order — each item is a prerequisite for the next:

- [ ] 1. Scaffold RN project (bare workflow or Expo SDK 51+)
- [ ] 2. Install packages from §11
- [ ] 3. Set up `.env.development` with `API_BASE_URL` pointing at local backend
- [ ] 4. Implement `src/api/client.ts` (Axios + interceptors) per §3
- [ ] 5. Implement `src/utils/storage.ts` (MMKV) per §3.2
- [ ] 6. Implement `useAuthStore` (Zustand) per §5
- [ ] 7. Set up QueryClient + QueryClientProvider at app root per §6
- [ ] 8. Set up `RootNavigator` with Auth stack vs App stack gate per §7
- [ ] 9. Build `Splash` screen — call `GET /auth/me` + `GET /auth/my-permissions` in parallel
- [ ] 10. Build `Login` screen — handle all 3 response shapes per §4.1
- [ ] 11. Build `HomeDashboard` — `GET /dashboard/financial-overview` etc.
- [ ] 12. Build `InvoiceList` + `InvoiceDetail`
- [ ] 13. Build `ExpenseList` + `ExpenseDetail`

Once Phase A screens are working end-to-end against the live backend, proceed to the Phase B batches in the order listed in `MOBILE_APP_SCREENS_INDEX.md`.

---

## 14. Backend Local Dev — How to Run

If you need to run the backend locally for testing:

```bash
cd finanx_backend
cp .env.example .env          # fill in DATABASE_URL + JWT_SECRET
npm install
npx prisma migrate dev        # apply migrations
npm run prisma:seed           # seed roles, permissions, base data
npm run start:dev             # starts on port 3000
```

Swagger UI available at: `http://localhost:3000/api/docs`

The seed creates:
- A default `Admin` role with all permissions
- Base permission set for Standard, Limited, and Reports-only roles
- Default currencies (USD, EUR, GBP, CAD, AUD, INR, JPY)

**First user + company must be created manually via the registration endpoint or direct DB seed** — there is no public `/register` route in production.

---

*This guide is the single source of truth for RN ↔ backend integration. Every endpoint shape is verified against the actual controller files. For screen-level detail (exact payloads, cache keys, offline behavior), read the corresponding `documentation/mobile/MOBILE_*.md` file.*
