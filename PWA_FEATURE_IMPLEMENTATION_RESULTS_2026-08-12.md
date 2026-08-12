# Jackal PWA Feature Implementation Results - 2026-08-12

## Scope Completed

Implemented the discussed PWA and desktop-preservation features while keeping the generated Jackal gameplay port as close to Java parity as possible. The only generated gameplay file touched was `src/jackal/Main.ts`, and those edits are browser integration hooks around loading, fullscreen, suspend/resume, and save invalidation. No gameplay scoring, enemy logic, player movement, collision math, integer math, graphics draw logic, or sound-effect calls were changed.

## PWA Shell

Changed `src/app/JackalWebApp.ts` from a one-button launcher into a full browser shell:

- New Game button.
- Continue button backed by localStorage save validation.
- Persisted volume slider using `jackal-volume`, with first-run default volume `10%`.
- Web Audio unlock on Start/Continue via `SoundStore.get().unlock()`.
- PWA master-volume mapping: music volume = `master`, sound volume = `Math.sqrt(master)`.
- Menu styling now follows the reference PWA shell pattern: no visible title, no bordered menu panel, solid black menu background, rounded side-by-side mixed-case action buttons, Ms. Pac-Man-style button sizing/typography and black-bordered white slider thumb treatment, Stickvania-style compact volume value spacing, white volume icon/value text, and a simplified Jackal title-screen-derived control palette using jeep green buttons, cream/yellow volume fill, mountain brown volume track, and gray disabled state.
- First-load animated-dot resource splash using `ResourceLoader.preloadResources(...)`.
- `runtimeResourcesLoaded` memory flag so repeated starts skip the external resource-download splash.
- Resource retry policy remains `5` attempts with `250` ms retry delay.
- Error screen/menu messages are shown if loading or restore fails.
- Hamburger button is hidden while `Main.isLoadingScreenActive()` is true.
- Hamburger button saves current gameplay state and returns to the PWA menu when gameplay is active.
- Browser `pagehide`, `pageshow`, `blur`, `focus`, and `visibilitychange` suspend/resume the active game.
- Suspended games save state when possible.
- Browser lifecycle suspension now also calls `AppGameContainer.setLoopSuspended(true)`, using the `slick2d-ts` browser loop-suspension API so render-time Java-parity animations stop and the RAF loop does not repaint while focus is lost.

The volume behavior intentionally preserves Java Slick2D semantics. The double sound-volume application in `slick2d-ts` is Java parity, so the PWA shell compensates with `sqrt(master)` instead of changing the engine API.

The first-run PWA volume default is intentionally `10%`. If `jackal-volume` already exists in localStorage, the saved user preference overrides that default.

## Responsive Display And Fullscreen

Implemented responsive browser sizing in `src/app/JackalWebApp.ts` and `src/styles.css`:

- The game host fills the browser content area.
- The Slick canvas is aspect-fit to Jackal's logical `1024x960` surface.
- Black bars are supplied by the browser shell around the centered canvas.
- Browser focus outlines are suppressed only on the game shell/host/canvas so the focused gameplay surface does not show an extra white border.
- Resizing is driven by `ResizeObserver`, `window.resize`, and `fullscreenchange`.
- Fullscreen targets the game shell element, not the canvas directly.
- Jackal's Java F12/Escape fullscreen path now routes through a browser fullscreen controller when present.
- The existing `ScalableGame` wrapper remains in use, preserving Jackal's logical coordinate system.

## Loading Behavior

Implemented two loading phases:

- First launch after page load: no game shell yet, no hamburger, animated-dot resource splash, manifest resources are preloaded with retries, then AppGameContainer starts and Jackal's own `LoadingMode` finishes object/resource construction.
- Later launches in the same page session: external splash is skipped, `Main.completeLoadingImmediately(...)` fast-forwards Java-style `loadNext()` work after container start, and `ResourceLoader.waitForAll()` still runs before marking runtime resources loaded.

`runtimeResourcesLoaded` is intentionally memory-only. It is not persisted, because a new page load must still verify resources and versioned cache state.

## Save And Continue

Added `src/jackal/persistence/`:

- `GameStateSnapshot.ts`
- `GameElementTypeRegistry.ts`
- `JackalGameStateSerializer.ts`
- `JackalGameStateStore.ts`

The persistence model is browser-only and parity-breaking by feature, but the implementation minimizes gameplay divergence:

- Saves only active `GameMode` gameplay.
- Does not save title/options/input/loading menu states.
- Clears stale save state when Jackal enters title, continue, difficulty, options, or input modes.
- Does not clear saves on `Modes.LOADING`, because Continue restore must pass through loading first.
- Bypasses gameplay constructors on restore with `Object.create(...)`.
- Restores live field values from the active entity graph.
- Rebuilds `GameMode.elements`, `enemies`, `solids`, and `mines`.
- Restores runtime back-pointers such as `main`, `gameMode`, `player`, `solids`, `enemies`, and `mines`.
- Restores Java-style `ArrayList` contents.
- Supports `bigint` encoding for any future live long-like values.
- Restores Java `Random` seed limbs.
- Restores `FriendlySoldier.count`.
- Restores current/requested song by id, then lets `Main.update()` restart playback through the normal song path.

Known save limitation: music resumes by restarting the current requested song, not from the exact sample/time offset. This is a browser PWA continuation boundary, not a Java gameplay logic change.

## Main.ts Browser Hooks

Added to `src/jackal/Main.ts`:

- `appGameContainer`
- `scalableGame`
- `loadingFinishedHandler`
- `loadingCompleteHandler`
- `stateSaveInvalidatedHandler`
- `windowedDisplayModeProvider`
- `browserFullscreenController`
- `browserSuspended`
- `completeLoadingImmediately(gc)`
- `isLoadingScreenActive()`
- `isStateSaveReady()`
- `isStateSaveInvalidatingMenuActive()`
- `setBrowserSuspended(suspended)`
- `stopAllSounds()`
- `clearInputPressedRecords()`
- `getWindowedDisplayMode()`

Behavioral hook points:

- `update(...)` returns early while browser-suspended.
- `fullScreenToggleCheck(...)` delegates to the browser shell fullscreen controller if available.
- `requestMode(...)` invalidates browser saves only for menu-like non-gameplay modes.
- `loadNext()` case `41` now calls `loadingCompleteHandler(gc)` if present. If that handler returns true, it owns the mode transition, which is how Continue restore enters active gameplay instead of title.

The browser shell combines these `Main.ts` hooks with `AppGameContainer.setLoopSuspended(...)`. `Main.setBrowserSuspended(...)` preserves Jackal's audio/input/timing pause state, while loop suspension stops RAF scheduling and prevents render-time state mutations such as Chinook rotor advancement during focus loss.

## Desktop Java Archive

Added `desktop/` as a historical Java preservation/build area:

- `desktop/src` copied from `C:\NetBeansProjects\SlickJackal\src`.
- 126 Java source files copied.
- Original source resources copied with the same directory structure.
- NetBeans `build.xml`, `manifest.mf`, and non-private `nbproject` files preserved.
- Original runtime jars copied into `desktop/lib`.
- Original native jars unpacked into `desktop/natives/windows`, `desktop/natives/linux`, `desktop/natives/macosx`, and `desktop/natives/solaris`.
- Added Maven files: `desktop/pom.xml` and `desktop/assembly.xml`.
- Added modern launch scripts: `desktop/run-windows.cmd`, `desktop/run-windows.ps1`, `desktop/run-linux.sh`, and `desktop/run-macos.sh`.
- Added runtime documentation: `desktop/README.md` and `desktop/RUNTIME_DEPENDENCIES.md`.
- Added root scripts: `npm run build:desktop` and `npm run run:desktop`.

The desktop Maven build uses Java 8 bytecode target for modern JDK compatibility while preserving the original source. The helper script tries native Maven, then WSL2 Maven on Windows, then a `javac`/`jar` fallback. In this environment Maven was not on PATH, and the fallback build succeeded.

## Versioning And Cache Busting

Updated:

- `package.json`
- `package-lock.json`
- `version.json`
- `index.html`
- `public/manifest.webmanifest`
- `public/sw.js`
- `src/styles.css`
- `desktop/pom.xml`

Current version:

- app/package/PWA version: `0.1.2`
- build stamp: `20260812T000000Z`

Versioned URLs:

- icon link in `index.html`
- manifest link in `index.html`
- module script URL in `index.html`
- manifest `start_url`
- manifest icon URL
- service worker cache name
- service worker app shell request
- menu background image URL in CSS

Added `public/favicon.ico` from the existing original 32x32 icon to satisfy browsers that request `/favicon.ico` directly.

## Verification

Commands run:

```sh
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run build:desktop
```

Results:

- TypeScript passed.
- ESLint passed.
- Vite production build passed.
- Desktop Java build passed through `javac` fallback.
- Desktop build produced `desktop/target/jackal-desktop.jar` and `desktop/target/jackal-desktop.zip`.
- Local dev-server testing was intentionally skipped per request; port `5173` was confirmed clear after cleanup.

The latest Vite production build completed without warnings.

## Slick2D TS Status

No new `slick2d-ts` limitation or bug was discovered during this implementation pass.

The sound-volume double application remains intentional Java Slick2D parity. The browser shell compensates with `Math.sqrt(master)` for the PWA volume slider.
