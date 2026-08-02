import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, RefreshControl, Modal, Alert, Linking,
} from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { useUser } from "../context/UserContext";
import { useTheme } from "../context/ThemeContext";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import onboardingRefs from "../utils/onboardingRefs";
import { deleteAccount, createPortalSession } from "../services/api";
import Purchases from "react-native-purchases";

const WEBSITE_URL = process.env.EXPO_PUBLIC_WEBSITE_URL || "https://zenithapp.org";

function getClockRows() {
  return [
    { time: "12AM – 5AM",  label: "Red Zone. Rewards ×0.5.",   color: "#ff3b3b" },
    { time: "8AM – 11AM",  label: "Peak window. XP ×1.25.",    color: "#f5c518" },
    { time: "10PM – 12AM", label: "Hyperfocus. XP ×1.5.",      color: "#a855f7" },
  ];
}

export default function SettingsScreen({ navigation }) {
  const { signOut } = useAuth();
  const { user, fetchUser } = useUser();
  const { accentColor } = useTheme();
  const [refreshing,          setRefreshing]          = useState(false);
  const [showDeleteModal,     setShowDeleteModal]     = useState(false);
  const [deleting,            setDeleting]            = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [offerings,           setOfferings]           = useState(null);
  const [offeringsLoading,    setOfferingsLoading]    = useState(false);
  const [purchaseLoading,     setPurchaseLoading]     = useState(false);

  const userRole   = user?.role ?? "FREE";
  const isPaidTier = userRole === "PRO" || userRole === "ELITE";
  const tierColor  = userRole === "ELITE" ? "#fbbf24" : userRole === "PRO" ? accentColor : "rgba(255,255,255,0.35)";

  useEffect(() => {
    if (userRole !== "FREE" || !process.env.EXPO_PUBLIC_REVENUECAT_KEY) return;
    setOfferingsLoading(true);
    Purchases.getOfferings()
      .then(availableOfferings => {
        if (availableOfferings.current) setOfferings(availableOfferings.current);
      })
      .catch(() => {})
      .finally(() => setOfferingsLoading(false));
  }, [userRole]);

  const handlePurchase = async (pkg) => {
    setPurchaseLoading(true);
    try {
      await Purchases.purchasePackage(pkg);
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

  const handleRestorePurchases = async () => {
    if (!process.env.EXPO_PUBLIC_REVENUECAT_KEY) return;
    setSubscriptionLoading(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (Object.keys(customerInfo.entitlements.active).length > 0) {
        await fetchUser();
        Alert.alert("Restored", "Your subscription has been restored.");
      } else {
        Alert.alert("Nothing to restore", "No active subscription found for this Apple ID.");
      }
    } catch {
      Alert.alert("Error", "Could not restore purchases. Please try again.");
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
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

  const hour       = new Date().getHours();
  const isRedzone  = hour >= 0 && hour < 5;
  const CLOCK_ROWS = getClockRows();

  const NavRow = ({ label, screen }) => (
    <TouchableOpacity style={styles.navRow} onPress={() => navigation.navigate(screen)}>
      <Text style={styles.navLabel}>{label}</Text>
      <Text style={styles.navArrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}>
        <Text style={styles.pageTitle}>Settings</Text>

        {/* Account */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <Row label="Level"  value={String(user?.level ?? 1)} />
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
          {isPaidTier ? (
            <>
              <Text style={styles.subscriptionNote}>
                To cancel or update your plan, open the Stripe billing portal.
              </Text>
              <TouchableOpacity
                style={[styles.manageBtn, subscriptionLoading && { opacity: 0.5 }]}
                onPress={handleManageSubscription}
                disabled={subscriptionLoading}
              >
                <Text style={styles.manageBtnText}>
                  {subscriptionLoading ? "Loading..." : "Manage subscription ↗"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {offeringsLoading ? (
                <Text style={styles.subscriptionNote}>Loading plans...</Text>
              ) : offerings?.availablePackages.length ? (
                offerings.availablePackages.map(pkg => (
                  <TouchableOpacity
                    key={pkg.identifier}
                    style={[
                      styles.upgradeBtn,
                      { borderColor: accentColor + "55" },
                      purchaseLoading && { opacity: 0.5 },
                    ]}
                    onPress={() => handlePurchase(pkg)}
                    disabled={purchaseLoading}
                  >
                    <Text style={[styles.upgradeBtnText, { color: accentColor }]}>
                      {pkg.product.title}
                    </Text>
                    <Text style={[styles.upgradePriceText, { color: accentColor + "99" }]}>
                      {pkg.product.priceString} / month
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <>
                  {[
                    { label: "PRO", price: "€4.99 / month", perks: "15 task slots · 6 months history · Prestige · Streak shield" },
                    { label: "ELITE", price: "€9.99 / month", perks: "Unlimited slots · All-time history · Auto-replenishing shield · CSV export" },
                  ].map(plan => (
                    <View key={plan.label} style={[styles.upgradeBtn, styles.upgradeBtnStatic]}>
                      <View style={styles.planRow}>
                        <Text style={[styles.upgradeBtnText, { color: "rgba(255,255,255,0.5)" }]}>{plan.label}</Text>
                        <Text style={[styles.upgradePriceText, { color: "rgba(255,255,255,0.35)" }]}>{plan.price}</Text>
                      </View>
                      <Text style={styles.planPerks}>{plan.perks}</Text>
                    </View>
                  ))}
                  <Text style={styles.subscriptionNote}>
                    Plans are pending App Store approval and will be purchasable here shortly. Already subscribed? Tap Restore purchases below.
                  </Text>
                </>
              )}
              <TouchableOpacity
                style={[styles.restoreBtn, subscriptionLoading && { opacity: 0.5 }]}
                onPress={handleRestorePurchases}
                disabled={subscriptionLoading}
              >
                <Text style={styles.restoreBtnText}>Restore purchases</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Neural Clock */}
        <View ref={onboardingRefs.neuralClock} style={styles.card}>
          <Text style={styles.cardTitle}>◎ Neural Clock</Text>
          <View style={[styles.statusBadge, isRedzone && { borderColor: COLORS.red + "55" }]}>
            <View style={[styles.statusDot, { backgroundColor: isRedzone ? COLORS.red : COLORS.green }]} />
            <Text style={styles.statusText}>
              {isRedzone ? "Red Zone active. Rewards halved until 5AM." : "Rewards shift with the time of day."}
            </Text>
          </View>
          {CLOCK_ROWS.map(row => (
            <Row key={row.time} label={row.time} value={row.label} valueColor={row.color} />
          ))}
        </View>

        {/* Navigation links */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>More</Text>
          <NavRow label="Release Notes" screen="ReleaseNotes" />
          <NavRow label="Privacy Policy" screen="Privacy" />
          <NavRow label="Terms of Service" screen="Terms" />
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={() => signOut()}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        {/* Danger Zone */}
        <View style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>⚠ Danger Zone</Text>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowDeleteModal(true)}>
            <Text style={styles.deleteText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>v1.0.0</Text>
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

function Row({ label, value, valueColor }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.04)",
  },
  label: { color: "rgba(255,255,255,0.3)", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" },
  value: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: FONTS.semiBold },
});

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: "transparent" },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  pageTitle: { color: COLORS.text, fontSize: 22, fontFamily: FONTS.bold, marginBottom: 4 },
  card: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 18,
    gap: 2,
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
  upgradeBtnStatic: {
    borderStyle:     "dashed",
    borderColor:     "rgba(255,255,255,0.12)",
    backgroundColor: "transparent",
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
  restoreBtn: {
    paddingVertical: 10,
    alignItems:      "center",
    marginTop:       4,
  },
  restoreBtnText: {
    color:         "rgba(255,255,255,0.25)",
    fontSize:      12,
    fontFamily:    FONTS.regular,
    letterSpacing: 0.5,
  },
  signOutBtn: {
    backgroundColor: "rgba(255,34,68,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,34,68,0.45)",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  signOutText: { color: COLORS.red, fontSize: 15, fontFamily: FONTS.semiBold },
  dangerCard: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,34,68,0.65)",
    borderRadius: 16,
    padding: 18,
    gap: 10,
    alignItems: "center",
  },
  dangerTitle: { color: "#fff", fontSize: 13, fontFamily: FONTS.bold, letterSpacing: 1, textAlign: "center" },
  deleteBtn: {
    backgroundColor: "rgba(255,34,68,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,34,68,0.45)",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    alignSelf: "stretch",
  },
  deleteText:   { color: COLORS.red, fontSize: 15, fontFamily: FONTS.semiBold },
  versionText:  { color: "rgba(255,255,255,0.18)", fontSize: 11, textAlign: "center", letterSpacing: 1, paddingBottom: 8 },
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
