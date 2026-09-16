const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Ensure the react-native-css-interop cache directory is watched
config.watchFolders = [
  ...(config.watchFolders || []),
  path.join(__dirname, "node_modules", "react-native-css-interop", ".cache"),
];

// Disable cache for problematic modules
config.cacheStores = [];
config.resetCache = true;

module.exports = withNativeWind(config, {
  input: "./global.css",
  forceWriteFileSystem: true,
});
