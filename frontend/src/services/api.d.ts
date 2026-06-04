interface ApiResponse<T = unknown> {
  data: T;
  status: number;
}

type AR<T = unknown> = Promise<ApiResponse<T>>;

// Auth — call once after Clerk loads
export declare const configureAuth: (getToken: () => Promise<string | null>) => void;

// User
export declare const fetchUser: (clerkId: string) => AR;
export declare const createUser: (data: Record<string, unknown>) => AR;

// Inventory
export declare const fetchInventory: (clerkId: string) => AR;
export declare const equipItem: (instanceId: string) => AR;

// Tasks
export declare const fetchTasks: (clerkId: string) => AR;
export declare const fetchActiveTask: (clerkId: string) => AR;
export declare const createTask: (data: Record<string, unknown>) => AR;
export declare const createTaskBatch: (data: Record<string, unknown>) => AR;
export declare const completeTask: (taskId: string) => AR;
export declare const failTask: (taskId: string) => AR;

// Perk Shop (Node)
export declare const fetchPerkCatalog: () => AR;
export declare const purchasePerk: (itemId: string) => AR;

// Analytics
export declare const fetchElevation: () => AR;
export declare const fetchSummitHistory: (limit?: number) => AR;

// Skills
export declare const prestigeSkill: (skillName: string) => AR;

// Payments
export declare const createCheckoutSession: (targetTier: string) => AR;

// Loot
export declare const rollLoot: () => AR;
export declare const claimLoot: (item: unknown, equipNow: boolean) => AR;

// Modules
export declare const fetchModules: () => AR;

// Push
export declare const subscribePush: (subscription: PushSubscription) => AR;
