import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { fetchSummitHistory } from "../../../src/services/api";
import "./SummitHistory.css";

const PHASE_PALETTE = {
  morning: { stroke: "#ff9a9e", base: "#ff9a9e" },
  day:     { stroke: "#00c6ff", base: "#0072ff" },
  noon:    { stroke: "#ffd700", base: "#ff8c00" },
  evening: { stroke: "#fd746c", base: "#ff9068" },
  sunset:  { stroke: "#ee0979", base: "#9333ea" },
  night:   { stroke: "#38bdf8", base: "#14b8a6" },
};

const CustomTooltip = ({ active, payload, label, palette }) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload;
  return (
    <div className="summit-tooltip">
      <div className="summit-tooltip-day">{label}</div>
      {entry?.title && (
        <div className="summit-tooltip-title">{entry.title}</div>
      )}
      <div className="summit-tooltip-value" style={{ color: palette.stroke }}>
        {payload[0].value}
        <span className="summit-tooltip-unit"> min</span>
      </div>
    </div>
  );
};

const SummitHistory = ({ clerkId, solarPhase, refreshKey = 0, pendingSession = null }) => {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);

  const palette = PHASE_PALETTE[solarPhase] ?? PHASE_PALETTE.night;

  // ── Fetch server data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!clerkId) return;
    setLoading(true);
    fetchSummitHistory()
      .then((res) => setData(res.data))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [clerkId, refreshKey]);

  // ── Optimistic update: append new session bar before server confirms ───────
  useEffect(() => {
    if (!pendingSession) return;
    const now   = new Date();
    const label = now.toLocaleString("en-US", { month: "short", day: "numeric" });
    setData((prev) => [
      ...prev,
      { label, title: pendingSession.title, minutes: pendingSession.minutes, id: `opt-${Date.now()}` },
    ]);
  }, [pendingSession]);

  if (loading) {
    return (
      <div className="summit-chart-container summit-loading">
        <span className="summit-label">SUMMIT HISTORY</span>
        <div className="summit-pulse" />
      </div>
    );
  }

  return (
    <div className="summit-chart-container">
      <div className="summit-header">
        <span className="summit-label">HISTORY</span>
        
      </div>

      {data.length === 0 ? (
        <div className="summit-empty">NO TASKS LOGGED</div>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data} margin={{ top: 10, right: 16, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="summitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={palette.stroke} stopOpacity={0.9} />
                <stop offset="100%" stopColor={palette.base}   stopOpacity={0.35} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />

            <XAxis
              dataKey="label"
              tick={{
                fill: "rgba(255,255,255,0.35)",
                fontSize: 9,
                fontFamily: "Inter",
                fontWeight: 700,
              }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />

            <YAxis
              tick={{
                fill: "rgba(255,255,255,0.22)",
                fontSize: 9,
                fontFamily: "Inter",
              }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}m`}
              width={28}
            />

            <Tooltip
              content={(props) => <CustomTooltip {...props} palette={palette} />}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />

            <Bar
              dataKey="minutes"
              fill="url(#summitGrad)"
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
              isAnimationActive={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill="url(#summitGrad)" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default SummitHistory;
