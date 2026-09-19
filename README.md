# FileCompare

A local, offline desktop app for comparing files across many users side by side — one
fixed **Reference User** on the left, and 12, 15, or more **Comparison Users** scrolling
horizontally next to it. Built with Tauri 2, React, TypeScript, Vite, and Tailwind CSS.

Everything runs on your machine. No file, filename, or metadata is ever uploaded anywhere.

## Features

- **Two-step setup**: pick a Reference User (ZIP / folder / multiple files), then add as
  many Comparison Users as you need.
- **Frozen-pane comparison grid**: the reference column and the header row stay pinned
  (CSS `position: sticky`) while everything else scrolls underneath, with one shared
  vertical scroll position across every column.
- **Intelligent file matching**: exact relative path → exact filename → normalized
  filename → filename without extension → same-extension fuzzy match, each carrying an
  explicit confidence (`exact` / `likely` / `possible` / none).
- **Per-row status**: Same, Modified, Missing, New, Renamed, Uncertain, Unsupported —
  computed from file size first, and only falls back to a SHA-256 hash when sizes match
  (so most rows never need a hash at all).
- **Diff viewer**: line-level text diff (off the main thread, in a Web Worker), side-by-side
  / overlay / difference image comparison, lazy per-page PDF rendering, and a graceful
  fallback with an "Open" button for anything else.
- **Virtualized rows** (`@tanstack/react-virtual`) so 7,500+ files stay smooth — only
  visible rows (plus overscan) are ever in the DOM.
- **Search & filters** across filename, path, extension, user, and match status.
- **Local persistence** (`tauri-plugin-store`) for workspace layout and a content-hash
  cache, so reopening the app doesn't re-hash unchanged files.
- **Local only**: file reads, ZIP indexing, and hashing all happen in Rust commands; the
  UI never makes a network request.

## Architecture decisions worth knowing

- **Rust does the heavy lifting, not a Web Worker.** Folder walking, ZIP central-directory
  listing, file reads, and SHA-256 hashing are all Tauri commands (`src-tauri/src/`),
  running off the UI thread on Tauri's async runtime. This is faster and lower-RAM than
  shuttling bytes into a JS Web Worker, since ZIP entries are read on demand (never fully
  extracted) and hashing streams in 64KB chunks. A Web Worker is still used for the one
  thing that *is* pure JS CPU work: `diff`-ing two text files (`src/workers/diff.worker.ts`).
- **Matching is decoupled from hashing.** File-matching (`src/lib/fileMatching.ts`,
  `src/lib/comparison.ts`) is memoized purely on each user's file list. Content hashes live
  in a *separate* store slice (`fileHashes`), so a hash resolving updates a row's status
  cheaply — it never re-triggers the (more expensive) matching pass across all users. This
  is what keeps the UI smooth while thousands of hashes stream in in the background
  (see `src/lib/__tests__/performance.test.ts`).
- **Hashing is demand-driven.** A file is only hashed once it's been matched to a
  same-size counterpart and its status is genuinely ambiguous (`src/hooks/useAutoHash.ts`).
  Different-size files are declared "Modified" immediately, with no hash at all.
- **One scroll container, not fifteen.** The whole grid — reference column, comparison
  columns, and the header row — lives inside a single scrollable `<div>`. The reference
  column and header row use nested `position: sticky`, which is what keeps the reference
  pinned to the left, the header pinned to the top, and every column's vertical scroll
  position identical, without any manual scroll-sync code.

## Project layout

```
src/
  components/
    app/          top bar, privacy badge
    users/        setup screen, add-source buttons, user manager dialog
    comparison/   the sticky/virtualized grid, header + file cells, toolbar
    previews/     small in-cell previews (text snippet, image, pdf badge, unsupported)
    diff/         the "Compare File" modal and its per-type viewers
    ui/           shadcn-style primitives (button, dialog, tabs, ...)
  hooks/          useComparisonRows, useAutoHash, useHorizontalScrollNav, useTextDiff
  lib/            fileMatching, comparison, normalization, backend (Tauri bridge),
                  hashQueue, persistence, preview classification, pdf helper
  store/          zustand app store
  workers/        diff.worker.ts
  types/          shared TS types
src-tauri/src/    Rust commands: fs_index, zip_index, file_ops
scripts/          synthetic sample-data generator
```

## Requirements

- Node.js 20+
- Rust (stable) + Cargo — install via [rustup](https://rustup.rs) or `brew install rust`
- Platform prerequisites for Tauri 2 — see the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/)
  (Xcode Command Line Tools on macOS; WebView2 + MSVC Build Tools on Windows; the listed
  `apt` packages on Linux).

## Development

```bash
npm install
npm run tauri dev
```

`npm run dev` alone runs just the Vite dev server (useful for iterating on styling), but
most features (file dialogs, indexing, hashing) need the Tauri shell, so `npm run tauri dev`
is the normal way to work on this app.

## Testing

```bash
npm run typecheck   # tsc --noEmit
npm run test        # vitest — matching, comparison status, store, normalization,
                     # and a 15-user x 500-file performance smoke test
```

## Try it with synthetic data

```bash
npm run generate-samples          # ~8 users, small, for quick manual testing
npm run generate-samples:big -- --out sample-data-big  # 15 users x ~500 files/user
```

This writes a `reference/` folder plus several `userNN/` folders with deliberately
identical, modified, missing, renamed, and brand-new files, so you can exercise every
comparison status without needing real data. Point "Add Folder" at the generated
`reference/` folder for the Reference User, then at each `userNN/` folder for comparison
users.

## Building the desktop app

```bash
npm run build          # type-check + Vite production build
npm run tauri build    # native installer for the current platform
```

On macOS this produces a `.dmg` and a `.app` bundle under
`src-tauri/target/release/bundle/`. On Windows it produces an `.msi` and an `.exe`
(NSIS) installer under the equivalent path.

### Cross-platform builds via CI

Tauri doesn't meaningfully cross-compile the native shell (WebView2 on Windows, WKWebView
on macOS, GTK/WebKitGTK on Linux), so a `.dmg` has to be built on macOS and a Windows
installer has to be built on Windows. `.github/workflows/build.yml` does this
automatically: on every push to `main` it type-checks and tests, then builds on both
`macos-latest` and `windows-latest` and uploads the `.dmg`/`.app` and `.msi`/`.exe` as
workflow artifacts. Pushing a `v*` tag additionally creates a draft GitHub Release with
those installers attached. You can also trigger it manually from the Actions tab
("Run workflow").

## Limitations / known TODOs

- PDF and image previews are read in full via Rust (capped at a few MB) rather than
  server-side downsampled; very large images fall back to a "too large to preview" card
  in the grid (the modal comparison view still lets you view them, capped at 20MB).
- The synthetic "new file" grouping (files with no reference counterpart) groups by
  normalized filename across comparison users; it does not attempt path-aware grouping.
- Reordering comparison users is drag-and-drop in the Users dialog only, not in the main
  grid header itself.
- No automated end-to-end/UI test drives the actual native window (Tauri's WebView isn't
  Chromium/Electron, so Playwright's `_electron` driver doesn't attach to it); the app was
  instead verified with `npm run tauri dev` against the generated sample data, plus the
  unit-test suite covering matching/comparison/store logic and a 7,500-file performance
  smoke test. Setting up `tauri-driver` + a platform WebDriver would be the next step for
  scripted UI tests.
