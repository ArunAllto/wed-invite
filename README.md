# Bootstrap SCSS Starter

An HTML + Sass project that depends on the real `bootstrap` npm package
(not a CDN copy), so the entire design system — colors, typography,
spacing, radii, shadows, and every component's own variables — is
overridable from one file before Bootstrap's Sass is compiled.

## How the override works

`src/scss/main.scss` imports files in this order:

1. `src/scss/_variables.scss` — imports Bootstrap's `functions`, then
   redeclares Bootstrap's own `!default` Sass variables, organized into the
   same 30 sections Bootstrap itself uses: color system + theme-color
   subtle/emphasis variants, global feature flags, typography, body/links,
   spacing, grid, borders/radius/shadows/focus-ring, tables, buttons, forms
   (inputs, checks, switches, selects, ranges, floating labels, validation),
   z-index, navs/navbar, dropdowns, pagination, cards, accordion, tooltips/
   popovers, toasts, badges, modals, alerts, progress bars, list-group,
   thumbnails/figures/breadcrumbs, carousel, spinners, close button/
   offcanvas, and code/kbd.
2. `src/scss/_variables-dark.scss` — the matching `-dark` suffixed
   variables Bootstrap's dark color mode reads for `[data-bs-theme="dark"]`,
   so dark mode is driven by variables too, not by separate overrides.
3. `bootstrap/scss/bootstrap` — the full framework. Because Bootstrap
   defines its variables with `!default`, any value already set in steps 1–2
   wins, so every Bootstrap class (`.btn`, `.card`, `.navbar`, `.alert`,
   `.form-control`, grid, utilities, ...) is generated using your values.
4. `src/scss/_custom.scss` — project-specific styles, written using the
   same Bootstrap variables/mixins for consistency.

To change the design system, edit **only** `_variables.scss` (and
`_variables-dark.scss` for dark mode) — no class in `index.html` needs to
change. A variable not set in either file simply falls back to Bootstrap's
own default; add it by copying its name from
[Bootstrap's source](https://github.com/twbs/bootstrap/blob/v5.3.3/scss/_variables.scss)
into the matching numbered section.

## Setup

```powershell
npm install
npm run dev
```

Then open the printed local URL. `npm run build` produces a static
`dist/` folder; `npm run preview` serves that build locally.

## Project layout

```
index.html               Demo page using Bootstrap classes only
src/main.js               Loads main.scss + Bootstrap's JS bundle (Popper included)
src/scss/_variables.scss  Every overridable Bootstrap Sass variable
src/scss/main.scss        Import order: variables -> bootstrap -> custom
src/scss/_custom.scss     Project styles built from the same variables
```
