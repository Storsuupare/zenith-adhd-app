import { createContext, useContext, useState } from "react";

// ── User: profile · inventory · notifications ──────────────────────────────
// Update frequency: on login, on task complete, on equip, on prestige
export const UserContext = createContext(null);
export const useUserContext = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUserContext must be inside UserContext.Provider");
  return ctx;
};

// ── Task: contracts · mission timer · form state ───────────────────────────
// Isolated so task state only re-renders task consumers, not the whole tree.
export const TaskContext = createContext(null);
export const useTaskContext = () => {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTaskContext must be inside TaskContext.Provider");
  return ctx;
};

// ── UI: theme · ambient · solar phase · shop ──────────────────────────────
// Update frequency: every 60s (solar), on user preference change
export const UIContext = createContext(null);
export const useUIContext = () => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUIContext must be inside UIContext.Provider");
  return ctx;
};

// ── Nav: burger open/close (isolated to prevent INP cascade) ─────────────
// State lives here — NOT in App.jsx — so nav toggles never re-render the app tree.
export const NavContext = createContext(null);
export const useNavContext = () => {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNavContext must be inside NavContext.Provider");
  return ctx;
};
export function NavContextProvider({ children }) {
  const [isNavOpen, setIsNavOpen] = useState(false);
  return (
    <NavContext.Provider value={{ isNavOpen, setIsNavOpen }}>
      {children}
    </NavContext.Provider>
  );
}
