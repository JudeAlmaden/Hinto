# Hinto

Offline-first destination alarm for Android commuters. Pick a stop, set a
radius, and the phone rings when you get close — even with the screen off and
no data. Built with Expo SDK 58, Expo Router and MapLibre.

## Run

```bash
npm install
npx expo start --dev-client   # Metro; needs the dev build installed
```

The app uses native modules (background location, MapLibre, notifications), so
Expo Go is not supported. Builds are made with EAS:

```bash
eas build --profile development --platform android   # dev client
eas build --profile preview --platform android       # standalone APK
```

## Checks

```bash
npm run lint
npx tsc --noEmit
npm test
```

## Layout

- `src/app/` — routes only (tabs, destination, place, journey, alarm, settings).
- `src/components/ui/` — shared primitives (controls, icons, chips, sheets).
- `src/modules/` — domain logic: places, journeys, geofence, location, alarm,
  settings, maps, permissions.
- `src/constants/` — theme tokens, strings, alarm presets.
- `assets/` — logo exports, mascot poses and window artwork.

## Docs

- `.agents/Design.md` — palette, typography, spacing, navigation, mascot rules.
- `CHANGELOG.md` — release history.
- `AGENTS.md` — workflow rules for contributors and agents.
- `docs/archive/` — historical product spec, implementation plan and wireframes.
