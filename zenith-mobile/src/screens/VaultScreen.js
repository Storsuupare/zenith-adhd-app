import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useUser } from "../context/UserContext";
import { useTheme } from "../context/ThemeContext";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";

const RARITY_COLORS = {
  mythic:    "#a335ee",
  legendary: "#ffae00",
  epic:      "#8b5cf6",
  rare:      "#22d3ee",
  uncommon:  "#1eff00",
  common:    "rgba(255,255,255,0.55)",
  junk:      "rgba(120,120,120,0.6)",
};

const FILTERS = ["ALL", "Mythic", "Legendary", "Epic", "Rare", "Uncommon", "Common"];

const TIER_SLOTS = { 0: 1, 1: 2, 2: 4 };

export default function VaultScreen({ navigation }) {
  const { user } = useUser();
  const { accentColor } = useTheme();
  const [filter,   setFilter]   = useState("ALL");
  const [expanded, setExpanded] = useState(null);

  const inventory  = user?.inventory ?? [];
  const tier       = user?.account_tier ?? 0;
  const maxSlots   = TIER_SLOTS[tier] ?? 1;
  const equipped   = inventory.filter(i => i.equipped);

  const filtered = filter === "ALL"
    ? inventory
    : inventory.filter(i => i.rarity?.toLowerCase() === filter.toLowerCase());

  const handleEquip = (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Wire to API when equip endpoint is available
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.back, { color: accentColor }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Vault</Text>
        <Text style={styles.slotLabel}>{equipped.length}/{maxSlots} equipped</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterChip,
              filter === f && { borderColor: accentColor + "44", backgroundColor: accentColor + "1a" },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && { color: accentColor, fontFamily: FONTS.bold }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>◈</Text>
            <Text style={styles.emptyText}>
              {inventory.length === 0
                ? "Complete sessions to earn loot drops."
                : "No items match this filter."}
            </Text>
          </View>
        ) : (
          filtered.map((item, i) => {
            const rarityColor = RARITY_COLORS[item.rarity?.toLowerCase()] || RARITY_COLORS.common;
            const isOpen      = expanded === i;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.itemCard, { borderColor: rarityColor + "44" }]}
                onPress={() => setExpanded(isOpen ? null : i)}
                activeOpacity={0.8}
              >
                <View style={[styles.rarityBar, { backgroundColor: rarityColor }]} />
                <View style={styles.itemBody}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName}>{item.name || "Unknown Item"}</Text>
                    <Text style={[styles.rarityTag, { color: rarityColor }]}>
                      {item.rarity?.toUpperCase()}
                    </Text>
                  </View>

                  {isOpen && (
                    <>
                      {item.description && (
                        <Text style={styles.itemDesc}>{item.description}</Text>
                      )}
                      {item.effect_value && (
                        <Text style={styles.effectValue}>+{item.effect_value}% XP</Text>
                      )}
                      <TouchableOpacity
                        style={[
                          styles.equipBtn,
                          { backgroundColor: accentColor + "1a", borderColor: accentColor + "44" },
                          item.equipped && styles.unequipBtn,
                        ]}
                        onPress={() => handleEquip(item)}
                      >
                        <Text style={[styles.equipText, { color: accentColor }]}>
                          {item.equipped ? "Unequip" : "Equip"}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: "transparent" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    backgroundColor: "transparent",
  },
  back:       { color: COLORS.accent, fontSize: 18, fontFamily: FONTS.semiBold },
  pageTitle:  { color: COLORS.text, fontSize: 14, fontFamily: FONTS.bold, letterSpacing: 2 },
  slotLabel:  { color: COLORS.textMuted, fontSize: 12, fontFamily: FONTS.regular },
  filterRow:   { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  filterContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: "row" },
  filterChip: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "transparent",
  },
  filterChipActive: {
    borderColor: "rgba(34,211,238,0.25)",
    backgroundColor: "rgba(34,211,238,0.1)",
  },
  filterText:       { color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: FONTS.bold, letterSpacing: 1 },
  filterTextActive: { color: "#22d3ee", fontFamily: FONTS.bold },
  list: { padding: 14, gap: 10 },
  itemCard: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  rarityBar:   { width: 4 },
  itemBody:    { flex: 1, padding: 14, gap: 8 },
  itemHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemName:    { color: COLORS.text, fontSize: 14, fontFamily: FONTS.semiBold },
  rarityTag:   { fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 1 },
  itemDesc:    { color: "rgba(255,255,255,0.4)", fontSize: 12, lineHeight: 18 },
  effectValue: { color: COLORS.green, fontSize: 13, fontFamily: FONTS.semiBold },
  equipBtn: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(34,211,238,0.1)",
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.25)",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 4,
  },
  unequipBtn: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.1)",
  },
  equipText:   { color: "#22d3ee", fontSize: 12, fontFamily: FONTS.bold },
  empty: { alignItems: "center", paddingVertical: 48, gap: 10 },
  emptyIcon: { color: "rgba(255,255,255,0.2)", fontSize: 28 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: "center" },
});
