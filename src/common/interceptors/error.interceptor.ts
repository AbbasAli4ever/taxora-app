import { AxiosInstance, AxiosError } from 'axios';
import { ApiError } from '@common/types';

export function attachErrorInterceptor(client: AxiosInstance): void {
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiError>) => {
      const status  = error.response?.status;
      const message = error.response?.data?.message ?? error.message;

      // Logout on 401 — actual navigation handled by auth store subscriber
      if (status === 401) {
        // Emit a global event; auth store reacts to it
        console.warn('[ApiService] Unauthorized — clearing session');
      }

      const normalized: ApiError = {
        message,
        statusCode: status ?? 0,
        errors:     error.response?.data?.errors,
      };

      return Promise.reject(normalized);
    },
  );
}
