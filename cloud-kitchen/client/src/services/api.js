import { supabase } from './supabase';

const API_BASE = '/api';

const getAuthHeaders = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch (err) {
    console.error('Error fetching auth session for API headers:', err);
  }
  return {};
};

const request = async (url, options = {}) => {
  const authHeaders = await getAuthHeaders();
  let res;
  try {
    res = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        ...(!options.formData && { 'Content-Type': 'application/json' }),
        ...authHeaders,
        ...options.headers,
      },
      body: options.formData ? options.body : (options.body ? JSON.stringify(options.body) : undefined),
    });
  } catch (netErr) {
    throw new Error(`Network error connecting to backend server: ${netErr.message}`);
  }

  const contentType = res.headers.get('content-type');
  let data = null;
  
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch (parseErr) {
      console.warn(`Failed to parse JSON from ${url}:`, parseErr);
    }
  } else {
    const text = await res.text();
    if (!res.ok) {
      throw new Error(text || `Server returned status ${res.status}`);
    }
  }

  if (!res.ok) {
    throw new Error(data?.message || `Request failed with status ${res.status}`);
  }
  return data;
};

export const api = {
  // Auth
  getMe: () => request('/auth/me'),

  // Menu (public)
  getMenu: () => request('/menu'),
  getMenuItem: (id) => request(`/menu/${id}`),

  // Menu (admin)
  getAdminMenu: () => request('/menu/admin/all'),
  createMenuItem: (formData) => request('/menu/admin', { method: 'POST', body: formData, formData: true }),
  updateMenuItem: (id, formData) => request(`/menu/admin/${id}`, { method: 'PATCH', body: formData, formData: true }),
  updateMenuItemStatus: (id, isAvailable) => request(`/menu/admin/${id}/status`, { method: 'PATCH', body: { isAvailable } }),
  updateMenuItemAddOn: (id, addOnId, enabled) =>
    request(`/menu/admin/${id}/addons/${addOnId}`, { method: 'PATCH', body: { enabled } }),
  deleteMenuItem: (id) => request(`/menu/admin/${id}`, { method: 'DELETE' }),

  // Orders (customer)
  // items: [{ menuItemId, quantity, addOns: [{ addOnId, quantity }] }]
  createOrder: (items, couponCode = null, customerPhone = null) =>
    request('/orders', { method: 'POST', body: { items, couponCode, customerPhone } }),
  getMyOrders: () => request('/orders/my-orders'),
  getOrder: (id) => request(`/orders/${id}`),

  // Orders (admin)
  getAdminOrders: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/orders/admin/all${query ? `?${query}` : ''}`);
  },
  getAdminOrder: (id) => request(`/orders/admin/${id}`),
  updateOrderStatus: (id, status) => request(`/orders/admin/${id}/status`, { method: 'PATCH', body: { status } }),
  updateEstimatedTime: (id, estimatedPickupTime) => request(`/orders/admin/${id}/estimated-time`, { method: 'PATCH', body: { estimatedPickupTime } }),
  cancelOrder: (id) => request(`/orders/admin/${id}/cancel`, { method: 'POST' }),
  completeOrder: (id) => request(`/orders/admin/${id}/complete`, { method: 'POST' }),
  verifyQr: (qrToken) => request('/orders/admin/qr/verify', { method: 'POST', body: { qrToken } }),

  // Restaurant settings
  getSettings: () => request('/settings'),
  updateSettings: (body) => request('/settings/admin', { method: 'PATCH', body }),

  // Email diagnostics (admin)
  getEmailStatus: () => request('/settings/admin/email-status'),
  sendTestEmail: (to) => request('/settings/admin/email-test', { method: 'POST', body: { to } }),

  // Reviews
  getItemReviews: (menuItemId) => request(`/menu/${menuItemId}/reviews`),
  reviewItem: (menuItemId, rating, comment) =>
    request(`/menu/${menuItemId}/reviews`, { method: 'POST', body: { rating, comment } }),
  getRestaurantReviews: () => request('/reviews/restaurant'),
  reviewRestaurant: (rating, comment) =>
    request('/reviews/restaurant', { method: 'POST', body: { rating, comment } }),
  getMyReviews: () => request('/reviews/mine'),
  deleteMyReview: (reviewId) => request(`/reviews/${reviewId}`, { method: 'DELETE' }),
  getAdminReviews: () => request('/reviews/admin/all'),
  setReviewHidden: (reviewId, isHidden) =>
    request(`/reviews/admin/${reviewId}/hidden`, { method: 'PATCH', body: { isHidden } }),
  deleteReview: (reviewId) => request(`/reviews/admin/${reviewId}`, { method: 'DELETE' }),

  // Coupons
  getActiveCoupons: () => request('/coupons/active'),
  validateCoupon: (code, subtotal) => request('/coupons/validate', { method: 'POST', body: { code, subtotal } }),
  getAdminCoupons: () => request('/coupons/admin/all'),
  createCoupon: (body) => request('/coupons/admin', { method: 'POST', body }),
  updateCoupon: (id, body) => request(`/coupons/admin/${id}`, { method: 'PATCH', body }),
  deleteCoupon: (id) => request(`/coupons/admin/${id}`, { method: 'DELETE' }),
};
