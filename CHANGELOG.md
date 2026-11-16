# Changelog

All notable changes to Hinto are documented here. Versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed
- Pin screen now notices when the phone is offline: it warns that map tiles may
  not load, skips reverse geocoding instead of leaving the name on a spinner, and
  keeps the pin/coordinate/save paths working.

## [0.5.0] - 2026-11-16

### Changed
- Place form: the side preview tile is gone (it misaligned the Name field),
  icons use a measured four-column grid so every tile is identical, and the
  Name field owns the coordinates as its hint.
- Ionicon glyphs use an exact line height, removing Android font padding that
  made them sit low inside tiles and buttons.
- Duplicate confirmation only runs when creating a place; editing never asks.
- Place edit screen drops the Duplicate button and moves Delete into a `⋯`
  header menu; the journey screen's `⋯` holds Journey options, Save this
  destination and End journey, with End no longer occupying the footer.
- Project root holds only `AGENTS.md`, `CHANGELOG.md`, `Design.md` and a
  project-specific `README.md`; the historical spec, plan and wireframes moved
  to `docs/archive/`.
- Pin destination rebuilt around the map: full-bleed MapLibre view with a
  floating back/title header, a fixed centre pin that reports the map centre on
  every gesture, a "My location" FAB, and a bottom sheet with an editable
  suggested name, live reverse geocoding and one primary action per intent
  ("Save this place" from Places, "Use this point" from journey setup).
  Coordinates live inside the sheet instead of replacing the map.

### Changed
- Home guide mascot appears beside the greeting at 64 dp, swapping to the small
  alert avatar when the status line is showing; the next-stop card dropped its
  eyebrow label (name and CTA carry it) and always has a useful meta line
  (“alarm at 500 m” before the first GPS fix, distance once known).
- Home filled out for the common case: saved places are now a 2-column grid of
  tall cards (icon, wrapping name, category · alarm distance) with a dashed
  “Add a place” tile, so one saved place no longer reads as a lonely row.
- The three separate permission/battery strips became one **Alarm readiness**
  card that shows “Ready to wake you” when everything is granted, or the first
  three blockers with a Fix link.

### Changed
- Home split into `components/home/*` cards (next stop, readiness, saved grid,
  active journey, recent list), shrinking the screen from 867 to 514 lines.
- The layout-utility migration now covers every screen with layout styles:
  destination pin, place form, onboarding shell and the remaining Home rows.
- `Box` accepts `onPress`, so a utility row can be tappable without a wrapper.
- Layout utilities adopted across the main screens: Home header/next-stop/hero/
  readiness, place detail, journey detail and setup, alarm, history list and
  detail, settings, sound, diagnostics and onboarding steps now express spacing
  and alignment as props instead of one-off `StyleSheet` entries.

### Added
- `components/ui/layout.tsx`: Tailwind-like `Box`, `Stack`, `Row` and `Spacer`
  utilities over the spacing, radius and palette tokens (`gap="three"`, `p="four"`,
  `bg="backgroundElement"`). Place detail's view is the first adopter.

### Fixed
- Tapping a saved place on Home opened journey setup and could leave a record in
  History. Saved tiles now open the place view; only explicit start actions open
  setup.
- Abandoning journey setup deletes the prepared draft row (cascading its alert
  rules) instead of saving it as a `cancelled` journey.

### Changed
- Place form coordinates moved into a single compact disclosure row that shows the
  saved pair inline and is collapsed by default, instead of a ghost button with
  two large fields always open for saved places.
- Place view keeps a full-width **Start journey** in the footer; **Edit** moved into
  the header `⋯` menu alongside Delete (and disappears while editing).
- Place detail is now a read-only **view** by default: place icon, name, category,
  alert distance and coordinates plus the trips record, with a sticky footer of
  **Edit** and **Start journey**. Editing is a deliberate mode with **Cancel** and
  **Save** in the same footer; Save reads “Saved” and is disabled until the draft
  differs. Back or Cancel with unsaved edits asks before discarding. Start journey
  can no longer run against stale values while a draft is open.
- `Screen` accepts `onBack` so a screen can intercept the header chevron.
- `PlaceForm` exposes its save action and status through a ref so actions can live
  in a sticky footer.

### Added
- Place detail shows **Trips here**: trip count, average journey time and how
  long ago the last trip ended, plus the five most recent trips (completed,
  interrupted or cancelled) linking straight to their journey record.
- `listJourneys` accepts a `placeId` filter so per-place history is queried in
  SQL instead of being filtered in the screen.
- Home “Your next stop” card: the closest saved place (favourite first) now leads
  the page as a bordered card with a 56 dp icon, 22 px name, distance and a
  Start journey button; the old small row in the header is gone. This is the
  state most people see, so Home is visibly different even with no journey
  running.
- Home hero rule: with no saved places the search card is replaced by a mascot
  hero (“Make Hinto yours”, Add a place / Drop a pin); while a journey is active
  the search collapses to a one-line pill so the journey card is the only focal
  point.
- Mascot system: expressions (`happy`, `sleepy`, `thinking`, `surprised`,
  `worried`, `annoyed`), a size ladder (`inline` 36 → `full` 240) and one mascot
  per screen. Appearances now: Home hero, Home status line, interrupted card,
  empty Places/History, onboarding (welcome, how-it-works, battery, ready),
  completed-journey celebration and the alarm screen.
- Home header now greets by time of day (Good morning / afternoon / evening)
  and surfaces the next saved place: favourite first, otherwise the closest to
  the last GPS fix, otherwise the first saved place. Tapping it opens journey
  setup for that place; with no places it explains that saved stops appear here.
- Home guide card: the mascot appears with one contextual line — “Make Hinto
  yours” when no places are saved (with an Add action), “You are offline” when
  the network drops, and “Looking for a signal” while GPS is waiting. It only
  renders when there is something to say.
- Shared UI primitives: `ChipRow`, `FormSection`, `IconGrid`, `ColorSwatches`,
  `SegmentedControl`, `MoreMenu` and `BottomSheet`, so filters, tags, radius
  chips, the icon grid, sheets and destructive actions come from one place.
- `usePlaceForm` hook owns the place draft, validation, duplicate guard and
  persistence; `PlaceForm` is now layout only.
- Pin sheet carries a Journey/Place segmented control when the screen is opened
  without an intent, and Destination search routes its pin button explicitly.
- Destination search offers “Save a place” as a secondary action.
- Place colour selector: five soft tints plus “Default”, stored in
  `places.color` and shown behind the icon everywhere.
- Destination search now has an empty state (navigator pose, “Nothing saved
  yet”) when there are no saved places and no query, instead of a blank page.
- Status bar follows the theme, so the clock and battery are dark on the light
  background instead of white-on-cream.
- Places filters, the new-place tag picker and the alert-distance chips are
  single scrolling rows instead of wrapping onto a second line.
- Place form: uppercase field labels, four-column icon grid with an amber fill
  and check badge on the selected icon, and the preview shows the icon instead of
  printing its name ("locatio…") as text.
- Header and footer spacing: taller header with a 44 dp back target, and sticky
  footers clear the gesture bar; "Center on me" and "Enter coordinates" are now
  "My location" and "Coordinates" so they fit on one line.
- Destination search puts the Photon/OpenStreetMap credit in the footer instead
  of stranded in the middle of an empty screen.
- Reverse geocoding drops plus codes (`WCJC+6F7`), so a pinned place suggests a
  street or district instead of a code, and toggles use the amber track.
- Mascot artwork in the UI via `components/ui/mascot.tsx`: the friendly guide
  greets onboarding, the navigator fills Home's empty places card, the on-the-go
  pose stands on the active journey card and empty Places, Alert Mode appears
  when a journey was interrupted, and Ready to Go fills empty History.
- Hinto wordmark in the Home header via `Screen logo`, with separate
  `logo-light.png` (navy) and `logo-dark.png` (cream) exports so no background
  plate is needed; mascot poses and expressions copied to `assets/mascot/`.
- Floating pill bottom navigation with a filled `accentSoft` icon slot on the
  active tab; labels sit inside the bar with no overlap.
- Ionicons icon set (`@expo/vector-icons`) behind `components/ui/icon.tsx`;
  place icons are now icon names with a one-time emoji migration, and every
  interface glyph (search, chevrons, checks, add, tabs, empty states) uses it.
- Custom bottom navigation: amber pill on the active tab, filled icon, warm
  surface and hairline border instead of the plain native bar.
- The app now defaults to light mode; `appearance` still accepts `system`.
- Theme preference (`system` / `light` / `dark`) stored in settings and applied
  by `useTheme`; the Home header swaps its settings button for a sun/moon
  toggle, and Settings → Display exposes all three.
- Warm Daylight design system in `constants/theme.ts`: the documented amber,
  coral, sage and warm-paper palette in light mode with a matching warm-night
  dark palette, plus `accentSoft`/`accentBorder` tokens for the rare saturated
  surface.
- Plus Jakarta Sans (400–800) loaded in the root layout, resolved by weight in
  `ThemedText` and used by text inputs; the native splash stays up until the
  fonts are ready.

### Changed
- Place icon picker uses the outline twins, so the grid reads lighter than the
  filled icons on tiles; the selected one stays filled.
- Tabs no longer use the PNG icon assets or `NativeTabs`; the JS bar makes the
  active destination legible at a glance.
- Home is no longer a flat list: an amber hero search card, two-column saved
  place tiles with icons and alert radius, an amber-tinted active-journey card
  with amber progress, a pin-led empty state, and an icon on recent rows.
- Amber replaces the old blue accents on onboarding marks, the journey progress
  bar, the map pin and the tracking notification colour.
- `Desig.md` now records the shipped status, the warm-night palette, the emoji
  icon policy, the Home composition, the mascot direction and the saved-place
  flow.

### Fixed
- Recent destinations no longer include prepared or cancelled journeys. Journey
  setup writes a draft row on mount and the recents query counted every row, so
  merely opening setup (or dropping a pin on the way to one) left a destination
  in Home's RECENT list without a journey ever starting. Existing ghost rows are
  hidden by the query.

### Removed
- Duplicate mascot placements on Home: the guide card, the pose on the active
  journey card and the mascot inside the empty Saved card. Each screen now shows
  at most one mascot, only when there is something to explain or celebrate.

## [0.4.0] - 2026-11-14

### Added
- Alarm sound from the phone: Settings → Alarm sound can pick any audio file,
  which is copied into Hinto's storage and played by the alarm loop, previews,
  snooze and "wake now", with replace and remove. The notification channel keeps
  the bundled classic sound because Android channels only accept bundled
  resources, and a missing file falls back to classic.

### Technical
- New: `src/modules/alarm/custom-sound.ts` (system picker, copy into
  `documentDirectory/alarm-sounds`, delete).
- Settings key `custom_alarm_uri` (`string | null`, default null) and
  `AlarmSoundId` gains `custom`; the alarm request carries the URI through
  delivery, snooze and wake-now.
- Tests: 143 passing across 17 suites — lint and typecheck clean.

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
