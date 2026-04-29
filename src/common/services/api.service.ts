import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ENV } from '@config/env';
import { ApiResponse } from '@common/types';
import { attachAuthInterceptor } from '@common/interceptors/auth.interceptor';
import { attachErrorInterceptor } from '@common/interceptors/error.interceptor';

class ApiService {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: ENV.API_BASE_URL,
      timeout: ENV.REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        Accept:         'application/json',
      },
    });

    attachAuthInterceptor(this.client);
    attachErrorInterceptor(this.client);
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const res: AxiosResponse<ApiResponse<T>> = await this.client.get(url, config);
    return res.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const res: AxiosResponse<ApiResponse<T>> = await this.client.post(url, data, config);
    return res.data;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const res: AxiosResponse<ApiResponse<T>> = await this.client.put(url, data, config);
    return res.data;
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const res: AxiosResponse<ApiResponse<T>> = await this.client.patch(url, data, config);
    return res.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const res: AxiosResponse<ApiResponse<T>> = await this.client.delete(url, config);
    return res.data;
  }

  getAxiosInstance(): AxiosInstance {
    return this.client;
  }
}

export const apiService = new ApiService();
