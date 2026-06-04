const CREDIT_BY_RARITY = {
  Junk:      50,
  Uncommon:  150,
  Rare:      350,
  Epic:      700,
  Legendary: 1500,
  Mythic:    3500,
};

// Cumulative weights — roll 0-100, pick first bucket that fits
const RARITY_TABLE = [
  { rarity: "Junk",      threshold: 40   },
  { rarity: "Uncommon",  threshold: 75   },
  { rarity: "Rare",      threshold: 90   },
  { rarity: "Epic",      threshold: 97   },
  { rarity: "Legendary", threshold: 99.5 },
  { rarity: "Mythic",    threshold: 100  },
];

function rollRarity(rand100) {
  for (const { rarity, threshold } of RARITY_TABLE) {
    if (rand100 < threshold) return rarity;
  }
  return "Junk";
}

module.exports = { CREDIT_BY_RARITY, rollRarity };
