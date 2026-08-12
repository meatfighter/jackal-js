# Jackal PWA Feature And Parity Implementation Plan

## Implementation Status Update - 2026-08-12

This planning file was created before the implementation pass. The implemented results and verification are now summarized in `PWA_FEATURE_IMPLEMENTATION_RESULTS_2026-08-12.md`.

The most important current-state changes are:

- App/package/PWA version is now `0.1.2`.
- Build stamp is now `20260812T000000Z`.
- The browser shell now has New Game, Continue, persisted volume, first-load splash, memory-only loading skip, hidden loading hamburger, responsive aspect-fit canvas sizing, shell fullscreen control, lifecycle suspension, and localStorage gameplay-state persistence.
- The Java desktop source is now copied under `desktop/src` and has a Maven-compatible `desktop/pom.xml`, launch scripts, vendored legacy jars, native folders, and a root `npm run build:desktop` helper.
- `slick2d-ts` sound double-application remains documented as Java Slick2D parity, not an engine bug.

Sections below are retained as the detailed pre-implementation research trail. Where they describe "current" files from before this pass, prefer the implementation results document and the actual source tree.

Date: 2026-08-12

Scope: documentation-only review before implementation. This file maps the required browser/PWA changes for `C:\js-projects\jackal-js` after comparing the current Jackal port, the original Java project at `C:\NetBeansProjects\SlickJackal`, and the reference projects `C:\js-projects\stickvania-js` and `C:\js-projects\ms-pac-man-2010-js`.

No runtime code was changed while creating this plan.

## Executive Summary

The requested features are feasible, but they are not all parity-neutral.

The lowest-risk rule is:

- Keep `src/jackal` as the 1-to-1 Java-shaped game port wherever possible.
- Put browser/PWA behavior in `src/app`.
- Allow narrow bridge hooks in `Main` and possibly `Song` only where the web shell must observe or control lifecycle.
- Put full browser save/restore logic in separate persistence files, not by rewriting core gameplay classes.

The biggest risks are:

1. Full game-state serialization is a large, class-level feature. It cannot be implemented by saving only `score`, `lives`, and `stageIndex`.
2. The hamburger must be hidden not only during the outer PWA resource screen, but also during Jackal's Java-style canvas `LoadingMode`.
3. Repeat starts should skip the visible loading screen only after one successful runtime load, while still executing the exact Java `loadNext()` sequence.
4. Browser fullscreen should target a DOM shell element, not the canvas alone, otherwise the hamburger will not remain visible in fullscreen.
5. `slick2d-ts` squares the configured sound-effect volume on the normal `Sound.play(...)` path. That is surprising browser-UX math, but it matches Java Slick2D's public `Sound` wrapper path. Jackal's `sqrt(volume)` PWA master-slider bridge should remain.

## Repositories And Files Reviewed

Current Jackal web port:

- `C:\js-projects\jackal-js\src\app\JackalWebApp.ts`
- `C:\js-projects\jackal-js\src\app\ResourceManifest.ts`
- `C:\js-projects\jackal-js\src\app\ServiceWorkerRegistrar.ts`
- `C:\js-projects\jackal-js\src\styles.css`
- `C:\js-projects\jackal-js\src\main.ts`
- `C:\js-projects\jackal-js\index.html`
- `C:\js-projects\jackal-js\public\sw.js`
- `C:\js-projects\jackal-js\public\manifest.webmanifest`
- `C:\js-projects\jackal-js\version.json`
- `C:\js-projects\jackal-js\src\jackal\Main.ts`
- `C:\js-projects\jackal-js\src\jackal\LoadingMode.ts`
- `C:\js-projects\jackal-js\src\jackal\GameMode.ts`
- `C:\js-projects\jackal-js\src\jackal\GameElement.ts`
- `C:\js-projects\jackal-js\src\jackal\HitElement.ts`
- `C:\js-projects\jackal-js\src\jackal\Player.ts`
- `C:\js-projects\jackal-js\src\jackal\Menu.ts`
- `C:\js-projects\jackal-js\src\jackal\IntroMode.ts`
- `C:\js-projects\jackal-js\src\jackal\ContinueMode.ts`
- `C:\js-projects\jackal-js\src\jackal\OptionsMode.ts`
- `C:\js-projects\jackal-js\src\jackal\InputMode.ts`
- `C:\js-projects\jackal-js\src\jackal\HumanInput.ts`
- `C:\js-projects\jackal-js\src\jackal\ButtonMapping.ts`
- `C:\js-projects\jackal-js\src\jackal\Song.ts`
- Representative entity classes including `FriendlyHelicopter.ts`, `FriendlySoldier.ts`, `RotatingGun.ts`, and boss/entity search results.

Original Java Jackal:

- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java`
- `C:\NetBeansProjects\SlickJackal\src\jackal\LoadingMode.java`
- `C:\NetBeansProjects\SlickJackal\src\org\newdawn\slick\ApplicationGameContainer.java`
- `C:\NetBeansProjects\SlickJackal\src\org\newdawn\slick\ScalableGameContainer.java`
- `C:\NetBeansProjects\SlickJackal\src\jackal` contains 124 Java files.
- `C:\js-projects\jackal-js\src\jackal` contains 125 TS files, with the extra file being the web-port barrel `index.ts`.

Reference projects:

- `C:\js-projects\stickvania-js\pwa\src\main.ts`
- `C:\js-projects\stickvania-js\pwa\src\styles.css`
- `C:\js-projects\stickvania-js\pwa\src\stickvania\Main.ts`
- `C:\js-projects\stickvania-js\pwa\src\stickvania\ScalableGame2.ts`
- `C:\js-projects\stickvania-js\pwa\src\stickvania\persistence\StickvaniaGameStateStore.ts`
- `C:\js-projects\stickvania-js\pwa\src\stickvania\persistence\StickvaniaGameStateSerializer.ts`
- `C:\js-projects\stickvania-js\pwa\src\stickvania\persistence\GameStateSnapshot.ts`
- `C:\js-projects\ms-pac-man-2010-js\pwa\src\app\main.ts`
- `C:\js-projects\ms-pac-man-2010-js\pwa\src\app\styles.css`
- `C:\js-projects\ms-pac-man-2010-js\pwa\src\mspacman\ScalableGame2.ts`
- `C:\js-projects\ms-pac-man-2010-js\pwa\src\mspacman\persistence\MsPacManGameStateStore.ts`
- `C:\js-projects\ms-pac-man-2010-js\pwa\src\mspacman\persistence\MsPacManGameStateSerializer.ts`

Slick2D TypeScript runtime:

- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts`
- `C:\js-projects\slick2d-ts\src\slick\ScalableGame.ts`
- `C:\js-projects\slick2d-ts\src\slick\util\ResourceLoader.ts`
- `C:\js-projects\slick2d-ts\src\slick\Sound.ts`
- `C:\js-projects\slick2d-ts\src\slick\Music.ts`
- `C:\js-projects\slick2d-ts\src\slick\openal\SoundStore.ts`
- `C:\js-projects\slick2d-ts\src\lwjgl\opengl\Display.ts`
- `C:\js-projects\slick2d-ts\src\lwjgl\openal\AL.ts`
- `C:\js-projects\slick2d-ts\src\slick\support\JavaRandom.ts`

## Current Jackal State

### Current PWA Shell

`JackalWebApp` currently owns:

- `root`
- `container`
- `volume`
- menu rendering
- visible resource loading rendering
- resource preloading through `ResourceLoader.preloadResources(RESOURCE_MANIFEST, progress => ...)`
- `ResourceLoader` base path setup: `/resources/`
- cache-busting via `versionInfo.buildStamp`
- retry setup: `setRetryOptions(5, 250)`
- canvas host creation
- hamburger creation
- `Main` creation
- `ScalableGame` wrapping
- `AppGameContainer` startup
- volume application through `SoundStore`

Current startup sequence:

1. `showMenu()` renders a menu with one `Start` button and a volume slider.
2. Clicking `Start` calls `startGame()`.
3. `startGame()` renders the outer DOM loading screen.
4. `ResourceLoader.preloadResources()` fetches the manifest.
5. The app replaces the DOM with a hamburger and `#game-host`.
6. `Main`, `ScalableGame`, and `AppGameContainer` are created.
7. `Display.setParent(game-host)` is called.
8. `container.start()` begins the Slick loop.

Current gaps:

- No `New Game` / `Continue` distinction.
- No persistent browser save state.
- No `runtimeResourcesLoaded` flag.
- No skip of the outer resource loading screen after successful runtime load.
- No skip of Jackal's inner canvas `LoadingMode`.
- Hamburger is absent during the outer DOM loading screen, but visible during Jackal's inner canvas `LoadingMode`.
- No responsive resize observer.
- No shell fullscreen controller.
- No page lifecycle save/suspend handling.
- `AppGameContainer.setErrorHandler()` is not used.
- Volume is not persisted to `localStorage`.

### Current PWA Files

`version.json`:

- Contains `"version": "0.1.1"`.
- Contains `"buildStamp": "20260804T000000Z"`.
- Is imported by `JackalWebApp.ts`.

`index.html`:

- Has versioned icon, manifest, and script URLs using `20260804T000000Z`.
- Has `<meta name="app-version" content="0.1.1">`.
- Renders a static initial boot screen.

`public\manifest.webmanifest`:

- Has `start_url` with a version query parameter.
- Has icon URL with version query parameter.
- Uses `"display": "standalone"`.

`public\sw.js`:

- Has hard-coded `APP_VERSION = "0.1.1"`.
- Has hard-coded `BUILD_STAMP = "20260804T000000Z"`.
- Uses a cache name based on both.
- Uses network-first with retry.
- Caches same-origin basic/default responses.

This already covers the basic PWA versioning requirement, but updates are manually duplicated across `version.json`, `index.html`, `manifest.webmanifest`, and `sw.js`. Future work should either keep this manual pattern very disciplined or add a small version-stamp generation step.

## Reference Behavior To Reproduce

### Stickvania Loading Skip

Stickvania has an in-memory `runtimeResourcesLoaded` flag in `pwa/src/main.ts`.

Important behavior:

- First launch performs visible loading.
- Later launches in the same page session skip visible loading.
- The game still constructs a new `Main`.
- The game still runs its Java-style loading path.
- On repeat launch, `mainGame.completeLoadingImmediately(appContainer)` fast-forwards the game loading mode.
- `ResourceLoader.waitForAll()` is still awaited after fast-forwarding.
- `runtimeResourcesLoaded` is not persisted to `localStorage`.

This is the right model for Jackal.

Do not interpret "skip loading" as "skip object construction" or "reuse the old `Main` object." It means "do the same loading work without showing the loading screen after the first successful runtime load."

### Stickvania Hamburger Visibility

Stickvania's game shell creates the hamburger with `hidden`.

The shell calls:

- `game.isLoadingScreenActive()`

The hamburger stays hidden while loading is active. It appears only after the game reports loading complete.

Stickvania also blocks `returnToMenu()` during loading:

- If `game?.isLoadingScreenActive()` is true, return immediately.

Jackal should do the same. Destroying a partially initialized `Main` while `loadNext()` is still constructing `Sound`, `Music`, `Image`, `Stage`, and trigger data is unsafe.

### MS Pac-Man App Layout

MS Pac-Man has a cleaner `pwa/src/app` shell split and a compact PWA menu:

- `New Game`
- `Continue`
- volume slider
- hamburger over game host
- responsive host sizing
- cursor auto-hide
- save on menu return/page lifecycle

Jackal can reuse the architectural shape without copying MS Pac-Man's exact loading strategy. MS Pac-Man clears `ResourceLoader` cache during preload; Jackal should not do that after `runtimeResourcesLoaded` becomes true, because the whole point of repeat launch skip is to retain successful runtime resource bytes in memory.

## Continued Feature Audit Findings

This section records the second-pass review after rechecking audio parity and the reference PWA shells.

### Audio Volume Parity Correction

The earlier note that `slick2d-ts` had a sound-effect double-volume parity bug was wrong.

Confirmed Java Slick2D public `Sound` path:

1. `org.newdawn.slick.Sound.play(float pitch, float volume)` passes `volume * SoundStore.get().getSoundVolume()` to `Audio.playAsSoundEffect(...)`.
2. `org.newdawn.slick.openal.AudioImpl.playAsSoundEffect(...)` forwards that gain to `SoundStore.playAsSound(...)`.
3. `org.newdawn.slick.openal.SoundStore.playAsSoundAt(...)` then applies `gain *= soundVolume`.

Confirmed `slick2d-ts` public `Sound` path:

1. `src/slick/Sound.ts` computes `effectiveVolume = volume * SoundStore.get().getSoundVolume()`.
2. `src/slick/openal/SoundStore.ts` computes `sourceGain = Math.max(0, volume * this.soundVolume)`.

Therefore the public `Sound.play(...)`, `Sound.playAt(...)`, and `Sound.loop(...)` path in both Java and TypeScript produces:

```text
perEffectVolume * soundVolume * soundVolume
```

That should be treated as Java Slick2D parity, not an engine bug.

The browser PWA slider is a different API concept. If the slider means "audible master volume", the shell should continue applying:

```text
musicVolume = masterVolume
soundVolume = sqrt(masterVolume)
```

Then Jackal's normal effects become:

```text
perEffectVolume * sqrt(masterVolume) * sqrt(masterVolume)
= perEffectVolume * masterVolume
```

Do not change `slick2d-ts` `setSoundVolume(...)` semantics to make it more intuitive. That would break Java parity for games that call the public `Sound` wrapper.

If a future browser helper is desired, add it as a separate non-Java API, such as `setMasterVolume(masterVolume)`, and document that it maps music and sound differently.

### Weak Sound Effects Investigation Boundary

Because the squared sound-volume behavior is parity-correct, weak Jackal effects should be investigated elsewhere:

- Verify the PWA master slider is at `1.0`; at master `1.0`, the square-root bridge still sets `soundVolume = 1.0`.
- Verify `JackalWebApp.applyVolume()` runs after any future `container.reinit()` call. `AppGameContainer.rebuildSystemForReinit()` resets music and sound volume to `1`, so a reinit path must reapply the PWA volume.
- Verify the decoded browser audio levels against the original `.ogg` files. Web Audio decoding should not normalize by default, but browser output, OS mixer level, and source asset loudness can still make effects feel weak relative to music.
- Verify the game-side throttling in `Main.MINIMUM_SOUND_TIME = 125` ms. This is Java parity and should not be removed, but it can make rapid duplicate effects sound sparse.
- Verify no one has changed Jackal to call `setSoundVolume(masterVolume)` directly; doing so would make partial-volume effects too quiet because the public `Sound` path squares the configured value.
- Positional `Sound.playAt(...)` should be audited for other games because `slick2d-ts` uses a Web Audio `PannerNode`, but Jackal itself appears to route normal effects through `Main.playSound(...) -> Sound.play(...)`, not `playAt(...)`.

### Jackal Loading Hook Placement

Jackal's Java-shaped loading sequence lives in `Main.loadNext()`:

- cases `0` through `11`: music and `Song` objects
- cases `12` through `36`: sound effects
- case `37`: sprites
- case `38`: large images
- case `39`: size data
- case `40`: stages and mutable map source data
- case `41`: `requestMode(Modes.INTRO, this.gc)`
- return: `++loadIndex / 42`

The loading-complete bridge should be inserted at the case `41` boundary, not after `requestMode(Modes.INTRO, ...)` has already made the title mode visible.

Recommended shape:

- If `loadingCompleteHandler` exists at case `41`, call it.
- If it returns `true`, do not request `Modes.INTRO`; the handler has restored or selected the correct mode.
- If it returns `false` or no handler exists, preserve Java behavior and call `requestMode(Modes.INTRO, this.gc)`.
- Always notify `loadingFinishedHandler` exactly once when the load sequence exits `Modes.LOADING`.

This lets browser `Continue` restore after all images, sounds, songs, stages, and static class tables exist, while still preventing a one-frame flash of the Java title screen.

### Hidden Loading Skip Semantics

Repeat launch skip must still construct a new `Main`, a new `ScalableGame`, and a new `AppGameContainer`.

It must still execute `loadNext()` in order. The skipped thing is visibility, not loading side effects.

The safest fast-forward method for Jackal is:

- while `mode instanceof LoadingMode`, call the same update path that would have called `loadNext()`
- stop when `mode` is no longer `LoadingMode`
- then await `ResourceLoader.waitForAll()`

Do not bypass `loadNext()` by copying resource fields from the previous `Main`; that would create shared mutable state across play sessions.

### Fullscreen And Scaling Decision

`slick2d-ts` `AppGameContainer.setFullscreen(true)` targets the canvas. That is Java-like for the game, but it is not sufficient for Jackal's PWA shell because a sibling hamburger button is not visible when only the canvas is fullscreen.

The browser fullscreen target should be `#game-shell`, with both `#game-host` and the hamburger inside it.

Jackal `Main.fullScreenToggleCheck(gc)` currently only checks `gc.isFullscreen()` and calls `gc.setFullscreen(...)`. The bridge should add a browser fullscreen controller and treat shell fullscreen as an additional state:

- if shell fullscreen is active and Escape/F12 is pressed, exit shell fullscreen
- else if container fullscreen is active, exit container fullscreen and restore responsive windowed display mode
- else if F12 is pressed, enter shell fullscreen when a browser controller exists
- else fall back to `gc.setFullscreen(true)`

Responsive sizing should use `AppGameContainer.setDisplayMode(width, height, false)` for normal browser resizing. `slick2d-ts` `ScalableGame` recalculates scale when the container size changes during `update()`, so a local `ScalableGame2` is not required unless input mapping or one-frame resize artifacts appear during verification.

### Save/Continue Readiness Boundary

Browser `Continue` should resume actual gameplay state, not every Java mode.

Initial policy:

- save-ready: `mode` is `GameMode`, resources are loaded, `Main.gameMode` exists, `GameMode.player` exists, `GameMode.elements` exists, and `GameMode.stage` exists
- not save-ready: `LoadingMode`
- save-invalidating: `IntroMode`, `OptionsMode`, `DifficultyMode`, `InputMode`, and title/pre-game flow
- likely not save-ready: `ContinueMode`, because it is the Java death continue prompt and conflicts with the browser menu's `Continue`
- likely not save-ready for phase one: `IntroMapMode`, `MapMode`, `JeepHereMode`, `JeepYeahMode`, `SunsetMode`, and `HardEndingMode`

That policy can be expanded later, but the first implementation should avoid saving cinematic/map modes until their scalar fields and mode-specific side effects are audited class by class.

If the player returns to the title screen, or if `Main.requestMode(Modes.INTRO, gc)` is called outside initial loading after a game has begun, the browser save should be cleared.

### Entity Registry Audit Correction

The active-entity registry list must include all `GameElement` subclasses that can enter `GameMode.elements`.

Second-pass `rg` review found that `IntroPlayer` was missing from the old list. `IntroPlayer` is created by `Chinook` during stage start inside `GameMode`, so it must be either:

- included in the registry and restorable; or
- explicitly blocked by making `GameMode` not save-ready while the `Chinook` intro unload sequence is active.

Including it is more complete and closer to full-state parity.

## Second-Pass File And Class Change Matrix

This matrix is the current implementation target after auditing Jackal, Stickvania, Ms. Pac-Man, and `slick2d-ts`.

### `src/app/JackalWebApp.ts`

Current class state:

- `root`
- `container`
- `volume`

Required class state:

- keep `root`
- keep `container`
- add `game: Main | null`
- add `scaledGame: ScalableGame | null`
- add `activeGameShell: HTMLElement | null`
- add `activeGameHost: HTMLElement | null`
- add `resizeObserver: ResizeObserver | null`
- add `resizeAnimationFrame: number`
- add `hamburgerVisibilityAnimationFrame: number`
- add `cursorGameHost: HTMLElement | null`
- add `cursorHideTimer: number`
- add `pointerOverGameHost: boolean`
- add `runtimeResourcesLoaded: boolean`
- add `suspendedByFocusLoss: boolean`
- add `suspendedByVisibilityLoss: boolean`
- add `gameStateStore: JackalGameStateStore`
- keep `volume`, but initialize it from localStorage instead of hard-coded `1`

Current `showMenu(errorMessage)` behavior:

- destroys the game
- renders a single `Start` button
- renders a simple slider
- applies volume on slider input

Required `showMenu(errorMessage)` behavior:

- destroys the game
- checks `gameStateStore.hasValidSave()`
- renders `New Game`
- renders `Continue`, disabled when no valid save exists
- renders the volume slider and percent/value/icon if implemented
- `New Game` clears save and starts with `restoreSavedGame = false`
- `Continue` starts with `restoreSavedGame = true`
- applies and persists volume on input

Current `startGame()` behavior:

- always shows the outer DOM loading screen
- always preloads `RESOURCE_MANIFEST`
- always creates hamburger before `Main` starts
- does not install `AppGameContainer.setErrorHandler(...)`
- does not store `game`
- does not hide hamburger during Jackal canvas `LoadingMode`
- does not restore saved state
- does not install responsive resize/fullscreen/lifecycle behavior

Required `startGame(restoreSavedGame)` behavior:

1. call `destroyGame()`
2. decide `showVisibleLoading = !runtimeResourcesLoaded`
3. if visible loading is required, render the boot splash and preload `RESOURCE_MANIFEST`
4. unlock Web Audio from the button gesture
5. render `#game-shell` containing `#game-host` and hidden hamburger
6. call `Display.setParent(gameHost)`
7. construct `Main`
8. construct `ScalableGame(game, Main.DISPLAY_WIDTH, Main.DISPLAY_HEIGHT, true)`
9. construct `AppGameContainer` using the responsive windowed display size
10. assign bridge hooks on `Main`
11. install `container.setErrorHandler(...)`
12. start container
13. if not showing visible loading, call `game.completeLoadingImmediately(container)` and wait for `ResourceLoader.waitForAll()`
14. start responsive sizing
15. start cursor auto-hide
16. start hamburger visibility monitor
17. apply PWA volume again

The app should not call `ResourceLoader.clearCache()` on repeat starts. The current `ResourceLoader.removeAllResourceLocations()` is fine during initial configuration, but repeat starts should not erase already loaded bytes if the goal is to skip visible loading.

Required `destroyGame()` behavior:

- stop hamburger visibility monitor
- stop cursor auto-hide
- stop responsive sizing
- set browser suspension flags false
- save only when called through menu/lifecycle paths, not every teardown
- call `game.stopAllSound()` or `game.stopAllSounds()` bridge
- exit shell fullscreen if active
- destroy `container`
- set `container`, `game`, `scaledGame`, `activeGameShell`, and `activeGameHost` to null
- call `Display.setParent(null)`

Required `returnToMenu()` behavior:

- if `game?.isLoadingScreenActive()` is true, return without action
- set browser suspended
- call `saveCurrentGameState()`
- call `showMenu()`

Required `applyVolume()` behavior:

- clamp finite `0..1`
- persist the PWA master value
- call `SoundStore.get().setMusicVolume(master)`
- call `SoundStore.get().setSoundVolume(Math.sqrt(master))`
- call `container?.setMusicVolume(master)`
- call `container?.setSoundVolume(Math.sqrt(master))`

This is not an engine workaround. It is the PWA master-slider mapping for Java-compatible `Sound` semantics.

### `src/styles.css`

Current CSS:

- centers boot and menu screens
- simple panelless menu
- `.game-host` fills available space
- hamburger is a fixed sibling over the page

Required CSS:

- `html`, `body`, and `#app` should use `overflow: hidden`
- use a fixed full-screen `.menu-screen`
- use a fixed full-screen `.boot-screen`
- add `.game-shell` and `.game-shell:fullscreen`
- make `.game-shell` `position: fixed; inset: 0; background: #000`
- make `.game-host` absolute/fixed within shell
- make `.game-host canvas` `display: block`, `image-rendering: pixelated`, and `outline: none`
- add `.game-host.cursor-hidden, .game-host.cursor-hidden canvas { cursor: none; }`
- use the reference hamburger shape: one `<span>` plus `::before` and `::after`
- support `[hidden]` on the hamburger
- keep black letterbox background visible behind the canvas

Avoid card-heavy decoration. This is a game shell, not a landing page.

### `src/app/ResourceManifest.ts`

Current manifest includes:

- icon
- font image/xml
- title/map/cutscene `.dat` files
- all sprite and tile sheets/xml
- all map/trigger/direction/type files
- all music files
- all 25 sound-effect files

Required behavior:

- keep this manifest as the outer PWA preload list
- do not use it as a substitute for `Main.loadNext()`
- keep resource refs relative to `/resources/`
- keep cache busting through `ResourceLoader.setCacheBust(versionInfo.buildStamp)`
- if resources are added later, update this manifest and the Java parity audit together

### `src/app/ServiceWorkerRegistrar.ts`

Current behavior:

- unregisters Jackal service workers and clears Jackal caches in Vite dev
- registers `/sw.js?v=${buildStamp}` in production
- calls `registration.update()`

Required behavior:

- keep dev clearing
- keep build-stamped registration
- no feature work is required for shell/fullscreen/save, but version handling should be kept synchronized with `version.json`, `public/sw.js`, `index.html`, and `manifest.webmanifest`

### `public/sw.js`

Current behavior:

- has hard-coded `APP_VERSION`
- has hard-coded `BUILD_STAMP`
- cache name includes both
- network-first with retry
- falls back to cache
- excludes dev/Vite paths from cache

Required behavior:

- keep retry behavior; it satisfies the loading-retry requirement better than the simpler reference workers
- update `APP_VERSION` and `BUILD_STAMP` on every deployment
- consider deriving the cache version from the query string like the reference projects in a later cleanup, but do not block feature work on that
- ensure navigation requests still work offline after first successful load

### `index.html`, `manifest.webmanifest`, `version.json`, And `package.json`

Current state:

- version is `0.1.1`
- build stamp is `20260804T000000Z`
- timestamp query parameters are present in icon, manifest, start URL, and script references
- package version matches `version.json`

Required behavior:

- increment version/build stamp with each deployable build
- keep all five version sites synchronized
- use the app version in `JackalGameStateStore` snapshots
- reject or clear saves when state schema version is incompatible

Version mismatch is not cosmetic once `Continue` exists. A stale service worker and a newer save serializer can otherwise disagree about resource and snapshot shape.

### `src/jackal/Main.ts`

Current important fields:

- `currentSong`
- `requestedSong`
- `loadIndex`
- `nextFrameTime`
- `mode`
- `random`
- `buttonMapping`
- `input`
- `konamiCode`
- score/life/stage/weapon scalars
- resource fields loaded by `loadNext()`
- static `mainInstance`
- static `gameMode`

Required bridge fields:

- `loadingCompleteHandler: ((gc: GameContainer) => boolean) | null`
- `loadingFinishedHandler: (() => void) | null`
- `stateSaveInvalidatedHandler: (() => void) | null`
- `windowedDisplayModeProvider: (() => { width: number; height: number }) | null`
- `browserFullscreenController: { isFullscreen(): boolean; enterFullscreen(): void; exitFullscreen(): void } | null`
- `browserSuspended: boolean`

Required bridge methods:

- `isLoadingScreenActive(): boolean`
- `completeLoadingImmediately(gc: GameContainer): void`
- `notifyLoadingFinished(): void`
- `isStateSaveReady(): boolean`
- `isStateSaveInvalidatingMenuActive(): boolean`
- `notifyStateSaveInvalidated(): void`
- `setBrowserSuspended(suspended: boolean): void`
- `clearInputPressedRecords(): void`
- optionally `stopAllSounds(): void` as alias for existing `stopAllSound()`
- `getWindowedDisplayMode(): { width: number; height: number }`

Required `update(gc, delta)` adjustment:

- if `browserSuspended` is true, call `resetNextFrameTime()` and return
- do not let hidden-tab catch-up loops execute after resume

Required `fullScreenToggleCheck(gc)` adjustment:

- prefer browser shell fullscreen when controller exists
- treat shell fullscreen and container fullscreen as separate states
- restore responsive windowed size on exit
- reset next frame time after toggle
- do not throw browser fullscreen promise failures into the game loop

Required `loadNext()` adjustment:

- at case `41`, call a one-shot loading completion handler before requesting intro
- if the handler returns `true`, skip `requestMode(Modes.INTRO, this.gc)`
- otherwise preserve Java behavior
- call `notifyLoadingFinished()` exactly once when loading finishes

Required save invalidation:

- when entering title/pre-game modes after gameplay, call `notifyStateSaveInvalidated()`
- do not invalidate during first boot loading before any save can exist unless the shell wants to clear stale saves proactively

### `src/jackal/LoadingMode.ts`

Current behavior:

- `init(main, gc)` stores references
- `update(gc)` calls `main.loadNext()`
- `render(gc, g)` draws the Java loading bar and text

Required behavior:

- no DOM knowledge
- no hamburger knowledge
- keep render parity
- if fast-forwarding, the shell/Main bridge should call this same update path rather than adding a new loading shortcut

### `src/jackal/HumanInput.ts`

Current behavior:

- wraps Slick `Input`
- snapshots directional/fire/shoot state
- exposes `isF12()`, `isEscape()`, `isPause()`, `isEnter()`
- has `clearKeyPressedRecord()`

Required bridge consideration:

- `clearInputPressedRecords()` in `Main` should call `this.input.clearKeyPressedRecord()`
- if `slick2d-ts` `Input` exposes controller pressed-record clearing, call that too
- after restore or resume, clear input records to prevent the menu click/key from leaking into gameplay

Do not change normal `snap()` behavior.

### `src/jackal/Song.ts`

Current behavior:

- wraps `Music` intro/intro2/loop
- tracks `playing`
- tracks `playedIntro2`
- stops intro/intro2/loop individually
- transitions intro -> intro2 -> loop in `update()`

Required save/restore consideration:

- short sound effects do not need active playback restore
- `Song.playing` and `Song.playedIntro2` matter for music continuity
- restoring exact music position requires access to underlying `Music.getPosition()` and `Music.setPosition()`
- if exact music continuity is too risky for phase one, document it as a deliberate PWA restore limitation rather than silently omitting it

### `src/jackal/GameMode.ts`

Current behavior:

- `setStage(...)` copies mutable `tileMap` and `typesMap` from immutable loaded stage data
- `init(...)` creates per-layer `elements`, resets friendly soldier count, creates `Player`, sets camera
- `processTriggers()` creates active gameplay entities
- `update(...)` mutates entities, removes them, updates lists, tracks camera and pause

Required save/restore consideration:

- restore must happen only after `Main.loadNext()` has loaded stages/resources
- restore must not call active entity constructors
- restore must rebuild `elements`, `enemies`, `solids`, and `mines`
- restore must reconnect `Main.gameMode`
- restore must reconnect `GameMode.player`
- restore must restore mutable `tileMap`, `typesMap`, and `triggedGroups`
- restore must restore camera pan state and `cameraPanListener` references by object ID
- restore must rebuild current stage references from `main.stages[stageIndex]`

### `src/jackal/GameElement.ts`, `HitElement.ts`, And `Enemy.ts`

`GameElement` constructor side effects:

- sets `main = Main.mainInstance`
- sets `gameMode = Main.gameMode`
- calls subclass default initialization
- calls `init()`
- calls `gameMode.add(this)`

Therefore active entity restore must not use normal constructors.

`HitElement` restore fields:

- `hitField`
- `hitX1`
- `hitY1`
- `hitX2`
- `hitY2`
- `trail`
- `trailIndex`

`Enemy` restore fields:

- `solid`
- `mine`
- `solidX1`
- `solidY1`
- `solidX2`
- `solidY2`
- `mineX1`
- `mineY1`
- `mineX2`
- `mineY2`
- `bulletHits`
- `points`
- `explosionX`
- `explosionY`
- `playSoundOnRemove`

The serializer should create active instances using:

```text
Object.create(Constructor.prototype)
```

then assign fields and run explicit reconnect hooks.

### `src/jackal/persistence/*`

These files do not exist yet.

Required first pass:

- `GameStateSnapshot.ts`
- `JackalGameStateStore.ts`
- `JackalGameStateSerializer.ts`
- `GameElementTypeRegistry.ts`

Implementation rule:

- fail loudly on unknown object fields
- do not silently drop object references
- do not serialize Slick/browser resources
- do not write localStorage in the frame loop

### Historical Java Copy

Reference projects include `desktop`.

Jackal currently does not.

This is not required to make the PWA features run, but it is useful for parity preservation. If added, it should be a direct historical copy and not part of the Vite build.

## Parity Boundary

### Parity-Preserving Changes

These changes should not alter game rules, entity behavior, scoring, collision, timing, rendering coordinates, or audio choice:

- Add lifecycle query methods to `Main`.
- Add loading completion callbacks to `Main`.
- Add a fast-forward method that calls the existing loading path.
- Add app-shell resize/fullscreen/menu logic outside `src/jackal`.
- Add app-shell localStorage volume persistence.
- Add `AppGameContainer.setErrorHandler()` in the shell.
- Add a historical copy of the Java project under a separate root such as `desktop`.

### Necessary Parity Breaks

These are browser/PWA requirements with no exact Java desktop counterpart:

- Browser audio unlock must happen after a user gesture.
- The PWA menu exists outside the Java game.
- `New Game` and browser `Continue` are PWA controls, not Java `IntroMode` menu options.
- Browser fullscreen should be controlled on a DOM shell element so the hamburger remains visible.
- Page visibility/focus suspension is browser lifecycle behavior.
- Full runtime state serialization is a browser feature not present in Java Jackal.
- Visible loading can be skipped on repeat launch, but the Java loading sequence must still run.

### Changes To Avoid

Avoid these unless a separate parity bug proves they are necessary:

- Do not change gameplay math.
- Do not change entity update order.
- Do not change collision bounds.
- Do not change `GameMode.processTriggers()` order.
- Do not change `Player.update()` firing, movement, respawn, or invincibility rules.
- Do not shortcut `Main.loadNext()` by directly assigning loaded resources.
- Do not replace Java mode flow with PWA mode flow.
- Do not serialize runtime resources such as `Image`, `Sound`, `Music`, `Graphics`, `Input`, `GameContainer`, or `XMLPackedSheet`.

## Proposed File Structure

Current structure:

- `src/app`
- `src/jackal`
- `src/java`
- `public/resources`
- root PWA files

Recommended additions:

- `src/app/JackalWebApp.ts`: expand existing shell.
- `src/jackal/persistence/GameStateSnapshot.ts`: typed JSON shape.
- `src/jackal/persistence/JackalGameStateStore.ts`: localStorage wrapper.
- `src/jackal/persistence/JackalGameStateSerializer.ts`: game-specific capture/restore.
- `src/jackal/persistence/GameElementTypeRegistry.ts`: active entity type registry.
- `desktop`: copied Java project for historical preservation, analogous to Stickvania and MS Pac-Man.
- Optional `src/app/version.ts` or build script if version stamping is centralized later.

Do not put PWA-only menu, ResizeObserver, service worker, or DOM code inside Java-mapped Jackal classes.

## Detailed Change Plan

## 1. PWA Shell Changes

Primary file:

- `src/app/JackalWebApp.ts`

### 1.1 Add Shell State

Add fields conceptually equivalent to:

- `container: AppGameContainer | null`
- `game: Main | null`
- `scaledGame: ScalableGame | null`
- `activeGameShell: HTMLElement | null`
- `activeGameHost: HTMLElement | null`
- `resizeObserver: ResizeObserver | null`
- `resizeAnimationFrame: number`
- `hamburgerVisibilityAnimationFrame: number`
- `cursorGameHost: HTMLElement | null`
- `cursorHideTimer: number`
- `pointerOverGameHost: boolean`
- `runtimeResourcesLoaded: boolean`
- `volume: number`
- `gameStateStore: JackalGameStateStore`

`runtimeResourcesLoaded` must remain memory-only. It should not be stored in localStorage.

### 1.2 Menu UI

Replace the single `Start` button with:

- `New Game`
- `Continue`
- volume slider
- optional error message

Behavior:

- `Continue` is disabled unless `gameStateStore.hasValidSave()` returns true.
- `New Game` clears saved state before starting.
- `Continue` starts with `restoreSavedGame = true`.
- The menu is the required user gesture before Web Audio starts.

Keep the PWA menu outside the Java game render path.

### 1.3 Volume UI

Persist volume to localStorage, following the references:

- Read safely with try/catch.
- Clamp to `[0, 1]`.
- Update slider label/icon if present.
- Apply to `SoundStore`.
- Apply to container if one exists.

Current Jackal uses:

- music volume = `masterVolume`
- sound volume = `Math.sqrt(masterVolume)`

That sqrt is required because the Java Slick2D-compatible public `Sound` path applies the configured sound volume twice. This is not a `slick2d-ts` bug. It is the app-shell mapping needed when the PWA slider is a master volume control while `setSoundVolume(...)` remains a Java-parity API.

### 1.4 Resource Loading

Current first-start loading should stay conceptually similar:

1. Configure `ResourceLoader`.
2. Add `/resources/`.
3. Set cache bust to `versionInfo.buildStamp`.
4. Set retry options.
5. Show loading splash with animated dots.
6. Preload `RESOURCE_MANIFEST`.
7. On failure, show menu error.

For repeat launch after `runtimeResourcesLoaded`:

- Do not show the outer resource splash.
- Do not clear `ResourceLoader` cache.
- Do not skip Java loading work.
- Create the new game normally.
- Start the container.
- Call `main.completeLoadingImmediately(container)`.
- Await `ResourceLoader.waitForAll()`.
- Set `runtimeResourcesLoaded = true`.

If loading fails, set or leave `runtimeResourcesLoaded` false. Do not let a failed first load poison future starts.

### 1.5 Game Shell

Create a shell like:

- `#game-shell`
- `#game-host`
- hidden `#hamburger-button`

The hamburger should be a DOM button, not a Slick-rendered sprite.

The hamburger should be hidden:

- while the outer DOM loading screen is active
- while `Main.isLoadingScreenActive()` is true
- while fast-forward loading is running
- after game teardown

Return-to-menu should be ignored while loading:

- If `game?.isLoadingScreenActive()` is true, return.

This protects partially constructed resource and game state.

### 1.6 Start Game Flow

Target flow:

1. `destroyGame()`.
2. Determine `showVisibleLoading = !runtimeResourcesLoaded`.
3. If `showVisibleLoading`, render outer resource loading and preload manifest.
4. Unlock audio from the user gesture using `SoundStore.get().unlock()` if available, or `getAudioContext().resume()`.
5. Render game shell with hidden hamburger.
6. Set `Display.setParent(host)`.
7. Create `Main`.
8. Create `ScalableGame`.
9. Create `AppGameContainer` sized to the current responsive display mode.
10. Save `game`, `container`, `scaledGame`, `activeGameShell`, and `activeGameHost`.
11. Install `container.setErrorHandler(...)`.
12. Install `Main` browser bridge hooks.
13. Start the container.
14. If visible loading is being skipped, call `Main.completeLoadingImmediately(container)` and await `ResourceLoader.waitForAll()`.
15. Start responsive sizing.
16. Start cursor auto-hide.
17. Start hamburger visibility monitor.
18. Apply volume.

The important detail is that hidden fast-forward still runs through the same Java loading side effects.

### 1.7 Error Handling

Use `AppGameContainer.setErrorHandler()`.

Current uncaught frame errors should instead:

- destroy the game
- return to menu or boot error
- show a user-facing load/runtime error

For restore failures:

- clear the invalid save
- show menu error saying restore failed

For first-load failures:

- show menu error saying resources failed
- keep `Continue` disabled if save is invalid

### 1.8 Responsive Sizing

Jackal original Java starts:

- `new ScalableGame(main, DISPLAY_WIDTH, DISPLAY_HEIGHT, true)`
- `new ApplicationGameContainer(..., DISPLAY_WIDTH, DISPLAY_HEIGHT, false)`
- `appGameContainer.setResizable(true)`

The browser equivalent should:

- keep logical game resolution at `Main.DISPLAY_WIDTH` x `Main.DISPLAY_HEIGHT` (`1024x960`)
- size the container to the browser content area
- let `ScalableGame` aspect-fit the game into the container
- rely on black background for bars
- update on `ResizeObserver`, `window.resize`, and `fullscreenchange`

Use `Math.trunc` for browser display dimensions.

The current `slick2d-ts` `ScalableGame` is probably sufficient for Jackal because the original Java also used `ScalableGame`. However, it does not implement `containerSizeChanged()`. Options:

1. Keep `slick2d-ts` `ScalableGame` and call `scaledGame.recalculateScale()` after shell-driven `setDisplayMode()`.
2. Add a local `ScalableGame2` only if input transform or resize timing proves wrong.

Option 1 minimizes parity breaks.

### 1.9 Fullscreen

Do not rely on canvas fullscreen alone if we want the hamburger visible in fullscreen.

Browser Fullscreen API makes only the fullscreen element and descendants visible. If the canvas alone becomes fullscreen, a sibling hamburger button will not be visible. Therefore:

- fullscreen target should be `#game-shell`
- `#game-host` and hamburger should both be children of `#game-shell`
- `Main.fullScreenToggleCheck()` should call a browser fullscreen controller when available

The shell needs:

- `isGameShellFullscreen()`
- `enterGameShellFullscreen()`
- `exitGameShellFullscreen()`
- `getResponsiveWindowedDisplayMode()`
- `getResponsiveFullscreenDisplayMode()`
- `getAspectFitDisplayMode()`

`F12` can enter fullscreen because it is a keyboard user gesture. `Escape` should exit fullscreen or windowed mode analogously to Java.

### 1.10 Cursor Auto-Hide

Reference projects hide the cursor over the game host after a delay. This is shell-only behavior.

Add:

- pointer enter/leave/move/down/up/wheel listeners on `#game-host`
- `.cursor-hidden` CSS class
- clear timer on teardown

This should not modify Jackal gameplay.

### 1.11 Page Lifecycle

Add page lifecycle handlers:

- `pagehide`
- `pageshow`
- `blur`
- `focus`
- `visibilitychange`

Behavior:

- If game is loading, do not save or suspend.
- If game is running and loses focus/visibility, set browser suspended and save if state is ready.
- On focus/visibility return, clear browser suspended.

This requires `Main.setBrowserSuspended(boolean)`.

## 2. CSS Changes

Primary file:

- `src/styles.css`

Current CSS has:

- centered boot/menu screens
- simple menu panel
- simple hamburger
- `game-host`

Needed CSS additions:

- fixed full-window shell
- `overflow: hidden` on `html`, `body`, and `#app`
- black fixed game shell
- absolute/fixed game host
- centered canvas
- `image-rendering: pixelated`
- `max-width: 100vw`
- `max-height: 100vh`
- hamburger `[hidden] { display: none; }`
- improved hamburger matching reference visual
- menu buttons for `New Game` and `Continue`
- disabled `Continue` state
- volume row with stable layout
- error text
- cursor-hidden class

Do not add visible instructional text explaining how the PWA works.

## 3. Main Class Bridge Changes

Primary file:

- `src/jackal/Main.ts`

Original Java file:

- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java`

These are intentional browser bridge additions. They should be documented as parity deviations.

### 3.1 Add Browser Bridge Fields

Candidate fields:

- `public appGameContainer: AppGameContainer | null`
- `public scalableGame: ScalableGame | null`
- `public loadingCompleteHandler: ((gc: any) => boolean) | null`
- `public loadingFinishedHandler: (() => void) | null`
- `public stateSaveInvalidatedHandler: (() => void) | null`
- `public windowedDisplayModeProvider: (() => { width: number; height: number }) | null`
- `public browserFullscreenController: BrowserFullscreenController | null`
- `private browserSuspended: boolean`

Do not use these fields inside core gameplay logic except for lifecycle pauses and fullscreen control.

### 3.2 Loading State Query

Add:

- `isLoadingScreenActive(): boolean`

For Jackal this should return true when:

- `this.mode instanceof LoadingMode`

No additional game modes should be considered loading unless future code adds one.

### 3.3 Complete Loading Immediately

Add:

- `completeLoadingImmediately(gc: GameContainer): void`

The method must not directly assign resources.

It should repeatedly drive the existing loading mode path. The safest structure is:

- while current mode is `LoadingMode`, call `this.mode.update(gc)`
- rely on `LoadingMode.update()` to call `main.loadNext()`
- rely on `loadNext()` case `41` to transition out of loading
- include a guard against infinite loops

Reason:

`setMode(new LoadingMode(), gc)` immediately calls `mode.update(gc)` in Jackal, so the first loading step has already run when the mode is installed. Fast-forwarding by calling `mode.update(gc)` preserves the same per-step behavior, including `percentWidth` updates even though they are not visible.

### 3.4 Loading Completion Callback

Add:

- `notifyLoadingFinished(): void`

This should call `loadingFinishedHandler` once and then clear it.

Modify `loadNext()` case `41` carefully:

- If `loadingCompleteHandler` exists, call it at the loading-complete boundary.
- If it returns true, assume it restored a state and do not force `Modes.INTRO`.
- If it returns false or is absent, continue the original Java behavior: `requestMode(Modes.INTRO, this.gc)`.
- Call `notifyLoadingFinished()` after the loading phase has completed.

The handler is needed for browser `Continue`, because restore must happen after all resources/classes/stages exist but before the normal title/intro path takes over.

Do not change cases `0` through `40` in `loadNext()`.

### 3.5 Browser Suspension

Add:

- `setBrowserSuspended(value: boolean): void`

Modify `update(gc, delta)`:

- If browser-suspended, set `nextFrameTime = Sys.getTime()` and return.

This avoids a burst of catch-up updates after the tab regains focus.

This is a PWA lifecycle break from Java desktop behavior, but it is isolated and matches the reference projects.

### 3.6 Save Readiness Queries

Add:

- `isStateSaveReady(): boolean`
- `isStateSaveInvalidatingMenuActive(): boolean`

Suggested Jackal semantics:

- Save ready only when `mode instanceof GameMode`.
- Save ready only if `Main.gameMode` exists.
- Save ready only if `Main.gameMode.player` exists.
- Save ready only if the game is not loading.
- Title/intro/options/difficulty/input/continue/loading modes are not save-ready.
- Title/intro/options/difficulty/input/continue/loading modes should invalidate or clear saved browser state if reached from menu/new game.

Important distinction:

- Java `ContinueMode` is the original in-game continue screen after player death.
- PWA `Continue` is browser full-state restore.

Do not conflate these.

### 3.7 Input Record Clearing

Add:

- `clearInputPressedRecords(): void`

It should clear `this.input` pressed records and underlying `gc.getInput()` records if available.

Use after restore to prevent the click/key that started restore from leaking into gameplay.

### 3.8 Stop Sound Alias

Current Java-mapped method is:

- `stopAllSound()`

Reference shell code expects:

- `stopAllSounds()`

Options:

1. Keep shell calling `stopAllSound()` to preserve Java naming.
2. Add `stopAllSounds()` as a web convenience alias that calls `stopAllSound()`.

Option 1 is more parity-preserving. Option 2 is harmless but should be marked as a bridge method.

### 3.9 Fullscreen Bridge

Current `fullScreenToggleCheck(gc)` directly calls:

- `gc.setFullscreen(false)`
- `gc.setFullscreen(true)`

For the browser shell, it should prefer `browserFullscreenController` when present.

Target behavior:

- If `F12` or `Escape` is pressed and shell fullscreen is active, exit shell fullscreen.
- Else if Slick container fullscreen is active, exit Slick fullscreen and restore responsive windowed display mode.
- Else if `F12` is pressed and not `Escape`, enter shell fullscreen if controller exists.
- Else fallback to original `gc.setFullscreen(true)` if no browser controller exists.
- Always reset next frame time after toggling.

This keeps the hamburger available in fullscreen.

## 4. LoadingMode Changes

Primary file:

- `src/jackal/LoadingMode.ts`

No gameplay change should be necessary.

`LoadingMode.update(gc)` already:

- calls `this.main.loadNext()`
- updates `percentWidth`
- wraps errors as `SlickException("Loading error", t)`

`LoadingMode.render(gc, g)` already draws the Java loading screen.

The shell should hide the hamburger while this mode is active. `LoadingMode` itself should not know about the hamburger.

## 5. Game State Persistence

This is the largest feature. It should be implemented as a dedicated phase after shell loading/fullscreen/hamburger behavior is stable.

### 5.1 Files

Add:

- `src/jackal/persistence/GameStateSnapshot.ts`
- `src/jackal/persistence/JackalGameStateStore.ts`
- `src/jackal/persistence/JackalGameStateSerializer.ts`
- `src/jackal/persistence/GameElementTypeRegistry.ts`

### 5.2 Store

`JackalGameStateStore` should mirror the reference stores:

- fixed localStorage key, e.g. `"jackal.game-state"`
- `save(main: Main): boolean`
- `restore(main: Main, gc: GameContainer): boolean`
- `hasValidSave(): boolean`
- `clear(): void`
- version validation
- snapshot validation
- try/catch around all localStorage access

It should clear invalid or unsupported snapshots.

### 5.3 Snapshot Shape

Minimum top-level shape:

- `version`
- `appVersion`
- `savedAt`
- `mainFields`
- `random`
- `mode`
- `gameMode`
- `player`
- `elements`
- `stage`
- `staticState`
- `audio`

Do not store runtime resources.

### 5.4 Main Fields To Capture

Capture scalar state such as:

- `extraLives`
- `extraLivesStr`
- `score`
- `scoreStr`
- `stageIndex`
- `hasMissiles`
- `missilePower`
- `friendlySoldiersPickedUp`
- `hardMode`
- `continued`
- `controllerGrenadePressed`
- `controllerGunPressed`
- fade fields if active: `fading`, `fadeIndex`, `fadeOut`
- `konamiCode` scalar state
- selected mode-specific scalar state if the current mode is save-ready

Exclude:

- `random` from main fields because it gets its own snapshot
- `buttonMapping` unless we decide key bindings should travel with saves
- `input`
- `gc`
- `nativeCursor`
- `mode` direct object
- `currentSong`
- `requestedSong`
- all `Image`, `Sound`, `Music`, `Song`, `XMLPackedSheet`, `Graphics`, `GameContainer`, DOM, or Slick objects
- all loaded sprite/image arrays
- `stages` as loaded resource data, except mutable per-game copies in `GameMode`

### 5.5 Random State

Jackal uses `new Random()` from `src/java/JavaRuntime.ts`, which extends `slick2d-ts` `JavaRandom`.

`JavaRandom` stores private 16-bit limbs:

- `seed0`
- `seed1`
- `seed2`

The serializer should capture and restore those fields exactly, as Stickvania does.

Do not call `setSeed()` on restore, because that scrambles a public seed. We need internal state continuity.

### 5.6 GameMode Fields

`GameMode` is the core save object.

Capture:

- `stageIndex`
- `tileMap`
- `typesMap`
- `triggedGroups`
- `waterAlphaIndex`
- `conveyorOffset`
- `conveyorLastIndex`
- `conveyorDelta`
- `cameraX`
- `cameraY`
- `maxCameraX`
- `maxCameraY`
- `paused`
- `triggerY`
- `bossCameraPan`
- `endingCameraPan`
- `playing`
- `stageCompletedFlag`
- `stageCompletedDelay`
- `player`
- `elements` by layer
- enemy/solid/mine membership through object IDs
- `cameraPanListener` as an object reference if it is a game entity/manager, otherwise special-case it

Do not capture:

- `main`
- `gc`
- `input`
- `stage` as full resource object
- `tiles`
- `groups`
- `triggerMap`
- `groupsMap`
- `directions`
- `g`

On restore:

1. Ensure loading completed.
2. Recreate/select the correct stage from already loaded `main.stages`.
3. Initialize a `GameMode` for that stage.
4. Replace mutable maps and scalar fields.
5. Recreate all active entities without running gameplay constructors.
6. Rebuild `elements`, `enemies`, `solids`, and `mines` lists.
7. Reconnect `Main.gameMode`.

### 5.7 Player Fields

Capture `Player` fields:

- `x`
- `y`
- `angle`
- `nextAngle`
- `displayAngle`
- `angleVelocity`
- `angleSteps`
- `diagonalDelay`
- `targetAngle`
- `lastTargetAngle`
- `fireAngle`
- `rumble`
- `invincible`
- `invincibleColor`
- `weaponArmed`
- `gunArmed`
- `fireReleased`
- `shootReleased`
- `longRange`
- `respawning`
- `pows`
- `releaseablePows`
- `inSwamp`

Reconnect:

- `main`
- `gameMode`
- `input`
- `mines`

Do not call `new Player()` during object restore unless using it only as an initialization source and then overwriting. The serializer can create via `Object.create(Player.prototype)` and assign fields.

### 5.8 GameElement Graph

`GameElement` constructor has side effects:

- assigns `this.main = Main.mainInstance`
- assigns `this.gameMode = Main.gameMode`
- calls subclass default initialization
- calls `init()`
- adds the object to `gameMode`

Therefore, restore should not call normal constructors for active entities.

Use `Object.create(Constructor.prototype)` for restored entities, then set fields.

Base fields:

- `removeFlag`
- `enemy`
- `enemyBullet`
- `x`
- `y`
- `layer`
- `changeLayerValue`

`HitElement` fields:

- `hitField`
- `hitX1`
- `hitY1`
- `hitX2`
- `hitY2`
- `trail`
- `trailIndex`

`Enemy` fields:

- `playSoundOnRemove`
- `solid`
- `mine`
- solid bounds
- mine bounds
- points/hit counters if present through subclasses

Generic serializer strategy:

- capture all enumerable own fields
- skip runtime fields: `main`, `gameMode`, `gc`, `input`, `g`, `sprites` if it points to loaded images, `image`, `sound`, `music`
- encode object references to other `GameElement` instances by ID
- encode arrays recursively
- encode `ArrayList` contents explicitly
- validate unsupported object values and fail loudly

No silent dropping of unknown object fields.

### 5.9 GameElement Type Registry

The registry must include every class that can appear in `GameMode.elements`.

Likely registry entries include:

- `Airplane`
- `AppearingBrownTank`
- `AppearingEnemyHelicopter`
- `AppearingGrayJeep`
- `AppearingPlane`
- `AppearingSoldier`
- `Bomb`
- `BossBlueTank`
- `BossBlueTanksManager`
- `BossGarage`
- `BossGarageManager`
- `BossHeadquarters`
- `BossHeadquartersManager`
- `BossHelicopter`
- `BossHelicopterManager`
- `BossShipGun`
- `BossShipManager`
- `BossStatue`
- `BossStatuesManager`
- `BossSuperTank`
- `BossSuperTankGun`
- `BrownTank`
- `BulletHit`
- `CannonTruck`
- `Chinook`
- `CliffGun`
- `CliffMissileLauncher`
- `Column`
- `DeadEnemySoldier`
- `ElephantGun`
- `ElephantMissile`
- `EnemyBullet`
- `EnemyHelicopter`
- `EnemySoldier`
- `Explosion`
- `Fire`
- `FireTank`
- `Flame`
- `FlashingSkull`
- `FloorGun`
- `FloorMissileLauncher`
- `FriendlyHelicopter`
- `FriendlySoldier`
- `Gate`
- `GrayBoat`
- `GrayJeep`
- `GrayTank`
- `GreenBoat`
- `Grenade`
- `Help`
- `House`
- `Hut`
- `InvisibleStar`
- `IntroPlayer`
- `LandingPort`
- `Laser`
- `LasersManager`
- `Mine`
- `MissionAccomplished`
- `Parachute`
- `ParkedBrownTank`
- `ParkedGrayJeep`
- `PlayerBullet`
- `PlayerMissile`
- `Rock`
- `RotatingGun`
- `Star`
- `Statue`
- `StatueMissile`
- `StatueSeekerMissile`
- `Submarine`
- `SubmarineMissile`
- `SuperFire`
- `SwampMissile`
- `SwampMissileLauncher`
- `TileDebris`
- `Train`
- `TrainManager`
- `TravelingExplosion`
- `TroopsTruck`

This list should be validated during implementation by searching for `extends GameElement`, `extends Enemy`, and direct `new` calls inside `GameMode.processTrigger()` and entity update methods.

### 5.10 Restore Hooks

Some classes store resource-derived fields that should not be serialized raw.

Examples:

- `RotatingGun.sprites` points to one of `main.grayGuns`, `main.greenGuns`, or `main.brownGuns`.
- `EnemySoldier` may hold sprite collections/type-driven state.
- Boss gun/tank classes may hold trackers/managers.
- `FriendlyHelicopter.player` should reconnect to `gameMode.player`.
- `FriendlySoldier` may reference a `FriendlyHelicopter`.
- Audio-producing entities may rely on active looping sound state.

The serializer needs `runAfterRestoreHooks()` similar to Stickvania.

Hooks should:

- set `thing.main = main`
- set `thing.gameMode = gameMode`
- reconnect `Player.input`, `Player.mines`, `Player.main`, `Player.gameMode`
- restore known image-array references based on class/type fields
- restore manager/list references
- restore alpha or state-derived image settings if any were changed at runtime

### 5.11 Static State

Capture and restore static mutable state:

- `FriendlySoldier.count`
- `CutsceneSequence.modes`

`CutsceneSequence.modes` affects random cutscene order after stage completion. It is private in TS syntax but emitted as a normal property, so serializer can access it with bracket notation if necessary. A helper method would be cleaner but would be a bridge addition.

Other static tables such as recoil arrays, water alphas, turns, and precomputed sprite tables are deterministic and loaded from class static initialization. They should not be serialized.

### 5.12 Audio State

Capture:

- `Main.currentSong`
- `Main.requestedSong`
- each `Song` playing state
- `Song.playedIntro2`
- active `Music` identity
- active music position
- active music volume
- active music loop state
- paused/global suspended state if relevant

Jackal `Song` currently exposes:

- `intro`
- `intro2`
- `loop`
- `playing`
- `playedIntro2`

Slick `Music` exposes some methods:

- `playing()`
- `getPosition()`
- `setPosition()`
- `getVolume()`
- `setVolume()`
- `play()`
- `loop()`
- `pause()`
- `ready()`

But important fields like `looped`, `paused`, and `playbackRate` are private in TypeScript source. The serializer may need bracket access, as the reference serializers do.

Do not serialize short sound effects as active state. One-shot sound effects can be lost on restore. Looping/long music should be restored.

### 5.13 Save Invalidating Conditions

Clear saved state when:

- user presses `New Game`
- current mode is title/intro/options/difficulty/input/loading
- restore fails validation
- app version/state version mismatch if incompatible
- game returns to pre-game title state

Do not clear saved state just because a normal in-game Java `ContinueMode` appears after death unless the chosen policy is that death/continue screen is not restorable. Recommended policy: do not save from Java `ContinueMode`, because restoring into the continue prompt is not gameplay and could conflict with browser `Continue`.

## 6. Integer Math And Performance

### 6.1 Gameplay Integer Math

Do not change gameplay integer math as part of the PWA feature pass.

Existing conversion helpers include:

- `javaInt`
- `javaIntDiv`
- `javaFloat`
- `javaDouble`
- `javaRoundFloat`
- `javaLong`

Recent game bugs came from integer/initialization parity issues. PWA changes should avoid touching gameplay calculations.

### 6.2 Display Math

For browser display dimensions:

- use `Math.trunc`
- clamp to at least `1`
- do not use Java `int` wrappers in high-frequency resize code unless necessary

Display size objects are created only on resize/fullscreen events, not per gameplay frame.

### 6.3 Serialization Math

Serialization runs on suspend/menu return, not in the hot update loop.

It can allocate snapshot objects. That is acceptable because it is not per-frame.

Do not serialize `bigint` values directly to JSON. Jackal's `Stage.directions` are `bigint[]`, but they are loaded resource data and should not be part of the save snapshot. If any future mutable `bigint` state must be saved, encode as string and decode explicitly.

### 6.4 Runtime Performance

Avoid adding:

- per-frame DOM queries
- per-frame object creation in the game update path
- per-frame JSON work
- per-frame localStorage writes
- varargs-heavy helpers in hot paths

The hamburger visibility monitor can poll with `requestAnimationFrame` only while loading. After loading completes, it should stop.

Responsive resizing should be RAF-throttled.

## 7. Slick2D Runtime Notes

### 7.1 Useful Existing APIs

`AppGameContainer` already has:

- `setErrorHandler(handler)`
- async `start()`
- `destroy()`
- `setDisplayMode(width, height, fullscreen)`
- `setFullscreen(fullscreen)`
- resize/fullscreen internals
- `ResourceLoader.waitForAll()` integration

`ResourceLoader` already has:

- `setCacheBust`
- `setRetryOptions`
- `preloadResources`
- `waitForAll`
- `hasPending`
- `clearFailures`

`SoundStore` already has:

- `unlock()`
- `getAudioContext()`
- `setMusicVolume`
- `setSoundVolume`
- resource decode tracking

### 7.2 Slick2D Sound Volume Parity Note

`slick2d-ts` applies sound-effect volume twice on the public `Sound` wrapper path:

- `Sound.play()` multiplies the per-call volume by `SoundStore.get().getSoundVolume()`.
- `SoundStore.playSound()` multiplies that value by `this.soundVolume` again.

Java Slick2D does the same on the public `Sound` wrapper path:

- `Sound.play(float pitch, float volume)` multiplies by `SoundStore.get().getSoundVolume()`.
- `AudioImpl.playAsSoundEffect(...)` forwards that gain.
- `SoundStore.playAsSoundAt(...)` applies `gain *= soundVolume`.

Therefore, for Java parity, do not remove the second multiply from `slick2d-ts`.

Jackal currently maps its PWA master slider by setting sound volume to `sqrt(masterVolume)`. That yields `perSoundVolume * masterVolume` after the Java-compatible double multiplication.

A separate Slick2D parity note file was created for this so another AI does not incorrectly "fix" the engine.

## 8. Historical Java Copy

Reference projects keep a `desktop` directory with the original Java project and assets.

Jackal currently does not have a `desktop` copy.

Recommended future structure:

- `desktop/src/jackal/*.java`
- `desktop/src/images`
- `desktop/src/maps`
- `desktop/src/music`
- `desktop/src/soundeffects`
- `desktop/src/icons`
- `desktop/src/org/newdawn/slick/...` for Jackal's custom desktop container classes
- `desktop/nbproject`
- `desktop/build.xml`
- `desktop/manifest.mf`
- optional `desktop/README.md`

This is historical preservation and audit support. It should not be imported by the PWA build.

## 9. Implementation Order

Recommended order:

1. Add loading lifecycle bridge to `Main`.
2. Update `JackalWebApp` to hide hamburger during canvas loading.
3. Add `runtimeResourcesLoaded` and hidden fast-forward loading.
4. Add `AppGameContainer.setErrorHandler()`.
5. Add responsive sizing and fullscreen shell.
6. Improve PWA menu and persist volume.
7. Add page lifecycle suspension without save/restore first.
8. Add persistence files and browser `Continue`.
9. Add historical `desktop` copy.
10. Audit and document parity deviations.

Do not start with save/restore. Save/restore depends on loading lifecycle, shell lifecycle, and mode readiness.

## 10. Verification Plan

After implementation:

### Build And Lint

- `npm run typecheck`
- `npm run lint`
- `npm run build`

### Loading

Verify:

- first launch shows outer loading splash
- no hamburger on outer loading splash
- no hamburger during canvas `LoadingMode`
- loading errors display user-facing error
- failed loading does not mark `runtimeResourcesLoaded`
- second launch in same page session skips visible loading
- second launch still has all images/audio/stages initialized

### Menu

Verify:

- menu has `New Game`
- menu has `Continue`
- `Continue` disabled without save
- volume persists across menu/game cycles
- New Game clears save
- returning to title/pre-game clears save

### Scaling

Verify:

- windowed browser resize letterboxes with black bars
- fullscreen letterboxes with black bars
- canvas remains pixelated
- input coordinates still match the scaled game
- hamburger remains visible in fullscreen after loading

### Lifecycle

Verify:

- pagehide saves if save-ready
- blur/focus suspends/resumes without catch-up burst
- no save during loading
- no save on title/options/input screens

### Save/Restore

Verify at minimum:

- normal stage gameplay
- paused gameplay
- active enemies and bullets
- carried POWs
- dropped-off POWs and helicopter pickup
- active boss fights
- stage-complete delay/fade
- random enemy behavior continuity after restore
- score/lives/extra-life thresholds
- current music identity and position
- hard mode state
- current mutable map tiles/types after destroyed buildings/gates/etc.

### Audio

Verify:

- music volume follows slider
- sound effects follow slider
- sound effects are not weak at master volume 1
- sound effects maintain relative per-call volumes like `0.6` and `0.65`
- looped helicopter/music stop on menu return

## 11. Open Concerns

### Full Save/Restore Is Large

Jackal has many active entity classes, and constructors have side effects. A correct serializer must be explicit about object identity and references. This is the hardest part of the requested feature set.

### Browser Fullscreen Is Async

Java fullscreen is synchronous from the game's perspective. Browser fullscreen returns promises and can fail. The bridge should catch and report failures without throwing inside the gameplay update loop.

### Resource Cache Semantics

`ResourceLoader` byte cache can persist across destroyed game containers. `AL.destroy()` clears decoded audio buffers. Therefore repeat launch skip must still run `loadNext()` and wait for queued audio decodes.

### Audio Volume Perception

Jackal's current sqrt compensation is mathematically correct because the Java-compatible public `Sound` path squares the configured sound volume. This should remain unless the project deliberately introduces a separate browser-only audio master bus.

If effects still sound weak:

- first verify the PWA slider is at master `1`
- then compare decoded source asset loudness against the original `.ogg` files
- then inspect game-side throttling and one-shot overlap rules
- do not remove the Java-compatible second sound-volume multiply as the first fix

### Static Mutable State

`FriendlySoldier.count` and `CutsceneSequence.modes` must be included in save/restore or restored games can diverge from the original runtime.

### Input Leakage

The click/key that starts a game or restore must not carry into Jackal's input state. Clear input pressed records after loading/restoring.

## Final Recommendation

Proceed in two stages:

1. Implement shell/lifecycle/loading/fullscreen/menu improvements first, with small `Main` bridge hooks.
2. Implement full save/restore after those are stable.

This minimizes parity risk. It gives us the PWA structure and loading behavior immediately, then treats state serialization as the serious class-level conversion problem it is.
