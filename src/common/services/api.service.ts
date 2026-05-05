import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ENV } from '@config/env';
import { ApiResponse } from '@common/types';
import { attachAuthInterceptor } from '@common/interceptors/auth.interceptor';
import { attachErrorInterceptor } from '@common/interceptors/error.interceptor';

class ApiService {
  readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: ENV.API_BASE_URL, // e.g. http://localhost:3000/api/v1
      timeout: ENV.REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    attachAuthInterceptor(this.client);
    attachErrorInterceptor(this.client);
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const res = await this.client.get<ApiResponse<T>>(url, config);
    return res.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const res = await this.client.post<ApiResponse<T>>(url, data, config);
    return res.data;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const res = await this.client.put<ApiResponse<T>>(url, data, config);
    return res.data;
  }

  async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const res = await this.client.patch<ApiResponse<T>>(url, data, config);
    return res.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const res = await this.client.delete<ApiResponse<T>>(url, config);
    return res.data;
  }
}

export const apiService = new ApiService();
