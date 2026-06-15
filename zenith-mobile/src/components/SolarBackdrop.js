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

// ── Theme sky overrides — each phase pair is [top, bottom] ───────────────────
const THEME_SKY_OVERRIDES = {
  // ── Cobalt — subtle blue tint (credits theme) ────────────────────────────
  cobalt: {
    morning: ["#0d1e30", "#2a4870"],
    day:     ["#0e2240", "#305888"],
    noon:    ["#102848", "#3a6898"],
    evening: ["#0a1828", "#203858"],
    sunset:  ["#060e1c", "#142440"],
    night:   ["#020810", "#061830"],
  },
  // ── Amber — subtle warm tint (credits theme) ──────────────────────────────
  amber: {
    morning: ["#1c0e00", "#784010"],
    day:     ["#221000", "#885018"],
    noon:    ["#281200", "#986020"],
    evening: ["#180a00", "#602800"],
    sunset:  ["#100800", "#401800"],
    night:   ["#0a0600", "#1c0e00"],
  },
  // ── Crimson — subtle red tint (credits theme) ─────────────────────────────
  crimson: {
    morning: ["#160005", "#601020"],
    day:     ["#1a0008", "#701828"],
    noon:    ["#200008", "#802030"],
    evening: ["#120005", "#50080c"],
    sunset:  ["#0e0003", "#380408"],
    night:   ["#080003", "#180508"],
  },
  // ── Violet — subtle purple tint (credits theme) ───────────────────────────
  violet: {
    morning: ["#0e0018", "#401868"],
    day:     ["#100020", "#502078"],
    noon:    ["#140025", "#602888"],
    evening: ["#0c0018", "#381060"],
    sunset:  ["#080010", "#240840"],
    night:   ["#050008", "#100018"],
  },
  // ── Jade — subtle green tint (credits theme) ──────────────────────────────
  jade: {
    morning: ["#001408", "#185838"],
    day:     ["#001808", "#206840"],
    noon:    ["#001e0a", "#287848"],
    evening: ["#001005", "#104828"],
    sunset:  ["#000c04", "#083018"],
    night:   ["#000804", "#021408"],
  },
  // ── Neon — cyberpunk sky, blazing pink at noon ────────────────────────────
  neon: {
    morning: ["#200018", "#c02880"],  // dark pink dawn
    day:     ["#280020", "#d83090"],  // rising neon
    noon:    ["#340028", "#ff40a8"],  // peak — vivid hot pink
    evening: ["#1e0020", "#8a1068"],  // dimming
    sunset:  ["#160018", "#6a0850"],  // deep magenta
    night:   ["#050108", "#1d0015"],  // near black
  },
  // ── Arctic — polar sky, brightest ice blue at noon ────────────────────────
  arctic: {
    morning: ["#0a2038", "#60c8e8"],  // cold blue dawn
    day:     ["#0c2c50", "#70d8f8"],  // brightening
    noon:    ["#104070", "#90eeff"],  // peak — vivid polar blue
    evening: ["#082040", "#2888a8"],  // dimming
    sunset:  ["#061830", "#185878"],  // deep arctic blue
    night:   ["#060e1e", "#0a1a3d"],  // near black
  },
  // ── Solar — scorched desert, peak blaze at noon ───────────────────────────
  solar: {
    morning: ["#301000", "#e07000"],  // orange dawn
    day:     ["#3c1400", "#f08000"],  // heating
    noon:    ["#501800", "#ff9a00"],  // peak — scorching orange
    evening: ["#2c1000", "#b04800"],  // cooling
    sunset:  ["#200c00", "#803000"],  // deep ember
    night:   ["#1a0900", "#2a1400"],  // near black
  },
  // ── Nebula — cosmic sky, deep space purple at noon ────────────────────────
  nebula: {
    morning: ["#0c0028", "#7808b8"],  // purple space dawn
    day:     ["#100030", "#9010d0"],  // brightening
    noon:    ["#160040", "#b018f0"],  // peak — vivid cosmic purple
    evening: ["#0c0028", "#500090"],  // dimming
    sunset:  ["#080018", "#380070"],  // deep space
    night:   ["#04000e", "#0d0030"],  // near black
  },
  // ── Obsidian — shadow realm, dark violet peak ─────────────────────────────
  obsidian: {
    morning: ["#0a0018", "#5020a8"],  // shadow dawn
    day:     ["#0e0020", "#6028c0"],  // rising
    noon:    ["#140028", "#7838e0"],  // peak — vivid shadow violet
    evening: ["#0a0018", "#3c1088"],  // dimming
    sunset:  ["#070012", "#2a0870"],  // deep shadow
    night:   ["#000000", "#0a0020"],  // near black
  },
  // ── Ghost — ethereal mist, silver peak at noon ────────────────────────────
  ghost: {
    morning: ["#182030", "#a8bcd0"],  // grey-blue mist dawn
    day:     ["#1c2838", "#b8cce0"],  // brightening
    noon:    ["#202e40", "#d0e4f4"],  // peak — pale silver-blue
    evening: ["#141e30", "#607898"],  // dimming
    sunset:  ["#101828", "#405068"],  // deep grey-blue
    night:   ["#0d0d12", "#1a1a2e"],  // near black
  },
};

// Moon color per theme at night — [disc color, halo color, outer halo color]
const THEME_MOON = {
  cobalt:   ["#a0c8ff", "rgba(100,160,255,0.35)", "rgba(80,130,220,0.15)"],
  amber:    ["#ffd580", "rgba(220,160,60,0.35)",  "rgba(180,120,40,0.15)"],
  crimson:  ["#ff9090", "rgba(220,60,60,0.35)",   "rgba(180,40,40,0.15)"],
  violet:   ["#d0a0ff", "rgba(160,80,240,0.35)",  "rgba(120,60,200,0.15)"],
  jade:     ["#80ffb0", "rgba(40,180,100,0.35)",  "rgba(20,140,80,0.15)"],
  neon:     ["#ff70d0", "rgba(240,40,160,0.35)",  "rgba(200,20,120,0.15)"],
  arctic:   ["#c0f0ff", "rgba(80,200,240,0.35)",  "rgba(60,160,210,0.15)"],
  solar:    ["#ffb060", "rgba(240,120,20,0.35)",  "rgba(200,80,10,0.15)"],
  nebula:   ["#c080ff", "rgba(140,20,200,0.35)",  "rgba(100,10,160,0.15)"],
  obsidian: ["#b090e0", "rgba(100,40,200,0.35)",  "rgba(80,20,160,0.15)"],
  ghost:    ["#e8eef4", "rgba(180,200,220,0.35)", "rgba(140,160,190,0.15)"],
};

// All non-default themes get sky overrides
const THEMED_SKIES = new Set(Object.keys(THEME_SKY_OVERRIDES));

// Sun disc + corona tint per theme — [disc, shadowColor, corona1, corona2]
const THEME_SUN = {
  cobalt:   ["#c0e0ff", "rgba(80,160,255,1.0)",  "rgba(80,150,255,0.50)",  "rgba(60,120,220,0.22)"],
  amber:    ["#ffdd00", "rgba(255,180,0,1.0)",   "rgba(255,160,0,0.52)",   "rgba(220,120,0,0.24)"],
  crimson:  ["#ff7070", "rgba(220,30,30,1.0)",   "rgba(220,40,40,0.50)",   "rgba(180,20,20,0.22)"],
  violet:   ["#e0b0ff", "rgba(160,80,255,1.0)",  "rgba(160,80,240,0.50)",  "rgba(120,40,200,0.22)"],
  jade:     ["#b0ffd0", "rgba(20,200,100,1.0)",  "rgba(20,180,100,0.50)",  "rgba(10,140,70,0.22)"],
  neon:     ["#ff80e0", "rgba(240,20,160,1.0)",  "rgba(240,30,160,0.52)",  "rgba(200,10,120,0.24)"],
  arctic:   ["#e8f8ff", "rgba(100,220,255,1.0)", "rgba(80,200,240,0.52)",  "rgba(60,160,220,0.24)"],
  solar:    ["#fff060", "rgba(255,140,0,1.0)",   "rgba(255,130,0,0.55)",   "rgba(220,90,0,0.26)"],
  nebula:   ["#e0b0ff", "rgba(180,20,240,1.0)",  "rgba(160,20,220,0.52)",  "rgba(120,10,180,0.24)"],
  obsidian: ["#c0a0f0", "rgba(120,40,220,1.0)",  "rgba(110,40,200,0.50)",  "rgba(80,20,160,0.22)"],
  ghost:    ["#f0f4f8", "rgba(180,200,220,1.0)", "rgba(160,185,210,0.50)", "rgba(130,155,185,0.22)"],
};

// Star color per theme
const THEME_STAR = {
  cobalt:   "#a0c8ff",
  amber:    "#ffd880",
  crimson:  "#ffaaaa",
  violet:   "#d0a0ff",
  jade:     "#80ffb0",
  neon:     "#ff80e0",
  arctic:   "#c0f0ff",
  solar:    "#ffcc80",
  nebula:   "#c080ff",
  obsidian: "#b090e0",
  ghost:    "#e8eef4",
};

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
const Star = React.memo(function Star({ x, y, size, delay, color }) {
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
        backgroundColor: color || "#ffffff",
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
    () => isNight ? STARS.map(star => <Star key={star.id} {...star} color={starColor} />) : null,
    [isNight, starColor]
  );

  // Pick sky palette: themed override or default
  const skyPalette = (activeTheme && THEMED_SKIES.has(activeTheme))
    ? THEME_SKY_OVERRIDES[activeTheme]
    : SKY_DEFAULT;
  const sky = skyPalette[phase];

  // Moon colors for current theme
  const moonColors = (activeTheme && THEME_MOON[activeTheme])
    ? THEME_MOON[activeTheme]
    : ["#ffffff", "rgba(220,220,160,0.38)", "rgba(200,200,140,0.16)"];

  // Sun tint for current theme
  const sunTint = activeTheme ? THEME_SUN[activeTheme] : null;

  // Star color for current theme
  const starColor = (activeTheme && THEME_STAR[activeTheme]) ? THEME_STAR[activeTheme] : "#ffffff";

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
              backgroundColor: sunTint ? sunTint[0] : sunCfg.color,
              shadowColor:     sunTint ? sunTint[1] : sunCfg.shadow,
              shadowOffset:    { width: 0, height: 0 },
              shadowOpacity:   1,
              shadowRadius:    sunCfg.sr,
              elevation:       24,
            }} />
          </>
        );
      })()}

      {/* Moon — outer halo + inner glow + disc, tinted by active theme */}
      {isNight && (
        <>
          <View style={[styles.moonHalo2, { backgroundColor: moonColors[2] }]} />
          <View style={[styles.moonHalo1, { backgroundColor: moonColors[1] }]} />
          <View style={[styles.moon, { backgroundColor: moonColors[0], shadowColor: moonColors[0] }]} />
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
