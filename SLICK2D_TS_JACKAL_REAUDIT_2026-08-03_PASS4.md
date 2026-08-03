# Slick2D TS Jackal Re-Audit, Pass 4 - 2026-08-03

## Scope

This pass re-audited the current TypeScript Slick2D port at:

- `C:\js-projects\slick2d-ts`

against:

- Java Slick2D: `C:\java-projects\slick2d\Slick\src`
- Java SlickJackal: `C:\NetBeansProjects\SlickJackal\src`

This audit is filtered to issues that can affect the 1-to-1 SlickJackal desktop-browser PWA port. I did not file issues for AWT, Applet/JNLP, native LWJGL display creation, native cursor fidelity, Java window-icon behavior, Java thread behavior, synchronous fullscreen transitions, or Web Audio user-gesture differences where the browser port intentionally needs a web-shaped equivalent.

## Verification Performed

- Ran the current `C:\js-projects\slick2d-ts` test suite with `npm.cmd test`.
- Result: `70` tests passing, `0` failing.
- Checked the working tree of `C:\js-projects\slick2d-ts`; it is dirty with source and test changes from the other AI. I did not revert or modify them.
- Rechecked the Pass 3 repair areas: `SpriteDrawing`, `GeometryMath`, `Song`, and `BitmapText`.
- Rechecked Jackal's actual container setup and timing loop in `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java`.
- Rechecked Jackal call sites for Slick rendering, image, input, audio, clipping, and timing APIs.

## Previously Reported Items Verified As Repaired Or Not Refiled

These areas do not need new handoff work from this pass:

- `SpriteDrawing.drawOffset(...)` now draws in Jackal local coordinates and resets image alpha to `1` after alpha draws.
- `SpriteDrawing.drawCameraOffset(...)` is separated from the Java Jackal helper semantics.
- `SpriteDrawing.drawScaled(image, x, y, scale, alpha)` now supports scale-plus-alpha, including scales greater than `1`.
- Rotated `SpriteDrawing` helpers now use matrix-style transforms and do not mutate image rotation/center state.
- `GeometryMath` no longer relies on Slick `FastTrig` and now uses float-rounded trig/vector math for Jackal's observed geometry helpers.
- `Song.stop()` now only stops playing parts, and `Song.play()`/`Song.update()` preserve the Java intro, optional intro2, and loop sequencing observed in `C:\NetBeansProjects\SlickJackal\src\jackal\Song.java`.
- `BitmapText.drawStringAlpha(...)` now restores glyph alpha to `1` after drawing.
- The new tests cover these repaired areas.

## New Repair Item

### P1: `AppGameContainer` Does Not Preserve Java `GameContainer.updateAndRender(...)` Timing Semantics

Affected TypeScript:

- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:373`
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:383`
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:391`
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:393`
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:395`
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:396`
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:397`
- `C:\js-projects\slick2d-ts\src\slick\GameContainer.ts:52`
- `C:\js-projects\slick2d-ts\src\slick\GameContainer.ts:53`
- `C:\js-projects\slick2d-ts\src\slick\GameContainer.ts:54`
- `C:\js-projects\slick2d-ts\src\slick\GameContainer.ts:216`
- `C:\js-projects\slick2d-ts\src\slick\GameContainer.ts:222`
- `C:\js-projects\slick2d-ts\src\slick\GameContainer.ts:227`
- `C:\js-projects\slick2d-ts\src\slick\GameContainer.ts:363`
- `C:\js-projects\slick2d-ts\src\lwjgl\opengl\Display.ts:98`

Relevant Java:

- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:64`
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:66`
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:68`
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:614`
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:625`
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:634`
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:641`
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:643`
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:645`
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:647`
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:649`
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:650`
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:652`
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:655`
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:656`
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:657`
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:663`
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:673`
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:702`
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\GameContainer.java:703`

Relevant Jackal usage:

- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:243`
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:244`
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:245`
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:296`
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:300`
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:1981`
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:1989`

#### Java Behavior

Java `GameContainer.updateAndRender(int delta)` does all of the following:

- If `smoothDeltas` is true and FPS is nonzero, replace `delta` with `1000 / getFPS()`.
- Poll input before updating.
- Call `Music.poll(delta)` before the pause check.
- When not paused, add `delta` to `storedDelta`.
- If `storedDelta < minimumLogicInterval`, do not call `game.update(...)` that frame.
- If `maximumLogicInterval != 0`, split `storedDelta` into one or more `game.update(this, maximumLogicInterval)` calls.
- After max-interval chunks, keep or consume the remainder exactly as Java does:
  - `remainder = storedDelta % maximumLogicInterval`
  - If `remainder > minimumLogicInterval`, call `game.update(this, remainder % maximumLogicInterval)` and clear `storedDelta`.
  - Otherwise keep `storedDelta = remainder`.
- If `maximumLogicInterval == 0`, call `game.update(this, storedDelta)` once and clear `storedDelta`.
- When paused, still call `game.update(this, 0)`.
- After render, call `Display.sync(targetFPS)` when `targetFPS != -1`.

#### Current TypeScript Behavior

Current `AppGameContainer.loopFrame(...)` does this instead:

- Computes a raw browser frame delta.
- Polls input only when visible or `updateOnlyWhenVisible` is false.
- If not paused, computes `cappedDelta = min(delta, maximumLogicUpdateInterval)` when max is nonzero.
- Calls `game.update(this, Math.max(minimumLogicUpdateInterval, cappedDelta))` exactly once.
- Calls `Music.poll(delta)` and `SoundStore.get().poll(delta)` only inside the `!paused` branch.
- When paused, does not call `game.update(this, 0)`.
- Does not maintain `storedDelta`.
- Does not split large deltas into multiple Java-equivalent update calls.
- Does not skip updates for frames below the minimum interval.
- `GameContainer.setTargetFrameRate(...)` stores `targetFrameRate` and calls `Display.sync(frameRate)`, but `targetFrameRate` is not read anywhere else in `src`, and `Display.sync(...)` only stores `Display.frameRate`.

#### Concrete Mismatches

1. `minimumLogicUpdateInterval` is inverted in effect.

   Java treats it as a threshold: small deltas accumulate until the threshold is reached. Current TS treats it as a floor: every visible, unpaused frame updates, and the delta is raised to the minimum.

2. `maximumLogicUpdateInterval` loses fixed-step catch-up behavior.

   Java may call `game.update(...)` multiple times in one rendered frame. Current TS clamps the delta and calls update once. This changes deterministic logic if a converted host tries to cap long browser-tab or frame-stall gaps using Slick's max interval API.

3. Paused containers do not call `game.update(this, 0)`.

   Java still calls the game's update method while paused, with a zero delta. Current TS skips game update entirely while paused.

4. Music/audio polling is in the wrong pause branch.

   Java calls `Music.poll(delta)` before checking `paused`. Current TS calls `Music.poll(delta)` and `SoundStore.get().poll(delta)` only when not paused.

5. `targetFrameRate` is effectively inert.

   Java syncs the display after render whenever `targetFPS != -1`. Current TS records the value but the RAF loop never uses it to throttle, skip, or pace frames.

6. Smooth-delta behavior is not Java-equivalent.

   Java smooth deltas use `1000 / getFPS()` when FPS is available. Current TS averages two browser-time measurements. Jackal explicitly calls `gc.setSmoothDeltas(false)`, so this is not the main Jackal blocker, but it is part of the same container-loop parity gap.

#### Why This Matters For The Jackal Web Port

Original Jackal does not call `setMinimumLogicUpdateInterval(...)`, `setMaximumLogicUpdateInterval(...)`, `setTargetFrameRate(...)`, `pause()`, `resume()`, or `setPaused(...)` directly in `C:\NetBeansProjects\SlickJackal\src\jackal`. It initializes the container with:

- `gc.setAlwaysRender(true)` at `Main.java:243`
- `gc.setVSync(true)` at `Main.java:244`
- `gc.setSmoothDeltas(false)` at `Main.java:245`

Jackal's game logic then uses its own fixed inner loop:

- `while(nextFrameTime <= Sys.getTime())` at `Main.java:296`
- `nextFrameTime += (int)((Sys.getTimerResolution() * 0.01f) + 0.5f)` at `Main.java:300`

That reduces the risk for the unmodified Java game loop. However, the target port is explicitly a desktop-browser PWA SPA with a menu screen, a start button required by Web Audio, a volume slider, a loading splash, and a hamburger control that returns to the menu. That browser shell is very likely to interact with the container lifecycle.

If the web shell uses `container.pause()` or `setPaused(true)` when returning to the menu, the TS port will not match Java Slick behavior. Java would continue calling `Main.update(gc, 0)` and polling music. TS would stop the update and audio poll entirely. That can change song transition behavior, delayed cleanup, loading state, mode transitions, and any code that expects a zero-delta update while paused.

If the web shell tries to use Slick's minimum or maximum logic update APIs to control browser-tab stalls, long loading frames, or menu/game transitions, TS will not match Java behavior. It will either update too often with raised deltas or fail to issue Java's repeated catch-up updates.

This is not a Java-native display feature. It is Java Slick game-loop behavior exposed through `GameContainer`, and a 1-to-1 Jackal port should either implement it or explicitly forbid the Jackal PWA shell from relying on the affected APIs.

#### Required Repair

Implement Java-equivalent container update scheduling in the TS browser container, or document and enforce that the Jackal PWA shell never uses the affected APIs.

Preferred repair:

- Add `storedDelta` state to the TS container.
- In `AppGameContainer.loopFrame(...)`, mirror Java `GameContainer.updateAndRender(...)` for update scheduling:
  - Apply Java smooth-delta behavior when `smoothDeltas` is true.
  - Poll input before update.
  - Poll music before the pause check.
  - When not paused, add `delta` to `storedDelta`.
  - Only update when `storedDelta >= minimumLogicUpdateInterval`.
  - If `maximumLogicUpdateInterval != 0`, issue repeated `game.update(this, maximumLogicUpdateInterval)` calls and handle the remainder exactly like Java.
  - If `maximumLogicUpdateInterval == 0`, issue one `game.update(this, storedDelta)` call and clear `storedDelta`.
  - When paused, call `game.update(this, 0)`.
- Decide how `SoundStore.get().poll(delta)` should map to Java's browser audio needs. The important parity point is that Slick music polling must not be skipped merely because the container is paused.
- Make `targetFrameRate` meaningful in the browser loop or document it as unsupported. If unsupported, add a loud test or runtime note so a Jackal bootstrap cannot silently rely on it.

#### Acceptance Tests

Add focused tests around `AppGameContainer` or an extracted update scheduler. The tests should not require a real browser canvas if the scheduling can be isolated.

Minimum required cases:

1. Minimum interval accumulation:

   - Set `minimumLogicUpdateInterval = 50`.
   - Feed frame deltas `16`, `16`, `16`.
   - Expected: no `game.update(...)` call yet.
   - Feed another `16`.
   - Expected: one `game.update(...)` call with the accumulated Java-equivalent delta, then `storedDelta` is cleared when max interval is `0`.

2. Maximum interval catch-up:

   - Set `minimumLogicUpdateInterval = 1`.
   - Set `maximumLogicUpdateInterval = 20`.
   - Feed one frame delta of `55`.
   - Expected Java-equivalent update sequence: `20`, `20`, `15`.

3. Maximum interval remainder retention:

   - Set `minimumLogicUpdateInterval = 16`.
   - Set `maximumLogicUpdateInterval = 20`.
   - Feed one frame delta of `55`.
   - Expected Java-equivalent update sequence: `20`, `20`, with remainder `15` retained for a later frame because `15` is not greater than `minimumLogicUpdateInterval`.

4. Paused update:

   - Set paused true.
   - Feed one visible frame delta.
   - Expected: `game.update(container, 0)` is called exactly once.

5. Paused music poll:

   - Set paused true.
   - Feed one visible frame delta.
   - Expected: Slick music polling still receives the frame delta before or independent of the pause branch.

6. Target frame rate:

   - Set a nonnegative target frame rate.
   - Expected: either the browser loop paces frames according to the configured target, or the test asserts the documented unsupported behavior in a way the Jackal PWA bootstrap cannot ignore accidentally.

7. Jackal default path:

   - With default min `1`, max `0`, smooth false, and not paused, a normal visible frame still produces one `game.update(...)` call with the raw integer frame delta, preserving Jackal's existing fixed inner `Sys` loop behavior.

## Non-Filed Observations From This Pass

These were checked but are not new Jackal repair items from this pass:

- Jackal has no direct calls to `setMinimumLogicUpdateInterval(...)`, `setMaximumLogicUpdateInterval(...)`, `setTargetFrameRate(...)`, `pause()`, `resume()`, or `setPaused(...)` in `C:\NetBeansProjects\SlickJackal\src\jackal`.
- Jackal's direct `getSubImage(...)` use is on unflipped `sun` and `wave` strips in `Main.java:1554` and `Main.java:1560`; the flipped-image subimage edge case is not filed as a Jackal blocker here.
- Direct `Graphics.drawImage(...)` use found in Jackal's local custom Slick containers is native/windowing scaffolding, not core `jackal` gameplay code. The browser port should use the TS container path instead of porting those native display classes literally.
- Jackal audio usage remains centered on `Sound`, `Music`, `Song`, and `GameContainer.setMusicOn(...)`; the previously repaired `Song` behavior looks aligned for the observed Jackal constructors and update flow.
- Jackal's world-clip-heavy draw sites remain covered by the current world-clip parity test surface.

## Handoff Summary

Repair or explicitly fence off the TS `AppGameContainer` timing semantics before relying on it for the Jackal PWA shell. The original Jackal game logic mostly protects itself with its own 10 ms `Sys` loop, but the required browser menu/start/return-to-menu lifecycle makes `pause`, music polling, and container scheduling behavior conversion-relevant.
