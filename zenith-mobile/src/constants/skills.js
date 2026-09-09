export const SKILLS = [
  "Resolve", "Logic Flow", "Creativity", "Discipline",
  "Vitality", "Momentum", "Nutrition", "Logistics",
  "Presence", "Recovery", "Learning", "Environment",
];

export const SKILL_CATEGORIES = [
  { name: "Grit",   skills: ["Resolve", "Discipline"] },
  { name: "Drive",  skills: ["Momentum", "Logic Flow"] },
  { name: "Growth", skills: ["Creativity", "Learning"] },
  { name: "Body",   skills: ["Vitality", "Nutrition"] },
  { name: "Life",   skills: ["Logistics", "Environment"] },
  { name: "Calm",   skills: ["Presence", "Recovery"] },
];

// Short examples shown in MissionForm when a skill is selected
export const SKILL_INFO = {
  "Resolve":     "A task you've been avoiding, pushing through frustration, finishing when drained",
  "Logic Flow":  "Debugging, breaking tasks into steps, researching before deciding",
  "Creativity":  "Drawing, writing, designing, brainstorming, building something",
  "Discipline":  "Sticking to a routine, waking up on time, not skipping a habit",
  "Vitality":    "Working out, going for a walk, stretching, playing a sport",
  "Momentum":    "Knocking out a few small tasks back to back!",
  "Nutrition":   "Cooking a meal, drinking enough water, meal prepping",
  "Logistics":   "Booking an appointment, packing a bag, sorting your schedule",
  "Presence":    "Meditating, journalling, a walk without your phone",
  "Recovery":    "Sleeping on time, taking a proper break, decompressing",
  "Learning":    "Studying, reading, practising a skill, taking a course",
  "Environment": "Cleaning your desk, organising your room, decluttering",
};

// Ionicons names (not plain glyphs) — a real vector icon font always respects
// the `color` style, unlike some Unicode symbols which iOS silently renders as
// fixed-color emoji regardless of styling.
export const SKILL_ICONS = {
  "RESOLVE":     "flame-outline",
  "LOGIC FLOW":  "git-branch-outline",
  "CREATIVITY":  "color-palette-outline",
  "DISCIPLINE":  "alarm-outline",
  "VITALITY":    "barbell-outline",
  "MOMENTUM":    "rocket-outline",
  "NUTRITION":   "nutrition-outline",
  "LOGISTICS":   "briefcase-outline",
  "PRESENCE":    "leaf-outline",
  "RECOVERY":    "bed-outline",
  "LEARNING":    "book-outline",
  "ENVIRONMENT": "trash-outline",
};

export const DURATIONS = [
  { mins: 5,   label: "5 Min"  },
  { mins: 15,  label: "15 Min" },
  { mins: 30,  label: "30 Min" },
  { mins: 60,  label: "1 Hr"   },
  { mins: 90,  label: "90 Min" },
  { mins: 120, label: "2 Hr"   },
];
