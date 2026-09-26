const fs = require("fs");
const path = require("path");

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// Metro builds its file map before nativewind writes its compiled CSS, so on a
// cold cache the first bundle fails with "Failed to get the SHA-1 for
// .../react-native-css-interop/.cache/web.css".
const cacheDir = path.join(
  path.dirname(require.resolve("react-native-css-interop/package.json")),
  ".cache",
);
fs.mkdirSync(cacheDir, { recursive: true });
for (const platform of ["web", "native"]) {
  const file = path.join(cacheDir, `${platform}.css`);
  if (!fs.existsSync(file)) fs.writeFileSync(file, "");
}

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, {
  input: "./global.css",
  forceWriteFileSystem: true,
});
