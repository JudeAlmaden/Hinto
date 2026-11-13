# Changelog

All notable changes to Hinto are documented here. Versions follow
[Semantic Versioning](https://semver.org/).

## [0.0.0] - 2026-11-13

### Added
- Initial Expo / React Native scaffold for Hinto, the offline-first GPS
  destination alarm (`Gising bago lumagpas.`).
- Expo Router file-based navigation with a tab layout (`src/app/_layout.tsx`,
  `index.tsx`, `explore.tsx`).
- Themed UI primitives: `themed-text`, `themed-view`, `hint-row`,
  `collapsible`, `external-link`, `web-badge`, plus platform-specific
  `animated-icon` and `app-tabs` variants for native and web.
- Light/dark theming via `src/constants/theme.ts` and the
  `use-color-scheme` / `use-theme` hooks.
- App configuration in `app.json`: Android and web icons, splash screen,
  typed routes and React Compiler experiments, EAS project ID.
- Brand assets (icon, adaptive icon layers, splash, favicon, tutorial
  artwork) and the product/technical spec in `Hinto-spec.md`.
- `AGENTS.md` documenting Expo SDK conventions plus the commit and
  versioning workflow, and the `.agents/RECENT_CHANGES.md` scratch pad.

### Changed
- Project version starts at `0.0.0` in `package.json` and `app.json`.

### Technical
- Modified: `package.json`, `app.json`, `.gitignore`
- New: `.github/workflows/ci.yml`, `CHANGELOG.md`,
  `.agents/RECENT_CHANGES.md`
- Deleted: none
- Tests: no test suite yet — `npm run lint` clean
