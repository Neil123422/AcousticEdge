const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Disable cache for problematic modules
config.cacheStores = [];
config.resetCache = true;

module.exports = withNativeWind(config, {
  input: "./global.css",
  forceWriteFileSystem: true,
});
