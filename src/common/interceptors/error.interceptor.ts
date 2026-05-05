import { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getRefreshToken, saveTokens, clearTokens } from '@common/utils/storage';
import { API_ENDPOINTS } from '@common/constants';

// Extend AxiosRequestConfig to track retry flag
interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

type QueueEntry = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

let isRefreshing = false;
let failedQueue: QueueEntry[] = [];

function flushQueue(token: string | null, error: unknown = null) {
  failedQueue.forEach((entry) => {
    if (token) entry.resolve(token);
    else entry.reject(error);
  });
  failedQueue = [];
}

export function attachErrorInterceptor(client: AxiosInstance): void {
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as RetryableConfig | undefined;

      if (error.response?.status === 401 && original && !original._retry) {
        if (isRefreshing) {
          // Queue this request until refresh completes
          return new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((token) => {
            if (original.headers) original.headers.Authorization = `Bearer ${token}`;
            return client(original);
          });
        }

        original._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = getRefreshToken();
          if (!refreshToken) throw new Error('No refresh token');

          const { data } = await client.post(API_ENDPOINTS.AUTH.REFRESH, { refreshToken });
          const newAccess: string = data.data.accessToken;
          const newRefresh: string = data.data.refreshToken;

          saveTokens(newAccess, newRefresh);
          client.defaults.headers.common.Authorization = `Bearer ${newAccess}`;
          flushQueue(newAccess);

          if (original.headers) original.headers.Authorization = `Bearer ${newAccess}`;
          return client(original);
        } catch (refreshError) {
          flushQueue(null, refreshError);
          clearTokens();
          // Auth store reacts to MMKV clear — RootNavigator re-renders to Auth stack
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    },
  );
}
