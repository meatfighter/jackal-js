# Slick2D-TS Jackal Reaudit Pass 5

Date: 2026-08-03

## Scope

This pass reaudited `C:\js-projects\slick2d-ts` against:

- `C:\java-projects\slick2d\Slick\src`
- `C:\NetBeansProjects\SlickJackal\src`
- the current Jackal web-port requirement: desktop browser PWA SPA, menu screen with start button, volume slider, splash/loading, and hamburger return to menu.

The focus was not to relist intentional browser substitutions for LWJGL, AWT, applets, OS windows, native display modes, or Java classpath loading. The focus was any remaining Slick2D behavior gap that can affect a perfect-parity Jackal conversion in the browser.

## Verification Snapshot

- `C:\js-projects\slick2d-ts` test run: `npm.cmd test`
- Result: passed.
- Observed total: 78 passing tests, 0 failing tests.
- The prior Pass 4 timing-loop issue appears repaired. Current tests include the Java-style minimum logic update interval, maximum logic split/remainder, paused zero-delta update, paused music/browser-audio polling, target frame rate, smooth deltas, and default Jackal container path.

## Previous Pass 4 Issue Status

The previous open issue was Java `GameContainer.updateAndRender(...)` timing parity. I rechecked it and did not reopen it.

Java evidence:

- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:641` polls input.
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:643` polls music before update scheduling.
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:645-664` implements `storedDelta`, minimum interval, maximum interval splitting, and remainder preservation.
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:673` calls `game.update(this, 0)` while paused.
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:703` calls `Display.sync(targetFPS)` when target FPS is set.

Current TypeScript evidence:

- `C:\js-projects\slick2d-ts\src\slick\GameContainer.ts:52-55` now has target/min/max/storedDelta container fields.
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:398-399` polls `Music` and `SoundStore`.
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:416-417` calls `Display.sync(this.targetFrameRate)`.
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:432-435` applies target frame pacing.
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:440` performs paused `game.update(this, 0)`.
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:443-461` implements stored-delta minimum/maximum interval behavior.

Jackal itself does not directly call `setMinimumLogicUpdateInterval(...)`, `setMaximumLogicUpdateInterval(...)`, `setTargetFrameRate(...)`, `setPaused(...)`, `pause()`, or `resume()` in `C:\NetBeansProjects\SlickJackal\src`, but the fix still matters for the browser shell's menu/pause lifecycle.

## New Open Problem

### P2: `AppGameContainer.reinit()` Does Not Rebuild Java Container State

Status: open.

This is conversion-relevant if the Jackal PWA shell uses `reinit()` or maps Jackal's local `ApplicationGameContainer` lifecycle directly for restart/start-again after returning to the menu. If the PWA shell always destroys the old container and constructs a brand-new container instead, that must be explicitly documented and tested. The current API claims Java counterpart parity, so leaving this as a quiet partial reinit is risky.

### Java Behavior

Stock Slick2D `AppGameContainer.reinit()` rebuilds more than the game object:

- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\AppGameContainer.java:279` starts `reinit()`.
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\AppGameContainer.java:280` calls `InternalTextureLoader.get().clear()`.
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\AppGameContainer.java:281` calls `SoundStore.get().clear()`.
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\AppGameContainer.java:282` calls `initSystem()`.
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\AppGameContainer.java:283` calls `enterOrtho()`.
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\AppGameContainer.java:286` then calls `game.init(this)`.

`initSystem()` resets important state:

- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:754` starts `initSystem()`.
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:755` calls `initGL()`.
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:756` resets music volume to `1.0f`.
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:757` resets sound volume to `1.0f`.
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:759` creates a new `Graphics(width, height)`.
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:760` resets `defaultFont` from that graphics object.

Jackal's checked-in local container is even more destructive:

- `C:\NetBeansProjects\SlickJackal\src\org\newdawn\slick\ApplicationGameContainer.java:344` starts `reinit()`.
- `C:\NetBeansProjects\SlickJackal\src\org\newdawn\slick\ApplicationGameContainer.java:345` calls `destroy()`.
- `C:\NetBeansProjects\SlickJackal\src\org\newdawn\slick\ApplicationGameContainer.java:346` calls `initSystem()`.
- `C:\NetBeansProjects\SlickJackal\src\org\newdawn\slick\ApplicationGameContainer.java:347` calls `enterOrtho()`.
- `C:\NetBeansProjects\SlickJackal\src\org\newdawn\slick\ApplicationGameContainer.java:350` then calls `game.init(this)`.

Jackal's Java startup path uses the local application container:

- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:1981` constructs `ApplicationGameContainer`.
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:1982` wraps `main` in `new ScalableGame(main, DISPLAY_WIDTH, DISPLAY_HEIGHT, true)`.
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:1990` calls `appGameContainer.start()`.

### Current TypeScript Behavior

The TypeScript container does not perform the Java rebuild sequence:

- `C:\js-projects\slick2d-ts\src\slick\GameContainer.ts:402` labels `reinit()` as the Java counterpart.
- `C:\js-projects\slick2d-ts\src\slick\GameContainer.ts:403-404` only calls `this.game.init(this)`.
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:187` labels `reinit()` as the Java counterpart.
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:188-190` only calls `this.game.init(this)` and `ResourceLoader.waitForAll()`.

The TypeScript startup path does the missing work only in `start()`, not in `reinit()`:

- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:220-224` initializes the renderer.
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:225` calls `AL.create()`.
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:226` calls `game.init(this)`.
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:227` waits for resources.
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:228-230` resets `lastFrameTime`, `storedDelta`, and the FPS window.

The TypeScript destroy path has cleanup work that `reinit()` currently skips:

- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:313` starts `destroy()`.
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:335` disposes the renderer backend.
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:336` calls `AL.destroy()`.
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:337` calls `Display.destroy()`.
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:338` clears the active display container.

Some lower-level cleanup primitives exist, but are not wired into `reinit()`:

- `C:\js-projects\slick2d-ts\src\slick\openal\SoundStore.ts:63-72` implements `SoundStore.clear()`.
- `C:\js-projects\slick2d-ts\src\slick\openal\SoundStore.ts:74-82` implements `SoundStore.destroy()`.
- `C:\js-projects\slick2d-ts\src\slick\util\ResourceLoader.ts:307-310` implements `ResourceLoader.clearCache()`.
- `C:\js-projects\slick2d-ts\src\slick\rendering\WebGLTextureResource.ts:159-164` can dispose an individual WebGL texture object.
- `C:\js-projects\slick2d-ts\src\slick\opengl\InternalTextureLoader.ts:32-37` declares Java-counterpart `clear()` overloads, but the implementation body is empty.
- `C:\js-projects\slick2d-ts\src\slick\opengl\InternalTextureLoader.ts:58-60` declares `reload()`, but it is also empty.

### Why This Matters For Jackal

The required PWA is not just a one-shot Java desktop launch. It has a browser menu, a start button, a volume slider, loading/splash handling, and an in-game hamburger icon that returns to the menu. That makes lifecycle behavior conversion-relevant.

If the port implements start-again or return-to-menu by calling `container.reinit()` on an existing TypeScript `ApplicationGameContainer` or `AppGameContainer`, current behavior can diverge from Java in these ways:

- old sound or music handles can survive until overwritten or explicitly stopped elsewhere;
- audio buffer caches are not cleared before the second `game.init(...)`;
- WebGL texture objects and texture loader state are not cleared through `InternalTextureLoader`;
- the renderer/display/audio system is not rebuilt like Java `initSystem()`;
- `Graphics` and `defaultFont` are not recreated like Java `initSystem()`;
- Java's volume reset to `1.0` on system init is skipped;
- `lastFrameTime`, `storedDelta`, and FPS window reset are skipped;
- retained resource errors or pending tracked resource state can leak into the next init unless the shell clears them separately.

This is not a problem if the browser shell never calls `reinit()` and instead fully destroys the current container and constructs a new one for each run. However, because the TypeScript class exposes `reinit()` as a Java counterpart, a 1-to-1 conversion pass could reasonably use it and get a partial reset.

### Required Repair

Choose exactly one supported contract and enforce it.

Option A: implement Java-parity `reinit()` for browser constraints.

- Stop or pause the RAF loop during reinit so the game cannot update/render while resources and audio are being rebuilt.
- Clear current audio playback and audio caches before the second `game.init(...)`. At minimum call `SoundStore.get().clear()`. If the browser implementation needs a fresh Web Audio context to match Java's `AL.destroy()`/`AL.create()` shape, call the TypeScript AL lifecycle equivalent too.
- Implement or call a real `InternalTextureLoader.get().clear()` equivalent. The current no-op body is not sufficient for Java counterpart behavior. It must release or invalidate cached WebGL texture resources that Java would drop.
- Re-run the browser equivalent of Java `initSystem()`: renderer/display init as appropriate, `setMusicVolume(1)`, `setSoundVolume(1)`, new `Graphics(width, height)`, and `defaultFont = graphics.getFont()`.
- Re-run the browser equivalent of `enterOrtho(width, height)`.
- Reset frame bookkeeping: `lastFrameTime`, `storedDelta`, FPS window/count, waiting-resource state, and retained frame/resource errors.
- Call `game.init(this)` only after the cleanup/reinit work is complete.
- Await `ResourceLoader.waitForAll()` after `game.init(this)` and route failures through the same error handling path used by startup.
- Decide whether `ResourceLoader.clearCache()` should be part of `reinit()`. Java classpath bytes are not a browser cache, so preserving already fetched bytes may be intentional. If preserving bytes is intentional, still clear tracked errors/pending failure state or document that the PWA preload layer owns this before calling `reinit()`.
- If the PWA volume slider intentionally overrides Java's `initSystem()` volume reset, the shell should reapply the slider value immediately after container reinit and before gameplay audio starts. Do not silently skip Java's reset inside the Slick2D layer without documenting the contract.

Option B: explicitly forbid `reinit()` for Jackal's browser container lifecycle.

- Make the Jackal PWA shell destroy the old container and construct a new `ApplicationGameContainer(new ScalableGame(...), 1024, 960, false)` for each start.
- Add a test or code assertion proving the hamburger return-to-menu/start-again path never calls `reinit()`.
- Document `AppGameContainer.reinit()` as unsupported or partial for the browser port until Option A is implemented. A silent partial method with a Java-counterpart comment is not enough for perfect-parity porting.

### Tests To Add

Add focused tests in `slick2d-ts` for whichever contract is chosen.

For Option A:

- Start a fake game, create or fake at least one active sound/music handle, call `reinit()`, and assert old handles are stopped/cleared before the second `game.init(...)`.
- Assert `game.init(...)` is called once per reinit and only after cleanup hooks have run.
- Assert `storedDelta` is zero after reinit.
- Assert the FPS window/frame counters are reset after reinit.
- Assert `getMusicVolume()` and `getSoundVolume()` match Java system-init behavior, or assert the documented PWA slider reapplication contract.
- Assert renderer/display state is initialized after reinit and no stale disposed WebGL texture is used on the next render.
- Assert retained `ResourceLoader` errors from a previous failed load do not poison a later successful reinit.

For Option B:

- Add a Jackal shell lifecycle test: start game, return to menu, start game again. Assert the old container was destroyed and a new container was constructed.
- Assert no code path in the PWA shell calls `reinit()` during hamburger return, menu start, restart, or loading retry.

### Acceptance Criteria

- A Jackal PWA user can start the game, return to the menu with the hamburger icon, and start again without stale audio, stale WebGL resources, stale resource errors, or skipped container initialization.
- The chosen lifecycle contract is documented in `slick2d-ts` and in the Jackal port bootstrap.
- If `reinit()` remains exposed as a Java counterpart, it must perform the Java-equivalent cleanup/reinit behavior within browser constraints.

## Audited Areas Not Reopened

These were checked during this pass and did not produce a new Jackal-conversion blocker.

### Jackal Container Configuration

Jackal Java startup config:

- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:243` calls `gc.setAlwaysRender(true)`.
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:244` calls `gc.setVSync(true)`.
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:245` calls `gc.setSmoothDeltas(false)`.
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:246` calls `gc.setShowFPS(false)`.

Current TypeScript has container-loop support for these settings after the prior repairs. `showFPS` reset-transform differences are not a Jackal blocker because Jackal disables FPS display.

### Input

Jackal-used keyboard constants are present in TypeScript. `isKeyPressed(...)` consumes the edge after query like Java. Controller button listener callbacks use Java one-based indexing in the TypeScript listener path, matching Jackal's `InputMode.controllerButtonPressed(...)` decrement behavior. No new input blocker was found.

### Audio

Jackal uses `Sound`, `Music`, `Song`, and `GameContainer.setMusicOn(...)`. The current TypeScript audio path now polls music/audio while paused, preserves playing state through global music disable, and has passing tests for paused music polling. No new song-sequencing blocker was found.

The `reinit()` issue above is separate from steady-state audio playback.

### XML Packed Sheets And Images Used By Jackal

`XMLPackedSheet` loads an image with nearest filtering and maps XML `<sprite>` entries to `getSubImage(...)`, matching the Java shape Jackal uses. Jackal's direct `getSubImage(...)` uses are on unflipped source images in loading code, so no flipped-subimage blocker was found.

### Binary Data Reads

Jackal's data-loading code uses big-endian Java-style `readShort`, `readInt`, and `readLong`. The current TypeScript `BinaryReader` path supports those shapes, including signed `bigint` for long values. No new DAT-loader blocker was found.

### GL11 Transform Usage

Jackal gameplay uses `GL11.glPushMatrix`, `glPopMatrix`, `glTranslatef`, `glRotatef`, and `glScalef` around draw helpers. The current TypeScript GL11 shim and renderer transform stack are covered by previous tests and did not show a new Jackal blocker in this pass.

### ScalableGame

The TypeScript `ScalableGame` render structure matches the Java shape that matters for Jackal: safe block, screen clip, translate, scale, pushed render, pop, clear clip, leave safe block, and overlay render. Prior world-clip repairs remain the relevant fix; no new `ScalableGame` blocker was found.

### Cursor Hiding

Jackal hides the cursor by creating a transparent native cursor from a byte buffer. The TypeScript path has `BufferUtils`, `CursorLoader`, and `Mouse.setNativeCursor(...)` support for mapping transparent cursor intent to browser CSS cursor hiding. No new cursor blocker was found.

### Resource Loading Contract

The current TypeScript `ResourceLoader` has cache-busting, retry options, preload support, retained tracked errors, and `waitForAll()`. Browser preload remains the correct contract for Java-style synchronous constructors. No new preload blocker was found in this pass.

## Broad Slick2D Parity Differences Not Filed As Jackal Blockers

These are real or plausible broad Slick2D parity differences, but I did not file them as Jackal-conversion blockers because the audited Jackal gameplay path does not exercise them.

### `Graphics.drawImage(Image, x, y)` Tint Source

Java's no-color overload delegates with `Color.white`. Current TypeScript appears to delegate with the current graphics color. That can tint images unexpectedly if code calls `Graphics.drawImage(...)` after `setColor(...)`.

Jackal gameplay mostly calls `Image.draw(...)` and local draw helpers. A search found `Graphics.drawImage(...)` only in Jackal's local Slick container classes for cursor-image handling, not in gameplay rendering. Jackal's cursor hiding path uses a byte-buffer transparent cursor, not this image cursor path. Therefore I did not file this as a Jackal blocker in this pass.

If the port later maps or uses Jackal's local cursor-image overloads in browser UI code, fix this broad parity issue.

### `Image.copy()` Mutable State

Java `Image.copy()` returns a full-size subimage copy and does not preserve mutable draw state like alpha, rotation, center, or corner colors. Current TypeScript appears to preserve more mutable state.

Jackal creates flipped/copied sprite variants during load before mutating alpha/rotation draw state, so this was not filed as a Jackal blocker.

### Missing `Image.draw(x, y, scale, Color)` Overload

Java Slick2D has a scale-plus-color draw overload. Current TypeScript overloads cover scale-only and color-only shapes, but not this exact direct overload.

I did not find Jackal gameplay calling direct `Image.draw(x, y, scale, Color)`. Jackal scale/alpha drawing is handled through its own draw helpers, which were covered in previous repair passes.

### `Image.drawFlash(...)`

The browser implementation is not proven to match Java additive/flash behavior. Jackal gameplay did not show `drawFlash(...)` usage, so this is not a Jackal blocker.

### `Color.brighter()` And Constructor Edge Cases

There are still broad Java-float-vs-int constructor edge cases that can make derived colors differ for generic Slick2D usage. Jackal uses packed integer and explicit color values in the audited paths, and prior tests cover Jackal-style fade color behavior. I did not file this as a Jackal blocker.

### `ResourceLoader.resourceExists(...)`

The TypeScript implementation reports already-loaded bytes rather than Java classpath resolvability. Jackal does not use `resourceExists(...)`, so this was not filed.

## Final Recommendation For The Other AI

Repair or fence off `AppGameContainer.reinit()` before the Jackal PWA shell relies on it for menu/start-again behavior. The safest browser-shell contract is to construct a fresh container per game run unless `reinit()` is upgraded to perform the Java-equivalent rebuild sequence.

