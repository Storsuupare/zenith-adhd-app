// ─── Perk effect descriptions ─────────────────────────────────────────────────
export const PERK_EFFECT_HINTS = {
  "Flow State Crystal": "+100% XP on this session",
  "Clarity Prism":      "+50% XP on this session",
  "Spark Stone":        "+25% Credits on completion",
  "Streak Guard":       "Streak protected — activates on next drop",
  "Quick Start":        "+10% XP on this session",
};

// ─── Skill colours ────────────────────────────────────────────────────────────
// Single map used by App.jsx (aura overlay) and ArchivesPage.jsx (charts)
export const SKILL_COLORS = {
  "LOGIC FLOW":  "#4488ff",
  "VITALITY":    "#ff7700",
  "NUTRITION":   "#33cc55",
  "ENVIRONMENT": "#77aaff",
  "EXECUTION":   "#0088ff",
  "LEARNING":    "#aa44ff",
  "LOGISTICS":   "#ffaa00",
  "CREATIVITY":  "#ff44bb",
  "DISCIPLINE":  "#60b4d0",
  "PRESENCE":    "#33ffcc",
  "RECOVERY":    "#aaffee",
  "RESOLVE":     "#ff1133",
};

// ─── Cosmetics catalog ────────────────────────────────────────────────────────
// type: "free" = always available | "credits" = buy with CR | "pro"/"elite" = subscription only
export const COSMETICS = {
  themes: [
    { id: "default",  label: "Classic",      color: "#22d3ee", type: "free"    },
    { id: "cobalt",   label: "Cobalt",        color: "#3b82f6", type: "credits", price: 1500 },
    { id: "amber",    label: "Amber",         color: "#f59e0b", type: "credits", price: 1500 },
    { id: "crimson",  label: "Crimson",       color: "#ef4444", type: "credits", price: 2000 },
    { id: "violet",   label: "Violet",        color: "#8b5cf6", type: "credits", price: 2500 },
    { id: "jade",     label: "Jade",          color: "#10b981", type: "credits", price: 3000 },
    { id: "neon",     label: "Neon",          color: "#f72585", type: "pro"    },
    { id: "arctic",   label: "Arctic",        color: "#67e8f9", type: "pro"    },
    { id: "solar",    label: "Solar",         color: "#fb8500", type: "pro"    },
    { id: "nebula",   label: "Nebula",        color: "#7209b7", type: "elite"  },
    { id: "obsidian", label: "Obsidian",      color: "#6d28d9", type: "elite"  },
    { id: "ghost",    label: "Ghost",         color: "#e2e8f0", type: "elite"  },
  ],
  audio: [
    { id: "focus",        label: "Focus",         icon: "◉", type: "free",    desc: "Arctic drone — default"    },
    { id: "rain",         label: "Rain",           icon: "⌁", type: "credits", price: 600,  desc: "Heavy rainfall" },
    { id: "library",      label: "Library",        icon: "◫", type: "credits", price: 600,  desc: "Quiet AC hum"  },
    { id: "lofi",         label: "Lo-Fi",          icon: "♫", type: "credits", price: 900,  desc: "Vinyl warmth"  },
    { id: "cyberpunk",    label: "Cyberpunk City", icon: "⬡", type: "credits", price: 1200, desc: "Night city hum" },
    { id: "deepspace",    label: "Deep Space",     icon: "◎", type: "pro",    desc: "Cosmic low drone"          },
    { id: "spacestation", label: "Space Station",  icon: "⬡", type: "pro",    desc: "ISS hum + metallic clinks" },
    { id: "deepsea",      label: "Deep Sea",       icon: "≋", type: "elite",  desc: "Sub-bass + sonar pings"    },
  ],
  consumables: [
    { id: "streak_rescue",   label: "Streak Rescue",   icon: "◬", price: 500,  desc: "Restore a broken streak back to 1" },
    { id: "extra_loot_pull", label: "Extra Loot Pull", icon: "◈", price: 250,  desc: "Roll an extra loot drop right now" },
  ],
};

// ─── Time config ─────────────────────────────────────────────────────────────
// Base credit values match backend BASE_CR (2 CR/min guaranteed).
// Actual payout is higher — streak multiplier + bonus roll on top.
export const TIME_CONFIG = {
  5:   { credits: 10  },
  15:  { credits: 30  },
  30:  { credits: 60  },
  60:  { credits: 120 },
  90:  { credits: 180 },
  120: { credits: 240 },
};

// ─── Subject → Skill mapping ─────────────────────────────────────────────────
// Single source of truth used by handleInitiate (App.jsx) and MissionForm preview.
// Values must match the canonical skill names in the `skills` DB table.
export const SUBJECT_TO_SKILL_MAP = {
  "Coding": "Logic Flow", "Programming": "Logic Flow", "Debugging": "Logic Flow",
  "Scripting": "Logic Flow", "Code Review": "Logic Flow", "Math": "Logic Flow",
  "Logic": "Logic Flow", "Chess": "Logic Flow", "Excel": "Logic Flow",
  "SQL": "Logic Flow", "Python": "Logic Flow", "React": "Logic Flow",
  "JavaScript": "Logic Flow", "Data Analysis": "Logic Flow", "Algorithm": "Logic Flow",
  "System Design": "Logic Flow",
  "Gym": "Vitality", "Workout": "Vitality", "Running": "Vitality", "Run": "Vitality",
  "Cardio": "Vitality", "Sports": "Vitality", "Yoga": "Vitality",
  "Stretching": "Vitality", "HIIT": "Vitality", "Walking": "Vitality",
  "Swimming": "Vitality", "Cycling": "Vitality", "Lifting": "Vitality",
  "Training": "Vitality", "Exercise": "Vitality", "Pilates": "Vitality",
  "Leg Day": "Vitality", "Push Day": "Vitality", "Pull Day": "Vitality",
  "Upper Body": "Vitality",
  "Breakfast": "Nutrition", "Lunch": "Nutrition", "Dinner": "Nutrition",
  "Healthy Meal": "Nutrition", "Cooking": "Nutrition", "Hydration": "Nutrition",
  "Vitamins": "Nutrition", "Meal Prep": "Nutrition", "Groceries": "Nutrition",
  "Supplements": "Nutrition", "Water": "Nutrition", "Fasting": "Nutrition",
  "Dieting": "Nutrition",
  "Cleaning": "Environment", "Organizing": "Environment", "Chores": "Environment",
  "Dishes": "Environment", "Decluttering": "Environment", "Home Office": "Environment",
  "Setup": "Environment", "Laundry": "Environment", "Tidying": "Environment",
  "Vacuuming": "Environment", "Sorting": "Environment", "Deep Clean": "Environment",
  "Packing": "Environment",
  "Work Session": "Execution", "Project": "Execution", "Pomodoro": "Execution",
  "Sprint": "Execution", "Work Block": "Execution", "Task Sprint": "Execution",
  "Grind": "Execution",
  "Reading": "Learning", "Study": "Learning", "Studying": "Learning",
  "Note Taking": "Learning", "Notes": "Learning", "Research": "Learning",
  "Book": "Learning", "Course": "Learning", "Lecture": "Learning",
  "Flashcards": "Learning", "Language": "Learning",
  "Organisation": "Logistics", "Email": "Logistics", "Emails": "Logistics",
  "Planning": "Logistics", "Scheduling": "Logistics", "Calendar": "Logistics",
  "To-do": "Logistics", "Errands": "Logistics", "Paperwork": "Logistics",
  "Appointments": "Logistics", "Filing": "Logistics", "Documents": "Logistics",
  "Drawing": "Creativity", "Art": "Creativity", "Music": "Creativity", "Design": "Creativity",
  "Photography": "Creativity", "Writing": "Creativity", "Video": "Creativity",
  "Crafting": "Creativity", "Painting": "Creativity", "Sketching": "Creativity",
  "Blog": "Creativity", "Content": "Creativity", "Guitar": "Creativity", "Piano": "Creativity",
  "Habit": "Discipline", "Habits": "Discipline", "Routine": "Discipline",
  "Routines": "Discipline", "Ritual": "Discipline", "Rituals": "Discipline",
  "Morning Routine": "Discipline", "Evening Routine": "Discipline",
  "Night Routine": "Discipline", "Daily Routine": "Discipline",
  "Habit Tracking": "Discipline", "Habit Review": "Discipline",
  "Self-improvement": "Discipline", "Personal Development": "Discipline",
  "Affirmation": "Discipline", "Affirmations": "Discipline",
  "Practice": "Discipline", "Daily Practice": "Discipline",
  "Mindset": "Discipline", "Self-discipline": "Discipline",
  "Banking": "Logistics", "Budgeting": "Logistics", "Bills": "Logistics",
  "Finance": "Logistics", "Money": "Logistics", "Taxes": "Logistics",
  "Investing": "Logistics", "Savings": "Logistics", "Freelancing": "Logistics",
  "Side Hustle": "Logistics", "Income": "Logistics",
  "Meeting": "Presence", "Call": "Presence", "Networking": "Presence",
  "Dating": "Presence", "Friends": "Presence", "Family": "Presence",
  "Party": "Presence", "Talking": "Presence", "Social": "Presence",
  "Chat": "Presence", "Hangout": "Presence", "Interview": "Presence",
  "Catch Up": "Presence",
  "Nap": "Recovery", "Sleep": "Recovery", "Meditation": "Recovery",
  "Relaxing": "Recovery", "Breathing": "Recovery", "Spa": "Recovery",
  "Sauna": "Recovery", "Rest": "Recovery", "Break": "Recovery",
  "Bath": "Recovery", "Journaling": "Recovery", "Wind Down": "Recovery",
  "Hard Task": "Resolve", "Challenge": "Resolve", "Difficult Task": "Resolve",
  "Cold Shower": "Resolve", "Therapy": "Resolve", "Accountability": "Resolve",
  "Commitment": "Resolve", "Discipline": "Resolve",
};

