import { api } from './api';

export interface ICategory {
  _id: string;
  name: string;
  slug: string;
  isActive: boolean;
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
  year?: string;
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

export const uploadGalleryImages = async (projectId: string, files: FileList | File[]) => {
  const formData = new FormData();
  Array.from(files).forEach((file) => {
    formData.append('gallery', file);
  });

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
