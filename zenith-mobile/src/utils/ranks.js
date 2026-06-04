const RANKS = [
  { minLevel: 100, name: "ZENITH"     },
  { minLevel:  90, name: "ASCENDANT"  },
  { minLevel:  75, name: "APEX"       },
  { minLevel:  60, name: "ORBIT"      },
  { minLevel:  50, name: "PRIME"      },
  { minLevel:  40, name: "VERTEX"     },
  { minLevel:  30, name: "NEXUS"      },
  { minLevel:  20, name: "FLUX"       },
  { minLevel:  15, name: "FOCUS"      },
  { minLevel:  10, name: "PULSE"      },
  { minLevel:   5, name: "TRACE"      },
  { minLevel:   1, name: "SIGNAL"     },
];

export function getRankName(level) {
  for (const r of RANKS) {
    if (level >= r.minLevel) return r.name;
  }
  return "INITIATE";
}
