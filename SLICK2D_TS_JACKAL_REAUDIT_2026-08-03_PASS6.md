# Slick2D-TS Jackal Reaudit Pass 6

Date: 2026-08-03

## Scope

This pass reaudited the current TypeScript Slick2D port at:

- `C:\js-projects\slick2d-ts`

against:

- Java Slick2D: `C:\java-projects\slick2d\Slick\src`
- Java SlickJackal: `C:\NetBeansProjects\SlickJackal\src`

The filter for this pass was the SlickJackal desktop-browser PWA port. I did not treat omitted native Java desktop behavior as a defect when the browser port should intentionally replace it: AWT, Applet/JNLP, native LWJGL windows, native display modes, byte-buffer native cursors, Java threads, OS window icons, and Web Audio unlock requirements.

## Result

No new Slick2D-TS problem was found that needs a repair handoff for the Jackal browser conversion.

This file is the Pass 6 audit record. It is not a new repair queue.

## Verification Snapshot

- Ran `npm.cmd test` in `C:\js-projects\slick2d-ts`.
- Result: build passed; `80` tests passed; `0` tests failed.
- Checked `git -C C:\js-projects\slick2d-ts status --short`; it produced no status output at the time of this audit.
- Rechecked the prior Pass 5 open issue, `AppGameContainer.reinit()` parity.
- Rechecked Jackal call sites for container setup, timing, input, graphics, image operations, audio, packed sheets, resource loading, and GL transforms.

## Prior Pass 5 Issue Status

The Pass 5 open issue was repaired and should not be refiled.

### `AppGameContainer.reinit()` Now Rebuilds Container State

Current TypeScript evidence:

- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:188` starts `public override async reinit()`.
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:191-194` cancels an active animation frame before rebuilding.
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:196` calls `this.rebuildSystemForReinit()`.
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:197-198` calls `game.init(this)` and waits for resource completion.
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:199-201` resets frame bookkeeping and resumes the loop if appropriate.
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:484` starts `rebuildSystemForReinit()`.
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:487` calls `ResourceLoader.clearFailures()`.
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:488` calls `InternalTextureLoader.get().clear()`.
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:489` calls `SoundStore.get().clear()`.
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:490-501` disposes and reinitializes the renderer/display path.
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:502-505` recreates AL state and resets music/sound volumes to `1`.
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:506-509` creates a new `Graphics`, resets `defaultFont`, enters ortho, and resets frame bookkeeping.
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:512-519` resets `lastFrameTime`, `storedDelta`, FPS counters, waiting state, and resource error state.
- `C:\js-projects\slick2d-ts\src\slick\opengl\InternalTextureLoader.ts:40` implements `clear(name?: string)`.
- `C:\js-projects\slick2d-ts\src\slick\opengl\InternalTextureLoader.ts:70` implements `reload()`.

Current regression tests:

- `C:\js-projects\slick2d-ts\test\app-game-container-visibility.test.mjs:257` verifies `InternalTextureLoader.clear` disposes registered texture resources.
- `C:\js-projects\slick2d-ts\test\app-game-container-visibility.test.mjs:289` verifies `AppGameContainer.reinit` rebuilds Java container state before `game.init`.
- That test asserts cancellation of the old RAF, texture clear, sound clear, renderer dispose/reinitialize, AL recreate, ortho reset, new graphics/default font state, reset volumes, reset stored delta/FPS/resource error state, and loop restart.

This now matches the Java intent:

- Stock Java Slick2D `AppGameContainer.reinit()` clears textures, clears sounds, calls `initSystem()`, enters ortho, then calls `game.init(this)`.
- SlickJackal's checked-in local `ApplicationGameContainer.reinit()` calls `destroy()`, `initSystem()`, `enterOrtho()`, then `game.init(this)`.

## Jackal-Relevant API Path Audit

### Container And Timing

Jackal startup still maps cleanly to the TS container path:

- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:243` calls `gc.setAlwaysRender(true)`.
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:244` calls `gc.setVSync(true)`.
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:245` calls `gc.setSmoothDeltas(false)`.
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:246` calls `gc.setShowFPS(false)`.
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:247` calls `gc.setClearEachFrame(true)`.
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:1981-1982` constructs `ApplicationGameContainer(new ScalableGame(main, DISPLAY_WIDTH, DISPLAY_HEIGHT, true), ...)`.
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:1990` calls `appGameContainer.start()`.

The fixed-step game loop remains compatible:

- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:296` reads `Sys.getTime()`.
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:300` increments `nextFrameTime` by `(int)((Sys.getTimerResolution() * 0.01f) + 0.5f)`.
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:1047` resets the same timing state.
- `C:\js-projects\slick2d-ts\src\lwjgl\Sys.ts:12-14` returns monotonic integer milliseconds.
- `C:\js-projects\slick2d-ts\src\lwjgl\Sys.ts:22-23` reports a timer resolution of `1000`.

No new issue was found here.

### ScalableGame

Jackal uses `ScalableGame(main, DISPLAY_WIDTH, DISPLAY_HEIGHT, true)` at startup. The TS `ScalableGame` preserves the important Java behavior for this port:

- it wraps the target game;
- it recalculates scale and offsets;
- it updates the input transform;
- it renders through the scaled transform path;
- it forwards update calls to the wrapped game.

No new issue was found here.

### Input

Jackal's gameplay input uses:

- `C:\NetBeansProjects\SlickJackal\src\jackal\HumanInput.java:22-32` for keyboard movement/fire/shoot keys.
- `C:\NetBeansProjects\SlickJackal\src\jackal\HumanInput.java:40-42` for controller buttons.
- `C:\NetBeansProjects\SlickJackal\src\jackal\HumanInput.java:75` for Enter.
- `C:\NetBeansProjects\SlickJackal\src\jackal\HumanInput.java:79` for F12.
- `C:\NetBeansProjects\SlickJackal\src\jackal\HumanInput.java:83` for Escape.
- `C:\NetBeansProjects\SlickJackal\src\jackal\HumanInput.java:87-88` for Pause/Enter.
- `C:\NetBeansProjects\SlickJackal\src\jackal\HumanInput.java:91-92` for `clearKeyPressedRecord()`.

The TS port preserves the Jackal-required semantics:

- `Input.isKeyPressed(int)` consumes the pressed record, matching Java `Input.java:667-674`.
- `Input.isKeyDown(int)` reflects current held key state, matching Java `Input.java:753-754`.
- `Input.clearKeyPressedRecord()` clears all key pressed records, matching Java `Input.java:734-736`.
- `Input.isButtonPressed(int, int)` reflects current controller button state, matching Java `Input.java:972-987`.
- Browser focus/visibility clearing replaces Java `Display.isActive()` clearing. That is browser-specific but correct for the PWA shell.

No new issue was found here.

### Graphics And Clipping

Jackal gameplay rendering mostly uses `Image.draw(...)` through `Main.draw(...)` helper methods. Direct `Graphics` usage in gameplay is limited to color fills, clipping, and text/font support.

Rechecked areas:

- `Graphics.setColor(...)`
- `Graphics.fillRect(...)`
- `Graphics.setWorldClip(...)`
- `Graphics.clearWorldClip()`
- transform reset and render target paths used by the sprite helper tests

The current TS test suite includes coverage for shape rendering, gradient/filled shape behavior, world clips, image copy areas, warped/sheared image rendering, bitmap text alpha reset, and sprite drawing helper parity.

No new Jackal gameplay issue was found here.

### Images, Packed Sheets, And Sprite Helpers

Jackal's sprite loading and drawing path relies on:

- `XMLPackedSheet`
- `Image.getSubImage(...)`
- `Image.getFlippedCopy(...)`
- `Image.setAlpha(...)`
- `Image.draw(...)`
- GL-style push/translate/rotate/scale helpers through the local `Main.draw(...)` wrappers

Representative Java call sites:

- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:1094` and many later lines construct `XMLPackedSheet`.
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:1176-1177` and many later lines call `getFlippedCopy(...)` during load.
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:1554` and `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:1560` slice one-pixel-high sun and wave strips with `getSubImage(...)`.
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:568-581` uses alpha-set, draw, alpha-reset behavior.
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:717-906` contains the rotated, centered, offset, scaled, and alpha draw helpers.

The current TS port has direct support for these paths and the passing tests include sprite drawing helper parity.

No new issue was found here.

### Audio And Music

Jackal depends on:

- `Sound.play()`
- `Sound.play(float, float)`
- `Sound.playing()`
- `Sound.stop()`
- `Music.play()`
- `Music.loop()`
- `Music.playing()`
- `Music.stop()`
- the game-local `Song` intro/intro2/loop sequencing

Representative Jackal call sites:

- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:598` checks `Sound.playing()`.
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:608-646` plays sounds with and without explicit volume.
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:657-658` stops a sound if it is playing.
- `C:\NetBeansProjects\SlickJackal\src\jackal\Song.java:52-92` sequences intro, optional intro2, and loop by checking `Music.playing()`.

The TS port now tracks the latest active sound handle per `Sound`, which matches Java `AudioImpl` latest-source behavior for `Sound.playing()` and `Sound.stop()`. The app container polls music before game update, which is the ordering Jackal's `Song.update()` expects.

No new issue was found here.

### Resource Loading

Jackal's Java init path synchronously constructs many images, packed sheets, sounds, music files, and binary data streams. In the browser, synchronous classpath/file I/O is intentionally replaced with a preload barrier and cached resource lookup.

Current TS evidence:

- `ResourceLoader.preloadResources(...)` exists and supports manifest-style preloading.
- `ResourceLoader.waitForAll()` is used by `AppGameContainer.start()` and `AppGameContainer.reinit()`.
- Resource loader tests cover retry behavior, cache-bust query parameters, tracked failure reporting, and clearing failure state.

Port requirement:

- The Jackal PWA bootstrap must preload every image, XML, DAT, OGG, and other referenced asset before calling Java-parity init code that expects synchronous resources.
- This remains a Jackal web-port integration requirement, not a new Slick2D-TS defect.

No new issue was found here.

## Explicitly Not Refiled

These observations are real broad-parity notes, but they are not new Jackal-conversion repair items for this pass.

### `Graphics.drawImage(Image, x, y)` Default Tint

Java's no-color overload delegates with `Color.white`:

- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\Graphics.java:1432-1433`

Current TS delegates the no-color overload with the active graphics color:

- `C:\js-projects\slick2d-ts\src\slick\Graphics.ts:318-326`

Why this is not filed as a new Jackal repair item:

- Pass 5 already documented this observation and did not classify it as a Jackal blocker.
- `rg` found direct `Graphics.drawImage(...)` usage in SlickJackal only in copied local Slick2D container cursor code:
  - `C:\NetBeansProjects\SlickJackal\src\org\newdawn\slick\ApplicationGameContainer.java:329`
  - `C:\NetBeansProjects\SlickJackal\src\org\newdawn\slick\ScalableGameContainer.java:400`
- That path creates a fresh temporary `Graphics`, whose default color is white.
- Native byte-buffer cursor conversion is a Java desktop path. A browser PWA should use browser cursor/hamburger/menu shell behavior instead of porting native LWJGL cursor internals literally.
- Jackal gameplay rendering does not call `Graphics.drawImage(...)`.

If a future browser-port helper starts using `Graphics.drawImage(...)` after `setColor(...)`, then fix the TS default to `Color.white` and add a regression test. It is not a newly found Jackal gameplay blocker in this pass.

### `GameContainer.sleep(int)`

Java busy-sleeps for the requested duration. TS records the last requested sleep value. Jackal does not call `GameContainer.sleep(...)` in gameplay code. The only sleep-like calls found are Java desktop container implementation details, not browser gameplay logic.

This is not a new Jackal repair item.

### `Image.drawFlash(...)`

The TS implementation is still a simplified draw-with-color path rather than Java's flash/additive path. Jackal does not call `drawFlash(...)`.

This is not a new Jackal repair item.

### Java-Specific Window And Cursor APIs

SlickJackal carries local copies of `ApplicationGameContainer` and `ScalableGameContainer` with LWJGL display, cursor, window, and destroy/recreate behavior. Those files are Java desktop scaffolding. For the PWA port, the game should use the browser-compatible TS container shell and explicit web UI affordances: splash screen, menu start button, volume slider, and hamburger return-to-menu.

This is not a new Slick2D-TS repair item.

## Pass 6 Conclusion

I found no additional Slick2D-TS problem that needs another AI repair handoff for the Jackal desktop-browser PWA conversion.

The next work should move to the Jackal port itself, especially:

- complete asset manifest generation and preload ordering;
- DAT/binary reader parity with Java big-endian signed primitive behavior;
- Java `int`, `long`, `float`, truncation, overflow, and array-index semantics in the game classes;
- exact class-per-file directory mapping for the Jackal source tree;
- PWA shell behavior: splash, retries, error presentation, menu start button, volume slider, versioned cache-bust query parameters, and hamburger return-to-menu.
