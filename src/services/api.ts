import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to attach Bearer token if saved in localStorage as fallback
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function humanizeErrorMessage(rawMsg: string): string {
  if (!rawMsg || typeof rawMsg !== 'string') {
    return 'An unexpected error occurred. Please try again.';
  }

  // Clean technical prefixes
  let msg = rawMsg
    .replace(/^Validation failed:\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .trim();

  // Slug required
  if (/\bslug\b.*required/i.test(msg) || /Path\s+[`"']?slug[`"']?\s+is\s+required/i.test(msg)) {
    return 'A URL slug is required. Please enter a web-friendly slug (e.g. "my-project").';
  }

  // Title required
  if (/\btitle\b.*required/i.test(msg) || /Path\s+[`"']?title[`"']?\s+is\s+required/i.test(msg)) {
    if (/service/i.test(msg)) return 'A service title is required. Please enter a title.';
    if (/project/i.test(msg)) return 'A project title is required. Please enter a title.';
    if (/product/i.test(msg)) return 'A product title is required. Please enter a title.';
    return 'A title is required. Please enter a title.';
  }

  // Description required
  if (/\bdescription\b.*required/i.test(msg) || /Path\s+[`"']?description[`"']?\s+is\s+required/i.test(msg)) {
    if (/service/i.test(msg)) return 'A service description is required. Please enter a description.';
    if (/project/i.test(msg)) return 'A project description is required. Please enter a description.';
    if (/product/i.test(msg)) return 'A product description is required. Please enter a description.';
    return 'A description is required. Please enter a description.';
  }

  // Name required
  if (/\bname\b.*required/i.test(msg) || /Path\s+[`"']?name[`"']?\s+is\s+required/i.test(msg)) {
    return 'A name is required. Please enter a name.';
  }

  // Category required
  if (/\bcategory\b.*required/i.test(msg) || /Path\s+[`"']?category[`"']?\s+is\s+required/i.test(msg)) {
    return 'Please select a valid category from the dropdown.';
  }

  // Cover image / Hero image required
  if (/heroimage|cover\s*image/i.test(msg) && /required/i.test(msg)) {
    return 'A cover image is required. Please upload an image.';
  }

  // Generic Mongoose "Path `xyz` is required"
  const genericReqMatch = msg.match(/Path\s+[`"']?([a-zA-Z0-9_]+)[`"']?\s+is\s+required/i);
  if (genericReqMatch) {
    const field = genericReqMatch[1].replace(/([A-Z])/g, ' $1').toLowerCase();
    return `The ${field} field is required. Please provide a value.`;
  }

  // Duplicate key (E11000)
  if (msg.includes('E11000') || msg.includes('duplicate key') || msg.toLowerCase().includes('already exists')) {
    if (/shopcategor|projectcategor|categor/i.test(msg)) {
      return 'A category with this name already exists. Please choose a different name.';
    }
    if (/product/i.test(msg)) {
      return 'A product with this name already exists. Please choose a different name.';
    }
    if (/project/i.test(msg)) {
      return 'A project with this name already exists. Please choose a different name.';
    }
    return 'An item with this name or slug already exists. Please choose a different one.';
  }

  // CastError / ObjectId
  if (msg.includes('Cast to') || msg.includes('ObjectId')) {
    return 'The requested record could not be found or has an invalid reference.';
  }

  // Network Error / Timeout
  if (msg.includes('Network Error') || msg.includes('ERR_CONNECTION_REFUSED')) {
    return 'Unable to connect to the server. Please check your internet connection or try again later.';
  }

  // Strip remaining backticks or raw field prefix like "slug: Path..."
  msg = msg.replace(/^[a-zA-Z0-9_]+:\s*/, '').replace(/[`'"]/g, '');

  if (msg.toLowerCase().includes('path slug is required')) {
    return 'A URL slug is required. Please enter a web-friendly slug (e.g. "my-project").';
  }

  return msg.charAt(0).toUpperCase() + msg.slice(1);
}

// Response interceptor to handle session expiration globally and unpack meaningful error messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isDeactivated =
      error.response?.data?.code === 'ACCOUNT_DEACTIVATED' ||
      (typeof error.response?.data?.message === 'string' &&
        error.response.data.message.toLowerCase().includes('deactivated'));

    const isPublicAuthPath =
      window.location.pathname === '/login' ||
      window.location.pathname === '/admin/login' ||
      window.location.pathname === '/forgot-password' ||
      window.location.pathname.startsWith('/reset-password');

    if (
      error.response &&
      (error.response.status === 401 || (error.response.status === 403 && isDeactivated))
    ) {
      // Session expired, revoked or account deactivated
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      if (!isPublicAuthPath) {
        const targetUrl = isDeactivated ? '/login?deactivated=true' : '/login';
        window.location.href = targetUrl;
      }
    }

    // Automatically unpack server message so error.message is always meaningful and human-readable
    const reqUrl = error.config?.url || '';
    const rawMsg = error.response?.data?.message || error.response?.data?.error || error.message;
    if (rawMsg && typeof rawMsg === 'string') {
      let friendlyMsg = humanizeErrorMessage(rawMsg);
      if (
        (rawMsg.includes('E11000') || rawMsg.includes('duplicate key') || rawMsg.toLowerCase().includes('already exist')) &&
        reqUrl.includes('categor')
      ) {
        friendlyMsg = 'A category with this name already exists. Please choose a different name.';
      }
      error.message = friendlyMsg;
      if (error.response?.data) {
        error.response.data.message = friendlyMsg;
      }
    }

    return Promise.reject(error);
  }
);
