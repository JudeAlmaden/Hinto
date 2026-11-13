# Hinto — Screens, Routes & Wireframes

Companion to `IMPLEMENTATION_PLAN.md` and `Hinto-spec.md`. This defines every
screen the MVP needs, which file it lives in, how screens connect, and a
low-fidelity wireframe for each state that has to exist.

Frame convention: `[*]` primary action, `( )` secondary/ghost, `[ ]` selected
chip, `‹` back, `⚙` settings, `…` overflow. Frames are Android-portrait
(360 × 780 dp) and ignore the status bar except where it matters.

---

## 1. Route map

Expo Router, root **Stack** in `src/app/_layout.tsx`; tabs in the `(tabs)`
group with `NativeTabs` (the existing `AppTabs` component, renamed/extended).

| Route file | URL | Screen | Phase |
| --- | --- | --- | --- |
| `src/app/_layout.tsx` | — | Root stack: db provider, theme, alarm deep-link handling | 0 |
| `src/app/(tabs)/_layout.tsx` | — | `NativeTabs`: Home · Places · History · Settings | 0 |
| `src/app/(tabs)/index.tsx` | `/` | **Home** | 7 |
| `src/app/(tabs)/places.tsx` | `/places` | **Places** list | 2 |
| `src/app/(tabs)/history.tsx` | `/history` | **History** list | 8 |
| `src/app/(tabs)/settings.tsx` | `/settings` | **Settings** root | 8 |
| `src/app/place/[id].tsx` | `/place/:id` | **Place detail / edit** | 2 |
| `src/app/place/new.tsx` | `/place/new` | **New place** | 2 |
| `src/app/destination/search.tsx` | `/destination/search` | **Search destination** (online, degrades offline) | 3 |
| `src/app/destination/pin.tsx` | `/destination/pin` | **Map pin picker** | 3 |
| `src/app/journey/new.tsx` | `/journey/new` | **Alarm setup** sheet (radius + confirm) — modal | 7 |
| `src/app/journey/[id].tsx` | `/journey/:id` | **Active journey** | 7 |
| `src/app/journey/[id]/options.tsx` | `/journey/:id/options` | **Journey options** sheet (radius, sound, dev trigger) — modal | 7 |
| `src/app/alarm.tsx` | `/alarm` | **Alarm ringing** — modal, full-bleed | 6 |
| `src/app/alarm-test.tsx` | `/alarm-test` | **Test alarm** (shared by onboarding + settings) | 6 |
| `src/app/history/[id].tsx` | `/history/:id` | **Journey detail** | 8 |
| `src/app/settings/sound.tsx` | `/settings/sound` | **Alarm sound picker** | 8 |
| `src/app/settings/permissions.tsx` | `/settings/permissions` | **Permissions & battery health** | 9 |
| `src/app/settings/diagnostics.tsx` | `/settings/diagnostics` | **Diagnostics log + export** (samples inspector, metrics, crashes) | 5, extended in 8 |
| `src/app/onboarding/_layout.tsx` | — | Onboarding stack (no tabs, no back-swipe) | 9 |
| `src/app/onboarding/welcome.tsx` | `/onboarding/welcome` | **1 · Welcome** | 9 |
| `src/app/onboarding/how-it-works.tsx` | `/onboarding/how-it-works` | **2 · How it works** | 9 |
| `src/app/onboarding/location.tsx` | `/onboarding/location` | **3 · Location permission** | 9 |
| `src/app/onboarding/background.tsx` | `/onboarding/background` | **4 · Background location** | 9 |
| `src/app/onboarding/notifications.tsx` | `/onboarding/notifications` | **5 · Notifications** | 9 |
| `src/app/onboarding/battery.tsx` | `/onboarding/battery` | **6 · Battery guidance** | 9 |
| `src/app/onboarding/alarm-test.tsx` | `/onboarding/alarm-test` | **7 · Alarm test** | 9 |
| `src/app/onboarding/ready.tsx` | `/onboarding/ready` | **8 · Ready summary** | 9 |

**Count:** 25 screens — 4 tabs, 13 task screens, 8 onboarding — plus three
layout files (root stack, tab layout, onboarding stack).

Explicitly **not** in the MVP (spec §2, §16): map download manager, account or
sync screens, live vehicle tracking, turn-by-turn navigation, onboarding
"help/article" screens beyond the eight above.

---

## 2. Navigation map

```
                    ┌──────────────── welcome ────────────────┐
                    │ how-it-works → location → background →  │
                    │ notifications → battery → alarm-test →  │
                    │ ready ─────────────────────────────────┐ │
                    └───────────────────────────────────────┼─┘
                                                            ▼
   ┌──────────────────────── (tabs) ─────────────────────────────┐
   │                                                             │
   │  Home ──┬── destination/search ──┐                          │
   │         ├── destination/pin ─────┤                          │
   │         ├── journey/new ◀────────┘   (modal: radius+confirm)│
   │         ├── journey/[id]  ◀── started                       │
   │         ├── place/new                                       │
   │         └── alarm-test                                      │
   │                                                             │
   │  Places ──┬── place/new                                     │
   │           └── place/[id]                                    │
   │                                                             │
   │  History ── history/[id]                                    │
   │                                                             │
   │  Settings ─┬── settings/sound                               │
   │            ├── settings/permissions                         │
   │            ├── settings/diagnostics                         │
   │            ├── alarm-test                                   │
   │            └── onboarding/* (replay)                        │
   └─────────────────────────────────────────────────────────────┘

   anywhere ──(notification tap / deep link hinto://alarm)──▶ /alarm
   /alarm ──dismiss|end──▶ history/[id] ──▶ history (list)
```

Rules:

- `/alarm` is a **modal above everything**, reachable from a notification, a
  cold start, or the running app, and it must render from a cold start with no
  journey screen behind it. When the process was killed the notification itself
  is the alert (D1); this screen appears on tap and starts the audio loop — it
  is not what makes the alert audible in that case.
- Starting a journey always goes through `/journey/new` so the radius is
  confirmed once, per journey.
- Leaving `/journey/[id]` while active is allowed (it returns to the Home
  card); ending it is explicit.
- `⚙` on the journey screen opens `/journey/:id/options` as a sheet — never a
  tab, and never a dead end: changing the radius re-writes the primary
  `journey_alert_rules` row for the running journey.
- Onboarding is skippable after screen 2 except the location screen, which can
  be deferred but then marks Home's readiness indicator red.

---

## 3. Shared shell & components

Existing: `ThemedText`, `ThemedView`, `HintRow`, `AnimatedIcon`, `AppTabs`,
`Colors`/`Spacing`/`Fonts` (`src/constants/theme.ts`), `use-theme`,
`use-color-scheme`.

To add (`src/components/`):

| Component | Used by | Notes |
| --- | --- | --- |
| `Screen` | all | SafeArea + `MaxContentWidth` + bottom inset (`BottomTabInset`) |
| `Header` | detail screens | title, `‹` back, optional right action |
| `PrimaryButton` / `SecondaryButton` | all | 52 dp tall, disabled + loading states |
| `PlaceCard` | Home, Places, search | icon tile, name, category, distance from you |
| `PlaceIcon` | everywhere | category → glyph + colour, resolves custom colours |
| `CategoryChips` | Places, place edit | home / school / work / terminal / other |
| `RadiusSlider` + `RadiusPresets` | journey/new, place edit, settings default-radius picker | presets 5 km · 3 km · 1 km · 500 m · custom |
| `StatusPill` | Home, journey, permissions | tracking / waiting / paused / stale / offline |
| `AccuracyMeter` | journey, alarm | 3-segment accuracy bar + metres |
| `ReadinessChecklist` | Home, ready, journey/new | rows with ✓ / ! / ✕ and fix actions |
| `JourneyCard` | Home | active journey summary + pause/end |
| `EmptyState` | Places, History, search | illustration slot, one CTA |
| `Sheet` | journey/new, journey options, confirms | bottom sheet with dimmed backdrop |
| `ConfirmDialog` | delete place, clear history, end journey | destructive styling |
| `AlarmButton` | alarm | 88 dp circular, hold-to-confirm option |

Theme additions (`src/constants/theme.ts`): `accent` (brand blue `#208AEF`),
`accentText`, `danger` (`#E5484D`), `warning` (`#F5A623`), `success`
(`#30A46C`), `tracking` (green), `stale` (amber). Every colour needs a light
and dark value — the file is already keyed that way.

---

## 4. Wireframes

### 4.1 Home — no active journey

```
┌─ Home ────────────────────────────────────
│  Hinto                        ⚙
│  Gising bago lumagpas.
│
│  ┌ 🔍  Where are you going? ─────────┐
│  └───────────────────────────────────┘
│
│  ! Location off — Hinto can't alert you
│    (Fix)                              ← readiness strip, only when broken
│
│  SAVED                         See all
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐
│  │ 🏠 │ │ 🏫 │ │ 🏢 │ │ 🚌 │
│  │Home│ │Schl│ │Work│ │Term│
│  └────┘ └────┘ └────┘ └────┘
│
│  RECENT
│  • SM North EDSA          yesterday  ›
│  • Cubao MRT              2 days ago ›
│
│  ○ Offline — GPS still works
├─ Home ── Places ── History ── Settings ─
```

Calls to action: search field → `/destination/search`; a saved/recent row →
`/journey/new`; `Fix` → `settings/permissions`.

### 4.2 Home — active journey

```
┌─ Home ────────────────────────────────────
│  Hinto                        ⚙
│
│  ┌─ ● TRACKING ────────────────────────┐   ← green; whole card tappable
│  │  Home · Fairview                    │
│  │                                     │
│  │       12.4 km        ±18 m          │
│  │       to go          accuracy       │
│  │                                     │
│  │  alert at 1.0 km   updated 4s ago   │
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░              │   ← progress to radius
│  │                                     │
│  │  ( Pause )              ( End )     │
│  └─────────────────────────────────────┘
│
│  Start another journey          disabled
│
│  SAVED                         See all
│  [ Home ] [ School ] [ Work ]
├─ Home ── Places ── History ── Settings ─
```

Variants of the same card — same layout, different pill + copy:

| State | Pill | Third line |
| --- | --- | --- |
| Waiting for fix | `◌ WAITING FOR GPS` (grey) | `No usable fix yet · last seen 40s ago` |
| Stale | `! STALE` (amber) | `Last update 2m 10s ago — trying to recover` |
| Paused | `‖ PAUSED` (slate) | `Alarm is off while paused` + `( Resume )` |
| Low battery | `! LOW BATTERY 12%` (amber) | `Turn on battery-saving mode?` inline link |

### 4.3 Destination search

```
┌─ ‹  Destination ──────────────────────────
│  ┌ 🔍  Cubao ─────────────────── ✕ ┐
│  └──────────────────────────────────┘
│
│  RESULTS
│  • Cubao MRT-3 Station        1.2 km ›
│    Araneta City, Quezon City         ← secondary line
│  • Cubao Expo                 1.6 km ›
│  • Cubao, Quezon City (area)  1.9 km ›
│
│  ⓘ Search needs internet · saved places work offline
│  Search by Photon · OpenStreetMap
│
│  ( Drop a pin on the map )
├──────────────────────────────────────────
```

Offline variant (`netinfo` says no connection): hide the results list entirely
and show

```
│  ⚠ You're offline — place search needs internet.
│    Saved places and GPS still work.
│
│  SAVED PLACES
│  • Home                    Fairview  ›
│  • School                  Diliman   ›
```

Selecting a result captures its name and coordinates immediately (D17), so the
destination never needs the network again — not to save it, not to start, not
to alert.

Loading: 3 skeleton rows. Error: one-line message + `( Retry )`.

### 4.4 Map pin picker

```
┌─ ‹  Pin destination ──────────────────────
│ ┌────────────────────────────────────────┐
│ │                        📍              │  ← tap to place / drag marker
│ │        ╭──────────╮                    │
│ │        │ 12 m     │  Google Maps       │
│ │        ╰──────────╯                    │
│ └────────────────────────────────────────┘
│  Pin: 14.6760, 121.0437                  
│  ┌──────────────────────────────────────┐
│  │            Use this point            │
│  └──────────────────────────────────────┘
│  ( Name this place )    ← saves then continues
├──────────────────────────────────────────
```

Per decision D3 the map is `expo-maps` (`GoogleMaps.View`): a tap places the
marker and `Use this point` confirms. No API key configured → the same screen
with coordinate entry and a note. Tile failure → grey placeholder, coordinate
readout, `( Retry map )`; the coordinate path still works.

Naming is best-effort (D17): the label defaults to `Dropped pin · 14.6760,
121.0437` and reverse geocoding only suggests a nicer one, so a pin dropped
with no signal can still be saved and used as a destination.

### 4.5 Alarm setup (modal, `/journey/new`)

```
        ( dimmed home behind )
┌─ Alert me before I get there ─────────────
│  Home · Fairview                          │
│  14.6760, 121.0437                        │
│                                           │
│  Alert distance                           │
│  ┌───────┐ ┌──────┐ ┌──────┐ ┌─────┐      │
│  │ 5 km  │ │ 3 km │ │[1 km]│ │500 m│      │
│  └───────┘ └──────┘ └──────┘ └─────┘      │
│  ──────────●──────────────────  custom    │
│                                           │
│  You'll be alerted 1.0 km before arriving │
│  ⚠ A 500 m alert may be missed if GPS     │
│    accuracy is poor.                      │
│                                           │
│  ( Add an earlier warning )   3 km  +     │
│                                           │
│  ┌─────────────────────────────────────┐  │
│  │      Start journey   →              │  │
│  └─────────────────────────────────────┘  │
└───────────────────────────────────────────
```

Blocked state: when background permission or location services are missing,
`Start journey` becomes `( Enable background location )` with a checklist
above it — never a silent start.

### 4.6 Active journey

```
┌─ ‹  Journey ───────────────────────── ⚙
│
│        Home · Fairview
│        14.6760, 121.0437
│
│        ┌───────────────┐
│        │    12.4 km    │
│        │    to go      │
│        └───────────────┘
│
│   ● TRACKING              ▮▮▯  ±18 m
│   updated 4 seconds ago
│
│   ┌─ progress ─────────────────────────┐
│   │▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░  1.0 km     │
│   └────────────────────────────────────┘
│
│   Battery 68%   ·   Offline
│
│   ┌───────────┐  ┌───────────┐
│   │  Pause    │  │   End     │
│   └───────────┘  └───────────┘
│
│   Keep Hinto running. If you force-stop the
│   app, alerts may stop.                   ← disclaimer, small type
└───────────────────────────────────────────
```

`⚙` opens the journey options sheet (change radius, change sound, and the
`__DEV__` simulate trigger).
End → `ConfirmDialog` "End this journey? You won't be alerted." →
`history/[id]`.

### 4.7 Alarm ringing (`/alarm`, full-bleed, above tabs)

```
┌───────────────────────────────────────────
│
│           ⏰  YOU'RE CLOSE
│
│              Home
│            450 m away
│
│         ▓▓▓▓▓▓▓▓▓▓░░  (pulsing ring)
│
│
│   ┌─────────────────────────────────────┐
│   │   I'm awake · End  (hold 1.5 s)     │   ← primary, hold-to-confirm
│   └─────────────────────────────────────┘
│
│   ┌─────────────────────────────────────┐
│   │        Snooze 5 min                 │
│   └─────────────────────────────────────┘
│
│        ( Dismiss alarm )                  ← quiet, requires confirm
│
│   Silent mode or DND may reduce volume.
└───────────────────────────────────────────
```

- Hold-to-confirm on the primary button when "prevent accidental dismissal"
  is on (settings).
- Snoozed state: same screen collapses to a "Snoozed until 14:32 · ( Wake now )"
  card; the journey stays `triggered` with `snoozed_until` set on the alert
  row, and the deadline is shown on Home.
- No back gesture; hardware back is ignored while ringing.

### 4.8 Places

```
┌─ Places ─────────────────────────────  +  ┐
│  ┌ 🔍  Search places ─────────────────┐   │
│  └────────────────────────────────────┘   │
│  [All] (Home) (School) (Work) (Term) (Other)
│                                           │
│  ★ FAVOURITES
│  ┌──┐ Home                   1 km    ›
│  │🏠│ Fairview · Home               ⋮
│  └──┘
│  ┌──┐ School                 3 km    ›
│  │🏫│ UP Diliman · School           ⋮
│  └──┘
│  ALL PLACES
│  ┌──┐ Work                   1 km    ›
│  │🏢│ BGC · Work                   ⋮
│  └──┘
├─ Home ── Places ── History ── Settings ─
```

`⋮` → duplicate / edit / delete / "start journey". Empty state: "No saved
places yet — save the stops you use often." + `[*] Add a place`.

### 4.9 Place detail / edit

```
┌─ ‹  Edit place ─────────────── ( Save )
│  ┌────┐
│  │ 🏠 │   ( Change icon )
│  └────┘
│
│  Name
│  ┌──────────────────────────────────┐
│  │ Home                             │
│  └──────────────────────────────────┘
│
│  Category
│  [Home] (School) (Work) (Terminal) (Other)
│
│  Location            14.6760, 121.0437
│  ( Move pin on map )
│
│  Default alert distance
│  [5 km] [3 km] [1 km] [500 m] ──●──
│
│  ★ Favourite                      ⟨ ●  ⟩
│
│  ( Duplicate )        ( Delete )   ← danger text
└───────────────────────────────────────────
```

Delete → `ConfirmDialog` "Delete Home? Active journeys keep their saved
destination." (spec: snapshot preserved).

New place = same screen, title "New place", empty fields, `Save` disabled
until name + coordinates exist.

### 4.10 History

```
┌─ History ──────────────────────────────  ⋯
│  This week · 4 journeys · 1 alert
│
│  TODAY
│  ┌────────────────────────────────────┐
│  │ ● Home · Fairview        14:02     │
│  │   alerted 1.0 km · dismissed       │
│  │   24 min · ended at 300 m      ›   │
│  └────────────────────────────────────┘
│  ┌────────────────────────────────────┐
│  │ ◌ Work · BGC             08:15     │
│  │   no alert · ended manually        │
│  │   31 min · ended at 80 m        ›  │
│  └────────────────────────────────────┘
│  YESTERDAY
│  ┌────────────────────────────────────┐
│  │ ! School · Diliman       17:40     │
│  │   interrupted · stale GPS          │
│  └────────────────────────────────────┘
├─ Home ── Places ── History ── Settings ─
```

`⋯` → "Clear history" → `ConfirmDialog` (irreversible, deletes journey rows
only). Empty: "No journeys yet." + `[*] Plan a journey` → Home.

Journey detail (`history/[id]`): destination snapshot, started/ended,
duration, configured radius, trigger distance + time, dismissed vs snoozed vs
not triggered, final distance, and a short diagnostics excerpt for that
journey. No map, no coordinates beyond the snapshot.

### 4.11 Settings

```
┌─ Settings ────────────────────────────────
│  PLANNING
│  Default alert distance            1 km  ›
│  Alarm sound              Classic chime  ›
│  Vibration                        ⟨ ●  ⟩
│  Repeat until dismissed           ⟨ ●  ⟩
│  Snooze duration                  5 min  ›
│  Prevent accidental dismissal     ⟨ ●  ⟩
│
│  RELIABILITY
│  Permissions & battery         2 issues  ›
│  Test alarm                              ›
│  Battery-saving mode              ⟨ ○  ⟩
│  Diagnostics                             ›
│
│  DISPLAY
│  Distance unit              Kilometres  ›
│
│  DATA
│  Clear journey history                   ›
│  Delete all data                         ›
│  Reset local data (repair database)      ›
│
│  Onboarding                      Replay  ›
│  Hinto 0.0.0
├─ Home ── Places ── History ── Settings ─
```

Sub-screens:

- **Alarm sound** — list with play-on-tap previews, check on the selected
  file, "Custom sound" row explaining bundled-only support if none.
- **Permissions & battery** — three rows (foreground, background, notifications)
  each with `Granted` / `Denied` / `Not asked` + `( Open settings )`; location
  services row; battery optimisation row with manufacturer hint; "battery
  restrictions suspected" warning when diagnostics indicate it.
- **Diagnostics** — reverse-chronological event list (type, time, non-sensitive
  metadata), `( Copy )` / `( Share )`, `( Clear log )`; copy states explicitly
  that coordinates are excluded by default.

### 4.12 Onboarding — welcome

```
┌───────────────────────────────────────────
│                                     (Skip)
│
│              ◉  (Hinto mark)
│
│                  Hinto
│
│         Gising bago lumagpas.
│
│   Choose your destination. Hinto alerts
│   you as you get close — even with the
│   screen off.
│
│
│   ┌─────────────────────────────────────┐
│   │           Get started               │
│   └─────────────────────────────────────┘
│        ( How it works )
│
│              ● ○ ○ ○ ○ ○ ○ ○
└───────────────────────────────────────────
```

### 4.13 Onboarding — how it works

```
┌─ ‹ ───────────────────────────────────────
│
│   Three steps, then you can sleep.
│
│   1  Choose or save a destination
│      ┌ 🔍 Search or pick a place ┐
│
│   2  Set how far away to alert
│      [5 km] [3 km] [1 km] [500 m]
│
│   3  Start, lock your phone, rest
│      ● TRACKING · 12.4 km to go
│
│   ⓘ GPS works without mobile data.
│     Accuracy depends on your phone.
│
│   ┌─────────────────────────────────────┐
│   │             Continue                │
│   └─────────────────────────────────────┘
│              ● ● ○ ○ ○ ○ ○ ○
└───────────────────────────────────────────
```

### 4.14 Onboarding — permission education (shared layout)

Used by `location`, `background`, `notifications` with different copy/icons.

```
┌─ ‹ ───────────────────────────────────────
│
│                  📍
│
│   Hinto needs your location
│
│   It calculates how close you are to your
│   destination, including while your
│   screen is off.
│
│   ⓘ Only while a journey is running.
│
│   ┌─────────────────────────────────────┐
│   │        Allow location               │
│   └─────────────────────────────────────┘
│        ( Not now )
│
│              ● ● ● ○ ○ ○ ○ ○
└───────────────────────────────────────────
```

Denied / blocked variant of the same screen:

```
│   Location is off
│
│   Without it, Hinto can't measure distance
│   or alert you.
│
│   ┌─────────────────────────────────────┐
│   │        Open settings                │
│   └─────────────────────────────────────┘
│        ( Try again )        ( Skip for now )
```

Background screen adds: "Android may ask you to choose **Allow all the time**
in Settings" and a `( Open app settings )` button; notifications screen adds
the honest note "Without notifications, an alert may be less visible."

### 4.15 Onboarding — battery guidance

```
┌─ ‹ ───────────────────────────────────────
│                  🔋
│
│   Keep Hinto awake on long trips
│
│   Some phones limit background apps to
│   save battery. That can delay or stop
│   location updates.
│
│   ┌ Detected: Xiaomi / Redmi ──────────┐
│   │ Settings › Apps › Hinto ›          │
│   │ Battery saver → No restrictions    │
│   └────────────────────────────────────┘
│
│   ( Open battery settings )
│   ( I'll do this later )
│
│              ● ● ● ● ● ● ○ ○
└───────────────────────────────────────────
```

Copy must state the trade-off ("this may use more battery") and never promise
guaranteed delivery.

### 4.16 Onboarding — alarm test + ready

```
┌─ ‹ ───────────────────────────────────────
│   Test your alarm
│
│   ┌─────────────────────────────────────┐
│   │         Play test alarm             │
│   └─────────────────────────────────────┘
│   Volume  — set by your device, not Hinto
│   Vibration  ✓ fired
│
│   Silent mode, DND, and low volume can
│   make the alarm quieter.
│
│   ( Alarm didn't play? Fix sound )
│
│   ┌─────────────────────────────────────┐
│   │             Continue                │
│   └─────────────────────────────────────┘
└───────────────────────────────────────────
```

```
┌─ ‹ ───────────────────────────────────────
│   You're set up
│
│   ✓ Location            granted
│   ✓ Background location  granted
│   ✓ Notifications        granted
│   ! Battery guidance     not reviewed   ›
│   ✓ Alarm test           completed
│
│   You can change any of this later in
│   Settings.
│
│   ┌─────────────────────────────────────┐
│   │        Start using Hinto            │
│   └─────────────────────────────────────┘
│        ( Review battery settings )
└───────────────────────────────────────────
```

Incomplete rows use `!` (amber) and are tappable to jump back; nothing blocks
completion.

---

## 5. State matrix (what every list/detail screen must handle)

| Screen | Empty | Loading | Offline | Permission missing | Error |
| --- | --- | --- | --- | --- | --- |
| Home | no recents → hide section | skeleton card | "GPS still works" strip | readiness strip + Fix | retry card |
| Search | "No matches" | 3 skeletons | offline explainer + saved places | n/a | inline message + Retry |
| Pin picker | n/a | tile spinner | grey placeholder + coords | location gate | tile failure + Retry |
| Places | "Add your first place" | list skeleton | fine (local) | n/a | row-level retry |
| Place edit | n/a | n/a | fine | n/a | validation inline |
| Journey setup | n/a | n/a | fine | blocked Start + checklist | toast |
| Active journey | n/a | n/a | offline chip only | tracking blocked banner | stale warning + recover |
| Alarm | n/a | n/a | fine | n/a | sound fallback notice |
| History | "No journeys yet" | skeleton | fine | n/a | clear-all confirm only |
| Settings | n/a | n/a | fine | issue count on row | n/a |
| Onboarding | n/a | n/a | fine | denied variants | inline retry |

## 6. Copy rules (used across all frames)

- Name the app **Hinto** everywhere; never "Abot".
- Never say "guaranteed", "always", or that GPS equals internet.
- Distinguish "tracking" from "waiting for a GPS fix" in every status surface.
- Denials explain impact, then offer retry and Settings — never loop a system
  prompt.
- Destructive actions are named plainly ("Delete place", "Clear history") and
  confirm what is and isn't removed.
