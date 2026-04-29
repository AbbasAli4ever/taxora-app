import { homeService, DashboardSummary } from './home.service';
import { getErrorMessage } from '@common/utils';

export const homeController = {
  async getSummary(): Promise<{ data?: DashboardSummary; error?: string }> {
    try {
      const data = await homeService.getDashboardSummary();
      return { data };
    } catch (err) {
      return { error: getErrorMessage(err) };
    }
  },
};
