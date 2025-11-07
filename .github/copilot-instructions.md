## AI assistant guide for this repo

**Attendly** - Student attendance & payment tracker. SvelteKit 2 (Svelte 5, Tailwind v4, adapter-static) + Capacitor for Android. SQLite for offline-first data.

### Architecture overview
- **Static prerendering**: `prerender = true` in `src/routes/+layout.ts`. No server runtime, no SvelteKit endpoints. All data is client-side via SQLite.
- **Hybrid database**: `src/lib/db/client.ts` auto-detects platform and uses Capacitor SQLite (Android native) or sql.js (web dev). The `initDb()` function initializes the engine; call domain helpers like `listStudents()`, `upsertAttendance()`, etc. — don't write raw SQL in components.
- **Mobile-first UI**: Fixed bottom nav (`+layout.svelte`), safe-area insets for notch/gesture areas. All routes render under `<main class="pt-safe-top">` with `padding-bottom: env(safe-area-inset-bottom)` on footer.

### Key implementation patterns

**Svelte 5 runes** (required in all components):
- State: `let x = $state(...)` not `let x = ...`
- Props: `let { propName } = $props()` not `export let propName`
- Rendering children: `{@render children?.()}` in layouts
- Example: `src/routes/+page.svelte` (daily attendance view) uses `$state` for reactive maps (`attendanceRecords`, `paymentRecords`)

**Database usage**:
1. Import helpers from `$lib/db/client` (e.g., `listStudents`, `upsertAttendance`, `recordPayment`)
2. Call `await initDb()` once (typically in `onMount`)
3. Use typed domain functions; avoid `run()` or `query()` directly unless adding new features
4. Date format: `toYMD(Date)` helper returns `'YYYY-MM-DD'` strings (required for schema)
5. Schema in `src/lib/db/schema.ts`: `students`, `attendance`, `payments` with foreign key cascade deletes

**UI composition** (shadcn-svelte + Tailwind v4):
- Import components: `import { Button } from '$lib/components/ui/button/index.js'` or `import * as Card from '$lib/components/ui/card/index.js'`
- Conditional classes: Always wrap in `cn(...)` (from `$lib/utils.ts`): `class={cn('base-classes', condition && 'conditional-classes')}`
- Theme: CSS variables in `src/app.css` (no `tailwind.config.js`). App colors: `--primary: #4a90e2`, status colors for attendance (present/absent/late/offday)
- Dark mode: `.dark` root class toggles theme via `@custom-variant dark` in `app.css`

**Status colors** (domain-specific):
- Present/Paid: `text-status-present` (green `#7ed321`)
- Absent/Due: `text-status-absent` (red `#d0021b`)
- Late: `text-status-late` (orange `#f5a623`)
- Unmarked/No Class: `text-status-unmarked` (gray `#e0e0e0`) - Students without a record means no class that day

### Developer workflows

**Development** (Windows cmd):
```bash
pnpm dev              # Vite dev server (uses sql.js for database)
pnpm check            # Type check with svelte-check
pnpm check:watch      # Watch mode
```

**Building for Android**:
```bash
pnpm build                      # Build static site to build/
npx cap sync android            # Sync Capacitor config
npx cap copy android            # Copy assets
npx cap open android            # Open Android Studio
# Build APK/AAB in Android Studio (Build > Generate Signed Bundle/APK)
```

**Common pitfalls**:
- **Don't use SvelteKit server features**: No `+page.server.ts`, no `load()` with server context, no API routes
- **Don't bundle sql.js into native**: Wrap web-only imports in try/catch or dynamic `import()` in `client.ts` pattern
- **Android packaging**: Always run `pnpm build` before `cap sync` — Capacitor serves stale `build/` if you forget

### Adding features

**New route**:
1. Create `src/routes/feature/+page.svelte`
2. Add nav link in `src/routes/+layout.svelte` tabs array
3. Import icons from `@lucide/svelte`

**New database operation**:
1. Add function to `src/lib/db/client.ts` (follow existing pattern: use `run()` for mutations, `query<Type>()` for reads)
2. Export and import in component
3. Always use parameterized queries: `run('INSERT ... VALUES (?)', [value])`

**New UI component**:
1. Install via shadcn-svelte or place in `src/lib/components/ui/<name>/`
2. Export from `index.ts` if compound component
3. Use `cn()` for all dynamic class merging

**Backup/restore pattern** (see `src/routes/settings/+page.svelte`):
- Export: `exportDb()` dumps all tables to JSON, downloads file
- Import: `importDb()` reads file input, clears tables, inserts data, reloads page

### Critical files
- `src/lib/db/client.ts` — Database abstraction (Capacitor/sql.js), all domain queries
- `src/lib/db/schema.ts` — SQL DDL, TypeScript types
- `src/routes/+page.svelte` — Main attendance/payment tracking view (complex reactive state example)
- `src/app.css` — All theme tokens (Tailwind v4 `@theme inline` block)
- `capacitor.config.ts` — App ID, SQLite plugin config (encryption disabled)

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
