import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import Constants from "expo-constants";
import { FONTS } from "../constants/fonts";
import { reportClientError } from "../services/api";

// Error boundaries must be class components — React has no hook equivalent for
// getDerivedStateFromError/componentDidCatch. Reports to the backend's
// /api/client-error relay rather than a PostHog client SDK directly, so error
// tracking stays inside the same "server decides what leaves" boundary as
// every other analytics event.
export default class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    reportClientError({
      message:    error?.message ?? "Unknown render error",
      stack:      error?.stack,
      platform:   Platform.OS,
      screen:     "render_crash",
      appVersion: Constants.expoConfig?.version,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.root}>
        <Text style={styles.wordmark}>ZENITH</Text>
        <Text style={styles.message}>Something went wrong.</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={this.handleReset}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: "#03060b",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             16,
    paddingHorizontal: 32,
  },
  wordmark: {
    color:         "rgba(255,255,255,0.9)",
    fontSize:      22,
    fontFamily:    FONTS.bold,
    letterSpacing: 6,
  },
  message: {
    color:      "rgba(255,255,255,0.5)",
    fontSize:   14,
    fontFamily: FONTS.regular,
    textAlign:  "center",
  },
  button: {
    marginTop:         8,
    paddingVertical:   12,
    paddingHorizontal: 24,
    borderRadius:      8,
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.18)",
  },
  buttonText: {
    color:      "#f8fafc",
    fontSize:   13,
    fontFamily: FONTS.semiBold,
  },
});
