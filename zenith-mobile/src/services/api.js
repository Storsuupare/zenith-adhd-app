import axios from "axios";

const BASE = process.env.EXPO_PUBLIC_API_BASE || "http://localhost:5000";

const api = axios.create({ baseURL: BASE });

let _token = null;

export const setAuthToken = (token) => {
  _token = token;
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

// ── User ──────────────────────────────────────────────────────────────────────
export const fetchUser    = (clerkId) => api.get(`/user/${clerkId}`);
export const createUser   = (data)    => api.post("/user", data);
export const deleteAccount = ()       => api.delete("/user/account");

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const fetchTasks    = (clerkId) => api.get(`/api/tasks?externalId=${clerkId}`);
export const createTask    = (data)    => api.post("/api/tasks", data);
export const completeTask  = (taskId)  => api.post(`/api/tasks/${taskId}/complete`, {});
export const failTask      = (taskId)  => api.post(`/api/tasks/${taskId}/fail`, {});

// ── Daily ─────────────────────────────────────────────────────────────────────
export const claimDailyBonus     = () => api.post("/api/daily-bonus/claim");
export const claimDailyChallenge = () => api.post("/api/daily-challenge/claim");

// ── Shop ──────────────────────────────────────────────────────────────────────
export const fetchShopState     = ()          => api.get("/api/shop/catalog");
export const purchaseCosmetic   = (id)        => api.post("/api/shop/cosmetic-purchase", { cosmeticId: id });
export const purchaseConsumable = (id)        => api.post("/api/shop/consumable-purchase", { consumableId: id });

// ── Stats ─────────────────────────────────────────────────────────────────────
export const fetchSummitHistory = (limit) => api.get(`/api/stats/summit-history?limit=${limit ?? 20}`);
// "text" rather than "blob" — React Native's own Blob implementation has no
// .text() method, so reading a blob response back out as a string doesn't work.
export const exportSessionsCsv  = ()      => api.get("/api/stats/export-csv", { responseType: "text" });

// ── Skills ────────────────────────────────────────────────────────────────────
export const prestigeSkill = (skillName) => api.post("/skills/prestige", { skillName });

// ── Achievements ──────────────────────────────────────────────────────────────
export const fetchAchievements = () => api.get("/achievements");

// ── Stripe ────────────────────────────────────────────────────────────────────
export const createCheckoutSession = (targetTier) =>
  api.post("/payments/create-session", { targetTier });

export const createPortalSession = () => api.post("/payments/create-portal-session");
export const syncSubscription    = () => api.post("/subscription/sync");

export default api;
