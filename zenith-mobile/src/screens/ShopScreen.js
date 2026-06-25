import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, ActivityIndicator, RefreshControl,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useUser } from "../context/UserContext";
import { useTheme, THEME_DATA } from "../context/ThemeContext";
import { fetchShopState, purchaseCosmetic } from "../services/api";
import { FONTS } from "../constants/fonts";
import onboardingRefs from "../utils/onboardingRefs";

const THEMES = [
  { id: "default",  label: "Classic",  color: "#22d3ee", type: "free"                    },
  { id: "cobalt",   label: "Cobalt",   color: "#3b82f6", type: "credits", price: 1500    },
  { id: "amber",    label: "Amber",    color: "#f59e0b", type: "credits", price: 1500    },
  { id: "crimson",  label: "Crimson",  color: "#ef4444", type: "credits", price: 2000    },
  { id: "violet",   label: "Violet",   color: "#8b5cf6", type: "credits", price: 2500    },
  { id: "jade",     label: "Jade",     color: "#10b981", type: "credits", price: 3000    },
  { id: "neon",     label: "Neon",     color: "#f72585", type: "credits", price: 2000    },
  { id: "arctic",   label: "Arctic",   color: "#67e8f9", type: "credits", price: 2000    },
  { id: "solar",    label: "Solar",    color: "#fb8500", type: "credits", price: 2500    },
  { id: "nebula",   label: "Nebula",   color: "#7209b7", type: "credits", price: 3000    },
  { id: "obsidian", label: "Obsidian", color: "#6d28d9", type: "credits", price: 3000    },
  { id: "ember",    label: "Ember",    color: "#b87333", type: "credits", price: 3500    },
];

function isUnlocked(item, owned) {
  if (item.type === "free") return true;
  return owned.includes(item.id);
}

export default function ShopScreen() {
  const { user, fetchUser, refreshToken } = useUser();
  const { activeTheme, setActiveTheme, previewTheme, accentColor } = useTheme();

  const [owned,      setOwned]     = useState([]);
  const [buying,     setBuying]    = useState(null);
  const [feedback,   setFeedback]  = useState(null);
  const [loading,    setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [retryKey,   setRetryKey]  = useState(0);
  const [previewId,  setPreviewId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchUser(), fetchShopState().then(res => {
      setOwned(res.data?.owned ?? []);
    }).catch(() => {})]);
    setRefreshing(false);
  };

  // Tracks the real applied theme so previews can revert correctly
  const realThemeRef   = useRef(activeTheme);
  const previewTimer   = useRef(null);

  // Keep realThemeRef synced whenever the user isn't previewing
  useEffect(() => {
    if (!previewId) realThemeRef.current = activeTheme;
  }, [activeTheme, previewId]);

  const credits = user?.system_credits ?? 0;

  useEffect(() => {
    if (!user?.id) return;
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
    const timer = setTimeout(() => setFeedback(null), 2500);
    return () => clearTimeout(timer);
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

  const previewLocked = useRef(false);

  const handlePreview = (item) => {
    if (previewLocked.current) return;
    previewLocked.current = true;
    setTimeout(() => { previewLocked.current = false; }, 600);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (previewTimer.current) clearTimeout(previewTimer.current);

    // Tapping the active preview cancels it
    if (previewId === item.id) {
      setPreviewId(null);
      previewTheme(realThemeRef.current);
      return;
    }

    // Capture real theme now before anything changes
    const realTheme = realThemeRef.current;
    setPreviewId(item.id);
    previewTheme(item.id);
    previewTimer.current = setTimeout(() => {
      setPreviewId(null);
      previewTheme(realTheme);
    }, 10000);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <ActivityIndicator color={accentColor} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (fetchError) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.errorState}>
          <Text style={styles.errorIcon}>◈</Text>
          <Text style={styles.errorText}>Couldn't load the shop</Text>
          <Text style={styles.errorSub}>Check your connection and try again</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { borderColor: accentColor + "55" }]}
            onPress={() => setRetryKey(k => k + 1)}
          >
            <Text style={[styles.retryTxt, { color: accentColor }]}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Shop</Text>
        <Text style={[styles.credits, { color: "#fbbf24" }]}>◈ {credits.toLocaleString()} CR</Text>
      </View>

      {/* Preview banner */}
      {previewId && (
        <View style={styles.previewBanner}>
          <Text style={[styles.previewBannerText, { color: accentColor }]}>
            Previewing — tap again to exit
          </Text>
        </View>
      )}

      {/* Feedback toast */}
      {feedback && !previewId && (
        <View style={[styles.toast, { borderColor: feedback.ok ? accentColor + "66" : "#ef444466" }]}>
          <Text style={[styles.toastTxt, { color: feedback.ok ? accentColor : "#ef4444" }]}>
            {feedback.msg}
          </Text>
        </View>
      )}

      <ScrollView
        ref={onboardingRefs.shopContent}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
      >

        {/* ── THEMES ──────────────────────────────────────────────────────── */}
        <View style={styles.themeGrid}>
          {THEMES.map(item => {
            const unlocked = isUnlocked(item, owned);
            const active   = activeTheme === item.id;
            const canBuy   = item.price && !unlocked && credits >= item.price;
            const isBuying = buying === item.id;

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.themeCard,
                  (active && !previewId) && { borderColor: item.color, borderWidth: 2 },
                  previewId === item.id && { borderColor: item.color, borderWidth: 2 },
                  !unlocked && !canBuy && styles.locked,
                ]}
                onPress={() => {
                  if (unlocked) handleApplyTheme(item.id);
                  else if (canBuy) handleBuyTheme(item);
                  else handlePreview(item);
                }}
                activeOpacity={0.75}
              >
                {/* Color swatch */}
                <View style={[styles.swatch, { backgroundColor: item.color }]}>
                  {active && !previewId && <Text style={styles.activeCheck}>✓</Text>}
                  {previewId === item.id && <Text style={styles.activeCheck}>◉</Text>}
                </View>

                {/* Label */}
                <Text style={[styles.themeLabel, active && { color: item.color }]} numberOfLines={1}>
                  {item.label}
                </Text>

                {/* Price or status */}
                {previewId === item.id ? (
                  <Text style={[styles.themePrice, { color: item.color }]}>Preview</Text>
                ) : !unlocked && item.price ? (
                  <Text style={[styles.themePrice, canBuy && { color: item.color }]}>
                    {isBuying ? "···" : canBuy ? `BUY · ${item.price} CR` : `${item.price} CR`}
                  </Text>
                ) : unlocked && active ? (
                  <Text style={[styles.themePrice, { color: item.color }]}>Active</Text>
                ) : (
                  <Text style={styles.themePrice}>Apply</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
