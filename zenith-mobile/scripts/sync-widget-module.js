const fs = require("fs");
const path = require("path");

// react-native-widget-extension expects `expo prebuild` to copy the module and
// attribute sources into its own pod folder, where the podspec's **/*.swift glob
// picks them up. This project commits ios/, so prebuild never runs on EAS and the
// pod would compile with no Swift sources — leaving ExpoModulesProvider.swift with
// an `import ReactNativeWidgetExtension` that resolves to nothing.
const SOURCE_DIRECTORY = path.join(__dirname, "..", "Widget-Extension");
const POD_DIRECTORY = path.join(
  __dirname,
  "..",
  "node_modules",
  "react-native-widget-extension",
  "ios",
);
const SOURCE_FILES = ["Module.swift", "Attributes.swift"];

function syncWidgetModuleSources() {
  if (!fs.existsSync(POD_DIRECTORY)) {
    console.log("[widget-module] pod directory absent, skipping");
    return;
  }

  for (const fileName of SOURCE_FILES) {
    const sourcePath = path.join(SOURCE_DIRECTORY, fileName);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`[widget-module] missing required source: ${sourcePath}`);
    }
    fs.copyFileSync(sourcePath, path.join(POD_DIRECTORY, fileName));
    console.log(`[widget-module] copied ${fileName}`);
  }
}

syncWidgetModuleSources();
