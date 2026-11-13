# Changelog

All notable changes to Hinto are documented here. Versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Android-first project foundations: `app.config.ts` replaces `app.json` with
  background/foreground-service location, notification channels and bundled
  sounds, `expo-audio` background playback, `expo-maps` and a Google Maps key
  read from `GOOGLE_MAPS_API_KEY`.
- Four-tab Expo Router shell — Home, Places, History and Settings — on a root
  stack, with a web-only tab bar so `expo start --web` still runs.
- Domain module skeletons for places, journeys, geofence, location, alarm,
  permissions, battery, maps, history and diagnostics, carrying the spec §10
  types.
- `src/constants/alarms.ts`: radius presets (5 km/3 km/1 km/500 m), 100 m–20 km
  bounds, the 50 m accuracy gate and the freshness thresholds, with pure
  helpers for each.
- `src/constants/strings.ts`: every user-facing string in one flat object.
- Local diagnostics stub plus a root error boundary that records truncated
  crash breadcrumbs and an `app_started` session marker.
- Generated placeholder assets: notification, service and large icons, four tab
  icons at 1x/2x/3x, and three loopable alarm sounds, with licence provenance.
- Jest (`jest-expo`) with 11 unit tests over radius bounds, the accuracy gate
  and sample freshness.
- Planning documents: `IMPLEMENTATION_PLAN.md`, `WIREFRAMES.md` and
  `docs/device-test-log.md`.
- Local SQLite data layer: the spec §10 schema with a forward-only migration
  registry keyed on `PRAGMA user_version`, plus the multi-stage warning tables
  (`journey_alert_rules`, `journey_alerts.stage_index`/`accuracy_m`) and the
  metrics columns (`entered_radius_at`, `start_battery_pct`, `end_battery_pct`).
- Database client with WAL, foreign keys, an integrity check, a transactional
  migration, a subscribable storage snapshot, `retryStorage()` and a
  user-initiated `resetStorage()` that keeps the old file as
  `hinto.db.corrupt-<timestamp>`.
- Repositories for places (search, favourites-first ordering, validated CRUD),
  journeys (destination snapshot, alert rules, active-journey lookup, alert
  dismiss/snooze), settings and diagnostics, all written against the
  driver-agnostic `SqlDatabase` interface.
- Typed settings accessor: the closed D5 key set as a Zod schema with defaults,
  per-key fallback for invalid stored values, and JSON encoding in the
  `settings` table.
- Persisted diagnostics: events captured by the error boundary and session
  marker are written to `diagnostic_events`, trimmed to a 500-row retention.
- Development-only fixtures (Home/Work/Terminal) seeded in `__DEV__` builds when
  no places exist yet.
- 24 further unit tests over the settings contract, place mapping/validation and
  the migration registry (35 in total).

### Changed
- CI now lints, bundles, typechecks and tests; the build runs before typecheck
  because it generates the git-ignored `expo-env.d.ts`.
- Storage uses one lazily opened handle per process instead of a React
  `SQLiteProvider`, so the Phase 5 background task shares the same connection
  and migration; the root layout opens it once on native and skips it on web.
- Jest resolves the `@/` alias so tests can import application modules.
- Web renders an "Android build" notice instead of initialising storage
  (Android-only release scope).

### Removed
- `app.json` (superseded by `app.config.ts`), the demo `explore` screen and its
  showcase components (`external-link`, `hint-row`, `web-badge`, `collapsible`),
  and the demo `explore` tab icons.

### Fixed
- `npx tsc --noEmit` failures on CSS module imports and the web tab bar ref
  typing, via committed declarations and a simpler web shell.
- Missing `expo-asset` peer dependency reported by `expo-doctor`.
- Jest packages installed as runtime dependencies by `expo install`.

### Technical
- Modified: `package.json`, `package-lock.json`, `.github/workflows/ci.yml`,
  `src/app/_layout.tsx`, `src/components/app-tabs.tsx`,
  `src/components/app-tabs.web.tsx`, `src/modules/diagnostics/index.ts`,
  `assets/images/tabIcons/home.png`
- New: `app.config.ts`, `types/css.d.ts`, `src/constants/{alarms,strings}.ts`,
  `src/components/{error-boundary,placeholder-screen}.tsx`,
  `src/app/(tabs)/*`, `src/modules/*`, `src/constants/__tests__/alarms.test.ts`,
  `src/db/{client,migrate,seed,id,types}.ts`, `src/db/migrations/*`,
  `src/modules/{places,journeys,settings,diagnostics}/repository.ts`,
  `src/modules/settings/schema.ts`, `scripts/generate-assets.mjs`,
  `assets/notifications/*`, `assets/sounds/*`, `docs/device-test-log.md`,
  `IMPLEMENTATION_PLAN.md`, `WIREFRAMES.md`
- Deleted: `app.json`, `src/app/index.tsx`, `src/app/explore.tsx`,
  `src/components/{external-link,hint-row,web-badge}.tsx`,
  `src/components/ui/collapsible.tsx`
- Dependency: added `expo-file-system` (reset backup) and `expo-asset`
  (peer of `expo-audio`).
- Tests: 35 passing. Repository SQL was exercised locally against a real SQLite
  engine through a throw-away `node:sqlite` harness (deleted afterwards), so CI
  does not cover it yet; device behaviour with `expo-sqlite` is unverified.
- Tests: 11 passing — lint, typecheck, `expo-doctor` (20/20) and the Android
  export all clean. Device boot not yet verified.

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
