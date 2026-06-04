import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { fetchElevation } from "../../../src/services/api";
import "./ElevationChart.css";

const PHASE_PALETTE = {
  morning: { stroke: "#ff9a9e", base: "#ff9a9e", peakOpacity: 0.55 },
  day:     { stroke: "#00c6ff", base: "#00c6ff", peakOpacity: 0.50 },
  noon:    { stroke: "#ffd700", base: "#ffd700", peakOpacity: 0.60 },
  evening: { stroke: "#fd746c", base: "#fd746c", peakOpacity: 0.55 },
  sunset:  { stroke: "#ee0979", base: "#9333ea", peakOpacity: 0.52 },
  night:   { stroke: "#38bdf8", base: "#14b8a6", peakOpacity: 0.50 },
};

// Net left offset = YAxis width (28) + left chart margin (4)
const CHART_LEFT_PX  = 32;
const CHART_RIGHT_PX = 10;

const CustomTooltip = ({ active, payload, label, palette }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="elevation-tooltip">
      <div className="elevation-tooltip-day">{label}</div>
      <div className="elevation-tooltip-value" style={{ color: palette.stroke }}>
        {payload[0].value}
        <span className="elevation-tooltip-unit"> min</span>
      </div>
    </div>
  );
};

const ElevationChart = ({ clerkId, solarPhase, refreshKey = 0, pendingMinutes = 0 }) => {
  const [data, setData]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [scrubIndex, setScrubIndex] = useState(null);

  const containerRef   = useRef(null);
  const longPressTimer = useRef(null);
  const isScrubbing    = useRef(false);
  const cachedRect     = useRef(null);

  const palette = PHASE_PALETTE[solarPhase] ?? PHASE_PALETTE.night;

  // ── Fetch server data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!clerkId) return;
    setLoading(true);
    fetchElevation()
      .then((res) => setData(res.data))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [clerkId, refreshKey]);

  // ── Optimistic update: add pendingMinutes to today before server confirms ──
  useEffect(() => {
    if (!pendingMinutes || pendingMinutes <= 0) return;
    setData((prev) => {
      if (!prev.length) return prev;
      const updated = [...prev];
      const last = updated[updated.length - 1];
      updated[updated.length - 1] = { ...last, minutes: last.minutes + pendingMinutes };
      return updated;
    });
  }, [pendingMinutes]);

  // ── Compute data index from raw clientX ───────────────────────────────────
  const calcIndex = useCallback(
    (clientX) => {
      const el = containerRef.current;
      if (!el || !data.length) return null;
      const rect   = cachedRect.current ?? el.getBoundingClientRect();
      const usable = rect.width - CHART_LEFT_PX - CHART_RIGHT_PX;
      const pct    = Math.max(0, Math.min(1, (clientX - rect.left - CHART_LEFT_PX) / usable));
      return Math.min(data.length - 1, Math.round(pct * (data.length - 1)));
    },
    [data.length],
  );

  // ── Non-passive touchmove: blocks page scroll while scrubbing ─────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e) => {
      if (!isScrubbing.current) return;
      e.preventDefault();
      setScrubIndex(calcIndex(e.touches[0].clientX));
    };
    el.addEventListener("touchmove", onMove, { passive: false });
    return () => el.removeEventListener("touchmove", onMove);
  }, [calcIndex]);

  // ── Long-press handlers (180 ms threshold) ────────────────────────────────
  const handleTouchStart = (e) => {
    const clientX = e.touches[0].clientX;
    cachedRect.current = containerRef.current?.getBoundingClientRect() ?? null;
    longPressTimer.current = setTimeout(() => {
      isScrubbing.current = true;
      setScrubIndex(calcIndex(clientX));
    }, 180);
  };

  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
    cachedRect.current = null;
    // Keep tooltip visible for 1.4 s after finger lifts
    setTimeout(() => {
      isScrubbing.current = false;
      setScrubIndex(null);
    }, 1400);
  };

  // ── Scrub overlay positioning ──────────────────────────────────────────────
  const scrubPoint = scrubIndex !== null ? data[scrubIndex] : null;
  const scrubXPct  = scrubIndex !== null && data.length > 1
    ? scrubIndex / (data.length - 1)
    : 0;
  // Flip tooltip to left side when cursor is in the rightmost 30 % of the chart
  const flipLeft   = scrubXPct > 0.7;

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="elevation-chart-container elevation-loading">
        <span className="elevation-label">ELEVATION TRACE</span>
        <div className="elevation-pulse" />
      </div>
    );
  }

  return (
    <div className="elevation-chart-container">
      <div className="elevation-header">
        <span className="elevation-label">PERFORMANCE</span>
        
      </div>

      {/* Wrapper carries ref + touch listeners; position:relative anchors overlays */}
      <div
        ref={containerRef}
        className="elevation-chart-wrapper"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={palette.stroke} stopOpacity={palette.peakOpacity} />
                <stop offset="100%" stopColor={palette.base}   stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />

            <XAxis
              dataKey="day"
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 9, fontFamily: "Inter", fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              tick={{ fill: "rgba(255,255,255,0.22)", fontSize: 9, fontFamily: "Inter" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}m`}
              width={28}
            />

            <Tooltip
              content={(props) => <CustomTooltip {...props} palette={palette} />}
              cursor={{
                stroke: palette.stroke,
                strokeWidth: 1,
                strokeDasharray: "4 4",
                strokeOpacity: 0.45,
              }}
            />

            <Area
              type="monotone"
              dataKey="minutes"
              stroke={palette.stroke}
              strokeWidth={2}
              fill="url(#elevGrad)"
              dot={false}
              activeDot={{ r: 4, fill: palette.stroke, stroke: "rgba(0,0,0,0.55)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Touch scrub overlay — vertical crosshair + tooltip bubble */}
        {scrubPoint && (
          <>
            <div
              className="elevation-scrub-line"
              style={{
                left: `calc(${CHART_LEFT_PX}px + ${scrubXPct} * (100% - ${CHART_LEFT_PX + CHART_RIGHT_PX}px))`,
              }}
            />
            <div
              className={`elevation-scrub-tooltip${flipLeft ? " flip-left" : ""}`}
              style={{
                left: `calc(${CHART_LEFT_PX}px + ${scrubXPct} * (100% - ${CHART_LEFT_PX + CHART_RIGHT_PX}px))`,
              }}
            >
              <div className="elevation-tooltip-day">{scrubPoint.day}</div>
              <div className="elevation-tooltip-value" style={{ color: palette.stroke }}>
                {scrubPoint.minutes}
                <span className="elevation-tooltip-unit"> min</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ElevationChart;
