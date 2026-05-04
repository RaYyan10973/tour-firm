const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

async function request(path, options = {}, token) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Ошибка запроса");
  }
  return res.json();
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: (token) => request("/auth/me", {}, token),
  updateMe: (payload, token) => request("/auth/me", { method: "PATCH", body: JSON.stringify(payload) }, token),
  createRequest: (payload, token) => request("/requests", { method: "POST", body: JSON.stringify(payload) }, token),
  myRequests: (token) => request("/requests/my", {}, token),
  allRequests: (token) => request("/requests", {}, token),
  myAssignedRequests: (token) => request("/requests/assigned/my", {}, token),
  takeRequest: (requestId, token) => request(`/requests/${requestId}/take`, { method: "PATCH" }, token),
  createOrder: (payload, token) => request("/orders", { method: "POST", body: JSON.stringify(payload) }, token),
  myOrders: (token) => request("/orders/my", {}, token),
  allOrders: (token) => request("/orders", {}, token),
  payOrder: (orderId, token) => request(`/orders/${orderId}/pay`, { method: "POST" }, token),
  updateOrderStatus: (orderId, status, token) =>
    request(`/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }, token),
  getRequestChat: (requestId, token) => request(`/chat/requests/${requestId}`, {}, token),
  sendRequestChatMessage: (requestId, text, token) =>
    request(`/chat/requests/${requestId}`, { method: "POST", body: JSON.stringify({ text }) }, token),
  notifications: (token) => request("/notifications/my", {}, token),
  createManager: (payload, token) => request("/managers", { method: "POST", body: JSON.stringify(payload) }, token),
  listManagers: (token) => request("/managers", {}, token),
  updateManager: (managerId, payload, token) => request(`/managers/${managerId}`, { method: "PATCH", body: JSON.stringify(payload) }, token),
  deactivateManager: (managerId, token) => request(`/managers/${managerId}/deactivate`, { method: "PATCH" }, token),
  analyticsOverview: (token) => request("/analytics/overview", {}, token),
  analyticsStatusChart: (token) => request("/analytics/status-chart", {}, token),
  analyticsByDay: (token) => request("/analytics/orders-by-day", {}, token),
};
