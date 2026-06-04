import React, { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useUserContext,
  useTaskContext,
  useUIContext,
} from "../../../src/AppContext";
import { SKILL_COLORS } from "../utils/constants";
import { fetchSummitHistory } from "../../../src/services/api";
import ElevationChart from "./ElevationChart";
import SummitHistory from "./SummitHistory";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import "./ArchivesPage.css";

const SKILL_ICONS = {
  "LOGIC FLOW": "⬡",
  VITALITY: "◈",
  NUTRITION: "◉",
  ENVIRONMENT: "▣",
  "DEEP FOCUS": "◎",
  SYNTHESIS: "⬢",
  LOGISTICS: "▤",
  CREATIVE: "◆",
  DISCIPLINE: "◫",
  PRESENCE: "◑",
  RESTORATION: "◌",
  RESOLVE: "▲",
};

const CustomSkillTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="archives-tooltip">
      <span className="archives-tooltip-icon">
        {SKILL_ICONS[d.name] ?? "◉"}
      </span>
      <div>
        <div className="archives-tooltip-name">{d.name}</div>
        <div className="archives-tooltip-val">
          LVL {d.level} · {d.xp.toLocaleString()} XP
        </div>
        {d.prestige_level > 0 && (
          <div className="archives-tooltip-prestige">
            ✦ PRESTIGE {d.prestige_level}
          </div>
        )}
      </div>
    </div>
  );
};

const ArchivesPage = () => {
  const { user, clerkUser } = useUserContext();
  const { elevationKey, chartPending } = useTaskContext();
  const { solarPhase } = useUIContext();
  const navigate = useNavigate();

  const masteryData = useMemo(() => {
    const raw = user?.mastery ?? [];

    // user.mastery rows use skill_name / current_xp / current_level (from the JOIN in server.js)
    const byName = {};
    raw.forEach((s) => {
      const name = (s.skill_name ?? s.name ?? "").toUpperCase();
      if (!name) return;
      byName[name] = {
        name,
        xp: s.current_xp ?? s.xp ?? 0,
        level: s.current_level ?? s.level ?? 1,
        prestige_level: s.prestige_level ?? 0,
      };
    });

    // Always render all 12 canonical skills — 0 XP for untrained ones so the
    // user can see the full scope of the Zenith system from day one.
    return Object.keys(SKILL_COLORS)
      .map(
        (name) => byName[name] ?? { name, xp: 0, level: 1, prestige_level: 0 },
      )
      .sort((a, b) => b.xp - a.xp);
  }, [user?.mastery]);

  const [summitData, setSummitData] = useState([]);

  useEffect(() => {
    if (!clerkUser?.id) return;
    fetchSummitHistory()
      .then((res) => setSummitData(Array.isArray(res.data) ? res.data : []))
      .catch(() => setSummitData([]));
  }, [clerkUser?.id, elevationKey]);

  const lifetimeMinutes = summitData.reduce((acc, s) => acc + Math.min(s.minutes ?? 0, 180), 0);
  const lifetimeHours   = (lifetimeMinutes / 60).toFixed(1);

  const skillChartRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    const el = skillChartRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setChartWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isNarrowChart = chartWidth > 0 && chartWidth < 601;
  const hideXAxis = isNarrowChart;
  const barChartHeight = isNarrowChart ? 160 : 260;

  const totalFocusXP = masteryData.reduce((acc, s) => acc + s.xp, 0);
  const avgLevel = masteryData.length
    ? Math.round(
        masteryData.reduce((a, s) => a + s.level, 0) / masteryData.length,
      )
    : 0;
  const prestigeCount = masteryData.filter((s) => s.prestige_level > 0).length;

  return (
    <div className="archives-page">
      {/* ── Page header ── */}
      <div className="archives-header">
        <div className="archives-header-left">
          <span className="archives-eyebrow">◎ History & Analytics</span>
          <div className="archives-title-row">
            <button
              className="page-back-btn"
              onClick={() => navigate("/dashboard")}
              aria-label="Back to dashboard">
              ‹
            </button>
            <h1 className="archives-title">Analytics</h1>
          </div>
        </div>
      </div>

      <div className="archives-content">
        {/* ── Personal Records ── */}
        <section className="archives-section1">
          <div className="archives-section-header">
            <span className="archives-section-icon">◆</span>
            <span className="archives-section-title">Personal Records</span>
          </div>
          <div className="archives-records-grid">
            <div className="archives-record-tile">
              <span className="archives-record-val">{lifetimeHours}h</span>
              <span className="archives-record-label">TOTAL TASK HOURS</span>
            </div>
            <div className="archives-record-tile">
              <span className="archives-record-val">
                {(user?.total_xp ?? 0).toLocaleString()}
              </span>
              <span className="archives-record-label">Lifetime XP</span>
            </div>
            <div className="archives-record-tile">
              <span className="archives-record-val">{avgLevel}</span>
              <span className="archives-record-label">Avg Skill Level</span>
            </div>
            <div className="archives-record-tile">
              <span className="archives-record-val">{prestigeCount}</span>
              <span className="archives-record-label">Total Prestiges</span>
            </div>
          </div>
        </section>

        {/* ── Weekly elevation ── */}
        <section className="archives-section2">
          <div className="archives-section-header">
            <span className="archives-section-icon">◎</span>
            <span className="archives-section-title">7-Day Activity</span>
          </div>
          <ElevationChart
            clerkId={clerkUser?.id}
            solarPhase={solarPhase}
            refreshKey={elevationKey}
            pendingMinutes={chartPending?.minutes ?? 0}
          />
        </section>

        {/* ── Summit history ── */}
        <section className="archives-section3">
          <div className="archives-section-header">
            <span className="archives-section-icon">▲</span>
            <span className="archives-section-title">Recent Sessions</span>
          </div>
          <SummitHistory
            clerkId={clerkUser?.id}
            solarPhase={solarPhase}
            refreshKey={elevationKey}
            pendingSession={chartPending}
          />
        </section>

        {/* ── Lifetime skill XP ── */}
        <section className="archives-section4">
          <div className="archives-section-header">
            <span className="archives-section-icon">⬡</span>
            <span className="archives-section-title">Skill XP Breakdown</span>
            <span className="archives-section-sub">
              12 skills · {totalFocusXP.toLocaleString()} total XP
            </span>
          </div>

          {masteryData.every((s) => s.xp === 0) ? (
            <div className="archives-empty">
              <span>
                Complete some tasks to start building your skill profile.
              </span>
            </div>
          ) : (
            <div className="archives-skill-chart-wrap" ref={skillChartRef}>
              <ResponsiveContainer width="100%" height={barChartHeight}>
                <BarChart
                  data={masteryData}
                  margin={{ top: 8, right: 16, left: 4, bottom: 4 }}
                  barCategoryGap="22%">
                  <XAxis
                    dataKey="name"
                    hide={hideXAxis}
                    tick={{
                      fontSize: 9,
                      fill: "rgba(255,255,255,0.38)",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                    }}
                    tickFormatter={(n) => n.split(" ")[0]}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip
                    content={<CustomSkillTooltip />}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  />
                  <Bar dataKey="xp" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {masteryData.map((entry, i) => (
                      <Cell
                        key={entry.name}
                        fill={SKILL_COLORS[entry.name] ?? "#22d3ee"}
                        opacity={0.82}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* ── Skill rank table — all 12 ── */}
              <div className="archives-skill-table">
                {masteryData.map((s, i) => (
                  <div key={s.name} className="archives-skill-row">
                    <span className="archives-skill-rank">#{i + 1}</span>
                    <span
                      className="archives-skill-icon"
                      style={{ color: SKILL_COLORS[s.name] ?? "#22d3ee" }}>
                      {SKILL_ICONS[s.name] ?? "◉"}
                    </span>
                    <span className="archives-skill-name">{s.name}</span>
                    <span className="archives-skill-level">LVL {s.level}</span>
                    <div className="archives-skill-xp-bar">
                      <div
                        className="archives-skill-xp-fill"
                        style={{
                          width: `${Math.min((s.xp / (masteryData[0]?.xp || 1)) * 100, 100)}%`,
                          background: SKILL_COLORS[s.name] ?? "#22d3ee",
                        }}
                      />
                    </div>
                    <span className="archives-skill-xp-val">
                      {s.xp.toLocaleString()}
                    </span>
                    {s.prestige_level > 0 && (
                      <span className="archives-skill-prestige">
                        ✦{s.prestige_level}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ArchivesPage;
