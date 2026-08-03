# Slick2D-TS Jackal Fix Handoff

Date: 2026-08-03

This file is a focused handoff for another AI to fill in, fix, or prove the `slick2d-ts` pieces needed by the `SlickJackal` web port. It is intentionally narrower than `SLICK2D_TS_MISSING_AUDIT.md`: this document only covers missing features, risky behavior, or bugs that can affect the Jackal conversion.

## Result Summary

No direct blocker was found where Jackal imports a Slick/LWJGL class that is wholly absent from `C:\js-projects\slick2d-ts\src`.

The blocking work is instead around exact browser-host integration and parity proof:

- Jackal needs deterministic resource preloading before Java-equivalent `init` code synchronously parses XML and binary data.
- Jackal needs explicit Java numeric semantics for integer casts, integer division, float rounding, byte handling, and packed values.
- Jackal's PWA menu/start flow needs a reliable Web Audio unlock and restart lifecycle.
- Jackal uses transformed world clips heavily enough that `slick2d-ts` needs pixel-level regression coverage before the port can be trusted.

## P0: Add Or Document A Pre-Init Resource Barrier

### Why This Matters

Jackal's Java code expects resources to be synchronously available during game initialization. The TypeScript Slick port currently has the primitives for this, but the runtime ordering is easy to get wrong.

Relevant files:

- `C:\js-projects\slick2d-ts\src\slick\util\ResourceLoader.ts`
- `C:\js-projects\slick2d-ts\src\slick\XMLPackedSheet.ts`
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts`
- `C:\NetBeansProjects\SlickJackal\src\org\newdawn\slick\tools\hiero\trinkets\Main.java`

Observed behavior:

- `ResourceLoader.getResourceAsStream(ref)` is synchronous and only returns already registered or preloaded bytes.
- `XMLPackedSheet` synchronously loads XML bytes through `ResourceLoader.getResourceAsStream(xmlRef)`.
- `AppGameContainer.start()` initializes the game before waiting for tracked resource promises.

Risk:

- A direct converted `Main.init(container)` can throw during font/sprite sheet initialization if the host has not already fetched and registered every XML/DAT/resource needed during `init`.
- `ResourceLoader.track()` plus `ResourceLoader.waitForAll()` is not sufficient if the wait happens after `game.init`.

Required fix or explicit host contract:

- Add a `slick2d-ts` pre-start/pre-init resource barrier, or document that Jackal's bootstrap must preload and register all required assets before calling `AppGameContainer.start()`.
- Preferred helper shape: a manifest-based preload function that fetches each original Java resource path, applies existing retry/cache-bust behavior, registers bytes under the original ref key, and reports progress.

Acceptance checks:

- Preload `images/font.xml`, then construct `new XMLPackedSheet("images/font.png", "images/font.xml")` inside game init without throwing.
- Preload all 126 Jackal asset paths listed in `SLICKJACKAL_WEB_PORT_AUDIT.md`; every entry must have a nonzero byte length except files that are intentionally zero-byte in the Java project.
- Simulate one transient failed fetch and verify retry behavior still resolves the registered bytes.
- Simulate a permanent failed fetch and verify the PWA loading screen receives a concrete user-facing error rather than hanging.

## P0: Provide Java Numeric Semantics For Ported Game Logic

### Why This Matters

Java and TypeScript do not share numeric behavior. Jackal logic uses Java `int`, `long`, `float`, byte arrays, casts, integer division, `%`, packed map/object values, and random/math behavior. A perfect-parity port cannot use plain TypeScript `number` arithmetic everywhere without explicit rules.

Relevant existing files:

- `C:\js-projects\slick2d-ts\src\java\io\BinaryReader.ts`
- `C:\js-projects\slick2d-ts\src\java\util\JavaRandom.ts`

Required feature:

- Either add shared Java numeric helpers to `slick2d-ts`, or create them in the Jackal port and document that they are required by every converted class.

Minimum helper coverage:

- Java `(int)` cast from number, including truncation toward zero and 32-bit wrap.
- Java integer division truncating toward zero.
- Java `%` remainder sign behavior.
- Java signed byte conversion for values read from binary files.
- Java unsigned byte conversion where Java code masks with `& 0xFF`.
- Java `short` and `char` conversions if encountered during porting.
- Java `float` narrowing policy, probably through `Math.fround` at converted assignment/call sites where the Java type is `float`.
- Java `Math.round(float)` and `Math.round(double)` behavior.
- Java `long` strategy for packed values: use `bigint` only where 53-bit JavaScript number precision is insufficient, and document every boundary.

Acceptance checks:

- Add a numeric parity test table containing negative division, negative remainder, overflow, byte sign extension, `& 0xFF`, float rounding, and packed coordinate/object values.
- Audit every Java declaration and cast in `C:\NetBeansProjects\SlickJackal\src` and mark which helper or plain TypeScript construct is used.
- Do not silently replace Java `int` behavior with arbitrary floating point math in collision, timer, map, enemy, item, camera, or projectile code.

## P1: Add A Web Audio Unlock Helper And Restart Test

### Why This Matters

The browser Web Audio API requires a user gesture before playback can reliably start. The Jackal PWA will show a menu with a Start button and volume slider, and the in-game hamburger menu must be able to return to the menu and restart without stale audio state.

Relevant files:

- `C:\js-projects\slick2d-ts\src\slick\openal\SoundStore.ts`
- `C:\js-projects\slick2d-ts\src\slick\Sound.ts`
- `C:\js-projects\slick2d-ts\src\slick\Music.ts`
- `C:\js-projects\slick2d-ts\src\slick\GameContainer.ts`
- `C:\js-projects\pitfall-js`

Observed behavior:

- `SoundStore.getAudioContext()` lazily creates an `AudioContext`.
- Playback paths attempt `context.resume()`, but the port should not rely on first playback as the only unlock mechanism.
- `SoundStore.destroy()` closes the audio context, clears sources and buffers, and resets its internal state.

Required fix or proof:

- Add an explicit user-gesture-friendly audio unlock method, or document the exact call sequence the Jackal menu must use.
- Add a lifecycle test for returning to the menu, destroying/stopping audio, and starting the game again.

Acceptance checks:

- From the Start button handler, the app can resume/unlock the audio context before game sounds or music are played.
- The global volume slider updates Slick sound/music volume before and during gameplay.
- Returning to the menu stops active music and looping sounds.
- Starting again after return-to-menu does not use a closed `AudioContext`, does not duplicate looping sounds, and can decode/play sounds again.

## P1: Prove Transformed World Clip Rendering

### Why This Matters

Jackal relies on clipping while the world/camera transform is active. Rendering parity depends on `Graphics.setWorldClip()` matching Java Slick under translation and scaling.

Relevant files:

- `C:\js-projects\slick2d-ts\src\slick\Graphics.ts`
- `C:\js-projects\slick2d-ts\src\slick\rendering\WebGLRenderer.ts`
- `C:\js-projects\slick2d-ts\src\slick\ScalableGame.ts`
- `C:\js-projects\slick2d-ts\src\slick\opengl\SlickCallable.ts`

Jackal call sites include:

- `C:\NetBeansProjects\SlickJackal\src\org\newdawn\slick\tools\hiero\trinkets\BossGarage.java`
- `C:\NetBeansProjects\SlickJackal\src\org\newdawn\slick\tools\hiero\trinkets\BossShipGun.java`
- `C:\NetBeansProjects\SlickJackal\src\org\newdawn\slick\tools\hiero\trinkets\SwampMissile.java`
- `C:\NetBeansProjects\SlickJackal\src\org\newdawn\slick\tools\hiero\trinkets\SuperFire.java`
- `C:\NetBeansProjects\SlickJackal\src\org\newdawn\slick\tools\hiero\trinkets\Train.java`
- `C:\NetBeansProjects\SlickJackal\src\org\newdawn\slick\tools\hiero\trinkets\StatueMissile.java`
- `C:\NetBeansProjects\SlickJackal\src\org\newdawn\slick\tools\hiero\trinkets\StatueSeekerMissile.java`

Observed behavior:

- `Graphics.setWorldClip(x, y, w, h)` delegates to `Renderer.getBackend().setWorldClip(...)`.
- `WebGLRenderer.setWorldClip(...)` combines the current transform with the supplied transform and converts the rectangle to a WebGL scissor rectangle.
- This appears designed for the required use case, but no parity proof was found.

Required proof:

- Add a focused rendering regression test or test page that verifies world clipping under camera translation and under `ScalableGame` scaling.

Acceptance checks:

- With `GL11.glTranslatef(-cameraX, -cameraY, 0)` active, pixels outside the requested world clip remain unchanged.
- With `ScalableGame` active, scissor Y inversion and scale conversion are correct.
- `clearWorldClip()` restores drawing outside the clip.
- The test should include at least one nonzero camera offset and one non-1.0 scale.

## P1: Preserve Browser Loading Behavior With Retries And Errors

### Why This Matters

The Jackal PWA must show a loading splash with animated dots and a user-facing error if loading fails. `slick2d-ts` has lower-level retry/cache-bust support, but the Jackal host needs a complete loading contract.

Relevant files and projects:

- `C:\js-projects\slick2d-ts\src\slick\util\ResourceLoader.ts`
- `C:\js-projects\worst-mario-game-ever`
- `C:\js-projects\jackal-js`

Required work:

- Reuse or mirror the splash/retry/error behavior from `worst-mario-game-ever`.
- Ensure all resource URLs include an adjustable version or timestamp query parameter.
- Ensure failed resources identify the original Java asset path in the error message.

Acceptance checks:

- The loading screen animates while downloads are in progress.
- A failed required file eventually displays a readable error naming the failed path.
- Changing the build version/cache-bust value changes every resource URL used by the loader.
- A successful retry registers the final bytes under the original Java path.

## P2: CursorLoader String Overload Is Async Unlike Java

### Why This Matters

This is not currently a Jackal gameplay blocker because Jackal's mouse hiding path uses the byte-buffer overload:

- `Mouse.setNativeCursor(CursorLoader.get().getCursor(buffer, 0, 0, 32, 32))`

Relevant files:

- `C:\js-projects\slick2d-ts\src\slick\opengl\CursorLoader.ts`
- `C:\js-projects\slick2d-ts\src\lwjgl\input\Mouse.ts`
- `C:\NetBeansProjects\SlickJackal\src\org\newdawn\slick\tools\hiero\trinkets\Main.java`

Risk:

- Java `CursorLoader.getCursor(String, ...)` is synchronous from the caller's perspective.
- The TypeScript string overload returns a `Promise<Cursor>`.
- If the Jackal port literally ports any local class that calls the string overload synchronously, behavior will diverge.

Required action:

- Mark string-overload cursor calls during conversion.
- Either avoid them, await them in bootstrap-only code, or add a synchronous-preloaded cursor path.

Acceptance checks:

- Jackal's `hideMouseCursor()` path works without awaiting because it uses the byte-buffer overload.
- Any future string cursor path has an explicit async boundary before gameplay starts.

## P2: Review ScalableGame2 Z-Scale

### Why This Matters

This is probably not a Jackal blocker unless the port chooses `ScalableGame2`.

Relevant file:

- `C:\js-projects\slick2d-ts\src\slick\ScalableGame2.ts`

Observed risk:

- `ScalableGame2` uses `GL11.glScalef(..., ..., 0)`.
- A z scale of `0` is suspicious for a Java Slick parity port; normal 2D matrix scaling should preserve z with `1`.

Required action:

- Compare against the Java source for `ScalableGame2`, if present.
- If Java uses z scale `1`, fix the TypeScript port.
- If Java uses z scale `0`, document that this is intentional parity.

Acceptance checks:

- `ScalableGame2` transform behavior matches the Java source exactly.
- Jackal bootstrap either does not use `ScalableGame2`, or has a rendering smoke test proving it works.

## Suspected Issues That Are Not Bugs

Do not "fix" the following without first deciding to intentionally diverge from Java Slick behavior.

### Sound Volume Multiplication

Relevant files:

- `C:\js-projects\slick2d-ts\src\slick\Sound.ts`
- `C:\js-projects\slick2d-ts\src\slick\openal\SoundStore.ts`
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\Sound.java`
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\openal\SoundStore.java`

Finding:

- It initially looks like the TypeScript port may apply global sound volume twice.
- Java Slick does the same path for `Sound.play(pitch, volume)`: `Sound` multiplies by global sound volume, then `SoundStore.playAsSoundAt` multiplies by global sound volume again.
- Therefore the current TypeScript behavior appears to preserve Java parity.

Action:

- Do not change this for Jackal unless the project explicitly chooses user-friendly browser behavior over exact Slick parity.

### ScalableGame Transform Leak

Relevant files:

- `C:\js-projects\slick2d-ts\src\slick\ScalableGame.ts`
- `C:\js-projects\slick2d-ts\src\slick\opengl\SlickCallable.ts`
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\ScalableGame.java`

Finding:

- It initially looks like `ScalableGame.render()` could leave transforms on the stack.
- Java Slick wraps the render body in `SlickCallable.enterSafeBlock()` / `leaveSafeBlock()`, and the TypeScript port mirrors that matrix push/pop behavior.
- This is not currently a parity bug.

Action:

- Keep this behavior unless Java source comparison proves otherwise.

### Controller Button Indexing

Relevant files:

- `C:\js-projects\slick2d-ts\src\slick\Input.ts`
- `C:\NetBeansProjects\SlickJackal\src\org\newdawn\slick\tools\hiero\trinkets\InputMode.java`

Finding:

- TypeScript controller button callbacks use one-based button numbers.
- Polling APIs use zero-based button indexes.
- Jackal's `InputMode` subtracts `1` from controller button numbers before polling, which matches this split.

Action:

- Do not normalize all controller button indexes to one convention unless all Jackal call sites are audited and adjusted.

## Completion Checklist For Another AI

- Create or verify a pre-init resource preload path before converted `Main.init`.
- Add Java numeric helper coverage and tests before translating gameplay logic.
- Add explicit Web Audio unlock/restart support for the PWA menu flow.
- Add transformed world-clip rendering regression tests.
- Add loading splash retry/error integration using versioned/cache-busted asset URLs.
- Audit cursor string overload usage during conversion.
- Review `ScalableGame2` z-scale only if the Jackal port uses it.
- Leave known parity behaviors alone unless a documented project-level decision says to diverge.
