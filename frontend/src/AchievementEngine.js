const UNLOCKED_KEY = "zenith_achievements_v1";
const COMPLETIONS_KEY = "zenith_total_completions";

const ACHIEVEMENTS = {
  FIRST_STRIKE: {
    title: "FIRST STRIKE",
    description: "Completed your first mission.",
    check: ({ total }) => total >= 1,
  },
  MOMENTUM: {
    title: "MOMENTUM",
    description: "Maintained a 3-day streak.",
    check: ({ streak }) => streak >= 3,
  },
  WEEK_WARRIOR: {
    title: "WEEK WARRIOR",
    description: "Maintained a 7-day streak.",
    check: ({ streak }) => streak >= 7,
  },
  NIGHT_OWL: {
    title: "NIGHT OWL",
    description: "Completed a mission during Night Owl hours.",
    check: ({ isNightOwl }) => isNightOwl,
  },
  DEEP_DIVER: {
    title: "DEEP DIVER",
    description: "Completed a 90-min or longer session.",
    check: ({ sessionMins }) => sessionMins >= 90,
  },
  CENTURY_MARK: {
    title: "CENTURY MARK",
    description: "Completed 100 missions.",
    check: ({ total }) => total >= 100,
  },
};

const getUnlocked = () => {
  try { return new Set(JSON.parse(localStorage.getItem(UNLOCKED_KEY) || "[]")); }
  catch { return new Set(); }
};

const saveUnlocked = (set) => {
  try { localStorage.setItem(UNLOCKED_KEY, JSON.stringify([...set])); }
  catch { /* private mode or storage quota exceeded */ }
};

const getTotal = () => {
  try { return parseInt(localStorage.getItem(COMPLETIONS_KEY) || "0", 10); }
  catch { return 0; }
};

const incrementTotal = () => {
  const n = getTotal() + 1;
  try { localStorage.setItem(COMPLETIONS_KEY, String(n)); }
  catch { /* private mode or storage quota exceeded */ }
  return n;
};

export const check = ({ streak = 0, sessionMins = 0 }) => {
  const unlocked = getUnlocked();
  const total = incrementTotal();
  const hour = new Date().getHours();
  const isNightOwl = hour >= 0 && hour < 5;
  const newlyUnlocked = [];

  for (const [id, ach] of Object.entries(ACHIEVEMENTS)) {
    if (unlocked.has(id)) continue;
    if (ach.check({ total, streak, isNightOwl, sessionMins })) {
      unlocked.add(id);
      newlyUnlocked.push({ id, title: ach.title, description: ach.description });
    }
  }

  if (newlyUnlocked.length > 0) saveUnlocked(unlocked);
  return newlyUnlocked;
};

export const getAll = () => {
  const unlocked = getUnlocked();
  return Object.entries(ACHIEVEMENTS).map(([id, ach]) => ({
    id,
    ...ach,
    unlocked: unlocked.has(id),
  }));
};
