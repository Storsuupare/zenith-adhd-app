import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, RefreshControl, Modal, Alert, Linking,
} from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { useUser } from "../context/UserContext";
import { useTheme } from "../context/ThemeContext";
import ScreenHeader from "../components/ScreenHeader";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADIUS, SPACING, SURFACE } from "../constants/layout";
import onboardingRefs from "../utils/onboardingRefs";
import { deleteAccount, createPortalSession } from "../services/api";
import Purchases from "react-native-purchases";

const WEBSITE_URL = process.env.EXPO_PUBLIC_WEBSITE_URL || "https://zenithapp.org";

const CLOCK_ROWS = [
  { time: "12AM – 5AM",  label: "Red Zone. Rewards ×0.5.",   color: "#ff3b3b" },
  { time: "8AM – 11AM",  label: "Peak window. XP ×1.25.",    color: "#f5c518" },
  { time: "10PM – 12AM", label: "Hyperfocus. XP ×1.5.",      color: "#a855f7" },
];

const PLAN_DETAILS = {
  PRO:   { price: "€3.99 / month", perks: "15 task slots · 6 months of history · Prestige · Streak shield" },
  ELITE: { price: "€8.99 / month", perks: "Unlimited slots · All-time history · Auto-replenishing shield · CSV export" },
};

const LEGAL_LINKS = [
  { label: "Terms of Use",   screen: "Terms" },
  { label: "Privacy Policy", screen: "Privacy" },
  { label: "Refund Policy",  screen: "Refund" },
];

const BILLING_DISCLOSURE =
  "Zenith PRO and ELITE are auto-renewing monthly subscriptions billed to your Apple ID. " +
  "Your subscription renews automatically unless cancelled at least 24 hours before the current period ends. " +
  "Manage or cancel it any time in your Apple ID settings.";

function resolvePlanTier(purchasePackage) {
  const packageDescriptor = `${purchasePackage.identifier ?? ""} ${purchasePackage.product?.identifier ?? ""} ${purchasePackage.product?.title ?? ""}`.toUpperCase();
  if (packageDescriptor.includes("ELITE")) return "ELITE";
  if (packageDescriptor.includes("PRO"))   return "PRO";
  return null;
}

function PurchaseButton({ purchasePackage, accentColor, purchaseLoading, onPress, labelOverride }) {
  const planTier = resolvePlanTier(purchasePackage);
  return (
    <TouchableOpacity
      style={[
        styles.upgradeBtn,
        { borderColor: accentColor + "55" },
        purchaseLoading && { opacity: 0.5 },
      ]}
      onPress={onPress}
      disabled={purchaseLoading}
      activeOpacity={0.75}
    >
      <View style={styles.planRow}>
        <Text style={[styles.upgradeBtnText, { color: accentColor }]}>
          {labelOverride ?? planTier ?? purchasePackage.product.title}
        </Text>
        <Text style={[styles.upgradePriceText, { color: accentColor + "99" }]}>
          {purchasePackage.product.priceString} / month
        </Text>
      </View>
      {planTier && <Text style={styles.planPerks}>{PLAN_DETAILS[planTier].perks}</Text>}
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ navigation }) {
  const { signOut } = useAuth();
  const { user, fetchUser, refreshToken, restorePurchases, restoringPurchases } = useUser();
  const { accentColor } = useTheme();
  const [refreshing,          setRefreshing]          = useState(false);
  const [showDeleteModal,     setShowDeleteModal]     = useState(false);
  const [deleting,            setDeleting]            = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [offerings,           setOfferings]           = useState(null);
  const [offeringsLoading,    setOfferingsLoading]    = useState(false);
  const [purchaseLoading,     setPurchaseLoading]     = useState(false);
  const [offeringsError,      setOfferingsError]      = useState(false);

  const userRole   = user?.role ?? "FREE";
  const tierColor  = userRole === "ELITE" ? "#fbbf24" : userRole === "PRO" ? accentColor : "rgba(255,255,255,0.35)";

  const loadOfferings = useCallback(async ({ announceFailure = false } = {}) => {
    // ELITE has nothing above it to upgrade to. PRO still needs the catalog, to
    // offer ELITE as an in-app upgrade instead of only via Apple's system screen.
    if (userRole === "ELITE") return;
    setOfferingsLoading(true);
    setOfferingsError(false);
    try {
      const availableOfferings = await Purchases.getOfferings();
      if (availableOfferings.current?.availablePackages?.length) {
        setOfferings(availableOfferings.current);
      } else {
        setOfferingsError(true);
        console.warn("[Settings] RevenueCat returned no current offering with packages");
        if (announceFailure) {
          Alert.alert("Plans unavailable", "Couldn't load subscription plans from the App Store. Please try again in a moment.");
        }
      }
    } catch (offeringsFetchError) {
      setOfferingsError(true);
      console.warn("[Settings] getOfferings failed:", offeringsFetchError?.message);
      if (announceFailure) {
        Alert.alert("Plans unavailable", offeringsFetchError?.message ?? "Couldn't reach the App Store. Please try again.");
      }
    } finally {
      setOfferingsLoading(false);
    }
  }, [userRole]);

  useEffect(() => { loadOfferings(); }, [loadOfferings]);

  const handlePurchase = async (purchasePackage) => {
    setPurchaseLoading(true);
    try {
      await Purchases.purchasePackage(purchasePackage);
      await fetchUser();
    } catch (purchaseError) {
      if (!purchaseError.userCancelled) {
        Alert.alert("Purchase failed", "Something went wrong. Please try again.");
      }
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setSubscriptionLoading(true);
    try {
      if (process.env.EXPO_PUBLIC_REVENUECAT_KEY) {
        const customerInfo        = await Purchases.getCustomerInfo();
        const hasAppleEntitlement = Object.keys(customerInfo.entitlements.active).length > 0;
        if (hasAppleEntitlement) {
          await Purchases.showManageSubscriptions();
          setSubscriptionLoading(false);
          return;
        }
      }
      await refreshToken();
      const response  = await createPortalSession();
      const portalUrl = response.data?.url;
      if (portalUrl) {
        await Linking.openURL(portalUrl);
      } else {
        Alert.alert("Error", "Could not open subscription management. Please try again.");
      }
    } catch {
      Alert.alert("Error", "Could not open subscription management. Please try again.");
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await refreshToken();
      await deleteAccount();
      await signOut();
    } catch {
      Alert.alert("Error", "Failed to delete account. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUser();
    setRefreshing(false);
  };

  const eliteUpgradePackage = userRole === "PRO"
    ? offerings?.availablePackages.find(purchasePackage => resolvePlanTier(purchasePackage) === "ELITE")
    : null;

  const currentHour = new Date().getHours();
  const isRedZone   = currentHour >= 0 && currentHour < 5;

  const NavRow = ({ label, screen }) => (
    <TouchableOpacity style={styles.navRow} onPress={() => navigation.navigate(screen)}>
      <Text style={styles.navLabel}>{label}</Text>
      <Text style={styles.navArrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Settings" />

      <ScrollView
        ref={onboardingRefs.settingsScroll}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
      >
        {/* Account */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          {user?.email_address && <Row label="Email" value={user.email_address} numberOfLines={1} />}
          <Row label="Level" value={String(user?.level ?? 1)} />
          {(user?.streak ?? 0) > 0 && (
            <Row label="Streak" value={`${user.streak} days`} />
          )}
        </View>

        {/* Subscription */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Subscription</Text>
          <View style={styles.subscriptionTierRow}>
            <Text style={styles.subscriptionTierLabel}>Current plan</Text>
            <Text style={[styles.subscriptionTierValue, { color: tierColor }]}>{userRole}</Text>
          </View>

          {userRole === "ELITE" ? (
            <TouchableOpacity
              style={[styles.manageBtn, subscriptionLoading && { opacity: 0.5 }]}
              onPress={handleManageSubscription}
              disabled={subscriptionLoading}
            >
              <Text style={styles.manageBtnText}>
                {subscriptionLoading ? "Opening…" : "Manage subscription"}
              </Text>
            </TouchableOpacity>
          ) : userRole === "PRO" ? (
            <>
              <TouchableOpacity
                style={[styles.manageBtn, subscriptionLoading && { opacity: 0.5 }]}
                onPress={handleManageSubscription}
                disabled={subscriptionLoading}
              >
                <Text style={styles.manageBtnText}>
                  {subscriptionLoading ? "Opening…" : "Manage subscription"}
                </Text>
              </TouchableOpacity>
              {eliteUpgradePackage && (
                <PurchaseButton
                  purchasePackage={eliteUpgradePackage}
                  accentColor={accentColor}
                  purchaseLoading={purchaseLoading}
                  onPress={() => handlePurchase(eliteUpgradePackage)}
                  labelOverride="Upgrade to ELITE"
                />
              )}
            </>
          ) : offeringsLoading ? (
            <Text style={styles.subscriptionNote}>Loading plans from the App Store…</Text>
          ) : offerings?.availablePackages.length ? (
            offerings.availablePackages.map(purchasePackage => (
              <PurchaseButton
                key={purchasePackage.identifier}
                purchasePackage={purchasePackage}
                accentColor={accentColor}
                purchaseLoading={purchaseLoading}
                onPress={() => handlePurchase(purchasePackage)}
              />
            ))
          ) : (
            <>
              {Object.entries(PLAN_DETAILS).map(([planTier, plan]) => (
                <TouchableOpacity
                  key={planTier}
                  style={[styles.upgradeBtn, { borderColor: accentColor + "40" }]}
                  onPress={() => loadOfferings({ announceFailure: true })}
                  activeOpacity={0.75}
                >
                  <View style={styles.planRow}>
                    <Text style={[styles.upgradeBtnText, { color: accentColor }]}>{planTier}</Text>
                    <Text style={[styles.upgradePriceText, { color: accentColor + "99" }]}>{plan.price}</Text>
                  </View>
                  <Text style={styles.planPerks}>{plan.perks}</Text>
                </TouchableOpacity>
              ))}
              {offeringsError && (
                <Text style={styles.subscriptionNote}>
                  Couldn't reach the App Store. Tap a plan to try again.
                </Text>
              )}
            </>
          )}

          <Text style={styles.subscriptionNote}>{BILLING_DISCLOSURE}</Text>

          <TouchableOpacity
            style={[styles.restoreBtn, restoringPurchases && { opacity: 0.5 }]}
            onPress={restorePurchases}
            disabled={restoringPurchases}
          >
            <Text style={styles.restoreBtnText}>
              {restoringPurchases ? "Restoring…" : "Restore purchases"}
            </Text>
          </TouchableOpacity>

          <View style={styles.legalLinkRow}>
            {LEGAL_LINKS.map((legalLink, linkIndex) => (
              <React.Fragment key={legalLink.screen}>
                {linkIndex > 0 && <Text style={styles.legalSeparator}>·</Text>}
                <TouchableOpacity onPress={() => navigation.navigate(legalLink.screen)} hitSlop={8}>
                  <Text style={[styles.legalLink, { color: accentColor }]}>{legalLink.label}</Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Neural Clock */}
        <View
          ref={onboardingRefs.neuralClock}
          style={styles.card}
          onLayout={event => { onboardingRefs.neuralClockY.current = event.nativeEvent.layout.y; }}
        >
          <Text style={styles.cardTitle}>Neural Clock</Text>
          <View style={[styles.statusBadge, isRedZone && { borderColor: COLORS.red + "55" }]}>
            <View style={[styles.statusDot, { backgroundColor: isRedZone ? COLORS.red : COLORS.green }]} />
            <Text style={styles.statusText}>
              {isRedZone ? "Red Zone active. Rewards halved until 5AM." : "Rewards shift with the time of day."}
            </Text>
          </View>
          {CLOCK_ROWS.map(clockWindow => (
            <Row
              key={clockWindow.time}
              label={clockWindow.time}
              value={clockWindow.label}
              valueColor={clockWindow.color}
            />
          ))}
        </View>

        {/* Navigation links */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About</Text>
          <NavRow label="Release Notes" screen="ReleaseNotes" />
        </View>

        {/* Account actions */}
        <View style={styles.actionCard}>
          <TouchableOpacity style={styles.actionRow} onPress={() => signOut()}>
            <Text style={styles.actionText}>Sign out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionRow, styles.actionRowDivided]}
            onPress={() => setShowDeleteModal(true)}
          >
            <Text style={[styles.actionText, styles.actionTextDestructive]}>Delete account</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.actionFootnote}>
          Deleting your account permanently removes all progress, credits, and inventory.
        </Text>

        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Confirmation modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalBody}>
              This permanently deletes your account, all progress, credits, and inventory. This cannot be undone.
            </Text>
            <TouchableOpacity
              style={styles.modalConfirmBtn}
              onPress={handleDeleteAccount}
              disabled={deleting}
            >
              <Text style={styles.modalConfirmText}>
                {deleting ? "Deleting..." : "Yes, delete my account"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowDeleteModal(false)}
              disabled={deleting}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Row({ label, value, valueColor, numberOfLines }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text
        style={[rowStyles.value, valueColor && { color: valueColor }]}
        numberOfLines={numberOfLines}
        ellipsizeMode="middle"
      >
        {value}
      </Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.04)",
  },
  label: {
    color:         "rgba(255,255,255,0.3)",
    fontSize:      11,
    letterSpacing: 1,
    textTransform: "uppercase",
    flexShrink:    0,
  },
  value: {
    color:      "rgba(255,255,255,0.8)",
    fontSize:   12,
    fontFamily: FONTS.semiBold,
    flexShrink: 1,
    textAlign:  "right",
  },
});

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: "transparent" },
  scroll:  { flex: 1 },
  content: { padding: SPACING.screenPadding, gap: 14, paddingBottom: 32 },
  card: {
    backgroundColor: SURFACE.card,
    borderWidth:     1,
    borderColor:     SURFACE.cardBorder,
    borderRadius:    RADIUS.large,
    padding:         18,
    gap:             2,
  },
  cardTitle: { color: COLORS.text, fontSize: 13, fontFamily: FONTS.bold, marginBottom: 6 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 4,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { color: COLORS.textMuted, fontSize: 12, flex: 1 },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.04)",
  },
  navLabel: { color: COLORS.text, fontSize: 14 },
  navArrow: { color: COLORS.textMuted, fontSize: 18 },
  subscriptionTierRow: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    paddingVertical: 8,
    borderTopWidth:  1,
    borderTopColor:  "rgba(255,255,255,0.04)",
  },
  subscriptionTierLabel: {
    color:         "rgba(255,255,255,0.3)",
    fontSize:      11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  subscriptionTierValue: {
    fontSize:   12,
    fontFamily: FONTS.semiBold,
    letterSpacing: 1,
  },
  subscriptionNote: {
    color:      "rgba(255,255,255,0.28)",
    fontSize:   12,
    lineHeight: 18,
    marginTop:  4,
  },
  upgradeBtn: {
    borderWidth:       1,
    borderRadius:      10,
    paddingVertical:   12,
    paddingHorizontal: 16,
    alignItems:        "flex-start",
    marginTop:         8,
    backgroundColor:   "rgba(255,255,255,0.03)",
  },
  upgradeBtnText: {
    fontSize:   13,
    fontFamily: FONTS.semiBold,
    letterSpacing: 0.3,
  },
  upgradePriceText: {
    fontSize:   11,
    fontFamily: FONTS.monoBold,
    letterSpacing: 0.5,
    marginTop:  2,
  },
  manageBtn: {
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.15)",
    borderRadius:      10,
    paddingVertical:   12,
    paddingHorizontal: 16,
    alignItems:        "center",
    marginTop:         8,
    backgroundColor:   "rgba(255,255,255,0.04)",
  },
  manageBtnText: {
    color:      "rgba(255,255,255,0.7)",
    fontSize:   13,
    fontFamily: FONTS.semiBold,
    letterSpacing: 0.3,
  },
  planRow: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    width:          "100%",
  },
  planPerks: {
    color:      "rgba(255,255,255,0.3)",
    fontSize:   11,
    fontFamily: FONTS.regular,
    marginTop:  4,
  },
  legalLinkRow: {
    flexDirection:  "row",
    flexWrap:       "wrap",
    justifyContent: "center",
    alignItems:     "center",
    gap:            8,
    marginTop:      8,
  },
  legalLink:      { fontSize: 12, fontFamily: FONTS.semiBold },
  legalSeparator: { color: "rgba(255,255,255,0.3)", fontSize: 12 },
  restoreBtn: {
    backgroundColor:   "rgba(5,8,15,0.7)",
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.15)",
    borderRadius:      10,
    paddingVertical:   10,
    paddingHorizontal: 16,
    alignItems:        "center",
    marginTop:         4,
  },
  restoreBtnText: {
    color:         "#ffffff",
    fontSize:      12,
    fontFamily:    FONTS.regular,
    letterSpacing: 0.5,
  },
  actionCard: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.06)",
    borderRadius:    16,
    overflow:        "hidden",
  },
  actionRow: {
    paddingVertical: 15,
    alignItems:      "center",
  },
  actionRowDivided: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  actionText: {
    color:      COLORS.text,
    fontSize:   15,
    fontFamily: FONTS.semiBold,
  },
  actionTextDestructive: { color: COLORS.red },
  actionFootnote: {
    color:      "rgba(255,255,255,0.28)",
    fontSize:   11,
    lineHeight: 16,
    textAlign:  "center",
    marginTop:  -6,
    paddingHorizontal: 16,
  },
  versionBadge: {
    alignSelf:         "center",
    backgroundColor:   "rgba(5,8,15,0.7)",
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.1)",
    borderRadius:      20,
    paddingHorizontal: 10,
    paddingVertical:   4,
    marginBottom:      8,
  },
  versionText: { color: "rgba(255,255,255,0.5)", fontSize: 11, textAlign: "center", letterSpacing: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "rgba(255,34,68,0.3)",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    gap: 12,
  },
  modalTitle: { color: COLORS.text, fontSize: 18, fontFamily: FONTS.bold },
  modalBody:  { color: COLORS.textMuted, fontSize: 13, lineHeight: 20 },
  modalConfirmBtn: {
    backgroundColor: "rgba(255,34,68,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,34,68,0.5)",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  modalConfirmText: { color: COLORS.red, fontSize: 14, fontFamily: FONTS.semiBold },
  modalCancelBtn: {
    padding: 12,
    alignItems: "center",
  },
  modalCancelText: { color: COLORS.textMuted, fontSize: 13 },
});
