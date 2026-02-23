import api from './api';

export const postService = {
  getAll: (params) => api.get('/posts', { params }),
  getById: (id) => api.get(`/posts/${id}`),
  create: (formData) => api.post('/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id) => api.delete(`/posts/${id}`),
  toggleLike: (id) => api.post(`/posts/${id}/like`),
  addComment: (postId, body) => api.post(`/posts/${postId}/comments`, { body }),
  deleteComment: (postId, commentId) => api.delete(`/posts/${postId}/comments/${commentId}`),
  toggleCommentLike: (postId, commentId) => api.post(`/posts/${postId}/comments/${commentId}/like`),
};
