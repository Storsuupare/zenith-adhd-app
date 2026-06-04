/**
 * suggestZenithSkills.js
 *
 * Pure, synchronous suggestion engine for Zenith OS.
 * Zero dependencies, zero API calls, zero side effects.
 * Scores all 12 Zenith skills against user-provided input and returns
 * a fully ranked list with relevanceScore, priorityLevel, milestones, and why.
 *
 * Designed to run on low-mid tier devices — O(12) computation, no DOM access,
 * no async, no external libraries. Universally supported ES6+.
 */

// ── Input constants ────────────────────────────────────────────────────────────
// Export these so the frontend can build the input UI from the same source of truth.

export const FRICTION_POINTS = {
  cant_start:       "Can't get started",
  brain_fog:        "Brain fog / mental cloudiness",
  messy_space:      "Messy or chaotic environment",
  overwhelmed:      "Feeling overwhelmed by tasks",
  low_energy:       "Low energy or fatigue",
  procrastinating:  "Procrastinating",
  scattered:        "Scattered or racing thoughts",
  financial_stress: "Financial stress or anxiety",
  isolated:         "Social isolation or disconnection",
  creative_block:   "Creative block",
  poor_retention:   "Poor information retention",
  technical_block:  "Technical or coding blocks",
};

export const BOTTLENECKS = {
  morning_routine:  "Morning routine",
  task_switching:   "Constant task switching",
  motivation:       "Lack of motivation",
  knowledge_gaps:   "Knowledge gaps",
  health_habits:    "Inconsistent health habits",
  organization:     "Poor organization",
  creative_output:  "Low creative output",
  money_management: "Money management",
};

// ── Internal helpers ───────────────────────────────────────────────────────────

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Bonus (0–15) based on how close the user's focus is to the skill's ideal focus level.
// focusPeak and focusLevel are both 1–5.
// Distance of 0 = perfect match = 15 pts. Each step away loses points.
function getFocusBonus(focusPeak, focusLevel) {
  const distance = Math.abs(focusPeak - focusLevel);
  const table    = [15, 10, 5, 2, 0];
  return table[Math.min(distance, 4)];
}

// Bonus (0–10) for being inside the skill's prime time window.
// Being within 2 hours of the window edge gives a partial bonus.
function getTimeBonus(timePrime, hour) {
  const [start, end] = timePrime;
  if (hour >= start && hour <= end) return 10;
  if (Math.abs(hour - start) <= 2 || Math.abs(hour - end) <= 2) return 5;
  return 0;
}

// Small urgency bonus (0–5) for underdeveloped skills — more room to grow.
function getLevelBonus(skillLevel) {
  if (skillLevel <= 1)  return 5;
  if (skillLevel <= 5)  return 3;
  if (skillLevel <= 15) return 1;
  return 0;
}

// Convert raw score to a human-readable priority label.
function getPriorityLevel(score) {
  if (score >= 65) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

// Build a { skillName → currentLevel } map from the skills array for O(1) lookups.
function buildSkillLevelMap(skills) {
  const map = {};
  if (!Array.isArray(skills)) return map;
  for (const s of skills) {
    const name  = (s.skill_name ?? "").toUpperCase();
    map[name]   = Number(s.current_level) || 1;
  }
  return map;
}

// Sum the weights for every friction ID that is currently active.
function scoreFrictions(frictionWeights, activeFrictions) {
  let total = 0;
  for (const id of activeFrictions) {
    total += frictionWeights[id] ?? 0;
  }
  return total;
}

// Sum the weights for every bottleneck ID that is currently active.
function scoreBottlenecks(bottleneckWeights, activeBottlenecks) {
  let total = 0;
  for (const id of activeBottlenecks) {
    total += bottleneckWeights[id] ?? 0;
  }
  return total;
}

// ── Skill configuration matrix ─────────────────────────────────────────────────
// One entry per skill. Every field is required.
// frictionWeights / bottleneckWeights: how much each active input boosts this skill's score.
// focusPeak: ideal focus level (1–5) for training this skill effectively.
// timePrime: [startHour, endHour] — the window where this skill is most productive.
// initialMilestones: exactly 3 actionable strings, specific to this skill.
// buildWhy: returns a personalized explanation string based on active inputs.

const SKILL_CONFIGS = [

  // ── 1. LOGIC FLOW ─────────────────────────────────────────────────────────────
  {
    skillName: "LOGIC FLOW",
    frictionWeights: {
      technical_block: 18,
      poor_retention:  10,
      cant_start:       8,
      brain_fog:        6,
      creative_block:   6,
    },
    bottleneckWeights: {
      knowledge_gaps:  14,
      task_switching:   8,
    },
    focusPeak:  4,
    timePrime:  [9, 17],
    initialMilestones: [
      "Log a Coding or Debugging session — even 30 minutes compounds fast",
      "Work through a Math problem set, Chess game, or Algorithm challenge",
      "Run a Code Review, SQL query drill, or Python exercise from scratch",
    ],
    buildWhy(frictions, bottlenecks) {
      if (frictions.includes("technical_block")) {
        return "Technical blocks are slowing your output. LOGIC FLOW training builds pattern-recognition and debugging stamina, so blockers dissolve faster with every session you log.";
      }
      if (frictions.includes("poor_retention")) {
        return "Poor retention is costing you rework time. LOGIC FLOW reinforces structured thinking pathways, compounding your ability to hold complex systems in mind across long sessions.";
      }
      if (bottlenecks.includes("knowledge_gaps")) {
        return "Knowledge gaps are a ceiling on your capability. LOGIC FLOW training fills those gaps systematically and builds the analytical framework to learn technical material faster.";
      }
      return "Consistent LOGIC FLOW sessions compound your analytical capacity, making every technical problem you face incrementally easier to break down and solve.";
    },
  },

  // ── 2. VITALITY ───────────────────────────────────────────────────────────────
  {
    skillName: "VITALITY",
    frictionWeights: {
      low_energy:       18,
      brain_fog:        14,
      cant_start:       10,
      procrastinating:   8,
      scattered:         6,
    },
    bottleneckWeights: {
      health_habits:   14,
      morning_routine: 10,
      motivation:       8,
    },
    focusPeak:  2,
    timePrime:  [6, 12],
    initialMilestones: [
      "Log a Gym, Lifting, or Leg Day session today",
      "Complete a Running, Cardio, or HIIT session — minimum 20 minutes",
      "Log 3 Workout, Yoga, or Stretching sessions this week",
    ],
    buildWhy(frictions, bottlenecks) {
      if (frictions.includes("low_energy") || frictions.includes("brain_fog")) {
        return "Your energy and mental clarity are depleted. VITALITY training elevates BDNF and cardiovascular output — the fastest known way to restore cognitive horsepower without relying on stimulants.";
      }
      if (frictions.includes("procrastinating") || frictions.includes("cant_start")) {
        return "Physical movement is the most reliable circuit-breaker for procrastination. A single VITALITY session resets your dopamine baseline and lowers the barrier to starting anything else.";
      }
      if (bottlenecks.includes("health_habits") || bottlenecks.includes("morning_routine")) {
        return "Inconsistent health habits are compounding into a chronic performance deficit. VITALITY consistency creates the biological foundation that every other skill runs on top of.";
      }
      return "VITALITY is the base layer of your operating system. Training it consistently upgrades the hardware that every other skill depends on to perform.";
    },
  },

  // ── 3. NUTRITION ──────────────────────────────────────────────────────────────
  {
    skillName: "NUTRITION",
    frictionWeights: {
      brain_fog:   16,
      low_energy:  14,
      scattered:    8,
      cant_start:   6,
    },
    bottleneckWeights: {
      health_habits:   14,
      morning_routine: 10,
    },
    focusPeak:  2,
    timePrime:  [7, 14],
    initialMilestones: [
      "Cook a Healthy Meal from scratch or complete a Meal Prep session",
      "Log a Hydration day — 2L+ water — or take your Vitamins consistently",
      "Do a Groceries run and log Cooking sessions 3 days in a row",
    ],
    buildWhy(frictions, bottlenecks) {
      if (frictions.includes("brain_fog")) {
        return "Brain fog is almost always downstream of poor fuel. NUTRITION training stabilizes your cortex's glucose supply, clearing the haze that slows every cognitive task you attempt.";
      }
      if (frictions.includes("low_energy")) {
        return "Chronic low energy is your body's loudest signal. NUTRITION training addresses the root cause — sustained energy is built through consistent fueling, not caffeine or willpower.";
      }
      if (bottlenecks.includes("health_habits")) {
        return "Inconsistent nutrition is silently throttling your performance ceiling. Building this skill creates the steady glucose supply your prefrontal cortex needs to operate at full capacity.";
      }
      return "NUTRITION is a force multiplier for every other skill. Training it consistently means more energy, sharper focus, and faster recovery across every area of performance.";
    },
  },

  // ── 4. ENVIRONMENT ────────────────────────────────────────────────────────────
  {
    skillName: "ENVIRONMENT",
    frictionWeights: {
      messy_space:      22,
      scattered:        14,
      procrastinating:  10,
      cant_start:        8,
      overwhelmed:       8,
    },
    bottleneckWeights: {
      organization: 16,
    },
    focusPeak:  2,
    timePrime:  [8, 12],
    initialMilestones: [
      "Log a Cleaning or Tidying session — start with your primary workspace",
      "Knock out Dishes, Laundry, or a Decluttering sprint in one block",
      "Log 3 Chores or Organizing sessions this week",
    ],
    buildWhy(frictions, bottlenecks) {
      if (frictions.includes("messy_space")) {
        return "A chaotic environment is actively consuming your working memory. Every object out of place is a low-priority task your brain silently tracks. ENVIRONMENT training frees that capacity back for actual work.";
      }
      if (frictions.includes("scattered") || frictions.includes("cant_start")) {
        return "Your environment is externally mirroring internal scatter. Restoring order to your space is the fastest intervention for resetting cognitive clarity and lowering the activation energy to begin.";
      }
      if (bottlenecks.includes("organization")) {
        return "Poor organization is a compounding drag on every system in your life. ENVIRONMENT training closes the open loops your brain silently carries, returning executive function to active priorities.";
      }
      return "Your environment is either a performance asset or a silent drain. ENVIRONMENT training converts your physical space into a system that works for you rather than against you.";
    },
  },

  // ── 5. DEEP FOCUS ─────────────────────────────────────────────────────────────
  {
    skillName: "DEEP FOCUS",
    frictionWeights: {
      cant_start:       20,
      procrastinating:  16,
      scattered:        12,
      overwhelmed:      10,
    },
    bottleneckWeights: {
      task_switching:  16,
      motivation:      10,
    },
    focusPeak:  3,
    timePrime:  [8, 16],
    initialMilestones: [
      "Log a Pomodoro or Focus Session — one task, zero interruptions",
      "Complete a 60-min Deep Work or Task Sprint block on a single priority",
      "Log 3 Work Sessions or Flow State blocks in one day",
    ],
    buildWhy(frictions, bottlenecks) {
      if (frictions.includes("cant_start") || frictions.includes("procrastinating")) {
        return "Task initiation is your highest-friction moment. DEEP FOCUS training strengthens the neural pathway from intention to execution, progressively lowering the cost of starting with every session.";
      }
      if (frictions.includes("scattered") || bottlenecks.includes("task_switching")) {
        return "Constant context-switching is fragmenting your output. DEEP FOCUS training deepens the myelin on sustained attention pathways, compounding your capacity to stay locked on one thing.";
      }
      if (frictions.includes("overwhelmed")) {
        return "Overwhelm collapses when you can commit to one task at a time. DEEP FOCUS training builds the cognitive container to hold a single thread long enough for real progress to happen.";
      }
      return "DEEP FOCUS is the core skill that separates meaningful output from scattered activity. Training it upgrades your capacity to produce real work in less time.";
    },
  },

  // ── 6. SYNTHESIS ──────────────────────────────────────────────────────────────
  {
    skillName: "SYNTHESIS",
    frictionWeights: {
      poor_retention:  20,
      creative_block:  10,
      technical_block: 10,
      brain_fog:        8,
    },
    bottleneckWeights: {
      knowledge_gaps: 18,
      motivation:      6,
    },
    focusPeak:  3,
    timePrime:  [13, 20],
    initialMilestones: [
      "Log a Reading or Study session — 30 minutes minimum, one topic only",
      "Complete a Research session and write structured Notes on what you found",
      "Finish a Flashcard deck, Course module, or full Book chapter",
    ],
    buildWhy(frictions, bottlenecks) {
      if (frictions.includes("poor_retention")) {
        return "Poor retention means you are re-learning the same material repeatedly. SYNTHESIS training builds dense semantic memory networks — the infrastructure that makes new information actually stick.";
      }
      if (bottlenecks.includes("knowledge_gaps")) {
        return "Knowledge gaps cap your execution ability. SYNTHESIS training systematically closes those gaps and reinforces cross-domain connections that make you faster in every discipline you touch.";
      }
      if (frictions.includes("creative_block")) {
        return "Creative blocks often signal an input deficit. SYNTHESIS training expands the raw material your brain draws on, giving your default mode network more to work with when you need original ideas.";
      }
      return "SYNTHESIS is how you convert time spent learning into compounding capability. Training it builds the knowledge architecture that accelerates every other skill you develop.";
    },
  },

  // ── 7. LOGISTICS ──────────────────────────────────────────────────────────────
  {
    skillName: "LOGISTICS",
    frictionWeights: {
      overwhelmed:       18,
      cant_start:        14,
      financial_stress:  10,
      scattered:         10,
    },
    bottleneckWeights: {
      organization:     16,
      task_switching:   10,
      money_management:  8,
    },
    focusPeak:  3,
    timePrime:  [8, 11],
    initialMilestones: [
      "Log an Email session — clear your inbox to zero",
      "Complete a Planning or Scheduling session and build tomorrow's To-do list tonight",
      "Handle all Errands, Paperwork, or Calendar updates in one Admin block",
    ],
    buildWhy(frictions, bottlenecks) {
      if (frictions.includes("overwhelmed")) {
        return "Overwhelm grows from open loops — unfinished tasks your brain tracks silently. LOGISTICS training closes those loops systematically, suppressing cortisol and returning executive function to actual work.";
      }
      if (frictions.includes("cant_start") || bottlenecks.includes("task_switching")) {
        return "Without a clear task queue, decision fatigue strikes before you begin. LOGISTICS training offloads planning overhead from working memory so every session starts with direction already locked in.";
      }
      if (frictions.includes("financial_stress") || bottlenecks.includes("money_management")) {
        return "Financial friction bleeds into cognitive bandwidth constantly. LOGISTICS training creates the structure to handle administrative and financial tasks efficiently, clearing that persistent mental load.";
      }
      return "LOGISTICS is your operating system for real life. Training it builds the structures that keep you moving efficiently without relying on memory or willpower to hold everything together.";
    },
  },

  // ── 8. CREATIVE ───────────────────────────────────────────────────────────────
  {
    skillName: "CREATIVE",
    frictionWeights: {
      creative_block:  22,
      isolated:        10,
      scattered:        8,
      low_energy:       6,
    },
    bottleneckWeights: {
      creative_output: 18,
      motivation:       8,
    },
    focusPeak:  3,
    timePrime:  [14, 22],
    initialMilestones: [
      "Log a Drawing, Writing, or Art session — 20 minutes, no self-editing",
      "Complete a Music, Guitar, Design, or Blog session from start to finish",
      "Log 3 Creative sessions this week — Photography, Painting, or any medium",
    ],
    buildWhy(frictions, bottlenecks) {
      if (frictions.includes("creative_block")) {
        return "Creative blocks signal that your divergent pathways are underloaded. CREATIVE training activates the default mode network and rebuilds the habit of generative thinking through consistent, low-pressure output.";
      }
      if (frictions.includes("isolated")) {
        return "Creative expression is one of the most effective antidotes to social disconnection. CREATIVE training gives you a channel for self-expression that builds identity and intrinsic motivation independently of external input.";
      }
      if (bottlenecks.includes("creative_output")) {
        return "Low creative output compounds into identity erosion over time. CREATIVE training rebuilds the output habit — starting small but establishing the pattern that makes larger creative work possible.";
      }
      return "CREATIVE training keeps the divergent pathways active that generate novel solutions across every domain, not just art. It pays dividends far outside its obvious category.";
    },
  },

  // ── 9. DISCIPLINE ─────────────────────────────────────────────────────────────
  {
    skillName: "DISCIPLINE",
    frictionWeights: {
      inconsistency: 20,
      scattered:     14,
      overwhelmed:    8,
    },
    bottleneckWeights: {
      habit_building:   18,
      self_regulation:  10,
    },
    focusPeak: 3,
    timePrime:  [6, 10],
    initialMilestones: [
      "Log a Habit Tracking or Morning Routine session — build the pattern before the motivation",
      "Repeat one Routine three times this week without breaking the chain",
      "Log a Self-improvement or Practice session focused on one specific behavior you want to lock in",
    ],
    buildWhy(frictions, bottlenecks) {
      if (frictions.includes("inconsistency")) {
        return "Inconsistency is the enemy of momentum. DISCIPLINE training builds the habit architecture that makes showing up automatic — removing the daily decision that drains your willpower before the work even starts.";
      }
      if (bottlenecks.includes("habit_building")) {
        return "Without repeatable systems, every session requires fresh mental energy just to start. DISCIPLINE training encodes your routines into automatic behavior, freeing your executive function for work that actually needs it.";
      }
      return "DISCIPLINE training compounds quietly. Each repeated session strengthens the neural pathways that make structure feel effortless — the difference between needing motivation and simply not requiring it.";
    },
  },

  // ── 10. PRESENCE ──────────────────────────────────────────────────────────────
  {
    skillName: "PRESENCE",
    frictionWeights: {
      isolated:         22,
      procrastinating:   8,
      low_energy:        8,
      cant_start:        6,
    },
    bottleneckWeights: {
      motivation: 12,
    },
    focusPeak:  2,
    timePrime:  [17, 22],
    initialMilestones: [
      "Log a Call or Chat — one meaningful, uninterrupted conversation today",
      "Reach out to Friends or Family you have not spoken to in 2+ weeks",
      "Log a Meeting, Networking event, Dating session, or Hangout this week",
    ],
    buildWhy(frictions, bottlenecks) {
      if (frictions.includes("isolated")) {
        return "Social disconnection is a silent drain on motivation, mood, and self-regulation. PRESENCE training reinforces the neural circuitry for trust and connection — the system that makes sustained effort feel worthwhile.";
      }
      if (bottlenecks.includes("motivation") || frictions.includes("procrastinating")) {
        return "Motivation is strongly social. Accountability, shared goals, and human connection are among the most reliable dopamine triggers. PRESENCE training builds the relational infrastructure that keeps you engaged over time.";
      }
      return "PRESENCE training activates the oxytocin and trust pathways that regulate mood and motivation. It is one of the most underrated performance skills for those who spend significant time working alone.";
    },
  },

  // ── 11. RESTORATION ───────────────────────────────────────────────────────────
  {
    skillName: "RESTORATION",
    frictionWeights: {
      brain_fog:        16,
      low_energy:       14,
      scattered:        14,
      procrastinating:  10,
      cant_start:        8,
    },
    bottleneckWeights: {
      morning_routine: 12,
      health_habits:   10,
      motivation:       8,
    },
    focusPeak:  1,
    timePrime:  [20, 23],
    initialMilestones: [
      "Log a Meditation or Breathing session — 10 minutes minimum",
      "Log Sleep tonight — target 7 to 9 hours and treat it as a tracked session",
      "Complete 3 Restoration sessions this week — Journaling, Nap, Bath, or Sauna",
    ],
    buildWhy(frictions, bottlenecks) {
      if (frictions.includes("brain_fog") || frictions.includes("scattered")) {
        return "Brain fog and scattered thoughts are symptoms of an under-restored nervous system. RESTORATION training activates the parasympathetic state and accelerates the synaptic pruning your brain needs to function clearly.";
      }
      if (frictions.includes("low_energy") || frictions.includes("cant_start")) {
        return "Your system is running on deficit power. No amount of effort overcomes an under-recovered nervous system. RESTORATION training rebuilds the baseline that all performance depends on.";
      }
      if (bottlenecks.includes("morning_routine") || bottlenecks.includes("health_habits")) {
        return "Recovery habits are the infrastructure underneath every other habit you are trying to build. RESTORATION training establishes the foundation that makes consistency in every other area sustainable.";
      }
      return "RESTORATION training is the highest-ROI skill when output is low. Recovery is not the absence of work — it is the process by which every other performance gain is consolidated and locked in.";
    },
  },

  // ── 12. RESOLVE ───────────────────────────────────────────────────────────────
  {
    skillName: "RESOLVE",
    frictionWeights: {
      procrastinating: 20,
      cant_start:      16,
      low_energy:       8,
      overwhelmed:      8,
    },
    bottleneckWeights: {
      motivation: 18,
    },
    focusPeak:  3,
    timePrime:  [6, 11],
    initialMilestones: [
      "Log a Hard Task — the specific one you have been avoiding the longest",
      "Complete a Cold Shower, Challenge, or Therapy session today",
      "Log a Discipline, Habit, or Mindset session for 5 consecutive days",
    ],
    buildWhy(frictions, bottlenecks) {
      if (frictions.includes("procrastinating") || frictions.includes("cant_start")) {
        return "Avoidance is a pattern, not a personality trait — and patterns can be retrained. RESOLVE training conditions the anterior cingulate cortex for distress tolerance, progressively lowering the activation cost of hard tasks.";
      }
      if (bottlenecks.includes("motivation")) {
        return "Motivation follows action, not the other way around. RESOLVE training builds the habit of beginning before you feel ready — the single most reliable driver of consistent output across every domain.";
      }
      if (frictions.includes("overwhelmed")) {
        return "Overwhelm is often avoidance of one specific difficult thing. RESOLVE training develops the capacity to engage with discomfort directly, which dissolves the overwhelm faster than any planning system.";
      }
      return "RESOLVE training expands your willpower ceiling through systematic exposure to difficulty. Each hard thing you do on schedule makes the next one cost less — compounding discipline over time.";
    },
  },

];

// ── Main export ────────────────────────────────────────────────────────────────

/**
 * suggestZenithSkills
 *
 * Accepts user profile data and returns all 12 skills ranked by relevance.
 *
 * @param {Object}   input
 * @param {string[]} input.frictionPoints  - Active friction IDs (keys from FRICTION_POINTS)
 * @param {string[]} input.bottlenecks     - Active bottleneck IDs (keys from BOTTLENECKS)
 * @param {number}   input.focusLevel      - Current focus level: 1 (very low) to 5 (flow state)
 * @param {Object[]} input.skills          - Skill records: [{ skill_name, current_level }]
 * @param {number}   input.hour            - Current hour 0–23 (defaults to now)
 * @param {number}   input.streak          - Current day streak count
 *
 * @returns {Array<{
 *   rank:              number,
 *   skillName:         string,
 *   relevanceScore:    number,   // 0–100
 *   priorityLevel:     "Low" | "Medium" | "High",
 *   initialMilestones: string[], // always exactly 3 items
 *   why:               string,
 * }>}
 */
export function suggestZenithSkills({
  frictionPoints = [],
  bottlenecks    = [],
  focusLevel     = 3,
  skills         = [],
  hour           = new Date().getHours(),
  streak         = 0,
}) {
  const skillLevelMap = buildSkillLevelMap(skills);

  const scored = SKILL_CONFIGS.map((config) => {
    const frictionScore   = scoreFrictions(config.frictionWeights, frictionPoints);
    const bottleneckScore = scoreBottlenecks(config.bottleneckWeights, bottlenecks);
    const focusBonus      = getFocusBonus(config.focusPeak, focusLevel);
    const timeBonus       = getTimeBonus(config.timePrime, hour);
    const skillLevel      = skillLevelMap[config.skillName] ?? 1;
    const levelBonus      = getLevelBonus(skillLevel);

    // Active streak gives a small boost to productive skills.
    // RESTORATION is excluded — rest is most critical when output pressure is lowest.
    const streakBonus = streak > 0 && config.skillName !== "RESTORATION" ? 3 : 0;

    const raw          = frictionScore + bottleneckScore + focusBonus + timeBonus + levelBonus + streakBonus;
    const relevanceScore = clamp(Math.round(raw), 0, 100);
    const priorityLevel  = getPriorityLevel(relevanceScore);
    const why            = config.buildWhy(frictionPoints, bottlenecks, focusLevel);

    return {
      skillName:         config.skillName,
      relevanceScore,
      priorityLevel,
      initialMilestones: config.initialMilestones,
      why,
    };
  });

  // Sort by relevanceScore descending, then attach rank.
  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
  scored.forEach((item, index) => {
    item.rank = index + 1;
  });

  return scored;
}
