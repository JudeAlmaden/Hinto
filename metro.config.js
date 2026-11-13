// Learn more: https://docs.expo.dev/guides/customizing-metro/
//
// The web build needs two things from Metro (expo-sqlite "Web setup"):
//   1. `wasm` in `assetExts`, so `expo-sqlite/web/worker.ts` can resolve its
//      bundled `wa-sqlite.wasm` (this project has no native `ios/`/`android/`
//      projects, and `web.output` is `server`, so web is bundled on start).
//   2. COEP/COOP headers, so the web worker can use SharedArrayBuffer.
//
// Android is the only release target (plan D13/D16); web exists so the dev
// server and a plain browser visit still render the "Android build" notice.

const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');

config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    middleware(req, res, next);
  };
};

module.exports = config;
