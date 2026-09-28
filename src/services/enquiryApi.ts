import { api } from './api';

export interface IEnquiry {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  productName: string;
  productSlug?: string;
  productId?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export const getEnquiries = async (): Promise<{ success: boolean; data: IEnquiry[] }> => {
  const res = await api.get('/admin/enquiries');
  return res.data;
};

export const toggleEnquiryRead = async (
  id: string,
  isRead?: boolean
): Promise<{ success: boolean; data: IEnquiry }> => {
  const res = await api.patch(`/admin/enquiries/${id}/read`, { isRead });
  return res.data;
};

export const deleteEnquiry = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  const res = await api.delete(`/admin/enquiries/${id}`);
  return res.data;
};
