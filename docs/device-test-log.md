# Hinto — Device Test Log

Companion to `IMPLEMENTATION_PLAN.md` (D11) and `Hinto-spec.md` §14.

Rules for this file:

- A scenario is **PASS** only with a physical-device row. Emulator results do
  not count (spec §14).
- Record the fields §14 asks for: OS version and device model, permission
  state, battery settings, GPS accuracy and update intervals, time from
  entering the radius to alert, whether the alarm was audible, battery
  percentage before and after, and any missed / late / duplicate triggers.
- **BLOCKED** means the build could not exercise the scenario; say why.
- Known limitations go at the bottom, once, not repeated per device.

Required coverage (spec §14): at least one near-stock Android (Pixel), one
Samsung, one Xiaomi/Redmi/POCO, spanning the supported minimum Android version
through current.

---

## Device matrix

| Device | Model code | Android | Build (EAS id / commit) | Dev build? | Tester | Date |
| --- | --- | --- | --- | --- | --- | --- |
| Pixel (near-stock) | | | | | | |
| Samsung | | | | | | |
| Xiaomi / Redmi / POCO | | | | | | |

---

## 1. Pixel — _fill in model + Android version_

Permission state at start of run: foreground `_`, background `_`,
notifications `_`. Battery settings: `_`. Location mode: `_`.

| # | Scenario (spec §14) | Result | Time to alert | Audible | Y/N | Accuracy (m) | Update interval | Battery before → after | Missed / late / dup | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Start a journey with mobile data disabled | | | | | | | | | |
| 2 | Start a journey, lock the screen, travel into the trigger radius | | | | | | | | | |
| 3 | Start a journey with battery saver enabled | | | | | | | | | |
| 4 | Deny foreground location | | | | | | | | | |
| 5 | Grant foreground, deny background location | | | | | | | | | |
| 6 | Deny notifications | | | | | | | | | |
| 7 | Revoke permission while a journey is active | | | | | | | | | |
| 8 | Disable location services during a journey | | | | | | | | | |
| 9 | Enter a tunnel and recover GPS afterwards | | | | | | | | | |
| 10 | Leave the app in the background for an extended period | | | | | | | | | |
| 11 | Force-stop the app; verify the documented limitation | | | | | | | | | |
| 12 | Reboot the device during an active journey | | | | | | | | | |
| 13 | Trigger near the radius boundary with fluctuating accuracy | | | | | | | | | |
| 14 | Silent mode, DND and low volume | | | | | | | | | |
| 15 | Low battery | | | | | | | | | |
| 16 | Long journey to measure battery consumption | | | | | | | | | |

Scenario-specific things to confirm (beyond the generic fields):

- **2** — exactly one alert while remaining inside the radius; alarm screen
  reachable from the notification; dismiss and snooze both work.
- **4/5** — the app stays usable; starting a journey shows the readiness
  checklist instead of a silent start; permanent denial offers Settings.
- **7/8** — Home flips to a warning state within one update interval and never
  claims tracking is active.
- **11** — force-stop produces the documented behaviour; no fake "tracking".
- **12** — after reboot the journey is `interrupted` with a resume prompt
  (D2), and no tracking is claimed before the user acts.
- **13** — no duplicate alerts from jitter; overshoot, if shown, is labelled an
  estimate.
- **16** — record battery % at start and end plus elapsed time so D9's
  battery-per-hour metric can be compared against the device log.

---

## 2. Samsung — _fill in model + Android version_

Copy the table above and fill it in. Note any Samsung-specific battery setting
("Put app to sleep", "Deep sleeping apps") that was active during the run.

Permission state: `_`. Battery settings: `_`.

| # | Scenario | Result | Time to alert | Audible | Accuracy (m) | Update interval | Battery before → after | Missed / late / dup | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1–16 | _copy rows from section 1_ | | | | | | | | |

---

## 3. Xiaomi / Redmi / POCO — _fill in model + Android version_

Copy the table from section 1. Record the exact MIUI/HyperOS battery settings
used ("No restrictions" vs "Battery saver"), since this is the device class most
likely to expose D7's restriction heuristic.

Permission state: `_`. Battery settings: `_`.

| # | Scenario | Result | Time to alert | Audible | Accuracy (m) | Update interval | Battery before → after | Missed / late / dup | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1–16 | _copy rows from section 1_ | | | | | | | | |

---

## Known limitations (published with the release)

_Record only limitations demonstrated on a device, with the device class and
Android version. These feed the launch disclosures in spec §16._

- Force-stopping the app stops tracking until it is opened again.
- Tracking does not resume automatically after a reboot; the app reports the
  interruption and asks the user to resume (D2).
- Silent mode, Do Not Disturb and low media/alarm volume can reduce or suppress
  the alert depending on the device.
- GPS accuracy indoors, in tunnels and between tall buildings can delay or
  widen the trigger radius.
- Battery-optimisation settings on some manufacturers can delay or stop
  background location updates even with a foreground service running.

---

## Sign-off

Phase 10 cannot close until every row above is **PASS** or an explicitly
accepted limitation, for every device in the matrix.

| Role | Name | Date |
| --- | --- | --- |
| Android test lead | | |
| Product | | |
