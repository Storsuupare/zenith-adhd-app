import React, { useState, useEffect } from "react";
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
import StreakStrip      from "../components/StreakStrip";
import onboardingRefs   from "../utils/onboardingRefs";
import { COLORS } from "../constants/colors";
import { SKILL_ICONS } from "../constants/skills";
import { FONTS } from "../constants/fonts";
import { RADIUS } from "../constants/layout";
import { CREDITS_ICON } from "../constants/currency";

function getContextHint(user) {
  const hour             = new Date().getHours();
  const streak           = user?.streak ?? 0;
  const daysSinceLast    = user?.days_since_last_session ?? 0;
  const inGrace          = user?.streak_in_grace ?? false;

  // Re-entry greeting takes priority — a gap of 3+ days means showing anything
  // else first (REDZONE, streak count) would feel tone-deaf.
  if (daysSinceLast >= 3) return { icon: "◎", text: "Good to have you back. One session at a time.", color: "#22d3ee" };

  // Grace state — streak is frozen, one session saves it.
  if (inGrace && streak > 0) return { icon: "☽", text: `Your ${streak}-day streak is on hold. Complete one session to save it.`, color: "#fb923c" };

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

const TIER_STYLES = {
  novice:   { color: "rgba(255,255,255,0.28)", gradientColors: ["rgba(255,255,255,0.18)", "rgba(255,255,255,0.5)"],  borderColor: "rgba(255,255,255,0.07)",  cardBackground: "rgba(0,0,0,0.22)" },
  adept:    { color: "#00f5ff",                gradientColors: ["#0096c7", "#00f5ff", "#ade8f4"],                     borderColor: "rgba(0,245,255,0.2)",      cardBackground: "rgba(0,18,28,0.26)" },
  vanguard: { color: "#ff0040",                gradientColors: ["#c9184a", "#ff0040", "#ff758f"],                     borderColor: "rgba(255,0,64,0.3)",       cardBackground: "rgba(22,0,10,0.26)" },
};

// ── Skill card (matches SkillSideBar.css) ────────────────────────────────────
function SkillCard({ skill, onPrestige, previewXP = 0, accentColor = "#22d3ee" }) {
  const currentLevel     = skill.current_level ?? 0;
  const currentXP        = skill.current_xp ?? 0;
  const nextLevelXP      = Math.max(skill.next_level_xp ?? 100, 1);
  const prestigeLevel    = skill.prestige_level ?? 0;
  const displayName      = (skill.skill_name || "").toUpperCase();
  const skillIcon        = SKILL_ICONS[displayName];
  const tierStyle        = TIER_STYLES[getTierKey(currentLevel)];
  const canPrestige      = currentLevel >= 99;
  const hasPrestigeBoost = skill.prestige_boost_until && new Date(skill.prestige_boost_until) > new Date();

  const progressPercent  = Math.min((currentXP / nextLevelXP) * 100, 100);
  const projectedPercent = previewXP > 0
    ? Math.min(((currentXP + previewXP) / nextLevelXP) * 100, 100)
    : 0;

  return (
    <View style={[
      skillCardStyles.card,
      { borderColor: tierStyle.borderColor, backgroundColor: tierStyle.cardBackground },
    ]}>

      {skillIcon && (
        <Text style={[skillCardStyles.icon, { color: accentColor }]}>{skillIcon}</Text>
      )}

      <View style={skillCardStyles.levelRow}>
        <View style={skillCardStyles.levelBadge}>
          <Text style={[skillCardStyles.levelText, { color: accentColor }]}>LVL {currentLevel}</Text>
        </View>
        {prestigeLevel > 0 && (
          <View
            style={skillCardStyles.prestigeBadge}
            accessible
            accessibilityLabel={`Prestige ${prestigeLevel}`}
          >
            <Text style={skillCardStyles.prestigeBadgeText} numberOfLines={1}>
              ✦ {prestigeLevel}
            </Text>
          </View>
        )}
      </View>

      <Text style={skillCardStyles.skillName}>
        {displayName}
        {hasPrestigeBoost && <Text style={skillCardStyles.boostBadge}> 2×</Text>}
      </Text>

      {canPrestige ? (
        <TouchableOpacity
          style={skillCardStyles.prestigeButton}
          onPress={() => onPrestige(skill.skill_name)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Prestige ${skill.skill_name}`}
          accessibilityHint="Resets this skill to level 1, permanently unlocking REDZONE immunity and a stacking ten percent XP bonus for this skill."
        >
          <Text style={skillCardStyles.prestigeButtonLabel}>PRESTIGE →</Text>
        </TouchableOpacity>
      ) : (
        <View style={skillCardStyles.progressTrack}>
          {projectedPercent > progressPercent && (
            <View style={[skillCardStyles.progressProjected, { width: `${projectedPercent}%` }]} />
          )}
          <View style={[
            skillCardStyles.progressFill,
            { width: `${progressPercent}%`, backgroundColor: accentColor },
          ]} />
        </View>
      )}

    </View>
  );
}

const skillCardStyles = StyleSheet.create({
  card: {
    width:             "48.5%",
    borderWidth:       1,
    borderRadius:      RADIUS.medium,
    paddingVertical:   10,
    paddingHorizontal: 10,
    minHeight:         90,
  },
  icon: { position: "absolute", top: 10, right: 10, fontSize: 13, opacity: 0.55 },

  levelRow:      { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6, overflow: "hidden" },
  levelBadge:    { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, flexShrink: 0 },
  levelText:     { fontFamily: FONTS.bold, fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  // Persists next to the level badge at every prestige count, uncapped — the
  // level number resets on Prestige, this doesn't, so the achievement never
  // reads as erased.
  prestigeBadge:     { backgroundColor: "rgba(251,191,36,0.12)", borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, flexShrink: 1 },
  prestigeBadgeText: { color: "#fbbf24", fontSize: 9, fontFamily: FONTS.bold, fontWeight: "800", letterSpacing: 0.3 },

  skillName:  { fontFamily: FONTS.bold, fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.9)", letterSpacing: -0.1, marginBottom: 4 },
  boostBadge: { fontSize: 10, fontWeight: "800", color: "#fbbf24" },

  progressTrack:     { height: 3, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 20, overflow: "hidden", marginTop: 6, marginBottom: 4 },
  progressFill:      { height: "100%", borderRadius: 20 },
  progressProjected: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.18)" },

  prestigeButton: {
    marginTop:         10,
    backgroundColor:   "#fbbf24",
    borderRadius:      10,
    paddingVertical:   14,
    paddingHorizontal: 10,
    alignItems:        "center",
    // Static glow, not animated — this button can sit on the Dashboard for
    // days before someone acts on it, so it needs to stand out every time
    // without looping motion on a screen people open dozens of times a day.
    shadowColor:   "#fbbf24",
    shadowOffset:  { width: 0, height: 0 },
    shadowRadius:  10,
    shadowOpacity: 0.6,
    elevation:     6,
  },
  prestigeButtonLabel: { fontFamily: FONTS.black, fontSize: 13, fontWeight: "800", color: "#000", letterSpacing: -0.1 },
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function DashboardScreen() {
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
    addNotification, setPrestigeData,
  } = useTasks();

  const skills       = user?.mastery ?? [];
  const hint         = getContextHint(user);
  const claimedToday = !!user?.daily_challenge_claimed_date &&
    user.daily_challenge_claimed_date.slice(0, 10) === new Date().toISOString().slice(0, 10);

  const handleDailyChallengeClaim = async () => {
    try {
      await claimDailyChallenge();
      addNotification({ type: "success", message: `${CREDITS_ICON} +150 Credits — challenge complete!` });
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
      `Reset ${skillName} to Level 1?\n\nYou'll unlock permanent REDZONE immunity for this skill, a stacking +10% XP bonus, and a Credits reward.`,
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
                    prestigeLevel:   res.data.skill?.prestige_level ?? 1,
                    creditReward:    res.data.drop?.credits_earned ?? 0,
                    redzoneImmunity: Boolean(res.data.redzoneImmunity),
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
        ref={onboardingRefs.dashboardScroll}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
      >
        <View ref={onboardingRefs.statHud} onLayout={event => { onboardingRefs.sectionYs.current.statHud = event.nativeEvent.layout.y; }}>
          <StatHUD user={user} accentColor={accentColor} />
        </View>

        {/* Context hint — only shown during notable windows or active streaks */}
        {hint && (
          <View style={styles.hint}>
            <Text style={[styles.hintIcon, { color: hint.color ?? accentColor }]}>{hint.icon}</Text>
            <Text style={[styles.hintText, { color: hint.color ?? COLORS.textMuted }]}>{hint.text}</Text>
          </View>
        )}

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
          <View ref={onboardingRefs.mission} onLayout={event => { onboardingRefs.sectionYs.current.mission = event.nativeEvent.layout.y; }}>
            <MissionForm onStart={handleCreateTask} accentColor={accentColor} />
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

        <StreakStrip last7Days={user?.last_7_days ?? []} />

        {/* Active contracts */}
        {activeCount > 0 && (
          <View ref={onboardingRefs.contracts} onLayout={event => { onboardingRefs.sectionYs.current.contracts = event.nativeEvent.layout.y; }}>
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
          <View ref={onboardingRefs.skills} onLayout={event => { onboardingRefs.sectionYs.current.skills = event.nativeEvent.layout.y; }}>
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
