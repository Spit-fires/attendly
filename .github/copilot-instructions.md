## AI assistant guide for this repo

This project is a SvelteKit 2 + Svelte 5 app, styled with Tailwind CSS v4, statically prerendered (adapter-static) and packaged for Android via Capacitor. It includes a shadcn-svelte UI library setup and a SQLite stack for web/native.

### Architecture and structure
- Static site: `adapter-static` with `prerender = true` in `src/routes/+layout.ts`. There is no server runtime; avoid Node-only APIs and server endpoints.
- Capacitor shell: Android project in `android/` loads the built site from `build/` (`capacitor.config.ts` sets `webDir: 'build'`).
- UI system:
  - Tailwind v4 via the Vite plugin (`vite.config.ts`). Theme tokens and dark mode are defined in `src/app.css` (note `@custom-variant dark` and CSS variables).
  - shadcn-svelte is configured via `components.json` (neutral theme). Local components live under `src/lib/components/ui/**`.
  - Class merging helper `cn(...)` is in `src/lib/utils.ts` and should be used for conditional Tailwind classes.
- Svelte 5 patterns: the root layout (`src/routes/+layout.svelte`) uses `$props()` and `{@render children?.()}`. Prefer Svelte 5 runes/APIs in new components.

Key files:
- `svelte.config.js` — static adapter; vitePreprocess
- `vite.config.ts` — Tailwind v4 plugin + SvelteKit plugin
- `capacitor.config.ts` — Capacitor app id/name, `webDir`, and CapacitorSQLite plugin options
- `src/lib/utils.ts` — `cn` and helper types for Bits/shadcn components
- `src/lib/components/ui/**` — reusable UI primitives

### Developer workflows
- Dev server: use Vite/SvelteKit
  - Windows (cmd): `pnpm dev`
- Type checking:
  - `pnpm check` (runs `svelte-kit sync` then `svelte-check` with `tsconfig.json`)
  - `pnpm check:watch`
- Web build and preview:
  - `pnpm build` → outputs static site to `build/`
  - `pnpm preview` to serve the build locally
- Android with Capacitor (scripts reference missing helpers; run these manually):
  1) `pnpm build`
  2) `npx cap sync android`
  3) `npx cap copy android`
  4) `npx cap open android` (opens Android Studio)
  Note: package.json has `android:start` referencing `remove:sql:wasm` and `build:native`, but those scripts are not defined in this repo; prefer the manual steps above.

### Conventions and patterns in this repo
- Use `$lib` alias for shared code. Example: `import { cn } from '$lib/utils'` or `import Button from '$lib/components/ui/button/button.svelte'`.
- Prefer composing UI with the shadcn-svelte components under `src/lib/components/ui/**`; follow the local import paths rather than fetching from the registry at runtime.
- Tailwind v4: there is no `tailwind.config.js`. Adjust theme tokens in `src/app.css`. Use `cn(...)` when combining conditional classes to avoid duplication.
- Dark mode: styles key on a `.dark` root class (see `@custom-variant dark`); toggles should add/remove `dark` on the document root.
- Static constraints: because of `adapter-static` + full prerender, avoid SvelteKit server routes or on-demand SSR. Use client-side `fetch` or prerendered data only.

### Data/storage integration
- SQLite stack:
  - Native (Android): `@capacitor-community/sqlite` is configured in `capacitor.config.ts` (encryption options are present but authentication is disabled by default).
  - Web fallback: `sql.js` and `jeep-sqlite` are installed for browser support. Keep native-only logic behind platform checks to avoid bundling unneeded WASM into Android native builds.

### Practical examples
- Importing a UI primitive: `import { cn } from '$lib/utils'` and apply it to Tailwind class lists in components.
- Adding a new UI component: place it under `src/lib/components/ui/<component>/`, export it via an `index.ts` where appropriate, and consume via `$lib/components/ui/...` paths.
- Route composition: use Svelte 5 `$props()` and `{@render children?.()}` pattern as in `src/routes/+layout.svelte`.

### Gotchas
- Don’t introduce server-only features; everything must work when statically prerendered.
- Ensure Android packaging always points to the latest `build/` via `npx cap sync` after building.
- The Electron-related scripts in `package.json` assume an `electron/` folder not present in this repo; they will fail unless that scaffolding is added.

If anything here is unclear or you spot gaps (e.g., preferred patterns for adding new routes, handling platform checks for SQLite, or publishing), call it out so we can refine this guide.
