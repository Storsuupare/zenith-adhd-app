import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from "react-native";
import { useSignIn, useSignUp } from "@clerk/clerk-expo";
import { useTheme } from "../context/ThemeContext";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";

export default function AuthScreen() {
  const { accentColor } = useTheme() || {};
  const ac = accentColor || COLORS.accent;
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();

  const [mode,     setMode]     = useState("signup"); // "signin" | "signup" | "verify"
  const [verifyFlow, setVerifyFlow] = useState("signin"); // tracks whether verify came from signin or signup
  const [email,    setEmail]    = useState("");
  const [code,     setCode]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const clearError = () => setError(null);

  // ── Sign in with email OTP ────────────────────────────────────────────────
  const handleSignIn = async () => {
    if (!signInLoaded || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await signIn.create({
        strategy: "email_code",
        identifier: email.trim().toLowerCase(),
      });
      if (result.status === "needs_first_factor") {
        setVerifyFlow("signin");
        setMode("verify");
      }
    } catch (err) {
      setError(err.errors?.[0]?.message || "Sign in failed. Check your email.");
    } finally {
      setLoading(false);
    }
  };

  // ── Sign up with email OTP ────────────────────────────────────────────────
  const handleSignUp = async () => {
    if (!signUpLoaded || loading) return;
    setLoading(true);
    setError(null);
    try {
      await signUp.create({
        emailAddress: email.trim().toLowerCase(),
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setVerifyFlow("signup");
      setMode("verify");
    } catch (err) {
      setError(err.errors?.[0]?.message || "Sign up failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP code ───────────────────────────────────────────────────────
  const handleVerify = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      if (verifyFlow === "signup") {
        const result = await signUp.attemptEmailAddressVerification({ code });
        if (result.status === "complete") {
          await setSignUpActive({ session: result.createdSessionId });
        }
      } else {
        const result = await signIn.attemptFirstFactor({
          strategy: "email_code",
          code,
        });
        if (result.status === "complete") {
          await setSignInActive({ session: result.createdSessionId });
        }
      }
    } catch (err) {
      setError(err.errors?.[0]?.message || "Wrong code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.card}>
        <Text style={[styles.brand, { color: ac }]}>⬡ Zenith</Text>

        {mode === "verify" ? (
          <>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.sub}>
              We sent a 6-digit code to {email}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="000000"
              placeholderTextColor={COLORS.textMuted}
              value={code}
              onChangeText={(t) => { setCode(t); clearError(); }}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: ac }, loading && styles.btnDisabled]}
              onPress={handleVerify}
              disabled={loading || code.length < 6}
            >
              {loading
                ? <ActivityIndicator color={COLORS.bg} />
                : <Text style={styles.btnText}>Confirm →</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setMode("signin"); setCode(""); clearError(); }}>
              <Text style={styles.link}>Use a different email</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>
              {mode === "signin" ? "Sign in" : "Create account"}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={(t) => { setEmail(t); clearError(); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: ac }, loading && styles.btnDisabled]}
              onPress={mode === "signin" ? handleSignIn : handleSignUp}
              disabled={loading || !email.trim()}
            >
              {loading
                ? <ActivityIndicator color={COLORS.bg} />
                : <Text style={styles.btnText}>
                    {mode === "signin" ? "Continue →" : "Create account →"}
                  </Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                clearError();
              }}
            >
              <Text style={styles.link}>
                {mode === "signin"
                  ? "No account? Sign up"
                  : "Already have an account? Sign in"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    gap: 16,
  },
  brand: {
    color: COLORS.accent,
    fontSize: 22,
    fontFamily: FONTS.bold,
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    color: COLORS.text,
    fontSize: 26,
    fontFamily: FONTS.bold,
  },
  sub: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    color: COLORS.text,
    fontSize: 16,
  },
  btn: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: COLORS.bg,
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
  link: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
  error: {
    color: COLORS.red,
    fontSize: 13,
  },
});
