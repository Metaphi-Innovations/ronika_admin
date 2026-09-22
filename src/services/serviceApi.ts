import { api } from './api';

export interface IService {
  _id: string;
  title: string;
  description: string;
  icon?: string;
  displayOrder: number;
  isActive: boolean;
}

export const getServices = async () => {
  const response = await api.get('/admin/services');
  return response.data;
};

export const createService = async (data: Partial<IService>) => {
  const response = await api.post('/admin/services', data);
  return response.data;
};

export const updateService = async (id: string, data: Partial<IService>) => {
  const response = await api.put(`/admin/services/${id}`, data);
  return response.data;
};

export const deleteService = async (id: string) => {
  const response = await api.delete(`/admin/services/${id}`);
  return response.data;
};
