# YI:ON Portfolio Design System

## 1. Atmosphere & Identity

YI:ON is one portfolio with two purpose-led appearances. Daily Mode preserves the warm, personal editorial profile feel for friends and personal sharing. Interview Mode matures the same identity into warm charcoal, dusty rose, and cream so project, research, and implementation evidence read professionally without becoming a generic dark AI product. Both modes share content, layout, components, and behavior.

## 2. Color

| Role | Token | Value | Usage |
|---|---|---:|---|
| Primary surface | `--warm-white` | `#fffcfa` | Page and raised light surfaces |
| Secondary surface | `--cream` | `#fbf2e9` | Cards and grouped content |
| Neutral surface | `--gray-soft` | `#e9e4df` | Quiet placeholders and separators |
| Soft accent | `--pink-soft` | `#f3dee2` | Rings, badges, and gentle emphasis |
| Accent | `--rose` | `#d98fa0` | Interactive and decorative emphasis |
| Accent strong | `--rose-deep` | `#b96e82` | Links, headings, and active states |
| Primary text | `--ink` | `#221e1c` | Headings and body text |
| Secondary text | `--ink-muted` | `#6e6560` | Supporting copy and metadata |
| Border | `--border` | `#ece2da` | Dividers and outlines |

### Theme semantics

- `html[data-theme="daily"]` maps semantic color roles to the existing Daily palette without changing the established appearance.
- Daily accessibility text roles use strong rose `#96536a` for small accent labels and deep plum `#4a1e2c` on Rose buttons; the underlying Daily surfaces and accent fills remain unchanged.
- `html[data-theme="interview"]` uses background `#1d1a1f`, surface `#262228`, card `#302b31`, elevated card `#39333a`, border `#454046`, primary text `#f6f2ed`, secondary text `#c7bcb8`, accessible muted text `#a79d9e`, accent `#cf8fa0`, accent hover `#d99eaf`, and focus `#e4a7b8`.
- `theme.css` exposes these values through the semantic `--color-*` layer. Every translucent overlay, border, shadow, featured state, tab bar, and chat input value is also declared as a named token beside the core palette; component rules do not own one-off colors.
- `theme.js` repeats only the two page-background values for browser `theme-color` metadata because CSS custom properties cannot directly populate meta content.
- Interview surfaces follow an approximate 70/20/10 charcoal/neutral/rose balance. Rose is reserved for active state, primary action, focus, featured status, and selected navigation.
- Browser `color-scheme` and `theme-color` track the active theme.

Colors already embedded in legacy gradient or alpha effects are implementation details of those existing components. New work should reuse the tokens above.

## 3. Typography

- Primary stack: `Pretendard`, `SUIT`, `Apple SD Gothic Neo`, `Inter`, system UI, sans-serif.
- Display/page title: `clamp(1.6rem, 3vw, 2.3rem)`, bold, tight tracking.
- Section title: `clamp(1.3rem, 2vw, 1.7rem)`, bold.
- Body: `1rem`, line-height `1.65`.
- Supporting body: `0.88rem` to `0.95rem`.
- Caption/label: `0.75rem` to `0.86rem`, medium or semibold.
- Body copy remains at least `0.875rem`; headings use `clamp()` when viewport-sensitive.

## 4. Spacing & Layout

- Base spacing unit: `4px`; existing rem values follow this rhythm where practical.
- Page gutter: `--space-page-x`, defined as `clamp(16px, 5vw, 24px)`.
- Content maximum: `1220px` for page heroes and primary sections.
- Major responsive boundary: `900px`; desktop navigation and profile layout switch to the mobile app shell below it.
- Compact mobile boundary: `640px`.
- Touch target minimum: `--touch-min` (`44px`).
- Layout primitives: centered page container, responsive grid, horizontal cluster, vertical stack, sticky header, fixed mobile tab bar.

## 5. Components

### Avatar Photo

- **Structure**: circular `.avatar-photo` surface shared by About desktop, About mobile, and Contact; `.avatar-photo-sm` is the compact variant.
- **Variants**: default `168px`, small `96px`.
- **States**: static media; no hover or active state.
- **Accessibility**: the portrait is decorative context beside the visible profile name; textual identity remains in the page content.
- **Motion**: none.
- **Layout**: centered media primitive; uses `cover` cropping with a shared focal position.

### Link Chip / Button

- **Structure**: anchor or button with compact inline label.
- **Variants**: primary, secondary, navigation chip, link chip.
- **States**: default, hover, active, visible keyboard focus, disabled where applicable.
- **Accessibility**: semantic anchor/button elements and minimum touch target on mobile.
- **Motion**: 200-300ms transform, color, border, or shadow transition.

### Visitor Mode Segmented Control

- **Structure**: two semantic buttons grouped with an accessible label; labels are `나를 알아보기` and `경력 중심으로 보기`.
- **Variants**: the same compact horizontal control is shared by Home desktop, the Home mobile assistant widget, and the mobile Chat page.
- **States**: inactive uses the quiet cream surface; active uses the rose accent and `aria-pressed="true"`; keyboard focus remains visibly outlined.
- **Accessibility**: each button meets the `--touch-min` target, exposes its pressed state, and remains independently reachable with the keyboard.
- **Motion**: color, border, and shadow transition only; switching modes does not animate or clear the conversation.
- **Layout**: two equal columns with wrapping Korean labels and no horizontal overflow at the 900px and 640px boundaries.

### Card

- **Structure**: title, metadata, body/summary, and optional action.
- **Variants**: project, award, research, archive, status summary.
- **States**: default and actionable hover/focus where linked.
- **Accessibility**: content order follows the DOM; actions remain keyboard reachable.
- **Motion**: subtle lift only when the card is actionable.

### Status Badge

- **Structure**: short inline label.
- **Variants**: standard, muted, compact pill.
- **States**: static unless rendered as an interactive control.
- **Accessibility**: never carries status by color alone.
- **Motion**: none.

### App Shell Navigation

- **Structure**: sticky desktop header plus mobile back bar and bottom tab bar.
- **Variants**: desktop and mobile.
- **States**: default, hover, active/current page, focus.
- **Accessibility**: current destination is exposed with `aria-current`; mobile controls meet the touch target minimum.
- **Motion**: transform/opacity only for menu state changes.

### Theme Switcher

- **Structure**: two semantic buttons in a labelled group, one each for Daily and Interview, with a CSS-rendered dot.
- **States**: selected uses a filled dot, stronger text, and `aria-pressed="true"`; unselected uses an outlined dot and secondary text.
- **Accessibility**: each option is keyboard-operable and at least `44px` high; selection uses shape, text contrast, and ARIA rather than color alone.
- **Motion**: 180ms color, background, border, and opacity transition only; reduced-motion users receive no transition.
- **Layout**: desktop sits at the right edge of the Header. Mobile Home uses the Header; stack pages use the Back Bar. Chat is the intentional exception because its conversation shell has no Back Bar: the switcher sits directly below its custom top bar. It never becomes a fifth bottom tab.

## 6. Motion & Interaction

- Micro interactions: `200-250ms ease` or `ease-out`.
- Standard card/reveal transitions: `300ms`.
- Entrances: `500-700ms` using transform and opacity.
- Reveal behavior uses `IntersectionObserver`.
- Interactive motion communicates affordance or state; static media does not animate.
- `prefers-reduced-motion` should disable non-essential reveals and smooth scrolling.

## 7. Depth & Surface

The project uses a mixed soft-depth strategy: light borders establish structure, while `--shadow-soft` and `--shadow` elevate interactive or prominent surfaces. Circular avatars use a warm-white border and pink outer ring. New surfaces should reuse these existing treatments rather than introduce new shadow recipes.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- Target WCAG 2.2 AA: 4.5:1 contrast for body text and 3:1 for large text.
- Preserve semantic elements, visible keyboard focus, Korean-language metadata, and natural CJK line breaking.
- Interactive targets are at least `44px` on touch layouts.
- Respect `prefers-reduced-motion` for non-essential animation.
- The default URL always resolves to Interview Mode; Daily is explicit through `?theme=daily`. Existing `slug`, `filter`, `q`, and hash state survive theme changes.
- Meaningful images require concise Korean alt text; decorative images use an empty alt or CSS background with adjacent textual identity.

### Accepted Debt

None introduced by the profile-photo update.
