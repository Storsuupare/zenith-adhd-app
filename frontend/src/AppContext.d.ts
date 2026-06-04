import type { Context } from 'react';

// ── Backend user object ───────────────────────────────────────────────────────
export interface ZenithUser {
  id: number;
  external_id: string;
  username: string;
  credits: number;
  xp: number;
  level: number;
  streak: number;
  account_tier: number;
  role: string;
  ban_reason: string | null;
  [key: string]: unknown;
}

export interface InventoryItem {
  instance_id: string;
  item_id: string;
  item_name: string;
  item_type: string;
  equipped: boolean;
  [key: string]: unknown;
}

export interface Notification {
  id: string;
  type: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING';
  message: string;
}

export interface ContractTier {
  mins: number;
  xp: number;
  req: number;
}

export interface LootItem {
  [key: string]: unknown;
}

// ── Context value shapes ──────────────────────────────────────────────────────
export interface UserContextValue {
  user: ZenithUser | null;
  clerkUser: unknown;
  inventory: InventoryItem[];
  fetchUser: () => Promise<void>;
  handleInventoryEquip: (instanceId: string) => Promise<void>;
  handlePrestige: (skillName: string) => Promise<void>;
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id'>) => void;
  getRank: (lvl: number) => string;
  isRedzone: boolean;
}

export interface TaskContextValue {
  contracts: unknown[];
  activeMission: unknown | null;
  timeLeft: number;
  modules: unknown[];
  selectedModule: unknown | null;
  setSelectedModule: (m: unknown) => void;
  taskName: string;
  setTaskName: (n: string) => void;
  duration: number;
  setDuration: (d: number) => void;
  isOpening: boolean;
  loot: LootItem | null;
  setLoot: (l: LootItem | null) => void;
  previewXP: number;
  setPreviewXP: (n: number) => void;
  previewSkill: string;
  setPreviewSkill: (s: string) => void;
  levelUpSkill: string | null;
  activeSkillName: string | null;
  elevationKey: number;
  completionTick: number;
  chartPending: boolean;
  xpGain: number;
  xpBurstKey: number;
  fetchContracts: () => Promise<void>;
  handleComplete: () => Promise<void>;
  handleAbort: () => void;
  handleInitiate: (opts?: Record<string, unknown>) => Promise<void>;
  handleDrop: (contractId: string) => Promise<void>;
  handleContractCreated: (contract: unknown) => void;
  getMissionStakes: (duration: number) => number;
  SUBJECT_TO_SKILL_MAP: Record<string, string>;
  CONTRACT_TIERS: ContractTier[];
}

export interface UIContextValue {
  solarPhase: string;
  activeTheme: string;
  setActiveTheme: (t: string) => void;
  activeAmbientTrack: string;
  setActiveAmbientTrack: (t: string) => void;
  atmosphereVolume: number;
  handleAtmosphereVolumeChange: (v: number) => void;
  isShopOpen: boolean;
  setIsShopOpen: (b: boolean) => void;
  isInventoryOpen: boolean;
  setIsInventoryOpen: (b: boolean) => void;
  playHaptic: (type: string, level?: number) => void;
  navigate: (path: string) => void;
}

export interface NavContextValue {
  isNavOpen: boolean;
  setIsNavOpen: (b: boolean) => void;
}

// ── Contexts ──────────────────────────────────────────────────────────────────
export declare const UserContext: Context<UserContextValue | null>;
export declare const TaskContext: Context<TaskContextValue | null>;
export declare const UIContext: Context<UIContextValue | null>;
export declare const NavContext: Context<NavContextValue | null>;

// ── Hooks ─────────────────────────────────────────────────────────────────────
export declare const useUserContext: () => UserContextValue;
export declare const useTaskContext: () => TaskContextValue;
export declare const useUIContext: () => UIContextValue;
export declare const useNavContext: () => NavContextValue;
