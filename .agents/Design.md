# Hinto — Expo App Design System

**Product:** Hinto  
**Tagline:** Gising bago lumagpas.  
**Platform:** Android  
**Framework:** React Native + Expo (SDK 58)  
**Design direction:** Warm, minimal, practical, commuter-focused

**Implementation status (v0.6.4)**

This document is the source of truth, and it is wired into the app:

- Palette lives in `src/constants/theme.ts` as `Colors.light` / `Colors.dark`;
  both themes ship, dark is the default when the phone is in dark mode.
- Plus Jakarta Sans (400/500/600/700/800) is loaded in `src/app/_layout.tsx` and
  resolved by weight in `ThemedText`.
- Spacing and radii are the tokens in `theme.ts`; screens must not hard-code
  hex values.
- Interface icons are Ionicons via `components/ui/icon.tsx`; place icons are
  Ionicons names stored per place (`places.icon`), with the tag default — see §5.
- Home's header carries a light/dark toggle that writes the `appearance`
  setting (`system` / `light` / `dark`).
- Wordmark renders in the Home header via `Screen logo`, using
  `logo-light.png`/`logo-dark.png`; mascot poses live in `assets/mascot/`.
- Mascot poses and expressions render through `components/ui/mascot.tsx` using
  typed pose/expression keys (e.g. `hero`, `greeting`, `waiting`, `tracking`,
  `arrived`, `alarm`, `empty`, `interrupted`) — see §12.

---

## 1. Design Philosophy

Hinto should feel like a dependable everyday utility, not a complicated navigation application.

The interface should be:

- **Simple:** Show only information relevant to the current task.
- **Readable:** Important information should be easy to understand at a glance.
- **Comfortable:** Use warm, light surfaces instead of harsh whites.
- **Functional:** Prioritize destination selection, journey monitoring, and alarm controls.
- **Consistent:** Reuse the same spacing, colors, typography, and component styles throughout the app.

Avoid excessive cards, gradients, shadows, decorative illustrations, and unnecessary animations.

## 2. Color Palette

### Primary palette — Warm Daylight (Light Theme)

Tokens exported via `Colors.light` in `src/constants/theme.ts`:

| Token Key | Hex | Semantic Role & Usage |
|---|---|---|
| `background` | `#FAF7F0` | Main application background (warm cream) |
| `backgroundElement` | `#FFFFFF` | Cards, bottom sheets, input fields, and surfaces |
| `backgroundSelected` | `#EAE5DA` | Secondary containers, selection pills, subtle backgrounds |
| `border` | `#E4DED2` | Dividers, outlines, input borders |
| `text` | `#2F4152` | Headings and primary text (deep slate/blue-gray) |
| `textSecondary` | `#6E8490` | Descriptions, captions, and supporting text |
| `accent` | `#D99A43` | Primary amber — main actions, active states, highlights |
| `accentText` | `#2B1B06` | Text rendered on top of amber accent surfaces |
| `accentSoft` | `#F7ECD9` | Soft amber container tint for selected tiles / cards |
| `accentBorder` | `#E8D5B4` | Amber border outline for active/selected containers |
| `danger` | `#C0503B` | Coral/red — alarms, destructive actions, urgent alerts |
| `warning` | `#9A5B00` | Warning badges and caution states |
| `success` | `#3F7F6B` | Sage green — GPS active, successful arrival, safe states |

### Saved Place Colors

Soft pastel tints used for saved-place icon tiles (`PlaceColors` in `theme.ts`):
`#F6D9B0`, `#CFE5DD`, `#F3C9BF`, `#D8DEEC`, `#EDE3D2`.

### Semantic colors

Use colors according to their meaning rather than their visual appeal.

- **Primary amber (`accent`):** Main actions and selected destinations.
- **Coral / Alert (`danger`):** Alarm notifications, urgent warnings, and critical actions.
- **Sage green (`success`):** GPS active, successful arrival, and normal operating states.
- **Blue-gray (`text` / `textSecondary`):** General typography and neutral information.

Do not use coral as a general accent. It should remain visually associated with alerts.

### Color usage guidelines

- Use the warm background for the main screen.
- Use white surfaces for content that needs separation.
- Use amber sparingly for important interactive elements.
- Keep body text dark blue-gray for readability.
- Avoid using multiple bright colors in the same section.
- Never communicate status through color alone; include labels or icons.

## 3. Typography

### Font family

**Primary:** Plus Jakarta Sans

Use Plus Jakarta Sans throughout the application for a consistent, modern appearance.

Recommended Expo package:

`@expo-google-fonts/plus-jakarta-sans`

Use `useFonts` from `expo-font` to load the font before displaying the main application.

### Font weights

| Weight | Usage |
|---|---|
| Regular (400) | Body text and descriptions |
| Medium (500) | Secondary labels and input text |
| SemiBold (600) | Buttons, section headings, navigation |
| Bold (700) | Screen titles and important values |
| ExtraBold (800) | Large destination and alarm text, used sparingly |

### Type scale

| Style | Size | Weight | Usage |
|---|---:|---|---|
| Display | 36 | Bold | Large alarm or destination text |
| Heading 1 | 28 | Bold | Main screen headings |
| Heading 2 | 22 | SemiBold | Section titles |
| Heading 3 | 18 | SemiBold | Card titles |
| Body Large | 16 | Regular | Important descriptions |
| Body | 14 | Regular | General content |
| Label | 13 | Medium | Supporting labels |
| Caption | 12 | Medium | Metadata and timestamps |
| Small | 11 | Medium | Secondary metadata only |

### Typography guidelines

- Use sentence case instead of excessive uppercase text.
- Avoid using too many different font sizes on one screen.
- Use bold text to establish hierarchy, not to emphasize everything.
- Keep descriptions short and readable.
- Use tabular or monospaced numerals for changing distance and time values when practical.

## 4. Spacing and Layout

Use a consistent 4-point spacing system. Always import `Spacing` from
`constants/theme`; never hard-code a number in a screen.

| Token | Value | Use for |
|---|---:|---|
| `Spacing.half` | 2 | Icon/label nudges only |
| `Spacing.one` | 4 | Tight stacks inside a row or label |
| `Spacing.two` | 8 | Related elements (icon ↔ text, card actions) |
| `Spacing.three` | 16 | Standard padding and card interiors |
| `Spacing.four` | 24 | Gap between major sections on a screen |
| `Spacing.five` | 32 | Empty-state and hero breathing room |
| `Spacing.six` | 64 | Illustration/hero sizing, rarely layout |

Radii come from `Radii`: `small` 8, `medium` 12, `large` 18, `pill` 999.

### Layout utilities

`components/ui/layout.tsx` gives Tailwind-like props on top of the tokens, so
screens stop repeating flex boilerplate in `StyleSheet.create`:

```tsx
<Row gap="three" pt="two">
  <PlaceIcon size={64} />
  <Stack gap="half" flex>
    <ThemedText style={styles.name}>{place.name}</ThemedText>
    <ThemedText type="small">{category}</ThemedText>
  </Stack>
</Row>
```

- `Box` — the primitive: `p`, `px`, `py`, `pt`, `pb`, `pl`, `pr`, `gap`, `row`,
  `center`, `between`, `wrap`, `align`, `justify`, `flex`, `bg`, `border`,
  `borderColor`, `rounded`.
- `Stack` — column; `Row` — row, vertically centred by default; `Spacer` —
  `flex: 1` filler inside a row.
- Spacing and radius props take a token key (`"three"`) or a raw value (`16`).
  Colours take a palette key (`"accentSoft"`) or a literal hex.
- Use them for structure and spacing; keep component-specific styling (type,
  borders on a specific card, animations) in that component's own style.

### Layout guidelines

- Screen gutters are owned by `Screen` (`Spacing.three`), not by screens. Screens
  add vertical rhythm only; never re-pad the left/right edge.
- Use `gap` on a parent for spacing between siblings. Only use `margin` when a
  single child has to break the rhythm (for example a full-bleed strip).
- 8 px between related elements, 24 px between sections, 32 px above a hero.
- Content is capped at `MaxContentWidth` (800) and centred; do not widen it.
- Keep one alignment edge per screen. Rows inside cards left-align to the same
  gutter; do not centre one label and left-align the next.
- Avoid filling every available space with cards. A section that has nothing to
  say stays empty rather than growing a container.
- Respect Android status bar, navigation bar, and safe-area insets. Bottom
  content in a tab screen must clear `BottomTabInset`.
- Make layouts responsive across common Android screen sizes; wrap long text
  with `numberOfLines` rather than shrinking the type scale.

### Card padding (common bug)

The shared `Card` in `components/ui/controls.tsx` sets **horizontal padding only**
(`Spacing.three`). It deliberately has no vertical padding because cards vary
from a one-line row to a hero. So every `Card` usage must supply its own
`paddingVertical`:

- One-line row or strip: `Spacing.three` (16).
- Card with a title plus body: `Spacing.three`, with `gap: Spacing.two`.
- Hero or celebration card: `Spacing.four` (24), `gap: Spacing.three`.

A card whose first child touches the top border is missing `paddingVertical`; it
is never a reason to add margin to the child or to change the shared style.
Keep the horizontal gutter equal to the vertical one on hero cards so the
content reads as sitting inside a frame.

### Positioning

- Prefer normal flow (`flexDirection`, `gap`, `alignItems`) over offsets. Use
  `alignSelf` before `margin`, and `margin` before absolute coordinates.
- Absolute positioning is reserved for overlays that must not affect layout:
  floating tab bar, map pin and map controls, the alarm's takeover surface.
  Anything absolute needs explicit safe-area offsets and must not cover the
  primary action.
- Fixed elements at the bottom (action bars, sheets) sit above
  `BottomTabInset` on tab screens and inside `SafeAreaView` elsewhere.
- Anchored popovers (`MoreMenu`) open toward the screen centre, not past the
  edge; keep at least a `Spacing.three` inset from the viewport.
- Text next to an icon is vertically centred with the icon's optical centre, not
  its bounding box: use `alignItems: 'center'` on the row, and keep the icon in a
  fixed-size wrapper so different icon shapes do not shift the label.

### Border radius

These are the only radii in `Radii`; do not invent intermediate values.

| Token | Value | Usage |
|---|---:|---|
| `Radii.small` | 8 | Inputs, chips, compact controls |
| `Radii.medium` | 12 | Buttons, segmented controls |
| `Radii.large` | 18 | Cards, tiles, grouped surfaces |
| `Radii.pill` | 999 | Pills, circular controls, the tab bar |

Use rounded corners consistently. Avoid excessively rounded containers, and
never mix two radii on the same element (a card with a `medium` button inside is
fine; a card with `large` top corners and `small` bottom corners is not, unless
it is flush against a screen edge).

## 5. Component Styles

### Buttons

**Primary button**
- Background: Primary amber
- Text: White or dark blue-gray, depending on contrast
- Font: 15px SemiBold
- Height: 52px
- Radius: 12px

**Secondary button**
- Background: Surface Secondary
- Text: Text Primary
- Font: 14px SemiBold
- Height: 48px
- Radius: 12px

**Text button**
- Transparent background
- Text: Primary
- Font: 14px SemiBold

Buttons should have clear pressed, disabled, and loading states.

### Cards

- Background: `backgroundElement` (`#FFFFFF` in light, `#18202C` in dark)
- Border: 1px `border`
- Radius: `Radii.large` (18px)
- Padding: 16px horizontal (`Spacing.three`) from `Card`; vertical padding is set per usage (see
  §4 “Card padding”)
- Shadow: None by default

Use cards only when content needs visual grouping. Prefer simple sections and rows when a card adds no meaningful distinction.

### Inputs

- Height: 52px
- Background: Surface
- Border: 1px Border
- Radius: 12px
- Horizontal padding: 14px
- Text: Text Primary
- Placeholder: Text Secondary

Focused inputs should use the primary amber border.

### List rows

Use compact rows for saved destinations and journey history.

- Minimum height: 64px
- Horizontal padding: 12–16px
- Icon size: 20–22px
- Title: 15px SemiBold
- Supporting text: 12–13px
- Divider: Border color

Avoid wrapping every row in its own card.

### Icons

Place icons are **Ionicons**, chosen per place and stored by name in
`places.icon` (`home school briefcase bus location star cart medkit restaurant
car business sunny`), with the tag default filling in when none is chosen. Rows
saved by earlier builds held emoji; `resolvePlaceIcon` maps those once at render
time.

Every interface glyph uses the same set through `components/ui/icon.tsx`:
chevrons, search, add, checkmarks, the tab icons and the header theme toggle.
No emoji, no PNG tab assets — one font, one stroke weight, and both themes tint
the same shapes.

Icon size ladder: 12–14 inline, 18–20 in rows and tabs, 22–26 in headers and
buttons, 44 in empty states.

Guidelines:
- Standard icon size: 20–24px.
- Small icon size: 16px.
- Large action icon: 28–32px.
- Use consistent stroke widths.
- Use labels alongside important navigation icons.
- Use coral for alarm-related icons and amber for primary actions.

## 6. Navigation

Use a bottom tab navigation with four primary destinations:

1. **Home** — Destination selection and saved place shortcuts.
2. **Places** — Saved destinations and place management.
3. **History** — Previous journeys and arrival records.
4. **Settings** — Preferences and application configuration.

### Navigation appearance

- Background: Surface
- Active icon and label: Primary
- Inactive icon and label: Text Secondary
- Top border: Border
- Labels: 11–12px Medium
- Respect Android safe-area insets.

Keep navigation consistent across the main application screens. The active journey and alarm screens may use a focused layout without the standard tab bar.

## 7. Screen Guidelines

### Home

The home screen should immediately communicate the app's main purpose.

Shipped composition (top to bottom):

1. Compact Hinto header: the wordmark lockup, plus the round light/dark toggle.
   Two exports are used: `logo-light.png` (navy on transparent) and
   `logo-dark.png` (cream on transparent, pin stays amber), both derived from
   `logo.png` and rendered without a background chip.
2. **Hero search card** in `accentSoft` with an amber badge, "Where are you going?"
   and a quieter "Search a place or drop a pin" line. This is the one action the
   screen is for, so it gets the only saturated surface.
3. System strips, only when they matter: storage, blocking permissions, battery
   restriction, warnings, and the interrupted-journey recovery card.
4. **Active journey card** (amber-tinted, amber border, amber progress) with the
   status pill, big distance, accuracy, progress toward the alert radius and the
   pause/end actions. Nothing else on the screen competes with it.
5. **Saved places as two-column tiles** (icon, name, tag · alert radius), not
   rows; the Places tab keeps the denser row list.
6. Recent destinations with a small icon tile, then a quiet offline/GPS footer.

Empty state: a centred pin glyph, "No saved places yet", one line of body copy
and a single amber **Add a place** button — the first-run screen should end in an
action, not an explanation.

Avoid redundant system-status cards and excessive introductory text.

### Places

- Simple list of saved destinations.
- Clearly visible add-place action.
- Destination name and optional address.
- Compact edit and delete actions.
- Helpful empty state when no destinations exist.

### Active Journey

Prioritize information that commuters need while traveling:

- Destination name.
- Remaining distance.
- Estimated arrival time, if available.
- GPS tracking status.
- Alert radius.
- Stop or cancel journey action.

Use large, readable distance information and keep secondary details visually quieter.

### Alarm

The alarm screen should be visually distinct from the rest of the application.

- Use coral as the primary alarm accent.
- Show the destination name prominently.
- Display a clear arrival warning.
- Provide obvious actions to dismiss or stop the alarm.
- Keep decorative elements and secondary information minimal.

The alarm must remain understandable at a glance.

### History

- Use a clean chronological list.
- Show destination, date, and journey details.
- Keep metadata smaller than destination names.
- Avoid unnecessary charts and statistics.

### Settings

Organize settings into logical groups:

- Location permissions
- Alarm and notification preferences
- Battery and background operation guidance
- Appearance
- About Hinto

Use simple settings rows with clear descriptions.

## 8. Motion and Interaction

Animations should support usability rather than decoration.

Recommended interactions:

- Subtle button press feedback.
- Smooth screen transitions.
- Lightweight bottom sheet transitions.
- Clear loading and GPS acquisition indicators.
- Subtle state changes when a journey starts or ends.

Avoid:
- Constant animated backgrounds.
- Heavy blur effects.
- Large particle effects.
- Animations that interfere with alarm behavior.
- Animations that unnecessarily consume battery.

**Important:** GPS tracking, background execution, and alarm reliability must never depend on visual animations.

## 9. Dark Mode

Dark mode ships alongside the light theme and follows it, using the same
semantic tokens so no component needs a scheme check.

### Warm night palette (Dark Theme)

Tokens exported via `Colors.dark` in `src/constants/theme.ts`:

| Token Key | Hex | Semantic Role & Usage |
|---|---|---|
| `background` | `#0E141E` | Main application background (deep navy-black) |
| `backgroundElement` | `#18202C` | Cards, sheets, inputs (dark surface) |
| `backgroundSelected` | `#232D3D` | Secondary containers, pressed rows, selection pills |
| `border` | `#2B3648` | Dividers, subtle outlines |
| `text` | `#F4EFE6` | Headings and primary text (warm off-white) |
| `textSecondary` | `#A7B2C2` | Descriptions, captions, and supporting text |
| `accent` | `#F0B45C` | Primary buttons, active states, highlights (bright warm amber) |
| `accentText` | `#241708` | Dark text on top of bright amber |
| `accentSoft` | `#2A2213` | Subtle dark amber container background |
| `accentBorder` | `#4A3A1E` | Outline border for active/selected containers |
| `danger` | `#FF7A5E` | Coral/red — alarms, urgent warnings, destructive actions |
| `warning` | `#F3B24A` | Warning states and caution badges |
| `success` | `#7FD1B9` | Active tracking, successful arrival, safe states |

Amber surfaces use `accentSoft` with an `accentBorder` outline instead of a
second bright colour, so the warm feel survives on OLED black.

## 10. Implemented Design System & Architecture

Design tokens are centralized in `src/constants/theme.ts` and consumed through theme hooks and primitives across the app. Never hardcode hex colors or arbitrary spacing numbers.

### Token definitions (`src/constants/theme.ts`)

```ts
import { Colors, Spacing, Radii, FontFamilies, PlaceColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Colors: useTheme() returns Colors[theme] (light or dark)
const theme = useTheme();
// theme.background, theme.backgroundElement, theme.accent, theme.text...

// 4-point spacing scale:
// Spacing.half = 2
// Spacing.one = 4
// Spacing.two = 8
// Spacing.three = 16
// Spacing.four = 24
// Spacing.five = 32
// Spacing.six = 64

// Border radius scale:
// Radii.small = 8    (inputs, chips, small badges)
// Radii.medium = 12  (buttons, segmented controls)
// Radii.large = 18   (cards, sheet modals, containers)
// Radii.pill = 999   (pills, circular buttons, avatar slots)
```

### Component & Folder Organization

```text
src/
  app/                          # Expo Router routes (every file is a screen)
    (tabs)/
      index.tsx                 # Home screen
      places.tsx                # Saved places management
      history.tsx               # Journey history
      settings.tsx              # App preferences & diagnostics
    destination/
      search.tsx                # Search destination
      pin.tsx                   # Interactive map pin dropper
    journey/
      [id].tsx                  # Active journey monitor
      new.tsx                   # Start journey configuration
    alarm.tsx                   # Arrival alarm full-screen alert
    onboarding/                 # First-run onboarding flow

  components/
    ui/                         # Design system primitives
      controls.tsx              # Card, Button, Input, Switch, Badge
      layout.tsx                # Box, Stack, Row, Spacer (token-driven layout)
      mascot.tsx                # Mascot (<Mascot pose="..." expression="..." size="..." />)
      icon.tsx                  # Ionicons glyph wrapper
      themed-text.tsx           # Plus Jakarta Sans weighted text
      screen.tsx                # SafeAreaView + Header + MaxContentWidth container

  constants/
    theme.ts                    # Colors, Spacing, Radii, Fonts, PlaceColors
    strings.ts                  # Tagalog/English commuter copy strings

  modules/                      # Domain logic (SQLite DB, location engine, alarm, geofence)
```

## 11. Final Design Rules

1. Prefer simplicity over decoration.
2. Use amber as the recognizable Hinto brand color.
3. Reserve coral for alarm and urgent states.
4. Use Plus Jakarta Sans consistently.
5. Maintain a 4-point spacing system.
6. Avoid unnecessary cards and shadows.
7. Keep important journey information highly readable.
8. Make interactive elements visually obvious.
9. Keep layouts compact without making controls difficult to tap.
10. Prioritize functionality, accessibility, and battery efficiency over visual effects.

## 11a. Navigation and brand lockup

- **Top nav** carries the full lockup: pin over the wordmark with the "Gising bago
  lumagpas." line already set. Never retype it, never split it. Use the navy
  export on light and the cream export on dark; never put the navy one on a dark
  surface and never add a background plate.
- **Bottom nav** is a floating pill: warm surface, hairline border, four items,
  each with a 38 dp icon slot and a 3 dp gap to its 11 dp label. The active item
  fills that slot with `accentSoft` and an `accentBorder` outline; inactive items
  stay outline-only in secondary grey. No negative offsets, so labels cannot
  collide with the circle.
- Default theme is **light**. The toggle in the top nav and Settings → Display
  override it, and `system` is still available for people who want it.

Where the brand lockup goes in the flow: launch splash (pin only), Home header,
store listing screenshots, the share card after arriving, and the About line in
Settings. The mascot handles the emotional beats; the lockup handles recognition.

---

## 12. Mascot: the Hinto guide

A young commuter in an orange hoodie, cream shirt, navy trousers and a navy
backpack, with a pin badge and an ahoge. Amber is the accent, navy is the ink,
cream is the paper — she is the palette walking.

Rendered via `components/ui/mascot.tsx`:
```tsx
<Mascot pose="hero" size="hero" />
<Mascot expression="thinking" size="small" />
```

### Main Poses (`MascotPose`)

Transparent PNGs in `assets/mascot/main_poses/`, mapped in `mascot.tsx`:

| Key | Moment / UI Context |
|---|---|
| `hero` | Onboarding hero, first-run welcome screen |
| `greeting` | Inline greeting, friendly introductory banners |
| `waiting` | Waiting for GPS fix / satellite acquisition |
| `tracking` | Active commuter tracking in progress |
| `stale` | Stale GPS signal alert / weak signal warning |
| `paused` | Commute / journey temporarily paused |
| `arrived` | Arrival celebration and destination reached |
| `alarm` | Alarm ringing takeover surface |
| `offline` | Offline map / offline status notification |
| `battery` | Battery optimization warning and battery-saver mode |
| `empty` | Empty saved places and empty history state |
| `saved` | Destination successfully saved to places |
| `searching` | Destination search empty state or in-flight query |
| `permission` | Background location or notification permission step |
| `interrupted` | Journey recovery prompt after app restart |
| `error` | Diagnostic error recovery screens |
| `pointing` | Interactive map pin picker guidance |
| `night` | Late-night commute / quiet hours journey |

### Expressions (`MascotExpression`)

Head-and-shoulders crops in `assets/mascot/expressions/` for small moments (36–56 dp):
`happy`, `sleepy`, `thinking`, `surprised`, `worried`, `annoyed`, `neutral`, `crying`.

Main poses carry structural states; expressions are used for transient inline reactions.

Rules: never in the tab bar, never behind the alarm controls, never animated
while tracking (battery), and always keep at least 32 px of clear space so the line
art stays legible. Export poses as transparent PNGs into `assets/mascot/`.

### Placement policy

One mascot per screen, only where there is something to explain or celebrate.
Home uses the mascot once (the no-places hero, or a 36 dp avatar in the status
line for offline/no-fix) and never while a journey is running.

Size ladder (`MascotSizes` in `components/ui/mascot.tsx`): `inline` 36 for
status lines, `small` 56 for guide rows, `medium` 88 for recovery cards, `large`
132 for empty states, `hero` 168 for onboarding and Home's no-places hero, `full`
240+ for celebrations. Stay inside a band so crops stay consistent when poses
swap.

Expressions are for small, transient moments at 36–56 dp — `sleepy` for quiet
states, `thinking` while looking something up, `surprised` for no results,
`worried` for GPS trouble, `annoyed` for a denied permission, `happy` for saved.
Main poses carry structural states; expressions never appear in a full card.

Never use the sticker with the baked tagline inside the app; it cannot be
localised and belongs to marketing only.

---

## 13. Saved place flow

1. **Capture** — Places +, Home add-place, search long-press, pin picker
   "Save this place", or journey options "Save this destination".
2. **Confirm** — icon and name preview, tag chips, emoji picker (tag default),
   alert radius with its meaning spelled out, favourite, coordinates only if
   needed.
3. **Keep** — a duplicate name within 50 m asks first; saving lands on the saved
   place with a "Saved to Places" banner and **Start journey**.

Tags filter; icons identify. They are independent on purpose.

---

**The intended result:** A warm, minimal, modern Android application that feels friendly and dependable while keeping the commuter's destination and alarm information front and center.