import axios from 'axios';

const NODE_URL   = import.meta.env.VITE_API_BASE;
const PYTHON_URL = import.meta.env.VITE_PYTHON_API_BASE;

if (!NODE_URL)   throw new Error('[Zenith] VITE_API_BASE is not defined in frontend/.env');
if (!PYTHON_URL) throw new Error('[Zenith] VITE_PYTHON_API_BASE is not defined in frontend/.env');

const node   = axios.create({ baseURL: NODE_URL });
const python = axios.create({ baseURL: PYTHON_URL });

const normalizeError = (err) => {
  let msg = 'Network error';
  if (err.response?.data?.detail)  msg = err.response.data.detail;
  else if (err.response?.data?.error) msg = err.response.data.error;
  else if (err.message)            msg = err.message;

  const normalized = new Error(msg);
  normalized.response = err.response;
  return Promise.reject(normalized);
};

node.interceptors.response.use(r => r, normalizeError);
python.interceptors.response.use(r => r, normalizeError);

// Called once from App.jsx after Clerk loads.
// Every subsequent request automatically carries a fresh Bearer token.
export const configureAuth = (getToken) => {
  const attach = (instance) => {
    instance.interceptors.request.use(async (config) => {
      const token = await getToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  };
  attach(node);
  attach(python);
};

// ── User ──────────────────────────────────────────────────────────────────────
export const fetchUser  = (clerkId) => node.get(`/user/${clerkId}`);
export const createUser = (data)    => node.post('/user', data);

// ── Inventory ─────────────────────────────────────────────────────────────────
export const fetchInventory = (clerkId)            => node.get(`/api/inventory/${clerkId}`);
export const equipItem      = (instanceId)         => node.post('/api/inventory/equip', { instanceId });

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const fetchTasks       = (clerkId)          => node.get(`/api/tasks?externalId=${clerkId}`);
export const fetchActiveTask  = (clerkId)          => node.get(`/api/tasks/active/${clerkId}`);
export const createTask       = (data)             => node.post('/api/tasks', data);
export const createTaskBatch  = (data)             => node.post('/api/tasks/batch', data);
export const completeTask     = (taskId)           => node.post(`/api/tasks/${taskId}/complete`, {});
export const failTask         = (taskId)           => node.post(`/api/tasks/${taskId}/fail`, {});

// ── Daily bonus ───────────────────────────────────────────────────────────────
export const claimDailyBonus = () => node.post('/api/daily-bonus/claim');

// ── Shop ──────────────────────────────────────────────────────────────────────
export const fetchShopState         = ()               => node.get('/api/shop/catalog');
export const purchaseCosmetic       = (cosmeticId)     => node.post('/api/shop/cosmetic-purchase', { cosmeticId });
export const purchaseConsumable     = (consumableId)   => node.post('/api/shop/consumable-purchase', { consumableId });

// ── Analytics ─────────────────────────────────────────────────────────────────
export const fetchElevation     = ()      => node.get('/api/stats/elevation');
export const fetchSummitHistory = (limit) => node.get(`/api/stats/summit-history?limit=${limit ?? 12}`);

// ── Skills ────────────────────────────────────────────────────────────────────
export const prestigeSkill = (skillName) => node.post('/skills/prestige', { skillName });

// ── Payments ──────────────────────────────────────────────────────────────────
export const createCheckoutSession = (targetTier) =>
  node.post('/payments/create-session', { targetTier });

// ── Loot ──────────────────────────────────────────────────────────────────────
export const rollLoot  = ()                   => node.post('/api/v1/loot/roll', {});
export const claimLoot = (item, equipNow)     => node.post('/api/inventory/claim', { item, equipNow });

// ── Modules ───────────────────────────────────────────────────────────────────
export const fetchModules = () => node.get('/modules');

// ── Push ──────────────────────────────────────────────────────────────────────
export const subscribePush = (subscription) => node.post('/api/push/subscribe', { subscription });

// ── GDPR ──────────────────────────────────────────────────────────────────────
export const deleteAccount = () => node.delete('/user/account');
