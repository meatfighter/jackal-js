# Slick2D TS And Jackal Post-Repair Audit

Date: 2026-08-04

## Scope

This pass reviewed `C:\js-projects\slick2d-ts` and `C:\js-projects\jackal-js` after another AI claimed to have fixed the previous Slick2D issues. The checks focused on Jackal conversion risk, audio parity, hot-path performance, Java integer behavior, and current structural parity.

Reference projects:

- Java Slick2D: `C:\java-projects\slick2d\Slick\src\org\newdawn\slick`
- TypeScript Slick2D: `C:\js-projects\slick2d-ts`
- Java Jackal: `C:\NetBeansProjects\SlickJackal\src\jackal`
- TypeScript Jackal: `C:\js-projects\jackal-js`

## Verification Run

Commands run successfully:

- `npm.cmd test` in `C:\js-projects\slick2d-ts`
  - Result: 99 tests passed, 0 failed.
- `npm.cmd run lint` in `C:\js-projects\jackal-js`
  - Result: ESLint passed.
- `npm.cmd run typecheck` in `C:\js-projects\jackal-js`
  - Result: TypeScript no-emit check passed.
- `npm.cmd run build` in `C:\js-projects\jackal-js`
  - Result: TypeScript compile and Vite production build passed.

Structural checks:

- Jackal Java class files: 124.
- Jackal TS class files: 124.
- No Jackal class basename differences were reported.
- Java Jackal sound-effect refs in `Main.java`: 25.
- TS Jackal sound-effect refs in `Main.ts`: 25.
- Packaged TS sound-effect files in `public/resources/soundeffects`: 25.
- Java source sound-effect files in `C:\NetBeansProjects\SlickJackal\src\soundeffects`: 25.
- TS packaged sound-effect hashes match the Java source files.

## Current Jackal-Blocking Slick2D TS Bugs

No confirmed current `slick2d-ts` bug was found that blocks Jackal gameplay in this pass.

The previously reported `Image.draw(...)`, `Image.drawEmbedded(...)`, and `Graphics.drawImage(...)` issues appear fixed in the current `slick2d-ts` source and are covered by the current rendering parity tests.

Confirmed current source evidence:

- `src/slick/Image.ts:263`: `draw(x, y, scale, filter)` overload exists.
- `src/slick/Image.ts:338`: `drawEmbedded(...)` handles the 4, 8, and 9 argument Java shapes without rest args.
- `src/slick/Graphics.ts:445`: `drawImage(...)` uses fixed optional parameters and `arguments.length`, not a rest-argument array.
- `test/rendering-parity.test.mjs`: current tests cover the repaired image and graphics overload behavior.

## Full Slick2D Library Parity Gap

This is not a confirmed Jackal blocker, but it is a real full-library parity limitation.

Recursive file comparison:

- Java Slick2D `.java` files under `org/newdawn/slick`: 302.
- TypeScript `.ts` files under `src/slick`: 57.

The TS port includes browser-specific replacement/helper files that do not correspond to Java files, such as:

- `ApplicationGameContainer.ts`
- `ScalableGame2.ts`
- `rendering/WebGLRenderer.ts`
- `support/BinaryReader.ts`
- `support/JavaRandom.ts`
- `support/SpriteDrawing.ts`

The Java Slick2D tree still has many classes with no matching TS file, including non-browser-specific APIs such as:

- `AngelCodeFont`
- `Animation`
- `BigImage`
- `CachedRender`
- `ImageBuffer`
- `ShapeFill`
- `SpriteSheetFont`
- `TrueTypeFont`
- `UnicodeFont`
- `command/*`
- `fills/GradientFill`
- `font/*`
- `geom/*`
- `gui/*`
- `imageout/*`
- `loading/*`
- `muffin/*`
- many `openal/*`, `opengl/*`, `particles/*`, and `state/*` classes

Jackal does not currently import these missing classes. For the Jackal PWA conversion, this is therefore a broad Slick2D parity limitation rather than a gameplay blocker. If the project requirement is literally full Slick2D 1-to-1 class/file parity, another AI must either port these files or write down an explicit browser-scope exception list.

## Why Jackal Sound Effects Were Weak

The sound effects were weak because the browser app shell started the shared menu volume at `0.8`, and Slick2D's Java sound-effect path applies global sound volume twice.

This double application is Java parity, not a current `slick2d-ts` bug.

Original Java Slick2D:

- `Sound.java:117`: `Sound.play(float, float)` passes `volume * SoundStore.get().getSoundVolume()`.
- `Sound.java:141`: `Sound.playAt(...)` does the same.
- `Sound.java:157`: `Sound.loop(float, float)` does the same.
- `SoundStore.java:395`: `playAsSoundAt(...)` then does `gain *= soundVolume`.

Current `slick2d-ts`:

- `src/slick/Sound.ts:61`: `Sound.play(...)` computes `volume * SoundStore.get().getSoundVolume()`.
- `src/slick/Sound.ts:76`: `Sound.playAt(...)` computes the same.
- `src/slick/Sound.ts:94`: `Sound.loop(...)` computes the same.
- `src/slick/openal/SoundStore.ts:385`: `playSound(...)` computes `volume * this.soundVolume`.
- `test/sound-store-parity.test.mjs:291`: regression test asserts Java's double global-volume behavior.

Java Jackal does not set global Slick music or sound volume. Java starts with Slick defaults:

- `GameContainer.java:756`: `setMusicVolume(1.0f)`.
- `GameContainer.java:757`: `setSoundVolume(1.0f)`.

The PWA shell previously did this:

- `src/app/JackalWebApp.ts:10`: `private volume = 0.8`.
- `src/app/JackalWebApp.ts:94`: `setMusicVolume(this.volume)`.
- `src/app/JackalWebApp.ts:95`: `setSoundVolume(this.volume)`.

At the PWA default, the effective global gains are:

- Music global gain: `0.8`.
- Sound-effect global gain: `0.8 * 0.8 = 0.64`.

Jackal then applies Java-copied per-effect gains:

- Enemy hit: `0.6 * 0.64 = 0.384`.
- Explosion: `0.65 * 0.64 = 0.416`.
- Helicopter: `0.5 * 0.64 = 0.32`.

At Java startup defaults, those same effects would be:

- Enemy hit: `0.6`.
- Explosion: `0.65`.
- Helicopter: `0.5`.

The assets are not the cause:

- The TS packaged sound-effect files match the Java source files by count, size, and hash.
- The Java and TS `new Sound("soundeffects/...")` refs match.
- The ResourceManifest includes all 25 sound-effect files.
- Jackal uses `Sound.play(...)`, not `Sound.playAt(...)`, so Web Audio panner falloff is not involved.

Applied Jackal-side repair:

- `src/app/JackalWebApp.ts:10` now defaults the PWA menu volume to `1`.
- This restores strict startup parity with Java's default global `musicVolume = 1` and `soundVolume = 1`.
- Do not remove one of the two Slick sound-volume multiplications in `slick2d-ts`; that would break Java Slick2D parity.
- If the browser UI later wants a perceptual master-volume slider instead of a direct Slick global-volume slider, make that an explicit app-shell decision. One possible mapping is `setMusicVolume(master)` and `setSoundVolume(Math.sqrt(master))`, because Slick then squares the stored sound volume. This is not Java behavior; it is a browser UI policy.

## Browser-Specific Audio Divergence To Keep

Java `SoundStore.playAsSoundAt(...)` floors exact zero sound gain to `0.001f`:

- `SoundStore.java:396-398`: if gain is zero, Java uses `0.001f`.

Current `slick2d-ts` allows exact zero gain:

- `test/sound-store-parity.test.mjs:312`: zero global or per-sound volume mutes to gain `0`.

For a browser PWA with a volume slider, exact mute is the correct product behavior. Do not file this as a Jackal bug unless the project explicitly chooses to reproduce Java's barely-audible OpenAL zero-gain workaround.

## Performance Findings

### Slick2D TS Hot-Path Status

No current Slick2D rendering hot-path rest-argument issue was found.

Current good state:

- `Graphics.drawImage(...)` no longer allocates a rest array.
- `Image.draw(...)` no longer allocates a rest array.
- `Image.drawEmbedded(...)` no longer allocates a rest array.
- `Music` and `SoundStore` active-handle paths no longer show `Array.from(...)` in the scanned hot files.
- `Input` controller polling no longer allocates string keys per state update.
- `JavaRandom` hot random methods now use number limbs rather than BigInt seed updates.

Remaining Slick2D allocations appear cold or defensive:

- `AppGameContainer.ts:562`: `Array.from(parent.children).find(...)` during DOM canvas attach.
- `Input.ts:936`: `Array.from(...).map(...)` for a static key map.
- `SpriteSheet.ts:142-143`: `Array.from(...)` during sheet construction.
- `XMLPackedSheet.ts:44`: `Array.from(document.getElementsByTagName(...))` during sheet loading.
- `ResourceLoader.ts`: `Array.from`, `.map`, and `.filter` in preload/wait/cache-management paths.
- `Graphics.ts:264`, `Graphics.ts:300`, and `Graphics.ts:607`: object spreads for clip getters/restores.
- `WebGLRenderer.ts:933` and `WebGLRenderer.ts:1045`: array spreads in getter/inspection methods.

These are not Jackal frame-hot in the current port.

### Jackal Constructor Rest Arrays

This issue has been fixed in `jackal-js`.

Evidence:

- The converter now emits fixed optional constructor parameters plus `const argCount = arguments.length`.
- The private constructor helper receives `argCount` explicitly, so overload dispatch preserves the public constructor's original arity.
- Java constructor delegation calls such as `this(x, y)` are rewritten to helper calls with explicit delegated arity, such as `this.__construct_Airplane(2, x, y)`.
- Regenerated classes no longer contain `constructor(...args: any[])`, `__construct_*(...args: any[])`, `args.length`, or `args[index]`.
- Example shape: `EnemySoldier` now has `constructor(arg0?: any, arg1?: any, arg2?: any)` and `__construct_EnemySoldier(argCount, arg0, arg1, arg2)`.

This removes one public rest array allocation and one helper rest array allocation from each fixed-arity generated gameplay object construction while preserving Java constructor overload checks.

Verification:

- `npm.cmd run convert` regenerated the port from Java source.
- `npm.cmd run lint` passed.
- `npm.cmd run typecheck` passed.
- `npm.cmd run build` passed.

### Jackal Packed-Direction BigInt Lookup

The main remaining gameplay-hot BigInt path is pathfinding direction extraction:

- Java `Stage.java:15`: `public long[] directions`.
- Java `Main.java:1801-1804`: `stage.directions = new long[size]` and `dis.readLong()`.
- Java `GameMode.java:337-345`: computes index/shift and extracts `((directions[index] >> shift) & 7L)`.
- TS `Stage.ts:16`: `directions` stores the loaded Java long values.
- TS `Main.ts:1956-1959`: initializes with `0n` and loads `dis.readLong()`.
- TS `GameMode.ts:342-350` and `GameMode.ts:402-410`: uses cached BigInt shifts and masks to extract the packed 3-bit direction.

This BigInt use is parity-driven because Java stores the map direction table as signed 64-bit longs. Do not replace it with JavaScript bitwise operators directly; JS bitwise operators are 32-bit and would corrupt the upper packed entries.

Possible performance follow-up:

- Keep `Stage.directions` as the exact Java-shaped `long[]` equivalent for structure/parity.
- Add a separately named decoded `Uint8Array` cache only if allowed by the porting policy.
- Populate it at load time from the BigInt long table.
- Prove parity against all `maps/dirs-*.dat` entries before routing `GameMode.suggestDirection(...)` through it.

This would move BigInt work to loading and make runtime direction lookup numeric, but it adds a non-Java auxiliary structure. Treat it as an explicit performance extension, not a mechanical Java port.

### Broad Generated Imports

Every generated Jackal file imports a very broad Slick2D and JavaRuntime symbol set. This increases parse and bundle work but is not a frame-hot allocation.

Recommended only if bundle parse time becomes a problem:

- Teach the converter to emit used-symbol imports.
- Keep this lower priority than constructor dispatch and packed-direction lookup.

## Current Repair Request For Another AI

For `slick2d-ts`:

1. If full-library Slick2D parity is required, port or explicitly exception-document the missing Java Slick2D classes and packages. This is broad library work, not a Jackal gameplay blocker.
2. Do not change `Sound.ts` or `SoundStore.ts` to remove the double global sound-volume multiplication. Current behavior matches Java and is tested.
3. Leave exact zero-gain mute in place unless the project chooses strict OpenAL zero-gain parity over browser mute behavior.

For `jackal-js`:

1. Weak default SFX startup volume is fixed by defaulting `JackalWebApp.volume` to `1`.
2. Generated constructor rest arrays are fixed by the converter and regenerated TS output.
3. A load-time decoded direction cache remains optional. Add it only with explicit acceptance that it is an auxiliary non-Java structure and only after parity proof against all `maps/dirs-*.dat`.
