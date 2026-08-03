# Slick2D-TS Jackal Re-Audit Findings

Date: 2026-08-03

Scope: second audit of `C:\java-projects\slick2d\Slick\src` against the current `C:\js-projects\slick2d-ts\src`, filtered to issues that can affect the `C:\NetBeansProjects\SlickJackal` desktop-browser PWA port.

Verification performed:

- Ran `npm.cmd test` in `C:\js-projects\slick2d-ts`.
- Result: 34 tests passed, 0 failed.
- The passing suite confirms the earlier repair pass added useful coverage, but the issues below are still present or still unproved for Jackal's browser conversion.

## P0: `clearWorldClip()` Erases The Outer `ScalableGame` Screen Clip

### Evidence

Java Slick separates screen clipping from world clipping:

- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\Graphics.java:741` says `clearWorldClip()` does not affect screen clipping.
- Java `clearWorldClip()` disables clip planes only, not the scissor screen clip.
- Java `setClip(...)` stores a separate `clip` rectangle and uses `GL_SCISSOR_TEST`.

Current TypeScript shares one WebGL scissor state:

- `C:\js-projects\slick2d-ts\src\slick\rendering\WebGLRenderer.ts:346` `setClip(...)` enables scissor.
- `C:\js-projects\slick2d-ts\src\slick\rendering\WebGLRenderer.ts:375` `setWorldClip(...)` delegates to `setClip(...)`.
- `C:\js-projects\slick2d-ts\src\slick\rendering\WebGLRenderer.ts:379` `clearWorldClip()` calls `clearClip()`.
- `C:\js-projects\slick2d-ts\src\slick\rendering\WebGLRenderer.ts:356` `clearClip()` disables scissor completely.

Jackal uses this nested pattern:

- `C:\js-projects\slick2d-ts\src\slick\ScalableGame.ts:65` sets an outer screen clip for the scaled logical game.
- `C:\NetBeansProjects\SlickJackal\src\jackal\GameMode.java:1002` applies camera translation before rendering world sprites.
- Many Jackal objects call `gameMode.g.setWorldClip(...)` and then `gameMode.g.clearWorldClip()`, for example `C:\NetBeansProjects\SlickJackal\src\jackal\BossGarageManager.java:154` through `C:\NetBeansProjects\SlickJackal\src\jackal\BossGarageManager.java:212`.

### Why This Matters

When the browser canvas is letterboxed or scaled by `ScalableGame`, the outer screen clip prevents game rendering from leaking outside the scaled playfield. A Jackal world clip inside that render can currently replace the outer clip, and `clearWorldClip()` can then disable clipping entirely before the rest of the frame renders.

This is not equivalent to Java Slick.

### Required Fix

Maintain separate clip state for:

- screen clip from `Graphics.setClip(...)`
- world clip from `Graphics.setWorldClip(...)`

The backend should apply the intersection of active clips to WebGL scissor. Clearing one clip type must recompute the scissor from the remaining active clip.

### Acceptance Checks

- Add a test that calls `setClip(10, 20, 100, 80)`, then applies a transform, calls `setWorldClip(...)`, then calls `clearWorldClip()`.
- After `clearWorldClip()`, WebGL scissor must still represent the original screen clip.
- `clearClip()` must clear the screen clip without accidentally leaving stale world clip state in the wrong coordinate space.
- Add a Jackal-shaped test: `ScalableGame` scale plus camera translation plus an inner world clip. Pixels outside the scaled game viewport must remain unchanged after the inner `clearWorldClip()`.

## P0: Sound Effects Cannot Be Truly Muted

### Evidence

Java Slick allows zero gain:

- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\openal\SoundStore.java:395` multiplies `gain *= soundVolume`.
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\openal\SoundStore.java:410` sends that gain directly to OpenAL.

Current TypeScript forces a minimum audible gain:

- `C:\js-projects\slick2d-ts\src\slick\openal\SoundStore.ts:380` sets `sourceGain = Math.max(0.001, Math.max(0, volume * this.soundVolume));`

### Why This Matters

The Jackal PWA must provide a menu volume slider. A slider value of `0` must mute effects. With the current minimum gain, sound effects can still be audible at volume zero.

### Required Fix

Remove the `0.001` floor for sound-effect gain. Clamp only to `>= 0`, preserving Java's behavior.

### Acceptance Checks

- With `SoundStore.setSoundVolume(0)`, `new Sound(...).play()` must create a gain of exactly `0`.
- With per-sound `sound.play(1, 0)`, gain must be exactly `0`.
- Existing Java double-application of global sound volume must remain unchanged for nonzero values.
- Add a regression test next to `test/sound-store-parity.test.mjs`.

## P1: Controller Direction And Edge Event Parity Is Incomplete

### Evidence

Java Slick direction polling includes both axes and POV hat:

- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\Input.java:887` checks `getXAxisValue() < -0.5f || getPovX() < -0.5f`.
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\Input.java:912` checks `getXAxisValue() > 0.5f || getPovX() > 0.5f`.
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\Input.java:936` checks `getYAxisValue() < -0.5f || getPovY() < -0.5f`.
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\Input.java:961` checks `getYAxisValue() > 0.5f || getPovY() > 0.5f`.

Current TypeScript direction polling checks axes only:

- `C:\js-projects\slick2d-ts\src\slick\Input.ts:380` through `C:\js-projects\slick2d-ts\src\slick\Input.ts:396`.

Java Slick controller events track down/released state separately:

- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\Input.java:1314` clears control state and fires release when the control is no longer down.
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\Input.java:1318` marks a fresh press and fires press when a control transitions up to down.
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\Input.java:1421` fires one-based `controllerButtonPressed`.
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\Input.java:1457` fires one-based `controllerButtonReleased`.

Current TypeScript uses `controlPressed` as both one-shot pressed state and edge-state memory:

- `C:\js-projects\slick2d-ts\src\slick\Input.ts:85` has `controlPressed`.
- `C:\js-projects\slick2d-ts\src\slick\Input.ts:639` through `C:\js-projects\slick2d-ts\src\slick\Input.ts:660` fires button press events.
- No matching release detection or `controllerButtonReleased(...)` call was found.

Jackal depends on these paths:

- `C:\NetBeansProjects\SlickJackal\src\jackal\HumanInput.java:36` through `C:\NetBeansProjects\SlickJackal\src\jackal\HumanInput.java:39` use `isControllerUp/Down/Left/Right`.
- `C:\NetBeansProjects\SlickJackal\src\jackal\InputMode.java:120` uses `controllerButtonPressed(...)` for controller button mapping.

### Why This Matters

Desktop browser gamepads commonly expose D-pad directions as standard Gamepad buttons 12, 13, 14, and 15 instead of axes. Under the current TS implementation, a D-pad-only controller may map action buttons but fail to move the jeep.

The event-state issue can also cause remapping/re-entering input setup to miss controller button presses because a previously seen pressed key can remain in `controlPressed` until consumed by `isControlPressed(...)`.

### Required Fix

Implement Slick-style controller control state:

- Track current down state separately from one-shot pressed state.
- Fire directional press/release callbacks.
- Fire button release callbacks.
- Preserve one-based listener button indexes and zero-based `isButtonPressed(...)` polling.
- Treat standard browser Gamepad D-pad buttons as POV equivalents:
  - left: button 14
  - right: button 15
  - up: button 12
  - down: button 13

### Acceptance Checks

- A fake gamepad with axis `0 = -1` triggers `isControllerLeft(...)`.
- A fake gamepad with button `14` pressed also triggers `isControllerLeft(...)`.
- Press/release/press of the same button fires two `controllerButtonPressed(...)` callbacks and one `controllerButtonReleased(...)` callback.
- Jackal's `InputMode` flow can map controller grenade and gun, leave that mode, re-enter it, and map again without clearing the whole `Input` instance.

## P1: Decode/Preparation Failures Are Not Retained For The Loading Error Screen

### Evidence

Fetch failures are retained on resource records:

- `C:\js-projects\slick2d-ts\src\slick\util\ResourceLoader.ts:240` exposes `resourceFailed(ref)`.
- `C:\js-projects\slick2d-ts\src\slick\util\ResourceLoader.ts:249` exposes `getResourceError(ref)`.

Generic tracked decode/preparation promises are removed when they settle:

- `C:\js-projects\slick2d-ts\src\slick\util\ResourceLoader.ts:206` creates `track(...)`.
- `C:\js-projects\slick2d-ts\src\slick\util\ResourceLoader.ts:208` deletes the tracked promise in `finally`.
- `C:\js-projects\slick2d-ts\src\slick\util\ResourceLoader.ts:258` `waitForAll()` only awaits currently retained promises.

Image decode and audio decode are tracked through this generic path:

- `C:\js-projects\slick2d-ts\src\slick\rendering\WebGLTextureResource.ts:75` tracks image loads.
- `C:\js-projects\slick2d-ts\src\slick\rendering\WebGLTextureResource.ts:181` uses `createImageBitmap(...)`.
- `C:\js-projects\slick2d-ts\src\slick\openal\SoundStore.ts:310` uses `decodeAudioData(...)`.
- `C:\js-projects\slick2d-ts\src\slick\openal\SoundStore.ts:321` tracks audio decode through `ResourceLoader.track(...)`.

### Why This Matters

The Jackal PWA loading screen must show a user-facing error if loading fails. A resource may fetch successfully but fail during image or audio decode. If that decode failure settles before the host calls `ResourceLoader.waitForAll()`, the current tracking model can remove the failed promise and leave no retained ref-specific error for the loading screen.

### Required Fix

Retain failed tracked tasks until `ResourceLoader.clearCache()` or an explicit reset. The retained error must include the original Java resource path whenever possible.

Suggested API shape:

- `ResourceLoader.track(promise, refOrLabel)`
- `ResourceLoader.getTrackedErrors()`
- `ResourceLoader.hasFailed()`
- `waitForAll()` rejects if any retained tracked task failed, even if the failure happened before `waitForAll()` was called.

### Acceptance Checks

- Simulate successful fetch plus failing `createImageBitmap`; the loading screen barrier must reject with the image ref.
- Simulate successful fetch plus failing `decodeAudioData`; the loading screen barrier must reject with the audio ref.
- The failure must remain queryable after the promise settles.
- `ResourceLoader.clearCache()` must clear retained decode/preparation failures for a fresh restart.

## P2: `Color` Overload Ambiguity Can Break Exact Java Color Parity

### Evidence

Java has separate overloads:

- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\Color.java:105` `Color(float r, float g, float b, float a)`.
- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\Color.java:134` `Color(int r, int g, int b, int a)`.

TypeScript has one numeric constructor and guesses channel scale:

- `C:\js-projects\slick2d-ts\src\slick\Color.ts:69` through `C:\js-projects\slick2d-ts\src\slick\Color.ts:97`.

Current internal byte-to-color call sites pass 0-255 bytes into that ambiguous constructor:

- `C:\js-projects\slick2d-ts\src\slick\Graphics.ts:344` uses `new Color(bytes[0], bytes[1], bytes[2], bytes[3])`.
- `C:\js-projects\slick2d-ts\src\slick\Image.ts:510` uses `new Color(pixel[0], pixel[1], pixel[2], pixel[3])`.

Jackal has an integer-alpha color table:

- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:60` `FADES[i] = new Color(0, 0, 0, 255 * i / (FADES.length - 1));`

### Why This Matters

Because TypeScript cannot know whether `new Color(1, 0, 0, 1)` came from Java's int overload or float overload, literal ports can silently choose the wrong scale. Internal byte color reads are definitely wrong for channel values of `1`: Java int channel `1` means `1 / 255`, while the current heuristic treats it as full `1.0`.

Jackal's fade table is less explosive because its nonzero alpha values are above `1`, but exact parity still requires Java integer division before construction and an explicit int-color path.

### Required Fix

Add explicit construction paths and use them internally:

- `Color.fromInts(r, g, b, a?)`
- `Color.fromFloats(r, g, b, a?)`
- Keep `new Color(packedInt)` and `new Color(Color)` behavior.

Then update internal byte readers to use the int path.

For converted Jackal code, require:

- Java `new Color(int,int,int,int)` becomes `Color.fromInts(...)`.
- Java `new Color(float,float,float,float)` becomes `Color.fromFloats(...)` or a clearly named equivalent.
- The fade table expression must use Java integer division semantics.

### Acceptance Checks

- `Color.fromInts(1, 0, 0, 1)` returns red `1 / 255` and alpha `1 / 255`.
- `Color.fromFloats(1, 0, 0, 1)` returns full red and full alpha.
- `Graphics.getPixel(...)` and `Image.getColor(...)` return byte-accurate colors for channel values `0`, `1`, `254`, and `255`.
- Jackal's 23 fade colors match the Java alpha byte sequence exactly.

## P2: Pre-Init Resource Barrier Still Depends On Host Discipline

### Evidence

The repair pass added:

- `C:\js-projects\slick2d-ts\src\slick\util\ResourceLoader.ts:174` `preloadResources(...)`.

But the container still initializes the game before its own wait:

- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:190` calls `await this.game.init(this);`
- `C:\js-projects\slick2d-ts\src\slick\AppGameContainer.ts:191` then calls `await ResourceLoader.waitForAll();`

Jackal synchronously parses XML during initialization:

- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:1094` and later `new XMLPackedSheet(...)` calls.
- `C:\js-projects\slick2d-ts\src\slick\XMLPackedSheet.ts:32` uses synchronous `ResourceLoader.getResourceAsStream(xmlRef)`.

### Why This Matters

This is acceptable only if the Jackal PWA bootstrap explicitly calls `ResourceLoader.preloadResources(...)` before starting the Slick container. A literal Java-shaped `new ApplicationGameContainer(...).start()` conversion will still fail during `Main.init(...)` if XML/DAT resources are not already registered.

### Required Fix Or Contract

Either:

- add a pre-init preload hook to `AppGameContainer`, or
- document and enforce in the Jackal bootstrap that the PWA Start button performs the manifest preload before container start.

### Acceptance Checks

- A test should prove `new XMLPackedSheet("images/font.png", "images/font.xml")` succeeds during `game.init(...)` only after the manifest preload barrier.
- A test should prove the direct no-preload path fails with a clear error, not a silent blank screen.
- The PWA loading screen must use the preload barrier before `AppGameContainer.start()`.

## Not Counted As Bugs In This Re-Audit

The following were checked and should not be treated as fresh blockers:

- Missing desktop-only Java window APIs are acceptable where the browser port intentionally uses canvas/fullscreen/PWA equivalents.
- `Sound.play(...)` double-applies global sound volume like Java Slick; do not remove that unless choosing a documented non-parity behavior.
- `ScalableGame` safe-block matrix push/pop matches Java and is not a transform leak.
- `ResourceLoader.preloadResources(...)`, `SoundStore.unlock()`, `JavaNumbers`, and the existing world-clip tests are real improvements; the findings above are gaps left after those improvements, not proof that the repair pass did nothing.
