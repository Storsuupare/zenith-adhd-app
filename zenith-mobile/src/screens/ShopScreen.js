import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, Linking, ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useUser } from "../context/UserContext";
import { useTheme, THEME_DATA } from "../context/ThemeContext";
import { fetchShopState, purchaseCosmetic } from "../services/api";
import { FONTS } from "../constants/fonts";
import onboardingRefs from "../utils/onboardingRefs";

// ── Exact cosmetics catalog from web constants.js ──────────────────────────
const THEMES = [
  { id: "default",  label: "Classic",  color: "#22d3ee", type: "free"                    },
  { id: "cobalt",   label: "Cobalt",   color: "#3b82f6", type: "credits", price: 1500    },
  { id: "amber",    label: "Amber",    color: "#f59e0b", type: "credits", price: 1500    },
  { id: "crimson",  label: "Crimson",  color: "#ef4444", type: "credits", price: 2000    },
  { id: "violet",   label: "Violet",   color: "#8b5cf6", type: "credits", price: 2500    },
  { id: "jade",     label: "Jade",     color: "#10b981", type: "credits", price: 3000    },
  { id: "neon",     label: "Neon",     color: "#f72585", type: "pro",     price: 2000    },
  { id: "arctic",   label: "Arctic",   color: "#67e8f9", type: "pro",     price: 2000    },
  { id: "solar",    label: "Solar",    color: "#fb8500", type: "pro",     price: 2500    },
  { id: "nebula",   label: "Nebula",   color: "#7209b7", type: "elite",   price: 3000    },
  { id: "obsidian", label: "Obsidian", color: "#6d28d9", type: "elite",   price: 3000    },
  { id: "ghost",    label: "Ghost",    color: "#e2e8f0", type: "elite",   price: 3500    },
];

const TIER_PERKS = [
  { tier: 1, label: "PRO",   color: "#22d3ee", price: "€4.99/mo", perks: [
    "1.5× XP and credits every session",
    "50% loot drop rate",
    "120 CR daily bonus",
    "Neon, Arctic + Solar unlocked in shop",
  ]},
  { tier: 2, label: "ELITE", color: "#fbbf24", price: "€9.99/mo", perks: [
    "2× XP and credits every session",
    "75% loot drop rate",
    "250 CR daily bonus",
    "Unlimited active tasks",
    "All themes unlocked",
    "Best Legendary and Mythic odds",
  ]},
];

function isUnlocked(item, tier, owned) {
  if (item.type === "free") return true;
  return owned.includes(item.id);
}

function tierMet(item, tier) {
  if (item.type === "pro")   return tier >= 1;
  if (item.type === "elite") return tier >= 2;
  return true;
}

const TABS = ["Themes", "Upgrade"];

export default function ShopScreen() {
  const { user, fetchUser, refreshToken } = useUser();
  const { activeTheme, setActiveTheme, previewTheme, accentColor } = useTheme();

  const [tab,        setTab]       = useState("Themes");
  const [owned,      setOwned]     = useState([]);
  const [buying,     setBuying]    = useState(null);
  const [feedback,   setFeedback]  = useState(null);
  const [loading,    setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [retryKey,   setRetryKey]  = useState(0);
  const [previewId,  setPreviewId] = useState(null);

  // Tracks the real applied theme so previews can revert correctly
  const realThemeRef   = useRef(activeTheme);
  const previewTimer   = useRef(null);

  // Keep realThemeRef synced whenever the user isn't previewing
  useEffect(() => {
    if (!previewId) realThemeRef.current = activeTheme;
  }, [activeTheme, previewId]);

  const tier    = user?.account_tier ?? 0;
  const credits = user?.system_credits ?? 0;

  useEffect(() => {
    setLoading(true);
    setFetchError(false);
    fetchShopState()
      .then(res => {
        const ownedList = res.data?.owned ?? [];
        setOwned(ownedList);
        // Fix stale theme from a previous account (e.g. sandbox cache)
        const freeIds = THEMES.filter(t => t.type === "free").map(t => t.id);
        if (!freeIds.includes(activeTheme) && !ownedList.includes(activeTheme)) {
          setActiveTheme("default");
        }
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [user?.id, retryKey]);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 2500);
    return () => clearTimeout(t);
  }, [feedback]);

  const handleBuyTheme = async (item) => {
    if (buying || credits < item.price) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBuying(item.id);
    try {
      await refreshToken();
      await purchaseCosmetic(item.id);
      setOwned(prev => [...prev, item.id]);
      fetchUser();
      setFeedback({ ok: true, msg: `${item.label} unlocked!` });
      setActiveTheme(item.id);
    } catch (e) {
      const code = e.response?.data?.error;
      const msg =
        code === "INSUFFICIENT_CREDITS" ? "Not enough credits" :
        code === "ALREADY_OWNED"        ? "Already owned" :
        code === "TIER_REQUIRED"        ? "Requires PRO or ELITE" :
        code === "COSMETIC_NOT_FOUND"   ? "Item not found" :
        code === "TOO_MANY_REQUESTS"    ? "Slow down — try again shortly" :
        code === "UNAUTHORIZED"         ? "Session expired — please restart the app" :
        code === "INVALID_TOKEN"        ? "Session expired — please restart the app" :
        code ? `Error: ${code}` : "Purchase failed — check your connection";
      setFeedback({ ok: false, msg });
    } finally { setBuying(null); }
  };

  const handleApplyTheme = (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Cancel any active preview first
    if (previewTimer.current) clearTimeout(previewTimer.current);
    setPreviewId(null);
    realThemeRef.current = id;
    setActiveTheme(id);
    setFeedback({ ok: true, msg: "Theme applied" });
  };

  const handlePreview = (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (previewTimer.current) clearTimeout(previewTimer.current);
    // Tapping the active preview cancels it
    if (previewId === item.id) {
      setPreviewId(null);
      setActiveTheme(realThemeRef.current); // re-saves real theme to AsyncStorage
      return;
    }
    setPreviewId(item.id);
    previewTheme(item.id); // visual only — never writes to AsyncStorage
    previewTimer.current = setTimeout(() => {
      setPreviewId(null);
      setActiveTheme(realThemeRef.current); // re-saves real theme to AsyncStorage
    }, 10000);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <ActivityIndicator color={accentColor} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (fetchError) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.errorState}>
          <Text style={s.errorIcon}>◈</Text>
          <Text style={s.errorText}>Couldn't load the shop</Text>
          <Text style={s.errorSub}>Check your connection and try again</Text>
          <TouchableOpacity
            style={[s.retryBtn, { borderColor: accentColor + "55" }]}
            onPress={() => setRetryKey(k => k + 1)}
          >
            <Text style={[s.retryTxt, { color: accentColor }]}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Shop</Text>
        <Text style={[s.credits, { color: "#fbbf24" }]}>◈ {credits.toLocaleString()} CR</Text>
      </View>

      {/* Preview banner */}
      {previewId && (
        <View style={s.previewBanner}>
          <Text style={[s.previewBannerText, { color: accentColor }]}>
            Previewing — tap again to exit
          </Text>
        </View>
      )}

      {/* Feedback toast */}
      {feedback && !previewId && (
        <View style={[s.toast, { borderColor: feedback.ok ? accentColor + "66" : "#ef444466" }]}>
          <Text style={[s.toastTxt, { color: feedback.ok ? accentColor : "#ef4444" }]}>
            {feedback.msg}
          </Text>
        </View>
      )}

      {/* Tabs */}
      <View style={s.tabs}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t}
            style={[s.tab, tab === t && { borderBottomColor: accentColor, borderBottomWidth: 2 }]}
            onPress={() => setTab(t)}
          >
            <Text style={[s.tabTxt, tab === t && { color: accentColor }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        ref={onboardingRefs.shopContent}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── THEMES ──────────────────────────────────────────────────────── */}
        {tab === "Themes" && (
          <View style={s.themeGrid}>
            {THEMES.map(item => {
              const unlocked    = isUnlocked(item, tier, owned);
              const active      = activeTheme === item.id;
              const tierUnlocked = tierMet(item, tier);
              const canBuy      = item.price && !unlocked && tierUnlocked && credits >= item.price;
              const isBuying    = buying === item.id;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    s.themeCard,
                    (active && !previewId) && { borderColor: item.color, borderWidth: 2 },
                    previewId === item.id && { borderColor: item.color, borderWidth: 2 },
                    !unlocked && s.locked,
                  ]}
                  onPress={() => {
                    if (unlocked) handleApplyTheme(item.id);
                    else if (canBuy) handleBuyTheme(item);
                    else handlePreview(item);
                  }}
                  activeOpacity={0.75}
                >
                  {/* Color swatch */}
                  <View style={[s.swatch, { backgroundColor: item.color }]}>
                    {active && !previewId && <Text style={s.activeCheck}>✓</Text>}
                    {previewId === item.id && <Text style={s.activeCheck}>◉</Text>}
                    {!unlocked && !tierUnlocked && previewId !== item.id && (
                      <View style={s.lockOverlay}>
                        <Text style={s.lockIcon}>
                          {item.type === "pro" ? "PRO" : "ELITE"}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Label */}
                  <Text style={[s.themeLabel, active && { color: item.color }]} numberOfLines={1}>
                    {item.label}
                  </Text>

                  {/* Price or status */}
                  {previewId === item.id ? (
                    <Text style={[s.themePrice, { color: item.color }]}>Preview</Text>
                  ) : !unlocked && !tierUnlocked ? (
                    <Text style={[s.themePrice, { color: item.type === "pro" ? "#22d3ee" : "#fbbf24" }]}>
                      {item.type.toUpperCase()} · Preview
                    </Text>
                  ) : !unlocked && tierUnlocked && item.price ? (
                    <Text style={[s.themePrice, canBuy && { color: item.color }]}>
                      {isBuying ? "···" : `${item.price} CR`}
                    </Text>
                  ) : unlocked && active ? (
                    <Text style={[s.themePrice, { color: item.color }]}>Active</Text>
                  ) : (
                    <Text style={s.themePrice}>Apply</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── UPGRADE ─────────────────────────────────────────────────────── */}
        {tab === "Upgrade" && (
          <>
            {tier >= 2 ? (
              <View style={s.maxed}>
                <Text style={[s.maxedIcon, { color: "#fbbf24" }]}>◆</Text>
                <Text style={s.maxedTitle}>You're on Elite</Text>
                <Text style={s.maxedSub}>Every feature is unlocked.</Text>
              </View>
            ) : (
              TIER_PERKS.filter(t => t.tier > tier).map(tp => (
                <View key={tp.tier} style={[s.upgradeCard, { borderColor: tp.color + "33" }]}>
                  <View style={s.upgradeHeader}>
                    <Text style={[s.upgradeTier, { color: tp.color }]}>{tp.label}</Text>
                    <Text style={[s.upgradePrice, { color: tp.color }]}>{tp.price}</Text>
                  </View>
                  {tp.perks.map((p, i) => (
                    <View key={i} style={s.perkRow}>
                      <Text style={[s.perkDot, { color: tp.color }]}>◆</Text>
                      <Text style={s.perkTxt}>{p}</Text>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={[s.upgradeBtn, { backgroundColor: tp.color }]}
                    onPress={() => Linking.openURL("https://zenithapp.org")}
                  >
                    <Text style={s.upgradeBtnTxt}>Subscribe at zenithapp.org ↗</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "transparent" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "rgba(0,0,0,0.22)",
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  title:   { color: "#f8fafc", fontSize: 14, fontFamily: FONTS.bold, letterSpacing: 2 },
  credits: { fontSize: 13, fontFamily: FONTS.semiBold },

  previewBanner: {
    marginHorizontal: 16, marginTop: 8,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: "rgba(5,8,15,0.85)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8, alignItems: "center",
  },
  previewBannerText: { fontSize: 12, fontFamily: FONTS.semiBold, letterSpacing: 0.5 },

  toast: {
    marginHorizontal: 16, marginTop: 8,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: "rgba(5,8,15,0.85)",
    borderWidth: 1, borderRadius: 8,
  },
  toastTxt: { fontSize: 13, fontFamily: FONTS.semiBold, textAlign: "center" },

  tabs: {
    flexDirection: "row",
    backgroundColor: "rgba(5,8,15,0.6)",
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)",
  },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: "center",
    borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  tabTxt: { color: "rgba(255,255,255,0.35)", fontSize: 11, fontFamily: FONTS.bold, letterSpacing: 1 },

  content: { padding: 16, paddingBottom: 40, gap: 12 },

  // Themes
  themeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  themeCard: {
    width:           "30%",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.07)",
    borderRadius:    14,
    overflow:        "hidden",
    alignItems:      "center",
    paddingBottom:   10,
  },
  swatch: {
    width: "100%", height: 70,
    alignItems: "center", justifyContent: "center",
  },
  activeCheck: { color: "#030712", fontSize: 18, fontFamily: FONTS.bold },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center", justifyContent: "center",
  },
  lockIcon:   { color: "#fff", fontSize: 9, fontFamily: FONTS.bold, letterSpacing: 1 },
  themeLabel: { color: "#f8fafc", fontSize: 11, fontFamily: FONTS.semiBold, marginTop: 7 },
  themePrice: { color: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: FONTS.regular, marginTop: 2 },
  locked:     { opacity: 0.6 },

  // Upgrade
  upgradeCard: {
    backgroundColor: "rgba(0,0,0,0.40)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    padding: 16, gap: 10,
  },
  upgradeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  upgradeTier:   { fontSize: 16, fontFamily: FONTS.bold, letterSpacing: 1.5 },
  upgradePrice:  { fontSize: 14, fontFamily: FONTS.semiBold },
  perkRow:       { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  perkDot:       { fontSize: 8, paddingTop: 4 },
  perkTxt:       { color: "rgba(255,255,255,0.55)", fontSize: 13, fontFamily: FONTS.regular, flex: 1, lineHeight: 18 },
  upgradeBtn: {
    borderRadius: 8, paddingVertical: 12, alignItems: "center", marginTop: 4,
  },
  upgradeBtnTxt: { color: "#030712", fontFamily: FONTS.bold, fontSize: 12, letterSpacing: 0.5 },

  maxed:      { alignItems: "center", paddingVertical: 48, gap: 10 },
  maxedIcon:  { fontSize: 36 },
  maxedTitle: { color: "#f8fafc", fontSize: 20, fontFamily: FONTS.bold },
  maxedSub:   { color: "rgba(255,255,255,0.4)", fontSize: 14, fontFamily: FONTS.regular },

  errorState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 32 },
  errorIcon:  { fontSize: 32, color: "rgba(255,255,255,0.2)", marginBottom: 4 },
  errorText:  { color: "#f8fafc", fontSize: 16, fontFamily: FONTS.bold },
  errorSub:   { color: "rgba(255,255,255,0.4)", fontSize: 13, fontFamily: FONTS.regular, textAlign: "center" },
  retryBtn:   { marginTop: 12, borderWidth: 1, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  retryTxt:   { fontSize: 14, fontFamily: FONTS.semiBold },
});
