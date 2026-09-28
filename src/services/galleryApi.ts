import { api } from './api';

export interface IGalleryCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface IGalleryImage {
  _id: string;
  title: string;
  category: IGalleryCategory | string;
  image: {
    url: string;
    filename: string;
    originalName: string;
    width: number;
    height: number;
    aspectRatio: number;
  };
  projectSlug?: string;
  caption?: string;
  displayOrder: number;
  published: boolean;
}

export const getGalleryCategories = async () => {
  const res = await api.get('/gallery/categories');
  return res.data;
};

export const createGalleryCategory = async (data: Partial<IGalleryCategory>) => {
  const res = await api.post('/admin/gallery/categories', data);
  return res.data;
};

export const updateGalleryCategory = async (id: string, data: Partial<IGalleryCategory>) => {
  const res = await api.put(`/admin/gallery/categories/${id}`, data);
  return res.data;
};

export const reorderGalleryCategories = async (items: Array<{ _id: string; displayOrder: number }>) => {
  const res = await api.put('/admin/gallery/categories/reorder', { items });
  return res.data;
};

export const deleteGalleryCategory = async (id: string) => {
  const res = await api.delete(`/admin/gallery/categories/${id}`);
  return res.data;
};

export const getGalleryImages = async (params?: { category?: string; published?: boolean }) => {
  const res = await api.get('/gallery/images', { params });
  return res.data;
};

export const createGalleryImage = async (formData: FormData) => {
  const res = await api.post('/admin/gallery/images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const replaceGalleryImage = async (id: string, formData: FormData) => {
  const res = await api.put(`/admin/gallery/images/${id}/replace`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const updateGalleryImage = async (id: string, data: Partial<IGalleryImage>) => {
  const res = await api.put(`/admin/gallery/images/${id}`, data);
  return res.data;
};

export const reorderGalleryImages = async (items: Array<{ _id: string; displayOrder: number }>) => {
  const res = await api.put('/admin/gallery/images/reorder', { items });
  return res.data;
};

export const deleteGalleryImage = async (id: string) => {
  const res = await api.delete(`/admin/gallery/images/${id}`);
  return res.data;
};
