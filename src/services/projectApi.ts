import { api } from './api';

export interface ICategory {
  _id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export interface ILayoutItem {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ILayouts {
  lg?: ILayoutItem;
  md?: ILayoutItem;
  sm?: ILayoutItem;
  xs?: ILayoutItem;
}

export interface IImage {
  _id: string;
  url: string;
  filename: string;
  originalName: string;
  width: number;
  height: number;
  aspectRatio: number;
  caption?: string;
  order: number;
  layouts?: ILayouts;
}

export interface IHeroImage {
  url: string;
  filename: string;
  width: number;
  height: number;
  aspectRatio: number;
}

export interface IProject {
  _id: string;
  title: string;
  slug: string;
  subtitle?: string;
  category: ICategory | string;
  role?: string;
  client?: string;
  description?: string;
  details?: string;
  heroImage?: IHeroImage;
  images: IImage[];
  tags: string[];
  featured: boolean;
  published: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ========================
// Projects CRUD
// ========================

export const getProjects = async () => {
  const response = await api.get('/admin/projects');
  return response.data;
};

export const getCategories = async () => {
  const response = await api.get('/admin/projects/categories');
  return response.data;
};

export const createCategory = async (name: string) => {
  const response = await api.post('/admin/projects/categories', { name });
  return response.data;
};

export const updateCategory = async (id: string, name: string) => {
  const response = await api.put(`/admin/projects/categories/${id}`, { name });
  return response.data;
};

export const deleteCategory = async (id: string) => {
  const response = await api.delete(`/admin/projects/categories/${id}`);
  return response.data;
};

export const getProject = async (id: string) => {
  const response = await api.get(`/admin/projects/${id}`);
  return response.data;
};

export const createProject = async (data: Partial<IProject>) => {
  const response = await api.post('/admin/projects', data);
  return response.data;
};

export const updateProject = async (id: string, data: Partial<IProject>) => {
  const response = await api.put(`/admin/projects/${id}`, data);
  return response.data;
};

export const deleteProject = async (id: string) => {
  const response = await api.delete(`/admin/projects/${id}`);
  return response.data;
};

// ========================
// Image Uploads (Multer Multipart)
// ========================

export const uploadHeroImage = async (projectId: string, file: File) => {
  const formData = new FormData();
  formData.append('hero', file);

  const response = await api.post(`/admin/projects/${projectId}/hero`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const uploadGalleryImages = async (projectId: string, items: { file: File, layouts?: any }[]) => {
  const formData = new FormData();
  const layoutsArr: any[] = [];
  items.forEach((item) => {
    formData.append('gallery', item.file);
    layoutsArr.push(item.layouts || null);
  });
  formData.append('layouts', JSON.stringify(layoutsArr));

  const response = await api.post(`/admin/projects/${projectId}/images`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const reorderGalleryImages = async (projectId: string, orderUpdates: { imageId: string; order: number }[]) => {
  const response = await api.put(`/admin/projects/${projectId}/images/reorder`, { orderUpdates });
  return response.data;
};

export const replaceGalleryImage = async (projectId: string, imageId: string, file: File) => {
  const formData = new FormData();
  formData.append('gallery', file);

  const response = await api.put(`/admin/projects/${projectId}/images/${imageId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const deleteGalleryImage = async (projectId: string, imageId: string) => {
  const response = await api.delete(`/admin/projects/${projectId}/images/${imageId}`);
  return response.data;
};
