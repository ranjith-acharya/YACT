import api from './api';

export const memberService = {
  getAll: (params) => api.get('/members', { params }),
  getById: (id) => api.get(`/members/${id}`),
  create: (data) => api.post('/members', data),
  update: (id, data) => {
    if (data instanceof FormData) {
      data.append('_method', 'PUT');
      return api.post(`/members/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    return api.put(`/members/${id}`, data);
  },
  approve: (id) => api.post(`/members/${id}/approve`),
  linkParent: (id, parentMemberId) => api.post(`/members/${id}/link-parent`, { parent_member_id: parentMemberId }),
  unlinkParent: (id) => api.delete(`/members/${id}/unlink-parent`),
  delete: (id) => api.delete(`/members/${id}`),
};
