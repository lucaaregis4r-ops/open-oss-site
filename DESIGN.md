---
name: Open OSS website
description: Vitrine editorial da plataforma Open OSS.
colors:
  paper: "oklch(0.965 0.006 127)"
  surface: "oklch(0.99 0.004 127)"
  surface-soft: "oklch(0.935 0.018 127)"
  ink: "oklch(0.22 0.018 130)"
  ink-soft: "oklch(0.44 0.018 130)"
  rule: "oklch(0.68 0.014 130)"
  accent: "oklch(0.88 0.18 126)"
  accent-ink: "oklch(0.31 0.075 128)"
  dark: "oklch(0.21 0.019 130)"
  dark-ink: "oklch(0.96 0.006 127)"
  dark-soft: "oklch(0.8 0.012 127)"
  dark-rule: "oklch(0.43 0.015 130)"
  dark-panel: "oklch(0.26 0.018 130)"
  modal-backdrop: "oklch(0.15 0.018 130 / 0.66)"
  focus: "oklch(0.3 0.12 127)"
typography:
  display:
    fontFamily: "Rethink Sans, IBM Plex Sans, sans-serif"
    fontSize: "clamp(3rem, 5.5vw, 5rem)"
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: "-0.065em"
  headline:
    fontFamily: "Rethink Sans, IBM Plex Sans, sans-serif"
    fontSize: "clamp(2rem, 3.5vw, 3rem)"
    fontWeight: 600
    lineHeight: 1.04
  title:
    fontFamily: "Rethink Sans, IBM Plex Sans, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
  body:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
  code:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.7
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "72px"
  4xl: "96px"
  section-gap: "136px"
rounded:
  card: "16px"
  control: "8px"
---

# Design system: Open OSS

## Overview

**North star: an editorial operations studio.**

The site borrows the platform's lime, charcoal, and neutral surfaces without reproducing its app shell. Its visual rhythm moves from a real product workspace to a searchable index and practical deployment details. Real interface screenshots carry the story; typography and open space keep the page from becoming a grid of generic feature cards.

## Colors

Lime marks actions and key moments. Paper surfaces hold the catalog, while charcoal gives the workflow and installation sections contrast.

## Typography

Rethink Sans gives display headings a distinct voice; IBM Plex Sans keeps navigation and body copy direct. IBM Plex Mono is reserved for installation commands.

## Layout

Use the centered 1320px container and the spacing scale in the CSS root. Two-column sections collapse to one column below 60rem; navigation and dense rows simplify below 42rem.

## Elevation & Depth

Keep the page flat. Product screenshots and dialogs use defined borders instead of shadows.

## Shapes

Use 16px corners for product screenshots and dialogs, 8px for controls, and pill shapes only for category filters.

## Components

Primary buttons use lime on paper and charcoal/white contrast in dark sections. Inputs and category filters have visible borders; keyboard focus must remain clear on both light and dark surfaces.

## Do's and Don'ts

- Keep the Open OSS wordmark and the product's lime, charcoal, and neutral palette.
- Use the real product screenshots in `site/images/screens/`; do not replace them with a drawn interface.
- Keep claims sourced from the platform repository. The public catalog data is a generated snapshot.
- Keep the module index searchable and keyboard-accessible.
- State constraints plainly, including manual CBC submission and the platform repository's access requirements.
- Use concise Portuguese copy and avoid generic feature-card layouts.
