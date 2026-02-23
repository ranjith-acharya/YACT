import api from './api';

export const userService = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  updateStatus: (id, status) => api.patch(`/users/${id}/status`, { status }),
  assignRole: (id, role) => api.post(`/users/${id}/role`, { role }),
  delete: (id) => api.delete(`/users/${id}`),
};
