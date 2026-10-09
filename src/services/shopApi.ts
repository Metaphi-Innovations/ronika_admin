import { api } from './api';

export interface IShopCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface IShopProductImage {
  _id?: string;
  url: string;
  filename: string;
  originalName: string;
  width: number;
  height: number;
  aspectRatio: number;
  alt?: string;
  label?: string;
  order: number;
}

export interface IShopProduct {
  _id: string;
  name: string;
  slug: string;
  category: IShopCategory | string;
  shortDescription: string;
  description: string;
  price: number;
  currency: string;
  mainImage: {
    url: string;
    filename: string;
    width: number;
    height: number;
    aspectRatio: number;
  };
  images: IShopProductImage[];
  details?: {
    medium?: string;
    dimensions?: string;
    materials?: string;
    year?: string;
    availability?: string;
    bulletPoints?: string[];
  };
  stockQuantity: number;
  published: boolean;
  displayOrder: number;
}

export const getShopCategories = async () => {
  const res = await api.get('/admin/shop/categories');
  return res.data;
};

export const createShopCategory = async (data: Partial<IShopCategory>) => {
  const res = await api.post('/admin/shop/categories', data);
  return res.data;
};

export const updateShopCategory = async (id: string, data: Partial<IShopCategory>) => {
  const res = await api.put(`/admin/shop/categories/${id}`, data);
  return res.data;
};

export const reorderShopCategories = async (items: Array<{ _id: string; displayOrder: number }>) => {
  const res = await api.put('/admin/shop/categories/reorder', { items });
  return res.data;
};

export const deleteShopCategory = async (id: string) => {
  const res = await api.delete(`/admin/shop/categories/${id}`);
  return res.data;
};

export const getShopProducts = async (params?: { category?: string; published?: boolean }) => {
  const res = await api.get('/admin/shop/products', { params });
  return res.data;
};

export const getShopProductBySlug = async (slug: string) => {
  const res = await api.get(`/admin/shop/products/${slug}`);
  return res.data;
};

export const createShopProduct = async (formData: FormData) => {
  const res = await api.post('/admin/shop/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const updateShopProduct = async (id: string, data: FormData | Partial<IShopProduct>) => {
  const isFormData = data instanceof FormData;
  const res = await api.put(`/admin/shop/products/${id}`, data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return res.data;
};

export const uploadShopProductImages = async (id: string, formData: FormData) => {
  const res = await api.post(`/admin/shop/products/${id}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const reorderShopProducts = async (items: Array<{ _id: string; displayOrder: number }>) => {
  const res = await api.put('/admin/shop/products/reorder', { items });
  return res.data;
};

export const reorderShopProductImages = async (id: string, orderUpdates: Array<{ imageId: string; order: number }>) => {
  const res = await api.put(`/admin/shop/products/${id}/images/reorder`, { orderUpdates });
  return res.data;
};

export const deleteShopProductImage = async (id: string, imageId: string) => {
  const res = await api.delete(`/admin/shop/products/${id}/images/${imageId}`);
  return res.data;
};

export const deleteShopProduct = async (id: string) => {
  const res = await api.delete(`/admin/shop/products/${id}`);
  return res.data;
};
