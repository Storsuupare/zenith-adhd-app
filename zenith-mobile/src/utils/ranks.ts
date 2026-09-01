type Rank = {
  minLevel: number;
  name: string;
};

const RANKS: Rank[] = [
  { minLevel: 100, name: "ZENITH"    },
  { minLevel:  90, name: "ASCENDANT" },
  { minLevel:  75, name: "DOMINANT"  },
  { minLevel:  60, name: "MASTERFUL" },
  { minLevel:  50, name: "RESOLUTE"  },
  { minLevel:  40, name: "TENACIOUS" },
  { minLevel:  30, name: "SHARP"     },
  { minLevel:  20, name: "DRIVEN"    },
  { minLevel:  15, name: "ANCHORED"  },
  { minLevel:  10, name: "STEADY"    },
  { minLevel:   5, name: "STARTER"   },
  { minLevel:   1, name: "DRIFTER"   },
];

export function getRankName(level: number): string {
  for (const rank of RANKS) {
    if (level >= rank.minLevel) return rank.name;
  }
  return "INITIATE";
}

