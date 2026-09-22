import { api } from './api';
import { ICategory } from './projectApi';

export const getCategories = async () => {
  const response = await api.get('/admin/categories');
  return response.data;
};

export const createCategory = async (data: Partial<ICategory>) => {
  const response = await api.post('/admin/categories', data);
  return response.data;
};

export const updateCategory = async (id: string, data: Partial<ICategory>) => {
  const response = await api.put(`/admin/categories/${id}`, data);
  return response.data;
};

export const deleteCategory = async (id: string) => {
  const response = await api.delete(`/admin/categories/${id}`);
  return response.data;
};
