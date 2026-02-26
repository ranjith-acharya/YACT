import api from './api';

export const memberRequestService = {
  getAll: (params) => api.get('/member-requests', { params }),
  getById: (id) => api.get(`/member-requests/${id}`),
  create: (data) => api.post('/member-requests', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }),
  approve: (id, notes) => api.post(`/member-requests/${id}/approve`, { review_notes: notes }),
  reject: (id, notes) => api.post(`/member-requests/${id}/reject`, { review_notes: notes }),
  downloadTemplate: () => api.get('/member-requests/template', { responseType: 'blob' }),
  bulkImport: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/member-requests/bulk-import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};
