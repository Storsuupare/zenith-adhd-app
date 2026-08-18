import React, { useEffect, useRef, useState, useMemo } from "react";
import { View, StyleSheet, Animated, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../context/ThemeContext";

// ── Helpers ───────────────────────────────────────────────────────────────────
function getMinuteOfDay() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function clamp01(value) { return Math.max(0, Math.min(1, value)); }
function lerpNum(start, end, progress) { return start + (end - start) * progress; }

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function lerpColor(hexA, hexB, progress) {
  const [red1, green1, blue1] = hexToRgb(hexA);
  const [red2, green2, blue2] = hexToRgb(hexB);
  const red   = Math.round(red1   + (red2   - red1)   * progress);
  const green = Math.round(green1 + (green2 - green1) * progress);
  const blue  = Math.round(blue1  + (blue2  - blue1)  * progress);
  return `#${red.toString(16).padStart(2, "0")}${green.toString(16).padStart(2, "0")}${blue.toString(16).padStart(2, "0")}`;
}

// ── Phase for cloud/star visibility (discrete) ────────────────────────────────
function getSolarPhase(hour) {
  if (hour >= 6  && hour < 9)  return "morning";
  if (hour >= 9  && hour < 12) return "day";
  if (hour >= 12 && hour < 17) return "noon";
  if (hour >= 17 && hour < 20) return "evening";
  if (hour >= 20 && hour < 22) return "sunset";
  return "night";
}

// ── Sky keyframes: [minuteOfDay, phaseName] ───────────────────────────────────
// Sky colors and sun position interpolate continuously between adjacent keyframes.
// One tick per minute means each step is imperceptible — no visible jumps.
const PHASE_KEYFRAMES = [
  [0,    "night"],
  [360,  "morning"],   // 6:00 AM
  [540,  "day"],       // 9:00 AM
  [720,  "noon"],      // 12:00 PM
  [1020, "evening"],   // 5:00 PM
  [1200, "sunset"],    // 8:00 PM
  [1320, "night"],     // 10:00 PM
  [1440, "night"],     // midnight wrap
];

function getFrameProgress() {
  const currentMinute = getMinuteOfDay();
  for (let index = 0; index < PHASE_KEYFRAMES.length - 1; index++) {
    const [fromMinute, fromPhase] = PHASE_KEYFRAMES[index];
    const [toMinute,   toPhase]   = PHASE_KEYFRAMES[index + 1];
    if (currentMinute >= fromMinute && currentMinute < toMinute) {
      const progress = (currentMinute - fromMinute) / (toMinute - fromMinute);
      return { fromPhase, toPhase, progress };
    }
  }
  return { fromPhase: "night", toPhase: "night", progress: 0 };
}

function getInterpolatedSky(palette) {
  const { fromPhase, toPhase, progress } = getFrameProgress();
  const fromColors = palette[fromPhase];
  const toColors   = palette[toPhase];
  return [
    lerpColor(fromColors[0], toColors[0], progress),
    lerpColor(fromColors[1], toColors[1], progress),
  ];
}

// Sun fades in 5:30–6:00 AM, fades out 8:00–8:30 PM
// Moon fades out 5:00–5:30 AM, fades in 8:30–9:00 PM
// The two never overlap — no simultaneous circles in the sky.
function getSunOpacity() {
  const mins = getMinuteOfDay();
  if (mins >= 330 && mins < 360)   return clamp01((mins - 330) / 30);
  if (mins >= 1200 && mins < 1230) return clamp01((1230 - mins) / 30);
  if (mins >= 360 && mins < 1200)  return 1;
  return 0;
}

function getMoonOpacity() {
  const mins = getMinuteOfDay();
  if (mins >= 1230 && mins < 1260) return clamp01((mins - 1230) / 30);
  if (mins >= 300  && mins < 330)  return clamp01((330 - mins) / 30);
  if (mins >= 1260 || mins < 300)  return 1;
  return 0;
}

// Interpolate sun position and size so it arcs across the sky in real time
function getInterpolatedSunCfg() {
  const { fromPhase, toPhase, progress } = getFrameProgress();
  const fromConfig = SUN_CONFIG[fromPhase];
  const toConfig   = SUN_CONFIG[toPhase];
  if (!fromConfig && !toConfig) return null;
  if (!fromConfig) return toConfig;
  if (!toConfig)   return fromConfig;
  return {
    sizeFraction:      lerpNum(fromConfig.sizeFraction,      toConfig.sizeFraction,      progress),
    topFraction:       lerpNum(fromConfig.topF,               toConfig.topF,               progress),
    leftFraction:      lerpNum(fromConfig.leftF,              toConfig.leftF,              progress),
    color:             lerpColor(fromConfig.color, toConfig.color, progress),
    shadow:            fromConfig.shadow,
    shadowRadiusRatio: lerpNum(fromConfig.shadowRadiusRatio, toConfig.shadowRadiusRatio, progress),
  };
}

// ── Default sky palette ───────────────────────────────────────────────────────
const SKY_DEFAULT = {
  morning: ["#1e2a44", "#ff9a9e"],
  day:     ["#003264", "#0072ff"],
  noon:    ["#001f3f", "#0074d9"],
  evening: ["#1a0e00", "#e36f36"],
  sunset:  ["#03060b", "#fb5928"],
  night:   ["#03060b", "#0f172a"],
};

// ── Theme sky overrides ───────────────────────────────────────────────────────
const THEME_SKY_OVERRIDES = {
  cobalt: {
    morning: ["#0d1e30", "#2a4870"],
    day:     ["#0e2240", "#305888"],
    noon:    ["#102848", "#3a6898"],
    evening: ["#0a1828", "#203858"],
    sunset:  ["#060e1c", "#142440"],
    night:   ["#020810", "#061830"],
  },
  amber: {
    morning: ["#1c0e00", "#784010"],
    day:     ["#221000", "#885018"],
    noon:    ["#281200", "#986020"],
    evening: ["#180a00", "#602800"],
    sunset:  ["#100800", "#401800"],
    night:   ["#0a0600", "#1c0e00"],
  },
  crimson: {
    morning: ["#160005", "#601020"],
    day:     ["#1a0008", "#701828"],
    noon:    ["#200008", "#802030"],
    evening: ["#120005", "#50080c"],
    sunset:  ["#0e0003", "#380408"],
    night:   ["#080003", "#180508"],
  },
  violet: {
    morning: ["#0e0018", "#401868"],
    day:     ["#100020", "#502078"],
    noon:    ["#140025", "#602888"],
    evening: ["#0c0018", "#381060"],
    sunset:  ["#080010", "#240840"],
    night:   ["#050008", "#100018"],
  },
  jade: {
    morning: ["#001408", "#185838"],
    day:     ["#001808", "#206840"],
    noon:    ["#001e0a", "#287848"],
    evening: ["#001005", "#104828"],
    sunset:  ["#000c04", "#083018"],
    night:   ["#000804", "#021408"],
  },
  neon: {
    morning: ["#200018", "#c02880"],
    day:     ["#280020", "#d83090"],
    noon:    ["#340028", "#ff40a8"],
    evening: ["#1e0020", "#8a1068"],
    sunset:  ["#160018", "#6a0850"],
    night:   ["#050108", "#1d0015"],
  },
  arctic: {
    morning: ["#0a2038", "#60c8e8"],
    day:     ["#0c2c50", "#70d8f8"],
    noon:    ["#104070", "#90eeff"],
    evening: ["#082040", "#2888a8"],
    sunset:  ["#061830", "#185878"],
    night:   ["#060e1e", "#0a1a3d"],
  },
  solar: {
    morning: ["#301000", "#e07000"],
    day:     ["#3c1400", "#f08000"],
    noon:    ["#501800", "#ff9a00"],
    evening: ["#2c1000", "#b04800"],
    sunset:  ["#200c00", "#803000"],
    night:   ["#1a0900", "#2a1400"],
  },
  nebula: {
    morning: ["#0c0028", "#7808b8"],
    day:     ["#100030", "#9010d0"],
    noon:    ["#160040", "#b018f0"],
    evening: ["#0c0028", "#500090"],
    sunset:  ["#080018", "#380070"],
    night:   ["#04000e", "#0d0030"],
  },
  obsidian: {
    morning: ["#0a0018", "#5020a8"],
    day:     ["#0e0020", "#6028c0"],
    noon:    ["#140028", "#7838e0"],
    evening: ["#0a0018", "#3c1088"],
    sunset:  ["#070012", "#2a0870"],
    night:   ["#000000", "#0a0020"],
  },
  ember: {
    morning: ["#1a0d05", "#8a4520"],
    day:     ["#1e1005", "#9a5228"],
    noon:    ["#221205", "#aa6030"],
    evening: ["#160c04", "#7a3818"],
    sunset:  ["#100804", "#5a2510"],
    night:   ["#0d0906", "#1c1008"],
  },
};

const THEMED_SKIES = new Set(Object.keys(THEME_SKY_OVERRIDES));

// ── Theme moon disc color ─────────────────────────────────────────────────────
const THEME_MOON = {
  cobalt:   "#a0c8ff",
  amber:    "#ffd580",
  crimson:  "#ff9090",
  violet:   "#d0a0ff",
  jade:     "#80ffb0",
  neon:     "#ff70d0",
  arctic:   "#c0f0ff",
  solar:    "#ffb060",
  nebula:   "#e879f9",
  obsidian: "#a5b4fc",
  ember:    "#fdba74",
};

// ── Theme sun tint ────────────────────────────────────────────────────────────
const THEME_SUN = {
  cobalt:   ["#c0e0ff", "rgba(80,160,255,1.0)"],
  amber:    ["#ffdd00", "rgba(255,180,0,1.0)"],
  crimson:  ["#ff7070", "rgba(220,30,30,1.0)"],
  violet:   ["#e0b0ff", "rgba(160,80,255,1.0)"],
  jade:     ["#b0ffd0", "rgba(20,200,100,1.0)"],
  neon:     ["#ff80e0", "rgba(240,20,160,1.0)"],
  arctic:   ["#e8f8ff", "rgba(100,220,255,1.0)"],
  solar:    ["#fff060", "rgba(255,140,0,1.0)"],
  nebula:   ["#f0a0ff", "rgba(217,70,239,1.0)"],
  obsidian: ["#c7d2fe", "rgba(129,140,248,1.0)"],
  ember:    ["#fed7aa", "rgba(251,146,60,1.0)"],
};

// ── Theme star color ──────────────────────────────────────────────────────────
const THEME_STAR = {
  cobalt:   "#a0c8ff",
  amber:    "#ffd880",
  crimson:  "#ffaaaa",
  violet:   "#d0a0ff",
  jade:     "#80ffb0",
  neon:     "#ff80e0",
  arctic:   "#c0f0ff",
  solar:    "#ffcc80",
  nebula:   "#e879f9",
  obsidian: "#a5b4fc",
  ember:    "#fdba74",
};

// ── Sun config per phase ────────────────────────────────────────────────────────
// size and shadowRadius are expressed as fractions of the CURRENT screen width
// (computed at render time), not fixed pixel values — a fixed pixel sun sized for
// an iPhone renders as a tiny dot on an iPad's much wider screen. Fractions below
// are the original iPhone-tuned pixel values divided by a 390pt reference width,
// so the on-screen result is unchanged on a standard iPhone and scales correctly
// everywhere else.
const SUN_CONFIG = {
  morning: { sizeFraction: 0.1744, topF: 0.84, leftF: 0.28, color: "#ffe0a0", shadow: "rgba(255,140,60,1.0)",  shadowRadiusRatio: 0.882 },
  day:     { sizeFraction: 0.2564, topF: 0.38, leftF: 0.62, color: "#ffffff", shadow: "rgba(255,255,220,1.0)", shadowRadiusRatio: 0.800 },
  noon:    { sizeFraction: 0.2872, topF: 0.46, leftF: 0.50, color: "#ffffff", shadow: "rgba(255,255,240,1.0)", shadowRadiusRatio: 0.848 },
  evening: { sizeFraction: 0.2154, topF: 0.60, leftF: 0.72, color: "#ffe566", shadow: "rgba(255,160,0,1.0)",   shadowRadiusRatio: 0.833 },
  sunset:  { sizeFraction: 0.2000, topF: 0.88, leftF: 0.80, color: "#ff8c55", shadow: "rgba(255,80,20,1.0)",   shadowRadiusRatio: 0.897 },
  night:   null,
};

// Moon disc size, also a fraction of screen width (84px / 390pt reference).
const MOON_SIZE_FRACTION = 0.2154;

// ── Cloud shapes ─────────────────────────────────────────────────────────────
// widthFraction is relative to screen width, same as before — clouds already
// scaled horizontally correctly. aspectRatio is new: height used to be a fixed
// pixel value that never scaled, so on an iPad's much wider screen a cloud kept
// its iPhone-sized height while stretching far wider, turning a soft puff into a
// thin, disproportionate smear. Deriving height from the cloud's own computed
// width via a fixed aspect ratio keeps the same proportions on every device.
const CLOUDS = [
  { widthFraction: 0.65, aspectRatio: 4.61, topFraction: 0.08, leftFraction: 0.05, opacity: 0.60, duration: 18000 },
  { widthFraction: 0.48, aspectRatio: 4.46, topFraction: 0.18, leftFraction: 0.32, opacity: 0.45, duration: 24000 },
  { widthFraction: 0.55, aspectRatio: 3.46, topFraction: 0.30, leftFraction: 0.38, opacity: 0.35, duration: 30000 },
  { widthFraction: 0.38, aspectRatio: 3.90, topFraction: 0.12, leftFraction: 0.52, opacity: 0.50, duration: 20000 },
];

// ── Star positions ───────────────────────────────────────────────────────────
// Fractional (0–1) rather than pre-multiplied by a screen size captured once at
// module load — on a much larger iPad screen, pre-multiplied positions would
// leave all 80 stars clustered in an iPhone-sized region in one corner instead
// of spread across the actual visible sky.
const STARS = Array.from({ length: 80 }, (_, index) => ({
  id:        index,
  xFraction: ((index * 37) % 100) / 100,
  yFraction: ((index * 53) % 90)  / 100 * 0.7,
  size:      1 + ((index * 7) % 3),
  delay:     (index * 0.37) % 4,
}));

// ── Animated cloud ────────────────────────────────────────────────────────────
const Cloud = React.memo(function Cloud({
  widthFraction, aspectRatio, topFraction, leftFraction, opacity, duration,
  windowWidth, windowHeight,
}) {
  const drift = useRef(new Animated.Value(0)).current;
  const width  = widthFraction * windowWidth;
  const height = width / aspectRatio;

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
        top:             topFraction  * windowHeight,
        left:            leftFraction * windowWidth,
        width,
        height,
        borderRadius:    height / 2,
        backgroundColor: "rgba(255,255,255,0.55)",
        opacity,
        transform:       [{ translateX: drift }],
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
  const { activeTheme, accentColor } = useTheme() || {};

  // Reactive — re-renders on rotation, iPad Split View / Stage Manager resize,
  // and gives the real dimensions for whichever device this actually is, unlike
  // a one-time Dimensions.get() snapshot at module load.
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Re-derive sky colors every 60 seconds — each step is imperceptible
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(prev => prev + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const hour        = new Date().getHours();
  const phase       = getSolarPhase(hour);
  const isNight     = phase === "night";
  const showClouds  = phase === "morning" || phase === "day" || phase === "noon";
  const sunOpacity  = getSunOpacity();
  const moonOpacity = getMoonOpacity();

  const palette  = (activeTheme && THEMED_SKIES.has(activeTheme))
    ? THEME_SKY_OVERRIDES[activeTheme]
    : SKY_DEFAULT;

  const sky       = getInterpolatedSky(palette);
  const sunCfg    = getInterpolatedSunCfg();
  const sunTint   = activeTheme ? THEME_SUN[activeTheme] : null;
  const moonDisc  = (activeTheme && THEME_MOON[activeTheme]) ? THEME_MOON[activeTheme] : "#ffffff";
  const starColor = (activeTheme && THEME_STAR[activeTheme]) ? THEME_STAR[activeTheme] : "#ffffff";

  const sunSize  = sunCfg ? sunCfg.sizeFraction * windowWidth : 0;
  const moonSize = MOON_SIZE_FRACTION * windowWidth;

  // Cloud group fades in/out when phase crosses into/out of cloudy hours
  const cloudGroupOpacity = useRef(new Animated.Value(showClouds ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(cloudGroupOpacity, {
      toValue:         showClouds ? 1 : 0,
      duration:        3000,
      useNativeDriver: true,
    }).start();
  }, [showClouds]);

  const cloudElements = useMemo(
    () => CLOUDS.map((cloud, index) => (
      <Cloud key={index} {...cloud} windowWidth={windowWidth} windowHeight={windowHeight} />
    )),
    [windowWidth, windowHeight]
  );
  const starElements = useMemo(
    () => isNight
      ? STARS.map(star => (
          <Star
            key={star.id}
            x={star.xFraction * windowWidth}
            y={star.yFraction * windowHeight}
            size={star.size}
            delay={star.delay}
            color={starColor}
          />
        ))
      : null,
    [isNight, starColor, windowWidth, windowHeight]
  );

  return (
    <View style={styles.root}>
      {/* Sky gradient — updates every 60 s with interpolated colors */}
      <LinearGradient colors={sky} style={styles.fill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />

      {/* Clouds */}
      <Animated.View style={[styles.fill, { opacity: cloudGroupOpacity }]} pointerEvents="none">
        {cloudElements}
      </Animated.View>

      {/* Sun — position and size also interpolate, so it arcs across the sky */}
      {sunCfg && sunOpacity > 0 && (
        <View style={{
          position:        "absolute",
          top:             sunCfg.topFraction  * windowHeight - sunSize / 2,
          left:            sunCfg.leftFraction * windowWidth  - sunSize / 2,
          width:           sunSize,
          height:          sunSize,
          borderRadius:    sunSize / 2,
          backgroundColor: sunTint ? sunTint[0] : sunCfg.color,
          shadowColor:     sunTint ? sunTint[1] : sunCfg.shadow,
          shadowOffset:    { width: 0, height: 0 },
          shadowOpacity:   sunOpacity,
          shadowRadius:    sunSize * sunCfg.shadowRadiusRatio,
          elevation:       24,
          opacity:         sunOpacity,
        }} />
      )}

      {/* Moon disc */}
      {moonOpacity > 0 && (
        <View style={{
          position:        "absolute",
          top:             windowHeight * 0.12 - moonSize / 2,
          left:            windowWidth  * 0.72 - moonSize / 2,
          width:           moonSize,
          height:          moonSize,
          borderRadius:    moonSize / 2,
          backgroundColor: moonDisc,
          shadowColor:     moonDisc,
          shadowOffset:    { width: 0, height: 0 },
          shadowOpacity:   1,
          shadowRadius:    moonSize * 0.6,
          elevation:       20,
          opacity:         moonOpacity,
        }} />
      )}

      {/* Stars */}
      {starElements}

      <View style={styles.overlay} />
      {accentColor && (
        <View style={[styles.fill, { backgroundColor: accentColor + "0e" }]} pointerEvents="none" />
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: "#03060b" },
  fill:    { ...StyleSheet.absoluteFillObject },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(4,6,12,0.28)" },
  content: { flex: 1 },
});
