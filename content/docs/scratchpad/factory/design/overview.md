---

title: "Design Language"
description: "Early adopters and tech-curious individuals who enjoy exploring new technologies. Approachable but not dumbed down."
---

> Minimal, Technical, Ambitious

## Inspiration

- [Vite](https://vite.dev/) - clean gradients, developer-focused
- [Turborepo](https://turborepo.dev/) - bold typography, dark-first
- [shadcn/ui](https://ui.shadcn.com/) - composable, understated elegance

## Target Users

Early adopters and tech-curious individuals who enjoy exploring new technologies. Approachable but not dumbed down.

## Design Principles

### 1. Clarity Over Decoration

- Every element earns its place
- No ornamental UI - if it doesn't serve a purpose, remove it
- Let content breathe with generous whitespace

### 2. Technical Confidence

- Assume users are intelligent
- Show relevant details, don't hide complexity unnecessarily
- Use precise language, avoid marketing fluff

### 3. Progressive Disclosure

- Start simple, reveal depth on demand
- Core actions obvious, advanced options accessible
- Don't overwhelm first-time users, don't limit power users

### 4. Speed as a Feature

- Perceived and actual performance matter
- Instant feedback on interactions
- Optimize for the common path

## Constraints

| Constraint    | Requirement                                 |
| ------------- | ------------------------------------------- |
| Color Modes   | Support `prefers-color-scheme` (dark/light) |
| Accessibility | WCAG AA compliance minimum                  |
| Touch         | Minimum tap target 44x44px                  |
| Interactions  | No hover-only actions (must work on touch)  |
| Platforms     | Mobile, tablet, desktop                     |

## UX Patterns

### Information Hierarchy

- Primary action always visible
- Secondary actions in consistent locations
- Destructive actions require confirmation

### Navigation

- Keyboard navigable (Tab, Enter, Escape)
- Clear current location indicators
- Predictable back/escape behavior

### Feedback

- Immediate response to user actions
- Clear loading/pending states
- Actionable error messages

### Empty States

- Helpful, not apologetic
- Guide toward next action
- Maintain visual consistency

## Motion Philosophy

- Functional over decorative
- Respect `prefers-reduced-motion`
- Use motion to:
  - Indicate state changes
  - Guide attention
  - Provide spatial context
- Avoid motion for:
  - Pure decoration
  - Looping animations
  - Blocking user progress

## Voice & Tone

- Concise and direct
- Technical when appropriate
- Encouraging without being patronizing
- Error messages: explain what happened, suggest fix

---

_This document defines the "why" behind design decisions. For implementation specs (tokens, components), see the design system._
