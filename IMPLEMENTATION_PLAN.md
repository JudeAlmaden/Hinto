# Hinto — Implementation Plan

Derived from `Hinto-spec.md` (v1.0, MVP specification). This plan sequences the
spec into shippable phases, each with a concrete file layout, the packages it
needs, and a definition of done. It does **not** re-decide product
requirements — where the spec leaves a question open, it is listed in
[Phase 10](#phase-10--release-readiness) and must be answered before that phase
closes.

**Baseline:** Expo SDK 58 (`expo ~58.0.25`), React Native 0.88, React 19.3,
Expo Router with typed routes and React Compiler enabled, TypeScript strict,
version `0.0.0` at commit `ddb28e2`.

**Ground rules**

- The alarm engine must never depend on map rendering, network, search
  providers, auth, or sync (spec §9).
- SQLite is the source of truth for persisted data; Zustand holds UI/session
  state only.
- Native config lives in `app.config.ts` + config plugins — never in generated
  `ios/` / `android/` folders (CNG).
- Every phase ends with `npm run lint` and `npm run build` passing, plus an
  entry in `.agents/RECENT_CHANGES.md` and a CHANGELOG bump when it lands.
- Anything touching background execution is validated on a **physical Android
  device with a development build**, never Expo Go (spec §2, §13).

---

## Decision register

Resolved 2026-11-13. These supersede the matching open items in the audit
section at the bottom of this file; the rationale there is kept for context.

### D1 — Alarm delivery: notification-first, audio layered on top

The two halves have different reliability characteristics, so neither is
allowed to be the single point of failure.

- **Robust path (OS-delivered):** the background task posts an *immediate*
notification — `scheduleNotificationAsync({ trigger: { channelId: 'alarm' } })`.
It is not a wall-clock schedule, so `delivery` and exact-alarm permissions do
not apply (`NotificationDelivery` only selects an `AlarmManager` API for
scheduled triggers — using `'alarmClock'` here would be wrong). Delivery
behaviour comes from the channel: `importance: MAX`, the bundled `sound`,
`enableVibrate: true` + `vibrationPattern`, `bypassDnd: true` (where the user
permits it), `audioAttributes: { usage: ALARM, contentType: SONIFICATION }`,
and `lockscreenVisibility: PUBLIC`. Once posted, the OS plays it even if JS is
suspended a moment later — that is the robustness this tier buys. It still
needs the task to run in order to be posted at all; it is not JS-free.
- **Looping path (ours):** `expo-audio` with the config plugin option
`enableBackgroundPlayback: true` — the docs state this declares
`FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK` and the
`AudioControlsService` media foreground service, and is required for sustained
background playback. Runtime config:
`setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' })`
plus `player.setActiveForLockScreen(true, { title: 'Hinto alarm', … })`;
without lock-screen controls Android stops playback after ~3 minutes.
- **`playsInSilentMode: true` is deliberate and must not be relaxed.** On
Android, `false` suppresses playback when the ringer is silent/vibrate — the
exact situation a sleeping commuter is in.
- **Stopping:** the loop ends on dismiss, snooze or journey end, and falls back
  to the notification alone after **3 minutes** untouched so a phone left in a
  bag does not scream indefinitely. `repeat_until_dismissed` controls the loop,
  not the 3-minute ceiling.
- **Accepted limitation:** Android 12+ may refuse a foreground-service start
from a background context. In that case the notification still sounds and the
audio loop begins when the alarm screen opens — from the notification tap.
Full-screen intents are not used at all, because Android restricts them
(spec §8 says not to assume they are available).
- **Escalation, only if Phase 6's screen-locked device test fails** (blocked
FGS start, or the alarm inaudible with the screen locked): build a minimal
local Expo module `HintoAlarm` owning a `mediaPlayback` FGS that loops a raw
resource on `STREAM_ALARM`. Not in scope unless that test fails. That test —
not a separate spike — is the decision point.

### D2 — Reboot recovery: record and prompt, never quietly resume

- New local Expo module `modules/boot-recovery` exposing a Kotlin
`BroadcastReceiver` for `BOOT_COMPLETED` (`QUICKBOOT_POWERON` for OEMs) and a
JS API `getInterruptedFlag()` / `clearInterruptedFlag()`.
- The receiver does one thing: record that the device restarted while a journey
was active. It does not start tracking, because starting a location service
from a boot receiver is fragile across OEMs and would let the UI claim
"tracking" when nothing runs.
- On launch, an `active` journey plus an interruption flag (or a stale
`last_location_at`) moves the journey to `interrupted` and Home shows
"Tracking stopped when your phone restarted — resume?" with Resume/End.
- This is the behaviour spec §8 asks to implement and test (§14 scenario 12):
recovery is supported and honest, automatic restart is explicitly not promised.
- The module's config plugin declares `RECEIVE_BOOT_COMPLETED` explicitly
instead of inheriting it from `expo-notifications`.
- Stretch only: post the interruption notification from the receiver itself.

### D3 — Maps: `expo-maps` with the Google provider, key from the environment

> **Superseded by D19.** A Google key needs a billing-enabled Cloud project and
> `expo-maps` is absent from Expo Go, so the picker was blocked for anyone
> without a Google account.

- The pin picker is the only map surface. It uses `GoogleMaps.View` from
`expo-maps` (Android-only for Google Maps); tapping the map emits coordinates
(`onMapClick`), which place the marker, and `Use this point` confirms.
- API key lives at `android.config.googleMaps.apiKey`, restricted to the
Android package in Google Cloud. A key must not be committed, so `app.json`
becomes `app.config.ts` reading `process.env.GOOGLE_MAPS_API_KEY` (EAS secret
for builds, local env for dev). This is the only reason to leave static JSON.
- No key configured → the picker degrades to coordinate entry with an
explanatory note, so nobody is blocked locally and CI still bundles.
- iOS would use `AppleMaps.View` (iOS 17+) and stays out until the platform
decision in spec §18 is revisited. MapLibre offline tiles remain post-MVP; the
alarm never depends on tiles.

### D4 — Dismissal: hold-to-confirm on the ending action only

- **I'm awake · End journey** is press-and-hold for 1.5 s while "Prevent
accidental dismissal" is on (default on), a plain tap when off. A progress ring
fills under the finger; releasing early cancels with no side effect.
- **Snooze 5 min** is a single tap — a half-asleep user must not be able to
fail it.
- **Dismiss alarm** (silence now, stay in the journey) is a tap plus a confirm
dialog, because silencing and ending are different intents.
- Hardware back and volume keys never dismiss the alarm; volume keys only
change volume.

### D5 — Settings contract: a key/value table behind one typed accessor

- Table: `settings(key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at
  INTEGER NOT NULL)`. Values are JSON-encoded, so numbers, booleans and strings
  share one column and a new key needs no migration.
- One accessor (`src/modules/settings/schema.ts`): a Zod `AppSettings` schema
  with defaults, `getSettings()` returning a complete object (missing key →
  default), `setSetting()` validating before it writes.
- The MVP key set is closed. Adding a key means adding it here first (schema +
  default) with a CHANGELOG note:

| Key | Type | Default |
| --- | --- | --- |
| `default_radius_m` | number | `1000` |
| `alarm_sound_id` | string | `'classic'` |
| `vibration_enabled` | boolean | `true` |
| `repeat_until_dismissed` | boolean | `true` |
| `snooze_minutes` | number | `5` |
| `require_hold_to_dismiss` | boolean | `true` |
| `battery_saver` | boolean | `false` |
| `distance_unit` | `'km' \| 'mi'` | `'km'` |
| `onboarding_version` | number | `0` (set to `1` on completion) |

- Unknown keys are preserved and ignored (a downgrade must not wipe them); a
  value failing validation falls back to its default and emits
  `settings_invalid_value` diagnostics instead of crashing.
- Distances are stored canonically in metres; `distance_unit` is display-only,
  so presets never drift when the unit changes.
- UI labels map onto keys explicitly (the "Prevent accidental dismissal"
  toggle is `require_hold_to_dismiss`), so copy edits never rename storage.

### D6 — Storage failure: transactional migrations, then an explicit reset

- Each migration runs inside `db.withTransactionAsync()` and bumps
  `PRAGMA user_version` in the same transaction, so a partial migration cannot
  be committed.
- Startup health check: open → `PRAGMA integrity_check` → `PRAGMA user_version`.
  A throw, a corrupt result, or a `user_version` newer than this binary puts the
  app in **storage-unavailable mode** instead of a blank screen: Home shows a
  blocking card with `( Retry )` and `( Reset local data )`, and Places/History
  show the same explanation.
- Reset is always user-initiated and never automatic. It renames the file to
  `hinto.db.corrupt-<timestamp>` (kept so diagnostics can export it), recreates
  an empty database, and requires typing `RESET` in the confirm dialog.
- Retry closes and reopens the handle; the corrupt copy is only produced on
  reset, so a transient lock never costs data.
- Diagnostics shows schema version, integrity result and last open error; events
  `db_open_failed`, `db_migrated`, `db_reset`.

### D7 — Battery-restriction heuristic: cadence gaps, not guesses

- The rule is a pure function (`src/modules/battery/heuristics.ts`) unit-tested
  with synthetic timelines, so it is verifiable without a device:
  - expected interval comes from the active geofence policy's `timeInterval`;
  - a **gap event** is any interval between consecutive samples longer than
    `max(3 × expected, 5 min)`;
  - **restriction suspected** = 2 gap events inside a rolling 15-minute window
    while the journey is `active` **and** location permission is granted —
    permission loss must be reported as permission loss, never as an OEM
    restriction;
  - losing GPS inside a tunnel but still receiving samples is not suspected.
- Effects: `tracking_gap_suspected` diagnostics event, an amber Home hint
  ("Location updates are being delayed — this phone may be restricting
  Hinto"), and Settings → Permissions showing `2 issues`.
- `getProviderStatusAsync().backgroundModeEnabled === false` is surfaced as a
  separate, factual signal rather than folded into the heuristic.
- Thresholds live in one exported constants object so they can be tuned after
  device measurements without touching the state machine.

### D8 — Localization: English-only MVP with centralized copy

- Ship English only: no i18n runtime, no `expo-localization`, no locale routing.
  An unfinished translation layer is worse than none while the copy is still
  changing.
- All user-facing strings live in `src/constants/strings.ts` as one typed flat
  object from Phase 0 — placeholders, never concatenation. A later i18n pass
  becomes a mechanical swap to `expo-localization`, not a hunt through JSX.
- The tagline "Gising bago lumagpas." is brand copy and stays as written; it is
  not a translatable UI string.
- `distance_unit` covers the one genuine regional variance. Revisit localization
  post-MVP (spec §16).

### D9 — Metrics: computed on-device, never uploaded

The spec's success metrics (§17) are answerable from the local database, so the
MVP ships a `stats` repository instead of an analytics SDK.

- Stored inputs (added in Phase 1, no new tables):
  `journeys.entered_radius_at` (first sample inside the radius, from the
evaluator), `journeys.start_battery_pct`, `journeys.end_battery_pct`.
- Derived locally, over a selectable window (default last 30 days):
  - **journey start completion** — `prepared → active` divided by journeys
    created;
  - **alert success rate** — completed journeys with ≥1 alert divided by
    journeys that had a radius;
  - **median alert delay** — median of `triggered_at − entered_radius_at`,
    reported only for journeys where both exist;
  - **missed alerts** — completed journeys whose minimum observed distance was
    ≤ radius but produced no alert;
  - **duplicate alerts** — alerts per journey above the configured stage count;
  - **battery per hour** — derived from start/end percentage, only when both
    are known and the journey lasted ≥15 min (otherwise reported as unknown,
    never guessed);
  - **saved-place reuse** — journeys with a `place_id` divided by all journeys.
- Surfaced in Settings → Diagnostics (D9 block) and included as aggregate
  numbers only in the diagnostics export. No network calls, no third-party
  analytics, no coordinates. Each metric shows `n/a` rather than a number when
  its inputs are missing.

### D10 — Crash reporting: local breadcrumbs, no third-party SDK

- No crash service in the MVP. Sentry-style reporting would need coordinate
scrubbing to satisfy spec §11, and there is no server to receive it.
- A root React error boundary plus a global JS error handler write a
`diagnostic_events` row (`kind = 'crash'`, message, stack hash, app version —
never coordinates), capped at the last 20 and pruned with the rest of the log.
- Unclean-exit detection does **not** rely on code running at process death —
Android may kill the app without any callback, and backgrounding-then-killing
looks identical to a clean exit. Instead it is derived from journey state: on
startup, an `active` journey whose `last_location_at` is older than D14's
10-minute limit (or whose boot flag is set, D2) is recorded as `unclean_exit`
and moved to `interrupted`. A `journey_ended` event is written only on a real
end, so "died mid-journey" is visible in diagnostics.
- Recovery UX stays with the journey model: an `active` journey found after an
unclean exit becomes `interrupted` (same path as D2).
- Revisit third-party reporting post-MVP, with the scrubbing rule written down
before it is added.

### D11 — Device test log: one file, one row per scenario per device

- `docs/device-test-log.md` is created by this plan and filled in per device.
It enumerates all 16 scenarios from spec §14 with the fields §14 asks testers to
record (OS, permission state, battery settings, accuracy, time-to-alert,
audibility, battery before/after, missed/late/duplicate triggers) and a
pass/fail column, so "tested" is inspectable instead of asserted.
- A scenario is only marked pass with a device row; emulator results do not
count (spec §14). Known limitations are listed at the bottom of the file.
- Phase 10 cannot close without this file populated for the matrix.

### D12 — Assets: named contract, produced in Phase 0

| Asset | Path | Spec | Used by |
| --- | --- | --- | --- |
| Notification icon | `assets/notifications/notification-icon.png` | 96×96, white on transparent | `expo-notifications` `icon` |
| Foreground-service icon | `assets/notifications/service-icon.png` | 96×96, white, transparent background | `expo-location` `androidForegroundServiceIcon` |
| Large icon | `assets/notifications/large-icon.png` | 64 dp square, colour | notification `largeIcon` (optional) |
| Alarm sounds | `assets/sounds/alarm-{classic,chime,beep}.(wav\|mp3)` | 5–30 s, seamless loop, peak-normalised | `expo-notifications` `sounds`, `expo-audio` |
| Tab icons | `assets/images/tabIcons/{home,places,history,settings}.png` | 96×96 template images (monochrome, `renderingMode="template"`) | `NativeTabs` `Trigger.Icon` |

- Android renders notification icons as monochrome masks, so a colour asset
shows as a white square — the 96×96 white-on-transparent contract is not
cosmetic.
- Every bundled sound gets a row in `assets/sounds/LICENSE.md` recording source
and licence; nothing ships without provenance.
- Acceptance: icon legible in the status bar at 24 dp, service notification
shows it, and each sound plays from a notification channel on a locked device.

### D13 — Web: out of scope for the MVP

- MVP target is Android (spec §2, §16). Web is not a release target and gets no
feature parity, no SQLite wasm setup, and no background location attempt.
- The template's `.web.tsx` variants stay so `npx expo start --web` does not
crash during development, but the root layout renders an "Hinto is an Android
build" notice on web instead of initialising storage, and CI keeps bundling
`--platform android` only.
- Revisit only after the alarm is proven on devices; decide then whether web is
marketing shell or dropped entirely.

### D14 — Freshness: one set of numbers, used everywhere

The geofence, the watchdog and the UI must not each invent a timeout.

- **Trustworthy sample** = `now − sample.timestamp ≤ max(2 × policy.timeInterval, 45 s)`. Older samples are ignored for triggering (Phase 4) and are not used to close a journey.
- **Waiting for a fix** after **60 s** with no new sample (grey status); **stale** warning at **3 min** (amber, on Home and the journey card); the journey becomes `interrupted` after **10 min** without samples, or immediately on a boot / unclean-exit signal (D2).
- Between 60 s and 10 min nothing may claim "tracking": `last_known_distance_m` keeps the last trustworthy value and the UI shows its age next to it.
- All three numbers live in one exported constants object beside the policy table, and D7's gap threshold derives from the same `timeInterval` basis, so tuning the policy cannot desynchronise the warning states.
- **Accuracy gate:** a fix fires only when `distance + accuracy ≤ radius` —
  "confidently inside", i.e. even the worst-case position is inside. A poor fix
  keeps the journey tracking but never fires an alert, and never counts as the
  `entered_radius_at` sample (D9).
- **Amended 2026-11-14:** the original rule also required `accuracy ≤ 50 m`,
  which on a phone reporting ±100 m disabled the alarm entirely, even 120 m from
  a 5 km stop. The absolute cap now applies only to overshoot estimates, where a
  noisy fix could invent a segment crossing; `ACCURACY_TRUST_M` documents it.
  Alerting still requires the error bound to sit inside the radius.

### D15 — Online place search: Photon behind one interface, fail-soft

- Provider: **Photon** (OSM-based, no API key), called only through `src/modules/places/search.ts` so it can be swapped without touching UI. Rationale: no key and no backend, which matches a no-backend MVP; a commercial provider would mean storing a secret in the app and committing to a quota before the product exists.
- Client policy enforced in that module: 350 ms debounce, minimum 3 characters, 1 request/second ceiling, 10-result cap, 24 h in-memory cache, and visible "Search by Photon · OpenStreetMap" attribution.
- Any error, 3 s timeout or rate-limit response becomes "search unavailable" with the offline copy from the wireframes — never a raw error, and never a blocked journey start.
- No `@tanstack/react-query`: one debounced hook over the module is enough and it keeps Phase 0 dependencies honest.
- Revisit if usage grows; the module boundary is the swap point.

### D16 — Platform: Android-only MVP

- Android is the only target. No iOS builds, no iOS store work, no iOS device
testing, and no feature may be validated "on iOS later" — if it only works on
iOS, it is not done.
- `ios.*` config values (permission strings, background mode) stay in
  `app.config.ts` because they cost nothing, but they are **unvalidated** and
  the plan does not treat them as a supported path. `expo-maps` therefore uses
  `GoogleMaps.View` only; `AppleMaps.View` (iOS 17+) is not wired.
- Rationale is the spec's own recommendation (§18): validate background
  tracking and audible alerts on real Android hardware before widening scope.
- Closes spec §18 question 1.

### D17 — Offline contract: a saved destination is fully self-contained

"Offline once the destination is saved" is a testable invariant, not a slogan.

The invariant: **from the moment a destination is saved or a journey starts,
nothing on the run path performs a network request.** Concretely:

- A journey stores a snapshot — `destination_name_snapshot`, latitude,
  longitude, `radius_m` — plus a nullable `place_id` used only for "reuse"
  metrics. No provider id, no address lookup, no tile fetch, no geocode is ever
  read on the start/track/evaluate/alert path (spec §9's architectural rule).
- **Enforced by a test, not a promise:** a unit/integration test stubs `fetch`
  to throw and drives start → sample → trigger → alert; any network attempt
  fails the test. This is cheap and catches the regression nobody notices.
- Assets are local: bundled alarm sounds (D12), notification/service/tab icons,
  packaged fonts. Nothing is downloaded at alert time.
- **Reverse geocoding is display-only and best-effort.** Android's geocoder is
  a network-backed service on most devices, so pin naming must never block on
  it: the fallback label is `Dropped pin · 14.6760, 121.0437`, and a user-typed
  name always wins. Search results carry `name + coords` the moment they are
  selected, so a saved place never needs Photon again (D15).
- **Time is monotonic.** Staleness, follow-up alerts and snooze deadlines use a
  monotonic clock (`performance.now()`) for intervals with `Date.now()` only for
  wall-clock display, so a manual clock change or DST shift cannot freeze or
  prematurely fire an alert.
- **Where offline genuinely stops:** place search (D15), map tiles (D18), and
  nothing else. The map is not on the journey screen at all — only the pin
  picker uses it — so losing signal mid-journey changes no visible behaviour.
- **Google Play Services is an unvalidated dependency.** On Android,
  `expo-location` uses the fused provider, and the docs expose GMS-specific
  APIs (`enableNetworkProviderAsync`, `getMotionActivityAsync`), so a device
  without GMS is a real risk for a GPS-only alarm. Treat GMS-less devices as
  unsupported until one is tested, and surface `gpsAvailable` /
  `networkAvailable` from `getProviderStatusAsync` in diagnostics so the
  difference between "no GPS" and "no Play Services" is visible.

### D18 — Maps in v1: online pin picker only, no downloadable map data

- No offline tile packs, no download manager, no MapLibre in v1. The spec
  recommends exactly this (§18) and treats maps as optional presentation (§5).
- A destination chosen while online keeps working forever afterwards; a
  destination chosen while offline is entered as coordinates or picked from
  saved places. The pin picker without tiles shows the D19 fallback.
- Closes spec §18 questions 2–3 (and section 5's map strategy) for the MVP.

### D19 — Maps: MapLibre Native with keyless OpenStreetMap raster tiles

- The pin picker uses `@maplibre/maplibre-react-native` (v11) inside the app:
  `Map` with an empty style, one `RasterSource` pointing at
  `https://tile.openstreetmap.org/{z}/{x}/{y}.png` (`tileSize` 256), and a
  `Layer type="raster"`. No provider key, no Google billing, no WebView.
- Tapping the map reads `event.nativeEvent.lngLat` and places a
  `ViewAnnotation` marker; the screen keeps the coordinates, name and
  confirmation flow it already had.
- Attribution stays visible without interaction (`© OpenStreetMap
  contributors` overlay) and the source also carries the attribution string,
  as the OSM tile policy requires. The tile URL is one constant in
  `src/modules/maps/index.ts` so it can be swapped for a paid or self-hosted
  provider before a store release; the public OSM tile server is for light use.
- MapLibre contains native code and is not in Expo Go: the app must run from a
  development build (`npx expo run:android` or the `development` EAS profile).
  That build is required anyway for background location and background audio.
- Tiles are online with the platform HTTP cache; no tile packs or prefetching,
  so D18 still holds and a chosen destination stays self-contained. Manual
  coordinate entry remains the fallback when the map or the network fails.
- Rejected: `expo-maps` (key and billing), `react-native-maps` (Google key on
  Android), Leaflet in a WebView (works keyless but is not a native map and
  halves the performance of pan/zoom).

---

## Phase 0 — Foundations

**Goal:** a project skeleton that can compile the modules the rest of the plan
needs, with no product code yet.

Work:

1. Install SDK-compatible dependencies with `npx expo install` (never a bare
   `npm install` for Expo packages):
   - `expo-location`, `expo-task-manager`, `expo-notifications`,
     `expo-sqlite`, `expo-haptics`, `expo-audio`,
     `@maplibre/maplibre-react-native` (D19), `expo-dev-client` (D19 builds),
     `expo-battery`, `expo-device`, `expo-constants`, `expo-intent-launcher`
     (Android settings deep links), `@react-native-community/netinfo`.
   - `zustand`, `zod` (validation for form input and persisted rows).
   - No data-fetching library — search is one debounced hook (**D15**).
2. Convert `app.json` to `app.config.ts` (D3: the Maps key comes from
   `GOOGLE_MAPS_API_KEY`) and configure plugins:
   - `expo-location` with `isAndroidBackgroundLocationEnabled: true`,
     `isAndroidForegroundServiceEnabled: true`,
     `androidForegroundServiceIcon`, `isIosBackgroundLocationEnabled: true`,
     and the permission strings (the iOS values are retained but unvalidated —
     Android-only per D16).
   - `expo-audio` with `enableBackgroundPlayback: true` (D1) and
     `recordAudioAndroid: false`.
   - `expo-notifications` with `icon`, `color`, `defaultChannel`, and a
     bundled `sounds` array for the alarm tones.
   - `expo-maps` with `requestLocationPermission: true`.
   - The local `boot-recovery` plugin (D2).
   - `android.config.googleMaps.apiKey` from `process.env.GOOGLE_MAPS_API_KEY`.
   - No exact-alarm permission is declared: the alarm is an immediate
     notification, not a wall-clock schedule (D1).
   - Keep `experiments.typedRoutes` and `reactCompiler` on, and keep the EAS
     `projectId`/`owner` fields intact through the conversion.
3. Create the module skeleton from spec §9 as `src/modules/*` — `places`,
   `journeys`, `location`, `geofence`, `alarm`, `permissions`, `battery`,
   `maps`, `history`, `diagnostics`. Each starts with `index.ts` and its types.
4. Replace the starter template's `src/app/(tabs)/` navigation with the four
   spec tabs: Home, Places, History, Settings (moving/retiring the demo
   `explore` screen and its showcase components). Keep
   `AnimatedSplashOverlay` in the root layout — it hides the splash screen, so
   deleting it with the demo leaves the app on a frozen splash.
5. Fix the pre-existing `npx tsc --noEmit` failures (CSS-module declarations,
   `app-tabs.web.tsx` ref typing) and add a typecheck step to CI. The CSS/module
   types come from the generated, git-ignored `expo-env.d.ts`, so CI must
   generate it first: run `npm run build` before typecheck (or generate types
   explicitly) and order the workflow steps accordingly.
6. Add unit-test infrastructure (Jest + `jest-expo`) so the geofence math in
   Phase 4 is testable without a device; wire `npm test` into CI.
7. Create `src/constants/strings.ts` per **D8** — every user-facing string as
   one typed flat object (placeholders, no concatenation) — and a
   `src/constants/alarms.ts` with the radius presets (5 km, 3 km, 1 km, 500 m)
   and min/max bounds, so presets are defined once for UI and validation.
8. Produce the assets from **D12** (notification icon, service icon, large
   icon, four tab icons, three alarm sounds) with licence provenance, and
   reference them from the plugins.
9. Add the root error boundary and global JS error handler per **D10**, plus
   the `app_started` event and journey heartbeat that make unclean exits
   detectable without relying on code running at process death.
10. Gate web per **D13**: root layout renders the "Android build" notice on
    web instead of initialising storage.

**Definition of done:** `npm run lint`, `npm test`, `npx tsc --noEmit` and
`npm run build` pass; app boots to four empty tabs on a device.

---

## Phase 1 — Local data layer

**Goal:** the schema from spec §10, with migrations and typed repositories.

Work:

1. `src/db/client.ts` — `SQLiteProvider` + `onInit` migration runner keyed on
   `PRAGMA user_version` (per SDK 58 docs), `PRAGMA journal_mode = WAL`,
   `PRAGMA foreign_keys = ON`.
2. `src/db/migrations/001_initial.ts` — `places`, `journeys`,
   `journey_alerts`, `settings`, `diagnostic_events` as specced **plus** the
   additions the spec's multi-stage warnings need (see audit B4/B5):
   - `journey_alert_rules(id, journey_id, radius_m, stage_index)` with
     `unique(journey_id, radius_m)` — spec §4.4 allows e.g. 3 km *and* 1 km,
     which a single `radius_m` column cannot express.
   - `journey_alerts.accuracy_m` and `journey_alerts.stage_index`, and a
     documented `alert_type` enum (`primary`, `earlier`, `snooze`).
   - Metrics inputs (**D9**): `journeys.entered_radius_at`,
     `journeys.start_battery_pct`, `journeys.end_battery_pct` (all nullable).
   - `diagnostic_events.kind` covering `journey`, `location`, `trigger`,
     `permission`, `db`, `settings`, `crash`, `session` (**D10**).
   Indices on `journeys(status)`, `journeys(started_at),
   `journey_alerts(journey_id)`, `journey_alert_rules(journey_id)`, and
   `places(is_favorite)`.
3. `src/db/migrations/` — forward-only migration registry; every later phase
   adds a numbered file rather than editing the first.
4. Repositories per module (`places/repository.ts`, `journeys/repository.ts`,
   …) returning domain types, never raw rows. All writes parameterised.
5. `settings/repository.ts` per **D5**: the key/value table plus a Zod
   `AppSettings` schema, with the exact key set and defaults listed in the
   decision register (radius, sound, vibration, repeat, snooze, hold-to-dismiss,
   battery saver, distance unit, onboarding version).
6. Seed a development-only fixture set behind `__DEV__` (never in release
   builds).
7. Storage health and recovery per **D6**: wrap each migration in a
   transaction, run the `integrity_check`/`user_version` startup check, and
   expose a `storageStatus` value (`ok` | `unavailable`) plus `resetDatabase()`
   for the blocking card and diagnostics.

**Definition of done:** a dev screen (or test) can insert/read/update/delete a
place and restart the app with data intact; migration runs exactly once.

---

## Phase 2 — Saved places

**Goal:** spec §4.3 acceptance criteria.

Work:

1. `src/app/(tabs)/places.tsx` — list with search filter, category chips,
   favourites first, empty state.
2. `src/app/place/[id].tsx` — detail/edit: name, category
   (home/school/work/terminal/other), icon, colour, coordinates, default
   radius, favourite toggle; delete with confirmation.
3. `src/app/place/new.tsx` — create flow, reachable from Places and Home.
4. `src/modules/places/store.ts` — Zustand cache hydrated from SQLite; all
   mutations go through the repository then refresh the cache.
5. Duplicate action, plus "used recently" ordering from `journeys`.
6. Validation: name required, lat/lng within range, radius within the
   `MIN_RADIUS_M` / `MAX_RADIUS_M` bounds exported by `src/constants/alarms.ts`
   (100 m–20 km) — the screen never repeats the number.

**Definition of done:** create/edit/favourite/duplicate/delete survive app
restart; a saved place is selectable with airplane mode on.

---

## Phase 3 — Destination selection

**Goal:** get a destination into a journey without maps being load-bearing.

Work:

1. Home search field per **D15**: Photon behind
   `src/modules/places/search.ts`, debounced and rate-limited, cancellable,
   with every failure degrading to the offline copy. The provider is never
   called directly from a screen.
2. Offline degradation: with no connectivity, hide search and surface saved
   places + recent destinations + a clear explanation (spec §4.2).
3. Coordinate entry as an advanced/debug option only.
4. Map pin selection per **D19**: MapLibre `Map` with keyless OSM raster
   tiles, tap to place a `ViewAnnotation` pin, `Use this point` to confirm.
   If tiles fail, saved places and coordinates still work, and offline tile
   packs stay post-MVP (spec §5, §18).
5. Confirmation step showing destination name and coordinates before journey
   start.
6. Offline naming per **D17**: selecting a search result or pinning a point
   captures `name + coordinates` immediately; reverse geocoding only suggests a
   label, the coordinate fallback (`Dropped pin · lat, lng`) is always
   available, and nothing on this screen blocks or retries on a failed lookup.

**Definition of done:** a destination from a saved place, a pin, or a search
all reach the journey-start screen; with airplane mode on, the flow still works
via saved places.

---

## Phase 4 — Geofence and trigger logic (core)

**Goal:** the pure, testable heart of the product. No UI, no device needed.

Work:

1. `src/modules/geofence/distance.ts` — haversine (or Vincenty if needed)
   distance in metres; unit-tested against known coordinate pairs.
2. `src/modules/geofence/trigger.ts` — a pure state machine evaluated per
   location sample:
   - inputs: sample (lat/lng/accuracy/timestamp), destination, radius,
     optional multi-stage thresholds, previous trigger state;
   - rules: require accuracy better than a threshold before trusting a fix
     ("confidently inside"); fire once per stage; hysteresis so jitter around
     the boundary does not re-fire; ignore samples older than a freshness
     limit; detect likely overshoot from successive reliable fixes and label
     it as an estimate only.
3. `src/modules/geofence/policy.ts` — adaptive strategy table (spec §7):
   chooses `Accuracy` + `distanceInterval` + `timeInterval` from distance to
   destination, battery level, and stationary duration.
4. Unit tests: boundary cases, poor accuracy, jitter, overshoot, stale
   sample, multi-stage ordering, duplicate suppression.

**Definition of done:** the trigger state machine is fully covered by tests
and can be exercised without any native module.

---

## Phase 5 — Location engine and lifecycle

**Goal:** persistent background tracking that the alarm can rely on.

Work:

1. `src/modules/location/task.ts` — `TaskManager.defineTask` at **top-level
   module scope** (SDK 58 requirement) receiving `locations`; each sample is
   fed to the geofence evaluator, the journey row, and diagnostics.
2. `src/modules/location/service.ts` —
   `Location.startLocationUpdatesAsync` with
   `foregroundService` options (title/body/notification colour, icon), an
   adaptive policy applied on change, `killServiceOnDestroy` decided by risk
   (default false, so a swipe-away does not silently kill tracking), and stop
   handling that clears state cleanly.
3. Permission gates (`src/modules/permissions`): foreground first, background
   on demand, `hasServicesEnabledAsync` check, permanent-denial → Settings
   deep link via `Linking`/`expo-intent-launcher`.
4. Freshness watchdog per **D14**: one constants object drives the three
   thresholds, the status flips to waiting/stale at 60 s and 3 min, the journey
   becomes `interrupted` at 10 min, and recovery (task restart, permission
   re-check) runs from the same watchdog tick rather than a separate timer.
5. Battery: `expo-battery` level sampling, low-battery warning, optional
   battery-saving mode that changes the policy **only with user consent**
   (spec §7), and the restriction heuristic from **D7** as a pure,
   unit-tested function wired to diagnostics and the Settings issue count.
6. Boot/process-death recovery per **D2**: build `modules/boot-recovery`
   (BOOT_COMPLETED receiver + flag + config plugin), and on launch move an
   `active` journey with the interruption flag or a stale `last_location_at` to
   `interrupted` with a "resume or end" prompt. No automatic restart, and no
   auto-start from the receiver.
7. Diagnostics events at every state transition (start, pause, resume, task
   restarted, permission lost, trigger, end), capped and pruned.
8. Write the **D9** metrics inputs from this layer, not the UI: `entered_radius_at`
   the first time the evaluator reports a `confidently inside` result,
   `start_battery_pct` at journey start and `end_battery_pct` at completion.
   `start_battery_pct` is written even when the level is unknown (NULL).
9. One `__DEV__`-only inspector in settings/diagnostics showing the last 20
   raw samples (time, lat/lng, accuracy) and the current policy interval — the
   artefact Phase 5's device test is judged on, since the journey screen does
   not exist yet.

**Definition of done:** with a development build on a physical device,
screen-off tracking continues for 30+ minutes in airplane mode **as shown by
the diagnostics inspector** (samples keep arriving, gaps are within D14's
trust window); killing the app produces an honest `interrupted` state in the
DB and on relaunch, not a fake "tracking" state. This phase is closable
without the journey UI — that is Phase 7.

---

## Phase 6 — Alarm experience

**Goal:** an audible, vibrating, dismissible alert that survives background
execution.

Work:

0. Build the two-tier delivery from **D1**: post an immediate notification on
   the `alarm` channel (`trigger: { channelId: 'alarm' }`) as the robust path,
   with the audio loop layered on top. No wall-clock scheduling, therefore no
   exact-alarm permission. Audibility with the screen locked is proven by this
   phase's device test; `HintoAlarm` is the escalation only if it fails.
1. `src/modules/alarm/player.ts` — `expo-audio` looping playback with the
   selected sound, explicit fallback to a bundled tone if the preferred file
   is unavailable; stop/snooze/max-repeat handling. Session config exactly as
   D1 specifies (`playsInSilentMode: true`, `shouldPlayInBackground: true`,
   `interruptionMode: 'doNotMix'`, `setActiveForLockScreen`), applied once at
   module init rather than per alert.
2. Vibration via `expo-haptics` (notification/vibrate patterns) with a
   supported-pattern fallback.
3. Channel *configuration* only (item 0 owns the posting path): create the
   `journey` and `alarm` channels at startup with the D1 settings — max
   importance, bundled sound, `enableVibrate` + `vibrationPattern`, `bypassDnd`,
   ALARM audio usage, public lock-screen visibility. Android applies channel
   settings only at creation, so version the ids (`alarm-v1`) instead of
   mutating a channel a user may have customised.
4. `src/app/alarm.tsx` — high-visibility modal route: destination, distance,
   time; actions **Dismiss**, **Snooze (5 min)**, **I'm awake / End journey**
   with the interaction rules from **D4** (hold-to-confirm end, tap snooze,
   confirm-dialog dismiss); records the `journey_alerts` row with trigger
   distance, stage, accuracy and time. Snooze writes `snoozed_until` on that
   alert row and leaves the journey `triggered`; the alarm re-fires at the
   deadline unless the journey ended first.
5. Deep link from the notification into `/alarm` so a tap cannot silently
   discard the alert.
6. Settings + onboarding test-alarm that exercises sound, vibration, and
   dismiss/snooze without a real journey.
7. Copy rules: never claim guaranteed audibility; explain silent mode, DND,
   and volume.
8. `__DEV__`-only "Simulate trigger" in settings/diagnostics that runs the
   real trigger path (alert row, notification, audio) without travelling — the
   artefact this phase's device test uses.

**Definition of done:** with the screen locked and the app backgrounded, the
`__DEV__` simulate trigger produces exactly one audible + vibrating alert (no
repeat storm), the alarm screen is reachable from the notification, and the
`journey_alerts` row records distance, stage, accuracy and time. The
real-travel acceptance test lives in Phase 7, where the journey UI exists.

---

## Phase 7 — Active journey and home

**Goal:** spec §4.5 plus the Home screen from §4.1.

Work:

1. `src/modules/journeys/service.ts` — lifecycle transitions
   `prepared → active → paused → triggered → completed | cancelled |
   interrupted`, each persisted before the UI reacts; destination snapshot
   copied into the journey row so later place edits/deletes cannot corrupt it.
   Terminal states are defined once: `completed` = user pressed "I'm awake /
   End" (whether or not it rang), `cancelled` = user abandoned before any alert
   while still far from the radius, `interrupted` = system/boot/unclean exit
   (D2, D10). History groups `completed` and `cancelled` separately.
2. Home: readiness indicator (permissions, location services, battery
   guidance), the **D7** amber delay hint when restriction is suspected,
   offline indicator that does **not** imply GPS is down, active journey card
   (resume/end), saved-place shortcuts, recents.
3. `src/app/journey/[id].tsx` — destination, live distance, accuracy, radius,
   tracking state vs waiting-for-fix, last update age, battery, pause/resume/
   end, with the status thresholds from **D14**. `⚙` opens the journey options
   sheet at `/journey/:id/options` (change the primary radius — writes the
   `journey_alert_rules` row and `journeys.radius_m` — add or remove an earlier
   stage, change sound, and the `__DEV__` simulate trigger).
4. Start-journey readiness gate: block or clearly qualify background journeys
   when background permission or location services are missing (spec §12).
5. Own the `/journey/new` alarm-setup sheet here — it is UI, so it does not
   belong to Phase 4's pure logic. Opening the sheet creates a `prepared`
   journey row, `Start journey` promotes it to `active`, and dismissing the
   sheet marks it `cancelled`. That creation point makes D9's start-completion
   metric measurable, and it keeps abandoned sheets out of the denominator as
   `cancelled` rather than leaked rows.
6. Keep the run path network-free per **D17**: no fetch, geocode, tile or asset
   request between `Start journey` and journey end, and a stubbed-`fetch` test
   that drives start → sample → trigger proves it. The offline banner reads
   connectivity for display only and must never gate tracking.

**Definition of done:** start → background → lock → trigger → dismiss → end
works end-to-end offline; relaunch restores the journey or reports the
interruption honestly.

---

## Phase 8 — History and settings

**Goal:** close the loop on §4.7 and the settings list in §10.

Work:

1. `src/app/(tabs)/history.tsx` — completed journeys: destination snapshot,
   start/end, duration, radius, whether triggered, dismissed vs snoozed,
   approximate final distance; per-row delete and "clear all" with
   confirmation.
2. Settings: default radius, sound selection with preview, vibration, repeat
   and snooze duration, hold-to-confirm toggle (D4), battery-saving preference,
   distance unit, alarm test, permission status summary with Settings deep
   links, diagnostics export (share-sheet text, no coordinates by default),
   delete-all data, and the **D6** `Reset local data` action with typed
   confirmation.
3. Formatting helpers for distance (`m`/`km`, mi option) and duration.
4. Diagnostics additions: the **D9** metrics block over a 30-day default
   window (each value `n/a` when its inputs are missing) and the **D10** crash /
   unclean-exit section, both included in the share-sheet export as aggregates
   only.

**Definition of done:** history and settings persist across restarts; "clear
history" removes only journey rows.

---

## Phase 9 — Onboarding and permissions

**Goal:** spec §6's eight screens, education before request.

Work:

1. `src/app/onboarding/` with `welcome`, `how-it-works`, `location`,
   `background`, `notifications`, `battery`, `alarm-test`, `ready`; progress
   dots, back navigation, skip where allowed.
2. Persist `onboarding_version`; re-show only for new versions.
3. Each screen requests its permission **in context**, handles denial with
   impact explanation + retry + Settings route, and never loops on a permanent
   denial.
4. Battery screen: manufacturer-aware guidance, `ACTION_IGNORE_BATTERY_
   OPTIMIZATION_SETTINGS`-style deep link where supported, "later" option,
   honest trade-off copy.
5. Ready screen summary with granted/denied/not-requested states; allow
   continuing with optional steps incomplete.

**Definition of done:** a fresh install can be explored without granting
anything; starting a journey then shows a precise readiness check rather than
a misleading "ready".

---

## Phase 10 — Release readiness

**Goal:** the spec's launch quality gate (§13, §16).

Work:

1. Spec §18 questions are all closed — no decision blocks this phase:
   - Platform: **Android-only** (D16).
   - Maps: **online pin picker only, no downloadable tiles** (D18).
   - Native alarm implementation: decided by D1's escalation gate in Phase 6.
   - Radius presets and bounds: Phase 0 task 7 / `src/constants/alarms.ts`
     (100 m–20 km).
   - Staleness and accuracy: **D14**.
   - Minimum Android version: provisional floor **Android 10 (API 29)**; revisit
     only if a device shows an API-level behaviour break.
   - Acceptable battery drain: provisional target **≤5% per hour** of active
     tracking at a 1 km radius on a mid-range device (scenario 16). A tuning
     target, not a release gate.
2. EAS: `eas.json` with `development` (dev client), `preview` (internal APK),
   `production` profiles; `eas build` for Android; `eas update` only after
   the core is stable.
3. Physical-device test matrix from spec §14 — Pixel, Samsung, Xiaomi, across
   supported Android versions: airplane mode, screen off, battery saver,
   DND/silent, tunnel/GPS loss, force-stop, reboot, boundary jitter, low
   battery, long journey battery measurement. Record results in a
   `docs/device-test-log.md`.
4. Play Store readiness: background-location and foreground-service
   declaration/justification, permission declarations, privacy policy,
   limitation disclosures.
5. Bump to `0.1.0` with the CHANGELOG entry per `AGENTS.md`, publish the
   release, and keep `v0.0.0` as the empty baseline.

**Definition of done:** demoed reliable alerts on all matrix devices under
screen-off + offline + battery-saver conditions, with known limitations
documented publicly.

---

## Sequencing notes

- **Phases 4 and 5 are the riskiest** — they decide whether the product works.
  Do Phase 4's pure logic before any UI polish, and start device testing in
  Phase 5 rather than at the end.
- Phases 5 and 6 are closable **before** the journey UI exists: they are judged
  on the diagnostics inspector and the `__DEV__` simulate trigger. The
  end-to-end travel test belongs to Phase 7, so no phase's definition of done
  waits on a later phase's screen.
- Phases 2, 3, 8 are largely UI/CRUD and can be parallelised once Phase 1
  lands.
- Phase 9 can be built alongside Phase 7 but permission *handling* must exist
  early enough for Phase 5 testing to exercise denial paths.
- Don't add offline map tiles (post-MVP) until the alarm is proven; the spec
  treats maps as optional presentation.

## Cross-cutting risks

| Risk | Where it bites | Mitigation in this plan |
| --- | --- | --- |
| OEM background killing | Phase 5 | Foreground service + persisted state + honest UX + matrix testing |
| Battery drain | Phase 5 | Adaptive policy table, low-battery mode, measured on device |
| GPS accuracy vs small radius | Phase 4 | Accuracy-aware "confidently inside" test, hysteresis |
| Notification/alarm sound suppressed | Phase 6 | Max-importance ALARM channel, fallback tone, test alarm, honest copy |
| Offline map licensing/storage | Phase 3/10 | Maps optional; decide before adding tiles |
| Schema churn | Phase 1 | Forward-only migrations, snapshot fields in journeys |

## Verification per phase

```bash
npm run lint        # expo lint
npx tsc --noEmit    # once Phase 0 fixes are in
npm test            # jest (geofence/trigger logic)
npm run build       # expo export --platform android
```

Device checks are listed per phase and are mandatory for Phases 5–7 and 10;
they cannot be replaced by CI.

## Offline acceptance matrix (spec §5)

Every "must work offline" row needs an owner and a way to prove it. This table
is the checklist for D17, and rows marked ✈ are exercised in airplane mode in
`docs/device-test-log.md` (scenarios 1, 2, 11).

| Spec §5 requirement | Owner | Proof |
| --- | --- | --- |
| Saved places and categories | Phase 1–2 | ✈ create/edit/favourite/delete, restart with data intact |
| Active journey and alarm configuration | Phase 1, 7 | ✈ start a journey from a saved place, kill and relaunch |
| GPS acquisition with no data | Phase 5 | ✈ `getProviderStatusAsync().gpsAvailable` true, samples keep arriving (scenario 1) |
| Distance calculation | Phase 4 | Unit tests + ✈ live distance on the journey screen |
| Geofence / radius evaluation | Phase 4 | Unit tests only (pure function, no IO) |
| Local alarm sound and vibration | Phase 6 | ✈ simulate trigger with the screen locked (scenario 2) |
| Journey history | Phase 8 | ✈ read/write after restart |
| Settings and onboarding state | Phase 1, 9 | ✈ restart, settings retained, onboarding not repeated |
| **Not offline by design** | — | Place search (D15), map tiles (D18) — both degrade to saved places/coordinates, and neither is on the run path |

A phase is not offline-done until its rows are proven in airplane mode on a
physical device; CI cannot cover this.

---

## Audit — gaps found (2026-11-13)

Cross-check of this plan and `WIREFRAMES.md` against `Hinto-spec.md`. All 16
items are now closed — each is resolved by a decision in the register (D1–D15)
and/or folded into a phase task. The entries stay as the record of what was
found and why the design changed.

### A. Blocking or high risk

1. **Alarm audio from a background/headless context was unproven** (Phase 6)
   — **resolved in D1**. The original assumption was that `expo-audio` looping
   alone could carry the alarm while the app was backgrounded and locked; that
   was never safe, since notification sounds do not loop and a background JS
   context may not get to start playback. D1 inverts the dependency: the
   OS-owned alarm-channel notification is the guaranteed path, audio is layered
   on top, and a native FGS module is the documented escalation if the
   screen-locked device test fails.
2. **Reboot recovery had no implementation path** (Phase 5) — **resolved in
   D2** (boot module records, app prompts, no silent restart). Spec
   §8/§13 require reboot behaviour to be implemented *and tested*, but
   `expo-location` provides no `BOOT_COMPLETED` receiver for restarting a
   location task — it needs a config plugin or native module
   (`RECEIVE_BOOT_COMPLETED` is already added by `expo-notifications`, but it
   only restores scheduled notifications). D2 closes it by implementing
   recovery explicitly — record the interruption, then prompt — instead of
   promising an automatic restart.
3. **Map provider and key were undecided** (Phase 3) — **resolved keyless in
   D19** (MapLibre Native + OpenStreetMap raster tiles). D3's Google provider
   needed a billing-enabled key and is absent from Expo Go, so it is
   superseded.
4. **Prevent accidental dismissal had no defined interaction** (Phase 6) —
   **resolved in D4** (hold-to-confirm to end, tap to snooze, confirm to
   silence). Settings copy must name the hold gesture.

### B. Data model

5. **Multi-stage warnings were not representable** — fixed in Phase 1 with
   `journey_alert_rules`.
6. **History could not show trigger accuracy/stage** the wireframes promise —
   fixed with `journey_alerts.accuracy_m` / `stage_index`.
7. **`settings` keys were unnamed** — **resolved in D5**: a key/value table
   plus a Zod schema, with all nine keys, types and defaults enumerated.
8. **No DB failure path** — **resolved in D6**: transactional migrations, an
   integrity check at startup, a storage-unavailable state, and a
   user-initiated reset that preserves the corrupt file for diagnostics.

### C. Spec coverage

9. **"Battery restriction suspected" had no detection rule** — **resolved in
   D7**: a pure cadence-gap heuristic (2 gaps over 15 min while active and
   permitted), with permission loss reported separately.
10. **Metrics from spec §17 could not be computed** — **resolved in D9**: the
    needed timestamps/battery fields, seven locally derived metrics, and an
    explicit no-upload stance.
11. **Crash reporting was unaddressed** — **resolved in D10**: error boundary,
    local crash breadcrumbs with no coordinates, unclean-exit detection, no
    third-party SDK.
12. **Spec §14's scenarios were referenced, not enumerated** — **resolved in
    D11**: `docs/device-test-log.md` now exists with all 16 scenarios, the §14
    fields and a pass/fail column.
13. **Localization was undecided** — **resolved in D8**: English-only MVP with
    all copy centralized in `src/constants/strings.ts`; the Filipino tagline is
    brand copy, not a UI string.
14. **Assets had no owner or spec** — **resolved in D12**: a named asset table
    with sizes, paths, licence provenance, and Phase 0 task 8 to produce them.
15. **Web target was undefined** — **resolved in D13**: web is out of scope
    for the MVP, gated behind a notice, with no SQLite wasm work.
16. **Template removal is riskier than it looks** — folded into Phase 0 task
    4, which now names `AnimatedSplashOverlay` as must-keep.

### D. Corrected in this pass

17. `WIREFRAMES.md` claimed 27 screens; the real count was 24 (4 tabs, 12 task,
    8 onboarding) plus 3 layout files — 25 after the journey-options sheet was
    added.
18. The navigation map routed the alarm's end action to a `/journey/[id]
    (summary)` screen that does not exist; it now ends into `history/[id]`.
