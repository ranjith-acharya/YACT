import api from './api';

export const areaService = {
  getAll: () => api.get('/areas'),
};
