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

## Remaining Parity Risks

### Java Numeric Parity Is Still Not Fully Proven

The current converter removes Java casts to keep the generated TS syntactically valid. That is not enough for perfect parity.

Required follow-up:

- Convert Java `(int)` casts to Java-compatible truncation helpers.
- Convert Java `int / int` to Java-compatible integer division where both operands are int-derived.
- Convert Java `long` storage and bit operations to `bigint` where packed direction/state data depends on 64-bit behavior.
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
