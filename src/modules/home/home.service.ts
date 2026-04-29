import { apiService } from '@common/services/api.service';

export interface DashboardSummary {
  greeting: string;
}

export const homeService = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await apiService.get<DashboardSummary>('/home/summary');
    return res.data;
  },
};
