# ADR-024: Indigo + Warm Accent Color Theme

**Date**: 2026-04-05
**Status**: Accepted
**Feature**: Visual Refresh (F44)

## Context

The app was using shadcn/ui's default neutral gray palette (hue 0 — achromatic). An initial attempt to add color shifted everything to a blue palette (hue 240), but user feedback indicated it was hard to see and lacked character. A more distinctive, readable, and youthful palette was needed.

Requirements:
- Elegant and modern (suitable for professional networking)
- Youthful (alumni skew younger than typical corporate tools)
- Good readability and contrast in both light and dark modes
- Works with existing shadcn/ui components without overrides

## Options Considered

### Option A: Indigo + Warm Amber Accent

- **Description**: Deep indigo (hue 270) as primary, warm amber (hue 75) as accent. Gradient text flows from indigo to amber.
- **Pros**: Rich and distinctive. Warm accent adds approachability. Good contrast. Stands out from typical blue SaaS products.
- **Cons**: Indigo can feel too dark if lightness is set too low.

### Option B: Teal + Emerald

- **Description**: Teal (hue 180) as primary, emerald highlights.
- **Pros**: Fresh and energetic. Great readability.
- **Cons**: Feels more "techy startup" than "alumni network". Less distinctive.

### Option C: Violet + Rose

- **Description**: Warm violet (hue 300) as primary, soft rose accents.
- **Pros**: Bold and creative. Very memorable.
- **Cons**: May feel too playful for professional networking. Rose accents risk looking too feminine for a general audience.

## Decision

**Option A (Indigo + Warm Amber)** was chosen. It strikes the best balance between professionalism and youthfulness. The indigo base feels premium without being corporate, and the warm amber accent adds energy.

After initial implementation at `0.55` lightness, user feedback led to lightening the primary to `0.65` (light mode) and `0.78` (dark mode) for better readability.

## Consequences

- All CSS custom properties in `globals.css` updated (light + dark modes, sidebar, charts)
- 23 component files received minor styling updates for consistency
- Landing page feature cards use individual color gradients that harmonize with indigo base
- New `.glass-card` CSS utility added for glassmorphism effects
- Future components should use the `--primary` and `--accent` tokens rather than hardcoded colors
- OG images (when added) should use the indigo palette for brand consistency

## References

- `src/app/globals.css` — all color token definitions
- `docs/features/visual-refresh-indigo-theme.md` — full implementation notes
