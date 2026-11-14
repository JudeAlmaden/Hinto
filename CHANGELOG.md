# Changelog

All notable changes to Hinto are documented here. Versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.3.0] - 2026-11-14

### Added
- Saving a place is now a flow, not a form: icon and name preview, tag chips, a
  12-emoji icon picker (defaults from the tag), an explained alert radius,
  collapsible coordinates, and a "Saved to Places" banner with **Start journey**
  on the saved place.
- Entry points: the pin picker prefills a geocoded name, search results can be
  long-pressed to save, and journey options offer "Save this destination".
- Duplicate guard: the same name within 50 m asks before saving a second copy.
- A one-time dev cleanup deletes the seeded demo places (Home/Work/Terminal)
  without touching real places; the seeding itself is gone.

### Changed
- Place rows show their tag instead of the raw category key and "Alerts at
  1.0 km" instead of an unlabelled radius, and use the saved icon when set.
- "Add a place" (Places +, the empty state and Home) now opens the map pin
  picker, where saving to Places is the primary action; the form only opens with
  a real point attached.

### Fixed
- Blank latitude/longitude fields no longer parse as `0`, which showed
  `0.0000, 0.0000` and would have saved a place at 0,0.

### Removed
- The development-only Home/Work/Terminal places and the seeding that created
  them; a one-time cleanup removes the rows left by older builds.

### Technical
- New: `src/modules/places/icons.ts`, `src/modules/places/duplicates.ts`,
  `src/modules/maps/label.ts`, `src/db/cleanup.ts`.
- Removed: `src/db/seed.ts`.
- `place-form.tsx` gained the tag/icon/duplicate flow and `onSaved(placeId)`;
  `PlaceCard`/`PlaceIcon` now take the stored icon.
- Tests: 142 passing across 17 suites — lint and typecheck clean.

## [0.2.1] - 2026-11-14

### Added
- "Save this place" on the pin picker: opens the place form with the dropped
  point already in the coordinate fields, so a pin can be kept and reused.

### Fixed
- The 5-second refresh no longer blanks Home and Journey to a loading state on
  every poll; the last settled data stays on screen while a refresh is in
  flight, which was the visible flicker.
- Alerting no longer requires a fix better than 50 m: firing needs only the
  worst-case position (`distance + accuracy`) inside the radius, so a phone
  reporting ±100 m can still alert 120 m from a 5 km stop. The 50 m cap remains
  for overshoot estimates (D14 amended).
- The EAS prebuild failure: Android resource names reject hyphens, so the
  bundled sounds are `alarm_classic.wav`, `alarm_chime.wav` and
  `alarm_beep.wav`, with the config plugin, channel sound and asset generator
  updated to match.
- "last seen 54s ago ago" is now "Last seen 54s ago".

### Changed
- `npm run android` / `npm run ios` now run `expo run:*`, so they open the
  development build instead of Expo Go.

### Technical
- `app.config.ts`: the new EAS project id linked by `eas init`.
- Assets: renamed `assets/sounds/alarm_{classic,chime,beep}.wav`; the old names
  blocked `expo prebuild` with "Resource name is not valid".
- Tests: 132 passing; lint and typecheck clean.

## [0.2.0] - 2026-11-14

### Added
- Native, keyless pin picker: MapLibre Native renders OpenStreetMap raster
  tiles, tapping the map drops a `ViewAnnotation` pin, and "Center on me"
  recentres the camera. No API key, no billing account.

### Changed
- The map no longer needs Google Maps: `expo-maps`, its config plugin, the
  Android manifest key and the `googleMapsApiKeyConfigured` flag were removed.
- The picker runs on `@maplibre/maplibre-react-native`, which requires a
  development build (`npx expo run:android` or the `development` EAS profile);
  Expo Go cannot load it.
- `expo-dev-client` is installed so the `development` profile in `eas.json`
  and a local development build work.

### Removed
- `react-native-webview` (the interim Leaflet picker) and the WebView map
  builder it needed.

### Technical
- New: `src/components/pin-map.tsx`; `src/modules/maps/index.ts` now exports
  the OSM tile URL and attribution used by the picker.
- Dependencies: added `@maplibre/maplibre-react-native` and `expo-dev-client`;
  removed `expo-maps` and `react-native-webview`.
- Tests: 130 passing across 14 suites; lint, typecheck and the Android export
  are clean. The map itself cannot be rendered without a development build.

## [0.1.0] - 2026-11-13

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
- Saved places: list with search, category filters and favourites first, plus
  create, edit, duplicate, delete and favourite, backed by a Zustand cache over
  SQLite.
- Destination selection: Photon search behind one module (350 ms debounce,
  1 request/second, 24 h cache, 10-result cap, OpenStreetMap attribution),
  offline degradation to saved places, and a pin picker with coordinate entry
  when no Google Maps key is configured.
- Geofence engine: haversine and segment distance, a pure per-sample trigger
  state machine (50 m accuracy gate, one alert per stage, innermost stage,
  overshoot estimates, D14 freshness) and the adaptive policy table.
- Journey lifecycle: `prepared → active → paused → triggered → completed |
  cancelled | interrupted`, destination snapshots, alert-rule rewriting and the
  D9 metrics inputs.
- Background tracking: foreground-service location task, adaptive policy,
  watchdog (60 s waiting, 3 min stale, 10 min interrupted), boot/unclean-exit
  recovery prompt and the D7 battery-restriction heuristic.
- Alarm experience: an immediate max-importance `alarm-v1` notification plus a
  looping `expo-audio` alarm with lock-screen controls and a 3-minute ceiling,
  vibration, hold-to-confirm end, snooze with a real deadline, silence with
  confirmation, a notification deep link and a test alarm.
- Screens for Home (readiness, active journey, saved/recent), journey setup,
  active journey, journey options, alarm, alarm test, history list/detail,
  settings, sound picker, permissions, diagnostics and the eight-screen
  onboarding flow.
- Local D9 metrics over a 30-day window and a diagnostics export that carries
  aggregates only.
- `eas.json` development, preview and production Android profiles.
- 95 further unit tests (130 in total): trigger, distance, policy, battery
  heuristic, watchdog, formatting, history projection, metrics, search parsing
  and the D17 offline run-path guard.

### Changed
- Notification channels are versioned (`journey-v1`, `alarm-v1`) and the config's
  default channel now matches the runtime id.
- The pin picker reads a boolean `googleMapsApiKeyConfigured` from app config
  instead of the API key itself.
- CI now lints, bundles, typechecks and tests; the build runs before typecheck
  because it generates the git-ignored `expo-env.d.ts`.
- Storage uses one lazily opened handle per process instead of a React
  `SQLiteProvider`, so the Phase 5 background task shares the same connection
  and migration; the root layout opens it once on native and skips it on web.
- Jest resolves the `@/` alias so tests can import application modules.
- Web renders an "Android build" notice instead of initialising storage
  (Android-only release scope).
- Metro keeps `wasm` as an asset extension and sets COEP/COOP headers so the
  `expo-sqlite` web worker loads on the dev server.

### Removed
- `app.json` (superseded by `app.config.ts`) and the demo screen set:
  `src/app/index.tsx`, `src/app/explore.tsx`,
  `src/components/{external-link,hint-row,web-badge}.tsx`,
  `src/components/ui/collapsible.tsx`, and the demo `explore` tab icons.
- `src/components/placeholder-screen.tsx`, now that every tab has a real screen.

### Fixed
- `npx tsc --noEmit` failures on CSS module imports and the web tab bar ref
  typing, via committed declarations and a simpler web shell.
- Web tab bar `Link` href typing and sub-kilometre distance rounding that could
  print "1000 m".
- Missing `expo-asset` peer dependency reported by `expo-doctor`.
- Jest packages installed as runtime dependencies by `expo install`.

### Technical
- Modified: `package.json`, `package-lock.json`, `.github/workflows/ci.yml`,
  `app.config.ts`, `src/app/_layout.tsx`, `src/app/(tabs)/*`,
  `src/components/app-tabs.web.tsx`, `src/constants/{strings,theme}.ts`,
  `src/modules/{alarm,geofence,journeys,location,places,settings}/index.ts`,
  `src/modules/journeys/repository.ts`, `src/modules/settings/schema.ts`.
- New: `app.config.ts`, `metro.config.js`, `eas.json`, `types/{css.d.ts,
  node-shims.d.ts}`, `src/constants/alarms.ts`,
  `src/components/{error-boundary,place-form,permission-step,onboarding-shell}.tsx`,
  `src/components/ui/*`, `src/hooks/*`, `src/app/{place,destination,journey,
  history,settings,onboarding}/*`, `src/app/{alarm,alarm-test}.tsx`,
  `src/modules/{places,journeys,geofence,location,alarm,battery,permissions,
  stats,history,diagnostics}/*`, `src/db/*`, `src/db/migrations/*`,
  `scripts/generate-assets.mjs`, `assets/{notifications,sounds}/*`,
  `IMPLEMENTATION_PLAN.md`, `WIREFRAMES.md`, `docs/device-test-log.md`.
- Deleted: `app.json`, `src/app/index.tsx`, `src/app/explore.tsx`,
  `src/components/{external-link,hint-row,web-badge}.tsx`,
  `src/components/ui/collapsible.tsx`, `src/components/placeholder-screen.tsx`.
- Dependencies: added `expo-location`, `expo-task-manager`, `expo-notifications`,
  `expo-audio`, `expo-battery`, `expo-device`, `expo-intent-launcher`,
  `expo-maps`, `@react-native-community/netinfo`, `expo-file-system`,
  `expo-asset`, `zod` and `zustand`; added `jest`, `jest-expo`, `@types/jest`.
- Tests: 130 passing across 14 suites. Repository SQL was exercised locally
  against a real SQLite engine through a throw-away `node:sqlite` harness
  (deleted afterwards), so CI does not cover it; lint, typecheck, `expo-doctor`
  (20/20) and the Android export are clean.
- Known limitations: no physical-device verification yet (screen-locked
  audibility, 30-minute screen-off tracking, real-travel alerts); the exact
  Android `BOOT_COMPLETED` receiver from D2 is not built, so recovery comes from
  the freshness/unclean-exit check instead; Play Store declarations and listing
  work are outstanding.

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
