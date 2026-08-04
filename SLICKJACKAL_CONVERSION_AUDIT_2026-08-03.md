# SlickJackal Conversion Audit

Date created: 2026-08-03
Last updated: 2026-08-04

## Summary

This repository now contains a Vite/TypeScript PWA SPA desktop-browser port scaffold plus a generated TypeScript Jackal source tree.

Implemented in this conversion pass:

- PWA/Vite/TypeScript project scaffold.
- ESLint installation and configuration.
- Browser menu screen with Start button and audio volume slider.
- Splash/loading screen with animated dots and user-visible load errors.
- Hamburger return-to-menu overlay while the game canvas is active.
- Service worker with a versioned cache name and retrying fetch behavior.
- Version metadata and cache-bust build stamp.
- Resource manifest using the original Java resource keys.
- Byte-for-byte copied game assets under `public/resources`.
- Java-runtime compatibility helpers for Java collection, random, stream, formatting, copy, point, and array idioms used by the game.
- Mechanical Java-to-TS converter at `tools/convert-java-to-ts.mjs`.
- One generated TS file per Java gameplay file under `src/jackal`.
- Java method overload dispatchers for duplicated JS method names.
- Backing field rewrites for Java field/method collisions such as `remove`/`remove()` and `closeRequested`/`closeRequested()`.
- Static member prefixing for Java-style unqualified static references such as `FADES` and `Main.main`.
- Acyclic `MainConstants` helper for Main's compile-time constants, preventing ES-module temporal-dead-zone failures when generated classes are imported before `Main` finishes initialization.
- `rotatePoint(...)` runtime helper for Java's `Main.rotate(...)` utility, preventing generated static initializers from touching `Main` during circular module evaluation.
- Slick `Log` import generation for Java code that used `org.newdawn.slick.util.Log`.
- Java `Character.toLowerCase(...)` runtime helper for font-table loading.
- Development service worker/cache clearing and production network-first service worker behavior to prevent stale generated modules from masking runtime fixes.

The generated game files intentionally retain `// @ts-nocheck` because this pass prioritizes one-file-per-class source mapping and syntactic browser buildability. TypeScript semantic proof of every generated line is not complete.

## Mapping Counts

| Item | Java/source count | TS/web count |
|---|---:|---:|
| Gameplay Java files under `C:\NetBeansProjects\SlickJackal\src\jackal` | 124 | 124 generated TS class files under `src/jackal` |
| Resource files under Java `src` excluding `.java` | 126 | 126 files under `public/resources` |
| Resource manifest entries | 126 | 126 string entries in `src/app/ResourceManifest.ts` |

The two Java desktop Slick container files under `src/org/newdawn/slick` were intentionally not converted as Jackal gameplay classes. The browser shell uses `slick2d-ts` browser container classes instead.

## Verification

Commands run after the final regeneration:

```text
npm.cmd install
node tools\convert-java-to-ts.mjs
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
Invoke-WebRequest -Uri http://127.0.0.1:5173/ -UseBasicParsing
node bundle smoke import with a minimal DOM stub
```

Results:

| Check | Result |
|---|---|
| `npm.cmd install` | Passed, installed ESLint/TypeScript/Vite and local `slick2d-ts` dependency. |
| `node tools\convert-java-to-ts.mjs` | Passed, regenerated `src/jackal` and `src/app/ResourceManifest.ts`. |
| `npm.cmd run lint` | Passed. |
| `npm.cmd run typecheck` | Passed. |
| `npm.cmd run build` | Passed and emitted `dist` with no duplicate-member warnings. |
| Local dev URL | `http://127.0.0.1:5173/` responded with HTTP 200. |
| Built bundle smoke import | Passed with a minimal DOM stub after generated module initialization fixes. |

## Converter Fixes Completed During Verification

### Java Overloads

Java permits multiple methods with the same name and different signatures. JS class bodies overwrite earlier duplicates.

The converter now emits:

- One dispatcher using the original Java method name.
- One renamed implementation per overload, for example `draw__overload0`, `draw__overload1`.
- Argument-count and basic runtime type guards for numbers, booleans, strings, arrays, Slick classes, and generated Jackal classes.

This removed the Vite/esbuild duplicate-member warnings that previously appeared for `Main`, `GameMode`, `Enemy`, `Player`, and `HitElement`.

### Field/Method Collisions

Java permits a field and method to share a name. JS class fields can shadow prototype methods.

The converter now emits backing fields for the known collision set:

| Java field | TS backing field |
|---|---|
| `remove` | `removeFlag` |
| `changeLayer` | `changeLayerValue` |
| `stageCompleted` | `stageCompletedFlag` |
| `stopSong` | `stopSongFlag` |
| `optionSelected` | `optionSelectedFlag` |
| `closeRequested` | `closeRequestedFlag` |
| static `Main.main` | `Main.mainInstance` |

The converter also rewrites non-call property reads/writes such as `element.remove` to `element.removeFlag` while preserving method calls such as `element.remove()`.

### Static Member Prefixing

The metadata parser was fixed so blank lines can no longer be swallowed into a field type. This allowed fields such as `Main.FADES` and `Main.mainInstance` to be recognized and rewritten.

Verified examples in generated output:

- `Main.FADES.length`
- `Main.mainInstance = this`
- `this.fadeListener.fadeCompleted()`
- `element.removeFlag = true`

### ES Module Initialization Cycles

The first browser runtime check exposed `Cannot access 'Main' before initialization` from `Player.ts`. The Java source safely calls `Main.rotate(...)` from `Player`'s static initializer, but the TypeScript browser port uses ES modules, where the `Main -> GameMode -> Player -> Main` import cycle can put `Main` in the temporal dead zone.

Fixes applied:

- Added `src/java/MainConstants.ts`.
- Rewrote non-`Main` references to Main's compile-time constants, for example `Main.DISPLAY_WIDTH`, to `MainConstants.DISPLAY_WIDTH`.
- Added `rotatePoint(...)` to `src/java/JavaRuntime.ts`.
- Rewrote `Main.rotate(...)` calls to `rotatePoint(...)`.
- Fixed nested enum rewriting after the smoke check then exposed `Keys is not defined` in `KonamiCode.ts`.

Verification:

- `Player.ts` now uses `rotatePoint(...)` in its static initializer.
- `KonamiCode.ts` now uses `KonamiCodeKeys.*` throughout.
- The production bundle imports successfully under a minimal DOM stub, which catches this class of module-evaluation failure.

### Slick Utility Imports

The browser run exposed `Log is not defined` from generated `Main.ts`. `slick2d-ts` already exports `Log`; the converter's generated import list was missing it.

Fix applied:

- Added `Log` to the generated `slick2d-ts` import list in `tools/convert-java-to-ts.mjs`.
- Regenerated `src/jackal`, so `Main.ts` imports `Log` from `slick2d-ts`.

### Java Character Helper

The browser run exposed `Character is not defined` from `Main.loadFont()`. That prevented the font sprite table from loading, which then caused `LoadingMode.render()` to fail while drawing text.

Fix applied:

- Added `Character.toLowerCase(...)` to `src/java/JavaRuntime.ts`.
- Added `Character` to the converter's generated runtime import list.
- Regenerated `src/jackal`, so `Main.ts` imports `Character`.

### Font Loading Runtime Repairs

The next browser run exposed `Cannot read properties of null (reading 'draw')` from `LoadingMode.render()` while drawing `"loading"`. The immediate cause was `Main.loadFont()` aborting before ordinary letter glyphs were assigned.

Fixes applied:

- Added `JavaString.valueOf(...)` because Java `String.valueOf(c)` was converted to `JavaString.valueOf(c)`.
- Added converter support for `String.valueOf(...)` so regeneration keeps that mapping.
- Aligned `MainConstants.CHARS` with the generated `Main.CHARS` copyright code point using `\u00a9`.
- Mapped both `@` and `\u00a9` to the atlas `copyright` sprite name in generated `Main.getCharacterName(...)`; the Java source has `\u00a9` in `CHARS`, while the existing switch maps `@`.
- Fixed `Main.drawNumber(...)` to preserve Java int division and char arithmetic. Java `'0' + digit` selects glyph codes `0` through `9`; raw TypeScript string concatenation produced keys like `"03"`.
- Added converter post-processing for that known `drawNumber(...)` pattern.

Verification:

- `npm.cmd run lint` passed.
- `npm.cmd run typecheck` passed.
- `npm.cmd run build` passed.
- Font atlas sanity check found `missing total: 0` for all `Main.CHARS` glyphs across black, gray, orange, and orange-gray fonts.

### Constructor Dispatch And GameElement Field Defaults

The next browser run exposed `No Java constructor overload matched arguments: 0` while spawning `EnemySoldier` from `GameMode.processTrigger(...)`. The generated base constructor used `this.__construct(...)`, which is virtual in JavaScript. During `new EnemySoldier(...)`, `GameElement` therefore dispatched to `EnemySoldier.__construct(...)` with zero arguments.

Fixes applied:

- Changed generated constructor helper names to be class-specific, for example `__construct_GameElement(...)` and `__construct_EnemySoldier(...)`.
- Rewrote Java `this(...)` constructor chaining to call the class-specific helper.
- Added generated `__initializeJavaSubclassDefaults(...)` hooks for classes below `GameElement`.
- `GameElement` now invokes the subclass default hook before its intentional virtual `init()` call.
- Suppressed generated no-initializer class fields for `GameElement` descendants so Java default-only fields do not get reset to `undefined` or `null` after `super()` returns.

Rationale:

- Java constructor bodies do not dispatch to subclass constructor bodies.
- Java field storage is default-initialized before superclass constructors run.
- Java declarations without explicit initializers do not run a second assignment after `super()`.
- The original `GameElement` constructor intentionally calls virtual `init()` and then adds the element to the active `GameMode`; the port preserves that behavior while matching Java's field-default timing more closely.

Verification:

- `npm.cmd run convert` passed.
- Generated `EnemySoldier` now calls `this.__construct_EnemySoldier(...args)`.
- Generated `GameElement` now calls `this.__construct_GameElement(...args)` and `this.__initializeJavaSubclassDefaults()` before `this.init()`.
- `npm.cmd run lint` passed.
- `npm.cmd run typecheck` passed.
- `npm.cmd run build` passed.

### Local Variable Shadowing Field Names

The next browser run exposed `Cannot access 'invincible' before initialization` from `Player.update()`. The Java method has both a field `int invincible` and a later local `boolean invincible`. In Java, unqualified `invincible` before the local declaration refers to the field. In JavaScript/TypeScript, a later `let invincible` creates a temporal-dead-zone binding for the whole block.

Fixes applied:

- Added a converter method-body pass that renames locals whose names collide with fields, for example `invincible` to `invincibleLocal`.
- The rename is scoped from the Java local declaration onward; earlier field references are still eligible for `this.field` rewriting.
- Regenerated `src/jackal`.

Verified generated behavior:

- `Player.update()` now decrements `this.invincible`.
- `Player.update()` now assigns respawn invincibility to `this.invincible`.
- The later mine-collision boolean is `invincibleLocal`, preserving the Java local variable's meaning without shadowing the field.
- A generated-source audit found no remaining `let name = this.name` field-shadow pattern.

Verification:

- `npm.cmd run convert` passed.
- `npm.cmd run lint` passed.
- `npm.cmd run typecheck` passed.
- `npm.cmd run build` passed.

### Browser Shell Favicon

The browser also requested `/favicon.ico` and received 404. This is not Jackal gameplay behavior and is not a Slick2D parity issue. The web shell now declares the existing original `icons/32x32.png` resource as the favicon with the same build-stamp cache buster used by the PWA manifest.

### Primitive Numeric Cast Preservation

The next browser run exposed `No Java method overload matched draw: 3` from `GameMode.drawBackground()`. The Java source computes `int xTile = (int)(cameraX / 32)` and `int yTile = (int)(cameraY / 32)`. The converter had stripped primitive casts, leaving fractional JavaScript array indexes such as `tileMap[y + yTile][x + xTile]`. That produced `undefined` tile images before `Main.draw(...)`.

Fixes applied:

- Added Java primitive cast helpers to `src/java/JavaRuntime.ts`: `javaInt`, `javaByte`, `javaShort`, `javaChar`, `javaFloat`, `javaDouble`, and `javaLong`.
- Replaced the converter's blanket cast removal with a cast-preserving scanner for primitive casts.
- Primitive casts now wrap the cast expression, including nested casts inside expressions already wrapped by an outer cast.
- Non-primitive casts are still removed as TypeScript type assertions are not runtime Java behavior in this port.
- Regenerated `src/jackal`.

Verified generated behavior:

- `GameMode.drawBackground()` now uses `javaInt((this.cameraX / 32))` and `javaInt((this.cameraY / 32))` for tile indexes.
- Representative coordinate-to-tile code such as `((int)x) >> 5` now emits `(javaInt(x)) >> 5`.
- Player static sensor casts now use `javaInt(...)`, preserving Java truncation before assigning integer sensor offsets.
- No raw primitive Java cast syntax remains in generated `src/jackal`.

Verification:

- `npm.cmd run convert` passed.
- `npm.cmd run lint` passed.
- `npm.cmd run typecheck` passed.
- `npm.cmd run build` passed.
- Tile-resource audit passed for all six stages: all used map tile IDs are in range and all used tile sprites exist in the expected XML sheets.

### Packed Long Direction Bitfield

The next browser run exposed `Cannot mix BigInt and other types` from `GameMode.suggestDirection(...)`.

Rationale:

- The Java source stores pathfinding direction data as `long[] directions`.
- `Main.loadStage(...)` fills that array with `DataInputStream.readLong()`.
- `GameMode.suggestDirection(...)` extracts one 3-bit direction with `(int)((directions[index] >> shift) & 7L)`.
- The source packs 21 directions into each 63-bit word. A JavaScript `number` cannot represent every 63-bit packed value exactly, so the raw `long` values must remain `bigint` in the browser port.
- The generated TS failed because it kept `directions[index]` as `bigint` but left `shift` and `7` as `number`, which JavaScript forbids for BigInt bitwise operations.

Fixes applied:

- Preserved the packed `long` operation as BigInt until the Java `(int)` narrowing point.
- Rewrote generated extraction to `javaInt(((this.directions[index] >> BigInt(shift)) & 7n))`.
- Rewrote Java `int index = i / 21` to `let index = javaInt(i / 21)` for the packed direction index calculation.
- Tightened `javaInt(...)`, `javaByte(...)`, `javaShort(...)`, and `javaChar(...)` so BigInt inputs use Java narrowing/wrapping semantics instead of lossy `Number(...)` saturation.
- Tightened `javaLong(...)` so BigInt inputs are narrowed to signed 64-bit and numeric inputs truncate toward zero with Java cast bounds.

Verification:

- Generated `GameMode.suggestDirection(...)` now uses Java int division for the packed word index in both overloads.
- Generated `GameMode.suggestDirection(...)` now uses BigInt shift count and BigInt mask for both packed direction extractions.
- This is not a `slick2d-ts` issue; `BinaryReader.readLong()` returning `bigint` is required for Java `long` parity here.

### Nullable String Overload Dispatch

The next browser run exposed `this.loop.playing is not a function` from `Song.stop()`.

Cause:

- The Java source has `stageSong2 = new Song(null, "music/stage2_repeat.ogg")`.
- Java resolves that call to `Song(String intro, String loop)` because the second argument is a `String` and `null` is valid for the first `String` parameter.
- The generated TS overload guard for `String` parameters required `typeof arg === "string"`.
- Because the first argument was `null`, the dispatcher skipped the `String, String` constructor and fell through to the generic two-argument constructor, storing the raw filename string in `this.loop`.
- `Song.stop()` later called `this.loop.playing()`, which failed because `this.loop` was a string rather than a Slick `Music`.

Fixes applied:

- Changed converter overload guards for Java `String` parameters to accept `null` as well as real strings.
- Regenerated `src/jackal`.

Verified generated behavior:

- `Song.__construct_Song(...)` now accepts `(args[0] === null || typeof args[0] === "string")` for Java `String` parameters.
- `new Song(null, "music/stage2_repeat.ogg")` now enters the Java `String, String` branch and assigns `this.loop = new Music(loopLocal4, Song.STREAMING)`.

Verification:

- `npm.cmd run convert` passed.

### Java Integer Division Parity

The next gameplay report exposed too many extra lives when killing enemies. The Java source grants extra lives in `Main.addPoints(...)` when the score first crosses 20,000 and then when the score crosses another 50,000-point bucket:

```java
if ((before < 20000 && score >= 20000) 
    || ((before - 20000) / 50000 != (score - 20000) / 50000)) {
  gainExtraLife();
}
```

Cause:

- Java `int / int` truncates toward zero.
- The generated TS used JavaScript `/`, which returns a fractional number.
- After the score reached 20,000, `(score - 20000) / 50000` changed on almost every score increase instead of staying in the same integer bucket.
- That made the bucket inequality true far too often, granting extra lives on ordinary enemy kills.

Fixes applied:

- Added `javaIntDiv(...)` to `src/java/JavaRuntime.ts`.
- Added `javaIntDiv` to generated runtime imports.
- Rewrote the extra-life bucket calculation to use `javaIntDiv(before - 20000, 50000)` and `javaIntDiv(this.score - 20000, 50000)`.
- Rewrote the already-known packed direction index from `javaInt(i / 21)` to `javaIntDiv(i, 21)`.
- Rewrote Java `int` timing constants and locals that were still raw JS division:
  - `Bomb.HALF_TIME = TRAVEL_TIME / 2`
  - `Grenade.HALF_TIME = TRAVEL_TIME / 2`
  - `BossHelicopter` static local `HALF_TIME = POSITION_DRIFT_TIME / 2`
  - `TravelingExplosion.PERIOD0 = TRAVEL_TIME / 3`
  - `TravelingExplosion.PERIOD1 = 2 * TRAVEL_TIME / 3`
- Rewrote Java int division in `Main.drawNumber(...)`'s loop update to `javaIntDiv(value, 10)`.
- Rewrote the Java int alpha expression in `Main.FADES` construction to `javaIntDiv(255 * i, Main.FADES.length - 1)`.

Audit performed:

- Scanned the Java source for `int` declarations and updates involving `/`.
- Cases with explicit Java casts, such as `(int)(cameraX / 32)`, were already handled by primitive cast preservation.
- Cases with `f`, `(float)`, or `(double)` operands remain JS floating division by design.
- The score extra-life calculation was the direct cause of the reported gameplay bug.

Verification:

- `npm.cmd run convert` passed.
- Generated `Main.addPoints(...)` now uses `javaIntDiv(...)` for both score buckets.
- Generated timing constants and packed direction indexes listed above now use `javaIntDiv(...)`.

### Nested Enum Owner and Angle Conversion Parity

The next browser report crashed when `BossSuperTankGun` spawned:

```text
Cannot read properties of undefined (reading 'PAUSED_BETWEEN_FIRING')
```

Java source detail:

- `BossSuperTankGun.java` declares its own nested `State` enum.
- The actual `state` field is `RotatingGun.State`, initialized with `RotatingGun.State.PAUSED_BETWEEN_FIRING`.
- The generated TS flattened nested enums to symbols like `RotatingGunState`, but the local enum rewrite matched the `State.` segment inside the qualified Java expression `RotatingGun.State.PAUSED_BETWEEN_FIRING`.
- That produced `RotatingGun.BossSuperTankGunState.PAUSED_BETWEEN_FIRING`, which has no runtime value.

Fixes applied:

- Nested enums are now generated as exported flattened symbols, for example `export enum RotatingGunState`.
- Local nested enum rewrites no longer match enum names that are already owner-qualified.
- Qualified Java nested enum references such as `RotatingGun.State` now rewrite to the flattened generated symbol `RotatingGunState`.
- Dependency imports now include generated nested enum symbols when another generated class references them.
- `BossSuperTankGun`'s `state` initializer, assignments, and switch labels now use `RotatingGunState`, matching the Java field type.
- Replaced the brittle regex conversion for `Math.toDegrees(...)` and `Math.toRadians(...)` with balanced-parenthesis rewriting.
- This also fixed the `BossSuperTankGun` target-angle conversion, where nested parentheses inside `Math.atan2(...)` had previously moved `* 180 / Math.PI` into the first `atan2` argument.

Verification:

- `npm.cmd run convert` passed.
- `npm.cmd run lint` passed.
- `npm.cmd run typecheck` passed.
- `npm.cmd run build` passed.
- Grep found no remaining `RotatingGun.BossSuperTankGunState`, `RotatingGun.State`, `Math.toDegrees`, `Math.toRadians`, or malformed boss-gun `atan2(... * 180 / Math.PI), ...` output in generated TS.

The same `Character is not defined` error repeated after the `Character` helper fix because the service worker was cache-first for every GET, including Vite development modules. The browser could keep executing an older generated `Main.ts`.

Cache fix applied:

- Bumped app version to `0.1.1`.
- Bumped build stamp to `20260804T000000Z`.
- `JackalWebApp` now imports `version.json` directly instead of relying on a global define for the build stamp.
- In development, `ServiceWorkerRegistrar` unregisters existing service workers and deletes `jackal-*` caches.
- In production, `public/sw.js` is network-first with cache fallback and avoids caching `/src`, Vite internals, `node_modules`, and `sw.js`.

## Remaining Parity Risks

### Java Numeric Parity Is Still Not Fully Proven

The current converter now preserves explicit primitive casts, the known packed `long` direction bitfield, and the audited Java `int` division sites listed above. It still does not prove every implicit Java numeric boundary.

Required follow-up:

- Audit Java int local declarations and assignments where a non-integer expression is assigned without an explicit cast.
- Audit Java `long` storage and bit operations beyond the packed pathfinding directions, if future source changes add more such logic.
- Apply `Math.fround(...)` or equivalent at Java `float` assignment boundaries where drift would affect gameplay, graphics, or collision.
- Preserve eager Java boolean `|` and `&` behavior where operands have side effects.

### Overload Dispatch Needs Runtime Fixture Tests

The overload dispatchers are syntactically clean and remove duplicate JS method names, but they are still mechanical.

Required follow-up:

- Add fixture tests for overload-heavy methods such as `Main.drawRotated`, `Main.drawVehicle`, `GameMode.add`, `GameMode.destroyAll`, and `HitElement.hit`.
- Confirm dispatcher order matches Java overload resolution for inheritance cases, especially where one argument may satisfy both a subclass and superclass guard.

### Generated Code Still Needs Browser Runtime Audit

The app shell builds, and the dev server responds, but this pass did not complete a clicked-browser gameplay run through all loading stages.

Required follow-up:

- Click Start in a real desktop browser to validate the Web Audio unlock path.
- Confirm the volume slider affects `SoundStore` before and during gameplay.
- Confirm the splash appears during resource preloading and errors are user-visible when a resource fails.
- Confirm the hamburger returns to the menu and shuts down or pauses active audio consistently.
- Confirm `Main.loadNext()` executes all original loading stages and reaches the original first interactive mode.

### Resource And DAT Validation Is Still Needed

All 126 resources were copied and preloaded using the original Java resource keys. Classloader stream calls in generated `Main.ts` are adapted to `ResourceLoader.getResourceAsStream(...)`.

Required follow-up:

- Add binary DAT fixtures for `images/*.dat` and `maps/*.dat`.
- Verify `DataInputStream.readInt`, `readFloat`, `readUnsignedByte`, and related helpers match Java byte order and EOF behavior.
- Compare parsed map, trigger, size, and sprite metadata against Java output.

### Source-Line Parity Ledger Is Still Needed

The file count maps 1-to-1 for Jackal gameplay classes, but this pass did not produce a per-line Java-to-TS parity ledger.

Required follow-up:

- Generate a per-class ledger showing every Java method and field mapped to the generated TS member.
- Record deliberate browser substitutions such as Slick container startup, resource URLs, service worker cache keys, and Web Audio gesture gating.
- Mark generated helper rewrites for overloads, backing fields, classloader streams, numeric casts, and Java collections.

## Slick2D-TS Limitations

No new `slick2d-ts` library limitation was proven in this conversion pass.

The remaining blockers above are conversion-validation work in `jackal-js`, not confirmed `slick2d-ts` bugs. Therefore no separate Slick2D-TS repair handoff file was created.

## Current Status

The repository has a complete generated source/file/asset scaffold and passes ESLint, TypeScript typecheck, and production build.

The port is not yet certified as perfect runtime parity. The next work should be fixture tests and browser gameplay validation, with special attention to Java numeric behavior, generated overload dispatch, and binary resource parsing.
