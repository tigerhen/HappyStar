async function req(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "request_failed" }));
    throw Object.assign(new Error(err.error), { status: res.status, code: err.error });
  }
  return res.json();
}

export const api = {
  me: () => req("GET", "/api/me"),
  login: (payload) => req("POST", "/api/login", payload),
  logout: () => req("POST", "/api/logout"),
  children: () => req("GET", "/api/children").catch(() => []),
  tasks: () => req("GET", "/api/tasks"),
  completeTask: (id) => req("POST", `/api/tasks/${id}/complete`),
  rewards: () => req("GET", "/api/rewards"),
  redeem: (id) => req("POST", `/api/rewards/${id}/redeem`),
  calendar: (month) => req("GET", `/api/calendar?month=${month}`),
  growthPlans: () => req("GET", "/api/growth-plans"),
  growthPlanProgress: (planId, itemId, delta) => req("PATCH", `/api/growth-plans/${planId}/items/${itemId}/progress`, { delta }),
  growthPlanDeliverable: (planId, itemId, done) => req("PATCH", `/api/growth-plans/${planId}/deliverables/${itemId}`, { done }),
  pending: () => req("GET", "/api/redemptions?status=pending"),
  approve: (id) => req("POST", `/api/redemptions/${id}/approve`),
  reject: (id, note) => req("POST", `/api/redemptions/${id}/reject`, { note }),
  adjust: (payload) => req("POST", "/api/adjust", payload),
  logs: (childId) => req("GET", "/api/logs" + (childId ? `?childId=${childId}` : "")),
  capacity: () => req("GET", "/api/admin/capacity"),
  setPin: (payload) => req("POST", "/api/admin/pin", payload),
  adminCreate: (kind, item) => req("POST", `/api/admin/${kind}`, item),
  adminUpdate: (kind, id, item) => req("PUT", `/api/admin/${kind}/${id}`, item),
  adminDelete: (kind, id) => req("DELETE", `/api/admin/${kind}/${id}`),
  adminGrowthPlans: () => req("GET", "/api/admin/growth-plans"),
  adminCreateGrowthPlan: (item) => req("POST", "/api/admin/growth-plans", item),
  adminUpdateGrowthPlan: (id, item) => req("PUT", `/api/admin/growth-plans/${id}`, item),
  adminDeleteGrowthPlan: (id) => req("DELETE", `/api/admin/growth-plans/${id}`),
  adminGrowthPlanProgress: (planId, itemId, delta) => req("PATCH", `/api/admin/growth-plans/${planId}/items/${itemId}/progress`, { delta }),
  adminGrowthPlanDeliverable: (planId, itemId, done) => req("PATCH", `/api/admin/growth-plans/${planId}/deliverables/${itemId}`, { done }),
  adminSettleGrowthPlan: (planId) => req("POST", `/api/admin/growth-plans/${planId}/settle`),
};
