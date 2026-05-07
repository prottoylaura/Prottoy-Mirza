import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export const apiService = {
  syncUser: async (userData: any, deviceId: string) => {
    const response = await api.post('/auth/sync', { userData, deviceId });
    return response.data;
  },

  claimReward: async (userId: string, type: 'rewarded' | 'smartlink') => {
    const response = await api.post('/ads/reward', { userId, type });
    return response.data;
  },

  submitWithdrawal: async (userId: string, amount: number, method: string, number: string) => {
    const response = await api.post('/withdraw', { userId, amount, method, number });
    return response.data;
  },

  getWithdrawalHistory: async (userId: string) => {
    const response = await api.get(`/withdraw/history/${userId}`);
    return response.data;
  },

  getReferralStats: async (userId: string) => {
    const response = await api.get(`/referrals/stats/${userId}`);
    return response.data;
  }
};
