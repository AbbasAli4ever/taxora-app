import { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getToken } from '@common/utils/storage';

export function attachAuthInterceptor(client: AxiosInstance): void {
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = getToken(); // synchronous MMKV read
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error),
  );
}
