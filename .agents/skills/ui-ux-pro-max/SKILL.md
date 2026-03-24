---
name: ui-ux-pro-max
description: UI/UX Pro Max — Comprehensive design intelligence skill. Provides professional UI/UX patterns, color palettes, typography pairings, and UX guidelines for any platform. Auto-activates when building UI.
source: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
---

# UI/UX Pro Max - Design Intelligence

A comprehensive design intelligence system providing:
- **67 UI Styles** — Glassmorphism, Claymorphism, Minimalism, Brutalism, Neumorphism, Bento Grid, Dark Mode, AI-Native UI, and more
- **161 Color Palettes** — Industry-specific palettes
- **57 Font Pairings** — Curated typography combos with Google Fonts
- **99 UX Guidelines** — Best practices, anti-patterns, and accessibility rules

---

## When to Apply

### Must Use
- Building new UI components or pages
- Redesigning existing interfaces
- User asks for "better design" or "improve UI"
- Creating design systems or style guides

### Recommended
- Code reviews involving frontend
- Performance optimization with visual impact
- Accessibility improvements

### Skip
- Pure backend / API / database work
- CLI tools with no visual output
- Data pipelines

---

## Rule Categories by Priority

| Priority | Category              | Focus                                      |
|----------|-----------------------|--------------------------------------------|
| CRITICAL | Accessibility         | Color contrast, touch targets, ARIA labels |
| CRITICAL | Touch & Interaction   | 44px+ targets, feedback states             |
| HIGH     | Performance           | < 3s load, lazy loading, optimized assets  |
| HIGH     | Style Selection       | Match style to product type & audience     |
| HIGH     | Layout & Responsive   | Mobile-first, fluid grids, breakpoints     |
| HIGH     | Navigation Patterns   | Clear hierarchy, consistent affordances    |
| MEDIUM   | Typography & Color    | Scale, contrast, hierarchy                 |
| MEDIUM   | Animation             | Purposeful, < 300ms, respects prefers-reduced-motion |
| MEDIUM   | Forms & Feedback      | Validation, error states, success states   |
| LOW      | Charts & Data         | Appropriate chart type, data-ink ratio     |

---

## Quick Reference

### 1. Accessibility (CRITICAL)
- Color contrast ≥ 4.5:1 for normal text, ≥ 3:1 for large text
- All interactive elements have visible focus states
- Images have meaningful alt text
- Form inputs have associated labels
- Error messages are descriptive and actionable
- Don't rely on color alone to convey information
- Support keyboard navigation for all interactive elements

### 2. Touch & Interaction (CRITICAL)
- Minimum touch target: **44×44px** (iOS) / **48×48dp** (Android)
- Provide visual feedback within **100ms** of interaction
- Use **loading states** for operations > 1s
- Implement **error recovery** — never dead-ends
- Swipe gestures need **visual affordances**

### 3. Performance (HIGH)
- Target **< 3s** initial load on 4G
- Lazy load below-fold images and components
- Use **skeleton screens** instead of spinners for layout-shift-prone areas
- Optimize images: WebP format, proper sizing, srcset
- Minimize layout shifts (CLS < 0.1)

### 4. Style Selection (HIGH)

**For Portfolio / Personal Sites:**
- Preferred styles: Dark Elegant, Glassmorphism, Luxury Minimal, Editorial
- Avoid: Corporate Blue, Generic SaaS
- Key differentiators: custom cursor, scroll animations, unique typography

**For SaaS / Dashboard:**
- Preferred styles: Clean Professional, Bento Grid, Data-Dense
- Focus: clarity, information hierarchy, scanability

**For Creative / Agency:**
- Preferred styles: Brutalism, Maximalist, Experimental
- Focus: memorability, bold typography, asymmetric layouts

### 5. Layout & Responsive (HIGH)
- **Mobile-first** CSS approach
- Use CSS Grid for 2D layouts, Flexbox for 1D
- Breakpoints: 640px (sm), 768px (md), 1024px (lg), 1280px (xl)
- Maintain **consistent spacing scale**: 4, 8, 16, 24, 32, 48, 64, 96px
- Max content width: **1200–1400px**, centered

### 6. Typography & Color (MEDIUM)

**Typography Rules:**
- Use **2 fonts max**: 1 display, 1 body
- Display font: expressive, memorable (avoid Inter/Roboto for hero text)
- Body font: highly readable, neutral weight
- Type scale: 12, 14, 16, 18, 24, 32, 48, 64px
- Line height: 1.5 for body, 1.1–1.2 for headings

**Color Rules:**
- Define colors as CSS custom properties
- Use **HSL** for programmatic color manipulation
- Dominant color + 1 accent + neutral system
- Dark mode: don't just invert — rethink contrast relationships
- Avoid pure `#000000` black (use `#0a0a0a` or similar)

### 7. Animation (MEDIUM)
- Default duration: **200–300ms** for UI transitions
- Entrance animations: **400–600ms**, ease-out
- Use `prefers-reduced-motion` media query
- Prefer `transform` and `opacity` (GPU-accelerated)
- Avoid animating `width`, `height`, `margin`, `padding`

### 8. Forms & Feedback (MEDIUM)
- Show validation **inline**, not only on submit
- Error state: red border + icon + descriptive message below field
- Success state: green indicator + confirmation message
- Use **placeholder** for hints, **label** for identification
- Auto-focus first field in modal forms

### 9. Navigation Patterns (HIGH)
- Max **2 levels** of navigation depth visible at once
- Active state must be clearly distinct from hover state
- Mobile: hamburger → full-screen overlay or slide-in drawer
- Sticky nav: reduce height on scroll (desktop)
- Breadcrumbs for depth > 2 levels

---

## Common Rules for Professional UI

### Icons & Visual Elements
- Use a **single icon library** per project (don't mix styles)
- Icon size: 16px (inline), 20px (UI), 24px (emphasis), 32px+ (decorative)
- Icons should never be the sole indicator — pair with text labels
- Custom SVG > icon font for performance

### Layout & Spacing
- **8px base unit** spacing system
- Section padding: 80–120px vertical on desktop, 48–64px mobile
- Card padding: 24–32px
- Consistent border-radius: pick 1–2 values and stick to them
- Use `gap` in Grid/Flex instead of margins where possible

---

## Pre-Delivery Checklist

### Visual Quality
- [ ] Consistent spacing using defined scale
- [ ] Typography hierarchy is clear (H1 > H2 > body > caption)
- [ ] Color contrast passes WCAG AA
- [ ] No orphaned text (widows/runts in headings)
- [ ] Images have correct aspect ratios, no distortion

### Interaction
- [ ] All buttons have hover + active + focus states
- [ ] Loading states implemented for async actions
- [ ] Error states designed and implemented
- [ ] Empty states have helpful messaging + action

### Layout
- [ ] Tested at 375px (mobile), 768px (tablet), 1280px (desktop)
- [ ] No horizontal scroll on mobile
- [ ] Keyboard navigation works logically (tab order)
- [ ] Touch targets ≥ 44×44px

---

## When to Use
This skill is applicable whenever building, reviewing, or improving any user interface. It provides the design reasoning layer that transforms functional code into professional, polished products.
