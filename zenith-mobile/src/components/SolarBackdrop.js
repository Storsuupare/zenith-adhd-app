import React, { useEffect, useRef, useState, useMemo } from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../context/ThemeContext";

const { width: W, height: H } = Dimensions.get("window");

// ── Phase calculation ─────────────────────────────────────────────────────────
function getSolarPhase(hour) {
  if (hour >= 6  && hour < 9)  return "morning";
  if (hour >= 9  && hour < 11) return "day";
  if (hour >= 11 && hour < 14) return "noon";
  if (hour >= 14 && hour < 18) return "evening";
  if (hour >= 18 && hour < 21) return "sunset";
  return "night";
}

// ── Default sky (FREE / credits themes) ──────────────────────────────────────
const SKY_DEFAULT = {
  morning: ["#1e2a44", "#ff9a9e"],
  day:     ["#003264", "#0072ff"],
  noon:    ["#001f3f", "#0074d9"],
  evening: ["#1a0e00", "#e36f36"],
  sunset:  ["#03060b", "#fb5928"],
  night:   ["#03060b", "#0f172a"],
};

// ── PRO+ theme sky overrides — each phase pair is [top, bottom] ───────────────
const THEME_SKY_OVERRIDES = {
  // ── Neon (hot pink #f72585) — cyberpunk noir ──────────────────────────────
  neon: {
    morning: ["#1a0018", "#ff3fa0"],
    day:     ["#160020", "#580050"],
    noon:    ["#120018", "#460040"],
    evening: ["#1a0028", "#7a0060"],
    sunset:  ["#2a0035", "#6b0050"],
    night:   ["#050108", "#1d0015"],
  },
  // ── Arctic (ice blue #67e8f9) — polar atmosphere ─────────────────────────
  arctic: {
    morning: ["#0d2040", "#7ac8e0"],
    day:     ["#0a2850", "#1a8aaa"],
    noon:    ["#082040", "#1a7090"],
    evening: ["#0d1830", "#1a4060"],
    sunset:  ["#0d1a40", "#1a2860"],
    night:   ["#060e1e", "#0a1a3d"],
  },
  // ── Solar (orange #fb8500) — scorching desert ─────────────────────────────
  solar: {
    morning: ["#2a1000", "#ff7800"],
    day:     ["#2e1500", "#d46000"],
    noon:    ["#281800", "#c05800"],
    evening: ["#2c1500", "#c06000"],
    sunset:  ["#3d1500", "#8b3000"],
    night:   ["#1a0900", "#2a1400"],
  },
  // ── Nebula (deep purple #7209b7) — cosmic deep space ─────────────────────
  nebula: {
    morning: ["#0a0025", "#7209b7"],
    day:     ["#0d0030", "#4a0090"],
    noon:    ["#0a0025", "#3a0070"],
    evening: ["#0a0025", "#500090"],
    sunset:  ["#0d0030", "#6000a0"],
    night:   ["#04000e", "#0d0030"],
  },
  // ── Obsidian (dark purple #6d28d9) — shadow realm ────────────────────────
  obsidian: {
    morning: ["#080015", "#4d1aa0"],
    day:     ["#0e0025", "#471090"],
    noon:    ["#0a001e", "#380f80"],
    evening: ["#0a001a", "#4a0a90"],
    sunset:  ["#0d0025", "#5a0aa0"],
    night:   ["#000000", "#0a0020"],
  },
  // ── Ghost (silver white #e2e8f0) — ethereal mist ─────────────────────────
  ghost: {
    morning: ["#1a2030", "#b0c4d8"],
    day:     ["#1a2540", "#3a6090"],
    noon:    ["#121e38", "#2a5070"],
    evening: ["#141830", "#2a3060"],
    sunset:  ["#1a1a30", "#2a2850"],
    night:   ["#0d0d12", "#1a1a2e"],
  },
};

// PRO+ theme IDs that get sky overrides
const PRO_THEMES = new Set(["neon", "arctic", "solar", "nebula", "obsidian", "ghost"]);

// ── Sun config per phase ──────────────────────────────────────────────────────
// corona1/corona2: concentric glow rings rendered behind the disc (cross-platform glow)
const SUN_CONFIG = {
  morning: {
    size: 68, topF: 0.84, leftF: 0.28,
    color: "#ffe0a0", shadow: "rgba(255,140,60,1.0)", sr: 60,
    corona1: { size: 160, color: "rgba(255,160,60,0.52)"  },
    corona2: { size: 260, color: "rgba(255,120,40,0.24)"  },
  },
  day: {
    size: 100, topF: 0.38, leftF: 0.62,
    color: "#ffffff", shadow: "rgba(255,255,220,1.0)", sr: 80,
    corona1: { size: 240, color: "rgba(255,255,180,0.50)" },
    corona2: { size: 380, color: "rgba(255,240,140,0.22)" },
  },
  noon: {
    size: 112, topF: 0.46, leftF: 0.50,
    color: "#ffffff", shadow: "rgba(255,255,240,1.0)", sr: 95,
    corona1: { size: 280, color: "rgba(255,255,200,0.55)" },
    corona2: { size: 440, color: "rgba(255,250,180,0.24)" },
  },
  evening: {
    size: 84, topF: 0.60, leftF: 0.72,
    color: "#ffe566", shadow: "rgba(255,160,0,1.0)", sr: 70,
    corona1: { size: 210, color: "rgba(255,160,0,0.50)"   },
    corona2: { size: 340, color: "rgba(220,100,0,0.22)"   },
  },
  sunset: {
    size: 78, topF: 0.88, leftF: 0.80,
    color: "#ff8c55", shadow: "rgba(255,80,20,1.0)", sr: 70,
    corona1: { size: 190, color: "rgba(240,80,20,0.50)"   },
    corona2: { size: 310, color: "rgba(200,40,10,0.22)"   },
  },
  night: null,
};

// ── Cloud data ────────────────────────────────────────────────────────────────
const CLOUDS = [
  { w: W * 0.65, h: 55, topF: 0.08, leftF: 0.05, opacity: 0.60, duration: 18000 },
  { w: W * 0.48, h: 42, topF: 0.18, leftF: 0.32, opacity: 0.45, duration: 24000 },
  { w: W * 0.55, h: 62, topF: 0.30, leftF: 0.38, opacity: 0.35, duration: 30000 },
  { w: W * 0.38, h: 38, topF: 0.12, leftF: 0.52, opacity: 0.50, duration: 20000 },
];

// ── Stars ─────────────────────────────────────────────────────────────────────
const STARS = Array.from({ length: 80 }, (_, i) => ({
  id:    i,
  x:     ((i * 37) % 100) / 100 * W,
  y:     ((i * 53) % 90)  / 100 * H * 0.7,
  size:  1 + ((i * 7) % 3),
  delay: (i * 0.37) % 4,
}));

// ── Animated cloud ────────────────────────────────────────────────────────────
const Cloud = React.memo(function Cloud({ w, h, topF, leftF, opacity, duration }) {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 60, duration, useNativeDriver: true, isInteraction: false }),
        Animated.timing(drift, { toValue: 0,  duration, useNativeDriver: true, isInteraction: false }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position:        "absolute",
        top:             topF * H,
        left:            leftF * W,
        width:           w,
        height:          h,
        borderRadius:    h / 2,
        backgroundColor: "rgba(255,255,255,0.55)",
        opacity,
        transform: [{ translateX: drift }],
      }}
    />
  );
});

// ── Twinkling star ────────────────────────────────────────────────────────────
const Star = React.memo(function Star({ x, y, size, delay }) {
  const twinkle = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(twinkle, { toValue: 1,    duration: 1250, useNativeDriver: true, isInteraction: false }),
          Animated.timing(twinkle, { toValue: 0.25, duration: 1250, useNativeDriver: true, isInteraction: false }),
        ])
      ).start();
    }, delay * 1000);
  }, []);

  return (
    <Animated.View
      style={{
        position:        "absolute",
        left:            x,
        top:             y,
        width:           size,
        height:          size,
        borderRadius:    size / 2,
        backgroundColor: "#ffffff",
        opacity:         twinkle,
      }}
    />
  );
});

// ── Main component ────────────────────────────────────────────────────────────
export default function SolarBackdrop({ children }) {
  const { activeTheme } = useTheme() || {};
  const hour     = new Date().getHours();
  const phase    = getSolarPhase(hour);
  const sunCfg   = SUN_CONFIG[phase];
  const isNight    = phase === "night";
  const showClouds = phase === "morning" || phase === "day" || phase === "noon";

  // Clouds: always mounted so the drift animation never resets.
  // We just fade the whole group in/out when the phase changes.
  const cloudGroupOpacity = useRef(new Animated.Value(showClouds ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(cloudGroupOpacity, {
      toValue:        showClouds ? 1 : 0,
      duration:       3000,
      useNativeDriver: true,
    }).start();
  }, [showClouds]);

  // Created once — empty deps means clouds never unmount
  const cloudElements = useMemo(
    () => CLOUDS.map((c, i) => <Cloud key={i} {...c} />),
    []
  );
  const starElements = useMemo(
    () => isNight ? STARS.map(s => <Star key={s.id} {...s} />) : null,
    [isNight]
  );

  // Pick sky palette: PRO+ theme override or default
  const skyPalette = (activeTheme && PRO_THEMES.has(activeTheme))
    ? THEME_SKY_OVERRIDES[activeTheme]
    : SKY_DEFAULT;
  const sky = skyPalette[phase];

  // Smooth sky transition on phase change
  const skyOpacity = useRef(new Animated.Value(1)).current;
  const [currentSky, setCurrentSky] = useState(sky);

  useEffect(() => {
    if (sky[0] !== currentSky[0] || sky[1] !== currentSky[1]) {
      Animated.timing(skyOpacity, { toValue: 0, duration: 4000, useNativeDriver: true }).start(() => {
        setCurrentSky(sky);
        Animated.timing(skyOpacity, { toValue: 1, duration: 4000, useNativeDriver: true }).start();
      });
    }
  }, [sky[0], sky[1], activeTheme]);

  return (
    <View style={styles.root}>
      {/* Sky gradient */}
      <Animated.View style={[styles.fill, { opacity: skyOpacity }]}>
        <LinearGradient
          colors={currentSky}
          style={styles.fill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      </Animated.View>

      {/* Clouds — always mounted, faded out during non-cloud phases */}
      <Animated.View style={[styles.fill, { opacity: cloudGroupOpacity }]} pointerEvents="none">
        {cloudElements}
      </Animated.View>

      {/* Sun — corona rings + disc */}
      {sunCfg && (() => {
        const cx = sunCfg.leftF * W;
        const cy = sunCfg.topF  * H;
        return (
          <>
           
            
          
            {/* Sun disc */}
            <View style={{
              position:        "absolute",
              top:             cy - sunCfg.size / 2,
              left:            cx - sunCfg.size / 2,
              width:           sunCfg.size,
              height:          sunCfg.size,
              borderRadius:    sunCfg.size / 2,
              backgroundColor: sunCfg.color,
              shadowColor:     sunCfg.shadow,
              shadowOffset:    { width: 0, height: 0 },
              shadowOpacity:   1,
              shadowRadius:    sunCfg.sr,
              elevation:       24,
            }} />
          </>
        );
      })()}

      {/* Moon — outer halo + inner glow + disc */}
      {isNight && (
        <>
          <View style={styles.moonHalo2} />
          <View style={styles.moonHalo1} />
          <View style={styles.moon} />
        </>
      )}

      {/* Stars */}
      {starElements}

      {/* Content overlay — brighter than before */}
      <View style={styles.overlay} />

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: "#03060b" },
  fill:    { ...StyleSheet.absoluteFillObject },
  // Reduced from 0.40 → 0.28 so the sky breathes through the UI
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(4,6,12,0.28)" },
  content: { flex: 1 },
  moon: {
    position:        "absolute",
    top:             H * 0.12 - 42,
    left:            W * 0.72 - 42,
    width:           84,
    height:          84,
    borderRadius:    42,
    backgroundColor: "#ffffff",
    shadowColor:     "rgba(240,240,200,1.0)",
    shadowOffset:    { width: 0, height: 0 },
    shadowOpacity:   1,
    shadowRadius:    50,
    elevation:       20,
  },
  moonHalo1: {
    position:        "absolute",
    top:             H * 0.12 - 100,
    left:            W * 0.72 - 100,
    width:           200,
    height:          200,
    borderRadius:    100,
    backgroundColor: "rgba(220,220,160,0.38)",
  },
  moonHalo2: {
    position:        "absolute",
    top:             H * 0.12 - 160,
    left:            W * 0.72 - 160,
    width:           320,
    height:          320,
    borderRadius:    160,
    backgroundColor: "rgba(200,200,140,0.16)",
  },
});
