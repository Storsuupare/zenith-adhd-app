const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Redirect react-dom imports to our stub.
// Clerk's web package references react-dom for portals — unused on mobile.
config.resolver.extraNodeModules = {
  "react-dom": path.resolve(__dirname, "react-dom-stub.js"),
};

module.exports = config;
