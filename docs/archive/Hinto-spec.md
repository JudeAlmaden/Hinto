# Hinto --- Product Requirements & Technical Specification

**Working name:** Hinto
**Tagline:** Gising bago lumagpas.
**Product type:** Offline-first GPS destination alarm for
public-transport commuters
**Initial platform:** Android
**Framework direction:** React Native + Expo (development build /
prebuild, with native Android integration where required)
**Document status:** MVP specification
**Version:** 1.0

------------------------------------------------------------------------

## 1. Product overview

Hinto helps a passenger wake up before reaching a chosen destination. The
user selects a place, configures a warning distance, starts a journey,
and the app monitors the device's location in the background. When the
device approaches the destination, Hinto triggers an audible and
vibrating alert.

The core alarm must work without mobile data. Internet access may
improve place search, map downloads, and optional synchronization, but
must not be required for an already-configured journey.

### Product name

-   **App name:** Hinto
-   **Tagline:** Gising bago lumagpas.

### Product principles

1.  **Reliable before clever:** A dependable alarm is more important
    than advanced route prediction.
2.  **Offline-first:** Saved places, active journey settings, distance
    calculations, and alarm sounds are stored locally.
3.  **Permission transparency:** Explain why each permission is needed
    before requesting it.
4.  **Battery-aware:** Use the least intensive location strategy that
    can still meet the user's selected warning distance.
5.  **Honest reliability messaging:** GPS, Android background limits,
    device settings, and force-stop behavior can affect delivery. Never
    promise a 100% guaranteed alarm.
6.  **Simple operation:** Starting a saved destination should take only
    a few taps.

------------------------------------------------------------------------

## 2. Goals and non-goals

### MVP goals

-   Let users search for or pin a destination.
-   Save, edit, categorize, and reuse places.
-   Configure an alarm radius and optional earlier warning.
-   Track location while the app is in the background and the screen is
    locked, subject to OS permissions and restrictions.
-   Trigger a local alarm with sound and vibration when the user enters
    the configured radius.
-   Keep an active journey functional without internet.
-   Guide users through permissions and battery settings with a clear
    onboarding flow.
-   Detect and communicate location problems, permission loss, and low
    battery.

### Not MVP goals

-   Live public-transport vehicle tracking.
-   Crowd-sourced traffic or vehicle occupancy.
-   Turn-by-turn navigation.
-   Guaranteed detection that a passenger has physically passed a stop.
-   Automatic identification of buses, jeepneys, or trains.
-   Cloud accounts or mandatory sign-in.
-   Social networking or payments.
-   AI route prediction.

------------------------------------------------------------------------

## 3. Target users and primary use case

**Primary user:** A commuter who may fall asleep during a bus, train, UV
Express, or other public-transport journey.

**Primary scenario:**

1.  User opens Hinto before boarding.
2.  User selects a saved place or searches/drops a pin.
3.  User chooses a warning distance, such as 1 km.
4.  Hinto checks that the required permissions and settings are
    available.
5.  User starts the journey.
6.  User locks the phone and rests.
7.  Hinto monitors location in the background.
8.  When the device enters the destination radius, Hintro sounds and
    vibrates.
9.  User dismisses the alarm and ends the journey.

------------------------------------------------------------------------

## 4. MVP feature requirements

### 4.1 Home

The home screen should prioritize starting a journey.

Components:

-   Search destination field.
-   Saved-place shortcuts.
-   Recent destinations.
-   Start/resume active journey card.
-   Permission/readiness indicator.
-   Offline status indicator.
-   Bottom navigation: Home, Places, History, Settings.

Requirements:

-   An active journey must be visually prominent.
-   Do not show a misleading "ready" state if required permissions are
    missing.
-   Offline status must not imply GPS is unavailable. GPS positioning
    does not require mobile data.
-   Use the app name consistently in copy: refer to Hinto, not Abot.

### 4.2 Destination selection

Support:

-   Search by place name when online.
-   Select a point on a map.
-   Enter coordinates only as an advanced/debug option.
-   Select an existing saved place.
-   Confirm the destination name and coordinates before starting.

Offline behavior:

-   Saved places remain selectable.
-   A locally available/offline map may be displayed if map data has
    been downloaded.
-   Online place search is unavailable without connectivity; explain
    this and offer saved places or map pin selection where map data
    exists.
-   The alarm engine must not depend on map tiles or map rendering.

### 4.3 Saved Places

Users can:

-   Save a place with a custom name.
-   Categorize it as Home, School, Work, Terminal, or Other.
-   Choose an icon and optional color.
-   Store latitude and longitude.
-   Set a default alarm radius per place.
-   Mark a place as a favorite.
-   View recently used destinations.
-   Edit, duplicate, and delete places.

Suggested local fields:

  Field              Description
  ------------------ -------------------------------------
  id                 Local unique identifier
  name               User-defined place name
  category           home, school, work, terminal, other
  latitude           Destination latitude
  longitude          Destination longitude
  icon               Selected icon identifier
  color              Optional display color
  default_radius_m   Preferred trigger radius in meters
  is_favorite        Favorite flag
  created_at         Creation timestamp
  updated_at         Last update timestamp

Deleting a saved place must not silently delete or corrupt an active
journey that references it. Preserve a destination snapshot in the
active journey.

### 4.4 Alarm configuration

Provide simple presets plus a custom radius.

Suggested presets:

-   Very early: 5,000 m
-   Early: 3,000 m
-   Normal: 1,000 m
-   Close: 500 m
-   Custom: user-defined

Requirements:

-   Show the selected radius in plain language.
-   Validate a sensible minimum and maximum radius.
-   Warn that a small radius may be missed if GPS accuracy is poor or
    location updates are delayed.
-   Allow optional multiple warnings, e.g. 3 km and 1 km.
-   Avoid repeated alerts from GPS jitter by using trigger state and
    hysteresis.
-   Do not repeatedly fire the same alert while the user remains inside
    the radius.

The product name used throughout this spec is Hinto.

### 4.5 Active journey

Display:

-   Destination name.
-   Current distance to destination.
-   GPS accuracy / signal quality.
-   Selected trigger radius.
-   Tracking status.
-   Last location update time.
-   Battery level where available.
-   Pause, resume, and end controls.

Requirements:

-   Persist journey state locally.
-   Restore the active journey after normal app process recreation or
    device restart where supported.
-   Clearly distinguish "tracking" from "waiting for a usable GPS fix."
-   If location updates become stale, show a warning and attempt
    recovery.
-   If the user pauses tracking, clearly show that the alarm is not
    currently monitoring.

### 4.6 Alarm experience

When triggered:

-   Play a user-selected local alarm sound.
-   Vibrate using a supported pattern.
-   Display a high-visibility alarm screen/notification.
-   Repeat sound until dismissed or snoozed, subject to platform
    capabilities and user settings.
-   Offer "Dismiss," "Snooze," and "I'm awake / End journey."
-   Prevent accidental dismissal with an optional confirmation.
-   Record trigger time and approximate trigger distance for journey
    history.

Do not assume a normal notification can always override silent mode, Do
Not Disturb, or device volume settings. Explain these limitations in
onboarding and provide a test-alarm function.

### 4.7 Journey history

For each completed journey, store:

-   Destination snapshot.
-   Start and end timestamps.
-   Alarm trigger timestamp, if triggered.
-   Configured radius.
-   Whether the alarm was dismissed or snoozed.
-   Basic duration and approximate final distance, if available.

History should be local-only in the MVP, with an option to clear
records.

------------------------------------------------------------------------

## 5. Offline-first requirements

### Must work offline

-   Saved places and categories.
-   Active journey and alarm configuration.
-   GPS location acquisition when the device has a usable
    satellite/location fix.
-   Distance calculation.
-   Geofence/radius evaluation.
-   Local alarm sound and vibration.
-   Journey history.
-   Settings and onboarding completion state.

### May require internet

-   Online place search and geocoding.
-   Downloading map regions and map updates.
-   Optional cloud backup/synchronization in a future release.
-   Live traffic or third-party transit information, if ever added.

### Map strategy

Treat offline maps as an optional visual aid, not as a dependency of the
alarm.

Evaluate MapLibre with an appropriate offline tile/data strategy.
Confirm tile licensing, attribution requirements, storage footprint,
download controls, and offline routing limitations before selecting a
provider. Do not assume that OpenStreetMap data automatically grants
unrestricted use of any third-party tile server.

------------------------------------------------------------------------

## 6. Onboarding and permissions

### Principle: education first, request only when needed

Do not request every permission immediately on first launch. Introduce
the feature, explain the reason, then request the relevant permission in
context. A user should be able to explore the app and save places before
being forced through every system dialog.

### Proposed onboarding flow

#### Screen 1 --- Welcome

Explain the product:

> Choose your destination. Hinto will alert you as you get close.

Actions: - Get started - Learn how it works

#### Screen 2 --- How it works

Use a short three-step illustration:

1.  Choose or save a destination.
2.  Set how far away you want to be alerted.
3.  Start your journey and keep Hinto running.

Clarify that GPS works without mobile data, but location accuracy
depends on the phone and surroundings.

#### Screen 3 --- Location permission education

Explain:

> Hinto needs your location to calculate how close you are to your
> destination, including while your screen is off.

Request foreground location permission first.

If denied: - Explain which features are unavailable. - Provide a button
to try again. - Do not repeatedly show system prompts after a permanent
denial; provide an "Open Settings" action.

#### Screen 4 --- Background location education

Show this only when the user is about to enable or start background
journey tracking, not necessarily at first launch.

Explain:

> To alert you while the app is in the background or your phone is
> locked, Hinto needs background location access.

Request background permission using the platform-compliant flow. On
Android versions that require a separate Settings step for "Allow all
the time," explain the steps and open the relevant settings page where
supported.

Do not disguise the system dialog or imply that background access is
mandatory for browsing the app.

#### Screen 5 --- Notifications

Explain:

> Notifications let Hinto show journey status and alert you when you are
> approaching your destination.

Request notification permission where required by the OS (notably
Android 13+).

If denied: - Explain that visible notifications and some alarm
presentation may be limited. - Offer an in-app settings route. - Do not
claim that all alarms will still work identically without notification
permission.

#### Screen 6 --- Battery optimization guidance

This is an educational setup step, not a permission that should be
blindly requested.

Explain:

> Some phones restrict background apps to save battery. This can delay
> or stop location updates and may prevent an alert from arriving on
> time.

Provide: - Manufacturer-aware instructions where feasible. - A button to
open app battery settings where supported. - A "I'll do this later"
option. - A reminder in the journey readiness check if restrictions may
affect tracking.

Do not tell every user to disable all battery protections without
explaining the battery trade-off. Do not promise that excluding the app
from optimization guarantees delivery.

#### Screen 7 --- Alarm test

Let users test: - Sound. - Vibration. - Volume. - Dismiss and snooze
controls.

Explain that silent mode, Do Not Disturb, media/alarm volume, and
manufacturer settings may affect audible alerts.

#### Screen 8 --- Ready

Show a setup summary:

-   Foreground location: granted / not granted.
-   Background location: granted / not granted / not yet requested.
-   Notifications: granted / denied / not required.
-   Battery guidance: reviewed / not reviewed.
-   Alarm test: completed / not completed.

Allow the user to continue into the app even if optional setup steps are
incomplete. When they start a journey, show a clear readiness check for
requirements that affect that journey.

### Permission matrix

  -------------------------------------------------------------------------
  Capability              Android consideration   iOS consideration
  ----------------------- ----------------------- -------------------------
  Foreground location     Runtime location        When In Use authorization
                          permission

  Background location     Background permission / Always authorization and
                          "Allow all the time"    background location
                          flow depending on OS    configuration, where
                          version                 justified

  Notifications           Runtime permission on   Notification
                          Android 13+             authorization

  Vibration               Usually no runtime      Haptics subject to
                          permission for ordinary device/system behavior
                          vibration

  Exact alarm scheduling  Android 12+ exact-alarm No direct equivalent; use
                          access may be relevant  supported
                          if using exact          notification/background
                          `AlarmManager` alarms   mechanisms

  Battery optimization    Doze, App Standby, OEM  iOS controls background
                          restrictions            execution; no general
                                                  user-facing battery
                                                  exemption

  Boot recovery           Receiver and platform   More limited; do not
                          restrictions            promise automatic restart
                                                  of continuous tracking
  -------------------------------------------------------------------------

Request only permissions actually needed by implemented functionality.
Review current Play Store and Apple platform policies before release,
especially background location and exact-alarm declarations.

------------------------------------------------------------------------

## 7. Battery usage and location strategy

Battery use is a major product risk. Continuous high-accuracy GPS can
drain the battery, especially during long journeys.

### Risks

-   Frequent GPS polling consumes power.
-   Weak GPS signal indoors, in tunnels, between tall buildings, or
    inside some vehicles can increase acquisition time and reduce
    accuracy.
-   Frequent network-based location requests can consume mobile data and
    power.
-   Android Doze and App Standby can defer background work.
-   Manufacturer-specific battery managers may terminate or restrict
    background services.
-   A foreground service improves transparency and execution eligibility
    but does not guarantee uninterrupted operation.
-   Aggressive battery-saving settings may reduce location accuracy or
    delay alarms.

### Proposed adaptive strategy

Use a location strategy that changes based on distance, speed, and GPS
accuracy.

  -----------------------------------------------------------------------
  Situation                           Suggested behavior
  ----------------------------------- -----------------------------------
  Far from destination                Use lower-frequency updates /
                                      balanced accuracy

  Approaching destination             Increase update frequency and
                                      accuracy

  Inside warning radius               Trigger once, with jitter
                                      protection

  Poor GPS accuracy                   Keep monitoring, show uncertainty,
                                      avoid false trigger where possible

  Stationary for a period             Reduce update frequency but
                                      continue monitoring

  Low battery                         Warn the user and offer a
                                      battery-saving mode with clearly
                                      stated trade-offs
  -----------------------------------------------------------------------

The exact intervals must be established through device testing, not
hard-coded from assumptions. Platform APIs may batch or defer updates.

### Trigger logic

Use the device location, destination coordinates, and reported
horizontal accuracy.

-   Calculate geodesic distance between current location and
    destination.
-   Consider reported GPS accuracy when deciding whether the user is
    confidently inside the radius.
-   Require a stable/credible location fix before triggering.
-   Use hysteresis or a one-shot trigger state to prevent repeated
    alarms from GPS jitter.
-   Track the last reliable location and timestamp.
-   Detect likely overshoot when successive reliable locations move from
    one side of the destination to the other, but label this as an
    estimate.

Do not claim guaranteed "passed destination" detection: GPS drift, route
geometry, tunnels, and roads running near the destination can produce
false positives.

### Battery UX

Before starting a long journey: - Show current battery percentage if
available. - Warn when battery is low. - Explain that background GPS
uses additional battery. - Offer an optional battery-saving tracking
mode. - Never silently reduce tracking quality below the user's selected
safety expectation.

------------------------------------------------------------------------

## 8. Notification and alarm reliability

A destination alarm is time-sensitive. Ordinary background notifications
and scheduled jobs are not equivalent to a dedicated alarm clock.

### Android concerns

-   Android 13+ requires notification permission for ordinary
    notifications.
-   Android 12+ exact alarm behavior and special access depend on app
    use case and OS version.
-   Foreground location tracking generally requires a correctly declared
    foreground service and persistent notification.
-   Newer Android versions impose foreground-service type, permission,
    and start restrictions.
-   Full-screen intent access is restricted and should not be assumed
    available for a general destination alert.
-   DND, notification channels, alarm/media volume, and OEM settings can
    affect sound.
-   Force-stopping the app may prevent background work and restart
    receivers until the user launches it again.
-   Reboot recovery must be implemented and tested; it is not automatic
    merely because journey state was saved.

### iOS concerns

-   Background location requires correct authorization, capability
    configuration, and user-facing justification.
-   iOS may suspend or terminate apps; background location behavior is
    not equivalent to Android foreground services.
-   Local notifications have system-controlled presentation and sound
    behavior.
-   Critical Alerts require a special entitlement and must not be
    assumed.
-   Force-quitting an app can prevent expected background behavior.
-   Do Not Disturb and Focus settings may affect alert presentation.

### Required reliability features

-   Persistent journey state.
-   Foreground service notification on Android during active tracking.
-   Location freshness indicator.
-   GPS accuracy indicator.
-   Permission and service-health checks.
-   Test alarm.
-   Clear warnings when tracking is paused, permission is missing, or
    the OS is restricting the app.
-   Recovery handling after process death and reboot where supported.
-   Alarm trigger deduplication.
-   Diagnostic event log that users can optionally share for
    troubleshooting.

Never state that an alarm is guaranteed if the app has been
force-stopped, location is disabled, permissions are revoked, the device
is powered off, or the OS has blocked execution.

------------------------------------------------------------------------

## 9. Technical architecture

### Recommended stack

  -----------------------------------------------------------------------
  Layer                   Proposed choice         Notes
  ----------------------- ----------------------- -----------------------
  App framework           React Native + Expo     Use development builds
                                                  and prebuild; Expo Go
                                                  is insufficient for
                                                  validating all native
                                                  background behavior

  Language                TypeScript              Shared application
                                                  logic

  Navigation              Expo Router             Screen and route
                                                  organization

  Local database          SQLite                  Saved places, settings,
                                                  journeys, event history

  State                   Zustand                 UI and session state;
                                                  database remains source
                                                  of truth for persisted
                                                  data

  Maps                    MapLibre                Validate offline map
                                                  packaging and tile
                                                  licensing

  Location                Expo Location           Validate background
                          initially, native       reliability on physical
                          Android module/service  devices
                          as needed

  Background tasks        Expo Task Manager plus  Do not assume JS tasks
                          native integration      provide continuous
                          where required          tracking

  Notifications           Expo Notifications plus Test sound, vibration,
                          native Android          channels, and OS
                          alarm/service           restrictions
                          integration where
                          needed

  Backend                 None required for MVP   Add optional sync only
                                                  after core app is
                                                  reliable
  -----------------------------------------------------------------------

### Architectural rule

The alarm engine must be independent of: - Map rendering. - Network
availability. - Search/geocoding providers. - Authentication. - Cloud
synchronization.

The map is a presentation layer. The local journey record and
location/alarm engine are the operational core.

### Suggested modules

-   `places`: saved destinations and categories.
-   `journeys`: journey lifecycle and persistence.
-   `location`: location provider, accuracy, freshness, permission
    state.
-   `geofence`: distance calculation and trigger evaluation.
-   `alarm`: sound, vibration, snooze, dismissal.
-   `permissions`: permission state and settings guidance.
-   `battery`: battery level and optimization education.
-   `maps`: online/offline map presentation.
-   `history`: completed journey records.
-   `diagnostics`: local troubleshooting events.

------------------------------------------------------------------------

## 10. Data model (local-first)

### `places`

-   `id`
-   `name`
-   `category`
-   `latitude`
-   `longitude`
-   `icon`
-   `color`
-   `default_radius_m`
-   `is_favorite`
-   `created_at`
-   `updated_at`

### `journeys`

-   `id`
-   `place_id` nullable
-   `destination_name_snapshot`
-   `destination_latitude`
-   `destination_longitude`
-   `radius_m`
-   `status` (`prepared`, `active`, `paused`, `triggered`, `completed`,
    `cancelled`, `interrupted`)
-   `started_at`
-   `triggered_at` nullable
-   `ended_at` nullable
-   `last_location_at` nullable
-   `last_known_distance_m` nullable
-   `alarm_dismissed_at` nullable

### `journey_alerts`

-   `id`
-   `journey_id`
-   `trigger_distance_m`
-   `triggered_at`
-   `dismissed_at` nullable
-   `snoozed_until` nullable
-   `alert_type`

### `settings`

Store local preferences such as: - Default alarm radius. - Sound
selection. - Vibration enabled. - Repeat behavior. - Snooze duration. -
Battery-saving preference. - Distance unit. - Onboarding
completion/version.

### `diagnostic_events`

Keep a limited, privacy-conscious local log: - Event type. -
Timestamp. - Relevant non-sensitive status metadata. - No continuous
location history unless explicitly required and disclosed.

------------------------------------------------------------------------

## 11. Privacy and data handling

-   No account is required for core functionality.
-   Keep saved places and journey data on-device by default.
-   Do not upload location history in the MVP.
-   Explain why background location is required.
-   Provide controls to delete saved places and journey history.
-   Avoid collecting location when no journey is active, except for a
    clearly disclosed feature that requires it.
-   Do not sell or share location data.
-   If cloud sync is introduced later, make it opt-in and document
    retention, access, and deletion behavior.
-   Do not include precise coordinates in crash reports or analytics by
    default.

------------------------------------------------------------------------

## 12. UX states and error handling

The app must handle these states explicitly:

  -----------------------------------------------------------------------
  State/problem                       Required behavior
  ----------------------------------- -----------------------------------
  Location permission denied          Explain impact and provide
                                      retry/settings action

  Background permission missing       Allow browsing; block or clearly
                                      qualify background journey start

  Notifications denied                Explain reduced alert presentation
                                      and offer settings action

  Location services disabled          Show actionable instruction

  GPS unavailable                     Show waiting state; do not pretend
                                      tracking is active

  Poor location accuracy              Show accuracy warning and continue
                                      cautiously

  Stale location                      Show last update time and recovery
                                      state

  No internet                         Keep core features working; disable
                                      online search gracefully

  No offline map                      Keep alarm active; show a simple
                                      destination/status view

  Low battery                         Warn and offer user-controlled
                                      battery-saving option

  Battery restriction suspected       Show manufacturer/system settings
                                      guidance

  App process killed                  Restore state where OS allows;
                                      report interruption if tracking did
                                      not resume

  Device rebooted                     Attempt supported recovery and
                                      verify permissions/service state

  Destination deleted during active   Continue using journey's
  journey                             destination snapshot

  User crosses radius quickly         Trigger on the first reliable
                                      eligible location update

  GPS jitter near radius              Avoid duplicate or oscillating
                                      triggers

  Alarm sound unavailable             Fall back to a bundled sound and
                                      show test/settings guidance
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 13. MVP acceptance criteria

### Saved places

-   User can create, edit, favorite, and delete a place.
-   Place data remains after app restart.
-   A saved place can be selected without internet.
-   Active journeys retain their destination if the original place is
    edited or deleted.

### Journey and alarm

-   User can start, pause, resume, and end a journey.
-   Journey state is persisted locally.
-   Distance is calculated without internet.
-   A configured radius triggers no more than once per alert stage.
-   Alarm can be dismissed and snoozed.
-   The app clearly reports stale or unavailable location.
-   Active tracking is visibly represented to the user.

### Onboarding and permissions

-   Each permission has an explanation before its request.
-   Permissions are requested in context.
-   Denial does not trap the user in onboarding.
-   Permanent denial offers a Settings route.
-   Battery guidance is educational and skippable.
-   Alarm test is available.
-   Readiness is rechecked when starting a journey.

### Offline

-   Airplane mode does not prevent an already-configured journey from
    calculating distance and triggering an alarm, provided device
    location services and required OS permissions remain available.
-   Saved places and settings remain accessible.
-   Online-only functions fail gracefully.

### Battery and background behavior

-   Test on multiple physical Android devices and OS versions.
-   Measure battery drain over short and long journeys.
-   Test screen-off operation.
-   Test Doze and battery saver.
-   Test app process termination and reboot behavior.
-   Test GPS loss and recovery.
-   Document known device-specific limitations.

------------------------------------------------------------------------

## 14. Test plan

Test on physical devices, not only emulators.

### Device/OS coverage

-   At least one Pixel or near-stock Android device.
-   At least one Samsung device.
-   At least one Xiaomi/Redmi/POCO device.
-   Android versions covering the project's supported minimum through
    current release.
-   iOS should be treated as a separate capability-validation effort,
    not assumed to behave like Android.

### Scenario tests

1.  Start a journey with mobile data disabled.
2.  Start a journey, lock the screen, and travel into the trigger
    radius.
3.  Start a journey with battery saver enabled.
4.  Deny foreground location.
5.  Grant foreground but deny background location.
6.  Deny notifications.
7.  Revoke permission while a journey is active.
8.  Disable location services during a journey.
9.  Enter a tunnel and recover GPS afterward.
10. Leave the app in the background for an extended period.
11. Force-stop the app and verify the documented limitation.
12. Reboot the device during an active journey.
13. Trigger near the radius boundary with fluctuating GPS accuracy.
14. Test silent mode, DND, and low volume.
15. Test low battery.
16. Test a long journey to measure battery consumption.

Record: - OS version and device model. - Permission state. - Battery
settings. - GPS accuracy and update intervals. - Time from entering
radius to alert. - Whether the alarm was audible. - Battery percentage
before and after. - Any missed, late, or duplicate triggers.

------------------------------------------------------------------------

## 15. Risks and mitigations

  -----------------------------------------------------------------------
  Risk                    Impact                  Mitigation
  ----------------------- ----------------------- -----------------------
  Android kills           Missed alarm            Foreground service,
  background work                                 persisted state,
                                                  OEM-specific guidance,
                                                  physical-device testing

  Battery drain           User uninstalls app     Adaptive location
                                                  strategy and
                                                  transparent battery
                                                  modes

  Poor GPS accuracy       Early/late alarm        Accuracy-aware trigger
                                                  logic and configurable
                                                  radius

  Notification permission Alert may be less       Contextual onboarding
  denied                  visible                 and readiness check

  DND/silent mode         Sound may not be heard  Alarm test, volume
                                                  guidance, honest
                                                  limitation

  Force-stop              Tracking may stop       Explain limitation;
                                                  recover only when OS
                                                  permits

  Offline map unavailable No map display          Keep alarm engine
                                                  independent of maps

  Map licensing/storage   Cost or compliance      Verify provider terms,
                          issue                   attribution, and
                                                  offline rights

  False passed-stop       User confusion          Treat as advisory, not
  detection                                       guaranteed

  Permission fatigue      Onboarding abandonment  Progressive, contextual
                                                  requests
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 16. Release strategy

### MVP release

Include: - Android app. - Saved places. - Destination picker. - GPS
distance tracking. - Configurable radius. - Audible/vibration alarm. -
Offline operation for active journeys. - Permission onboarding and
battery guidance. - Basic journey history.

### Post-MVP

Consider: - Downloadable offline map regions. - Multiple alert stages. -
Better passed-destination heuristics. - Home-screen widget. - Recurring
commute shortcuts. - Optional encrypted backup/sync. - iOS support after
validating platform constraints. - More detailed battery and reliability
diagnostics.

### Launch quality gate

Do not publicly launch until the team has demonstrated reliable behavior
on a representative set of physical Android devices under screen-off,
offline, battery-saver, and weak-GPS conditions. Publish known
limitations clearly.

------------------------------------------------------------------------

## 17. Product success metrics

Measure product usefulness without collecting unnecessary precise
location data.

-   Journey start completion rate.
-   Percentage of journeys with a successful alert.
-   Median alert delay after entering the configured radius.
-   Missed-alert and duplicate-alert rates from opt-in diagnostics.
-   Battery consumption per hour of active tracking.
-   Saved-place reuse rate.
-   Permission onboarding completion rate.
-   User-reported false alarms.
-   App crashes and interrupted journeys.

The most important metric is **successful, timely alerts per active
journey**, balanced against battery consumption.

------------------------------------------------------------------------

## 18. Open decisions before implementation

The following need to be decided during technical discovery:

1.  Android-only MVP or Android and iOS from the beginning?
2.  Minimum supported Android version?
3.  MapLibre offline map provider and tile licensing?
4.  Whether the first release needs downloadable maps or only offline
    alarm functionality?
5.  Whether alarm sound should use a native Android
    alarm/foreground-service implementation?
6.  Which radius presets and custom limits should be supported?
7.  How long should a journey remain active without a fresh location
    fix?
8.  What battery drain is acceptable for a typical one-hour journey?

**Recommended default:** Ship Android first, make offline GPS alarm
functionality independent of maps, keep all core data local, and
validate background tracking and audible alerts on real devices before
adding advanced features.
