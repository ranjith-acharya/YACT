import api from './api';

export const authService = {
  login: (credentials) => api.post('/login', credentials),
  logout: () => api.post('/logout'),
  me: () => api.get('/me'),
  getProfile: () => api.get('/profile'),
  updateProfile: (data) => {
    if (data instanceof FormData) {
      return api.post('/profile', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    return api.post('/profile', data);
  },
};
