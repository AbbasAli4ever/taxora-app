import { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@common/constants';

export function attachAuthInterceptor(client: AxiosInstance): void {
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error),
  );
}
