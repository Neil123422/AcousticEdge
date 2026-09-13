process.env.EXPO_PUBLIC_API_BASE_URL = "https://yourself-crown-applying-refurbished.trycloudflare.com";
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const Metro = require("metro");

process.on('unhandledRejection', (e)=>{console.error('UNHANDLED:\n', e&&e.stack||e);process.exit(1)});

(async () => {
  const baseConfig = await getDefaultConfig(__dirname, {
    mode: "development",
    minify: false,
  });
  const config = withNativeWind(baseConfig, {
    input: "./global.css",
    forceWriteFileSystem: true,
  });

  try {
    const result = await Metro.runBuild(config, {
      entry: require.resolve("expo-router/entry").replace(/\\/g, "/"),
      out: path.join(process.env.TEMP || "/tmp", "metro-test.bundle"),
      platform: "ios",
      dev: true,
      minify: false,
    });
    console.log("BUILD OK", result && result.code ? result.code.length : "?");
  } catch (e) {
    console.error("BUILD FAILED:");
    console.error(e && e.stack ? e.stack : String(e));
    process.exit(1);
  }
})();