# DESIGN.md

Visual design reference. The Figma file is the canonical source — this doc records the language, tokens, and patterns codified from it so Claude can match them without opening Figma every time.

---

## Source files

- **Figma**: _<add link here when ready>_
- **Stitch mockups**: initial AI-generated explorations, kept as historical reference. Figma is the current source of truth.

When the Figma link is added, paste it above and update `CLAUDE.md` to point here.

---

## Design language

**"Editorial Minimalism with Lime Accent"** — premium productivity app feel:

- Crisp off-white surfaces, near-black text — never pure white or pure black.
- A single sharp signature color: **chartreuse lime**.
- Hairline borders, no gradients, no shadow noise.
- Generous whitespace, editorial typography hierarchy.
- Pill-shaped interactive elements (buttons, chips, the floating tab bar).

The design works identically in light and dark mode — the lime accent reads on both. Only background/text/surface tokens flip; the accent stays put.

---

## Color tokens

Codified in `mobile/src/theme/colors.ts`. Never inline a hex — add to the theme if missing.

### Light theme

| Token | Hex | Use |
|---|---|---|
| `background` | `#FAFAFA` | App background — off-white, less clinical than pure white |
| `surface` | `#FFFFFF` | Cards floating above background |
| `surfaceMuted` | `#F4F4F5` | Nested sections, very subtle |
| `surfaceContrast` | `#0A0A0A` | Dark "hero" header treatment |
| `border` | `#EAEAEA` | Hairline dividers |
| `borderStrong` | `#D4D4D8` | Emphasized boundaries |
| `text` | `#0A0A0A` | Primary text — deep, never pure black |
| `textMuted` | `#71717A` | Secondary text (zinc-500) |
| `textInverse` | `#FAFAFA` | Text on dark surfaces |
| `primary` | `#C5EE51` | **Signature lime** — buttons, active tabs, key affordances |
| `primaryText` | `#0A0A0A` | Black on lime |
| `primarySoft` | `#E8F5C4` | Lime tint for soft fills |
| `danger` | `#DC2626` | Delete, errors, high priority |
| `success` | `#16A34A` | Completed status |
| `warning` | `#D97706` | Medium priority |
| `info` | `#7C7AED` | Muted lavender — secondary accent, low priority |
| `inputBg` | `#FFFFFF` | Form input background |
| `inputBorder` | `#E4E4E7` | Form input border |
| `placeholder` | `#A1A1AA` | Placeholder text |

### Dark theme

| Token | Hex | Use |
|---|---|---|
| `background` | `#0A0A0A` | |
| `surface` | `#18181B` | |
| `surfaceMuted` | `#27272A` | |
| `surfaceContrast` | `#FFFFFF` | |
| `border` | `#27272A` | |
| `borderStrong` | `#3F3F46` | |
| `text` | `#FAFAFA` | |
| `textMuted` | `#A1A1AA` | |
| `textInverse` | `#0A0A0A` | |
| `primary` | `#C5EE51` | **Same lime — sings on dark** |
| `primaryText` | `#0A0A0A` | |
| `primarySoft` | `#374317` | |
| `danger` | `#EF4444` | |
| `success` | `#22C55E` | |
| `warning` | `#F59E0B` | |
| `info` | `#A5A4F1` | |
| `inputBg` | `#18181B` | |
| `inputBorder` | `#3F3F46` | |
| `placeholder` | `#71717A` | |

### Semantic color helpers

Use the helpers in `colors.ts` rather than picking the color manually:

- `priorityColor(priority, theme)` → high=danger, medium=warning, low=info
- `statusColor(status, theme)` → completed=success, in_progress=primary, pending=textMuted

---

## Spacing scale

_(Not yet extracted into a token file — current screens use ad-hoc values. Recommend adding to `mobile/src/theme/space.ts` and migrating.)_

Suggested scale based on visual inspection:

| Token | px | Use |
|---|---|---|
| `xs` | 4 | icon spacing, tight chip padding |
| `sm` | 8 | tab bar inner, pill padding |
| `md` | 12–14 | card padding, list item gap |
| `lg` | 16 | screen edge padding |
| `xl` | 24 | section gap |
| `xxl` | 32 | between major sections |

---

## Typography

_(Not yet extracted — using inline `fontSize` + `fontWeight`. Recommend a `theme/type.ts`.)_

Observed scale:

| Role | Size | Weight | Use |
|---|---|---|---|
| Display | 28–32 | 800 | screen titles, greetings |
| Headline | 20 | 700–800 | card titles, section headers |
| Body | 15–16 | 500 | primary content |
| Caption | 13 | 600–800 | tab labels, chip text, timestamps |
| Micro | 11–12 | 600 | dot indicators, badges |

Letter spacing tends slightly negative (`-0.2` to `-0.4`) on weights ≥ 700 for editorial feel.

---

## Shape

- **Pills**: `borderRadius: 999` — used for tab bar, chips, primary buttons.
- **Cards**: `borderRadius: 16–20` — task cards, analytic tiles.
- **Inputs**: `borderRadius: 12` — text fields, segmented controls.
- **Modal sheets**: `borderRadius: 24` top corners only.

---

## Elevation

Minimal. No drop shadows on cards by default.

The floating tab bar uses a soft shadow:
- `shadowOpacity: 0.08`
- `shadowRadius: 14`
- `shadowOffset: { width: 0, height: 4 }`
- `elevation: 6` (Android)

That's the only shadow pattern in the app. Inline surfaces rely on hairline borders + color contrast instead.

---

## Component patterns

### Floating capsule tab bar
- Position: absolute, bottom, respecting safe-area inset (`Math.max(insets.bottom, 12)`).
- Bar: pill shape, hairline border, soft shadow.
- Active tab: lime pill that expands to show glyph + label.
- Inactive: glyph only, muted color.
- See `mobile/src/navigation/RootNavigator.tsx → FloatingTabBar`.

### TaskCard
- Surface background, hairline border, 16–20px rounded corners.
- Title (16, 700) + description preview (one line, muted, 14).
- Right side: priority chip (colored pill) + status indicator.
- Below: due date (relative), recurrence badge if set.
- Tap → edit. Swipe left → delete. Inline checkbox on left → toggle complete.

### Chips (priority, status, filter)
- Pill shape, 28–32px tall.
- Colored fill for active state, hairline outline for inactive.
- Text inherits chip color contrast.

### Inputs
- `inputBg` background, `inputBorder` hairline, 12px radius.
- Placeholder uses `placeholder` token.
- Focus state: border switches to `primary` (lime).

### Primary button
- Lime fill (`primary`), black text (`primaryText`), pill shape, 800 weight.
- Disabled: 40% opacity, no border change.

### Empty states
- Centered illustration (line art, single weight), one-line headline, one-line suggestion.
- "Add your first..." pattern across screens.

---

## Accessibility

- Touch targets ≥ 44pt (iOS) / 48dp (Android). Tab bar pills meet this.
- Icon-only buttons need `accessibilityLabel`.
- Color contrast checked in both themes — verify any new color combo against WCAG AA (4.5:1 for body, 3:1 for large/UI).
- Don't rely on color alone — priority chips have both color AND label, status indicators have both color AND icon/text.

---

## When designs and code disagree

The **Figma file wins** for visuals. Code is the source for behavior and conventions.

If a Figma spec conflicts with this doc (e.g. introduces a new color), the workflow is:
1. Update Figma → land the change.
2. Update `theme/colors.ts` to add the token.
3. Update this doc.
4. Then use it in code.

Never inline the new value while skipping steps 2–3.
