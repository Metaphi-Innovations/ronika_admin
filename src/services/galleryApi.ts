import { api } from './api';

export interface IGalleryCategory {
  _id: string;
  name: string;
}

export interface ILayoutItem {
  x: number;
  y: number;
  w: number;
  h: number;
  v?: number;
}

export interface ILayouts {
  lg?: ILayoutItem;
  md?: ILayoutItem;
  sm?: ILayoutItem;
  xs?: ILayoutItem;
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
  layouts?: ILayouts;
  layoutContexts?: Record<string, ILayouts>;
}



export const getGalleryImages = async (params?: { category?: string; published?: boolean }) => {
  const res = await api.get('/admin/gallery/images', { params });
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

export const reorderGalleryImages = async (data: { items: Array<{ _id: string; displayOrder: number; layouts?: any }>; contextKey: string }) => {
  const res = await api.put('/admin/gallery/images/reorder', data);
  return res.data;
};

export const deleteGalleryImage = async (id: string) => {
  const res = await api.delete(`/admin/gallery/images/${id}`);
  return res.data;
};
