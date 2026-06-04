import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Animated, AppState } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../context/ThemeContext";
import { COLORS, SKILL_COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";

function formatTime(s) {
  const m   = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
}

// ── Done state — suspense reveal then collect ────────────────────────────────
function DoneCard({ contract, onComplete, skillColor }) {
  // "calculating" → "revealing" (XP counts up) → "ready" (collect appears)
  const [phase,     setPhase]     = useState("calculating");
  const [displayXP, setDisplayXP] = useState(0);
  const [isPending, setIsPending] = useState(false);

  // Pulsing opacity for the ??? during calculating phase
  const pulse = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    // Pulse the ??? while calculating
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.7, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.25, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();

    // After 2s: start XP count-up
    const t1 = setTimeout(() => {
      anim.stop();
      setPhase("revealing");
      const target = contract.stake_amount || 0;
      const steps  = 24;
      const stepMs = 800 / steps;
      let i = 0;
      const id = setInterval(() => {
        i++;
        setDisplayXP(Math.round((target / steps) * i));
        if (i >= steps) { setDisplayXP(target); clearInterval(id); }
      }, stepMs);
    }, 2000);

    // After 2.9s: show collect button
    const t2 = setTimeout(() => setPhase("ready"), 2900);

    return () => { clearTimeout(t1); clearTimeout(t2); anim.stop(); };
  }, []);

  const handleCollect = async () => {
    if (isPending) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsPending(true);
    try { await onComplete(contract.id); }
    finally { setIsPending(false); }
  };

  return (
    <View style={[d.card, { borderColor: skillColor, borderWidth: 1.5 }]}>
      <View style={[d.strip, { backgroundColor: skillColor, shadowColor: skillColor }]} />

      <View style={d.inner}>
        {/* Header */}
        <View style={d.header}>
          <Text style={[d.skillTag, { color: skillColor }]}>
            {(contract.skill_name || "GENERAL").toUpperCase()}
          </Text>
          <View style={[d.doneBadge, { borderColor: skillColor }]}>
            <Text style={[d.doneBadgeText, { color: skillColor }]}>DONE</Text>
          </View>
          <Text style={d.duration}>{contract.duration_minutes}M</Text>
        </View>

        {/* Title */}
        <Text style={d.title}>{(contract.title || "").toUpperCase()}</Text>

        {/* XP reward — ??? while calculating, counts up when revealing */}
        <View style={d.rewardBlock}>
          {phase === "calculating" ? (
            <Animated.Text style={[d.xpNum, { color: skillColor, opacity: pulse }]}>
              ???
            </Animated.Text>
          ) : (
            <Text style={[d.xpNum, { color: skillColor }]}>+{displayXP}</Text>
          )}
          <Text style={d.xpLabel}>XP</Text>
        </View>

        {/* Status during calculating */}
        {phase === "calculating" && (
          <Text style={d.calcLabel}>CALCULATING REWARDS...</Text>
        )}

        {/* Collect button — appears only when ready */}
        {phase === "ready" && (
          <TouchableOpacity
            style={[d.collectBtn, { backgroundColor: skillColor }]}
            onPress={handleCollect}
            disabled={isPending}
            activeOpacity={0.85}
          >
            {isPending
              ? <ActivityIndicator color="#000" />
              : <Text style={d.collectText}>COLLECT REWARD →</Text>
            }
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Running state ───────────────────────────────────────────────────────────
export default function ContractCard({ contract, onComplete, onAbort }) {
  const { accentColor } = useTheme() || {};
  const duration     = Number(contract.duration_minutes || 30);
  const totalSeconds = duration * 60;

  const getInitial = () => {
    const deadlineMs  = contract.deadline  ? Date.parse(contract.deadline)   : null;
    const serverNowMs = contract.server_now ? Date.parse(contract.server_now) : null;
    // Use server time for the initial calculation so device clock manipulation
    // has no effect. Falls back to duration if server_now is absent.
    if (deadlineMs && serverNowMs && !isNaN(deadlineMs) && !isNaN(serverNowMs)) {
      return Math.max(0, Math.ceil((deadlineMs - serverNowMs) / 1000));
    }
    return totalSeconds;
  };

  const [timeLeft,    setTimeLeft]    = useState(getInitial);
  const [confirmDrop, setConfirmDrop] = useState(false);

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

  // When the app returns to foreground, snap the timer to the real remaining
  // time based on the absolute server deadline — fixes the frozen timer bug
  // when users leave the app to do their actual task.
  useEffect(() => {
    const deadlineMs = contract.deadline ? Date.parse(contract.deadline) : null;
    if (!deadlineMs) return;
    const sub = AppState.addEventListener("change", nextState => {
      if (nextState === "active") {
        setTimeLeft(Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000)));
      }
    });
    return () => sub.remove();
  }, [contract.deadline]);

  const skillColor = SKILL_COLORS[(contract.skill_name || "").toUpperCase()] || accentColor || COLORS.accent;
  const remaining  = Math.max(0, Math.min(100, (timeLeft / totalSeconds) * 100));
  const isCritical = timeLeft > 0 && timeLeft < 60;
  const isDone     = timeLeft <= 0;

  const handleAbort = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onAbort(contract.id);
    setConfirmDrop(false);
  }, [onAbort, contract.id]);

  if (isDone) {
    return <DoneCard contract={contract} onComplete={onComplete} skillColor={skillColor} />;
  }

  return (
    <View style={[s.card, { borderColor: isCritical ? "rgba(255,68,68,0.4)" : "rgba(255,255,255,0.08)" }]}>
      {/* Left 3px accent strip — matches web ::before pseudo-element */}
      <View style={[s.strip, { backgroundColor: skillColor, shadowColor: skillColor }]} />

      {/* Card body */}
      <View style={s.main}>
        {/* Mission header: ID + skill tag */}
        <View style={s.missionHeader}>
          <Text style={s.missionId}>[{contract.id}]</Text>
          <View style={s.skillTag}>
            <Text style={[s.skillTagText, { color: skillColor }]}>
              {(contract.skill_name || "GENERAL").toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={s.missionTitle}>{(contract.title || "").toUpperCase()}</Text>

        {/* Data grid */}
        <View style={s.dataGrid}>
          <View style={s.dataNode}>
            <Text style={s.dataLabel}>TIME LEFT</Text>
            <Text style={[s.dataValue, isCritical && { color: "#ff4444" }]}>
              {formatTime(timeLeft)}
            </Text>
          </View>
          <View style={s.dataNode}>
            <Text style={s.dataLabel}>DURATION</Text>
            <Text style={s.dataValue}>{duration}m</Text>
          </View>
          <View style={s.dataNode}>
            <Text style={s.dataLabel}>REWARD</Text>
            <Text style={[s.dataValue, s.rewardValue]}>+{contract.stake_amount} XP</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={s.progressBar}>
          <View style={[
            s.progressFill,
            {
              width:           `${remaining}%`,
              backgroundColor: isCritical ? "#ff4444" : skillColor,
              shadowColor:     isCritical ? "#ff4444" : skillColor,
            },
          ]} />
        </View>
      </View>

      {/* Action column */}
      <View style={s.actions}>
        {/* Lock indicator while running */}
        <View style={s.lockIndicator}>
          <Text style={s.lockIcon}>⏸</Text>
        </View>

        {/* Abort / confirm */}
        {confirmDrop ? (
          <View style={s.confirmGroup}>
            <TouchableOpacity style={s.abortConfirm} onPress={handleAbort}>
              <Text style={s.abortConfirmText}>DROP</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setConfirmDrop(false)}>
              <Text style={s.cancelText}>KEEP</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={s.abortBtn} onPress={() => setConfirmDrop(true)}>
            <Text style={s.abortText}>DROP</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Running card styles ─────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: {
    position:        "relative",
    flexDirection:   "row",
    backgroundColor: "rgba(0,0,0,0.30)",
    borderWidth:     1,
    borderRadius:    12,
    marginBottom:    12,
    overflow:        "hidden",
  },
  strip: {
    width:        3,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 1,
    elevation:    4,
  },

  main: {
    flex:    1,
    padding: 14,
    gap:     8,
  },

  missionHeader: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
  },
  missionId: {
    fontFamily:    FONTS.monoBold,
    fontSize:      10,
    fontWeight:    "700",
    letterSpacing: 1,
    color:         "rgba(255,255,255,0.18)",
    flexShrink:    0,
  },
  skillTag: {
    flex:              1,
    alignItems:        "center",
    backgroundColor:   "rgba(255,255,255,0.04)",
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.07)",
    borderRadius:      4,
    paddingHorizontal: 7,
    paddingVertical:   2,
  },
  skillTagText: {
    fontFamily:    FONTS.black,
    fontSize:      10,
    fontWeight:    "800",
    letterSpacing: 2.5,
  },

  missionTitle: {
    fontFamily:    FONTS.black,
    fontSize:      15,
    fontWeight:    "800",
    color:         "#fff",
    letterSpacing: 0.5,
    lineHeight:    20,
  },

  dataGrid: {
    flexDirection:  "row",
    gap:            16,
    alignItems:     "flex-start",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.04)",
    paddingTop:     8,
    flexWrap:       "wrap",
  },
  dataNode: { gap: 3 },
  dataLabel: {
    fontFamily:    FONTS.monoBold,
    fontSize:      10,
    fontWeight:    "700",
    color:         "rgba(255,255,255,0.28)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  dataValue: {
    fontFamily:    FONTS.monoBold,
    fontSize:      14,
    fontWeight:    "700",
    color:         "#fff",
  },
  rewardValue: { color: "#00ffa3" },

  progressBar: {
    height:          4,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius:    4,
    overflow:        "hidden",
    marginTop:       4,
  },
  progressFill: {
    height:        "100%",
    borderRadius:  4,
    shadowOffset:  { width: 0, height: 0 },
    shadowRadius:  6,
    shadowOpacity: 0.8,
    elevation:     2,
  },

  actions: {
    width:          72,
    flexShrink:     0,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.05)",
    flexDirection:  "column",
  },
  lockIndicator: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    opacity:        0.22,
  },
  lockIcon: { fontSize: 18, color: "#fff" },

  abortBtn: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
  },
  abortText: {
    fontFamily:    FONTS.monoBold,
    fontSize:      10,
    fontWeight:    "900",
    color:         "rgba(251,113,133,0.7)",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  confirmGroup: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    gap:            8,
  },
  abortConfirm: {
    backgroundColor:   "rgba(251,113,133,0.12)",
    borderWidth:       1,
    borderColor:       "rgba(251,113,133,0.6)",
    borderRadius:      4,
    paddingHorizontal: 8,
    paddingVertical:   4,
  },
  abortConfirmText: {
    fontFamily:    FONTS.monoBold,
    fontSize:      10,
    fontWeight:    "900",
    color:         "#fb7185",
    letterSpacing: 1,
  },
  cancelText: {
    fontFamily:    FONTS.monoBold,
    fontSize:      10,
    fontWeight:    "700",
    color:         "rgba(255,255,255,0.3)",
    letterSpacing: 1,
  },
});

// ── Done card styles ────────────────────────────────────────────────────────
const d = StyleSheet.create({
  card: {
    flexDirection:   "row",
    backgroundColor: "rgba(0,0,0,0.30)",
    borderRadius:    12,
    marginBottom:    12,
    overflow:        "hidden",
  },
  strip: {
    width:         4,
    shadowOffset:  { width: 0, height: 0 },
    shadowRadius:  16,
    shadowOpacity: 1,
    elevation:     6,
  },
  inner: {
    flex:    1,
    padding: 20,
    gap:     10,
  },
  header: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
  },
  skillTag: {
    fontFamily:    FONTS.monoBold,
    fontSize:      11,
    fontWeight:    "800",
    letterSpacing: 2.5,
    textTransform: "uppercase",
  },
  doneBadge: {
    borderWidth:       1,
    borderRadius:      3,
    paddingHorizontal: 7,
    paddingVertical:   2,
    opacity:           0.75,
  },
  doneBadgeText: {
    fontFamily:    FONTS.monoBold,
    fontSize:      9,
    fontWeight:    "900",
    letterSpacing: 3,
  },
  duration: {
    fontFamily:    FONTS.monoBold,
    fontSize:      10,
    fontWeight:    "600",
    letterSpacing: 2,
    color:         "rgba(255,255,255,0.9)",
    marginLeft:    "auto",
  },

  title: {
    fontFamily:    FONTS.black,
    fontSize:      24,
    fontWeight:    "900",
    letterSpacing: -0.5,
    lineHeight:    28,
    color:         "#ffffff",
    textAlign:     "center",
  },

  rewardBlock: {
    flexDirection:  "row",
    alignItems:     "baseline",
    justifyContent: "center",
    gap:            8,
    marginTop:      4,
  },
  xpNum: {
    fontFamily:    FONTS.black,
    fontSize:      48,
    fontWeight:    "900",
    letterSpacing: -1.5,
    lineHeight:    52,
  },
  xpLabel: {
    fontFamily:    FONTS.monoBold,
    fontSize:      18,
    fontWeight:    "700",
    letterSpacing: 1,
    color:         "rgba(255,255,255,0.30)",
    paddingBottom: 6,
  },

  calcLabel: {
    fontFamily:    FONTS.monoBold,
    fontSize:      11,
    fontWeight:    "900",
    letterSpacing: 2,
    color:         "rgba(255,255,255,0.3)",
    textTransform: "uppercase",
    textAlign:     "center",
  },

  collectBtn: {
    width:          "100%",
    paddingVertical: 18,
    alignItems:     "center",
    borderRadius:   4,
    marginTop:      4,
  },
  collectText: {
    fontFamily:    FONTS.black,
    fontSize:      15,
    fontWeight:    "900",
    letterSpacing: 1.5,
    color:         "#000",
    textTransform: "uppercase",
  },
});
