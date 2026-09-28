import { api } from './api';

export interface ISocialButton {
  _id?: string;
  label: string;
  url: string;
  order: number;
  isActive: boolean;
}

export interface ISiteSettings {
  _id?: string;
  siteTitle: string;
  metaDescription: string;
  contactEmail: string;
  socialLinks: {
    instagram?: string;
    linkedin?: string;
    behance?: string;
    pinterest?: string;
    twitter?: string;
  };
  socialButtons?: ISocialButton[];
  footerText: string;
  logo?: string;
  galleryHeader?: string;
}

export interface IHomeContent {
  _id?: string;
  heroTitle: string;
  heroSubtitle: string;
  heroQuote?: string;
  heroQuoteAuthor?: string;
  heroImage?: {
    url: string;
    filename: string;
  };
  introTitle: string;
  introText: string;
  introImage?: {
    url: string;
    filename: string;
  };
  servicesSectionTitle?: string;
  ctaText: string;
  ctaLink: string;
  featuredProjects?: any[];
}

export interface IAboutContent {
  _id?: string;
  heading: string;
  subheading?: string;
  bioParagraphs: string[];
  headshotImage?: {
    url: string;
    filename: string;
  };
  experience?: Array<{ year: string; role: string; company: string }>;
  awards?: Array<{ year: string; title: string }>;
  ctaText: string;
  ctaLink: string;
}

export interface IContactContent {
  _id?: string;
  heading: string;
  description: string;
  email: string;
  phone?: string;
  location?: string;
  socialLinks: {
    instagram?: string;
    linkedin?: string;
    behance?: string;
    pinterest?: string;
  };
  ctaText: string;
}

// Site Settings APIs
export const getSiteSettings = async () => {
  const res = await api.get('/content/settings');
  return res.data;
};

export const updateSiteSettings = async (data: Partial<ISiteSettings>) => {
  const res = await api.put('/admin/content/settings', data);
  return res.data;
};

// Home Content APIs
export const getHomeContent = async () => {
  const res = await api.get('/content/home');
  return res.data;
};

export const updateHomeContent = async (data: Partial<IHomeContent>) => {
  const res = await api.put('/admin/content/home', data);
  return res.data;
};

export const uploadHomeHero = async (file: File) => {
  const formData = new FormData();
  formData.append('home_hero', file);
  const res = await api.post('/admin/content/home/hero', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const uploadHomeIntro = async (file: File) => {
  const formData = new FormData();
  formData.append('home_intro', file);
  const res = await api.post('/admin/content/home/intro', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// About Content APIs
export const getAboutContent = async () => {
  const res = await api.get('/content/about');
  return res.data;
};

export const updateAboutContent = async (data: Partial<IAboutContent>) => {
  const res = await api.put('/admin/content/about', data);
  return res.data;
};

export const uploadAboutHeadshot = async (file: File) => {
  const formData = new FormData();
  formData.append('about_headshot', file);
  const res = await api.post('/admin/content/about/headshot', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// Contact Content APIs
export const getContactContent = async () => {
  const res = await api.get('/content/contact');
  return res.data;
};

export const updateContactContent = async (data: Partial<IContactContent>) => {
  const res = await api.put('/admin/content/contact', data);
  return res.data;
};
