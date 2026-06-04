import React from "react";
import "./DrawerOpBadge.css";

// SVG path data for each rank badge.
// All shapes use a 24x24 coordinate space.
// Each string can have multiple "M ... Z" subpaths — that's valid SVG.
const RANK_SHAPES = {

  // Hexagon outline + upward chevron inside
  PRO:
    "M12,3 L20,8 L20,17 L12,22 L4,17 L4,8 Z " +
    "M9,15 L12,10 L15,15",

  // Diamond outline + smaller inner diamond (gem facet look)
  ELITE:
    "M12,2 L22,12 L12,22 L2,12 Z " +
    "M12,7 L17,12 L12,17 L7,12 Z",

  // Pentagon/shield + horizontal center bar
  MOD:
    "M12,2 L20,7 L20,16 L12,22 L4,16 L4,7 Z " +
    "M8,12 L16,12",

  // Octagon + cross lines (system core look)
  ADMIN:
    "M8,2 L16,2 L22,8 L22,16 L16,22 L8,22 L2,16 L2,8 Z " +
    "M12,5 L12,19 " +
    "M5,12 L19,12",
};

// Color for each rank
const RANK_COLORS = {
  PRO:   "#22d3ee",
  ELITE: "#e879f9",
  MOD:   "#34d399",
  ADMIN: "#fbbf24",
};

const DrawerOpBadge = ({ rank }) => {
  const shape = RANK_SHAPES[rank];
  const color = RANK_COLORS[rank];

  // Don't render anything if the rank isn't one of the special tiers
  if (!shape || !color) {
    return null;
  }

  const rankClass = rank.toLowerCase();

  return (
    <span
      className={`tier-badge tier-badge--${rankClass}`}
      style={{ color: color, borderColor: color }}
      title={rank}
    >
      <svg
        viewBox="0 0 24 24"
        width="13"
        height="13"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={shape} />
      </svg>
    </span>
  );
};

export default DrawerOpBadge;
