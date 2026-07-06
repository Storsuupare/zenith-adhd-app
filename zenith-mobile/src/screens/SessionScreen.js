import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Animated, AppState, ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import { COLORS, SKILL_COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { useTheme } from "../context/ThemeContext";

// ── Neural Clock window — mirrors server getNeuralMult() ─────────────────────
function getNeuralWindow() {
  const hour = new Date().getHours();
  if (hour >= 0  && hour < 5)  return { mult: 0.5,  label: "REDZONE",    color: "#ff4444", isRedzone: true  };
  if (hour >= 8  && hour < 11) return { mult: 1.25, label: "PEAK",       color: "#22d3ee", isRedzone: false };
  if (hour >= 22)              return { mult: 1.5,  label: "HYPERFOCUS", color: "#a78bfa", isRedzone: false };
  return { mult: 1.0, label: "STANDARD", color: "rgba(255,255,255,0.25)", isRedzone: false };
}

// ── Solar phase accent for the "REMAINING" label ──────────────────────────────
// Colors sampled from the sky palette bottom gradients so the label feels
// part of the backdrop rather than floating over it.
const PHASE_LABEL_COLOR = {
  morning: "#ffb3a0",
  day:     "#60a5fa",
  noon:    "#38bdf8",
  evening: "#fb923c",
  sunset:  "#f97316",
  night:   "#94a3b8",
};

function getSolarLabelColor() {
  const hour = new Date().getHours();
  if (hour >= 6  && hour < 9)  return PHASE_LABEL_COLOR.morning;
  if (hour >= 9  && hour < 12) return PHASE_LABEL_COLOR.day;
  if (hour >= 12 && hour < 17) return PHASE_LABEL_COLOR.noon;
  if (hour >= 17 && hour < 20) return PHASE_LABEL_COLOR.evening;
  if (hour >= 20 && hour < 22) return PHASE_LABEL_COLOR.sunset;
  return PHASE_LABEL_COLOR.night;
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// ── Done state — mirrors ContractCard DoneCard but full-screen ────────────────
function DoneOverlay({ contract, skillColor, onComplete }) {
  const [phase,        setPhase]        = useState("idle");
  const [displayXP,    setDisplayXP]    = useState(0);
  const [sessionCr,    setSessionCr]    = useState(0);
  const [isPending,    setIsPending]    = useState(false);
  const [neuralWindow, setNeuralWindow] = useState(() => getNeuralWindow());
  const pulse = useRef(new Animated.Value(0.3)).current;

  // Pulse the ??? while idle
  useEffect(() => {
    if (phase !== "idle") return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [phase]);

  const runReveal = (actualReward) => {
    setPhase("revealing");
    const target = actualReward || 0;
    const steps  = 28;
    let step = 0;
    const intervalId = setInterval(() => {
      step++;
      setDisplayXP(Math.round((target / steps) * step));
      if (step >= steps) {
        setDisplayXP(target);
        clearInterval(intervalId);
        setPhase("done");
      }
    }, 900 / steps);
  };

  const handleCollect = async () => {
    if (isPending) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsPending(true);
    setPhase("collecting");
    try {
      const result = await onComplete(contract.id);
      const actualReward = result?.reward ?? result?.xp_earned ?? contract.stake_amount ?? 0;
      setSessionCr(result?.credits_earned ?? 0);
      runReveal(actualReward);
    } catch (collectError) {
      console.error("[DoneOverlay] collect failed:", collectError?.message);
      setPhase("idle");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <View style={done.root}>
      <View style={[done.strip, { backgroundColor: skillColor }]} />

      <Text style={[done.skillLabel, { color: skillColor }]}>
        {(contract.skill_name || "GENERAL").toUpperCase()}
      </Text>
      <Text style={done.title}>{(contract.title || "").toUpperCase()}</Text>

      <View style={done.xpRow}>
        {phase === "idle" || phase === "collecting" ? (
          <Animated.Text style={[done.xpNum, { color: skillColor, opacity: pulse }]}>???</Animated.Text>
        ) : (
          <Text style={[done.xpNum, { color: skillColor }]}>+{displayXP}</Text>
        )}
        <Text style={done.xpLabel}>XP</Text>
      </View>

      {phase === "done" && sessionCr > 0 && (
        <Text style={done.crEarned}>+{sessionCr} CR</Text>
      )}

      {neuralWindow.isRedzone && (phase === "idle" || phase === "collecting") && (
        <View style={done.redzoneNotice}>
          <Text style={done.redzoneNoticeText}>REDZONE ACTIVE — REWARDS HALVED</Text>
        </View>
      )}

      {phase === "done" && neuralWindow.label !== "STANDARD" && (
        <View style={[done.neuralBadge, {
          backgroundColor: neuralWindow.color + "18",
          borderColor:     neuralWindow.color + "45",
        }]}>
          <Text style={[done.neuralBadgeText, { color: neuralWindow.color }]}>
            {neuralWindow.label} ×{neuralWindow.mult} APPLIED
          </Text>
        </View>
      )}

      {phase === "idle" && (
        <TouchableOpacity
          style={[done.collectBtn, { backgroundColor: skillColor }]}
          onPress={handleCollect}
          activeOpacity={0.85}
        >
          <Text style={done.collectText}>COLLECT REWARD →</Text>
        </TouchableOpacity>
      )}

      {phase === "collecting" && (
        <View style={[done.collectBtn, { backgroundColor: skillColor, opacity: 0.6 }]}>
          <ActivityIndicator color="#000" />
        </View>
      )}
    </View>
  );
}

// ── Main session screen ───────────────────────────────────────────────────────
export default function SessionScreen({ contract, onComplete, onAbort }) {
  const { accentColor } = useTheme() || {};
  const duration     = Number(contract.duration_minutes || 30);
  const totalSeconds = duration * 60;
  const prestige     = Number(contract.prestige_level || 0);
  const skillColor   = SKILL_COLORS[(contract.skill_name || "").toUpperCase()] || COLORS.accent;

  const getInitial = () => {
    const deadlineMs  = contract.deadline   ? Date.parse(contract.deadline)   : null;
    const serverNowMs = contract.server_now ? Date.parse(contract.server_now) : null;
    if (deadlineMs && serverNowMs && !isNaN(deadlineMs) && !isNaN(serverNowMs)) {
      return Math.max(0, Math.ceil((deadlineMs - serverNowMs) / 1000));
    }
    return totalSeconds;
  };

  const [timeLeft,     setTimeLeft]     = useState(getInitial);
  const [confirmDrop,  setConfirmDrop]  = useState(false);
  const [neural,       setNeural]       = useState(getNeuralWindow);
  const [labelColor,   setLabelColor]   = useState(getSolarLabelColor);

  // Tick every second
  useEffect(() => {
    if (timeLeft <= 0) return;
    const tick = setTimeout(() => {
      setTimeLeft(prev => {
        const next = Math.max(0, prev - 1);
        if (next === 0) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return next;
      });
    }, 1000);
    return () => clearTimeout(tick);
  }, [timeLeft]);

  // Re-sync to absolute deadline when app returns to foreground
  useEffect(() => {
    const deadlineMs = contract.deadline ? Date.parse(contract.deadline) : null;
    if (!deadlineMs) return;
    const sub = AppState.addEventListener("change", state => {
      if (state === "active") {
        setTimeLeft(Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000)));
        setNeural(getNeuralWindow());
      }
    });
    return () => sub.remove();
  }, [contract.deadline]);

  // Re-check neural window and solar label color every minute
  useEffect(() => {
    const id = setInterval(() => {
      setNeural(getNeuralWindow());
      setLabelColor(getSolarLabelColor());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const handleAbort = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onAbort(contract.id);
    setConfirmDrop(false);
  }, [onAbort, contract.id]);

  const remaining  = Math.min((timeLeft / totalSeconds) * 100, 100);
  const isCritical = timeLeft > 0 && timeLeft < 60;
  const isDone     = timeLeft <= 0;

  if (isDone) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: "rgba(0,0,0,0.96)" }]}>
        <DoneOverlay contract={contract} skillColor={skillColor} onComplete={onComplete} />
      </SafeAreaView>
    );
  }

  const timerColor   = isCritical ? "#ff4444" : "#ffffff";
  const progressColor = isCritical ? "#ff4444" : skillColor;

  return (
    <SafeAreaView style={styles.root}>
      {/* Skill colour ambient tint */}
      <View style={[styles.tint, { backgroundColor: skillColor, opacity: neural.isRedzone ? 0 : 0.05 }]} />
      {neural.isRedzone && <View style={styles.rezoneTint} />}

      {/* ── Header ── */}
      <View style={styles.header}>
        {/* Skill + prestige row — centred */}
        <View style={styles.skillRow}>
          <Text style={[styles.skillName, { color: skillColor }]}>
            {(contract.skill_name || "GENERAL").toUpperCase()}
          </Text>
          {prestige > 0 && (
            <>
              <Text style={styles.skillDot}>·</Text>
              <View style={[styles.prestigeBadge, { borderColor: skillColor }]}>
                <Text style={[styles.prestigeText, { color: skillColor }]}>
                  PRESTIGE {prestige}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Mission title — centred, dominant */}
        <Text style={styles.missionTitle} numberOfLines={3}>
          {(contract.title || "").toUpperCase()}
        </Text>
      </View>

      {/* ── Timer ── */}
      <View style={styles.timerBlock}>
        <Text style={[styles.timer, { color: timerColor }]}>{formatTime(timeLeft)}</Text>
        <Text style={[styles.timerLabel, { color: labelColor }]}>REMAINING</Text>
      </View>

      {/* ── Progress bar ── */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, {
          width:           `${remaining}%`,
          backgroundColor: progressColor,
          shadowColor:     progressColor,
        }]} />
      </View>

      {/* ── Data row ── */}
      <View style={styles.dataRow}>
        <View style={styles.dataNode}>
          <Text style={styles.dataLabel}>REWARD</Text>
          <Text style={[styles.dataValue, { color: skillColor }]}>+{contract.stake_amount} XP</Text>
        </View>
        <View style={styles.dataDivider} />
        <View style={styles.dataNode}>
          <Text style={styles.dataLabel}>NEURAL</Text>
          <Text style={[styles.dataValue, { color: neural.label === "PEAK" ? (accentColor || neural.color) : neural.color }]}>
            ×{neural.mult} {neural.label}
          </Text>
        </View>
        <View style={styles.dataDivider} />
        <View style={styles.dataNode}>
          <Text style={styles.dataLabel}>DURATION</Text>
          <Text style={styles.dataValue}>{duration}M</Text>
        </View>
      </View>

      {/* ── REDZONE warning ── */}
      {neural.isRedzone && (
        <View style={styles.redzoneBar}>
          <Text style={styles.redzoneText}>⚠ REDZONE ACTIVE — REWARDS HALVED</Text>
        </View>
      )}

      {/* ── Drop / confirm ── */}
      <View style={styles.dropArea}>
        {confirmDrop ? (
          <View style={styles.confirmRow}>
            <TouchableOpacity style={styles.dropConfirmBtn} onPress={handleAbort}>
              <Text style={styles.dropConfirmText}>DROP SESSION</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.keepBtn} onPress={() => setConfirmDrop(false)}>
              <Text style={styles.keepText}>KEEP GOING</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.dropBtn} onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setConfirmDrop(true);
          }}>
            <Text style={styles.dropText}>DROP</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: "transparent",
    paddingHorizontal: 24,
    paddingVertical:   16,
    gap:             24,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
  },
  rezoneTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,34,34,0.07)",
  },

  // ── Header ──
  header: {
    gap:        10,
    marginTop:  48,
    alignItems: "center",
  },
  skillRow: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    gap:            8,
  },
  skillName: {
    fontFamily:    FONTS.monoBold,
    fontSize:      15,
    fontWeight:    "900",
    letterSpacing: 3,
  },
  skillDot: {
    color:      "rgba(255,255,255,0.25)",
    fontSize:   12,
  },
  prestigeBadge: {
    borderWidth:       1,
    borderRadius:      4,
    paddingHorizontal: 8,
    paddingVertical:   2,
  },
  prestigeText: {
    fontFamily:    FONTS.monoBold,
    fontSize:      10,
    fontWeight:    "800",
    letterSpacing: 2,
  },
  missionTitle: {
    fontFamily:    FONTS.black,
    fontSize:      26,
    fontWeight:    "900",
    color:         "#ffffff",
    letterSpacing: -0.5,
    lineHeight:    30,
    textAlign:     "center",
    paddingHorizontal: 8,
  },

  // ── Timer ──
  timerBlock: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    gap:            6,
  },
  timer: {
    fontFamily:    FONTS.monoBold,
    fontSize:      80,
    fontWeight:    "700",
    letterSpacing: -4,
    lineHeight:    86,
  },
  timerLabel: {
    fontFamily:    FONTS.monoBold,
    fontSize:      21,
    fontWeight:    "900",
    letterSpacing: 4,
    opacity:       0.9,
  },

  // ── Progress bar ──
  progressTrack: {
    height:          6,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius:    6,
    overflow:        "hidden",
  },
  progressFill: {
    height:        "100%",
    borderRadius:  6,
    shadowOffset:  { width: 0, height: 0 },
    shadowRadius:  8,
    shadowOpacity: 0.8,
    elevation:     3,
  },

  // ── Data row ──
  dataRow: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "space-between",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.07)",
    borderRadius:    12,
    padding:         16,
  },
  dataNode: { flex: 1, alignItems: "center", gap: 4 },
  dataLabel: {
    fontFamily:    FONTS.monoBold,
    fontSize:      10,
    fontWeight:    "700",
    color:         "rgba(255,255,255,0.28)",
    letterSpacing: 1.5,
  },
  dataValue: {
    fontFamily:    FONTS.monoBold,
    fontSize:      13,
    fontWeight:    "700",
    color:         "#ffffff",
    textAlign:     "center",
  },
  dataDivider: {
    width:           1,
    height:          32,
    backgroundColor: "rgba(255,255,255,0.07)",
  },

  // ── REDZONE bar ──
  redzoneBar: {
    backgroundColor: "rgba(255,34,34,0.1)",
    borderWidth:     1,
    borderColor:     "rgba(255,34,34,0.3)",
    borderRadius:    8,
    paddingVertical: 10,
    alignItems:      "center",
  },
  redzoneText: {
    fontFamily:    FONTS.monoBold,
    fontSize:      11,
    fontWeight:    "900",
    letterSpacing: 2,
    color:         "#ff4444",
  },

  // ── Drop ──
  dropArea:   { paddingBottom: 8 },
  confirmRow: { gap: 10 },
  dropConfirmBtn: {
    backgroundColor: "rgba(255,34,68,0.12)",
    borderWidth:     1,
    borderColor:     "rgba(255,34,68,0.5)",
    borderRadius:    12,
    paddingVertical: 16,
    alignItems:      "center",
  },
  dropConfirmText: {
    fontFamily:    FONTS.monoBold,
    fontSize:      13,
    fontWeight:    "900",
    color:         "#fb7185",
    letterSpacing: 2,
  },
  keepBtn: {
    paddingVertical: 12,
    alignItems:      "center",
  },
  keepText: {
    fontFamily:    FONTS.monoBold,
    fontSize:      12,
    fontWeight:    "700",
    color:         "rgba(255,255,255,0.3)",
    letterSpacing: 1.5,
  },
  dropBtn: {
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.1)",
    borderRadius:    12,
    paddingVertical: 14,
    alignItems:      "center",
  },
  dropText: {
    fontFamily:    FONTS.monoBold,
    fontSize:      12,
    fontWeight:    "700",
    color:         "rgba(255,255,255,0.25)",
    letterSpacing: 2,
  },
});

// ── Done overlay styles ───────────────────────────────────────────────────────
const done = StyleSheet.create({
  root: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    padding:        32,
    gap:            16,
  },
  strip: {
    position:     "absolute",
    top:          0,
    left:         0,
    right:        0,
    height:       3,
    opacity:      0.8,
  },
  skillLabel: {
    fontFamily:    FONTS.monoBold,
    fontSize:      20,
    fontWeight:    "900",
    letterSpacing: 3,
  },
  title: {
    fontFamily:    FONTS.black,
    fontSize:      34,
    fontWeight:    "900",
    color:         "#ffffff",
    letterSpacing: -0.5,
    textAlign:     "center",
    lineHeight:    38,
  },
  xpRow: {
    flexDirection:  "row",
    alignItems:     "baseline",
    gap:            10,
    marginTop:      8,
  },
  xpNum: {
    fontFamily:    FONTS.black,
    fontSize:      64,
    fontWeight:    "900",
    letterSpacing: -2,
    lineHeight:    68,
  },
  xpLabel: {
    fontFamily:    FONTS.monoBold,
    fontSize:      22,
    fontWeight:    "700",
    color:         "rgba(255,255,255,0.3)",
    paddingBottom: 8,
  },
  calcLabel: {
    fontFamily:    FONTS.monoBold,
    fontSize:      11,
    fontWeight:    "900",
    letterSpacing: 2,
    color:         "rgba(255,255,255,0.3)",
  },
  redzoneNotice: {
    backgroundColor: "rgba(255,34,34,0.1)",
    borderWidth:     1,
    borderColor:     "rgba(255,34,34,0.35)",
    borderRadius:    8,
    paddingVertical:   8,
    paddingHorizontal: 16,
    alignItems:      "center",
  },
  redzoneNoticeText: {
    fontFamily:    FONTS.monoBold,
    fontSize:      11,
    fontWeight:    "900",
    letterSpacing: 2,
    color:         "#ff4444",
  },
  crEarned: {
    fontFamily:    FONTS.monoBold,
    fontSize:      18,
    fontWeight:    "700",
    color:         "#fbbf24",
    letterSpacing: 0.5,
  },
  neuralBadge: {
    borderWidth:       1,
    borderRadius:      8,
    paddingVertical:   8,
    paddingHorizontal: 16,
    alignItems:        "center",
  },
  neuralBadgeText: {
    fontFamily:    FONTS.monoBold,
    fontSize:      11,
    fontWeight:    "900",
    letterSpacing: 2,
  },
  collectBtn: {
    width:           "100%",
    paddingVertical: 20,
    alignItems:      "center",
    borderRadius:    4,
    marginTop:       8,
  },
  collectText: {
    fontFamily:    FONTS.black,
    fontSize:      15,
    fontWeight:    "900",
    letterSpacing: 1.5,
    color:         "#000",
  },
});
