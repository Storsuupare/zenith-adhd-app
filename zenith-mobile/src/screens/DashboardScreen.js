import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert, RefreshControl,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useUser } from "../context/UserContext";
import { useTasks } from "../context/TaskContext";
import { useTheme } from "../context/ThemeContext";
import { claimDailyChallenge, prestigeSkill } from "../services/api";
import StatHUD          from "../components/StatHUD";
import MissionForm      from "../components/MissionForm";
import ContractCard     from "../components/ContractCard";
import DailyChallenge   from "../components/DailyChallenge";
import NotificationToast from "../components/NotificationToast";
import OnboardingModal, { ONBOARDING_KEY } from "../components/OnboardingModal";
import WhatsNewModal from "../components/WhatsNewModal";
import { WHATS_NEW, WHATS_NEW_KEY } from "../constants/whatsNew";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";

function getContextHint(user) {
  const hour   = new Date().getHours();
  const streak = user?.streak ?? 0;
  if (hour >= 0  && hour < 5)  return { icon: "⚠", text: "Red Zone active — rewards halved.",      color: "#ff3b3b" };
  if (hour >= 8  && hour < 11) return { icon: "◎", text: "Peak window. Best XP until 11am.",        color: "#f5c518" };
  if (hour >= 22)               return { icon: "◑", text: "Hyperfocus window. Best XP of the day.", color: "#a855f7" };
  if (streak >= 7)              return { icon: "▲", text: `${streak}-day streak. Don't break it.`,  color: null };
  if (streak >= 3)              return { icon: "▲", text: `${streak}-day streak. Keep it going.`,   color: null };
  return null;
}

// ── Tier system (matches web getTier + TIER_STYLE) ───────────────────────────
function getTierKey(level) {
  if (level >= 50) return "vanguard";
  if (level >= 10) return "adept";
  return "novice";
}

const TIER = {
  novice:   { color: "rgba(255,255,255,0.28)", gradientColors: ["rgba(255,255,255,0.18)", "rgba(255,255,255,0.5)"],  borderColor: "rgba(255,255,255,0.07)",  cardBg: "rgba(0,0,0,0.22)" },
  adept:    { color: "#00f5ff",                gradientColors: ["#0096c7", "#00f5ff", "#ade8f4"],                     borderColor: "rgba(0,245,255,0.2)",      cardBg: "rgba(0,18,28,0.26)" },
  vanguard: { color: "#ff0040",                gradientColors: ["#c9184a", "#ff0040", "#ff758f"],                     borderColor: "rgba(255,0,64,0.3)",       cardBg: "rgba(22,0,10,0.26)" },
};

const SKILL_DATA = {
  "LOGIC FLOW":  { icon: "⬡", benefit: "Sharpens analytical thinking, pattern recognition, and problem-solving under pressure.", trains: ["Coding", "Debugging", "Math", "Chess", "Algorithm", "SQL", "Python"] },
  "VITALITY":    { icon: "◈", benefit: "Boosts energy, focus, and mood — your body is your most important productivity tool.", trains: ["Gym", "Workout", "Running", "Cardio", "HIIT", "Yoga", "Lifting"] },
  "NUTRITION":   { icon: "◉", benefit: "Fuels consistent energy levels and keeps your brain sharp throughout the day.", trains: ["Healthy Meal", "Meal Prep", "Cooking", "Hydration", "Groceries"] },
  "ENVIRONMENT": { icon: "▣", benefit: "A cleaner space means a clearer head.", trains: ["Cleaning", "Chores", "Dishes", "Laundry", "Organizing", "Tidying"] },
  "EXECUTION":   { icon: "◎", benefit: "The skill of actually doing the work — sitting down, starting, and seeing it through.", trains: ["Work Session", "Project", "Pomodoro", "Sprint", "Task Sprint", "Grind"] },
  "LEARNING":    { icon: "⬢", benefit: "Builds knowledge that stacks over time — the more you learn, the faster you learn.", trains: ["Reading", "Study", "Research", "Note Taking", "Flashcards", "Course"] },
  "LOGISTICS":   { icon: "▤", benefit: "Keeps your life organised and your head clear — fewer open loops, more focus.", trains: ["Organisation", "Email", "Planning", "Scheduling", "Errands", "Calendar"] },
  "CREATIVITY":  { icon: "◆", benefit: "Trains your brain to think differently and express ideas in ways only you can.", trains: ["Drawing", "Writing", "Music", "Design", "Art", "Photography", "Guitar"] },
  "DISCIPLINE":  { icon: "◫", benefit: "Builds the habit infrastructure that makes everything else easier.", trains: ["Habit", "Routine", "Morning Routine", "Practice", "Self-improvement", "Ritual"] },
  "PRESENCE":    { icon: "◑", benefit: "Strengthens real connections — the people in your life are part of your progress too.", trains: ["Meeting", "Call", "Networking", "Friends", "Family", "Dating", "Hangout"] },
  "RECOVERY":    { icon: "◯", benefit: "Rest isn't laziness — it's how your brain resets and locks in everything you've worked on.", trains: ["Meditation", "Sleep", "Nap", "Breathing", "Journaling", "Rest", "Bath"] },
  "RESOLVE":     { icon: "▲", benefit: "Doing the hard thing anyway — this skill grows every time you push through resistance.", trains: ["Hard Task", "Challenge", "Cold Shower", "Therapy", "Discipline", "Mindset"] },
};

// ── Skill card (matches SkillSideBar.css) ────────────────────────────────────
function SkillCard({ skill, onPrestige, previewXP = 0, accentColor = "#22d3ee" }) {
  const level      = skill.current_level ?? 0;
  const xp         = skill.current_xp ?? 0;
  const nextXP     = Math.max(skill.next_level_xp ?? 100, 1);
  const prestige   = skill.prestige_level ?? 0;
  const pct         = Math.min((xp / nextXP) * 100, 100);
  const projectedPct = previewXP > 0
    ? Math.min(((xp + previewXP) / nextXP) * 100, 100)
    : 0;
  const name       = (skill.skill_name || "").toUpperCase();
  const tierKey    = getTierKey(level);
  const tier       = TIER[tierKey];
  const data       = SKILL_DATA[name];
  const canPrestige = level >= 99;
  const boostActive = skill.prestige_boost_until && new Date(skill.prestige_boost_until) > new Date();

  return (
    <View style={[sk.card, { borderColor: tier.borderColor, backgroundColor: tier.cardBg }]}>

      {/* Icon badge — absolute top-right, never affects row layout */}
      {data && <Text style={[sk.iconBadge, { color: accentColor }]}>{data.icon}</Text>}

      {/* LVL badge row — .skill-lvl-row — only badge + xpBonus + stars, no wrapping */}
      <View style={sk.lvlRow}>
        <View style={sk.lvlBadge}>
          <Text style={[sk.lvlText, { color: accentColor }]}>LVL {level}</Text>
        </View>
        {level >= 2 && !canPrestige && (
          <Text style={[sk.xpBonus, { color: tier.color }]} numberOfLines={1}>+{level * 5}% XP</Text>
        )}
        {prestige > 0 && (
          <Text style={sk.prestigeStars} numberOfLines={1}>{"★".repeat(Math.min(prestige, 5))}</Text>
        )}
      </View>

      {/* Skill name — full width so nothing truncates */}
      <Text style={sk.skillName}>
        {name}{boostActive && <Text style={sk.boostBadge}> 2×</Text>}
      </Text>

      {!canPrestige ? (
        <>
          {/* Progress bar — ghost shows projected session XP, real fill on top */}
          <View style={sk.barTrack}>
            {projectedPct > pct && (
              <View style={[sk.barGhost, { width: `${projectedPct}%` }]} />
            )}
            <View style={[sk.barFill, { width: `${pct}%`, backgroundColor: accentColor }]} />
          </View>
          {/* XP fraction + percent on same row */}
          <View style={sk.bottomRow}>
            <Text style={sk.pctReadout}>{Math.floor(pct)}%</Text>
            <View style={sk.xpFrac}>
              <Text style={sk.xpVal}>{xp.toLocaleString()}</Text>
              <Text style={sk.xpDim}> / {nextXP.toLocaleString()} </Text>
              <Text style={[sk.xpLbl, { color: accentColor }]}>XP</Text>
            </View>
          </View>
        </>
      ) : (
        <TouchableOpacity style={sk.prestigeBtn} onPress={() => onPrestige(skill.skill_name)} activeOpacity={0.85}>
          <Text style={sk.prestigeBtnTxt}>PRESTIGE SKILL</Text>
          <Text style={sk.prestigeBtnSub}>RESET TO LVL 1 · +10% XP · 3,500 CR</Text>
        </TouchableOpacity>
      )}

    </View>
  );
}

const sk = StyleSheet.create({
  card: {
    width:             "48.5%",
    borderWidth:       1,
    borderRadius:      11,
    paddingVertical:   10,
    paddingHorizontal: 10,
    minHeight:         90,
  },
  // lvlRow never wraps — xpBonus shrinks first, icon stays pinned right
  lvlRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6, overflow: "hidden" },
  lvlBadge: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, flexShrink: 0 },
  lvlText:  { fontFamily: FONTS.bold, fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  xpBonus:  { fontFamily: FONTS.monoBold, fontSize: 10, fontWeight: "700", letterSpacing: 0.6, opacity: 0.7, flexShrink: 1 },
  prestigeStars: { color: "#fbbf24", fontSize: 11, lineHeight: 14, flexShrink: 0 },
  iconBadge: { position: "absolute", top: 10, right: 10, fontSize: 13, opacity: 0.55 },

  skillName: { fontFamily: FONTS.bold, fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.9)", letterSpacing: -0.1, marginBottom: 4 },
  boostBadge: { fontSize: 10, fontWeight: "800", color: "#fbbf24" },

  barTrack: { height: 3, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 20, overflow: "hidden", marginTop: 6, marginBottom: 4 },
  barFill:  { height: "100%", borderRadius: 20 },
  barGhost: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.18)" },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  pctReadout: { fontFamily: FONTS.bold, fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.6)", letterSpacing: 0.8 },
  xpFrac:   { flexDirection: "row", alignItems: "baseline" },
  xpVal:    { fontFamily: FONTS.semiBold, fontSize: 10, color: "rgba(255,255,255,0.9)" },
  xpDim:    { fontFamily: FONTS.regular,  fontSize: 10, color: "rgba(255,255,255,0.35)" },
  xpLbl:    { fontFamily: FONTS.bold,     fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },

  prestigeBtn:    { marginTop: 10, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", borderRadius: 10, paddingVertical: 14, paddingHorizontal: 10, alignItems: "center" },
  prestigeBtnTxt: { fontFamily: FONTS.black, fontSize: 13, fontWeight: "800", color: "#fff", letterSpacing: -0.1 },
  prestigeBtnSub: { fontFamily: FONTS.regular, fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 3, textAlign: "center" },
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function DashboardScreen({ navigation }) {
  const { user, fetchUser, refreshToken } = useUser();
  const { accentColor } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUser();
    setRefreshing(false);
  };
  const {
    contracts, handleCreateTask, handleComplete, handleAbort,
    notifications, addNotification, setPrestigeData,
  } = useTasks();

  const skills       = user?.mastery ?? [];
  const hint         = getContextHint(user);
  const claimedToday = !!user?.daily_challenge_claimed_date &&
    user.daily_challenge_claimed_date.slice(0, 10) === new Date().toISOString().slice(0, 10);

  const handleDailyChallengeClaim = async () => {
    try {
      await claimDailyChallenge();
      addNotification({ type: "success", message: "+150 CR — challenge complete!" });
      await fetchUser();
    } catch (err) {
      if (err.response?.status === 409) {
        addNotification({ type: "info", message: "Already claimed today." });
        fetchUser();
      }
    }
  };

  const handlePrestige = (skillName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      "Prestige Skill",
      `Reset ${skillName} to Level 1?\n\nYou earn a permanent +10% XP bonus to this skill. 3,500 CR will be deducted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Prestige",
          style: "destructive",
          onPress: async () => {
            try {
              await refreshToken();
              const res = await prestigeSkill(skillName);
              if (res.data?.success) {
                fetchUser();
                if (setPrestigeData) {
                  setPrestigeData({
                    skillName,
                    prestigeLevel: res.data.prestige_level ?? 1,
                    creditReward:  res.data.credits_earned ?? 0,
                  });
                }
              }
            } catch {
              addNotification({ type: "error", message: "Prestige failed." });
            }
          },
        },
      ]
    );
  };

  const activeCount = contracts.length;

  // Scroll ref lets OnboardingModal call scrollRef.current.scrollTo()
  const scrollRef = useRef(null);

  // Refs for each spotlightable section — OnboardingModal calls measureInWindow on these
  const statHudRef   = useRef(null);
  const missionRef   = useRef(null);
  const contractsRef = useRef(null);
  const skillsRef    = useRef(null);

  // Y offsets of key sections, populated by onLayout callbacks below
  const [sectionYs, setSectionYs] = useState({});

  // Show onboarding once per new user, or the "what's new" card once per update for returning
  // users — never both. New users already get the current feature set via onboarding, so a
  // redundant "what's new" popup right after would be noise, not signal. Sequenced in one
  // effect (not two separate ones) to avoid a race between the onboarding-seen read and the
  // whats-new-seen write for brand-new users.
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWhatsNew,   setShowWhatsNew]   = useState(false);
  const introChecked = useRef(false);
  useEffect(() => {
    if (!user?.external_id || introChecked.current) return;
    introChecked.current = true;
    (async () => {
      const onboardingSeen = await AsyncStorage.getItem(ONBOARDING_KEY(user.external_id));
      if (!onboardingSeen) {
        setShowOnboarding(true);
        await AsyncStorage.setItem(WHATS_NEW_KEY, WHATS_NEW.version);
        return;
      }
      const whatsNewSeenVersion = await AsyncStorage.getItem(WHATS_NEW_KEY);
      if (whatsNewSeenVersion !== WHATS_NEW.version) setShowWhatsNew(true);
    })();
  }, [user?.external_id]);

  // Track how far through the active session we are (updates every 10s)
  const [elapsedFraction, setElapsedFraction] = useState(0);
  useEffect(() => {
    if (contracts.length === 0) { setElapsedFraction(0); return; }
    const activeContract = contracts[0];
    const deadline = activeContract.deadline ? Date.parse(activeContract.deadline) : null;
    if (!deadline) return;
    const totalMs = (Number(activeContract.duration_minutes) || 30) * 60 * 1000;
    const tick = () => {
      const elapsed = Math.max(0, totalMs - (deadline - Date.now()));
      setElapsedFraction(Math.min(elapsed / totalMs, 1));
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [contracts]);

  const activeSkillName = contracts[0]?.skill_name?.toUpperCase();
  const activeStake     = contracts[0]?.stake_amount || 0;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
      >
        <View ref={statHudRef} onLayout={event => { const y = event.nativeEvent.layout.y; setSectionYs(prev => ({ ...prev, statHud: y })); }}>
          <StatHUD user={user} accentColor={accentColor} />
        </View>

        {/* Context hint — only shown during notable windows or active streaks */}
        {hint && (
          <View style={styles.hint}>
            <Text style={[styles.hintIcon, { color: hint.color ?? accentColor }]}>{hint.icon}</Text>
            <Text style={[styles.hintText, { color: hint.color ?? COLORS.textMuted }]}>{hint.text}</Text>
          </View>
        )}

        {/* Daily challenge */}
        <DailyChallenge
          sessionsToday={Number(user?.sessions_today ?? 0)}
          minutesToday={Number(user?.minutes_today  ?? 0)}
          skillsToday={Number(user?.skills_today    ?? 0)}
          claimedToday={claimedToday}
          onClaim={handleDailyChallengeClaim}
        />

        {/* ── Running session indicator ── */}
        {activeCount > 0 && (
          <View style={styles.runningBanner}>
            <View style={styles.runDot} />
            <View style={styles.runInfo}>
              <Text style={styles.runLabel}>RESOLVE</Text>
              <Text style={styles.runTask} numberOfLines={1}>
                {contracts[0]?.title?.toUpperCase() ?? ""}
                {activeCount > 1 ? `  +${activeCount - 1} more` : ""}
              </Text>
            </View>
          </View>
        )}

        {/* Mission form (only when no active tasks) */}
        {activeCount === 0 && (
          <View ref={missionRef} onLayout={event => { const y = event.nativeEvent.layout.y; setSectionYs(prev => ({ ...prev, mission: y })); }}>
            <MissionForm onStart={handleCreateTask} accentColor={accentColor} />
          </View>
        )}

        {/* Active contracts */}
        {activeCount > 0 && (
          <View ref={contractsRef} onLayout={event => { const y = event.nativeEvent.layout.y; setSectionYs(prev => ({ ...prev, contracts: y })); }}>
            <Text style={styles.sectionLabel}>ACTIVE TASKS</Text>
            {contracts.map(contract => (
              <ContractCard
                key={contract.id}
                contract={contract}
                onComplete={handleComplete}
                onAbort={handleAbort}
              />
            ))}
          </View>
        )}

        {/* Skills grid */}
        {skills.length > 0 && (
          <View ref={skillsRef} onLayout={event => { const y = event.nativeEvent.layout.y; setSectionYs(prev => ({ ...prev, skills: y })); }}>
            <Text style={styles.sectionLabel}>SKILLS</Text>
            <View style={styles.skillGrid}>
              {skills.map(skill => (
                <SkillCard
                  key={skill.skill_name}
                  skill={skill}
                  onPrestige={handlePrestige}
                  accentColor={accentColor}
                  previewXP={
                    activeSkillName === skill.skill_name?.toUpperCase()
                      ? Math.floor(activeStake * elapsedFraction)
                      : 0
                  }
                />
              ))}
            </View>
          </View>
        )}

        {activeCount === 0 && skills.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>◆</Text>
            <Text style={styles.emptyText}>Start a session to begin building your skills.</Text>
          </View>
        )}
      </ScrollView>

      <NotificationToast notifications={notifications} />

      <OnboardingModal
        visible={showOnboarding}
        userId={user?.external_id}
        onClose={() => setShowOnboarding(false)}
        navigation={navigation}
        scrollRef={scrollRef}
        sectionYs={sectionYs}
        sectionRefs={{
          statHud:   statHudRef,
          mission:   missionRef,
          contracts: contractsRef,
          skills:    skillsRef,
        }}
      />

      <WhatsNewModal
        visible={showWhatsNew}
        onClose={() => {
          setShowWhatsNew(false);
          AsyncStorage.setItem(WHATS_NEW_KEY, WHATS_NEW.version).catch(() => {});
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: "transparent" },
  scroll:        { flex: 1 },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 40 },

  hint: { flexDirection: "row", alignItems: "center", gap: 8 },
  hintIcon: { color: COLORS.accent, fontSize: 13 },
  hintText: { color: COLORS.textMuted, fontSize: 13, fontFamily: FONTS.semiBold },

  // ── Running session banner ──
  runningBanner: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             10,
    backgroundColor: "rgba(0,0,0,0.22)",
    borderWidth:     1,
    borderColor:     "rgba(239,68,68,0.25)",
    borderRadius:    10,
    padding:         12,
  },
  runDot: {
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: "#ef4444",
  },
  runInfo: { flex: 1 },
  runLabel: {
    color:         "rgba(239,68,68,0.8)",
    fontSize:      9,
    fontFamily:    FONTS.bold,
    letterSpacing: 2,
    marginBottom:  2,
  },
  runTask: {
    color:      "#f8fafc",
    fontSize:   13,
    fontFamily: FONTS.semiBold,
  },

  sectionLabel: {
    color:         "rgba(255,255,255,0.3)",
    fontSize:      9,
    fontFamily:    FONTS.bold,
    letterSpacing: 2.5,
    marginBottom:  6,
  },
  skillGrid: {
    flexDirection: "row",
    flexWrap:      "wrap",
    gap:           6,
  },
  empty:     { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyIcon: { color: COLORS.border, fontSize: 24 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, fontFamily: FONTS.regular, textAlign: "center" },
});
